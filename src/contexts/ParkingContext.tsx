import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  cpf?: string;
  phone?: string;
  plates: string[];
  parkingSlot: number;
  value: number;
  dueDate: string;
  lastPayment?: string;
  lastPaymentMethod?: string; // Allow any string from backend
  status: 'Em dia' | 'Atrasado';
  paymentHistory: Payment[];
  contractDate: string;
  operatorName?: string;
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
  printerConfig?: any; // Printer configuration (optional for backwards compatibility)
}

interface ParkingContextData {
  vehicles: Vehicle[];
  rates: Rate[];
  monthlyCustomers: MonthlyCustomer[];
  companyConfig: CompanyConfig;
  // Cash register state
  cashIsOpen: boolean;
  cashSession?: {
    operatorName?: string;
    openedAt: string; // ISO
    openingAmount: number;
    closedAt?: string; // ISO
    closingAmount?: number;
  };
  lastClosingAmount: number;
  openCashRegister: (openingAmount: number, operatorName?: string) => void;
  closeCashRegister: (closingAmount: number, operatorName?: string) => void;
  // Revenue aggregations
  getAvulsoRevenue: (opts?: { start?: string; end?: string }) => number;
  getMonthlyRevenue: (opts?: { start?: string; end?: string }) => number;
  getTotalRevenue: (opts?: { start?: string; end?: string }) => number;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addRate: (rate: Omit<Rate, 'id'>) => Promise<void>;
  updateRate: (id: string, rate: Partial<Rate>) => Promise<void>;
  deleteRate: (id: string) => Promise<void>;
  addMonthlyCustomer: (customer: Omit<MonthlyCustomer, 'id' | 'paymentHistory'>) => Promise<MonthlyCustomer>;
  updateMonthlyCustomer: (id: string, customer: Partial<MonthlyCustomer>) => Promise<void>;
  deleteMonthlyCustomer: (id: string) => Promise<void>;
  registerPayment: (customerId: string, payment: Omit<Payment, 'id' | 'receiptNumber'>) => Promise<number>;
  updateCompanyConfig: (config: Partial<CompanyConfig>) => Promise<void>;
  calculateRate: (vehicle: Vehicle, rate: Rate, exitDate: string, exitTime: string) => number;
}

const ParkingContext = createContext<ParkingContextData | undefined>(undefined);

export const ParkingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
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
  // Cash register state (persist to localStorage)
  // =======================
  const [cashIsOpen, setCashIsOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('cash:isOpen');
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });
  const [cashSession, setCashSession] = useState<ParkingContextData['cashSession']>(() => {
    try {
      const raw = localStorage.getItem('cash:session');
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  });
  const [lastClosingAmount, setLastClosingAmount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('cash:lastClosingAmount');
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try { localStorage.setItem('cash:isOpen', JSON.stringify(cashIsOpen)); } catch (e) { void e; }
  }, [cashIsOpen]);
  useEffect(() => {
    try { localStorage.setItem('cash:session', JSON.stringify(cashSession)); } catch (e) { void e; }
  }, [cashSession]);
  useEffect(() => {
    try { localStorage.setItem('cash:lastClosingAmount', String(lastClosingAmount)); } catch (e) { void e; }
  }, [lastClosingAmount]);

  // =======================
  // Carregar dados do backend
  // =======================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesData, ratesData] = await Promise.all([
          api.getVehicles().catch(err => { console.error('Error loading vehicles:', err); return []; }),
          api.getRates().catch(err => { console.error('Error loading rates:', err); return []; }),
        ]);
        setVehicles(vehiclesData || []);
        setRates(ratesData || []);

        // Auth-dependent resources
        if (token) {
          const [customersData, configData] = await Promise.all([
            api.getMonthlyCustomers().catch(err => { console.error('Error loading monthly customers:', err); return []; }),
            api.getCompanyConfig().catch(err => { 
              console.error('Error loading company config:', err); 
              return null as any;
            }),
          ]);
          setMonthlyCustomers(customersData || []);
          if (configData) setCompanyConfig(configData);
        } else {
          // If logged out, clear auth-bound data
          setMonthlyCustomers([]);
          setCompanyConfig({
            name: 'Estacionamento',
            legalName: '',
            cnpj: '',
            address: '',
            phone: '',
            primaryColor: '#2563eb',
            receiptCounter: 1,
          });
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setVehicles([]);
        setRates([]);
        setMonthlyCustomers([]);
      }
    };

    fetchData();
  }, [token]);

  // =======================
  // Cash register actions
  // =======================
  const openCashRegister = (openingAmount: number, operatorName?: string) => {
    const nowIso = new Date().toISOString();
    setCashSession({ openedAt: nowIso, openingAmount, operatorName });
    setCashIsOpen(true);
  };

  const closeCashRegister = (closingAmount: number, operatorName?: string) => {
    const nowIso = new Date().toISOString();
    setCashSession(prev => prev ? { ...prev, closedAt: nowIso, closingAmount, operatorName: operatorName || prev.operatorName } : undefined);
    setCashIsOpen(false);
    setLastClosingAmount(closingAmount);
  };

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
  // Revenue aggregations
  // =======================
  const getAvulsoRevenue = (opts?: { start?: string; end?: string }) => {
    const start = opts?.start ? new Date(opts.start) : undefined;
    const end = opts?.end ? new Date(opts.end) : undefined;
    return vehicles
      .filter(v => v.status === 'Concluído')
      .filter(v => {
        if (!start && !end) return true;
        const d = v.exitDate ? new Date(v.exitDate) : undefined;
        if (!d) return false;
        if (start && d < start) return false;
        if (end) {
          // Include end day fully
          const endDay = new Date(end);
          endDay.setHours(23,59,59,999);
          if (d > endDay) return false;
        }
        return true;
      })
      .reduce((sum, v) => sum + (v.totalValue || 0), 0);
  };

  const getMonthlyRevenue = (opts?: { start?: string; end?: string }) => {
    const start = opts?.start ? new Date(opts.start) : undefined;
    const end = opts?.end ? new Date(opts.end) : undefined;
    return monthlyCustomers.reduce((acc, c) => {
      const hist = c.paymentHistory || [];
      const sum = hist
        .filter(p => {
          const d = p.date ? new Date(p.date) : undefined;
          if (!d) return false;
          if (start && d < start) return false;
          if (end) {
            const endDay = new Date(end);
            endDay.setHours(23,59,59,999);
            if (d > endDay) return false;
          }
          return true;
        })
        .reduce((s, p) => s + (p.value || 0), 0);
      return acc + sum;
    }, 0);
  };

  const getTotalRevenue = (opts?: { start?: string; end?: string }) => {
    return getAvulsoRevenue(opts) + getMonthlyRevenue(opts);
  };

  // =======================
  // Funções CRUD conectadas ao backend
  // =======================
  const addVehicle = async (vehicle: Omit<Vehicle, 'id'>) => {
    try {
      const data = await api.createVehicle(vehicle);
      setVehicles(prev => [...prev, data]);
    } catch (err) {
      console.error('Erro ao adicionar veículo:', err);
      throw err;
    }
  };

  const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
    try {
      const data = await api.updateVehicle(id, vehicle);
      setVehicles(prev => prev.map(v => v.id === id ? data : v));
    } catch (err) {
      console.error('Erro ao atualizar veículo:', err);
      throw err;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await api.deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Erro ao remover veículo:', err);
      throw err;
    }
  };

  const addRate = async (rate: Omit<Rate, 'id'>) => {
    try {
      console.log('Adding rate:', rate);
      const data = await api.createRate(rate);
      console.log('API response:', data);
      setRates(prev => {
        const updated = [...prev, data];
        console.log('Updated rates:', updated);
        return updated;
      });
    } catch (err) {
      console.error('Erro ao adicionar tarifa:', err);
      throw err;
    }
  };

  const updateRate = async (id: string, rate: Partial<Rate>) => {
    try {
      const data = await api.updateRate(id, rate);
      setRates(prev => prev.map(r => r.id === id ? data : r));
    } catch (err) {
      console.error('Erro ao atualizar tarifa:', err);
      throw err;
    }
  };

  const deleteRate = async (id: string) => {
    try {
      await api.deleteRate(id);
      setRates(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Erro ao remover tarifa:', err);
      throw err;
    }
  };

  const addMonthlyCustomer = async (customerData: Omit<MonthlyCustomer, 'id' | 'paymentHistory'>) => {
    try {
      const data = await api.createMonthlyCustomer(customerData);
      setMonthlyCustomers(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Erro ao adicionar cliente:', err);
      throw err;
    }
  };

  const updateMonthlyCustomer = async (id: string, customer: Partial<MonthlyCustomer>) => {
    try {
      const data = await api.updateMonthlyCustomer(id, customer);
      setMonthlyCustomers(prev => prev.map(c => c.id === id ? data : c));
    } catch (err) {
      console.error('Erro ao atualizar cliente mensalista:', err);
      throw err;
    }
  };

  const deleteMonthlyCustomer = async (id: string) => {
    try {
      await api.deleteMonthlyCustomer(id);
      setMonthlyCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Erro ao remover cliente mensalista:', err);
      throw err;
    }
  };

  const registerPayment = async (customerId: string, payment: Omit<Payment, 'id' | 'receiptNumber'>): Promise<number> => {
    try {
      const response = await api.registerMonthlyPayment(customerId, {
        value: payment.value,
        method: payment.method,
      });
      // Update customer with new payment info
      setMonthlyCustomers(prev => prev.map(c => c.id === customerId ? response.customer : c));
  setCompanyConfig(prev => ({ ...prev, receiptCounter: prev.receiptCounter + 1 }));
  const receiptId = Number(response.payment?.id) || Date.now();
  return receiptId;
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      throw err;
    }
  };

  const updateCompanyConfig = async (config: Partial<CompanyConfig>) => {
    try {
      const data = await api.updateCompanyConfig(config);
      setCompanyConfig(data);
    } catch (err) {
      console.error('Erro ao atualizar configurações:', err);
      throw err;
    }
  };

  return (
    <ParkingContext.Provider
      value={{
        vehicles,
        rates,
        monthlyCustomers,
        companyConfig,
        cashIsOpen,
        cashSession,
        lastClosingAmount,
        openCashRegister,
        closeCashRegister,
        getAvulsoRevenue,
        getMonthlyRevenue,
        getTotalRevenue,
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