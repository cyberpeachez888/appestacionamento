/**
 * Convenios Controller
 * Gerenciamento de convênios empresariais
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';
import {
    validarCNPJ,
    formatarCNPJ,
    calcularStatusConvenio,
    verificarInadimplencia,
    calcularTaxaOcupacao
} from '../utils/conveniosHelpers.js';

const CONVENIOS_TABLE = 'convenios';
const PLANOS_TABLE = 'convenios_planos';
const VEICULOS_TABLE = 'convenios_veiculos';
const FATURAS_TABLE = 'convenios_faturas';
const HISTORICO_TABLE = 'convenios_historico';

export default {
    /**
     * GET /api/convenios
     * Lista todos os convênios com filtros
     */
    async list(req, res) {
        try {
            const { status, categoria, busca, permite_vagas_extras } = req.query;

            let query = supabase
                .from(CONVENIOS_TABLE)
                .select(`
          *,
          plano_ativo:convenios_planos(
            id,
            tipo_plano,
            num_vagas_contratadas,
            num_vagas_reservadas,
            valor_por_vaga,
            valor_mensal,
            dia_vencimento,
            dia_fechamento,
            permite_vagas_extras,
            valor_vaga_extra,
            permite_horario_especial,
            porcentagem_desconto,
            ativo
          )
        `)
                .order('created_at', { ascending: false });

            // Filtros
            if (status) {
                query = query.eq('status', status);
            }

            if (categoria) {
                query = query.eq('categoria', categoria);
            }

            if (busca) {
                query = query.or(`nome_empresa.ilike.%${busca}%,cnpj.ilike.%${busca}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Erro ao listar convênios:', error);
                return res.status(500).json({ error: error.message });
            }

            // Enriquecer dados com informações adicionais
            const conveniosEnriquecidos = await Promise.all(
                data.map(async (convenio) => {
                    // Buscar faturas para verificar inadimplência
                    const { data: faturas } = await supabase
                        .from(FATURAS_TABLE)
                        .select('id, status, data_vencimento')
                        .eq('convenio_id', convenio.id);

                    // Buscar ocupação atual
                    const { data: movimentacoes } = await supabase
                        .from('convenios_movimentacoes')
                        .select('id')
                        .eq('convenio_id', convenio.id)
                        .is('data_saida', null);

                    // Filter for active plan only
                    const planoAtivo = Array.isArray(convenio.plano_ativo)
                        ? convenio.plano_ativo.find(p => p.ativo === true)
                        : null;

                    const vagasOcupadas = movimentacoes?.length || 0;
                    const vagasContratadas = planoAtivo?.num_vagas_contratadas || 0;

                    return {
                        ...convenio,
                        vagas_ocupadas: vagasOcupadas,
                        vagas_contratadas: vagasContratadas,
                        taxa_ocupacao: calcularTaxaOcupacao(vagasOcupadas, vagasContratadas),
                        inadimplente: verificarInadimplencia(convenio, faturas || []),
                        // Flatten plano ativo fields to root for easier access
                        permite_vagas_extras: planoAtivo?.permite_vagas_extras || false,
                        valor_vaga_extra: planoAtivo?.valor_vaga_extra || null,
                        plano_ativo: planoAtivo
                    };
                })
            );

            res.json(conveniosEnriquecidos);
        } catch (err) {
            console.error('Erro no list:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * GET /api/convenios/:id
     * Busca um convênio específico
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            // DEBUG: Verificar se existem planos separadamente
            const { data: planosCheck, error: planosError } = await supabase
                .from('convenios_planos')
                .select('*')
                .eq('convenio_id', id);

            console.log('[getById] Direct planos query:', {
                convenioId: id,
                planosFound: planosCheck?.length || 0,
                error: planosError,
                planos: planosCheck
            });

            const { data, error } = await supabase
                .from(CONVENIOS_TABLE)
                .select(`
          *,
          planos:convenios_planos(*),
          veiculos:convenios_veiculos(*),
          faturas:convenios_faturas(*),
          historico:convenios_historico(*)
        `)
                .eq('id', id)
                .order('ativo', { foreignTable: 'convenios_planos', ascending: false })
                .order('created_at', { foreignTable: 'convenios_planos', ascending: false })
                .single();

            if (error) {
                console.error('[getById] Error:', error);
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ error: 'Convênio não encontrado' });
                }
                return res.status(500).json({ error: error.message });
            }

            console.log('[getById] Success - Convenio:', data?.nome_empresa);
            console.log('[getById] Planos count:', data?.planos?.length || 0);
            console.log('[getById] Planos:', JSON.stringify(data?.planos));

            res.json(data);
        } catch (err) {
            console.error('Erro no getById:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * POST /api/convenios
     * Cria novo convênio
     */
    async create(req, res) {
        try {
            const {
                nome_empresa,
                cnpj,
                razao_social,
                categoria,
                data_inicio,
                data_vencimento_contrato,
                contato_nome,
                contato_email,
                contato_telefone,
                endereco_completo,
                observacoes,
                // Dados do plano
                plano
            } = req.body;

            // Validações
            if (!nome_empresa || !cnpj || !razao_social) {
                return res.status(400).json({
                    error: 'Campos obrigatórios: nome_empresa, cnpj, razao_social'
                });
            }

            // Validar CNPJ
            if (!validarCNPJ(cnpj)) {
                return res.status(400).json({ error: 'CNPJ inválido' });
            }

            // Verificar se CNPJ já existe
            const { data: existente } = await supabase
                .from(CONVENIOS_TABLE)
                .select('id')
                .eq('cnpj', cnpj.replace(/[^\d]/g, ''))
                .single();

            if (existente) {
                return res.status(400).json({ error: 'CNPJ já cadastrado' });
            }

            const convenioId = uuid();

            // Criar convênio (Convênio Corporativo unificado)
            const convenioData = {
                id: convenioId,
                nome_empresa,
                cnpj: cnpj.replace(/[^\d]/g, ''), // Armazenar apenas números
                razao_social,
                categoria,
                data_inicio,
                data_vencimento_contrato: data_vencimento_contrato || null,
                status: 'ativo',
                contato_nome,
                contato_email,
                contato_telefone,
                endereco_completo: endereco_completo || null,
                observacoes: observacoes || null
            };

            const { data: convenio, error: convenioError } = await supabase
                .from(CONVENIOS_TABLE)
                .insert(convenioData)
                .select()
                .single();

            if (convenioError) {
                console.error('Erro ao criar convênio:', convenioError);
                return res.status(500).json({ error: convenioError.message });
            }

            // Criar plano se fornecido
            if (plano) {
                // Validar porcentagem de desconto se fornecida
                if (plano.porcentagem_desconto !== undefined && plano.porcentagem_desconto !== null) {
                    const desconto = Number(plano.porcentagem_desconto);
                    if (isNaN(desconto) || desconto < 0 || desconto > 100) {
                        return res.status(400).json({
                            error: 'Porcentagem de desconto deve estar entre 0 e 100'
                        });
                    }
                }

                const planoData = {
                    id: uuid(),
                    convenio_id: convenioId,
                    tipo_plano: plano.tipo_plano || 'padrao',
                    num_vagas_contratadas: plano.num_vagas_contratadas,
                    num_vagas_reservadas: plano.num_vagas_reservadas || 0,
                    valor_por_vaga: plano.valor_por_vaga || null,
                    valor_mensal: plano.valor_mensal || null,
                    dia_vencimento: plano.dia_vencimento || plano.dia_vencimento_pos_pago || null,
                    dia_fechamento: plano.dia_fechamento || null,
                    permite_vagas_extras: plano.permite_vagas_extras || false,
                    valor_vaga_extra: plano.valor_vaga_extra || null,
                    permite_horario_especial: plano.permite_horario_especial || false,
                    horarios_permitidos: plano.horarios_permitidos || null,
                    porcentagem_desconto: plano.porcentagem_desconto || null,
                    data_inicio_vigencia: data_inicio,
                    ativo: true
                };

                console.log('[create] Tentando criar plano:', planoData);
                const { data: planoCreated, error: planoError } = await supabase
                    .from(PLANOS_TABLE)
                    .insert(planoData)
                    .select()
                    .single();

                if (planoError) {
                    console.error('[create] ERRO ao criar plano:', planoError);
                    return res.status(500).json({
                        error: 'Erro ao criar plano do convênio',
                        details: planoError.message
                    });
                }

                console.log('[create] Plano criado com sucesso:', planoCreated.id);
            } else {
                console.warn('[create] ATENÇÃO: Convênio criado SEM plano!');
            }

            // Registrar no histórico
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: convenioId,
                usuario_id: req.user?.id,
                tipo_alteracao: 'criacao',
                dados_novos: convenioData,
                motivo: 'Criação de novo convênio'
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.create',
                targetType: 'convenio',
                targetId: convenioId,
                details: { nome_empresa, cnpj: formatarCNPJ(cnpj) }
            });

            res.status(201).json(convenio);
        } catch (err) {
            console.error('Erro no create:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PATCH /api/convenios/:id
     * Atualiza convênio
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Buscar dados anteriores
            const { data: anterior } = await supabase
                .from(CONVENIOS_TABLE)
                .select('*')
                .eq('id', id)
                .single();

            if (!anterior) {
                return res.status(404).json({ error: 'Convênio não encontrado' });
            }

            // Validar CNPJ se estiver sendo alterado
            if (updates.cnpj && updates.cnpj !== anterior.cnpj) {
                if (!validarCNPJ(updates.cnpj)) {
                    return res.status(400).json({ error: 'CNPJ inválido' });
                }
                updates.cnpj = updates.cnpj.replace(/[^\d]/g, '');
            }

            // Atualizar
            const { data, error } = await supabase
                .from(CONVENIOS_TABLE)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Registrar no histórico
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: id,
                usuario_id: req.user?.id,
                tipo_alteracao: 'edicao',
                dados_anteriores: anterior,
                dados_novos: data,
                motivo: req.body.motivo || 'Atualização de dados'
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.update',
                targetType: 'convenio',
                targetId: id,
                details: { updates }
            });

            res.json(data);
        } catch (err) {
            console.error('Erro no update:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PUT /api/convenios/:id/plano
     * Atualiza o plano do convênio (desativa antigo, cria novo)
     */
    async updatePlano(req, res) {
        try {
            const { id: convenioId } = req.params;
            const planoData = req.body;

            console.log('🔍 [updatePlano] Received data:', {
                convenioId,
                planoData,
                keys: Object.keys(planoData),
                timestamp: new Date().toISOString()
            });

            // Buscar plano ativo atual
            const { data: planoAtual, error: planoError } = await supabase
                .from(PLANOS_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .eq('ativo', true)
                .single();

            if (planoError || !planoAtual) {
                return res.status(404).json({ error: 'Plano ativo não encontrado' });
            }

            // Desativar plano atual
            await supabase
                .from(PLANOS_TABLE)
                .update({ ativo: false, data_fim_vigencia: new Date().toISOString().split('T')[0] })
                .eq('id', planoAtual.id);

            // Criar novo plano - PRESERVE values from old plan if not provided
            const novoPlano = {
                id: uuid(),
                convenio_id: convenioId,
                tipo_plano: planoData.tipo_plano ?? planoAtual.tipo_plano ?? 'padrao',
                num_vagas_contratadas: planoData.num_vagas_contratadas ?? planoAtual.num_vagas_contratadas,
                num_vagas_reservadas: planoData.num_vagas_reservadas ?? planoAtual.num_vagas_reservadas ?? 0,
                // CRITICAL: Preserve financial fields from old plan
                valor_por_vaga: planoData.valor_por_vaga !== undefined ? planoData.valor_por_vaga : planoAtual.valor_por_vaga,
                valor_mensal: planoData.valor_mensal !== undefined ? planoData.valor_mensal : planoAtual.valor_mensal,
                // CRITICAL: Unified date fields (migrated from old dual fields)
                dia_vencimento: planoData.dia_vencimento !== undefined
                    ? planoData.dia_vencimento
                    : (planoAtual.dia_vencimento || planoAtual.dia_vencimento_pos_pago || planoAtual.dia_vencimento_pagamento),
                dia_fechamento: planoData.dia_fechamento !== undefined
                    ? planoData.dia_fechamento
                    : planoAtual.dia_fechamento,
                // Other fields
                permite_vagas_extras: planoData.permite_vagas_extras ?? planoAtual.permite_vagas_extras ?? false,
                valor_vaga_extra: planoData.valor_vaga_extra !== undefined ? planoData.valor_vaga_extra : planoAtual.valor_vaga_extra,
                porcentagem_desconto: planoData.porcentagem_desconto !== undefined ? planoData.porcentagem_desconto : planoAtual.porcentagem_desconto,
                permite_horario_especial: planoData.permite_horario_especial ?? planoAtual.permite_horario_especial ?? false,
                horarios_permitidos: planoData.horarios_permitidos ?? planoAtual.horarios_permitidos,
                data_inicio_vigencia: new Date().toISOString().split('T')[0],
                ativo: true
            };

            console.log('💾 [updatePlano] Saving new plan:', {
                id: novoPlano.id,
                convenio_id: novoPlano.convenio_id,
                dia_vencimento: novoPlano.dia_vencimento,
                dia_fechamento: novoPlano.dia_fechamento,
                valor_mensal: novoPlano.valor_mensal,
                num_vagas_contratadas: novoPlano.num_vagas_contratadas,
                permite_vagas_extras: novoPlano.permite_vagas_extras,
                valor_vaga_extra: novoPlano.valor_vaga_extra
            });

            const { data: plano, error } = await supabase
                .from(PLANOS_TABLE)
                .insert(novoPlano)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Registrar no histórico
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: convenioId,
                usuario_id: req.user?.id,
                tipo_alteracao: 'alteracao_plano',
                dados_anteriores: planoAtual,
                dados_novos: plano,
                motivo: req.body.motivo || 'Alteração de plano'
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.plano.update',
                targetType: 'convenio',
                targetId: convenioId,
                details: { planoAnterior: planoAtual.id, planoNovo: plano.id }
            });

            res.json(plano);
        } catch (err) {
            console.error('Erro no updatePlano:', err);
            res.status(500).json({ error: err.message || err });
        }
    },


    /**
     * DELETE /api/convenios/:id
     * Exclui convênio (soft delete - muda status para cancelado)
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Verificar se existe
            const { data: convenio } = await supabase
                .from(CONVENIOS_TABLE)
                .select('*')
                .eq('id', id)
                .single();

            if (!convenio) {
                return res.status(404).json({ error: 'Convênio não encontrado' });
            }

            // Soft delete - mudar status para cancelado
            const { data, error } = await supabase
                .from(CONVENIOS_TABLE)
                .update({ status: 'cancelado' })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Registrar no histórico
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: id,
                usuario_id: req.user?.id,
                tipo_alteracao: 'cancelamento',
                dados_anteriores: convenio,
                dados_novos: data,
                motivo: req.body.motivo || 'Cancelamento de convênio'
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.delete',
                targetType: 'convenio',
                targetId: id,
                details: { nome_empresa: convenio.nome_empresa }
            });

            res.json({ message: 'Convênio cancelado com sucesso', data });
        } catch (err) {
            console.error('Erro no delete:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PATCH /api/convenios/:id/suspender
     * Suspende ou reativa convênio
     */
    async toggleSuspensao(req, res) {
        try {
            const { id } = req.params;
            const { motivo } = req.body;

            // Buscar convênio
            const { data: convenio } = await supabase
                .from(CONVENIOS_TABLE)
                .select('*')
                .eq('id', id)
                .single();

            if (!convenio) {
                return res.status(404).json({ error: 'Convênio não encontrado' });
            }

            // Toggle status
            const novoStatus = convenio.status === 'suspenso' ? 'ativo' : 'suspenso';

            const { data, error } = await supabase
                .from(CONVENIOS_TABLE)
                .update({ status: novoStatus })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Registrar no histórico
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: id,
                usuario_id: req.user?.id,
                tipo_alteracao: novoStatus === 'suspenso' ? 'suspensao' : 'reativacao',
                dados_anteriores: convenio,
                dados_novos: data,
                motivo: motivo || `${novoStatus === 'suspenso' ? 'Suspensão' : 'Reativação'} de convênio`
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: `convenio.${novoStatus === 'suspenso' ? 'suspend' : 'reactivate'}`,
                targetType: 'convenio',
                targetId: id,
                details: { status: novoStatus, motivo }
            });

            res.json(data);
        } catch (err) {
            console.error('Erro no toggleSuspensao:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * GET /api/convenios/stats
     * Retorna estatísticas gerais
     */
    async getStats(req, res) {
        try {
            // Total de convênios ativos
            const { count: totalAtivos } = await supabase
                .from(CONVENIOS_TABLE)
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ativo');

            // Receita mensal prevista
            const { data: planos } = await supabase
                .from(PLANOS_TABLE)
                .select('valor_mensal')
                .eq('ativo', true);

            const receitaMensal = planos?.reduce((sum, p) => sum + Number(p.valor_mensal), 0) || 0;

            // Taxa de ocupação geral
            const { data: ocupacaoData } = await supabase
                .from('convenios_ocupacao')
                .select('*');

            const taxaOcupacaoMedia = ocupacaoData?.length > 0
                ? ocupacaoData.reduce((sum, o) => sum + Number(o.taxa_ocupacao_percentual || 0), 0) / ocupacaoData.length
                : 0;

            // Inadimplência
            const { data: convenios } = await supabase
                .from(CONVENIOS_TABLE)
                .select('id, status')
                .eq('status', 'inadimplente');

            const taxaInadimplencia = totalAtivos > 0
                ? ((convenios?.length || 0) / totalAtivos) * 100
                : 0;

            res.json({
                total_ativos: totalAtivos || 0,
                receita_mensal_prevista: receitaMensal,
                taxa_ocupacao_media: Number(taxaOcupacaoMedia.toFixed(2)),
                taxa_inadimplencia: Number(taxaInadimplencia.toFixed(2)),
                total_inadimplentes: convenios?.length || 0
            });
        } catch (err) {
            console.error('Erro no getStats:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * GET /api/convenios/relatorios/ocupacao
     * Relatório detalhado de ocupação (Ranking)
     */
    async getOccupancyReport(req, res) {
        try {
            const { limit } = req.query;

            let query = supabase
                .from('convenios_ocupacao')
                .select('*')
                .order('taxa_ocupacao_percentual', { ascending: false });

            if (limit) {
                query = query.limit(parseInt(limit));
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro no getOccupancyReport:', err);
            res.status(500).json({ error: err.message || err });
        }
    }
};
