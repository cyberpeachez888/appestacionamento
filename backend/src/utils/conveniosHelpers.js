/**
 * Convenios - Utility Functions
 * Cálculos, validações e helpers para o módulo de convênios
 */

import { format, differenceInDays, addMonths, parseISO } from 'date-fns';

/**
 * Valida CNPJ
 * @param {string} cnpj - CNPJ a validar
 * @returns {boolean}
 */
export function validarCNPJ(cnpj) {
    if (!cnpj) return false;

    // Remove caracteres não numéricos
    cnpj = cnpj.replace(/[^\d]/g, '');

    // Verifica se tem 14 dígitos
    if (cnpj.length !== 14) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Validação dos dígitos verificadores
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(0)) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(1)) return false;

    return true;
}

/**
 * Formata CNPJ
 * @param {string} cnpj
 * @returns {string} CNPJ formatado (XX.XXX.XXX/XXXX-XX)
 */
export function formatarCNPJ(cnpj) {
    if (!cnpj) return '';
    cnpj = cnpj.replace(/[^\d]/g, '');
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Calcula juros de atraso
 * @param {number} valor - Valor base
 * @param {number} diasAtraso - Dias de atraso
 * @param {number} taxaMensal - Taxa mensal (padrão 1% = 0.01)
 * @returns {number} Valor dos juros
 */
export function calcularJurosAtraso(valor, diasAtraso, taxaMensal = 0.01) {
    if (diasAtraso <= 0) return 0;
    const taxaDiaria = taxaMensal / 30;
    return Number((valor * taxaDiaria * diasAtraso).toFixed(2));
}

/**
 * Calcula taxa de ocupação
 * @param {number} vagasOcupadas
 * @param {number} vagasContratadas
 * @returns {number} Percentual de ocupação (0-100)
 */
export function calcularTaxaOcupacao(vagasOcupadas, vagasContratadas) {
    if (!vagasContratadas || vagasContratadas === 0) return 0;
    return Number(((vagasOcupadas / vagasContratadas) * 100).toFixed(2));
}

/**
 * Calcula tempo de permanência
 * @param {Date|string} entrada
 * @param {Date|string} saida
 * @returns {Object} { horas, minutos, total_minutos }
 */
export function calcularTempoPermanencia(entrada, saida) {
    const dtEntrada = typeof entrada === 'string' ? parseISO(entrada) : entrada;
    const dtSaida = typeof saida === 'string' ? parseISO(saida) : saida;

    const diffMs = dtSaida - dtEntrada;
    const totalMinutos = Math.floor(diffMs / 60000);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    return {
        horas,
        minutos,
        total_minutos: totalMinutos,
        formatado: `${horas}h ${minutos}min`
    };
}

/**
 * Calcula valor para convênio pós-pago
 * @param {Array} movimentacoes - Array de movimentações
 * @param {number} valorHora - Valor por hora
 * @returns {number} Valor total calculado
 */
export function calcularValorPosPago(movimentacoes, valorHora) {
    if (!movimentacoes || movimentacoes.length === 0) return 0;

    let totalMinutos = 0;

    movimentacoes.forEach(mov => {
        if (mov.data_saida && mov.hora_saida) {
            const entrada = new Date(`${mov.data_entrada}T${mov.hora_entrada}`);
            const saida = new Date(`${mov.data_saida}T${mov.hora_saida}`);
            const tempo = calcularTempoPermanencia(entrada, saida);
            totalMinutos += tempo.total_minutos;
        }
    });

    const totalHoras = totalMinutos / 60;
    return Number((totalHoras * valorHora).toFixed(2));
}

/**
 * Gera número de fatura único
 * @param {string} convenioId - ID do convênio
 * @param {string} periodo - Período (YYYY-MM)
 * @returns {string} Número da fatura (ex: FAT-2024-12-ABC123)
 */
export function gerarNumeroFatura(convenioId, periodo) {
    const [ano, mes] = periodo.split('-');
    const hash = convenioId.substring(0, 6).toUpperCase();
    return `FAT-${ano}-${mes}-${hash}`;
}

/**
 * Calcula data de vencimento baseado no dia do mês
 * @param {number} diaVencimento - Dia do vencimento (1-28)
 * @param {Date} dataReferencia - Data de referência (opcional)
 * @returns {Date} Data de vencimento
 */
export function calcularDataVencimento(diaVencimento, dataReferencia = new Date()) {
    const proximoMes = addMonths(dataReferencia, 1);
    proximoMes.setDate(diaVencimento);
    return proximoMes;
}

/**
 * Verifica se convênio está inadimplente
 * @param {Object} convenio - Dados do convênio
 * @param {Array} faturas - Faturas do convênio
 * @returns {boolean}
 */
export function verificarInadimplencia(convenio, faturas) {
    if (!faturas || faturas.length === 0) return false;

    const hoje = new Date();
    const faturasVencidas = faturas.filter(f => {
        if (f.status === 'paga') return false;
        const vencimento = parseISO(f.data_vencimento);
        return vencimento < hoje;
    });

    return faturasVencidas.length > 0;
}

/**
 * Calcula status do convênio baseado em faturas
 * @param {Object} convenio
 * @param {Array} faturas
 * @returns {string} 'ativo' | 'suspenso' | 'inadimplente' | 'cancelado'
 */
export function calcularStatusConvenio(convenio, faturas) {
    if (convenio.status === 'cancelado') return 'cancelado';
    if (convenio.status === 'suspenso') return 'suspenso';

    if (verificarInadimplencia(convenio, faturas)) {
        return 'inadimplente';
    }

    return 'ativo';
}

/**
 * Valida se veículo pode entrar
 * @param {string} placa
 * @param {string} convenioId
 * @param {Object} convenio
 * @param {Array} veiculos
 * @param {Array} movimentacoes
 * @returns {Object} { permitido: boolean, motivo: string }
 */
export function validarEntradaVeiculo(placa, convenioId, convenio, veiculos, movimentacoes) {
    // Verificar se convênio está ativo
    if (convenio.status !== 'ativo') {
        return {
            permitido: false,
            motivo: `Convênio ${convenio.status}. Contate o administrador.`
        };
    }

    // Verificar se veículo está autorizado
    const veiculo = veiculos.find(v => v.placa === placa && v.ativo);
    if (!veiculo) {
        return {
            permitido: false,
            motivo: 'Veículo não autorizado para este convênio.'
        };
    }

    // Verificar se já não está dentro
    const dentroAgora = movimentacoes.find(m =>
        m.placa === placa && !m.data_saida
    );

    if (dentroAgora) {
        return {
            permitido: false,
            motivo: 'Veículo já possui entrada registrada sem saída.'
        };
    }

    // Verificar limite de vagas (se houver plano ativo)
    // Isso seria feito com query ao banco, mas a lógica é:
    // - Contar movimentações ativas (sem saída)
    // - Comparar com num_vagas_contratadas

    return {
        permitido: true,
        motivo: 'OK'
    };
}

/**
 * Formata período para exibição
 * @param {string} periodo - Período no formato YYYY-MM
 * @returns {string} Formato: "Janeiro/2024"
 */
export function formatarPeriodo(periodo) {
    const [ano, mes] = periodo.split('-');
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
}

/**
 * Valida se fatura pode ser gerada
 * @param {string} convenioId
 * @param {string} periodo - YYYY-MM
 * @param {Array} faturasExistentes
 * @returns {Object} { valido: boolean, motivo: string }
 */
export function validarGeracaoFatura(convenioId, periodo, faturasExistentes) {
    // Verificar se já existe fatura para o período
    const faturaExistente = faturasExistentes.find(f =>
        f.convenio_id === convenioId &&
        f.periodo_referencia === periodo &&
        f.status !== 'cancelada'
    );

    if (faturaExistente) {
        return {
            valido: false,
            motivo: `Já existe fatura para o período ${formatarPeriodo(periodo)}.`
        };
    }

    return {
        valido: true,
        motivo: 'OK'
    };
}

/**
 * Calcula dias de atraso
 * @param {Date|string} dataVencimento
 * @returns {number} Dias de atraso (0 se não vencido)
 */
export function calcularDiasAtraso(dataVencimento) {
    const hoje = new Date();
    const vencimento = typeof dataVencimento === 'string' ? parseISO(dataVencimento) : dataVencimento;

    const dias = differenceInDays(hoje, vencimento);
    return dias > 0 ? dias : 0;
}

/**
 * Formata valor monetário
 * @param {number} valor
 * @returns {string} Formato: R$ 1.234,56
 */
export function formatarValor(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}
