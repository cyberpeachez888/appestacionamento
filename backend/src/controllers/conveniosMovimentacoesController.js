/**
 * Convenios Movimentacoes Controller
 * Gerenciamento de entradas/saídas (principalmente pós-pago)
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';
import { calcularTempoPermanencia, validarEntradaVeiculo } from '../utils/conveniosHelpers.js';

const MOVIMENTACOES_TABLE = 'convenios_movimentacoes';
const VEICULOS_TABLE = 'convenios_veiculos';
const CONVENIOS_TABLE = 'convenios';

export default {
    /**
     * GET /api/convenios/:convenioId/movimentacoes
     * Lista movimentações de um convênio
     */
    async list(req, res) {
        try {
            const { convenioId } = req.params;
            const { data_inicio, data_fim, faturado, placa } = req.query;

            let query = supabase
                .from(MOVIMENTACOES_TABLE)
                .select(`
          *,
          veiculo:convenios_veiculos(placa, modelo, cor)
        `)
                .eq('convenio_id', convenioId)
                .order('data_entrada', { ascending: false })
                .order('hora_entrada', { ascending: false });

            // Filtros
            if (data_inicio) {
                query = query.gte('data_entrada', data_inicio);
            }

            if (data_fim) {
                query = query.lte('data_entrada', data_fim);
            }

            if (faturado !== undefined) {
                query = query.eq('faturado', faturado === 'true');
            }

            if (placa) {
                query = query.eq('placa', placa.toUpperCase());
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro no list movimentações:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PATCH /api/convenios/:id/movimentacoes/:movId
     * Atualiza movimentação (usado para registrar saída de vagas extras)
     */
    async update(req, res) {
        try {
            const { convenioId, movId } = req.params;
            const { data_saida, hora_saida, valor_cobrado } = req.body;

            console.log('[MovimentacoesUpdate] Atualizando:', { movId, data_saida, hora_saida, valor_cobrado });

            const updateData = {};
            if (data_saida) updateData.data_saida = data_saida;
            if (hora_saida) updateData.hora_saida = hora_saida;
            if (valor_cobrado !== undefined) {
                updateData.valor_cobrado = valor_cobrado;
                console.log('[MovimentacoesUpdate] Salvando valor_cobrado:', valor_cobrado);
            }

            const { data, error } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .update(updateData)
                .eq('id', movId)
                .eq('convenio_id', convenioId)
                .select()
                .single();

            if (error) {
                console.error('[MovimentacoesUpdate] Erro ao atualizar:', error);
                return res.status(500).json({ error: error.message });
            }

            console.log('[MovimentacoesUpdate] ✅ Movimentação atualizada!', data);
            return res.json(data);
        } catch (err) {
            console.error('[MovimentacoesUpdate] Erro:', err);
            return res.status(500).json({ error: err.message });
        }
    },

    /**
     * POST /api/convenios/:convenioId/movimentacoes
     * Registra entrada ou saída
     */
    async create(req, res) {
        try {
            const { convenioId } = req.params;
            const {
                placa,
                tipo, // 'entrada' ou 'saida'
                data,
                hora,
                valor_calculado
            } = req.body;

            // Validações
            if (!placa || !tipo || !data || !hora) {
                return res.status(400).json({
                    error: 'Campos obrigatórios: placa, tipo, data, hora'
                });
            }

            const placaNormalizada = placa.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

            // Buscar convênio
            const { data: convenio } = await supabase
                .from(CONVENIOS_TABLE)
                .select('*')
                .eq('id', convenioId)
                .single();

            if (!convenio) {
                return res.status(404).json({ error: 'Convênio não encontrado' });
            }

            // Buscar veículo
            const { data: veiculo } = await supabase
                .from(VEICULOS_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .eq('placa', placaNormalizada)
                .eq('ativo', true)
                .single();

            if (tipo === 'entrada') {
                // Registrar entrada

                // Buscar veículos e movimentações para validação
                const { data: veiculos } = await supabase
                    .from(VEICULOS_TABLE)
                    .select('*')
                    .eq('convenio_id', convenioId)
                    .eq('ativo', true);

                const { data: movimentacoes } = await supabase
                    .from(MOVIMENTACOES_TABLE)
                    .select('*')
                    .eq('convenio_id', convenioId)
                    .is('data_saida', null);

                // Validar entrada
                const validacao = validarEntradaVeiculo(
                    placaNormalizada,
                    convenioId,
                    convenio,
                    veiculos || [],
                    movimentacoes || []
                );

                if (!validacao.permitido) {
                    return res.status(400).json({ error: validacao.motivo });
                }

                // Criar registro de entrada
                const movimentacaoData = {
                    id: uuid(),
                    convenio_id: convenioId,
                    veiculo_id: veiculo?.id || null,
                    placa: placaNormalizada,
                    data_entrada: data,
                    hora_entrada: hora,
                    tipo_vaga: veiculo?.id ? 'regular' : 'extra', // regular = registered vehicle, extra = visitor
                    faturado: false
                };

                const { data: movimentacao, error } = await supabase
                    .from(MOVIMENTACOES_TABLE)
                    .insert(movimentacaoData)
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                // Log de auditoria
                await logEvent({
                    actor: req.user,
                    action: 'convenio.movimentacao.entrada',
                    targetType: 'convenio_movimentacao',
                    targetId: movimentacao.id,
                    details: {
                        convenio: convenio.nome_empresa,
                        placa: placaNormalizada,
                        data,
                        hora
                    }
                });

                return res.status(201).json(movimentacao);

            } else if (tipo === 'saida') {
                // Registrar saída

                // Buscar entrada correspondente
                const { data: entrada } = await supabase
                    .from(MOVIMENTACOES_TABLE)
                    .select('*')
                    .eq('convenio_id', convenioId)
                    .eq('placa', placaNormalizada)
                    .is('data_saida', null)
                    .order('data_entrada', { ascending: false })
                    .order('hora_entrada', { ascending: false })
                    .limit(1)
                    .single();

                if (!entrada) {
                    return res.status(400).json({
                        error: 'Não há entrada registrada para este veículo'
                    });
                }

                // Calcular tempo de permanência
                const dtEntrada = new Date(`${entrada.data_entrada}T${entrada.hora_entrada}`);
                const dtSaida = new Date(`${data}T${hora}`);

                if (dtSaida < dtEntrada) {
                    return res.status(400).json({
                        error: 'Data/hora de saída não pode ser anterior à entrada'
                    });
                }

                const tempo = calcularTempoPermanencia(dtEntrada, dtSaida);

                // Atualizar registro com saída
                const updateData = {
                    data_saida: data,
                    hora_saida: hora,
                    tempo_permanencia: `${tempo.horas} hours ${tempo.minutos} minutes`,
                    valor_calculado: valor_calculado || null
                };

                // Se vier valor_cobrado (para vagas extras), usar ele
                if (req.body.valor_cobrado !== undefined) {
                    updateData.valor_cobrado = req.body.valor_cobrado;
                    console.log('[Saida] Atualizando valor_cobrado:', req.body.valor_cobrado);
                }

                const { data: movimentacao, error } = await supabase
                    .from(MOVIMENTACOES_TABLE)
                    .update(updateData)
                    .eq('id', entrada.id)
                    .select()
                    .single();

                if (error) {
                    return res.status(500).json({ error: error.message });
                }

                // Log de auditoria
                await logEvent({
                    actor: req.user,
                    action: 'convenio.movimentacao.saida',
                    targetType: 'convenio_movimentacao',
                    targetId: movimentacao.id,
                    details: {
                        convenio: convenio.nome_empresa,
                        placa: placaNormalizada,
                        tempo_permanencia: tempo.formatado,
                        valor: valor_calculado
                    }
                });

                return res.json(movimentacao);
            } else {
                return res.status(400).json({ error: 'Tipo inválido. Use "entrada" ou "saida"' });
            }

        } catch (err) {
            console.error('Erro no create movimentação:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * GET /api/convenios/:convenioId/movimentacoes/ativas
     * Lista movimentações ativas (sem saída)
     */
    async getAtivas(req, res) {
        try {
            const { convenioId } = req.params;

            const { data, error } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .select(`
          *,
          veiculo:convenios_veiculos(placa, modelo, cor, proprietario_nome)
        `)
                .eq('convenio_id', convenioId)
                .is('data_saida', null)
                .order('data_entrada', { ascending: false })
                .order('hora_entrada', { ascending: false });

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro no getAtivas:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * GET /api/convenios/:convenioId/movimentacoes/nao-faturadas
     * Lista movimentações não faturadas (para gerar fatura)
     */
    async getNaoFaturadas(req, res) {
        try {
            const { convenioId } = req.params;
            const { periodo } = req.query; // YYYY-MM

            let query = supabase
                .from(MOVIMENTACOES_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .eq('faturado', false)
                .not('data_saida', 'is', null); // Apenas com saída registrada

            if (periodo) {
                const [ano, mes] = periodo.split('-');
                const dataInicio = `${ano}-${mes}-01`;
                const proximoMes = new Date(parseInt(ano), parseInt(mes), 1);
                const dataFim = proximoMes.toISOString().split('T')[0];

                query = query
                    .gte('data_entrada', dataInicio)
                    .lt('data_entrada', dataFim);
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro no getNaoFaturadas:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PATCH /api/convenios/:convenioId/movimentacoes/:movimentacaoId
     * Atualiza movimentação (correções)
     */
    async update(req, res) {
        try {
            const { convenioId, movimentacaoId } = req.params;
            const updates = req.body;

            // Não permitir alterar se já foi faturado
            const { data: movimentacao } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .select('*')
                .eq('id', movimentacaoId)
                .single();

            if (!movimentacao) {
                return res.status(404).json({ error: 'Movimentação não encontrada' });
            }

            if (movimentacao.faturado) {
                return res.status(400).json({
                    error: 'Não é possível alterar movimentação já faturada'
                });
            }

            const { data, error } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .update(updates)
                .eq('id', movimentacaoId)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro no update movimentação:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PATCH /api/registros/:id/vincular-convenio
     * Vincula manualmente um registro a um convênio (VAGA EXTRA - visitante)
     */
    async vincularConvenio(req, res) {
        try {
            const { id } = req.params;
            const { convenio_id } = req.body;
            const userId = req.user?.id;

            if (!convenio_id) {
                return res.status(400).json({ error: 'convenio_id é obrigatório' });
            }

            // 1. Buscar convênio e validar se permite vagas extras
            const { data: convenio, error: convenioError } = await supabase
                .from(CONVENIOS_TABLE)
                .select(`
                    *,
                    plano_ativo:convenios_planos!inner(*)
                `)
                .eq('id', convenio_id)
                .eq('convenios_planos.ativo', true)
                .single();

            if (convenioError || !convenio) {
                return res.status(404).json({ error: 'Convênio não encontrado ou sem plano ativo' });
            }

            const plano = Array.isArray(convenio.plano_ativo) ? convenio.plano_ativo[0] : convenio.plano_ativo;

            if (!plano.permite_vagas_extras) {
                return res.status(400).json({
                    error: 'Este convênio não permite vagas extras (visitantes)'
                });
            }

            // 2. Buscar registro
            const { data: registro, error: registroError } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .select('*')
                .eq('id', id)
                .single();

            if (registroError || !registro) {
                return res.status(404).json({ error: 'Registro não encontrado' });
            }

            // 3. Verificar se já está vinculado ou bloqueado
            if (registro.bloqueado) {
                return res.status(400).json({
                    error: 'Este registro já foi vinculado e está bloqueado'
                });
            }

            if (registro.convenio_id) {
                return res.status(400).json({
                    error: 'Este registro já está vinculado a um convênio'
                });
            }

            // 4. Atualizar registro - VAGA EXTRA (veiculo_id permanece NULL)
            const { data: updated, error: updateError } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .update({
                    convenio_id,
                    veiculo_id: null, // GARANTIR que é NULL = vaga extra
                    vinculado_por: userId,
                    vinculado_em: new Date().toISOString(),
                    bloqueado: true, // Impede desvincular
                    valor_cobrado: plano.valor_vaga_extra || 0
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                return res.status(500).json({ error: updateError.message });
            }

            // 5. Registrar auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.movimentacao.vincular',
                targetType: 'convenio_movimentacao',
                targetId: id,
                details: {
                    convenio: convenio.nome_empresa,
                    placa: registro.placa,
                    tipo: 'vaga_extra',
                    valor_cobrado: plano.valor_vaga_extra || 0
                }
            });

            res.json({
                message: 'Registro vinculado como vaga extra com sucesso',
                data: updated
            });

        } catch (err) {
            console.error('Erro no vincularConvenio:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * GET /api/convenios/:convenioId/vagas-extras
     * Lista todas as vagas extras (visitantes) do convênio
     */
    async listarVagasExtras(req, res) {
        try {
            const { convenioId } = req.params;
            const { periodo } = req.query; // YYYY-MM (opcional)

            let query = supabase
                .from(MOVIMENTACOES_TABLE)
                .select(`
                    *,
                    vinculado_por_usuario:users!vinculado_por(id, name, login)
                `)
                .eq('convenio_id', convenioId)
                .is('veiculo_id', null) // VAGA EXTRA = sem cadastro de veículo
                .order('data_entrada', { ascending: false })
                .order('hora_entrada', { ascending: false });

            // Filtro por período
            if (periodo) {
                const [ano, mes] = periodo.split('-');
                const dataInicio = `${ano}-${mes.padStart(2, '0')}-01`;
                const proximoMes = new Date(parseInt(ano), parseInt(mes), 1);
                const dataFim = proximoMes.toISOString().split('T')[0];

                query = query
                    .gte('data_entrada', dataInicio)
                    .lt('data_entrada', dataFim);
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Enriquecer com nome do operador
            const vagasExtras = data.map(vaga => ({
                ...vaga,
                vinculado_por_nome: vaga.vinculado_por_usuario?.name || 'N/A'
            }));

            res.json(vagasExtras);

        } catch (err) {
            console.error('Erro no listarVagasExtras:', err);
            res.status(500).json({ error: err.message || err });
        }
    }
};
