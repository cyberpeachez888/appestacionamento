import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useParking } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import OpenCashRegisterDialog from '@/components/OpenCashRegisterDialog';
import CloseCashRegisterDialog from '@/components/CloseCashRegisterDialog';
import { MonthlyReportDialog } from '@/components/MonthlyReportDialog';

type FinancialRecord = {
  type: 'Avulso' | 'Mensalista';
  date: string;
  value: number;
};
type ReportPayment = { date: string; value: number; method?: string; target_type?: string };

export default function Financeiro() {
  const { toast } = useToast();
  const {
    cashIsOpen,
    cashSession,
    openCashRegister,
    getAvulsoRevenue,
    getMonthlyRevenue,
    getTotalRevenue,
  } = useParking();
  const { hasPermission } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [monthlyReportDialogOpen, setMonthlyReportDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const filters = startDate && endDate ? { start: startDate, end: endDate } : undefined;
        const report = await api.getFinancialReport(filters);
        const payments: ReportPayment[] = report?.payments || [];
        const mapType = (t?: string): 'Avulso' | 'Mensalista' =>
          t === 'monthly_customer' ? 'Mensalista' : 'Avulso';
        const mapped: FinancialRecord[] = payments.map((p) => ({
          type: mapType(p.target_type),
          date: p.date,
          value: Number(p.value) || 0,
        }));
        setRecords(mapped);
      } catch (err: any) {
        toast({ title: 'Erro ao carregar dados', description: err.message || String(err) });
      }
    };
    load();
  }, [startDate, endDate, toast]);

  // Warn and attempt to force a close flow when trying to leave with cash open
  useEffect(() => {
    if (!cashIsOpen) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      try {
        localStorage.setItem('cash:pendingClose', '1');
      } catch (err) {
        void err;
      }
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [cashIsOpen]);

  // If a pending close was flagged (e.g., due to beforeunload), reopen the close dialog on mount
  useEffect(() => {
    const pending =
      typeof window !== 'undefined' ? localStorage.getItem('cash:pendingClose') : null;
    if (pending && cashIsOpen) {
      setCloseDialogOpen(true);
      try {
        localStorage.removeItem('cash:pendingClose');
      } catch (err) {
        void err;
      }
    }
  }, [cashIsOpen]);

  const filteredRecords = records.filter((r) => {
    if (!startDate || !endDate) return true;
    const date = new Date(r.date);
    return date >= new Date(startDate) && date <= new Date(endDate);
  });

  // Compute totals from fetched report records to avoid relying on client history
  const totalAvulsos = filteredRecords
    .filter((r) => r.type === 'Avulso')
    .reduce((s, r) => s + r.value, 0);
  const totalMensalistas = filteredRecords
    .filter((r) => r.type === 'Mensalista')
    .reduce((s, r) => s + r.value, 0);
  const totalRevenue = totalAvulsos + totalMensalistas;

  const handleExportCSV = () => {
    const csvContent = [
      ['Tipo', 'Data', 'Valor'],
      ...filteredRecords.map((r) => [r.type, r.date, r.value.toFixed(2)]),
      ['Total', '', totalRevenue.toFixed(2)],
    ]
      .map((row) => row.join(','))
      .join('\n');

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

  const handleGenerateMonthlyReport = async (params: {
    month: number;
    year: number;
    clearOperational: boolean;
  }) => {
    try {
      const result = await api.generateMonthlyReport(params);

      toast({
        title: 'Relatório mensal gerado!',
        description: result.message || 'O relatório foi gerado e arquivado com sucesso.',
      });

      // Reload data to reflect any changes
      const filters = startDate && endDate ? { start: startDate, end: endDate } : undefined;
      const report = await api.getFinancialReport(filters);
      const payments: ReportPayment[] = report?.payments || [];
      const mapType = (t?: string): 'Avulso' | 'Mensalista' =>
        t === 'monthly_customer' ? 'Mensalista' : 'Avulso';
      const mapped: FinancialRecord[] = payments.map((p) => ({
        type: mapType(p.target_type),
        date: p.date,
        value: Number(p.value) || 0,
      }));
      setRecords(mapped);
    } catch (err: any) {
      console.error('Error generating monthly report:', err);
      toast({
        title: 'Erro ao gerar relatório',
        description: err.message || 'Não foi possível gerar o relatório mensal.',
        variant: 'destructive',
      });
      throw err; // Re-throw to let dialog handle it
    }
  };

  if (!hasPermission('viewReports')) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold">Acesso negado</h2>
          <p className="text-sm text-muted-foreground">
            Você não tem permissão para visualizar relatórios financeiros.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            {cashIsOpen && cashSession?.openedAt && (
              <p className="text-sm text-muted-foreground mt-1">
                Caixa aberto em{' '}
                {format(new Date(cashSession.openedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setMonthlyReportDialogOpen(true)}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório Mensal
            </Button>
            {!cashIsOpen && hasPermission('openCloseCash') && (
              <Button
                onClick={() => setOpenDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Abrir Caixa
              </Button>
            )}
            {cashIsOpen && hasPermission('openCloseCash') && (
              <Button onClick={() => setCloseDialogOpen(true)} variant="destructive">
                Fechar Caixa
              </Button>
            )}
          </div>
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
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="endDate">Data Final</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          {startDate && endDate && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
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
      <OpenCashRegisterDialog open={openDialogOpen} onOpenChange={setOpenDialogOpen} />
      <CloseCashRegisterDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} />
      <MonthlyReportDialog
        open={monthlyReportDialogOpen}
        onOpenChange={setMonthlyReportDialogOpen}
        onConfirm={handleGenerateMonthlyReport}
      />
    </div>
  );
}
