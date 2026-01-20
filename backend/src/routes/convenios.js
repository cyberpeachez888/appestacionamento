/**
 * Convenios Routes
 * Rotas para o módulo de convênios
 */

import express from 'express';
import conveniosController from '../controllers/conveniosController.js';
import conveniosVeiculosController from '../controllers/conveniosVeiculosController.js';
import conveniosMovimentacoesController from '../controllers/conveniosMovimentacoesController.js';
import conveniosFaturasController from '../controllers/conveniosFaturasController.js';
import conveniosDocumentosController from '../controllers/conveniosDocumentosController.js';
import conveniosJobsController from '../controllers/conveniosJobsController.js';
import conveniosVagasExtrasController from '../controllers/conveniosVagasExtrasController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(requireAuth);

// =====================================================
// CONVÊNIOS - CRUD Principal
// =====================================================

// GET /api/convenios/stats - Estatísticas gerais
router.get('/stats', conveniosController.getStats);

// GET /api/convenios/relatorios/faturas - Relatório global de faturas
router.get('/relatorios/faturas', conveniosFaturasController.listAll);

// GET /api/convenios/relatorios/ocupacao - Relatório de ocupação (ranking)
router.get('/relatorios/ocupacao', conveniosController.getOccupancyReport);

// GET /api/convenios - Listar todos
router.get('/', conveniosController.list);

// POST /api/convenios - Criar novo
router.post('/', conveniosController.create);

// GET /api/convenios/:id - Buscar um
router.get('/:id', conveniosController.getById);

// PATCH /api/convenios/:id - Atualizar
router.patch('/:id', conveniosController.update);

// DELETE /api/convenios/:id - Excluir (soft delete)
router.delete('/:id', conveniosController.delete);

// PATCH /api/convenios/:id/suspender - Suspender/Reativar
router.patch('/:id/suspender', conveniosController.toggleSuspensao);

// PUT /api/convenios/:id/plano - Atualizar plano (creates new, deactivates old)
router.put('/:id/plano', conveniosController.updatePlano);

// =====================================================
// VEÍCULOS
// =====================================================

// GET /api/convenios/veiculos/verificar/:placa - Verificar placa
router.get('/veiculos/verificar/:placa', conveniosVeiculosController.verificarPlaca);

// GET /api/convenios/:convenioId/veiculos - Listar veículos
router.get('/:convenioId/veiculos', conveniosVeiculosController.list);

// POST /api/convenios/:convenioId/veiculos - Adicionar veículo
router.post('/:convenioId/veiculos', conveniosVeiculosController.create);

// PATCH /api/convenios/:convenioId/veiculos/:veiculoId - Atualizar veículo
router.patch('/:convenioId/veiculos/:veiculoId', conveniosVeiculosController.update);

// DELETE /api/convenios/:convenioId/veiculos/:veiculoId - Remover veículo
router.delete('/:convenioId/veiculos/:veiculoId', conveniosVeiculosController.delete);

// =====================================================
// MOVIMENTAÇÕES
// =====================================================

// GET /api/convenios/:convenioId/movimentacoes/ativas - Movimentações ativas
router.get('/:convenioId/movimentacoes/ativas', conveniosMovimentacoesController.getAtivas);

// GET /api/convenios/:convenioId/movimentacoes/nao-faturadas - Não faturadas
router.get('/:convenioId/movimentacoes/nao-faturadas', conveniosMovimentacoesController.getNaoFaturadas);

// GET /api/convenios/:convenioId/movimentacoes - Listar movimentações
router.get('/:convenioId/movimentacoes', conveniosMovimentacoesController.list);

// POST /api/convenios/:convenioId/movimentacoes - Registrar entrada/saída
router.post('/:convenioId/movimentacoes', conveniosMovimentacoesController.create);

// PATCH /api/convenios/:convenioId/movimentacoes/:movimentacaoId - Atualizar
router.patch('/:convenioId/movimentacoes/:movimentacaoId', conveniosMovimentacoesController.update);

// =====================================================
// FATURAS
// =====================================================

// GET /api/convenios/:convenioId/fatura/preview - Preview de fatura
router.get('/:convenioId/fatura/preview', conveniosFaturasController.preview);

// POST /api/convenios/:convenioId/fatura/gerar - Gerar fatura oficial com PDF
router.post('/:convenioId/fatura/gerar', conveniosFaturasController.generateInvoice);

// GET /api/convenios/:convenioId/faturas - Listar faturas
router.get('/:convenioId/faturas', conveniosFaturasController.list);

// GET /api/convenios/:convenioId/faturas/:faturaId/download - Download PDF
router.get('/:convenioId/faturas/:faturaId/download', conveniosFaturasController.downloadPDF);

// POST /api/convenios/:convenioId/faturas - Gerar fatura (LEGACY)
router.post('/:convenioId/faturas', conveniosFaturasController.create);

// PATCH /api/convenios/:convenioId/faturas/:faturaId/pagar - Registrar pagamento
router.patch('/:convenioId/faturas/:faturaId/pagar', conveniosFaturasController.registrarPagamento);

// PATCH /api/convenios/:convenioId/faturas/:faturaId/cancelar - Cancelar fatura
router.patch('/:convenioId/faturas/:faturaId/cancelar', conveniosFaturasController.cancelar);

// =====================================================
// DOCUMENTOS
// =====================================================

// GET /api/convenios/:convenioId/documentos - Listar documentos
router.get('/:convenioId/documentos', conveniosDocumentosController.list);

// POST /api/convenios/:convenioId/documentos - Upload documento
router.post('/:convenioId/documentos', conveniosDocumentosController.upload);

// DELETE /api/convenios/:convenioId/documentos/:docId - Remover documento
router.delete('/:convenioId/documentos/:docId', conveniosDocumentosController.delete);

// =====================================================
// VAGAS EXTRAS
// =====================================================

// GET /api/convenios/:convenioId/vagas-extras - Listar vagas extras
router.get('/:convenioId/vagas-extras', conveniosVagasExtrasController.list);

// GET /api/convenios/:convenioId/vagas-extras/exportar - Exportar Excel
router.get('/:convenioId/vagas-extras/exportar', conveniosVagasExtrasController.exportar);

// =====================================================
// JOBS / CRONS (Verificações Automáticas)
// =====================================================

// POST /api/convenios/jobs/verificar-vencimentos
router.post('/jobs/verificar-vencimentos', conveniosJobsController.verificarVencimentosContrato);

// POST /api/convenios/jobs/verificar-faturas-atrasadas
router.post('/jobs/verificar-faturas-atrasadas', conveniosJobsController.verificarFaturasAtrasadas);

export default router;
