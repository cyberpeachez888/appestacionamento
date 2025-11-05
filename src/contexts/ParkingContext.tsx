import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tipos
export type VehicleType = 'Carro' | 'Moto' | 'Caminhonete' | 'Van' | 'Ônibus';
export type RateType = 'Hora/Fração' | 'Diária' | 'Pernoite' | 'Semanal' | 'Quinzenal' | 'Mensal';
export type VehicleStatus = 'Em andamento' | 'Concluído';
export type PaymentMethod = 'Dinheiro' | 'Pix' | 'Cartão Débito' | 'Cartão Crédito';

export interface Rate {
  id: string;
  vehicleType: VehicleType;
  rateType: RateType;
  value: number;
  unit: string;
  courtesyMinutes: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  vehicleType: VehicleType;
  rateId: string;
  entryDate: string;
  entryTime: string;
  exitDate?: string;
  exitTime?: string;
  status: VehicleStatus;
  totalValue: number;
  paymentMethod?: PaymentMethod;
  contractedDays?: number;
}

export interface Payment {
  id: string;
  date: string;
  value: number;
  method: PaymentMethod;
  receiptNumber: number;
}

export interface MonthlyCustomer {
  id: string;
  name: string;
  plates: string[];
  value: number;
  dueDate: string;
  lastPayment?: string;
  status: 'Em dia' | 'Atrasado';
  paymentHistory: Payment[];
  contractDate: string;  // Adicionar
}

export interface CompanyConfig {
  name: string;
  legalName: string;
  cnpj: string;
  address: string;
  phone: string;
  logo?: string;
  primaryColor: string;
  receiptCounter: number;
}

interface ParkingContextData {
  vehicles: Vehicle[];
  rates: Rate[];
  monthlyCustomers: MonthlyCustomer[];
  companyConfig: CompanyConfig;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addRate: (rate: Omit<Rate, 'id'>) => Promise<void>;
  updateRate: (id: string, rate: Partial<Rate>) => Promise<void>;
  deleteRate: (id: string) => Promise<void>;
  addMonthlyCustomer: (customer: Omit<MonthlyCustomer, 'id' | 'paymentHistory'>) => Promise<void>;
  updateMonthlyCustomer: (id: string, customer: Partial<MonthlyCustomer>) => Promise<void>;
  deleteMonthlyCustomer: (id: string) => Promise<void>;
  registerPayment: (customerId: string, payment: Omit<Payment, 'id' | 'receiptNumber'>) => Promise<number>;
  updateCompanyConfig: (config: Partial<CompanyConfig>) => Promise<void>;
  calculateRate: (vehicle: Vehicle, rate: Rate, exitDate: string, exitTime: string) => number;
}

const ParkingContext = createContext<ParkingContextData | undefined>(undefined);

// URL base do backend (removido /api)
const API = 'http://localhost:3000';

export const ParkingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [monthlyCustomers, setMonthlyCustomers] = useState<MonthlyCustomer[]>([]);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    name: 'Estacionamento',
    legalName: '',
    cnpj: '',
    address: '',
    phone: '',
    primaryColor: '#2563eb',
    receiptCounter: 1,
  });

  // =======================
  // Carregar dados do backend
  // =======================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, rRes, cRes, cfgRes] = await Promise.all([
          fetch(`${API}/vehicles`),
          fetch(`${API}/rates`),
          fetch(`${API}/monthlyCustomers`),  // Corrigido: sem hífen
          fetch(`${API}/companyConfig`),     // Corrigido: sem hífen
        ]);

        if (!vRes.ok) throw new Error('Erro ao buscar veículos');
        if (!rRes.ok) throw new Error('Erro ao buscar tarifas');
        if (!cRes.ok) throw new Error('Erro ao buscar clientes');
        if (!cfgRes.ok) throw new Error('Erro ao buscar configurações');

        const vehiclesData: Vehicle[] = await vRes.json();
        const ratesData: Rate[] = await rRes.json();
        const customersData: MonthlyCustomer[] = await cRes.json();
        const configData: CompanyConfig = await cfgRes.json();

        setVehicles(vehiclesData);
        setRates(ratesData);
        setMonthlyCustomers(customersData);
        setCompanyConfig(configData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  // =======================
  // Cálculo de tarifa
  // =======================
  const calculateRate = (vehicle: Vehicle, rate: Rate, exitDate: string, exitTime: string): number => {
    const entry = new Date(`${vehicle.entryDate}T${vehicle.entryTime}`);
    const exit = new Date(`${exitDate}T${exitTime}`);
    const diffMinutes = Math.floor((exit.getTime() - entry.getTime()) / 60000);

    if (rate.rateType === 'Hora/Fração') {
      const hours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      let fractions = hours;
      if (remainingMinutes > rate.courtesyMinutes) fractions += 1;
      return Math.max(fractions, 1) * rate.value;
    } else if (rate.rateType === 'Diária') {
      const days = Math.ceil(diffMinutes / (24 * 60));
      return days * rate.value;
    } else if (rate.rateType === 'Pernoite') {
      return rate.value;
    } else if (['Semanal', 'Quinzenal', 'Mensal'].includes(rate.rateType)) {
      const contractedMinutes = (vehicle.contractedDays || 30) * 24 * 60;
      if (diffMinutes <= contractedMinutes) return rate.value;
      const hourlyRate = rates.find(r => r.vehicleType === vehicle.vehicleType && r.rateType === 'Hora/Fração');
      if (hourlyRate) return rate.value + Math.ceil((diffMinutes - contractedMinutes) / 60) * hourlyRate.value;
      return rate.value;
    }

    return rate.value;
  };

  // =======================
  // Funções CRUD conectadas ao backend
  // =======================
  const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    const res = await fetch(`${API}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    if (!res.ok) throw new Error('Erro ao adicionar veículo');
    const data = await res.json();
    setVehicles(prev => [...prev, data]);
  };

  const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
    const res = await fetch(`${API}/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    if (!res.ok) throw new Error('Erro ao atualizar veículo');
    const data = await res.json();
    setVehicles(prev => prev.map(v => v.id === id ? data : v));
  };

  const deleteVehicle = async (id: string) => {
    const res = await fetch(`${API}/vehicles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao remover veículo');
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const addRate = async (rate: Omit<Rate, 'id'>) => {
    const res = await fetch(`${API}/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rate),
    });
    if (!res.ok) throw new Error('Erro ao adicionar tarifa');
    const data = await res.json();
    setRates(prev => [...prev, data]);
  };

  const updateRate = async (id: string, rate: Partial<Rate>) => {
    const res = await fetch(`${API}/rates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rate),
    });
    if (!res.ok) throw new Error('Erro ao atualizar tarifa');
    const data = await res.json();
    setRates(prev => prev.map(r => r.id === id ? data : r));
  };

  const deleteRate = async (id: string) => {
    const res = await fetch(`${API}/rates/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao remover tarifa');
    setRates(prev => prev.filter(r => r.id !== id));
  };

  const addMonthlyCustomer = async (customerData: any) => {
    console.log('Enviando dados para backend:', customerData);
    try {
      const res = await fetch(`${API}/monthlyCustomers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (!res.ok) throw new Error('Erro ao adicionar cliente mensalista');
      const data = await res.json();
      console.log('Resposta do backend:', data);
      setMonthlyCustomers(prev => [...prev, data]);
    } catch (err) {
      console.error('Erro ao adicionar cliente:', err);
    }
  };
  

  const updateMonthlyCustomer = async (id: string, customer: Partial<MonthlyCustomer>) => {
    const res = await fetch(`${API}/monthlyCustomers/${id}`, {  // Corrigido: sem hífen
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
    if (!res.ok) throw new Error('Erro ao atualizar cliente mensalista');
    const data = await res.json();
    setMonthlyCustomers(prev => prev.map(c => c.id === id ? data : c));
  };

  const deleteMonthlyCustomer = async (id: string) => {
    const res = await fetch(`${API}/monthlyCustomers/${id}`, { method: 'DELETE' });  // Corrigido: sem hífen
    if (!res.ok) throw new Error('Erro ao remover cliente mensalista');
    setMonthlyCustomers(prev => prev.filter(c => c.id !== id));
  };

  const registerPayment = async (customerId: string, payment: Omit<Payment, 'id' | 'receiptNumber'>): Promise<number> => {
    const res = await fetch(`${API}/monthlyCustomers/${customerId}/payments`, {  // Corrigido: sem hífen
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!res.ok) throw new Error('Erro ao registrar pagamento');
    const data: MonthlyCustomer = await res.json();
    setMonthlyCustomers(prev => prev.map(c => c.id === customerId ? data : c));
    setCompanyConfig(prev => ({ ...prev, receiptCounter: data.paymentHistory.length + 1 }));
    return data.paymentHistory.length;
  };

  const updateCompanyConfig = async (config: Partial<CompanyConfig>) => {
    const res = await fetch(`${API}/companyConfig`, {  // Corrigido: sem hífen
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Erro ao atualizar configurações');
    const data: CompanyConfig = await res.json();
    setCompanyConfig(data);
  };

  return (
    <ParkingContext.Provider
      value={{
        vehicles,
        rates,
        monthlyCustomers,
        companyConfig,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addRate,
        updateRate,
        deleteRate,
        addMonthlyCustomer,
        updateMonthlyCustomer,
        deleteMonthlyCustomer,
        registerPayment,
        updateCompanyConfig,
        calculateRate,
      }}
    >
      {children}
    </ParkingContext.Provider>
  );
};

export const useParking = () => {
  const context = useContext(ParkingContext);
  if (!context) throw new Error('useParking deve ser usado dentro de um ParkingProvider');
  return context;
};