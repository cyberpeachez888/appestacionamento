import express from 'express';
import notificacoesController from '../controllers/notificacoesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// GET /api/notificacoes - Listar notificações
router.get('/', notificacoesController.list);

// GET /api/notificacoes/count - Contar não lidas
router.get('/count', notificacoesController.countUnread);

// PATCH /api/notificacoes/read-all - Marcar todas como lidas
router.patch('/read-all', notificacoesController.markAllAsRead);

// PATCH /api/notificacoes/:id/read - Marcar como lida
router.patch('/:id/read', notificacoesController.markAsRead);

export default router;
