import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MonthlyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: { month: number; year: number; clearOperational: boolean }) => Promise<void>;
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function MonthlyReportDialog({ open, onOpenChange, onConfirm }: MonthlyReportDialogProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Default to previous month
  const defaultMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const defaultYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [clearOperational, setClearOperational] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate year options (current year and 2 years back)
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const handleConfirm = async () => {
    setIsGenerating(true);
    try {
      await onConfirm({
        month: selectedMonth,
        year: selectedYear,
        clearOperational,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Error in dialog:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const monthName = MONTHS.find(m => m.value === selectedMonth)?.label || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório Mensal
          </DialogTitle>
          <DialogDescription>
            Encerre o ciclo financeiro mensal e gere um relatório completo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Month Selection */}
          <div className="space-y-2">
            <Label htmlFor="month">Mês de Referência</Label>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(Number(value))}
            >
              <SelectTrigger id="month">
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selection */}
          <div className="space-y-2">
            <Label htmlFor="year">Ano</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              <SelectTrigger id="year">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Operational Option */}
          <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
            <Checkbox
              id="clearOperational"
              checked={clearOperational}
              onCheckedChange={(checked) => setClearOperational(checked as boolean)}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor="clearOperational"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Limpar registros operacionais
              </Label>
              <p className="text-sm text-muted-foreground">
                Remove todos os tickets (entrada/saída) do período após arquivamento.
                Recomendado para iniciar novo ciclo mensal.
              </p>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação irá:
              <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                <li>Arquivar todos os dados financeiros de <strong>{monthName}/{selectedYear}</strong></li>
                <li>Gerar relatório completo com receitas e despesas</li>
                <li>Salvar snapshot de todos os pagamentos e tickets</li>
                {clearOperational && (
                  <li className="text-orange-600 dark:text-orange-400">
                    <strong>Limpar tabela operacional</strong> (tickets de entrada/saída)
                  </li>
                )}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Apenas um relatório por mês pode ser gerado. Certifique-se de que todos os
                lançamentos do período foram registrados.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isGenerating}
            className="min-w-[120px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Gerar Relatório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
