/**
 * Fatura PDF Generator
 * Gera PDFs de faturas de convênios (pré-pago e pós-pago)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Configurações mockadas do estacionamento (substituir com dados reais futuramente)
const ESTACIONAMENTO_CONFIG = {
    nome: 'Parking System',
    razaoSocial: 'Parking System Ltda',
    cnpj: '00.000.000/0001-00',
    endereco: 'Rua Exemplo, 123 - Centro',
    cidade: 'Cidade - UF',
    telefone: '(00) 0000-0000',
    email: 'contato@parkingsystem.com.br',
    // Dados bancários para instruções de pagamento
    banco: 'Banco Exemplo',
    agencia: '0000',
    conta: '00000-0',
};

/**
 * Formata data para DD/MM/AAAA
 */
export const formatarData = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

/**
 * Formata valor monetário para R$ X.XXX,XX
 */
export const formatarValor = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(valor);
};

/**
 * Formata CNPJ para XX.XXX.XXX/XXXX-XX
 */
export const formatarCNPJ = (cnpj: string): string => {
    if (!cnpj) return '-';
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

/**
 * Formata período YYYY-MM para "Mês/YYYY"
 */
export const formatarPeriodo = (periodo: string): string => {
    if (!periodo) return '-';
    const [ano, mes] = periodo.split('-');
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
};

/**
 * Adiciona cabeçalho ao PDF
 */
const adicionarCabecalho = (doc: jsPDF, fatura: any, convenio: any) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título do documento
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FATURA', pageWidth / 2, 20, { align: 'center' });

    // Dados do estacionamento
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(ESTACIONAMENTO_CONFIG.nome, 20, 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(ESTACIONAMENTO_CONFIG.razaoSocial, 20, 40);
    doc.text(`CNPJ: ${ESTACIONAMENTO_CONFIG.cnpj}`, 20, 45);
    doc.text(ESTACIONAMENTO_CONFIG.endereco, 20, 50);
    doc.text(`${ESTACIONAMENTO_CONFIG.cidade} | Tel: ${ESTACIONAMENTO_CONFIG.telefone}`, 20, 55);

    // Informações da fatura (lado direito)
    const rightX = pageWidth - 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Nº Fatura:', rightX - 60, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(fatura.numero_fatura, rightX, 35, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Período:', rightX - 60, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(formatarPeriodo(fatura.periodo_referencia), rightX, 40, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Emissão:', rightX - 60, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(formatarData(fatura.data_emissao), rightX, 45, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('Vencimento:', rightX - 60, 50);
    doc.setFont('helvetica', 'normal');
    // Destaque em vermelho se vencida
    const hoje = new Date();
    const vencimento = new Date(fatura.data_vencimento);
    if (vencimento < hoje && fatura.status !== 'paga') {
        doc.setTextColor(220, 38, 38); // Red
    }
    doc.text(formatarData(fatura.data_vencimento), rightX, 50, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset to black

    // Linha separadora
    doc.setLineWidth(0.5);
    doc.line(20, 62, pageWidth - 20, 62);

    return 70; // Retorna a posição Y onde terminou o cabeçalho
};

/**
 * Adiciona dados do cliente (convênio)
 */
const adicionarDadosCliente = (doc: jsPDF, convenio: any, yPos: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO CLIENTE', 20, yPos);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Empresa: ${convenio.nome_empresa}`, 20, yPos + 7);
    doc.text(`Razão Social: ${convenio.razao_social}`, 20, yPos + 12);
    doc.text(`CNPJ: ${formatarCNPJ(convenio.cnpj)}`, 20, yPos + 17);

    if (convenio.endereco_completo) {
        doc.text(`Endereço: ${convenio.endereco_completo}`, 20, yPos + 22);
        return yPos + 30;
    }

    return yPos + 25;
};

/**
 * Adiciona rodapé com instruções de pagamento
 */
const adicionarRodape = (doc: jsPDF, fatura: any) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const yPos = pageHeight - 40;

    // Linha separadora
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUÇÕES DE PAGAMENTO', 20, yPos + 7);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Banco: ${ESTACIONAMENTO_CONFIG.banco} | Agência: ${ESTACIONAMENTO_CONFIG.agencia} | Conta: ${ESTACIONAMENTO_CONFIG.conta}`, 20, yPos + 12);
    doc.text('Pagamento também pode ser realizado via PIX, cartão ou dinheiro no local.', 20, yPos + 17);

    if (fatura.status === 'paga') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94); // Green
        doc.text('✓ FATURA PAGA', pageWidth / 2, yPos + 25, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        if (fatura.data_pagamento) {
            doc.setFont('helvetica', 'normal');
            doc.text(`Pagamento em: ${formatarData(fatura.data_pagamento)} via ${fatura.forma_pagamento}`, pageWidth / 2, yPos + 30, { align: 'center' });
        }
    }
};

/**
 * Gera PDF para convênio corporativo (unificado)
 */
export const gerarPDFConvenio = (fatura: any, convenio: any, movimentacoes: any[] = []): void => {
    const doc = new jsPDF();

    // Cabeçalho
    let yPos = adicionarCabecalho(doc, fatura, convenio);

    // Dados do cliente
    yPos = adicionarDadosCliente(doc, convenio, yPos);

    // Tipo de convênio
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(20, yPos, 160, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('MODALIDADE: CONVÊNIO CORPORATIVO', 25, yPos + 5);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    // Tabela de movimentações (se houver)
    if (movimentacoes && movimentacoes.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`MOVIMENTAÇÕES DO PERÍODO (${movimentacoes.length} registros)`, 20, yPos);
        yPos += 5;

        const tableData = movimentacoes.map((mov) => {
            const entrada = `${formatarData(mov.data_entrada)} ${mov.hora_entrada?.slice(0, 5) || ''}`;
            const saida = mov.data_saida
                ? `${formatarData(mov.data_saida)} ${mov.hora_saida?.slice(0, 5) || ''}`
                : 'Em andamento';
            const tempo = mov.tempo_permanencia
                ? mov.tempo_permanencia.replace('hours', 'h').replace('minutes', 'min')
                : '-';
            const valor = mov.valor_calculado ? formatarValor(Number(mov.valor_calculado)) : '-';

            return [mov.placa, entrada, saida, tempo, valor];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['Placa', 'Entrada', 'Saída', 'Tempo', 'Valor']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
            styles: { fontSize: 7, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 35 },
                3: { cellWidth: 25 },
                4: { halign: 'right', cellWidth: 25 },
            },
            margin: { left: 20, right: 20 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Service Description Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIÇÃO DOS SERVIÇOS', 20, yPos);
    yPos += 10;

    // Calculate aggregated data
    const vagasExtras = movimentacoes.filter((m: any) => m.tipo_vaga_extra);
    const vagasPagas = vagasExtras.filter((v: any) => v.tipo_vaga_extra === 'paga');
    const vagasCortesia = vagasExtras.filter((v: any) => v.tipo_vaga_extra === 'cortesia');

    const valorTotalVagasPagas = vagasPagas.reduce((sum: number, v: any) => sum + (v.valor_cobrado || 0), 0);
    const valorMedioPorVagaPaga = vagasPagas.length > 0 ? valorTotalVagasPagas / vagasPagas.length : 0;

    // Assuming convenio has plano data - you may need to adjust based on actual data structure
    const numVagasContratadas = (convenio as any).num_vagas_contratadas || 0;
    const valorPorVaga = numVagasContratadas > 0 ? (fatura.valor_base || 0) / numVagasContratadas : 0;
    const porcentagemDesconto = (convenio as any).porcentagem_desconto || 0;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Estacionamento:', 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(ESTACIONAMENTO_CONFIG.nome, 30, yPos + 5);
    yPos += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('2. Plano Contratado:', 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`• ${numVagasContratadas} vagas contratadas e reservadas | Valor por vaga: ${formatarValor(valorPorVaga)}`, 30, yPos + 5);
    yPos += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('3. Desconto do Convênio:', 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Desconto: ${porcentagemDesconto}% | ${formatarValor(fatura.valor_descontos || 0)}`, 30, yPos + 5);
    yPos += 15;

    // Extra spots (conditional)
    if (vagasPagas.length > 0 || vagasCortesia.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('4. Vagas Extras:', 25, yPos);
        yPos += 5;

        if (vagasCortesia.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.text(`• ${vagasCortesia.length} vagas extras cortesia | Valor: R$ 0,00`, 30, yPos);
            yPos += 5;
        }

        if (vagasPagas.length > 0) {
            doc.setFont('helvetica', 'normal');
            doc.text(`• ${vagasPagas.length} vagas extras pagas | Valor/vaga: ${formatarValor(valorMedioPorVagaPaga)} | Valor total: ${formatarValor(valorTotalVagasPagas)}`, 30, yPos);
            yPos += 5;
        }

        yPos += 5;
    }

    // Separator line
    doc.setLineWidth(0.3);
    doc.line(20, yPos, 180, yPos);
    yPos += 10;

    // Totalization Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Valor Base', 25, yPos);
    doc.text(formatarValor(fatura.valor_base || 0), 175, yPos, { align: 'right' });
    yPos += 7;

    // Conditional: Paid extra spots
    if (valorTotalVagasPagas > 0) {
        doc.text('(+) Vagas Extras Pagas', 25, yPos);
        doc.text(formatarValor(valorTotalVagasPagas), 175, yPos, { align: 'right' });
        yPos += 7;
    }

    // Discount
    if (fatura.valor_descontos && fatura.valor_descontos > 0) {
        const descontoLabel = porcentagemDesconto > 0 ? `(-) Desconto (${porcentagemDesconto}%)` : '(-) Desconto';
        doc.text(descontoLabel, 25, yPos);
        doc.text(formatarValor(fatura.valor_descontos), 175, yPos, { align: 'right' });
        yPos += 7;
    }

    // Separator line before total
    yPos += 3;
    doc.setLineWidth(0.5);
    doc.line(25, yPos, 175, yPos);
    yPos += 8;

    // Total
    doc.setFillColor(243, 244, 246);
    doc.rect(20, yPos, 160, 10, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR TOTAL', 25, yPos + 7);
    doc.text(formatarValor(fatura.valor_total || 0), 175, yPos + 7, { align: 'right' });
    yPos += 18;

    // Observações
    if (fatura.observacoes) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVAÇÕES', 20, yPos);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(fatura.observacoes, 160);
        doc.text(splitText, 20, yPos + 6);
    }

    // Rodapé
    adicionarRodape(doc, fatura);

    // Download
    const filename = `Fatura_${fatura.numero_fatura.replace(/\//g, '-')}_${convenio.nome_empresa.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(filename);
};

/**
 * Função principal: gera PDF de fatura para convênio corporativo
 * @deprecated gerarPDFPrepago e gerarPDFPosPago - use gerarPDFConvenio
 */
export const gerarPDFFatura = (
    fatura: any,
    convenio: any,
    movimentacoes?: any[]
): void => {
    if (!fatura || !convenio) {
        throw new Error('Dados da fatura ou convênio não fornecidos');
    }

    // Usar função unificada
    gerarPDFConvenio(fatura, convenio, movimentacoes || []);
};
