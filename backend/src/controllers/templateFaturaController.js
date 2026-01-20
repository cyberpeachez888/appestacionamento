/**
 * Template Fatura Controller
 * Gerenciamento de templates configuráveis para faturas
 */

import { supabase } from '../config/supabase.js';
import { logEvent } from '../services/auditLogger.js';

const TEMPLATE_TABLE = 'configuracoes_template_fatura';

export default {
    /**
     * GET /api/configuracoes/template-fatura
     * Obter template ativo
     */
    async getTemplateAtivo(req, res) {
        try {
            const { data: template, error } = await supabase
                .from(TEMPLATE_TABLE)
                .select('*')
                .eq('ativo', true)
                .single();

            if (error) {
                // Se não existe template, retornar erro específico
                if (error.code === 'PGRST116') {
                    return res.status(404).json({
                        success: false,
                        error: {
                            code: 'MISSING_TEMPLATE',
                            message: 'Template não configurado. Configure antes de gerar faturas.',
                            action: 'CONFIGURE_TEMPLATE'
                        }
                    });
                }
                throw error;
            }

            res.json({
                success: true,
                data: {
                    template
                }
            });

        } catch (err) {
            console.error('Erro ao buscar template:', err);
            res.status(500).json({
                success: false,
                error: err.message || 'Erro ao carregar template'
            });
        }
    },

    /**
     * PUT /api/configuracoes/template-fatura
     * Atualizar template ativo
     */
    async atualizarTemplate(req, res) {
        try {
            const {
                // Dados da empresa
                nome_empresa,
                razao_social,
                cnpj,
                endereco,
                cidade,
                estado,
                cep,
                telefone,
                email,
                website,

                // Dados bancários
                banco_nome,
                banco_agencia,
                banco_conta,
                pix_chave,
                pix_tipo,

                // Rótulos
                titulo_fatura,
                label_numero,
                label_periodo,
                label_emissao,
                label_vencimento,
                label_dados_cliente,
                label_modalidade,
                label_movimentacoes,
                label_discriminacao,
                label_observacoes,
                label_pagamento,
                texto_rodape,

                // Cores
                cor_cabecalho,
                cor_destaque,
                cor_texto_primario,
                cor_texto_secundario
            } = req.body;

            // Validações obrigatórias
            if (!nome_empresa || nome_empresa.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Nome da empresa é obrigatório',
                        details: {
                            nome_empresa: 'Campo obrigatório'
                        }
                    }
                });
            }

            if (!cnpj || cnpj.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'CNPJ é obrigatório',
                        details: {
                            cnpj: 'Campo obrigatório'
                        }
                    }
                });
            }

            // Validar formato CNPJ (básico)
            const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
            if (cnpjLimpo.length !== 14) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'CNPJ inválido',
                        details: {
                            cnpj: 'CNPJ deve ter 14 dígitos'
                        }
                    }
                });
            }

            // Validar email se preenchido
            if (email && email.trim() !== '') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Email inválido',
                            details: {
                                email: 'Formato de email inválido'
                            }
                        }
                    });
                }
            }

            // Validar tipo PIX se chave fornecida
            if (pix_chave && pix_chave.trim() !== '') {
                const tiposValidos = ['email', 'telefone', 'cpf', 'cnpj', 'aleatoria'];
                if (pix_tipo && !tiposValidos.includes(pix_tipo)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Tipo de chave PIX inválido',
                            details: {
                                pix_tipo: `Deve ser um de: ${tiposValidos.join(', ')}`
                            }
                        }
                    });
                }
            }

            // Buscar template ativo atual
            const { data: templateAtual, error: errorBusca } = await supabase
                .from(TEMPLATE_TABLE)
                .select('id')
                .eq('ativo', true)
                .single();

            if (errorBusca && errorBusca.code !== 'PGRST116') {
                throw errorBusca;
            }

            // Preparar dados para update
            const dadosAtualizacao = {
                nome_empresa: nome_empresa?.trim(),
                razao_social: razao_social?.trim() || null,
                cnpj: cnpj?.trim(),
                endereco: endereco?.trim() || null,
                cidade: cidade?.trim() || null,
                estado: estado?.trim() || null,
                cep: cep?.trim() || null,
                telefone: telefone?.trim() || null,
                email: email?.trim() || null,
                website: website?.trim() || null,
                banco_nome: banco_nome?.trim() || null,
                banco_agencia: banco_agencia?.trim() || null,
                banco_conta: banco_conta?.trim() || null,
                pix_chave: pix_chave?.trim() || null,
                pix_tipo: pix_tipo || null,
                titulo_fatura: titulo_fatura?.trim() || 'FATURA',
                label_numero: label_numero?.trim() || 'Nº Fatura',
                label_periodo: label_periodo?.trim() || 'Período',
                label_emissao: label_emissao?.trim() || 'Emissão',
                label_vencimento: label_vencimento?.trim() || 'Vencimento',
                label_dados_cliente: label_dados_cliente?.trim() || 'DADOS DO CLIENTE',
                label_modalidade: label_modalidade?.trim() || 'MODALIDADE',
                label_movimentacoes: label_movimentacoes?.trim() || 'MOVIMENTAÇÕES DO PERÍODO',
                label_discriminacao: label_discriminacao?.trim() || 'DISCRIMINAÇÃO DE VALORES',
                label_observacoes: label_observacoes?.trim() || 'OBSERVAÇÕES',
                label_pagamento: label_pagamento?.trim() || 'INSTRUÇÕES DE PAGAMENTO',
                texto_rodape: texto_rodape?.trim() || null,
                cor_cabecalho: cor_cabecalho || '#3B82F6',
                cor_destaque: cor_destaque || '#10B981',
                cor_texto_primario: cor_texto_primario || '#000000',
                cor_texto_secundario: cor_texto_secundario || '#6B7280',
                updated_at: new Date().toISOString()
            };

            let template;

            if (templateAtual) {
                // Atualizar template existente
                const { data, error } = await supabase
                    .from(TEMPLATE_TABLE)
                    .update(dadosAtualizacao)
                    .eq('id', templateAtual.id)
                    .select()
                    .single();

                if (error) throw error;
                template = data;

            } else {
                // Criar novo template (não deveria acontecer se migration rodou)
                const { data, error } = await supabase
                    .from(TEMPLATE_TABLE)
                    .insert({
                        ...dadosAtualizacao,
                        ativo: true
                    })
                    .select()
                    .single();

                if (error) throw error;
                template = data;
            }

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'template_fatura.update',
                targetType: 'template_fatura',
                targetId: template.id,
                details: {
                    nome_empresa: template.nome_empresa,
                    cnpj: template.cnpj
                }
            });

            res.json({
                success: true,
                message: 'Template atualizado com sucesso',
                data: {
                    template
                }
            });

        } catch (err) {
            console.error('Erro ao atualizar template:', err);
            res.status(500).json({
                success: false,
                error: err.message || 'Erro ao atualizar template'
            });
        }
    },

    /**
     * POST /api/configuracoes/template-fatura/restaurar-padrao
     * Restaurar template para valores padrão de fábrica
     */
    async restaurarPadrao(req, res) {
        try {
            const dadosPadrao = {
                nome_empresa: 'Parking System',
                razao_social: 'Parking System Ltda',
                cnpj: '00.000.000/0001-00',
                endereco: 'Rua Exemplo, 123 - Centro',
                cidade: 'São Paulo',
                estado: 'SP',
                cep: '00000-000',
                telefone: '(00) 0000-0000',
                email: 'contato@parkingsystem.com.br',
                website: null,
                banco_nome: 'Banco Exemplo',
                banco_agencia: '0000',
                banco_conta: '00000-0',
                pix_chave: null,
                pix_tipo: null,
                titulo_fatura: 'FATURA',
                label_numero: 'Nº Fatura',
                label_periodo: 'Período',
                label_emissao: 'Emissão',
                label_vencimento: 'Vencimento',
                label_dados_cliente: 'DADOS DO CLIENTE',
                label_modalidade: 'MODALIDADE',
                label_movimentacoes: 'MOVIMENTAÇÕES DO PERÍODO',
                label_discriminacao: 'DISCRIMINAÇÃO DE VALORES',
                label_observacoes: 'OBSERVAÇÕES',
                label_pagamento: 'INSTRUÇÕES DE PAGAMENTO',
                texto_rodape: 'Pagamento também pode ser realizado via PIX, cartão ou dinheiro no local.',
                cor_cabecalho: '#3B82F6',
                cor_destaque: '#10B981',
                cor_texto_primario: '#000000',
                cor_texto_secundario: '#6B7280',
                logo_url: null,
                updated_at: new Date().toISOString()
            };

            // Buscar template ativo
            const { data: templateAtual } = await supabase
                .from(TEMPLATE_TABLE)
                .select('id')
                .eq('ativo', true)
                .single();

            if (templateAtual) {
                // Atualizar para padrão
                const { data: template, error } = await supabase
                    .from(TEMPLATE_TABLE)
                    .update(dadosPadrao)
                    .eq('id', templateAtual.id)
                    .select()
                    .single();

                if (error) throw error;

                // Log
                await logEvent({
                    actor: req.user,
                    action: 'template_fatura.restore_default',
                    targetType: 'template_fatura',
                    targetId: template.id,
                    details: { restored: true }
                });

                res.json({
                    success: true,
                    message: 'Template restaurado para padrão de fábrica',
                    data: { template }
                });

            } else {
                // Criar novo com padrão
                const { data: template, error } = await supabase
                    .from(TEMPLATE_TABLE)
                    .insert({ ...dadosPadrao, ativo: true })
                    .select()
                    .single();

                if (error) throw error;

                res.json({
                    success: true,
                    message: 'Template padrão criado',
                    data: { template }
                });
            }

        } catch (err) {
            console.error('Erro ao restaurar padrão:', err);
            res.status(500).json({
                success: false,
                error: err.message || 'Erro ao restaurar template padrão'
            });
        }
    }
};
