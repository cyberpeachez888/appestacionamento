/**
 * Invoice PDF Generator Service
 * Generates PDF invoices for convenios
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Formats number as Brazilian currency
 * @param {number} valor - Value to format
 * @returns {string} Formatted as R$ 1.234,56
 */
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

/**
 * Formats date as DD/MM/YYYY
 * @param {string|Date} data - Date to format
 * @returns {string} Formatted date
 */
function formatarData(data) {
    if (!data) return '-';
    const date = typeof data === 'string' ? new Date(data) : data;
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Calculates and formats the reference period
 * @param {Array} vagasExtras - Extra spots array
 * @param {Date} dataEmissao - Emission date
 * @returns {string} Formatted period (e.g., "Janeiro/2026" or "01/01/2026 - 15/01/2026")
 */
function calcularPeriodoReferencia(vagasExtras, dataEmissao) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // If no extra spots, use current month
    if (!vagasExtras || vagasExtras.length === 0) {
        const data = dataEmissao ? (typeof dataEmissao === 'string' ? new Date(dataEmissao) : dataEmissao) : new Date();
        const mes = meses[data.getMonth()];
        const ano = data.getFullYear();
        return `${mes}/${ano}`;
    }

    // Get all exit dates
    const datasValidas = vagasExtras
        .filter(v => v.data_saida)
        .map(v => new Date(v.data_saida));

    if (datasValidas.length === 0) {
        const data = dataEmissao ? (typeof dataEmissao === 'string' ? new Date(dataEmissao) : dataEmissao) : new Date();
        return `${meses[data.getMonth()]}/${data.getFullYear()}`;
    }

    // Find min and max dates
    const dataInicio = new Date(Math.min(...datasValidas));
    const dataFim = new Date(Math.max(...datasValidas));

    // If same month, return "Month/Year"
    if (dataInicio.getMonth() === dataFim.getMonth() &&
        dataInicio.getFullYear() === dataFim.getFullYear()) {
        return `${meses[dataInicio.getMonth()]}/${dataInicio.getFullYear()}`;
    }

    // If different months, return date range
    return `${formatarData(dataInicio)} - ${formatarData(dataFim)}`;
}

/**
 * Calculates time duration between two dates
 * @param {string|Date} entrada - Entry date/time
 * @param {string|Date} saida - Exit date/time
 * @returns {string} Formatted duration (e.g., "5h30" or "1d 3h15")
 */
function calcularPermanencia(entrada, saida) {
    if (!entrada || !saida) return '-';

    try {
        const dateEntrada = typeof entrada === 'string' ? new Date(entrada) : entrada;
        const dateSaida = typeof saida === 'string' ? new Date(saida) : saida;

        const diff = dateSaida - dateEntrada;

        if (diff < 0) return '-';

        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        // If more than 1 day
        if (dias > 0) {
            return `${dias}d ${horas}h${minutos.toString().padStart(2, '0')}`;
        }

        // Just hours and minutes
        return `${horas}h${minutos.toString().padStart(2, '0')}`;
    } catch (err) {
        console.error('Erro ao calcular permanência:', err);
        return '-';
    }
}

/**
 * Formats the value of an extra spot
 * @param {Object} vaga - Extra spot object
 * @returns {string} Formatted value or "CORTESIA"
 */
function formatarValorVagaExtra(vaga) {
    if (!vaga) return '-';

    if (vaga.tipo_vaga_extra === 'cortesia') {
        return 'CORTESIA';
    }

    if (!vaga.valor_cobrado || vaga.valor_cobrado === 0) {
        return 'R$ 0,00';
    }

    return formatarMoeda(vaga.valor_cobrado);
}

/**
 * Ensures storage directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Creates PDF header with invoice info
 * @param {PDFDocument} doc - PDF document instance
 * @param {Object} fatura - Invoice data
 * @param {Object} convenio - Convenio data
 * @param {Array} vagasExtras - Extra spots for period calculation
 */
function criarCabecalhoPDF(doc, fatura, convenio, vagasExtras = []) {
    const margemEsquerda = 50;
    const margemDireita = doc.page.width - 50;

    // Logo area (placeholder - can add actual logo later)
    doc.fontSize(20)
        .font('Helvetica-Bold')
        .text('ESTACIONAMENTO', margemEsquerda, 50);

    // Invoice number - large and prominent
    doc.fontSize(16)
        .font('Helvetica-Bold')
        .text(`FATURA #${fatura.numero_fatura}`, margemDireita - 150, 50, { width: 150, align: 'right' });

    // Horizontal line
    doc.moveTo(margemEsquerda, 90)
        .lineTo(margemDireita, 90)
        .stroke();

    // Invoice dates
    const periodoFormatado = calcularPeriodoReferencia(vagasExtras, fatura.data_emissao);

    doc.fontSize(10)
        .font('Helvetica')
        .text(`Data de Emissão: ${formatarData(fatura.data_emissao)}`, margemEsquerda, 100)
        .text(`Data de Vencimento: ${formatarData(fatura.data_vencimento)}`, margemEsquerda, 115)
        .font('Helvetica-Bold')
        .text(`Período: ${periodoFormatado}`, margemEsquerda, 130);

    // Client info
    doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('CLIENTE', margemEsquerda, 160);

    doc.fontSize(10)
        .font('Helvetica')
        .text(convenio.nome_empresa, margemEsquerda, 180)
        .text(`CNPJ: ${convenio.cnpj}`, margemEsquerda, 195);

    if (convenio.razao_social) {
        doc.text(`Razão Social: ${convenio.razao_social}`, margemEsquerda, 210);
    }

    if (convenio.endereco_completo) {
        doc.text(`Endereço: ${convenio.endereco_completo}`, margemEsquerda, 225);
    }
}

/**
 * Creates descriptive service section in PDF
 * @param {PDFDocument} doc - PDF document instance
 * @param {Object} servicosData - Service data object
 * @param {number} startY - Starting Y position
 * @returns {number} Final Y position
 */
function criarDescricaoServicos(doc, servicosData, startY) {
    const margemEsquerda = 50;
    const margemDireita = doc.page.width - 50;
    let y = startY;

    // Section header
    doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('DESCRIÇÃO DOS SERVIÇOS', margemEsquerda, y);

    y += 25;

    // 1. Parking Name
    doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('1. Estacionamento:', margemEsquerda, y);

    doc.fontSize(10)
        .font('Helvetica')
        .text(servicosData.nomeEstacionamento || 'Estacionamento', margemEsquerda + 15, y + 15);

    y += 40;

    // 2. Contracted Plan
    doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('2. Plano Contratado:', margemEsquerda, y);

    doc.fontSize(10)
        .font('Helvetica')
        .text(
            `• ${servicosData.numVagasContratadas} vagas contratadas e reservadas | Valor por vaga: ${formatarMoeda(servicosData.valorPorVaga)}`,
            margemEsquerda + 15,
            y + 15
        );

    y += 40;

    // 3. Discount
    doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('3. Desconto do Convênio:', margemEsquerda, y);

    doc.fontSize(10)
        .font('Helvetica')
        .text(
            `• Desconto: ${servicosData.porcentagemDesconto}% | ${formatarMoeda(servicosData.valorDesconto)}`,
            margemEsquerda + 15,
            y + 15
        );

    y += 40;

    // 4. Extra Spots (CONDITIONAL)
    if (servicosData.temVagasExtras) {
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .text('4. Vagas Extras:', margemEsquerda, y);

        y += 15;

        // Courtesy spots
        if (servicosData.qtdVagasCortesia > 0) {
            doc.fontSize(10)
                .font('Helvetica')
                .text(
                    `• ${servicosData.qtdVagasCortesia} vagas extras cortesia | Valor: R$ 0,00`,
                    margemEsquerda + 15,
                    y
                );
            y += 20;
        }

        // Paid spots
        if (servicosData.qtdVagasPagas > 0) {
            doc.fontSize(10)
                .font('Helvetica')
                .text(
                    `• ${servicosData.qtdVagasPagas} vagas extras pagas | Valor/vaga: ${formatarMoeda(servicosData.valorMedioPorVagaPaga)} | Valor total: ${formatarMoeda(servicosData.valorTotalVagasPagas)}`,
                    margemEsquerda + 15,
                    y
                );
            y += 20;
        }

        y += 10;
    }

    // Bottom separator line
    y += 10;
    doc.moveTo(margemEsquerda, y)
        .lineTo(margemDireita, y)
        .stroke();

    return y + 15;
}

/**
 * Creates totals section
 * @param {PDFDocument} doc - PDF document instance
 * @param {Object} totais - Totals data
 * @param {number} startY - Starting Y position
 * @returns {number} Final Y position
 */
function criarTotais(doc, totais, startY) {
    const margemDireita = doc.page.width - 50;
    const colLabel = margemDireita - 220;
    const colValor = margemDireita - 80;

    let y = startY;

    doc.fontSize(10).font('Helvetica');

    // Valor Base (contracted spots before discount)
    doc.text('Valor Base', colLabel, y)
        .text(formatarMoeda(totais.valorBase), colValor, y, { align: 'right' });
    y += 20;

    // Paid extra spots (conditional)
    if (totais.vagasExtrasPagas && totais.vagasExtrasPagas > 0) {
        doc.text('(+) Vagas Extras Pagas', colLabel, y)
            .text(formatarMoeda(totais.vagasExtrasPagas), colValor, y, { align: 'right' });
        y += 20;
    }

    // Discount (applied to base + paid extras)
    if (totais.desconto && totais.desconto > 0) {
        const descontoLabel = totais.porcentagemDesconto ? `(-) Desconto (${totais.porcentagemDesconto}%)` : '(-) Desconto';
        doc.text(descontoLabel, colLabel, y)
            .text(formatarMoeda(totais.desconto), colValor, y, { align: 'right' });
        y += 20;
    }

    // Horizontal line before total
    y += 5;
    doc.moveTo(colLabel, y)
        .lineTo(margemDireita, y)
        .stroke();

    y += 15;

    // Total
    doc.fontSize(12)
        .font('Helvetica-Bold')
        .text('= VALOR TOTAL DA FATURA', colLabel, y)
        .text(formatarMoeda(totais.total), colValor, y, { align: 'right' });

    return y + 30;
}

/**
 * Adds payment instructions
 * @param {PDFDocument} doc - PDF document instance
 * @param {Object} fatura - Invoice data
 * @param {number} startY - Starting Y position
 */
function adicionarInstrucoesPagamento(doc, fatura, startY) {
    const margemEsquerda = 50;

    doc.fontSize(10)
        .font('Helvetica-Bold')
        .text('INSTRUÇÕES DE PAGAMENTO', margemEsquerda, startY);

    doc.fontSize(9)
        .font('Helvetica')
        .text(`Vencimento: ${formatarData(fatura.data_vencimento)}`, margemEsquerda, startY + 20)
        .text('Para efetuar o pagamento, entre em contato conosco.', margemEsquerda, startY + 35)
        .text('Após o pagamento, envie o comprovante para registro.', margemEsquerda, startY + 50);

    if (fatura.observacoes) {
        doc.fontSize(8)
            .font('Helvetica-Oblique')
            .text(`Observações: ${fatura.observacoes}`, margemEsquerda, startY + 75, {
                width: doc.page.width - 100
            });
    }
}

/**
 * Generates PDF invoice
 * @param {Object} faturaData - Invoice data
 * @param {Object} convenioData - Convenio data
 * @param {Object} planoData - Plan data
 * @param {Array} vagasExtras - Extra spots data
 * @param {string} storagePath - Base storage path (default: './storage')
 * @returns {Promise<Object>} { pdfPath, pdfFilename }
 */
export async function gerarPDFFatura(faturaData, convenioData, planoData, vagasExtras = [], storagePath = './storage') {
    try {
        // Ensure storage directory exists
        const ano = new Date(faturaData.data_emissao).getFullYear();
        const dirPath = path.join(storagePath, 'faturas', ano.toString());
        ensureDirectoryExists(dirPath);

        // Generate filename
        const pdfFilename = `fatura-${faturaData.numero_fatura}.pdf`;
        const pdfPath = path.join(dirPath, pdfFilename);

        // Create PDF document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        // Pipe to file
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        // Add header
        criarCabecalhoPDF(doc, faturaData, convenioData, vagasExtras);

        // Prepare aggregated service data
        const vagasPagas = vagasExtras.filter(v => v.tipo_vaga_extra === 'paga');
        const vagasCortesia = vagasExtras.filter(v => v.tipo_vaga_extra === 'cortesia');

        const qtdVagasPagas = vagasPagas.length;
        const qtdVagasCortesia = vagasCortesia.length;

        // Calculate total value of paid extra spots
        const valorTotalVagasPagas = vagasPagas.reduce((sum, v) => sum + (v.valor_cobrado || 0), 0);

        // Calculate average value per paid spot
        const valorMedioPorVagaPaga = qtdVagasPagas > 0 ? valorTotalVagasPagas / qtdVagasPagas : 0;

        // Calculate value per contracted spot (before discount)
        const valorPorVaga = planoData.num_vagas_contratadas > 0
            ? faturaData.valor_base / planoData.num_vagas_contratadas
            : 0;

        const servicosData = {
            nomeEstacionamento: 'Juris Park Estacionamento', // TODO: Make dynamic from config
            numVagasContratadas: planoData.num_vagas_contratadas,
            valorPorVaga: valorPorVaga,
            porcentagemDesconto: planoData.porcentagem_desconto || 0,
            valorDesconto: faturaData.valor_descontos || 0,
            temVagasExtras: qtdVagasPagas > 0 || qtdVagasCortesia > 0,
            qtdVagasCortesia: qtdVagasCortesia,
            qtdVagasPagas: qtdVagasPagas,
            valorMedioPorVagaPaga: valorMedioPorVagaPaga,
            valorTotalVagasPagas: valorTotalVagasPagas
        };

        // Create descriptive services section
        let currentY = criarDescricaoServicos(doc, servicosData, 270);

        // Add totals
        const totais = {
            valorBase: faturaData.valor_base,
            vagasExtrasPagas: valorTotalVagasPagas,
            desconto: faturaData.valor_descontos,
            porcentagemDesconto: planoData.porcentagem_desconto,
            total: faturaData.valor_total
        };

        currentY = criarTotais(doc, totais, currentY);

        // Add payment instructions
        adicionarInstrucoesPagamento(doc, faturaData, currentY + 20);

        // Footer
        const footerY = doc.page.height - 50;
        doc.fontSize(8)
            .font('Helvetica-Oblique')
            .text(
                `Fatura gerada em ${formatarData(new Date())}`,
                50,
                footerY,
                { align: 'center', width: doc.page.width - 100 }
            );

        // Finalize PDF
        doc.end();

        // Wait for file to be written
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        // Verify file was created
        if (!fs.existsSync(pdfPath)) {
            throw new Error('PDF file was not created');
        }

        // Generate download filename
        const nomeEmpresaFormatado = convenioData.nome_empresa
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 30);

        const downloadFilename = `Fatura-${faturaData.numero_fatura}-${nomeEmpresaFormatado}.pdf`;

        return {
            pdfPath,
            pdfFilename: downloadFilename
        };

    } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        throw new Error(`Falha ao gerar PDF: ${err.message}`);
    }
}

export default {
    gerarPDFFatura
};
