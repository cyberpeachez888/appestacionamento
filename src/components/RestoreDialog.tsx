import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Database, CheckCircle2 } from 'lucide-react';

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupId: string | null;
  onRestored?: () => void;
}

const RestoreDialog: React.FC<RestoreDialogProps> = ({ open, onOpenChange, backupId, onRestored }) => {
  interface BackupPreview {
    summary?: Record<string, number>;
    metadata?: {
      timestamp: string;
      created_by: string;
      version: string;
      checksum?: string;
    };
  }
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && backupId) {
      loadPreview();
    } else {
      resetState();
    }
  }, [open, backupId]);

  const resetState = () => {
    setPreview(null);
    setSelectedTables([]);
    setConfirmText('');
    setAcknowledged(false);
  };

  const loadPreview = async () => {
    if (!backupId) return;
    setLoading(true);
    try {
      const data: BackupPreview = await api.previewBackup(backupId);
      setPreview(data);
      // Pre-select all tables by default
      if (data.summary) {
        setSelectedTables(Object.keys(data.summary));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao carregar preview', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (table: string) => {
    setSelectedTables(prev =>
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const toggleAll = () => {
    if (preview?.summary) {
      const allTables = Object.keys(preview.summary);
      setSelectedTables(selectedTables.length === allTables.length ? [] : allTables);
    }
  };

  const handleRestore = async () => {
    if (!backupId) return;
    if (confirmText !== 'RESTAURAR') {
      toast({ title: 'Confirmação inválida', description: 'Digite "RESTAURAR" para confirmar', variant: 'destructive' });
      return;
    }
    if (!acknowledged) {
      toast({ title: 'Confirmação necessária', description: 'Você deve confirmar que entende o risco', variant: 'destructive' });
      return;
    }
    if (selectedTables.length === 0) {
      toast({ title: 'Nenhuma tabela selecionada', description: 'Selecione ao menos uma tabela', variant: 'destructive' });
      return;
    }

    setRestoring(true);
    try {
      await api.restoreBackup(backupId, selectedTables);
      toast({ 
        title: 'Restauração concluída', 
        description: `${selectedTables.length} tabela(s) restaurada(s) com sucesso` 
      });
      onOpenChange(false);
      if (onRestored) onRestored();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao restaurar', description: message, variant: 'destructive' });
    } finally {
      setRestoring(false);
    }
  };

  const tableLabels: Record<string, string> = {
    rates: 'Tarifas',
    monthly_customers: 'Mensalistas',
    tickets: 'Tickets',
    payments: 'Pagamentos',
    users: 'Usuários',
    company_config: 'Configurações da Empresa',
    vehicle_types: 'Tipos de Veículos',
    user_events: 'Log de Auditoria',
    monthly_reports: 'Relatórios Mensais',
    receipts: 'Recibos',
  };

  const allSelected = preview?.summary && selectedTables.length === Object.keys(preview.summary).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Restaurar Backup
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando preview...</div>
        ) : !preview ? (
          <div className="p-8 text-center text-muted-foreground">Selecione um backup</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6">
            {/* Warning Banner */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">⚠️ Operação Destrutiva</h3>
                  <p className="text-sm text-red-800 mt-1">
                    A restauração irá <strong>substituir</strong> os dados atuais das tabelas selecionadas.
                    Esta ação <strong>não pode ser desfeita</strong>. Certifique-se de ter um backup atual antes de prosseguir.
                  </p>
                </div>
              </div>
            </div>

            {/* Backup Metadata */}
            {preview.metadata && (
              <div className="bg-muted/30 rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Informações do Backup</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Data:</span>
                    <span className="ml-2 font-medium">
                      {new Date(preview.metadata.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criado por:</span>
                    <span className="ml-2 font-medium">{preview.metadata.created_by}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Versão:</span>
                    <span className="ml-2 font-medium">{preview.metadata.version}</span>
                  </div>
                  {preview.metadata.checksum && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Checksum:</span>
                      <span className="ml-2 font-mono text-xs">{preview.metadata.checksum.substring(0, 16)}...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Table Selection */}
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold">Selecionar Tabelas para Restaurar</h3>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {allSelected ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </Button>
              </div>
              <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                {preview.summary && Object.keys(preview.summary).map(table => (
                  <label key={table} className="flex items-center justify-between p-3 hover:bg-muted/30 rounded cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedTables.includes(table)}
                        onCheckedChange={() => toggleTable(table)}
                      />
                      <div>
                        <div className="font-medium">{tableLabels[table] || table}</div>
                        <div className="text-xs text-muted-foreground">
                          {preview.summary[table]} registro(s)
                        </div>
                      </div>
                    </div>
                    {selectedTables.includes(table) && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Confirmation Section */}
            <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900">Confirmação Necessária</h3>
              
              <div className="space-y-3">
                <label className="flex items-start gap-3">
                  <Checkbox
                    checked={acknowledged}
                    onCheckedChange={(checked) => setAcknowledged(Boolean(checked))}
                  />
                  <span className="text-sm text-amber-900">
                    Eu entendo que esta operação irá <strong>substituir permanentemente</strong> os dados atuais
                    das tabelas selecionadas e não pode ser desfeita.
                  </span>
                </label>

                <div>
                  <label className="text-sm font-medium text-amber-900 block mb-2">
                    Digite <code className="bg-amber-100 px-2 py-1 rounded">RESTAURAR</code> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    placeholder="Digite RESTAURAR"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={restoring}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleRestore}
            disabled={!preview || restoring || confirmText !== 'RESTAURAR' || !acknowledged || selectedTables.length === 0}
          >
            {restoring ? 'Restaurando...' : 'Restaurar Backup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RestoreDialog;
