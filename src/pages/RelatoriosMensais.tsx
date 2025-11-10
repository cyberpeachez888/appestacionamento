import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Eye, FileText, Calendar, DollarSign, Users, Car } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface MonthlyReport {
  id: string;
  report_month: number;
  report_year: number;
  generated_at: string;
  operator_name: string;
  total_revenue: number;
  avulsos_revenue: number;
  mensalistas_revenue: number;
  status: string;
}

interface DetailedReport {
  id: string;
  report_month: number;
  report_year: number;
  generated_at: string;
  company_name: string;
  company_legal_name: string;
  company_cnpj: string;
  company_address: string;
  company_phone: string;
  operator_id: string;
  operator_name: string;
  total_revenue: number;
  avulsos_revenue: number;
  mensalistas_revenue: number;
  cash_total: number;
  pix_total: number;
  debit_card_total: number;
  credit_card_total: number;
  total_tickets: number;
  tickets_closed: number;
  monthly_customers_count: number;
  monthly_payments_count: number;
  tickets_data: any[];
  payments_data: any[];
  monthly_customers_data: any[];
  report_json: any;
  status: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function RelatoriosMensais() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DetailedReport | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadReports();
  }, [selectedYear]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getMonthlyReports({ year: selectedYear, limit: 12 });
      setReports(data || []);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      
      // Check if it's a schema/table error
      const isSchemaError = err.message?.includes('relation') || 
                           err.message?.includes('monthly_reports') ||
                           err.message?.includes('does not exist');
      
      if (isSchemaError) {
        toast({
          title: 'Tabela não encontrada',
          description: 'Execute o script backend/create-monthly-reports-table.sql no Supabase para criar a estrutura necessária.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao carregar relatórios',
          description: err.message || 'Não foi possível carregar os relatórios mensais.',
          variant: 'destructive',
        });
      }
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (report: MonthlyReport) => {
    try {
      const detailed = await api.getMonthlyReportById(report.id);
      setSelectedReport(detailed);
      setDetailsOpen(true);
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar detalhes',
        description: err.message || 'Não foi possível carregar os detalhes do relatório.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadPDF = (report: DetailedReport) => {
    // Generate a simple text document for now
    // In production, you'd use a PDF library like jsPDF or pdfmake
    const content = generateReportDocument(report);
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_mensal_${report.report_month}_${report.report_year}.txt`;
    link.click();

    toast({
      title: 'Relatório baixado',
      description: 'O documento foi baixado com sucesso.',
    });
  };

  const generateReportDocument = (report: DetailedReport): string => {
    const monthName = MONTHS[report.report_month - 1];
    
    return `
═══════════════════════════════════════════════════════════
             RELATÓRIO FINANCEIRO MENSAL
═══════════════════════════════════════════════════════════

PERÍODO: ${monthName}/${report.report_year}
GERADO EM: ${format(new Date(report.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}

───────────────────────────────────────────────────────────
INFORMAÇÕES DA EMPRESA
───────────────────────────────────────────────────────────
Razão Social: ${report.company_legal_name || report.company_name}
Nome Fantasia: ${report.company_name}
CNPJ: ${report.company_cnpj}
Endereço: ${report.company_address}
Telefone: ${report.company_phone}

───────────────────────────────────────────────────────────
OPERADOR RESPONSÁVEL
───────────────────────────────────────────────────────────
Nome: ${report.operator_name}
ID: ${report.operator_id}

───────────────────────────────────────────────────────────
RESUMO FINANCEIRO
───────────────────────────────────────────────────────────
Receita Total:          R$ ${report.total_revenue.toFixed(2)}
  • Avulsos:            R$ ${report.avulsos_revenue.toFixed(2)}
  • Mensalistas:        R$ ${report.mensalistas_revenue.toFixed(2)}

───────────────────────────────────────────────────────────
FORMAS DE PAGAMENTO
───────────────────────────────────────────────────────────
Dinheiro:               R$ ${report.cash_total.toFixed(2)}
PIX:                    R$ ${report.pix_total.toFixed(2)}
Cartão Débito:          R$ ${report.debit_card_total.toFixed(2)}
Cartão Crédito:         R$ ${report.credit_card_total.toFixed(2)}

───────────────────────────────────────────────────────────
ESTATÍSTICAS OPERACIONAIS
───────────────────────────────────────────────────────────
Total de Tickets:       ${report.total_tickets}
Tickets Encerrados:     ${report.tickets_closed}
Clientes Mensalistas:   ${report.monthly_customers_count}
Pagamentos Mensalistas: ${report.monthly_payments_count}

───────────────────────────────────────────────────────────
OBSERVAÇÕES
───────────────────────────────────────────────────────────
Este relatório foi gerado automaticamente pelo sistema de
gestão de estacionamento. Todos os dados operacionais foram
arquivados e podem ser consultados através do ID do relatório:
${report.id}

Status: ${report.status === 'completed' ? 'Concluído' : report.status}

═══════════════════════════════════════════════════════════
            FIM DO RELATÓRIO MENSAL
═══════════════════════════════════════════════════════════
`;
  };

  if (!hasPermission('viewReports')) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold">Acesso negado</h2>
          <p className="text-sm text-muted-foreground">
            Você não tem permissão para visualizar relatórios mensais.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Relatórios Mensais</h1>
          <div className="text-center py-12">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios Mensais</h1>
            <p className="text-muted-foreground mt-1">
              Histórico de encerramentos mensais e relatórios financeiros
            </p>
          </div>
          
          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedYear(selectedYear - 1)}
            >
              ←
            </Button>
            <span className="font-semibold min-w-[80px] text-center">{selectedYear}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedYear(selectedYear + 1)}
              disabled={selectedYear >= new Date().getFullYear()}
            >
              →
            </Button>
          </div>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum relatório gerado</h3>
              <p className="text-muted-foreground">
                Clique em "Gerar Relatório Mensal" na página Financeiro para criar seu primeiro relatório.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {MONTHS[report.report_month - 1]} {report.report_year}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Gerado em {format(new Date(report.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                      {report.status === 'completed' ? 'Concluído' : report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receita Total:</span>
                      <span className="font-semibold">R$ {report.total_revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avulsos:</span>
                      <span>R$ {report.avulsos_revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mensalistas:</span>
                      <span>R$ {report.mensalistas_revenue.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Operador: {report.operator_name}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewDetails(report)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatório Mensal - {MONTHS[selectedReport.report_month - 1]}/{selectedReport.report_year}
                </DialogTitle>
                <DialogDescription>
                  Gerado em {format(new Date(selectedReport.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Company Info */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Informações da Empresa
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nome:</span>
                      <p className="font-medium">{selectedReport.company_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CNPJ:</span>
                      <p className="font-medium">{selectedReport.company_cnpj}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Endereço:</span>
                      <p className="font-medium">{selectedReport.company_address}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Resumo Financeiro
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Receita Total</p>
                        <p className="text-2xl font-bold">R$ {selectedReport.total_revenue.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Avulsos</p>
                        <p className="text-2xl font-bold text-primary">R$ {selectedReport.avulsos_revenue.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Mensalistas</p>
                        <p className="text-2xl font-bold text-accent">R$ {selectedReport.mensalistas_revenue.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">Total Tickets</p>
                        <p className="text-2xl font-bold">{selectedReport.total_tickets}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <h3 className="font-semibold mb-3">Formas de Pagamento</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Dinheiro:</span>
                      <span className="font-semibold">R$ {selectedReport.cash_total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>PIX:</span>
                      <span className="font-semibold">R$ {selectedReport.pix_total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Cartão Débito:</span>
                      <span className="font-semibold">R$ {selectedReport.debit_card_total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Cartão Crédito:</span>
                      <span className="font-semibold">R$ {selectedReport.credit_card_total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Operational Stats */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Estatísticas Operacionais
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de Tickets:</span>
                      <span className="font-semibold">{selectedReport.total_tickets}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tickets Encerrados:</span>
                      <span className="font-semibold">{selectedReport.tickets_closed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clientes Mensalistas:</span>
                      <span className="font-semibold">{selectedReport.monthly_customers_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pagamentos Mensalistas:</span>
                      <span className="font-semibold">{selectedReport.monthly_payments_count}</span>
                    </div>
                  </div>
                </div>

                {/* Operator */}
                <div className="text-sm border-t pt-4">
                  <span className="text-muted-foreground">Operador responsável:</span>
                  <span className="ml-2 font-medium">{selectedReport.operator_name}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={() => handleDownloadPDF(selectedReport)}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Documento
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setDetailsOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
