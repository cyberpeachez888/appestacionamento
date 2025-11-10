import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Clock, Database, Calendar } from 'lucide-react';

const BackupSettingsSection: React.FC = () => {
  const [config, setConfig] = useState({ enabled: false, schedule: '0 2 * * *', retentionDays: 30 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await api.getBackupConfig();
      setConfig(data);
    } catch (err: any) {
      console.error('Erro ao carregar configuração de backup:', err);
      // Don't show error toast if it's just missing config (404) - use defaults
      if (!err.message?.includes('404') && !err.message?.includes('Not Found')) {
        toast({ title: 'Erro ao carregar configuração', description: err.message, variant: 'destructive' });
      }
      // Keep default config state
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.updateBackupConfig(config);
      toast({ title: 'Configuração salva', description: 'As configurações de backup foram atualizadas' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const triggerNow = async () => {
    try {
      await api.triggerAutoBackup();
      toast({ title: 'Backup iniciado', description: 'Um backup automático está sendo criado' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const scheduleExamples: Record<string, string> = {
    '0 2 * * *': 'Diariamente às 2:00 AM',
    '0 0 * * 0': 'Semanalmente aos domingos à meia-noite',
    '0 3 1 * *': 'Mensalmente no dia 1 às 3:00 AM',
    '0 */6 * * *': 'A cada 6 horas',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Backups Automáticos
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure backups automáticos regulares para proteger seus dados
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando configurações...</div>
      ) : (
        <div className="space-y-6 bg-card border rounded-lg p-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Ativar backups automáticos</Label>
              <p className="text-sm text-muted-foreground">
                Criar backups automaticamente no horário agendado
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Agendamento (Cron Expression)
            </Label>
            <Input
              value={config.schedule}
              onChange={(e) => setConfig({ ...config, schedule: e.target.value })}
              placeholder="0 2 * * *"
              disabled={!config.enabled}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Exemplos comuns:</p>
              {Object.entries(scheduleExamples).map(([cron, desc]) => (
                <div key={cron} className="flex items-center justify-between">
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">{cron}</code>
                  <span className="text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Retention */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Retenção (dias)
            </Label>
            <Input
              type="number"
              min="1"
              max="365"
              value={config.retentionDays}
              onChange={(e) => setConfig({ ...config, retentionDays: parseInt(e.target.value) || 30 })}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Backups automáticos mais antigos que {config.retentionDays} dias serão removidos automaticamente
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            <Button variant="outline" onClick={triggerNow} disabled={!config.enabled}>
              Executar Backup Agora
            </Button>
          </div>

          {/* Status */}
          {config.enabled && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-900">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="font-medium">Backups automáticos ativos</p>
                  <p className="text-sm text-green-800">
                    Próximo backup: {scheduleExamples[config.schedule] || config.schedule}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default BackupSettingsSection;
