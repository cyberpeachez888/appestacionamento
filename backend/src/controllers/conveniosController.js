/**
 * Convenios Controller
 * Gerenciamento de convênios empresariais
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditService.js';
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
            const { status, tipo, categoria, busca } = req.query;

            let query = supabase
                .from(CONVENIOS_TABLE)
                .select(`
          *,
          plano_ativo:convenios_planos!inner(
            id,
            num_vagas_contratadas,
            num_vagas_reservadas,
            valor_mensal,
            dia_vencimento_pagamento,
            permite_vagas_extras,
            valor_vaga_extra
          )
        `)
                .eq('convenios_planos.ativo', true)
                .order('created_at', { ascending: false });

            // Filtros
            if (status) {
                query = query.eq('status', status);
            }

            if (tipo) {
                query = query.eq('tipo_convenio', tipo);
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

                    const vagasOcupadas = movimentacoes?.length || 0;
                    const vagasContratadas = convenio.plano_ativo?.[0]?.num_vagas_contratadas || 0;

                    return {
                        ...convenio,
                        vagas_ocupadas: vagasOcupadas,
                        taxa_ocupacao: calcularTaxaOcupacao(vagasOcupadas, vagasContratadas),
                        inadimplente: verificarInadimplencia(convenio, faturas || []),
                        plano_ativo: convenio.plano_ativo?.[0] || null
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
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ error: 'Convênio não encontrado' });
                }
                return res.status(500).json({ error: error.message });
            }

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
                tipo_convenio,
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
            if (!nome_empresa || !cnpj || !razao_social || !tipo_convenio) {
                return res.status(400).json({
                    error: 'Campos obrigatórios: nome_empresa, cnpj, razao_social, tipo_convenio'
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

            // Criar convênio
            const convenioData = {
                id: convenioId,
                nome_empresa,
                cnpj: cnpj.replace(/[^\d]/g, ''), // Armazenar apenas números
                razao_social,
                tipo_convenio,
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
                const planoData = {
                    id: uuid(),
                    convenio_id: convenioId,
                    tipo_plano: plano.tipo_plano || 'padrao',
                    num_vagas_contratadas: plano.num_vagas_contratadas,
                    num_vagas_reservadas: plano.num_vagas_reservadas || 0,
                    valor_mensal: plano.valor_mensal,
                    dia_vencimento_pagamento: plano.dia_vencimento_pagamento,
                    permite_vagas_extras: plano.permite_vagas_extras || false,
                    valor_vaga_extra: plano.valor_vaga_extra || null,
                    permite_horario_especial: plano.permite_horario_especial || false,
                    horarios_permitidos: plano.horarios_permitidos || null,
                    data_inicio_vigencia: data_inicio,
                    ativo: true
                };

                await supabase.from(PLANOS_TABLE).insert(planoData);
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
