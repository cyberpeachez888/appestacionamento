/**
 * Convenios Faturas Controller
 * Gerenciamento de faturas (pré-pago e pós-pago)
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditLogger.js';
import {
    gerarNumeroFatura,
    calcularDataVencimento,
    calcularJurosAtraso,
    calcularDiasAtraso,
    calcularValorPosPago,
    validarGeracaoFatura,
    formatarPeriodo
} from '../utils/conveniosHelpers.js';

const FATURAS_TABLE = 'convenios_faturas';
const CONVENIOS_TABLE = 'convenios';
const PLANOS_TABLE = 'convenios_planos';
const MOVIMENTACOES_TABLE = 'convenios_movimentacoes';
const HISTORICO_TABLE = 'convenios_historico';

export default {
    /**
     * GET /api/convenios/:convenioId/faturas
     * Lista faturas de um convênio
     */
    async list(req, res) {
        try {
            const { convenioId } = req.params;
            const { status, periodo } = req.query;

            let query = supabase
                .from(FATURAS_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .order('data_emissao', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            if (periodo) {
                query = query.eq('periodo_referencia', periodo);
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Calcular dias de atraso para faturas vencidas
            const faturasEnriquecidas = data.map(fatura => {
                const diasAtraso = fatura.status === 'vencida' || fatura.status === 'pendente'
                    ? calcularDiasAtraso(fatura.data_vencimento)
                    : 0;

                return {
                    ...fatura,
                    dias_atraso: diasAtraso
                };
            });

            res.json(faturasEnriquecidas);
        } catch (err) {
            console.error('Erro no list faturas:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * GET /api/convenios/relatorios/faturas
     * Lista todas as faturas (Relatório Geral)
     */
    async listAll(req, res) {
        try {
            const { status, periodo, data_inicio, data_fim } = req.query;

            let query = supabase
                .from(FATURAS_TABLE)
                .select(`
                    *,
                    convenio:convenios(nome_empresa)
                `)
                .order('data_vencimento', { ascending: true });

            if (status && status !== 'todos') {
                query = query.eq('status', status);
            }

            if (periodo) {
                query = query.eq('periodo_referencia', periodo);
            }

            if (data_inicio) query = query.gte('data_vencimento', data_inicio);
            if (data_fim) query = query.lte('data_vencimento', data_fim);

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            const faturasEnriquecidas = data.map(fatura => {
                const diasAtraso = fatura.status === 'vencida' || fatura.status === 'pendente'
                    ? calcularDiasAtraso(fatura.data_vencimento)
                    : 0;

                return {
                    ...fatura,
                    dias_atraso: diasAtraso
                };
            });

            res.json(faturasEnriquecidas);
        } catch (err) {
            console.error('Erro no listAll faturas:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * POST /api/convenios/:convenioId/faturas
     * Gera nova fatura
     */
    async create(req, res) {
        try {
            const { convenioId } = req.params;
            const {
                periodo_referencia, // YYYY-MM
                data_emissao,
                valor_extras,
                valor_descontos,
                observacoes
            } = req.body;

            // Validações
            if (!periodo_referencia) {
                return res.status(400).json({ error: 'Período de referência é obrigatório' });
            }

            // Buscar convênio e plano ativo
            const { data: convenio } = await supabase
                .from(CONVENIOS_TABLE)
                .select(`
          *,
          plano:convenios_planos!inner(*)
        `)
                .eq('id', convenioId)
                .eq('convenios_planos.ativo', true)
                .single();

            if (!convenio) {
                return res.status(404).json({ error: 'Convênio ou plano ativo não encontrado' });
            }

            const plano = convenio.plano[0];

            // Buscar faturas existentes
            const { data: faturasExistentes } = await supabase
                .from(FATURAS_TABLE)
                .select('*')
                .eq('convenio_id', convenioId);

            // Validar se pode gerar fatura
            const validacao = validarGeracaoFatura(convenioId, periodo_referencia, faturasExistentes || []);
            if (!validacao.valido) {
                return res.status(400).json({ error: validacao.motivo });
            }

            let valorBase = 0;
            let movimentacoesIds = [];

            if (convenio.tipo_convenio === 'pre-pago') {
                // Pré-pago: valor fixo do plano
                valorBase = Number(plano.valor_mensal);

            } else if (convenio.tipo_convenio === 'pos-pago') {
                // Pós-pago: calcular baseado em movimentações
                const { data: movimentacoes } = await supabase
                    .from(MOVIMENTACOES_TABLE)
                    .select('*')
                    .eq('convenio_id', convenioId)
                    .eq('faturado', false)
                    .not('data_saida', 'is', null);

                if (!movimentacoes || movimentacoes.length === 0) {
                    return res.status(400).json({
                        error: 'Não há movimentações não faturadas para este período'
                    });
                }

                // Calcular valor (você pode ajustar a lógica de cálculo aqui)
                // Por exemplo: valor por hora, valor por dia, etc.
                valorBase = calcularValorPosPago(movimentacoes, plano.valor_mensal / 30 / 24); // Exemplo: valor/hora
                movimentacoesIds = movimentacoes.map(m => m.id);
            }

            // Calcular valores
            const extras = Number(valor_extras || 0);
            const descontos = Number(valor_descontos || 0);
            const juros = 0; // Juros são calculados apenas após vencimento
            const valorTotal = valorBase + extras - descontos + juros;

            // Calcular data de vencimento
            const dataEmissao = data_emissao || new Date().toISOString().split('T')[0];
            const dataVencimento = calcularDataVencimento(
                plano.dia_vencimento_pagamento,
                new Date(dataEmissao)
            ).toISOString().split('T')[0];

            // Gerar número da fatura
            const numeroFatura = gerarNumeroFatura(convenioId, periodo_referencia);

            // Criar fatura
            const faturaData = {
                id: uuid(),
                convenio_id: convenioId,
                numero_fatura: numeroFatura,
                periodo_referencia,
                data_emissao: dataEmissao,
                data_vencimento: dataVencimento,
                valor_base: valorBase,
                valor_extras: extras,
                valor_descontos: descontos,
                valor_juros: juros,
                valor_total: valorTotal,
                status: 'pendente',
                observacoes: observacoes || null
            };

            const { data: fatura, error } = await supabase
                .from(FATURAS_TABLE)
                .insert(faturaData)
                .select()
                .single();

            if (error) {
                console.error('Erro ao criar fatura:', error);
                return res.status(500).json({ error: error.message });
            }

            // Se pós-pago, marcar movimentações como faturadas
            if (convenio.tipo_convenio === 'pos-pago' && movimentacoesIds.length > 0) {
                await supabase
                    .from(MOVIMENTACOES_TABLE)
                    .update({ faturado: true, fatura_id: fatura.id })
                    .in('id', movimentacoesIds);
            }

            // Registrar no histórico
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: convenioId,
                usuario_id: req.user?.id,
                tipo_alteracao: 'geracao_fatura',
                dados_novos: faturaData,
                motivo: `Fatura ${numeroFatura} gerada para ${formatarPeriodo(periodo_referencia)}`
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.fatura.create',
                targetType: 'convenio_fatura',
                targetId: fatura.id,
                details: {
                    convenio: convenio.nome_empresa,
                    numero_fatura: numeroFatura,
                    periodo: periodo_referencia,
                    valor_total: valorTotal
                }
            });

            res.status(201).json(fatura);
        } catch (err) {
            console.error('Erro no create fatura:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PATCH /api/convenios/:convenioId/faturas/:faturaId/pagar
     * Registra pagamento de fatura
     */
    async registrarPagamento(req, res) {
        try {
            const { convenioId, faturaId } = req.params;
            const {
                data_pagamento,
                forma_pagamento,
                numero_nfse,
                observacoes
            } = req.body;

            // Validações
            if (!data_pagamento || !forma_pagamento) {
                return res.status(400).json({
                    error: 'Data de pagamento e forma de pagamento são obrigatórios'
                });
            }

            // Buscar fatura
            const { data: fatura } = await supabase
                .from(FATURAS_TABLE)
                .select('*')
                .eq('id', faturaId)
                .eq('convenio_id', convenioId)
                .single();

            if (!fatura) {
                return res.status(404).json({ error: 'Fatura não encontrada' });
            }

            if (fatura.status === 'paga') {
                return res.status(400).json({ error: 'Fatura já está paga' });
            }

            if (fatura.status === 'cancelada') {
                return res.status(400).json({ error: 'Fatura cancelada não pode ser paga' });
            }

            // Calcular juros se houver atraso
            const diasAtraso = calcularDiasAtraso(fatura.data_vencimento);
            let juros = 0;

            if (diasAtraso > 0) {
                juros = calcularJurosAtraso(fatura.valor_base + fatura.valor_extras - fatura.valor_descontos, diasAtraso);
            }

            const valorTotalComJuros = fatura.valor_base + fatura.valor_extras - fatura.valor_descontos + juros;

            // Atualizar fatura
            const { data, error } = await supabase
                .from(FATURAS_TABLE)
                .update({
                    data_pagamento,
                    forma_pagamento,
                    numero_nfse: numero_nfse || null,
                    valor_juros: juros,
                    valor_total: valorTotalComJuros,
                    status: 'paga',
                    observacoes: observacoes || fatura.observacoes
                })
                .eq('id', faturaId)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Atualizar status do convênio se estava inadimplente
            const { data: convenio } = await supabase
                .from(CONVENIOS_TABLE)
                .select('status')
                .eq('id', convenioId)
                .single();

            if (convenio?.status === 'inadimplente') {
                // Verificar se ainda há outras faturas pendentes
                const { data: faturasVencidas } = await supabase
                    .from(FATURAS_TABLE)
                    .select('id')
                    .eq('convenio_id', convenioId)
                    .in('status', ['pendente', 'vencida'])
                    .lt('data_vencimento', new Date().toISOString().split('T')[0]);

                if (!faturasVencidas || faturasVencidas.length === 0) {
                    // Reativar convênio
                    await supabase
                        .from(CONVENIOS_TABLE)
                        .update({ status: 'ativo' })
                        .eq('id', convenioId);
                }
            }

            // Registrar no histórico
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: convenioId,
                usuario_id: req.user?.id,
                tipo_alteracao: 'pagamento_fatura',
                dados_anteriores: fatura,
                dados_novos: data,
                motivo: `Pagamento registrado para fatura ${fatura.numero_fatura}`
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.fatura.pay',
                targetType: 'convenio_fatura',
                targetId: faturaId,
                details: {
                    numero_fatura: fatura.numero_fatura,
                    valor_pago: valorTotalComJuros,
                    forma_pagamento,
                    dias_atraso: diasAtraso
                }
            });

            res.json(data);
        } catch (err) {
            console.error('Erro no registrarPagamento:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PATCH /api/convenios/:convenioId/faturas/:faturaId/cancelar
     * Cancela fatura
     */
    async cancelar(req, res) {
        try {
            const { convenioId, faturaId } = req.params;
            const { motivo } = req.body;

            // Buscar fatura
            const { data: fatura } = await supabase
                .from(FATURAS_TABLE)
                .select('*')
                .eq('id', faturaId)
                .eq('convenio_id', convenioId)
                .single();

            if (!fatura) {
                return res.status(404).json({ error: 'Fatura não encontrada' });
            }

            if (fatura.status === 'paga') {
                return res.status(400).json({ error: 'Fatura paga não pode ser cancelada' });
            }

            // Cancelar fatura
            const { data, error } = await supabase
                .from(FATURAS_TABLE)
                .update({ status: 'cancelada', observacoes: motivo || fatura.observacoes })
                .eq('id', faturaId)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Se era pós-pago, desmarcar movimentações como faturadas
            const { data: movimentacoes } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .select('id')
                .eq('fatura_id', faturaId);

            if (movimentacoes && movimentacoes.length > 0) {
                await supabase
                    .from(MOVIMENTACOES_TABLE)
                    .update({ faturado: false, fatura_id: null })
                    .eq('fatura_id', faturaId);
            }

            // Registrar no histórico
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: convenioId,
                usuario_id: req.user?.id,
                tipo_alteracao: 'cancelamento_fatura',
                dados_anteriores: fatura,
                dados_novos: data,
                motivo: motivo || 'Cancelamento de fatura'
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.fatura.cancel',
                targetType: 'convenio_fatura',
                targetId: faturaId,
                details: { numero_fatura: fatura.numero_fatura, motivo }
            });

            res.json(data);
        } catch (err) {
            console.error('Erro no cancelar fatura:', err);
            res.status(500).json({ error: err.message || err });
        }
    }
};
