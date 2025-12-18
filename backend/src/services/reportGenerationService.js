import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Report Generation Service
 * Generates PDF, Thermal (ESC/POS compatible text), and XML reports
 */

export default {
    /**
     * Generate Thermal Report (Plain Text / ESC/POS subset)
     */
    async generateThermal(data) {
        const { session, totals, stats, company } = data;
        const separator = '='.repeat(40);
        const dashRow = '-'.repeat(40);

        let content = '';
        content += `${separator}\n`;
        if (company.name) content += `${centerAlign(company.name, 40)}\n`;
        if (company.cnpj) content += `${centerAlign(company.cnpj, 40)}\n`;
        if (company.address) content += `${centerAlign(company.address, 40)}\n`;
        content += `${separator}\n`;
        content += `${centerAlign('FECHAMENTO DE CAIXA DIÁRIO', 40)}\n`;
        content += `${centerAlign(`Relatório Nº: ${session.report_sequential_number || '---'}`, 40)}\n`;
        content += `${separator}\n`;

        content += `Data: ${format(new Date(), 'dd/MM/yyyy')}\n`;
        content += `Abertura: ${format(new Date(session.opened_at), 'HH:mm')}\n`;
        content += `Fechamento: ${session.closed_at ? format(new Date(session.closed_at), 'HH:mm') : 'ABERTO'}\n`;
        content += `Operador: ${session.operator_name}\n`;
        content += `${separator}\n\n`;

        content += `RESUMO FINANCEIRO\n`;
        content += `${dashRow}\n`;
        content += `Saldo Inicial:        R$ ${formatCurrency(session.opening_amount)}\n`;
        content += `(+) Total Entradas:   R$ ${formatCurrency(totals.receitas)}\n`;
        if (totals.suprimentos > 0) content += `(+) Suprimentos:      R$ ${formatCurrency(totals.suprimentos)}\n`;
        content += `(-) Total Saídas:     R$ ${formatCurrency(totals.sangrias)}\n`;
        content += `(=) Saldo Final:      R$ ${formatCurrency(session.closing_amount || totals.saldoFinalEsperado)}\n`;
        content += `${dashRow}\n`;
        content += `Diferença Esp. x Real: R$ ${formatCurrency(session.difference || 0)}\n`;
        content += `${separator}\n\n`;

        content += `TOTAIS POR CATEGORIA\n`;
        content += `${dashRow}\n`;
        content += `Mensalistas:          R$ ${formatCurrency(totals.porCategoria.mensalista)}\n`;
        content += `Avulsos:              R$ ${formatCurrency(totals.porCategoria.avulso)}\n`;
        content += `Convênios:            R$ ${formatCurrency(totals.porCategoria.convenio)}\n`;
        content += `${separator}\n\n`;

        content += `FORMAS DE PAGAMENTO\n`;
        content += `${dashRow}\n`;
        Object.entries(totals.porMetodo).forEach(([method, value]) => {
            content += `${leftRightAlign(translateMethod(method), `R$ ${formatCurrency(value)}`, 40)}\n`;
        });
        content += `${separator}\n\n`;

        content += `DADOS IMPORTANTES\n`;
        content += `${dashRow}\n`;
        content += `Total de Veículos: ${stats.totalVeiculos}\n`;
        content += `Ticket Médio: R$ ${formatCurrency(stats.ticketMedio)}\n`;
        content += `Tempo Médio: ${formatDuration(stats.tempoMedio)}\n`;
        content += `${separator}\n\n`;

        content += `Assinatura: _______________________\n\n`;
        content += `${separator}\n`;
        content += `${centerAlign('Sistema ProParking v1.0', 40)}\n`;
        content += `${centerAlign(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40)}\n`;
        content += `${separator}\n`;

        return content;
    },

    /**
     * Generate PDF Report (A4)
     */
    async generatePDF(data) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const { session, totals, stats, company, tickets, transactions } = data;

            // Header
            doc.fontSize(20).text('FECHAMENTO DE CAIXA DIÁRIO', { align: 'center' });
            doc.fontSize(12).text(`Relatório Nº: ${session.report_sequential_number || '---'}`, { align: 'center' });
            doc.moveDown();

            // Company Info
            doc.fontSize(10).text(company.name, { align: 'center' });
            doc.text(`${company.cnpj} - ${company.address}`, { align: 'center' });
            doc.text(`Tel: ${company.phone}`, { align: 'center' });
            doc.moveDown();

            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();

            // Session Summary
            doc.fontSize(12).text('RESUMO DA SESSÃO', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);
            const row1Y = doc.y;
            doc.text(`Operador: ${session.operator_name}`, 50, row1Y);
            doc.text(`Data: ${format(new Date(session.opened_at), 'dd/MM/yyyy')}`, 200, row1Y);
            doc.text(`Abertura: ${format(new Date(session.opened_at), 'HH:mm')}`, 350, row1Y);
            doc.text(`Fechamento: ${session.closed_at ? format(new Date(session.closed_at), 'HH:mm') : 'ABERTO'}`, 450, row1Y);
            doc.moveDown();

            // Financials
            doc.fontSize(12).text('FINANCEIRO', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);
            doc.text(`Saldo Inicial: R$ ${formatCurrency(session.opening_amount)}`);
            doc.text(`(+) Receitas: R$ ${formatCurrency(totals.receitas)}`);
            doc.text(`(+) Suprimentos: R$ ${formatCurrency(totals.suprimentos)}`);
            doc.text(`(-) Sangrias: R$ ${formatCurrency(totals.sangrias)}`);
            doc.fontSize(12).text(`(=) Saldo Final: R$ ${formatCurrency(session.closing_amount || totals.saldoFinalEsperado)}`, { bold: true });
            doc.fontSize(10).text(`Diferença (Esperado x Real): R$ ${formatCurrency(session.difference || 0)}`);
            doc.moveDown();

            // Totals by Category
            doc.fontSize(12).text('TOTAIS POR CATEGORIA', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);
            doc.text(`Mensalistas: R$ ${formatCurrency(totals.porCategoria.mensalista)}`);
            doc.text(`Avulsos: R$ ${formatCurrency(totals.porCategoria.avulso)}`);
            doc.text(`Convênios: R$ ${formatCurrency(totals.porCategoria.convenio)}`);
            doc.moveDown();

            // Stats
            doc.fontSize(12).text('ESTATÍSTICAS', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);
            doc.text(`Total de Veículos: ${stats.totalVeiculos}`);
            doc.text(`Ticket Médio: R$ ${formatCurrency(stats.ticketMedio)}`);
            doc.text(`Tempo Médio de Permanência: ${formatDuration(stats.tempoMedio)}`);
            doc.text(`Horário de Pico: ${stats.picoMovimento}`);
            doc.moveDown();

            // Transactions Table
            if (tickets && tickets.length > 0) {
                doc.addPage();
                doc.fontSize(12).text('DETALHAMENTO DE TRANSAÇÕES', { underline: true });
                doc.moveDown();
                doc.fontSize(8);

                let y = doc.y;
                doc.text('Horário', 50, y);
                doc.text('Placa', 100, y);
                doc.text('Tipo', 160, y);
                doc.text('Cat.', 220, y);
                doc.text('Entrada', 280, y);
                doc.text('Saída', 340, y);
                doc.text('Vlr', 400, y);
                doc.text('Pgto', 450, y);
                y += 15;

                tickets.forEach(t => {
                    if (y > 750) { doc.addPage(); y = 50; }
                    doc.text(format(new Date(t.exit_time), 'HH:mm'), 50, y);
                    doc.text(t.vehicle_plate, 100, y);
                    doc.text(t.vehicle_type, 160, y, { width: 50 });
                    doc.text(t.metadata?.isConvenio ? 'Conv.' : 'Avulso', 220, y);
                    doc.text(format(new Date(t.entry_time), 'dd/MM HH:mm'), 280, y);
                    doc.text(format(new Date(t.exit_time || ''), 'dd/MM HH:mm'), 340, y);
                    doc.text(`R$ ${formatCurrency(t.amount)}`, 400, y);
                    doc.text(t.metadata?.paymentMethod || '---', 450, y);
                    y += 15;
                });
            }

            doc.end();
        });
    },

    /**
     * Generate XML Report (Accounting)
     */
    async generateXML(data) {
        const { session, totals, stats, company, tickets, transactions } = data;
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<fechamento_caixa>\n';
        xml += `  <identificacao>\n`;
        xml += `    <numero>${session.report_sequential_number}</numero>\n`;
        xml += `    <data>${format(new Date(), 'yyyy-MM-dd')}</data>\n`;
        xml += `    <abertura>${session.opened_at}</abertura>\n`;
        xml += `    <fechamento>${session.closed_at || ''}</fechamento>\n`;
        xml += `    <operador>${session.operator_name}</operador>\n`;
        xml += `  </identificacao>\n`;

        xml += `  <financeiro>\n`;
        xml += `    <saldo_inicial>${session.opening_amount}</saldo_inicial>\n`;
        xml += `    <receitas>${totals.receitas}</receitas>\n`;
        xml += `    <suprimentos>${totals.suprimentos}</suprimentos>\n`;
        xml += `    <sangrias>${totals.sangrias}</sangrias>\n`;
        xml += `    <saldo_final>${session.closing_amount || totals.saldoFinalEsperado}</saldo_final>\n`;
        xml += `    <diferenca>${session.difference || 0}</diferenca>\n`;
        xml += `  </financeiro>\n`;

        xml += `  <metodos_pagamento>\n`;
        Object.entries(totals.porMetodo).forEach(([method, value]) => {
            xml += `    <metodo>\n`;
            xml += `      <nome>${method}</nome>\n`;
            xml += `      <valor>${value}</valor>\n`;
            xml += `    </metodo>\n`;
        });
        xml += `  </metodos_pagamento>\n`;

        xml += '</fechamento_caixa>';
        return xml;
    }
};

// Helpers
function centerAlign(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
}

function leftRightAlign(left, right, width) {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
}

function formatCurrency(val) {
    return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function translateMethod(m) {
    const map = { cash: 'Dinheiro', card: 'Cartão', pix: 'PIX', credit: 'Cartão Crédito', debit: 'Cartão Débito' };
    return map[m] || m;
}

function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}min`;
}
