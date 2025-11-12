import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import RestoreDialog from '@/components/RestoreDialog';
import { Database, Download, Trash2, Upload } from 'lucide-react';

export default function Backup() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listBackups();
      setBackups(data || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setLoading(true);
    try {
      await api.createBackup();
      toast({ title: 'Backup criado', description: 'Backup salvo no servidor' });
      await load();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const download = async (id: string, filename: string) => {
    try {
      const blob = await api.downloadBackup(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: 'Erro ao baixar', description: err.message, variant: 'destructive' });
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover backup?')) return;
    try {
      await api.deleteBackup(id);
      toast({ title: 'Removido', description: 'Backup removido' });
      await load();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const openRestore = (id: string) => {
    setSelectedBackupId(id);
    setRestoreOpen(true);
  };

  const handleRestored = async () => {
    toast({
      title: 'Dados restaurados',
      description: 'Recarregue a página para ver as alterações',
      variant: 'default',
    });
    await load();
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              Backup & Restore
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie backups do sistema e restaure dados quando necessário
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={create} disabled={loading}>
              <Database className="h-4 w-4 mr-2" />
              Criar Backup
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h2 className="font-semibold">Histórico de Backups</h2>
          </div>
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Arquivo</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Tamanho</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Data de Criação</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum backup encontrado. Clique em "Criar Backup" para começar.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-sm">{b.filename}</td>
                    <td className="px-4 py-3 text-sm">{(b.size / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(b.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => download(b.id, b.filename)}
                        title="Baixar backup"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Baixar
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openRestore(b.id)}
                        title="Restaurar este backup"
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Restaurar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(b.id)}
                        title="Excluir backup"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Dicas de Backup</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Faça backups regulares antes de operações importantes</li>
            <li>Baixe backups importantes para seu computador local</li>
            <li>Teste a restauração periodicamente para garantir a integridade</li>
            <li>Mantenha backups em local seguro e externo ao sistema</li>
          </ul>
        </div>
      </div>

      <RestoreDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        backupId={selectedBackupId}
        onRestored={handleRestored}
      />
    </div>
  );
}
