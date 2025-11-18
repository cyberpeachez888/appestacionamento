import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useParking } from '@/contexts/ParkingContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import OpenCashRegisterDialog from '@/components/OpenCashRegisterDialog';
import CloseCashRegisterDialog from '@/components/CloseCashRegisterDialog';
import { MonthlyReportDialog } from '@/components/MonthlyReportDialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FinancialRecord = {
  type: 'Avulso' | 'Mensalista';
  date: string;
  value: number;
};
type ReportPayment = { date: string; value: number; method?: string; target_type?: string };

type Expense = {
  id: string;
  name: string;
  value: number;
  dueDate: string;
  paymentDate: string | null;
  status: 'Pago' | 'Em dia' | 'Atrasado' | 'Perto do Vencimento';
  category: 'Contas' | 'Manutenção' | 'Pró-labore' | 'Impostos';
  isRecurring: boolean;
  recurringFrequency: 'monthly' | 'weekly' | 'yearly' | null;
  notes: string | null;
};

type ManualRevenue = {
  id: string;
  description: string;
  value: number;
  date: string;
  category: string; // Campo livre agora
  status: 'Pago' | 'Não Pago';
  notes: string | null;
};

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [manualRevenues, setManualRevenues] = useState<ManualRevenue[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [monthlyReportDialogOpen, setMonthlyReportDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expenseBackup, setExpenseBackup] = useState<Expense | null>(null);
  const [revenueBackup, setRevenueBackup] = useState<ManualRevenue | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const filters = startDate && endDate ? { start: startDate, end: endDate } : undefined;
        console.log('[Financeiro] Loading financial data with filters:', filters);
        
        // Load all financial data in parallel
        const [report, expensesData, revenuesData] = await Promise.all([
          api.getFinancialReport(filters).catch((err) => {
            console.error('[Financeiro] Error fetching financial report:', err);
            throw err;
          }),
          api.getExpenses(filters).catch((err) => {
            console.error('[Financeiro] Error fetching expenses:', err);
            // Check if it's a table not found error
            if (err.message?.includes('expenses') || err.message?.includes('table') || err.message?.includes('schema cache')) {
              console.warn('[Financeiro] Expenses table not found. Please run CREATE-TABLES-FINANCEIRO.sql in Supabase.');
            }
            return []; // Return empty array on error
          }),
          api.getManualRevenues(filters).catch((err) => {
            console.error('[Financeiro] Error fetching manual revenues:', err);
            // Check if it's a table not found error
            if (err.message?.includes('manual_revenues') || err.message?.includes('table') || err.message?.includes('schema cache')) {
              console.warn('[Financeiro] Manual revenues table not found. Please run CREATE-TABLES-FINANCEIRO.sql in Supabase.');
            }
            return []; // Return empty array on error
          }),
        ]);
        
        console.log('[Financeiro] Report received:', {
          hasReport: !!report,
          paymentsCount: report?.payments?.length || 0,
          total: report?.total || 0,
        });
        
        const payments: ReportPayment[] = report?.payments || [];
        const mapType = (t?: string): 'Avulso' | 'Mensalista' =>
          t === 'monthly_customer' ? 'Mensalista' : 'Avulso';
        const mapped: FinancialRecord[] = payments.map((p) => ({
          type: mapType(p.target_type),
          date: p.date,
          value: Number(p.value) || 0,
        }));
        
        console.log('[Financeiro] Mapped records:', mapped.length);
        setRecords(mapped);
        setExpenses(expensesData || []);
        setManualRevenues(revenuesData || []);
      } catch (err: any) {
        console.error('[Financeiro] Failed to load financial data:', err);
        
        // Check if it's a table not found error
        const isTableError = err.message?.includes('table') || 
                             err.message?.includes('schema cache') ||
                             err.message?.includes('manual_revenues') ||
                             err.message?.includes('expenses');
        
        const errorMessage = isTableError
          ? 'Tabelas não encontradas. Execute o script CREATE-TABLES-FINANCEIRO.sql no Supabase SQL Editor.'
          : err.message || String(err);
        
        toast({ 
          title: 'Erro ao carregar dados', 
          description: errorMessage,
          variant: 'destructive',
        });
        // Set empty arrays on error to prevent UI from breaking
        setRecords([]);
        setExpenses([]);
        setManualRevenues([]);
      } finally {
        setLoading(false);
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
  const totalParkingRevenue = totalAvulsos + totalMensalistas;
  
  // Calculate manual revenues total
  const totalManualRevenues = useMemo(() => {
    return manualRevenues.reduce((sum, r) => sum + (r.value || 0), 0);
  }, [manualRevenues]);
  
  // Calculate expenses total
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.value || 0), 0);
  }, [expenses]);
  
  // Total revenue (parking + manual)
  const totalRevenue = totalParkingRevenue + totalManualRevenues;
  
  // Net balance (revenue - expenses)
  const netBalance = totalRevenue - totalExpenses;

  const handleExportCSV = () => {
    const csvContent = [
      ['Tipo', 'Data', 'Valor'],
      ...filteredRecords.map((r) => [r.type, r.date, r.value.toFixed(2)]),
      ['Total Receitas Estacionamento', '', totalParkingRevenue.toFixed(2)],
      ['Total Receitas Manuais', '', totalManualRevenues.toFixed(2)],
      ['Total Receitas', '', totalRevenue.toFixed(2)],
      ['Total Despesas', '', totalExpenses.toFixed(2)],
      ['Saldo Líquido', '', netBalance.toFixed(2)],
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

  // Expense handlers
  const handleAddExpense = () => {
    const newExpense: Partial<Expense> = {
      id: `new-${Date.now()}`,
      name: '',
      value: 0,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      paymentDate: null,
      status: 'Em dia',
      category: 'Contas',
      isRecurring: false,
      recurringFrequency: null,
      notes: null,
    };
    setExpenses([...expenses, newExpense as Expense]);
    setEditingExpenseId(newExpense.id!);
  };

  const handleExpenseFieldChange = (id: string, field: keyof Expense, value: any) => {
    setExpenses((prev) => {
      const updated = prev.map((e) => {
        if (e.id !== id) return e;
        const updatedExpense = { ...e, [field]: value };
        // Recalculate status if dueDate or paymentDate changed
        if (field === 'dueDate' || field === 'paymentDate') {
          const status = calculateExpenseStatus(updatedExpense.dueDate, updatedExpense.paymentDate);
          updatedExpense.status = status;
        }
        return updatedExpense;
      });
      return updated;
    });
  };

  const calculateExpenseStatus = (dueDate: string, paymentDate: string | null): Expense['status'] => {
    if (paymentDate) {
      return 'Pago';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Atrasado';
    } else if (diffDays <= 3) {
      return 'Perto do Vencimento';
    } else {
      return 'Em dia';
    }
  };

  const handleSaveExpense = async (expense: Expense) => {
    try {
      if (expense.id.startsWith('new-')) {
        const { id, status, ...expenseData } = expense;
        const created = await api.createExpense(expenseData);
        setExpenses((prev) => prev.map((e) => (e.id === id ? created : e)));
        toast({ title: 'Despesa criada', description: 'A despesa foi registrada com sucesso' });
      } else {
        const { id, status, ...expenseData } = expense;
        // Preserve recurringFrequency when saving
        const updated = await api.updateExpense(id, expenseData);
        setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
        toast({ title: 'Despesa atualizada', description: 'A despesa foi atualizada com sucesso' });
      }
      setEditingExpenseId(null);
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível salvar a despesa',
        variant: 'destructive',
      });
    }
  };

  const handleMarkExpenseAsPaid = async (expense: Expense) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const updatedExpense = {
        ...expense,
        paymentDate: today,
        status: 'Pago' as const,
      };
      await handleExpenseFieldChange(expense.id, 'paymentDate', today);
      await handleExpenseFieldChange(expense.id, 'status', 'Pago');
      
      // Save immediately
      if (!expense.id.startsWith('new-')) {
        const { id, status, ...expenseData } = updatedExpense;
        await api.updateExpense(id, expenseData);
        setExpenses((prev) => prev.map((e) => (e.id === id ? updatedExpense : e)));
        toast({ title: 'Pagamento registrado', description: 'A despesa foi marcada como paga' });
      } else {
        // If it's a new expense, just update locally
        setExpenses((prev) => prev.map((e) => (e.id === expense.id ? updatedExpense : e)));
        toast({ title: 'Pagamento registrado', description: 'A despesa foi marcada como paga' });
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível registrar o pagamento',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    try {
      if (!id.startsWith('new-')) {
        await api.deleteExpense(id);
      }
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast({ title: 'Despesa excluída', description: 'A despesa foi removida com sucesso' });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível excluir a despesa',
        variant: 'destructive',
      });
    }
  };

  // Manual Revenue handlers
  const handleAddManualRevenue = () => {
    const newRevenue: Partial<ManualRevenue> = {
      id: `new-${Date.now()}`,
      description: '',
      value: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      category: '',
      status: 'Não Pago',
      notes: null,
    };
    setManualRevenues([...manualRevenues, newRevenue as ManualRevenue]);
    setEditingRevenueId(newRevenue.id!);
  };

  const handleRevenueFieldChange = (id: string, field: keyof ManualRevenue, value: any) => {
    setManualRevenues((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveManualRevenue = async (revenue: ManualRevenue) => {
    try {
      if (revenue.id.startsWith('new-')) {
        const { id, ...revenueData } = revenue;
        const created = await api.createManualRevenue(revenueData);
        setManualRevenues((prev) => prev.map((r) => (r.id === id ? created : r)));
        toast({ title: 'Receita criada', description: 'A receita foi registrada com sucesso' });
      } else {
        const { id, ...revenueData } = revenue;
        const updated = await api.updateManualRevenue(id, revenueData);
        setManualRevenues((prev) => prev.map((r) => (r.id === id ? updated : r)));
        toast({ title: 'Receita atualizada', description: 'A receita foi atualizada com sucesso' });
      }
      setEditingRevenueId(null);
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível salvar a receita',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteManualRevenue = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta receita?')) return;
    try {
      if (!id.startsWith('new-')) {
        await api.deleteManualRevenue(id);
      }
      setManualRevenues((prev) => prev.filter((r) => r.id !== id));
      toast({ title: 'Receita excluída', description: 'A receita foi removida com sucesso' });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível excluir a receita',
        variant: 'destructive',
      });
    }
  };

  // Get status badge color
  const getStatusColor = (status: Expense['status']) => {
    switch (status) {
      case 'Pago':
        return 'bg-success/10 text-success';
      case 'Atrasado':
        return 'bg-destructive/10 text-destructive';
      case 'Perto do Vencimento':
        return 'bg-warning/10 text-warning';
      case 'Em dia':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground mb-2">Receita Estacionamento</p>
            <p className="text-3xl font-bold text-primary">R$ {totalParkingRevenue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avulsos: R$ {totalAvulsos.toFixed(2)} | Mensalistas: R$ {totalMensalistas.toFixed(2)}
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground mb-2">Receitas Manuais</p>
            <p className="text-3xl font-bold text-accent">R$ {totalManualRevenues.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Sublocação e outros</p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border">
            <p className="text-sm text-muted-foreground mb-2">Despesas</p>
            <p className="text-3xl font-bold text-destructive">R$ {totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total de despesas registradas</p>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border border-primary/20">
            <p className="text-sm text-muted-foreground mb-2">Saldo Líquido</p>
            <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
              R$ {netBalance.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Receitas - Despesas</p>
          </div>
        </div>

        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="expenses">Despesas</TabsTrigger>
            <TabsTrigger value="revenues">Receitas Manuais</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Despesas</h2>
              <Button onClick={handleAddExpense} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Despesa
              </Button>
            </div>

            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Valor</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Categoria</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Vencimento</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Data Pagamento</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Recorrente</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma despesa registrada. Clique em "Adicionar Despesa" para começar.
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense, index) => (
                        <tr
                          key={expense.id}
                          className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                        >
                          <td className="px-4 py-3">
                            {editingExpenseId === expense.id ? (
                              <Input
                                value={expense.name}
                                onChange={(e) =>
                                  handleExpenseFieldChange(expense.id, 'name', e.target.value)
                                }
                                placeholder="Nome da despesa"
                                className="w-full"
                              />
                            ) : (
                              <span className="font-medium">{expense.name || '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingExpenseId === expense.id ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={expense.value}
                                onChange={(e) =>
                                  handleExpenseFieldChange(expense.id, 'value', Number(e.target.value))
                                }
                                className="w-full"
                              />
                            ) : (
                              <span>R$ {expense.value.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingExpenseId === expense.id ? (
                              <Select
                                value={expense.category}
                                onValueChange={(value) =>
                                  handleExpenseFieldChange(expense.id, 'category', value)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Contas">Contas</SelectItem>
                                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                                  <SelectItem value="Pró-labore">Pró-labore</SelectItem>
                                  <SelectItem value="Impostos">Impostos</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span>{expense.category}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingExpenseId === expense.id ? (
                              <Input
                                type="date"
                                value={expense.dueDate}
                                onChange={(e) =>
                                  handleExpenseFieldChange(expense.id, 'dueDate', e.target.value)
                                }
                                className="w-full"
                              />
                            ) : (
                              <span>
                                {expense.dueDate
                                  ? format(new Date(expense.dueDate), 'dd/MM/yyyy', { locale: ptBR })
                                  : '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingExpenseId === expense.id ? (
                              <Input
                                type="date"
                                value={expense.paymentDate || ''}
                                onChange={(e) =>
                                  handleExpenseFieldChange(
                                    expense.id,
                                    'paymentDate',
                                    e.target.value || null
                                  )
                                }
                                className="w-full"
                              />
                            ) : (
                              <span>
                                {expense.paymentDate
                                  ? format(new Date(expense.paymentDate), 'dd/MM/yyyy', { locale: ptBR })
                                  : '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                expense.status
                              )}`}
                            >
                              {expense.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {editingExpenseId === expense.id ? (
                              <div className="space-y-1">
                                <Select
                                  value={expense.isRecurring ? 'true' : 'false'}
                                  onValueChange={(value) =>
                                    handleExpenseFieldChange(expense.id, 'isRecurring', value === 'true')
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="false">Não</SelectItem>
                                    <SelectItem value="true">Sim</SelectItem>
                                  </SelectContent>
                                </Select>
                                {expense.isRecurring && (
                                  <Select
                                    value={expense.recurringFrequency || 'monthly'}
                                    onValueChange={(value) =>
                                      handleExpenseFieldChange(expense.id, 'recurringFrequency', value)
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="monthly">Mensal</SelectItem>
                                      <SelectItem value="weekly">Semanal</SelectItem>
                                      <SelectItem value="yearly">Anual</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm">
                                {expense.isRecurring
                                  ? expense.recurringFrequency === 'monthly'
                                    ? 'Mensal'
                                    : expense.recurringFrequency === 'weekly'
                                      ? 'Semanal'
                                      : 'Anual'
                                  : 'Não'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {editingExpenseId === expense.id ? (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (expenseBackup) {
                                      setExpenses((prev) =>
                                        prev.map((e) => (e.id === expense.id ? expenseBackup : e))
                                      );
                                    }
                                    setEditingExpenseId(null);
                                    setExpenseBackup(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveExpense(expense)}
                                  disabled={!expense.name || expense.value <= 0}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Salvar
                                </Button>
                              </div>
                            ) : (
                              <>
                                {expense.status !== 'Pago' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleMarkExpenseAsPaid(expense)}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Realizar Pagamento
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setExpenseBackup(expense);
                                    setEditingExpenseId(expense.id);
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="revenues" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Receitas Manuais</h2>
              <Button onClick={handleAddManualRevenue} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Receita
              </Button>
            </div>

            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Descrição</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Valor</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Categoria</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualRevenues.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhuma receita manual registrada. Clique em "Adicionar Receita" para começar.
                        </td>
                      </tr>
                    ) : (
                      manualRevenues.map((revenue, index) => (
                        <tr
                          key={revenue.id}
                          className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                        >
                          <td className="px-4 py-3">
                            {editingRevenueId === revenue.id ? (
                              <Input
                                value={revenue.description}
                                onChange={(e) =>
                                  handleRevenueFieldChange(revenue.id, 'description', e.target.value)
                                }
                                placeholder="Descrição da receita"
                                className="w-full"
                              />
                            ) : (
                              <span className="font-medium">{revenue.description || '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingRevenueId === revenue.id ? (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={revenue.value}
                                onChange={(e) =>
                                  handleRevenueFieldChange(revenue.id, 'value', Number(e.target.value))
                                }
                                className="w-full"
                              />
                            ) : (
                              <span>R$ {revenue.value.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingRevenueId === revenue.id ? (
                              <Input
                                value={revenue.category}
                                onChange={(e) =>
                                  handleRevenueFieldChange(revenue.id, 'category', e.target.value)
                                }
                                placeholder="Digite a categoria"
                                className="w-full"
                              />
                            ) : (
                              <span>{revenue.category || '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingRevenueId === revenue.id ? (
                              <Input
                                type="date"
                                value={revenue.date}
                                onChange={(e) =>
                                  handleRevenueFieldChange(revenue.id, 'date', e.target.value)
                                }
                                className="w-full"
                              />
                            ) : (
                              <span>
                                {revenue.date
                                  ? format(new Date(revenue.date), 'dd/MM/yyyy', { locale: ptBR })
                                  : '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {editingRevenueId === revenue.id ? (
                              <Select
                                value={revenue.status}
                                onValueChange={(value) =>
                                  handleRevenueFieldChange(revenue.id, 'status', value as 'Pago' | 'Não Pago')
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pago">Pago</SelectItem>
                                  <SelectItem value="Não Pago">Não Pago</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  revenue.status === 'Pago'
                                    ? 'bg-success/10 text-success'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {revenue.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            {editingRevenueId === revenue.id ? (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (revenueBackup) {
                                      setManualRevenues((prev) =>
                                        prev.map((r) => (r.id === revenue.id ? revenueBackup : r))
                                      );
                                    }
                                    setEditingRevenueId(null);
                                    setRevenueBackup(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveManualRevenue(revenue)}
                                  disabled={!revenue.description || revenue.value <= 0}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Salvar
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setRevenueBackup(revenue);
                                    setEditingRevenueId(revenue.id);
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteManualRevenue(revenue.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <OpenCashRegisterDialog 
        open={openDialogOpen} 
        onOpenChange={setOpenDialogOpen}
        totalRevenue={totalRevenue}
      />
      <CloseCashRegisterDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen} />
      <MonthlyReportDialog
        open={monthlyReportDialogOpen}
        onOpenChange={setMonthlyReportDialogOpen}
        onConfirm={handleGenerateMonthlyReport}
      />
    </div>
  );
}
