import { useEffect, useState } from 'react';
import { useParking } from '@/contexts/ParkingContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const COLORS = ['#2563EB', '#10B981', '#EF4444', '#FBBF24'];

const Index = () => {
  const { vehicles, monthlyCustomers, companyConfig } = useParking();

  const [activeVehicles, setActiveVehicles] = useState(0);
  const [completedVehicles, setCompletedVehicles] = useState(0);
  const [monthlyOnTime, setMonthlyOnTime] = useState(0);
  const [monthlyLate, setMonthlyLate] = useState(0);

  useEffect(() => {
    setActiveVehicles(vehicles.filter((v) => v.status === 'Em andamento').length);
    setCompletedVehicles(vehicles.filter((v) => v.status === 'Concluído').length);

    setMonthlyOnTime(monthlyCustomers.filter((c) => c.status === 'Em dia').length);
    setMonthlyLate(monthlyCustomers.filter((c) => c.status === 'Atrasado').length);
  }, [vehicles, monthlyCustomers]);

  const vehicleData = [
    { name: 'Em andamento', value: activeVehicles },
    { name: 'Concluídos', value: completedVehicles },
  ];

  const customerData = [
    { name: 'Em dia', value: monthlyOnTime },
    { name: 'Atrasados', value: monthlyLate },
  ];

  return (
    <div className="flex-1 p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">
          Bem-vindo(a), {companyConfig.name}!
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico Veículos */}
          <div className="bg-card p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold mb-4">Veículos</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={vehicleData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {vehicleData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico Mensalistas */}
          <div className="bg-card p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold mb-4">Mensalistas</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={customerData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value">
                  {customerData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contador de Recibos */}
        <div className="bg-card p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-2">Contador de Recibos</h2>
          <p className="text-3xl font-bold">
            {companyConfig.receiptCounter.toString().padStart(6, '0')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Última atualização: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
