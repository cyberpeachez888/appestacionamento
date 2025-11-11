import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Definição de addMonths
const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/* ===== Dados em memória ===== */
let vehicles = [];
let rates = [
  { id: '1', vehicleType: 'Carro', rateType: 'Hora/Fração', value: 6, unit: 'hora', courtesyMinutes: 10 },
  { id: '2', vehicleType: 'Moto', rateType: 'Hora/Fração', value: 4, unit: 'hora', courtesyMinutes: 10 },
  { id: '3', vehicleType: 'Carro', rateType: 'Diária', value: 50, unit: 'dia', courtesyMinutes: 0 },
  { id: '4', vehicleType: 'Carro', rateType: 'Mensal', value: 400, unit: 'mês', courtesyMinutes: 0 },
];
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

/* ===== Veículos ===== */
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

/* ===== Tarifas ===== */
app.get('/rates', (req, res) => res.json(rates));
app.post('/rates', (req, res) => {
  const rate = { ...req.body, id: uuid() };
  rates.push(rate);
  res.json(rate);
});
app.put('/rates/:id', (req, res) => {
  const index = rates.findIndex(r => r.id === req.params.id);
  if (index === -1) return res.status(404).send('Tarifa não encontrada');
  rates[index] = { ...rates[index], ...req.body };
  res.json(rates[index]);
});
app.delete('/rates/:id', (req, res) => {
  rates = rates.filter(r => r.id !== req.params.id);
  res.sendStatus(204);
});

/* ===== Mensalistas ===== */
app.get('/monthlyCustomers', (req, res) => res.json(monthlyCustomers));
// Removido o primeiro app.post('/monthlyCustomers') duplicado
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

/* ===== Pagamentos ===== */
app.post('/monthlyCustomers', (req, res) => {
  try {
    console.log('POST /monthlyCustomers chamado para:', req.body.name);
    fs.writeFileSync('/tmp/backend.log', 'POST called\n', { flag: 'a' });
    const contractDate = new Date().toISOString().split('T')[0];
    console.log('ContractDate calculado:', contractDate);
    const customer = { ...req.body, id: uuid(), paymentHistory: [], contractDate };
    console.log('Objeto customer antes do pagamento:', JSON.stringify(customer, null, 2));
    // Registrar pagamento automático na contratação
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
    console.log('Cliente criado:', JSON.stringify(customer, null, 2));
    res.json(customer);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/* ===== Configuração da Empresa ===== */
app.get('/companyConfig', (req, res) => res.json(companyConfig));
app.put('/companyConfig', (req, res) => {
  companyConfig = { ...companyConfig, ...req.body };
  res.json(companyConfig);
});

/* ===== Iniciar servidor ===== */
const PORT = 3000;
app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`));