/**
 * Vagas Extras Controller
 * Endpoints para gerenciamento de vagas extras
 */

import { supabase } from '../config/supabase.js';

export default {
    /**
     * GET /api/convenios/:id/vagas-extras
     * Lista vagas extras de um convênio
     */
    async list(req, res) {
        try {
            const { convenioId: id } = req.params;
            const { dataInicio, dataFim } = req.query;

            if (!dataInicio || !dataFim) {
                return res.status(400).json({
                    error: 'dataInicio e dataFim são obrigatórios'
                });
            }

            // Buscar movimentações de vagas extras
            console.log('[VagasExtrasController] Buscando vagas extras:', { id, dataInicio, dataFim });

            let query = supabase
                .from('convenios_movimentacoes')
                .select(`
                    *,
                    vinculado_por_usuario:users!vinculado_por(id, name, login)
                `)
                .eq('convenio_id', id)
                .eq('tipo_vaga', 'extra')
                .gte('data_entrada', dataInicio)
                .lte('data_entrada', dataFim)
                .order('data_entrada', { ascending: false });

            console.log('[VagasExtrasController] 🔍 Query params:', {
                convenio_id: id,
                tipo_vaga: 'extra',
                dataInicio,
                dataFim
            });

            const { data, error } = await query;

            console.log('[VagasExtrasController] 📊 Resultado da query:', {
                count: data?.length || 0,
                error: error?.message,
                hasData: !!data,
                firstVaga: data?.[0],
                allRecords: data
            });

            if (error) {
                console.error('[VagasExtrasController] ❌ Erro ao buscar vagas extras:', error);
                return res.status(500).json({ error: error.message });
            }

            // Calcular resumo com diferenciação entre paga e cortesia
            const resumo = {
                total: data.length,
                cortesia: data.filter(v => v.tipo_vaga_extra === 'cortesia').length,
                pagas: data.filter(v => v.tipo_vaga_extra === 'paga').length,
                valorTotal: data.reduce((sum, v) => sum + (v.valor_cobrado || 0), 0)
            };

            console.log('[VagasExtrasController] 📈 Resumo calculado:', resumo);

            res.json({
                vagas: data,
                resumo
            });

        } catch (err) {
            console.error('Erro ao listar vagas extras:', err);
            res.status(500).json({ error: err.message || 'Erro interno do servidor' });
        }
    },

    /**
     * GET /api/convenios/:id/vagas-extras/exportar
     * Exporta vagas extras para Excel
     */
    async exportar(req, res) {
        try {
            const { convenioId: id } = req.params;
            const { dataInicio, dataFim } = req.query;

            if (!dataInicio || !dataFim) {
                return res.status(400).json({
                    error: 'dataInicio e dataFim são obrigatórios'
                });
            }

            // Buscar dados
            const { data, error } = await supabase
                .from('convenios_movimentacoes')
                .select(`
                    *,
                    convenio:convenios(nome_empresa),
                    vinculado_por_usuario:users!vinculado_por(id, name)
                `)
                .eq('convenio_id', id)
                .eq('tipo_vaga', 'extra')
                .gte('data_entrada', dataInicio)
                .lte('data_entrada', dataFim)
                .order('data_entrada', { ascending: false });

            if (error) {
                console.error('Erro ao buscar vagas extras:', error);
                return res.status(500).json({ error: error.message });
            }

            // Formatar para CSV (simplificado - pode usar biblioteca como 'xlsx' para Excel real)
            const csvRows = [
                ['Placa', 'Tipo Veículo', 'Data Entrada', 'Hora Entrada', 'Data Saída', 'Hora Saída', 'Tipo Vaga', 'Valor Cobrado', 'Operador'].join(',')
            ];

            data.forEach(vaga => {
                csvRows.push([
                    vaga.placa || '',
                    vaga.tipo_veiculo || '',
                    vaga.data_entrada || '',
                    vaga.hora_entrada || '',
                    vaga.data_saida || '',
                    vaga.hora_saida || '',
                    vaga.tipo_vaga_extra === 'cortesia' ? 'Cortesia' : 'Paga',
                    (vaga.valor_cobrado || 0).toFixed(2),
                    vaga.vinculado_por_usuario?.name || 'N/A'
                ].join(','));
            });

            const csv = csvRows.join('\n');
            const nomeConvenio = data[0]?.convenio?.nome_empresa || 'Convenio';
            const filename = `vagas-extras-${nomeConvenio.replace(/\s+/g, '-')}-${dataInicio}-${dataFim}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send('\uFEFF' + csv); // BOM para UTF-8

        } catch (err) {
            console.error('Erro ao exportar vagas extras:', err);
            res.status(500).json({ error: err.message || 'Erro interno do servidor' });
        }
    }
};
