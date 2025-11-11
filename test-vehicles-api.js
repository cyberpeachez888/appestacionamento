// Teste rápido para verificar se a API /vehicles está retornando dados de saída corretamente
// Execute com: node test-vehicles-api.js

import fetch from 'node-fetch';

const API_URL = 'https://theproparking-backend-1rxk.onrender.com/api';

async function testVehicles() {
  try {
    const res = await fetch(`${API_URL}/vehicles`);
    const vehicles = await res.json();
    console.log('Veículos retornados pela API:');
    vehicles.forEach(v => {
      console.log(`ID: ${v.id} | Placa: ${v.plate} | Entrada: ${v.entryDate} ${v.entryTime} | Saída: ${v.exitDate || '-'} ${v.exitTime || '-'} | Status: ${v.status}`);
    });
  } catch (err) {
    console.error('Erro ao consultar API /vehicles:', err);
  }
}

testVehicles();
