import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { isSupabaseConfigured } from './config/supabase.js';

// Import routes
import ticketsRoutes from './routes/tickets.js';
import monthlyClientsRoutes from './routes/monthlyClients.js';
import ratesRoutes from './routes/rates.js';
import paymentsRoutes from './routes/payments.js';
import receiptsRoutes from './routes/receipts.js';
import reportsRoutes from './routes/reports.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supabase: isSupabaseConfigured() ? 'connected' : 'not configured (using in-memory storage)'
  });
});

// API Routes
app.use('/api/tickets', ticketsRoutes);
app.use('/api/monthly-clients', monthlyClientsRoutes);
app.use('/api/rates', ratesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/reports', reportsRoutes);

// Backward compatibility routes (keeping old endpoints working)
import { v4 as uuid } from 'uuid';
import fs from 'fs';

const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

let vehicles = [];
let monthlyCustomers = [];
let companyConfig = {
  name: 'Estacionamento',
  legalName: '',
  cnpj: '',
  address: '',
  phone: '',
  primaryColor: '#2563eb',
  receiptCounter: 1,
};

// Legacy vehicle routes
app.get('/vehicles', (req, res) => res.json(vehicles));
app.post('/vehicles', (req, res) => {
  const vehicle = { ...req.body, id: uuid() };
  vehicles.push(vehicle);
  res.json(vehicle);
});
app.put('/vehicles/:id', (req, res) => {
  const index = vehicles.findIndex(v => v.id === req.params.id);
  if (index === -1) return res.status(404).send('Veículo não encontrado');
  vehicles[index] = { ...vehicles[index], ...req.body };
  res.json(vehicles[index]);
});
app.delete('/vehicles/:id', (req, res) => {
  vehicles = vehicles.filter(v => v.id !== req.params.id);
  res.sendStatus(204);
});

// Legacy rates endpoint
app.get('/rates', async (req, res) => {
  // Forward to new API
  try {
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/rates`);
    const data = await response.json();
    if (data.success && data.data) {
      // Transform to old format
      const oldFormat = data.data.map(r => ({
        id: r.id,
        vehicleType: r.vehicle_type === 'car' ? 'Carro' : r.vehicle_type === 'motorcycle' ? 'Moto' : 'Caminhão',
        rateType: r.rate_type === 'hourly' ? 'Hora/Fração' : r.rate_type === 'daily' ? 'Diária' : 'Mensal',
        value: parseFloat(r.amount),
        unit: r.rate_type === 'hourly' ? 'hora' : r.rate_type === 'daily' ? 'dia' : 'mês',
        courtesyMinutes: 10
      }));
      res.json(oldFormat);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.json([]);
  }
});

// Legacy monthly customers routes
app.get('/monthlyCustomers', (req, res) => res.json(monthlyCustomers));
app.post('/monthlyCustomers', (req, res) => {
  try {
    const contractDate = new Date().toISOString().split('T')[0];
    const customer = { ...req.body, id: uuid(), paymentHistory: [], contractDate };
    const payment = {
      id: uuid(),
      date: customer.contractDate,
      value: customer.value,
      method: req.body.paymentMethod || 'Dinheiro',
      receiptNumber: companyConfig.receiptCounter++
    };
    customer.paymentHistory.push(payment);
    customer.lastPayment = customer.contractDate;
    customer.dueDate = addMonths(new Date(customer.contractDate), 1).toISOString().split('T')[0];
    customer.status = 'Em dia';
    monthlyCustomers.push(customer);
    res.json(customer);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
app.put('/monthlyCustomers/:id', (req, res) => {
  const index = monthlyCustomers.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).send('Cliente não encontrado');
  monthlyCustomers[index] = { ...monthlyCustomers[index], ...req.body };
  res.json(monthlyCustomers[index]);
});
app.delete('/monthlyCustomers/:id', (req, res) => {
  monthlyCustomers = monthlyCustomers.filter(c => c.id !== req.params.id);
  res.sendStatus(204);
});

// Legacy company config routes
app.get('/companyConfig', (req, res) => res.json(companyConfig));
app.put('/companyConfig', (req, res) => {
  companyConfig = { ...companyConfig, ...req.body };
  res.json(companyConfig);
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
