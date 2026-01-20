/**
 * Endpoint: PATCH /api/vehicles/:id/vincular-convenio
 * Vincula um veículo operacional a um convênio como vaga extra
 */

import { supabase } from '../config/supabase.js';

const ticketsTable = 'tickets';

export default {
    async vincularConvenio(req, res) {
        try {
            const { id } = req.params;
            const { convenio_id, tipo_vaga_extra } = req.body; // Changed: tipo_vaga_extra instead of valor_cobrado
            const userId = req.user?.id;

            if (!convenio_id) {
                return res.status(400).json({ error: 'convenio_id é obrigatório' });
            }

            if (!tipo_vaga_extra || !['paga', 'cortesia'].includes(tipo_vaga_extra)) {
                return res.status(400).json({
                    error: 'tipo_vaga_extra é obrigatório e deve ser "paga" ou "cortesia"'
                });
            }


            // 1. Buscar o ticket/veículo
            console.log('[VincularConvenio] Buscando veículo ID:', id);
            const { data: ticket, error: ticketError } = await supabase
                .from(ticketsTable)
                .select('*')
                .eq('id', id)
                .single();

            console.log('[VincularConvenio] Resultado da busca:', {
                found: !!ticket,
                error: ticketError?.message,
                ticketData: ticket ? { id: ticket.id, plate: ticket.vehicle_plate } : null
            });

            if (ticketError || !ticket) {
                console.error('[VincularConvenio] Veículo não encontrado:', { id, error: ticketError });
                return res.status(404).json({ error: 'Veículo não encontrado' });
            }

            // 2. Verificar se já está vinculado
            if (ticket.metadata?.convenioId) {
                return res.status(400).json({ error: 'Veículo já está vinculado a um convênio' });
            }

            // 3. Verificar se convênio permite vagas extras
            const { data: convenio, error: convenioError } = await supabase
                .from('convenios')
                .select(`
                    *,
                    plano_ativo:convenios_planos!inner(permite_vagas_extras, ativo)
                `)
                .eq('id', convenio_id)
                .single();

            if (convenioError || !convenio) {
                return res.status(404).json({ error: 'Convênio não encontrado' });
            }

            const planoAtivo = Array.isArray(convenio.plano_ativo)
                ? convenio.plano_ativo.find(p => p.ativo === true)
                : null;

            if (!planoAtivo?.permite_vagas_extras) {
                return res.status(400).json({ error: 'Convênio não permite vagas extras' });
            }

            // 4. Atualizar metadata do ticket
            const metadata = ticket.metadata || {};
            metadata.convenioId = convenio_id;
            metadata.isConvenio = true;
            metadata.tipoVaga = 'extra';
            metadata.tipoVagaExtra = tipo_vaga_extra; // 'paga' or 'cortesia'
            metadata.vinculadoPor = userId;
            metadata.vinculadoEm = new Date().toISOString();
            // Note: valorCobrado will be calculated at EXIT time for 'paga' type


            const { data: updatedTicket, error: updateError } = await supabase
                .from(ticketsTable)
                .update({ metadata })
                .eq('id', id)
                .select()
                .single();

            if (updateError) {
                console.error('[VincularConvenio] Erro ao atualizar ticket:', updateError);
                return res.status(500).json({ error: 'Erro ao vincular veículo ao convênio' });
            }

            // 5. Registrar na tabela de movimentações do convênio
            const movimentacaoData = {
                convenio_id,
                placa: ticket.vehicle_plate,
                tipo_veiculo: ticket.vehicle_type,
                data_entrada: ticket.entry_time ? new Date(ticket.entry_time).toISOString().split('T')[0] : null,
                hora_entrada: ticket.entry_time ? new Date(ticket.entry_time).toTimeString().slice(0, 5) : null,
                tipo_vaga: 'extra',
                tipo_vaga_extra: tipo_vaga_extra, // 'paga' or 'cortesia'
                valor_cobrado: 0, // Will be calculated at exit for 'paga', remains 0 for 'cortesia'
                vinculado_por: userId,
                vinculado_em: new Date().toISOString()
            };

            console.log('[VincularConvenio] 📝 Inserindo movimentação:', JSON.stringify(movimentacaoData, null, 2));

            const { data: movInserted, error: movError } = await supabase
                .from('convenios_movimentacoes')
                .insert(movimentacaoData)
                .select()
                .single();


            if (movError) {
                console.error('[VincularConvenio] ❌ Erro ao registrar movimentação:', movError);
                // Não falhar a requisição, apenas logar
            } else {
                console.log('[VincularConvenio] ✅ Movimentação registrada com sucesso! ID:', movInserted?.id);
                console.log('[VincularConvenio] 📊 Dados salvos:', JSON.stringify(movInserted, null, 2));
            }

            console.log('[VincularConvenio] ✅ Veículo vinculado com sucesso!');

            res.json({
                message: 'Veículo vinculado com sucesso',
                vehicle: updatedTicket
            });
        } catch (err) {
            console.error('[VincularConvenio] ❌ Erro ao vincular convênio:', err);
            res.status(500).json({ error: err.message || 'Erro interno do servidor' });
        }
    }
};

