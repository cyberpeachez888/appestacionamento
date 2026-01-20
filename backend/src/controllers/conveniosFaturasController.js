/**
 * Convenios Faturas Controller
 * Gerenciamento de faturas (pré-pago e pós-pago)
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import { logEvent } from '../services/auditLogger.js';
import {
    gerarNumeroFatura,
    gerarNumeroFaturaYYYYNNN,
    calcularPeriodoReferencia,
    validarDadosPreview,
    calcularMensalidade,
    calcularDataVencimento,
    calcularJurosAtraso,
    calcularDiasAtraso,
    calcularValorPosPago,
    validarGeracaoFatura,
    formatarPeriodo
} from '../utils/conveniosHelpers.js';
import { gerarPDFFatura } from '../services/invoicePDFGenerator.js';

const FATURAS_TABLE = 'convenios_faturas';
const CONVENIOS_TABLE = 'convenios';
const PLANOS_TABLE = 'convenios_planos';
const MOVIMENTACOES_TABLE = 'convenios_movimentacoes';
const HISTORICO_TABLE = 'convenios_historico';

export default {
    /**
     * GET /api/convenios/:convenioId/fatura/preview
     * Preview de fatura antes da geração oficial
     */
    async preview(req, res) {
        try {
            const { convenioId } = req.params;

            // Buscar convênio com plano ativo
            const { data: convenio, error: errConvenio } = await supabase
                .from(CONVENIOS_TABLE)
                .select(`
                    *,
                    plano:convenios_planos!inner(*)
                `)
                .eq('id', convenioId)
                .eq('convenios_planos.ativo', true)
                .single();

            if (errConvenio || !convenio) {
                return res.status(404).json({
                    success: false,
                    error: 'Convênio ou plano ativo não encontrado'
                });
            }

            const plano = convenio.plano[0];

            // Validar dados
            const validacao = validarDadosPreview(convenio, plano);
            if (!validacao.valido) {
                return res.status(400).json({
                    success: false,
                    errors: validacao.erros
                });
            }

            // Calcular período de referência
            const periodo = await calcularPeriodoReferencia(supabase, convenioId);

            // Buscar vagas extras finalizadas pendentes
            const { data: vagasExtras, error: errVagas } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .eq('tipo_vaga', 'extra')
                .eq('faturado', false)
                .not('data_saida', 'is', null)
                .order('data_saida', { ascending: true });

            if (errVagas) {
                console.error('Erro ao buscar vagas extras:', errVagas);
                return res.status(500).json({
                    success: false,
                    error: 'Erro ao buscar vagas extras'
                });
            }

            // Separar vagas pagas vs cortesia
            const vagasPagas = vagasExtras?.filter(v => v.tipo_vaga_extra === 'paga') || [];
            const vagasCortesia = vagasExtras?.filter(v => v.tipo_vaga_extra === 'cortesia') || [];

            // Calcular mensalidade
            const mensalidade = calcularMensalidade(plano);

            // Calcular totais de vagas extras
            const valorVagasExtras = vagasPagas.reduce((sum, v) => sum + (v.valor_cobrado || 0), 0);

            // Calcular próximo vencimento
            const diaVencimento = plano.dia_vencimento || plano.dia_vencimento_pagamento || 28;
            const proximoVencimento = calcularDataVencimento(diaVencimento, new Date());

            // Montar response
            const preview = {
                convenio: {
                    id: convenio.id,
                    nome_empresa: convenio.nome_empresa,
                    email: convenio.contato_email
                },
                plano: {
                    num_vagas_contratadas: plano.num_vagas_contratadas,
                    valor_mensal: plano.valor_mensal,
                    valor_por_vaga: plano.valor_por_vaga,
                    porcentagem_desconto: plano.porcentagem_desconto,
                    dia_vencimento: diaVencimento
                },
                periodo: {
                    texto: periodo.texto,
                    dataInicio: periodo.dataInicio,
                    dataFim: periodo.dataFim
                },
                itens: {
                    mensalidade: {
                        descricao: mensalidade.descricao,
                        valorBase: mensalidade.valorBase,
                        desconto: mensalidade.desconto,
                        valorFinal: mensalidade.valorFinal
                    },
                    vagasExtrasPagas: {
                        quantidade: vagasPagas.length,
                        valorUnitario: plano.valor_vaga_extra || 0,
                        valorTotal: valorVagasExtras,
                        detalhes: vagasPagas.map(v => ({
                            placa: v.placa,
                            dataEntrada: v.data_entrada,
                            dataSaida: v.data_saida,
                            valor: v.valor_cobrado
                        }))
                    },
                    vagasExtrasCortesia: {
                        quantidade: vagasCortesia.length,
                        detalhes: vagasCortesia.map(v => ({
                            placa: v.placa,
                            dataEntrada: v.data_entrada,
                            dataSaida: v.data_saida
                        }))
                    }
                },
                totais: {
                    subtotal: mensalidade.valorBase,
                    desconto: mensalidade.desconto,
                    vagasExtras: valorVagasExtras,
                    total: mensalidade.valorFinal + valorVagasExtras
                },
                proximoVencimento: proximoVencimento.toISOString().split('T')[0]
            };

            res.json({
                success: true,
                data: preview
            });

        } catch (err) {
            console.error('Erro no preview de fatura:', err);
            res.status(500).json({
                success: false,
                error: err.message || 'Erro interno do servidor'
            });
        }
    },

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
            let valorExtras = 0;
            let movimentacoesRegulares = [];
            let movimentacoesExtras = [];

            // CONVENIO CORPORATIVO UNIFICADO (antiga lógica pós-pago)
            // Buscar todas as movimentações não faturadas
            const { data: todasMovimentacoes } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .eq('faturado', false)
                .not('data_saida', 'is', null);

            if (!todasMovimentacoes || todasMovimentacoes.length === 0) {
                return res.status(400).json({
                    error: 'Não há movimentações não faturadas para este período'
                });
            }

            // Separar vagas regulares vs extras
            // VAGA REGULAR: veiculo_id IS NOT NULL (veículo cadastrado)
            // VAGA EXTRA: veiculo_id IS NULL (visitante vinculado manualmente)
            movimentacoesRegulares = todasMovimentacoes.filter(m => m.veiculo_id !== null);
            movimentacoesExtras = todasMovimentacoes.filter(m => m.veiculo_id === null);

            // Valor base = num_vagas_contratadas * valor_por_vaga (ou valor_mensal fixo)
            if (plano.valor_mensal) {
                valorBase = Number(plano.valor_mensal);
            } else if (plano.valor_por_vaga && plano.num_vagas_contratadas) {
                valorBase = Number(plano.valor_por_vaga) * Number(plano.num_vagas_contratadas);
            } else {
                return res.status(400).json({
                    error: 'Plano sem configuração de valor (valor_mensal ou valor_por_vaga não definidos)'
                });
            }

            // Calcular valor das vagas extras
            if (movimentacoesExtras.length > 0 && plano.valor_vaga_extra) {
                valorExtras = movimentacoesExtras.length * Number(plano.valor_vaga_extra);
            }

            const movimentacoesIds = todasMovimentacoes.map(m => m.id);

            // Calcular valores
            const extras = Number(valor_extras || 0) + valorExtras; // Vagas extras + outros extras
            const descontos = Number(valor_descontos || 0);
            const juros = 0; // Juros são calculados apenas após vencimento

            // Aplicar desconto percentual se configurado no plano
            let valorBaseComDesconto = valorBase;
            if (plano.porcentagem_desconto && Number(plano.porcentagem_desconto) > 0) {
                const descontoPercentual = Number(plano.porcentagem_desconto);
                valorBaseComDesconto = valorBase * (1 - descontoPercentual / 100);
            }

            const valorTotal = valorBaseComDesconto + extras - descontos + juros;

            // Calcular data de vencimento (campo unificado)
            const dataEmissao = data_emissao || new Date().toISOString().split('T')[0];
            const dataVencimento = calcularDataVencimento(
                plano.dia_vencimento || plano.dia_vencimento_pos_pago || plano.dia_vencimento_pagamento,
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
                observacoes: observacoes || `${movimentacoesRegulares.length} vagas regulares, ${movimentacoesExtras.length} vagas extras`
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

            // Marcar todas as movimentações como faturadas
            if (movimentacoesIds.length > 0) {
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
     * POST /api/convenios/:convenioId/fatura/gerar
     * Gera fatura oficial com PDF (novo fluxo)
     */
    async generateInvoice(req, res) {
        try {
            const { convenioId } = req.params;
            const {
                emailDestino,
                dataVencimento,
                observacoes
            } = req.body;

            // Validações
            if (!emailDestino) {
                return res.status(400).json({
                    success: false,
                    error: 'Email de destino é obrigatório'
                });
            }

            if (!dataVencimento) {
                return res.status(400).json({
                    success: false,
                    error: 'Data de vencimento é obrigatória'
                });
            }

            // Buscar convênio com plano ativo
            const { data: convenio, error: errConvenio } = await supabase
                .from(CONVENIOS_TABLE)
                .select(`
                    *,
                    plano:convenios_planos!inner(*)
                `)
                .eq('id', convenioId)
                .eq('convenios_planos.ativo', true)
                .single();

            if (errConvenio || !convenio) {
                return res.status(404).json({
                    success: false,
                    error: 'Convênio ou plano ativo não encontrado'
                });
            }

            const plano = convenio.plano[0];

            // Buscar vagas extras finalizadas pendentes
            const { data: vagasExtras, error: errVagas } = await supabase
                .from(MOVIMENTACOES_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .eq('tipo_vaga', 'extra')
                .eq('faturado', false)
                .not('data_saida', 'is', null)
                .order('data_saida', { ascending: true });

            if (errVagas) {
                throw new Error('Erro ao buscar vagas extras');
            }

            // Calcular período de referência
            const periodo = await calcularPeriodoReferencia(supabase, convenioId);

            // Verificar se há itens para faturar
            const temMensalidade = plano.valor_mensal || (plano.valor_por_vaga && plano.num_vagas_contratadas);
            const temVagasExtras = vagasExtras && vagasExtras.length > 0;

            if (!temMensalidade && !temVagasExtras) {
                return res.status(400).json({
                    success: false,
                    error: 'Não há itens pendentes para faturamento'
                });
            }

            // ================================================
            // INICIA TRANSAÇÃO ATÔMICA
            // ================================================

            let faturaId = null;
            let numeroFatura = null;
            let pdfPath = null;

            try {
                // STEP 1: Gerar número da fatura
                const anoAtual = new Date().getFullYear();
                numeroFatura = await gerarNumeroFaturaYYYYNNN(supabase, anoAtual);

                if (!numeroFatura) {
                    throw new Error('Falha ao gerar número sequencial');
                }

                // STEP 2: Calcular valores
                const mensalidade = calcularMensalidade(plano);
                const vagasPagas = vagasExtras?.filter(v => v.tipo_vaga_extra === 'paga') || [];
                const vagasCortesia = vagasExtras?.filter(v => v.tipo_vaga_extra === 'cortesia') || [];
                const valorVagasExtras = vagasPagas.reduce((sum, v) => sum + (v.valor_cobrado || 0), 0);

                const valorBase = mensalidade.valorBase;
                const valorDescontos = mensalidade.desconto;
                const valorExtras = valorVagasExtras;
                const valorTotal = mensalidade.valorFinal + valorVagasExtras;

                // STEP 3: Criar registro da fatura
                faturaId = uuid();
                const dataEmissao = new Date().toISOString().split('T')[0];

                const faturaData = {
                    id: faturaId,
                    convenio_id: convenioId,
                    numero_fatura: numeroFatura,
                    periodo_referencia: periodo.texto,
                    periodo_data_inicio: periodo.dataInicio,
                    periodo_data_fim: periodo.dataFim,
                    data_emissao: dataEmissao,
                    data_vencimento: dataVencimento,
                    valor_base: valorBase,
                    valor_extras: valorExtras,
                    valor_descontos: valorDescontos,
                    valor_juros: 0,
                    valor_total: valorTotal,
                    status: 'pendente',
                    email_envio: emailDestino,
                    num_vagas_cortesia: vagasCortesia.length,
                    num_vagas_pagas: vagasPagas.length,
                    observacoes: observacoes || `${vagasPagas.length} vagas extras pagas, ${vagasCortesia.length} cortesia`
                };

                const { data: faturaCreated, error: errFatura } = await supabase
                    .from(FATURAS_TABLE)
                    .insert(faturaData)
                    .select()
                    .single();

                if (errFatura) {
                    console.error('Erro ao criar fatura:', errFatura);
                    throw new Error(`Erro ao criar fatura: ${errFatura.message}`);
                }

                // STEP 4: Gerar PDF
                const storagePath = process.env.STORAGE_PATH || './storage';
                const { pdfPath: generatedPdfPath, pdfFilename } = await gerarPDFFatura(
                    faturaCreated,
                    convenio,
                    plano,
                    vagasExtras || [],
                    storagePath
                );

                pdfPath = generatedPdfPath;

                // STEP 5: Atualizar fatura com caminho do PDF
                const { error: errUpdatePdf } = await supabase
                    .from(FATURAS_TABLE)
                    .update({
                        pdf_path: pdfPath,
                        pdf_filename: pdfFilename,
                        pdf_generated_at: new Date().toISOString()
                    })
                    .eq('id', faturaId);

                if (errUpdatePdf) {
                    throw new Error(`Erro ao atualizar PDF: ${errUpdatePdf.message}`);
                }

                // STEP 6: Marcar vagas extras como faturadas
                if (vagasExtras && vagasExtras.length > 0) {
                    const vagasIds = vagasExtras.map(v => v.id);
                    const { error: errUpdate } = await supabase
                        .from(MOVIMENTACOES_TABLE)
                        .update({
                            faturado: true,
                            fatura_id: faturaId
                        })
                        .in('id', vagasIds);

                    if (errUpdate) {
                        throw new Error(`Erro ao atualizar vagas extras: ${errUpdate.message}`);
                    }
                }

                // STEP 7: Registrar no histórico
                await supabase.from(HISTORICO_TABLE).insert({
                    id: uuid(),
                    convenio_id: convenioId,
                    usuario_id: req.user?.id,
                    tipo_alteracao: 'geracao_fatura',
                    dados_novos: faturaData,
                    motivo: `Fatura ${numeroFatura} gerada com PDF`
                });

                // STEP 8: Log de auditoria
                await logEvent({
                    actor: req.user,
                    action: 'convenio.fatura.generate',
                    targetType: 'convenio_fatura',
                    targetId: faturaId,
                    details: {
                        convenio: convenio.nome_empresa,
                        numero_fatura: numeroFatura,
                        periodo: periodo.texto,
                        valor_total: valorTotal,
                        pdf_gerado: true
                    }
                });

                // SUCESSO - Retornar dados da fatura
                res.status(201).json({
                    success: true,
                    data: {
                        fatura: {
                            id: faturaId,
                            numero: numeroFatura,
                            dataEmissao: dataEmissao,
                            dataVencimento: dataVencimento,
                            periodo: periodo.texto,
                            valorTotal: valorTotal,
                            status: 'pendente',
                            pdfUrl: `/api/faturas/${faturaId}/download`,
                            pdfNomeArquivo: pdfFilename
                        }
                    },
                    message: 'Fatura gerada com sucesso'
                });

            } catch (atomicErr) {
                // ROLLBACK: Limpar o que foi criado
                console.error('Erro durante geração atômica:', atomicErr);

                // Deletar fatura se foi criada
                if (faturaId) {
                    await supabase.from(FATURAS_TABLE).delete().eq('id', faturaId);
                }

                // Deletar PDF se foi criado
                if (pdfPath && fs.existsSync(pdfPath)) {
                    try {
                        fs.unlinkSync(pdfPath);
                    } catch (e) {
                        console.error('Erro ao deletar PDF:', e);
                    }
                }

                // Retornar erro detalhado
                return res.status(500).json({
                    success: false,
                    error: {
                        code: 'FATURA_GENERATION_ERROR',
                        message: atomicErr.message,
                        details: atomicErr.stack
                    }
                });
            }

        } catch (err) {
            console.error('Erro no generateInvoice:', err);
            res.status(500).json({
                success: false,
                error: err.message || 'Erro interno do servidor'
            });
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
    },

    /**
     * GET /api/faturas/:faturaId/download
     * Download PDF da fatura
     */
    async downloadPDF(req, res) {
        try {
            const { faturaId } = req.params;

            // Buscar fatura com informações do convênio
            const { data: fatura, error } = await supabase
                .from(FATURAS_TABLE)
                .select(`
                    *,
                    convenio:convenios(nome_empresa)
                `)
                .eq('id', faturaId)
                .single();

            if (error || !fatura) {
                return res.status(404).json({
                    success: false,
                    error: 'Fatura não encontrada'
                });
            }

            // Verificar se PDF existe
            if (!fatura.pdf_path) {
                return res.status(404).json({
                    success: false,
                    error: 'PDF não disponível para esta fatura'
                });
            }

            // Verificar se arquivo existe no filesystem
            const storagePath = process.env.STORAGE_PATH || './storage';
            const fullPath = path.join(storagePath, fatura.pdf_path);

            if (!fs.existsSync(fullPath)) {
                console.error('PDF file not found:', fullPath);
                return res.status(404).json({
                    success: false,
                    error: 'Arquivo PDF não encontrado no servidor'
                });
            }

            // Gerar nome do arquivo para download
            const nomeEmpresa = fatura.convenio?.nome_empresa || 'Convenio';
            const nomeEmpresaFormatado = nomeEmpresa
                .replace(/[^a-zA-Z0-9]/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 30);

            const downloadFilename = fatura.pdf_filename || `Fatura-${fatura.numero_fatura}-${nomeEmpresaFormatado}.pdf`;

            // Definir headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

            // Stream do arquivo
            const fileStream = fs.createReadStream(fullPath);
            fileStream.pipe(res);

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.fatura.download',
                targetType: 'convenio_fatura',
                targetId: faturaId,
                details: {
                    numero_fatura: fatura.numero_fatura,
                    filename: downloadFilename
                }
            });

        } catch (err) {
            console.error('Erro no download PDF:', err);
            res.status(500).json({
                success: false,
                error: err.message || 'Erro ao fazer download do PDF'
            });
        }
    }
};
