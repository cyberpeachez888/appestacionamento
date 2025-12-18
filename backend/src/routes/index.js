import express from 'express';
import ratesController from '../controllers/ratesController.js';
import monthlyController from '../controllers/monthlyController.js';
import ticketsController from '../controllers/ticketsController.js';
import paymentsController from '../controllers/paymentsController.js';
import reportsController from '../controllers/reportsController.js';
import monthlyReportsController from '../controllers/monthlyReportsController.js';
import vehiclesController from '../controllers/vehiclesController.js';
import receiptsController from '../controllers/receiptsController.js';
import * as vehicleTypesController from '../controllers/vehicleTypesController.js';
import rateTimeWindowsController from '../controllers/rateTimeWindowsController.js';
import rateThresholdsController from '../controllers/rateThresholdsController.js';
import maintenanceController, { seedAdmin } from '../controllers/maintenanceController.js';
import authController from '../controllers/authController.js';
import auditController from '../controllers/auditController.js';
import usersController from '../controllers/usersController.js';
import backupController from '../controllers/backupController.js';
import integrationsController from '../controllers/integrationsController.js';
import receiptTemplatesController from '../controllers/receiptTemplatesController.js';
import businessHoursController from '../controllers/businessHoursController.js';
import holidaysController from '../controllers/holidaysController.js';
import specialEventsController from '../controllers/specialEventsController.js';
import dashboardSettingsController from '../controllers/dashboardSettingsController.js';
import setupController from '../controllers/setupController.js';
import expensesController from '../controllers/expensesController.js';
import manualRevenuesController from '../controllers/manualRevenuesController.js';
import cashRegisterController from '../controllers/cashRegisterController.js';
import pricingRulesRoutes from './pricingRules.js';

import conveniosRoutes from './convenios.js';
import notificacoesRoutes from './notificacoes.js';
import { requireAuth, requireAdmin, requirePermission } from '../middleware/auth.js';
import { loginLimiter, apiLimiter, strictLimiter } from '../middleware/rateLimiter.js';
import printerJobsController from '../controllers/printerJobsController.js';
import { requirePrinterAgent } from '../middleware/printerAgentAuth.js';
import {
  validateLogin,
  validatePasswordChange,
  validateUserCreate,
} from '../middleware/validation.js';

const router = express.Router();

// Health check endpoint for Render
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TheProParking Backend',
  });
});

// Setup routes (no auth required for first-run)
router.get('/setup/check-first-run', setupController.checkFirstRun);
router.post('/setup/initialize', setupController.initialize);
router.post('/setup/cleanup-test-data', setupController.cleanupTestData);
router.get('/setup/company-settings', setupController.getCompanySettings);
// Reset to first-run (admin only)
router.post('/setup/reset-to-first-run', requireAuth, requireAdmin, setupController.resetToFirstRun);

// Rates (view requires any auth? allow unauth? We'll protect modifications.)
router.get('/rates', ratesController.list);
router.post('/rates', requireAuth, requirePermission('manageRates'), ratesController.create);
router.put('/rates/:id', requireAuth, requirePermission('manageRates'), ratesController.update);
router.delete('/rates/:id', requireAuth, requirePermission('manageRates'), ratesController.remove);

// Advanced rate windows (diária, pernoite, semanal, etc.)
router.get('/rates/:rateId/windows', requireAuth, rateTimeWindowsController.list);
router.post(
  '/rates/:rateId/windows',
  requireAuth,
  requirePermission('manageRates'),
  rateTimeWindowsController.create
);
router.put(
  '/rate-windows/:id',
  requireAuth,
  requirePermission('manageRates'),
  rateTimeWindowsController.update
);
router.delete(
  '/rate-windows/:id',
  requireAuth,
  requirePermission('manageRates'),
  rateTimeWindowsController.remove
);

// Rate thresholds / caps (ex.: sugerir diária)
router.get('/rates/:rateId/thresholds', requireAuth, rateThresholdsController.list);
router.post(
  '/rates/:rateId/thresholds',
  requireAuth,
  requirePermission('manageRates'),
  rateThresholdsController.create
);
router.put(
  '/rate-thresholds/:id',
  requireAuth,
  requirePermission('manageRates'),
  rateThresholdsController.update
);
router.delete(
  '/rate-thresholds/:id',
  requireAuth,
  requirePermission('manageRates'),
  rateThresholdsController.remove
);

// Vehicles (Entrada/Saída) - gated by openCloseCash for create/update/delete
router.get('/vehicles', vehiclesController.list);
router.post(
  '/vehicles',
  requireAuth,
  requirePermission('openCloseCash'),
  vehiclesController.create
);
router.put(
  '/vehicles/:id',
  requireAuth,
  requirePermission('openCloseCash'),
  vehiclesController.update
);
router.delete(
  '/vehicles/:id',
  requireAuth,
  requirePermission('openCloseCash'),
  vehiclesController.remove
);

// Monthly customers (listing needs viewReports OR manageMonthlyCustomers? We'll allow list to those with either; modifications require manageMonthlyCustomers)
router.get('/monthlyCustomers', requireAuth, monthlyController.list);
router.post(
  '/monthlyCustomers',
  requireAuth,
  requirePermission('manageMonthlyCustomers'),
  monthlyController.create
);
router.put(
  '/monthlyCustomers/:id',
  requireAuth,
  requirePermission('manageMonthlyCustomers'),
  monthlyController.update
);
router.delete(
  '/monthlyCustomers/:id',
  requireAuth,
  requirePermission('manageMonthlyCustomers'),
  monthlyController.remove
);
router.post(
  '/monthlyCustomers/:id/pay',
  requireAuth,
  requirePermission('manageMonthlyCustomers'),
  monthlyController.pay
);
router.get('/monthlyCustomers/:id/receipt', requireAuth, monthlyController.getReceipt);
router.get('/monthlyCustomers/slot/:slotNumber/check', requireAuth, monthlyController.checkSlot);

// Tickets (entrada/saida/consulta) - same permission as vehicles
router.post('/tickets', requireAuth, requirePermission('openCloseCash'), ticketsController.create); // entrada
router.post(
  '/tickets/:id/exit',
  requireAuth,
  requirePermission('openCloseCash'),
  ticketsController.exit
); // saída
router.get('/tickets/:id', requireAuth, ticketsController.get);
router.post(
  '/tickets/:id/change-tariff',
  requireAuth,
  requirePermission('openCloseCash'),
  ticketsController.changeTariff
);

// Payments and receipts (creating payments requires openCloseCash; listing/reporting requires viewReports)
router.post(
  '/payments',
  requireAuth,
  requirePermission('openCloseCash'),
  paymentsController.create
);
router.get('/payments', requireAuth, requirePermission('viewReports'), paymentsController.list);

// Receipts (creation linked to payment/ticket operations; restrict modifications; listing/reporting to viewReports)
router.post(
  '/receipts',
  requireAuth,
  requirePermission('openCloseCash'),
  receiptsController.create
);
router.get('/receipts', requireAuth, requirePermission('viewReports'), receiptsController.list);
router.get('/receipts/:id', requireAuth, receiptsController.getById);
router.delete(
  '/receipts/:id',
  requireAuth,
  requirePermission('openCloseCash'),
  receiptsController.delete
);

// Reports summary requires permission
router.get('/reports', requireAuth, requirePermission('viewReports'), reportsController.summary);

// Monthly Reports (Financial Cycle Closure)
router.post(
  '/reports/monthly',
  requireAuth,
  requirePermission('viewReports'),
  monthlyReportsController.generateMonthly
);
router.get(
  '/reports/monthly',
  requireAuth,
  requirePermission('viewReports'),
  monthlyReportsController.listMonthly
);
router.get(
  '/reports/monthly/:id',
  requireAuth,
  requirePermission('viewReports'),
  monthlyReportsController.getMonthly
);
router.delete(
  '/reports/monthly/:id',
  requireAuth,
  requireAdmin,
  monthlyReportsController.deleteMonthly
);

// Company config (view any authenticated; update requires manageCompanyConfig)
router.get('/companyConfig', requireAuth, paymentsController.getCompanyConfig);
router.put(
  '/companyConfig',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  paymentsController.updateCompanyConfig
);

// Vehicle types (manage requires manageVehicleTypes)
router.get('/vehicleTypes', requireAuth, vehicleTypesController.getVehicleTypes);
router.post(
  '/vehicleTypes',
  requireAuth,
  requirePermission('manageVehicleTypes'),
  vehicleTypesController.createVehicleType
);
router.delete(
  '/vehicleTypes/:id',
  requireAuth,
  requirePermission('manageVehicleTypes'),
  vehicleTypesController.deleteVehicleType
);

// Maintenance (development tools) - keep unprotected or protect with admin depending on environment
router.post(
  '/maintenance/backfill-ticket-payments',
  requireAuth,
  requireAdmin,
  maintenanceController.backfillTicketPayments
);
if (process.env.SEED_ADMIN_SECRET) {
  router.post('/maintenance/seed-admin', seedAdmin);
}

// Auth - with rate limiting for security
router.post('/auth/login', loginLimiter, validateLogin, authController.login);
router.get('/auth/me', requireAuth, authController.me);
router.post('/auth/validate-password', requireAuth, authController.validatePasswordStrength);
router.post(
  '/auth/change-password',
  requireAuth,
  strictLimiter,
  validatePasswordChange,
  authController.changePassword
);
router.get('/auth/password-requirements', authController.getPasswordRequirements);
router.post('/auth/forgot-password', loginLimiter, authController.forgotPassword);
router.post('/auth/reset-password', loginLimiter, authController.resetPassword);
router.get('/auth/validate-reset-token/:token', authController.validateResetToken);

// Users (protected) - still admin-only for management
router.get('/users', requireAuth, requirePermission('manageUsers'), usersController.list);
router.post(
  '/users',
  requireAuth,
  requirePermission('manageUsers'),
  validateUserCreate,
  usersController.create
);
router.put('/users/:id', requireAuth, requirePermission('manageUsers'), usersController.update);
router.put('/users/:id/password', requireAuth, usersController.updatePassword); // self or admin logic handled controller
router.delete('/users/:id', requireAuth, requirePermission('manageUsers'), usersController.remove);

// Audit events (view requires viewReports; create allowed for any authenticated action performer)
router.get('/audit/events', requireAuth, requirePermission('viewReports'), auditController.list);
router.post('/audit/events', requireAuth, auditController.create);

// Backups (admin-only management of backups)
router.post('/backup', requireAuth, requirePermission('manageBackups'), backupController.create);
router.get('/backup', requireAuth, requirePermission('viewReports'), backupController.list);
router.get('/backup/:id', requireAuth, requirePermission('viewReports'), backupController.download);
router.delete(
  '/backup/:id',
  requireAuth,
  requirePermission('manageBackups'),
  backupController.delete
);
router.get(
  '/backup/:id/preview',
  requireAuth,
  requirePermission('viewReports'),
  backupController.preview
);
router.post(
  '/backup/:id/restore',
  requireAuth,
  requirePermission('manageBackups'),
  backupController.restore
);

// Backup configuration and automatic backups
router.get(
  '/backup-config',
  requireAuth,
  requirePermission('viewReports'),
  backupController.getConfig
);
router.put(
  '/backup-config',
  requireAuth,
  requirePermission('manageBackups'),
  backupController.updateConfig
);
router.post(
  '/backup-config/trigger',
  requireAuth,
  requirePermission('manageBackups'),
  backupController.triggerAutoBackup
);

// Printer jobs queue (Print Agent integration)
router.get(
  '/printer-jobs',
  requireAuth,
  requirePermission('viewReports'),
  printerJobsController.list
);
router.get(
  '/printer-jobs/statuses',
  requireAuth,
  printerJobsController.statuses
);
router.get(
  '/printer-jobs/:id',
  requireAuth,
  requirePermission('viewReports'),
  printerJobsController.get
);
router.post(
  '/printer-jobs',
  requireAuth,
  requirePermission('openCloseCash'),
  printerJobsController.enqueue
);
router.post(
  '/printer-jobs/:id/cancel',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  printerJobsController.cancel
);

router.post('/printer-agent/claim', requirePrinterAgent, printerJobsController.claim);
router.post(
  '/printer-agent/jobs/:id/printing',
  requirePrinterAgent,
  printerJobsController.markPrinting
);
router.post(
  '/printer-agent/jobs/:id/complete',
  requirePrinterAgent,
  printerJobsController.complete
);
router.post('/printer-agent/jobs/:id/fail', requirePrinterAgent, printerJobsController.fail);

// Pricing Rules (Advanced Time-Based Pricing)
router.use('/pricing-rules', pricingRulesRoutes);

// Business Hours & Holidays (operational scheduling)
router.get('/business-hours', requireAuth, businessHoursController.list);
router.get('/business-hours/status/current', requireAuth, businessHoursController.getCurrentStatus);
router.get('/business-hours/:id', requireAuth, businessHoursController.getById);
router.put(
  '/business-hours/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  businessHoursController.update
);
router.get('/operational-status', requireAuth, businessHoursController.getCurrentStatus);

router.get('/holidays', requireAuth, holidaysController.list);
router.get('/holidays/upcoming', requireAuth, holidaysController.getUpcoming);
router.get('/holidays/check/:date', requireAuth, holidaysController.checkDate);
router.get('/holidays/:id', requireAuth, holidaysController.getById);
router.post(
  '/holidays',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  holidaysController.create
);
router.put(
  '/holidays/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  holidaysController.update
);
router.delete(
  '/holidays/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  holidaysController.delete
);

router.get('/special-events', requireAuth, specialEventsController.list);
router.get('/special-events/active', requireAuth, specialEventsController.getActive);
router.get('/special-events/check/:date', requireAuth, specialEventsController.checkDate);
router.get('/special-events/:id', requireAuth, specialEventsController.getById);
router.post(
  '/special-events',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  specialEventsController.create
);
router.put(
  '/special-events/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  specialEventsController.update
);
router.delete(
  '/special-events/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  specialEventsController.delete
);

// Receipt Templates (manage custom receipt templates)
router.get('/receipt-templates', requireAuth, receiptTemplatesController.list);
router.get('/receipt-templates/:id', requireAuth, receiptTemplatesController.getById);
router.get('/receipt-templates/default/:type', requireAuth, receiptTemplatesController.getDefault);
router.post(
  '/receipt-templates',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  receiptTemplatesController.create
);
router.put(
  '/receipt-templates/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  receiptTemplatesController.update
);
router.delete(
  '/receipt-templates/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  receiptTemplatesController.delete
);
router.post(
  '/receipt-templates/:id/set-default',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  receiptTemplatesController.setDefault
);
router.post('/receipt-templates/:id/preview', requireAuth, receiptTemplatesController.preview);
router.post(
  '/receipt-templates/:id/clone',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  receiptTemplatesController.clone
);

// Analytics Dashboard Settings
router.get('/dashboard-settings', requireAuth, dashboardSettingsController.getSettings);
router.put(
  '/dashboard-settings',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.updateSettings
);

router.get('/dashboard-widgets', requireAuth, dashboardSettingsController.listWidgets);
router.get('/dashboard-widgets/:id', requireAuth, dashboardSettingsController.getWidget);
router.post(
  '/dashboard-widgets',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.createWidget
);
router.put(
  '/dashboard-widgets/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.updateWidget
);
router.delete(
  '/dashboard-widgets/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.deleteWidget
);
router.post(
  '/dashboard-widgets/reorder',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.reorderWidgets
);

router.get('/kpi-thresholds', requireAuth, dashboardSettingsController.listThresholds);
router.get('/kpi-thresholds/:id', requireAuth, dashboardSettingsController.getThreshold);
router.post(
  '/kpi-thresholds',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.createThreshold
);
router.put(
  '/kpi-thresholds/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.updateThreshold
);
router.delete(
  '/kpi-thresholds/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.deleteThreshold
);

router.get('/report-schedules', requireAuth, dashboardSettingsController.listSchedules);
router.get('/report-schedules/:id', requireAuth, dashboardSettingsController.getSchedule);
router.post(
  '/report-schedules',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.createSchedule
);
router.put(
  '/report-schedules/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.updateSchedule
);
router.delete(
  '/report-schedules/:id',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.deleteSchedule
);
router.post(
  '/report-schedules/:id/test',
  requireAuth,
  requirePermission('manageCompanyConfig'),
  dashboardSettingsController.testSchedule
);

// Integrations & Webhooks (admin-only)
router.get('/integrations/configs', requireAuth, requireAdmin, integrationsController.getConfigs);
router.get(
  '/integrations/configs/:name',
  requireAuth,
  requireAdmin,
  integrationsController.getConfig
);
router.put(
  '/integrations/configs/:name',
  requireAuth,
  requireAdmin,
  integrationsController.updateConfig
);
router.post(
  '/integrations/test-:type',
  requireAuth,
  requireAdmin,
  integrationsController.testIntegration
);

// Email templates
router.get(
  '/integrations/email-templates',
  requireAuth,
  requireAdmin,
  integrationsController.getEmailTemplates
);
router.put(
  '/integrations/email-templates/:name',
  requireAuth,
  requireAdmin,
  integrationsController.updateEmailTemplate
);

// SMS templates
router.get(
  '/integrations/sms-templates',
  requireAuth,
  requireAdmin,
  integrationsController.getSMSTemplates
);
router.put(
  '/integrations/sms-templates/:name',
  requireAuth,
  requireAdmin,
  integrationsController.updateSMSTemplate
);

// Notification logs
router.get(
  '/integrations/notifications',
  requireAuth,
  requirePermission('viewReports'),
  integrationsController.getNotificationLogs
);
router.post(
  '/integrations/notifications/queue',
  requireAuth,
  integrationsController.queueNotification
);
router.post(
  '/integrations/notifications/process',
  requireAuth,
  requireAdmin,
  integrationsController.processQueue
);

// Webhooks
router.get(
  '/integrations/webhooks',
  requireAuth,
  requireAdmin,
  integrationsController.listWebhooks
);
router.post(
  '/integrations/webhooks',
  requireAuth,
  requireAdmin,
  integrationsController.createWebhook
);
router.put(
  '/integrations/webhooks/:id',
  requireAuth,
  requireAdmin,
  integrationsController.updateWebhook
);
router.delete(
  '/integrations/webhooks/:id',
  requireAuth,
  requireAdmin,
  integrationsController.deleteWebhook
);
router.post(
  '/integrations/webhooks/:id/test',
  requireAuth,
  requireAdmin,
  integrationsController.testWebhook
);
router.get(
  '/integrations/webhook-logs',
  requireAuth,
  requireAdmin,
  integrationsController.getWebhookLogs
);

// KPI Alert History
router.get('/kpi-alerts', requireAuth, dashboardSettingsController.listAlerts);
router.put('/kpi-alerts/:id/read', requireAuth, dashboardSettingsController.markAlertRead);
router.put('/kpi-alerts/:id/dismiss', requireAuth, dashboardSettingsController.dismissAlert);

// Expenses (Financial Management)
router.get('/expenses', requireAuth, requirePermission('viewReports'), expensesController.list);
router.get('/expenses/:id', requireAuth, requirePermission('viewReports'), expensesController.getById);
router.post(
  '/expenses',
  requireAuth,
  requirePermission('viewReports'),
  expensesController.create
);
router.put(
  '/expenses/:id',
  requireAuth,
  requirePermission('viewReports'),
  expensesController.update
);
router.delete(
  '/expenses/:id',
  requireAuth,
  requirePermission('viewReports'),
  expensesController.delete
);

// Manual Revenues (Sublocação and other manual income)
router.get(
  '/manual-revenues',
  requireAuth,
  requirePermission('viewReports'),
  manualRevenuesController.list
);
router.get(
  '/manual-revenues/:id',
  requireAuth,
  requirePermission('viewReports'),
  manualRevenuesController.getById
);
router.post(
  '/manual-revenues',
  requireAuth,
  requirePermission('viewReports'),
  manualRevenuesController.create
);
router.put(
  '/manual-revenues/:id',
  requireAuth,
  requirePermission('viewReports'),
  manualRevenuesController.update
);
router.delete(
  '/manual-revenues/:id',
  requireAuth,
  requirePermission('viewReports'),
  manualRevenuesController.delete
);

// Cash Register (Opening and closing sessions)
router.post(
  '/cash-register/open',
  requireAuth,
  requirePermission('openCloseCash'),
  cashRegisterController.open
);
router.get(
  '/cash-register/current',
  requireAuth,
  cashRegisterController.getCurrent
);
router.get(
  '/cash-register/summary',
  requireAuth,
  cashRegisterController.getSummary
);
router.post(
  '/cash-register/transaction',
  requireAuth,
  requirePermission('openCloseCash'),
  cashRegisterController.addTransaction
);
router.post(
  '/cash-register/close',
  requireAuth,
  requirePermission('openCloseCash'),
  cashRegisterController.close
);
router.get(
  '/cash-register/history',
  requireAuth,
  cashRegisterController.history
);
router.get(
  '/cash-register/report/:id',
  requireAuth,
  cashRegisterController.getReportData
);
router.get(
  '/cash-register/report/:id/:format',
  requireAuth,
  cashRegisterController.downloadReport
);

// Convenios (Corporate Agreements Management)
router.use('/convenios', conveniosRoutes);

// Notificações
router.use('/notificacoes', notificacoesRoutes);

export default router;
