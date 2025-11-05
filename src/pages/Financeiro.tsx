import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type FinancialRecord = {
  type: 'Avulso' | 'Mensalista';
  date: string;
  value: number;
};

export default function Financeiro() {
  const { toast } = useToast();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000/api/financeiro')
      .then(res => res.json())
      .then(data => setRecords(data))
      .catch(err => {
        toast({ title: 'Erro ao carregar dados', description: err.message });
      });
  }, []);

  const filteredRecords = records.filter(r => {
    if (!startDate || !endDate) return true;
    const date = new Date(r.date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  const totalAvulsos = filteredRecords
    .filter(r => r.type === 'Avulso')
    .reduce((acc, r) => acc + r.value, 0);

  const totalMensalistas = filteredRecords
    .filter(r => r.type === 'Mensalista')
    .reduce((acc, r) => acc + r.value, 0);

  const totalRevenue = totalAvulsos + totalMensalistas;

  const handleExportCSV = () => {
    const csvContent = [
      ['Tipo', 'Data', 'Valor'],
      ...filteredRecords.map(r => [r.type, r.date, r.value.toFixed(2)]),
      ['Total', '', totalRevenue.toFixed(2)]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financeiro_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: 'Relatório exportado',
      description: 'O arquivo CSV foi baixado com sucesso',
    });
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <Button onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border mb-6">
          <h3 className="font-semibold mb-4">Filtrar por Período</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate">Data Inicial</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="endDate">Data Final</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          {startDate && endDate && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setStartDate(''); setEndDate(''); }}>
              Limpar Filtro
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground mb-2">Receita Avulsos</p>
            <p className="text-3xl font-bold text-primary">R$ {totalAvulsos.toFixed(2)}</p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground mb-2">Receita Mensalistas</p>
            <p className="text-3xl font-bold text-accent">R$ {totalMensalistas.toFixed(2)}</p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground mb-2">Receita Total</p>
            <p className="text-3xl font-bold text-success">R$ {totalRevenue.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
