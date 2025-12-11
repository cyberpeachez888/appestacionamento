/**
 * Convenios Veiculos Controller
 * Gerenciamento de veículos autorizados em convênios
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../services/auditService.js';

const VEICULOS_TABLE = 'convenios_veiculos';
const CONVENIOS_TABLE = 'convenios';
const HISTORICO_TABLE = 'convenios_historico';

export default {
    /**
     * GET /api/convenios/:convenioId/veiculos
     * Lista veículos de um convênio
     */
    async list(req, res) {
        try {
            const { convenioId } = req.params;
            const { ativo } = req.query;

            let query = supabase
                .from(VEICULOS_TABLE)
                .select('*')
                .eq('convenio_id', convenioId)
                .order('created_at', { ascending: false });

            if (ativo !== undefined) {
                query = query.eq('ativo', ativo === 'true');
            }

            const { data, error } = await query;

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            res.json(data);
        } catch (err) {
            console.error('Erro no list veículos:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * POST /api/convenios/:convenioId/veiculos
     * Adiciona veículo ao convênio
     */
    async create(req, res) {
        try {
            const { convenioId } = req.params;
            const {
                placa,
                modelo,
                cor,
                proprietario_nome,
                proprietario_cpf,
                observacoes
            } = req.body;

            // Validações
            if (!placa) {
                return res.status(400).json({ error: 'Placa é obrigatória' });
            }

            // Verificar se convênio existe
            const { data: convenio } = await supabase
                .from(CONVENIOS_TABLE)
                .select('id, nome_empresa')
                .eq('id', convenioId)
                .single();

            if (!convenio) {
                return res.status(404).json({ error: 'Convênio não encontrado' });
            }

            // Normalizar placa (uppercase, sem espaços)
            const placaNormalizada = placa.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

            // Verificar se placa já existe neste convênio
            const { data: existente } = await supabase
                .from(VEICULOS_TABLE)
                .select('id')
                .eq('convenio_id', convenioId)
                .eq('placa', placaNormalizada)
                .single();

            if (existente) {
                return res.status(400).json({
                    error: 'Esta placa já está cadastrada neste convênio'
                });
            }

            // Criar veículo
            const veiculoData = {
                id: uuid(),
                convenio_id: convenioId,
                placa: placaNormalizada,
                modelo: modelo || null,
                cor: cor || null,
                proprietario_nome: proprietario_nome || null,
                proprietario_cpf: proprietario_cpf || null,
                ativo: true,
                observacoes: observacoes || null
            };

            const { data, error } = await supabase
                .from(VEICULOS_TABLE)
                .insert(veiculoData)
                .select()
                .single();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Registrar no histórico do convênio
            await supabase.from(HISTORICO_TABLE).insert({
                id: uuid(),
                convenio_id: convenioId,
                usuario_id: req.user?.id,
                tipo_alteracao: 'adicao_veiculo',
                dados_novos: veiculoData,
                motivo: `Veículo ${placaNormalizada} adicionado ao convênio`
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.veiculo.add',
                targetType: 'convenio_veiculo',
                targetId: data.id,
                details: {
                    convenio: convenio.nome_empresa,
                    placa: placaNormalizada
                }
            });

            res.status(201).json(data);
        } catch (err) {
            console.error('Erro no create veículo:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * PATCH /api/convenios/:convenioId/veiculos/:veiculoId
     * Atualiza dados do veículo
     */
    async update(req, res) {
        try {
            const { convenioId, veiculoId } = req.params;
            const updates = req.body;

            // Buscar veículo
            const { data: veiculo } = await supabase
                .from(VEICULOS_TABLE)
                .select('*')
                .eq('id', veiculoId)
                .eq('convenio_id', convenioId)
                .single();

            if (!veiculo) {
                return res.status(404).json({ error: 'Veículo não encontrado' });
            }

            // Normalizar placa se estiver sendo alterada
            if (updates.placa) {
                updates.placa = updates.placa.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
            }

            // Atualizar
            const { data, error } = await supabase
                .from(VEICULOS_TABLE)
                .update(updates)
                .eq('id', veiculoId)
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
                tipo_alteracao: 'edicao_veiculo',
                dados_anteriores: veiculo,
                dados_novos: data,
                motivo: `Veículo ${veiculo.placa} atualizado`
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.veiculo.update',
                targetType: 'convenio_veiculo',
                targetId: veiculoId,
                details: { placa: veiculo.placa, updates }
            });

            res.json(data);
        } catch (err) {
            console.error('Erro no update veículo:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * DELETE /api/convenios/:convenioId/veiculos/:veiculoId
     * Remove veículo (soft delete - marca como inativo)
     */
    async delete(req, res) {
        try {
            const { convenioId, veiculoId } = req.params;

            // Buscar veículo
            const { data: veiculo } = await supabase
                .from(VEICULOS_TABLE)
                .select('*')
                .eq('id', veiculoId)
                .eq('convenio_id', convenioId)
                .single();

            if (!veiculo) {
                return res.status(404).json({ error: 'Veículo não encontrado' });
            }

            // Soft delete - marcar como inativo
            const { data, error } = await supabase
                .from(VEICULOS_TABLE)
                .update({ ativo: false })
                .eq('id', veiculoId)
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
                tipo_alteracao: 'remocao_veiculo',
                dados_anteriores: veiculo,
                dados_novos: data,
                motivo: `Veículo ${veiculo.placa} removido do convênio`
            });

            // Log de auditoria
            await logEvent({
                actor: req.user,
                action: 'convenio.veiculo.remove',
                targetType: 'convenio_veiculo',
                targetId: veiculoId,
                details: { placa: veiculo.placa }
            });

            res.json({ message: 'Veículo removido com sucesso', data });
        } catch (err) {
            console.error('Erro no delete veículo:', err);
            res.status(500).json({ error: err.message || err });
        }
    },

    /**
     * GET /api/convenios/veiculos/verificar/:placa
     * Verifica se placa está autorizada em algum convênio
     */
    async verificarPlaca(req, res) {
        try {
            const { placa } = req.params;

            const placaNormalizada = placa.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

            const { data, error } = await supabase
                .from(VEICULOS_TABLE)
                .select(`
          *,
          convenio:convenios(
            id,
            nome_empresa,
            status,
            tipo_convenio
          )
        `)
                .eq('placa', placaNormalizada)
                .eq('ativo', true);

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            if (!data || data.length === 0) {
                return res.json({
                    autorizado: false,
                    message: 'Placa não autorizada em nenhum convênio'
                });
            }

            // Filtrar apenas convênios ativos
            const conveniosAtivos = data.filter(v => v.convenio?.status === 'ativo');

            if (conveniosAtivos.length === 0) {
                return res.json({
                    autorizado: false,
                    message: 'Convênio suspenso ou inativo'
                });
            }

            res.json({
                autorizado: true,
                veiculos: conveniosAtivos
            });
        } catch (err) {
            console.error('Erro no verificarPlaca:', err);
            res.status(500).json({ error: err.message || err });
        }
    }
};
