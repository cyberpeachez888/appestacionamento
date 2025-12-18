import { supabase } from './src/config/supabase.js';
import reportGenerationService from './src/services/reportGenerationService.js';
import fs from 'fs';

async function testReport() {
    console.log('🧪 Starting Report Generation Test...');

    // Mock data
    const data = {
        session: {
            id: 'test-session-id',
            report_sequential_number: 123,
            opened_at: new Date(Date.now() - 3600000).toISOString(),
            closed_at: new Date().toISOString(),
            operator_name: 'Operador Teste',
            opening_amount: 100.00,
            closing_amount: 250.00,
            difference: 0
        },
        totals: {
            saldoInicial: 100.00,
            receitas: 150.00,
            suprimentos: 20.00,
            sangrias: 20.00,
            saldoFinalEsperado: 250.00,
            porMetodo: { cash: 100.00, credit: 50.00 },
            porCategoria: { mensalista: 50.00, avulso: 100.00, convenio: 0 }
        },
        stats: {
            totalVeiculos: 5,
            ticketMedio: 30.00,
            tempoMedio: 120,
            picoMovimento: '14:00 - 15:00'
        },
        company: {
            name: 'Estacionamento Teste',
            cnpj: '00.000.000/0001-91',
            address: 'Rua de Exemplo, 123',
            phone: '(11) 98888-7777'
        },
        tickets: [
            {
                vehicle_plate: 'ABC1234',
                vehicle_type: 'Carro',
                entry_time: new Date(Date.now() - 7200000).toISOString(),
                exit_time: new Date().toISOString(),
                amount: 30.00,
                metadata: { paymentMethod: 'Dinheiro' }
            }
        ]
    };

    try {
        console.log('📄 Generating Thermal Report...');
        const thermal = await reportGenerationService.generateThermal(data);
        console.log('Thermal Content Preview:\n', thermal.substring(0, 200), '...');
        fs.writeFileSync('test_report_thermal.txt', thermal);

        console.log('📄 Generating PDF Report...');
        const pdfBuffer = await reportGenerationService.generatePDF(data);
        fs.writeFileSync('test_report_pdf.pdf', pdfBuffer);
        console.log('✅ PDF generated at test_report_pdf.pdf');

        console.log('📄 Generating XML Report...');
        const xml = await reportGenerationService.generateXML(data);
        fs.writeFileSync('test_report_xml.xml', xml);
        console.log('✅ XML generated at test_report_xml.xml');

        console.log('\n✨ All tests completed successfully!');
    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

testReport();
