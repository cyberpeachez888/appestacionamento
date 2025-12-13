/**
 * Convenios Jobs Controller
 * Executa verificações automáticas (Crons)
 */

import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';

const CONVENIOS_TABLE = 'convenios';
const FATURAS_TABLE = 'convenios_faturas';
const NOTIFICACOES_TABLE = 'notificacoes';

export const checkVencimentos = async () => {
    const hoje = new Date();
    const daqui30dias = new Date();
    daqui30dias.setDate(hoje.getDate() + 30);
    const daqui7dias = new Date();
    daqui7dias.setDate(hoje.getDate() + 7);

    // Formato YYYY-MM-DD
    const data30Str = daqui30dias.toISOString().split('T')[0];
    const data7Str = daqui7dias.toISOString().split('T')[0];

    // Buscar convênios que vencem exatamente nestas datas
    const { data: convenios, error } = await supabase
        .from(CONVENIOS_TABLE)
        .select('id, nome_empresa, data_vencimento_contrato')
        .eq('status', 'ativo')
        .in('data_vencimento_contrato', [data30Str, data7Str]);

    if (error) throw error;

    const notificacoes = [];

    for (const conv of convenios) {
        const diasRestantes = conv.data_vencimento_contrato === data7Str ? 7 : 30;

        notificacoes.push({
            id: uuid(),
            titulo: `Contrato Vencendo (${diasRestantes} dias)`,
            mensagem: `O contrato do convênio ${conv.nome_empresa} vence em ${diasRestantes} dias.`,
            tipo: 'alerta', // alerta, info, erro, sucesso
            lida: false,
            link: `/convenios?id=${conv.id}` // Link para abrir detalhes se frontend suportar
        });
    }

    if (notificacoes.length > 0) {
        const { error: insertError } = await supabase
            .from(NOTIFICACOES_TABLE)
            .insert(notificacoes);

        if (insertError) throw insertError;
    }

    return notificacoes.length;
};

export const checkFaturas = async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const dataOntem = ontem.toISOString().split('T')[0];

    // Buscar faturas vencidas ONTEM
    const { data: faturas, error } = await supabase
        .from(FATURAS_TABLE)
        .select('id, numero_fatura, data_vencimento, valor_total, convenios(nome_empresa)')
        .eq('status', 'pendente') // ou 'aguardando'
        .eq('data_vencimento', dataOntem);

    if (error) throw error;

    const notificacoes = [];

    for (const fat of faturas) {
        // @ts-ignore
        const empresa = fat.convenios?.nome_empresa || 'Empresa';

        notificacoes.push({
            id: uuid(),
            titulo: 'Fatura em Atraso',
            mensagem: `A fatura ${fat.numero_fatura} de ${empresa} venceu ontem (${fat.data_vencimento}).`,
            tipo: 'erro',
            lida: false,
            link: `/convenios` // Idealmente deep link
        });
    }

    if (notificacoes.length > 0) {
        const { error: insertError } = await supabase
            .from(NOTIFICACOES_TABLE)
            .insert(notificacoes);

        if (insertError) throw insertError;
    }

    return notificacoes.length;
};

export default {
    /**
     * POST /api/convenios/jobs/verificar-vencimentos
     * Verifica contratos vencendo em 30 ou 7 dias
     */
    async verificarVencimentosContrato(req, res) {
        try {
            const geradas = await checkVencimentos();
            res.json({ message: 'Verificação concluída', geradas });
        } catch (err) {
            console.error('Erro job verificar-vencimentos:', err);
            res.status(500).json({ error: err.message });
        }
    },

    /**
     * POST /api/convenios/jobs/verificar-faturas-atrasadas
     * Verifica faturas não pagas com data de vencimento passada
     */
    async verificarFaturasAtrasadas(req, res) {
        try {
            const geradas = await checkFaturas();
            res.json({ message: 'Verificação faturas concluída', geradas });
        } catch (err) {
            console.error('Erro job verificar-faturas:', err);
            res.status(500).json({ error: err.message });
        }
    }
};
