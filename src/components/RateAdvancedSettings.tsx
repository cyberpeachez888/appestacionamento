import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Rate, RateConfig, RateType, useParking } from '@/contexts/ParkingContext';
import { PricingRulesManager } from '@/components/PricingRulesManager';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type WindowType = 'daily' | 'overnight' | 'weekly' | 'biweekly';

interface RateTimeWindow {
  id: string;
  rate_id: string;
  window_type: string;
  start_time?: string | null;
  end_time?: string | null;
  start_day?: number | null;
  end_day?: number | null;
  duration_limit_minutes?: number | null;
  extra_rate_id?: string | null;
  metadata?: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
}

interface RateThreshold {
  id: string;
  source_rate_id: string;
  target_rate_id: string;
  threshold_amount: number;
  auto_apply: boolean;
  created_at: string;
}

interface RateAdvancedSettingsProps {
  rate: Rate;
  allRates: Rate[];
  onClose?: () => void;
  onUpdated?: () => void;
}

const windowTypeLabels: Record<WindowType, string> = {
  daily: 'Diária',
  overnight: 'Pernoite',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
};

const weekDayOptions = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const DEFAULT_EXTRA_RATE_OPTION = '__CURRENT_RATE__';

function normalize(value?: string | null) {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function toWindowType(value: string): WindowType | null {
  const normalized = normalize(value);
  if (normalized.includes('daily') || normalized.includes('diaria')) return 'daily';
  if (normalized.includes('overnight') || normalized.includes('pernoite')) return 'overnight';
  if (normalized.includes('weekly') || normalized.includes('semanal')) return 'weekly';
  if (normalized.includes('biweekly') || normalized.includes('quinzenal')) return 'biweekly';
  return null;
}

function getDefaultWindowType(rateType: RateType): WindowType {
  const normalized = normalize(rateType);
  if (normalized.includes('diaria')) return 'daily';
  if (normalized.includes('pernoite')) return 'overnight';
  if (normalized.includes('semanal')) return 'weekly';
  if (normalized.includes('quinzenal')) return 'biweekly';
  return 'daily';
}

function formatTime(value?: string | null) {
  if (!value) return '--:--';
  return value.length === 5 ? value : value.slice(0, 5);
}

function dayLabel(value?: number | null) {
  const opt = weekDayOptions.find((d) => d.value === value);
  return opt ? opt.label : 'Dia';
}

function humanizeDateTime(iso?: string) {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch {
    return iso;
  }
}

export function RateAdvancedSettings({
  rate,
  allRates,
  onClose,
  onUpdated,
}: RateAdvancedSettingsProps) {
  const { toast } = useToast();
  const { updateRate } = useParking();
  const [tab, setTab] = useState('windows');
  const [windows, setWindows] = useState<RateTimeWindow[]>([]);
  const [thresholds, setThresholds] = useState<RateThreshold[]>([]);
  const [config, setConfig] = useState<RateConfig>(rate.config || {});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const hourlyRates = useMemo(
    () =>
      allRates.filter(
        (r) =>
          r.id !== rate.id &&
          normalize(r.vehicleType) === normalize(rate.vehicleType) &&
          normalize(r.rateType).includes('hora')
      ),
    [allRates, rate.id, rate.rateType, rate.vehicleType]
  );

  const targetRates = useMemo(
    () =>
      allRates.filter(
        (r) =>
          r.id !== rate.id &&
          normalize(r.vehicleType) === normalize(rate.vehicleType) &&
          normalize(r.rateType) !== 'mensal'
      ),
    [allRates, rate.id, rate.vehicleType]
  );

  const defaultWindowType = getDefaultWindowType(rate.rateType);

  const [windowForm, setWindowForm] = useState({
    id: '' as string | null | '',
    windowType: defaultWindowType,
    startTime: '',
    endTime: '',
    startDay: 1,
    endDay: 5,
    durationLimitMinutes: '',
    extraRateId: '',
    isActive: true,
    metadata: '',
  });

  const [thresholdForm, setThresholdForm] = useState({
    id: '' as string | null | '',
    targetRateId: '',
    thresholdAmount: '',
    autoApply: false,
  });

  const rateTitle = `${rate.vehicleType} - ${rate.rateType}`;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate.id]);

  useEffect(() => {
    resetWindowForm();
    resetThresholdForm();
  }, [rate.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [windowsData, thresholdsData] = await Promise.all([
        api.getRateTimeWindows(rate.id),
        api.getRateThresholds(rate.id),
      ]);
      setWindows(windowsData || []);
      setThresholds(thresholdsData || []);
      setConfig((rate.config as RateConfig) || {});
    } catch (error) {
      console.error('Erro ao carregar dados avançados da tarifa:', error);
      toast({
        title: 'Erro ao carregar configurações',
        description: 'Não foi possível carregar as configurações avançadas desta tarifa.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetWindowForm = () => {
    setWindowForm({
      id: '',
      windowType: defaultWindowType,
      startTime: '',
      endTime: '',
      startDay: 1,
      endDay: 5,
      durationLimitMinutes: '',
      extraRateId: '',
      isActive: true,
      metadata: '',
    });
  };

  const resetThresholdForm = () => {
    setThresholdForm({
      id: '',
      targetRateId: '',
      thresholdAmount: '',
      autoApply: false,
    });
  };

  const handleEditWindow = (row: RateTimeWindow) => {
    setTab('windows');
    setWindowForm({
      id: row.id,
      windowType: toWindowType(row.window_type) || defaultWindowType,
      startTime: row.start_time || '',
      endTime: row.end_time || '',
      startDay: row.start_day ?? 1,
      endDay: row.end_day ?? 5,
      durationLimitMinutes: row.duration_limit_minutes?.toString() || '',
      extraRateId: row.extra_rate_id || '',
      isActive: row.is_active,
      metadata: JSON.stringify(row.metadata || {}, null, 2),
    });
  };

  const handleEditThreshold = (row: RateThreshold) => {
    setTab('thresholds');
    setThresholdForm({
      id: row.id,
      targetRateId: row.target_rate_id,
      thresholdAmount: row.threshold_amount.toString(),
      autoApply: row.auto_apply,
    });
  };

  const handleSubmitWindow = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        windowType: windowForm.windowType,
        startTime: windowForm.startTime || null,
        endTime: windowForm.endTime || null,
        startDay: windowForm.startDay,
        endDay: windowForm.endDay,
        durationLimitMinutes: windowForm.durationLimitMinutes
          ? Number(windowForm.durationLimitMinutes)
          : null,
        extraRateId: windowForm.extraRateId || null,
        isActive: windowForm.isActive,
        metadata: parseMetadata(windowForm.metadata),
      };

      if (windowForm.windowType === 'daily' || windowForm.windowType === 'overnight') {
        if (!windowForm.startTime || !windowForm.endTime) {
          throw new Error('Informe horário de início e término.');
        }
      }

      if (windowForm.windowType === 'weekly' || windowForm.windowType === 'biweekly') {
        if (!windowForm.durationLimitMinutes) {
          throw new Error('Informe o limite de duração em minutos.');
        }
      }

      if (windowForm.id) {
        await api.updateRateTimeWindow(windowForm.id, payload);
        toast({ title: 'Janela atualizada com sucesso.' });
      } else {
        await api.createRateTimeWindow(rate.id, payload);
        toast({ title: 'Janela criada com sucesso.' });
      }

      resetWindowForm();
      loadData();
      onUpdated?.();
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao salvar janela',
        description: err.message || 'Verifique os campos e tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWindow = async (row: RateTimeWindow) => {
    if (!confirm('Confirmar exclusão desta janela?')) return;
    try {
      await api.deleteRateTimeWindow(row.id);
      toast({ title: 'Janela removida com sucesso.' });
      loadData();
      onUpdated?.();
    } catch (error) {
      toast({
        title: 'Erro ao remover janela',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmitThreshold = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (!thresholdForm.targetRateId) {
        throw new Error('Selecione a tarifa alvo.');
      }
      if (!thresholdForm.thresholdAmount) {
        throw new Error('Informe o valor limite para sugestão.');
      }
      const payload = {
        targetRateId: thresholdForm.targetRateId,
        thresholdAmount: Number(thresholdForm.thresholdAmount),
        autoApply: thresholdForm.autoApply,
      };

      if (thresholdForm.id) {
        await api.updateRateThreshold(thresholdForm.id, payload);
        toast({ title: 'Sugestão atualizada com sucesso.' });
      } else {
        await api.createRateThreshold(rate.id, payload);
        toast({ title: 'Sugestão criada com sucesso.' });
      }

      resetThresholdForm();
      loadData();
      onUpdated?.();
    } catch (error) {
      toast({
        title: 'Erro ao salvar sugestão',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteThreshold = async (row: RateThreshold) => {
    if (!confirm('Remover esta sugestão automática?')) return;
    try {
      await api.deleteRateThreshold(row.id);
      toast({ title: 'Sugestão removida com sucesso.' });
      loadData();
      onUpdated?.();
    } catch (error) {
      toast({
        title: 'Erro ao remover sugestão',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const renderWindowRow = (row: RateTimeWindow) => {
    const type = toWindowType(row.window_type) || 'daily';
    return (
      <div
        key={row.id}
        className="border rounded-lg p-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={row.is_active ? 'default' : 'secondary'}>
              {windowTypeLabels[type]}
            </Badge>
            {!row.is_active && <span className="text-xs text-muted-foreground">(Inativa)</span>}
          </div>
          <p className="text-sm">
            Horário:{' '}
            <span className="font-medium">
              {formatTime(row.start_time)} → {formatTime(row.end_time)}
            </span>
          </p>
          {(type === 'weekly' || type === 'biweekly') && (
            <p className="text-xs text-muted-foreground">
              {dayLabel(row.start_day)} → {dayLabel(row.end_day)} • limite:{' '}
              {row.duration_limit_minutes ? `${row.duration_limit_minutes} min` : 'não definido'}
            </p>
          )}
          {row.extra_rate_id && (
            <p className="text-xs text-muted-foreground">
              Tarifa extra:{' '}
              {allRates.find((r) => r.id === row.extra_rate_id)?.rateType || row.extra_rate_id}
            </p>
          )}
          {row.metadata && Object.keys(row.metadata).length > 0 && (
            <pre className="bg-muted/60 rounded-md p-2 text-[11px] text-muted-foreground overflow-x-auto">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleEditWindow(row)}>
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteWindow(row)}>
            Excluir
          </Button>
        </div>
      </div>
    );
  };

  const renderThresholdRow = (row: RateThreshold) => {
    const targetRate = allRates.find((r) => r.id === row.target_rate_id);
    return (
      <div
        key={row.id}
        className="border rounded-lg p-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={row.auto_apply ? 'default' : 'outline'}>
              {row.auto_apply ? 'Aplicação automática' : 'Sugestão'}
            </Badge>
            {targetRate && (
              <span className="text-sm font-medium">
                {targetRate.vehicleType} - {targetRate.rateType}
              </span>
            )}
          </div>
          <p className="text-sm">
            Valor limite:{' '}
            <span className="font-medium">R$ {Number(row.threshold_amount).toFixed(2)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Criado em: {humanizeDateTime(row.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleEditThreshold(row)}>
            Editar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDeleteThreshold(row)}>
            Excluir
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Carregando configurações avançadas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Configurações Avançadas</h2>
          <p className="text-sm text-muted-foreground">
            Ajuste janelas de tempo, sugestões de tarifa e regras especiais para {rateTitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rate.unit && (
            <Badge variant="outline">
              Valor base: R$ {rate.value.toFixed(2)}/{rate.unit}
            </Badge>
          )}
          <Badge variant="outline">{rate.vehicleType}</Badge>
          <Badge variant="outline">{rate.rateType}</Badge>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="windows">Janelas de Tempo</TabsTrigger>
          <TabsTrigger value="thresholds">Sugestões Automáticas</TabsTrigger>
          <TabsTrigger value="config">Configurações da Tarifa</TabsTrigger>
          <TabsTrigger value="rules">Regras Avançadas</TabsTrigger>
        </TabsList>

        <TabsContent value="windows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Janelas de Tempo</CardTitle>
              <CardDescription>
                Configure horários válidos para esta tarifa. Você pode definir múltiplas janelas por
                tipo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitWindow} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Janela</Label>
                    <Select
                      value={windowForm.windowType}
                      onValueChange={(value) =>
                        setWindowForm((prev) => ({ ...prev, windowType: value as WindowType }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="overnight">Pernoite</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quinzenal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Status</Label>
                      <p className="text-xs text-muted-foreground">
                        Ative/desative temporariamente a janela
                      </p>
                    </div>
                    <Switch
                      checked={windowForm.isActive}
                      onCheckedChange={(checked) =>
                        setWindowForm((prev) => ({ ...prev, isActive: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label>Horário Inicial</Label>
                    <Input
                      type="time"
                      value={windowForm.startTime}
                      onChange={(e) =>
                        setWindowForm((prev) => ({ ...prev, startTime: e.target.value }))
                      }
                      required={
                        windowForm.windowType === 'daily' || windowForm.windowType === 'overnight'
                      }
                    />
                  </div>
                  <div>
                    <Label>Horário Final</Label>
                    <Input
                      type="time"
                      value={windowForm.endTime}
                      onChange={(e) =>
                        setWindowForm((prev) => ({ ...prev, endTime: e.target.value }))
                      }
                      required={
                        windowForm.windowType === 'daily' || windowForm.windowType === 'overnight'
                      }
                    />
                  </div>
                </div>

                {(windowForm.windowType === 'weekly' || windowForm.windowType === 'biweekly') && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <Label>Dia Inicial</Label>
                      <Select
                        value={String(windowForm.startDay)}
                        onValueChange={(value) =>
                          setWindowForm((prev) => ({ ...prev, startDay: Number(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekDayOptions.map((option) => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Dia Final</Label>
                      <Select
                        value={String(windowForm.endDay)}
                        onValueChange={(value) =>
                          setWindowForm((prev) => ({ ...prev, endDay: Number(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekDayOptions.map((option) => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {(windowForm.windowType === 'weekly' || windowForm.windowType === 'biweekly') && (
                  <div>
                    <Label>Limite (minutos)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Ex: 1440"
                      value={windowForm.durationLimitMinutes}
                      onChange={(e) =>
                        setWindowForm((prev) => ({ ...prev, durationLimitMinutes: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Tempo máximo coberto pela tarifa. Ultrapassando, será cobrada hora extra.
                    </p>
                  </div>
                )}

                <div>
                  <Label>Tarifa para hora extra (opcional)</Label>
                  <Select
                    value={windowForm.extraRateId || DEFAULT_EXTRA_RATE_OPTION}
                    onValueChange={(value) =>
                      setWindowForm((prev) => ({
                        ...prev,
                        extraRateId: value === DEFAULT_EXTRA_RATE_OPTION ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma tarifa de hora/fração" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_EXTRA_RATE_OPTION}>
                        Padrão (hora/fração atual)
                      </SelectItem>
                      {hourlyRates.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.vehicleType} - {r.rateType} (R$ {r.value.toFixed(2)}/{r.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Metadata (JSON opcional)</Label>
                  <Textarea
                    className="font-mono text-xs"
                    rows={4}
                    placeholder='Ex: { "observacao": "Especial feriados" }'
                    value={windowForm.metadata}
                    onChange={(e) =>
                      setWindowForm((prev) => ({ ...prev, metadata: e.target.value }))
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {windowForm.id ? 'Atualizar Janela' : 'Adicionar Janela'}
                  </Button>
                  {windowForm.id && (
                    <Button type="button" variant="outline" onClick={resetWindowForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {(['daily', 'overnight', 'weekly', 'biweekly'] as WindowType[]).map((type) => {
              const rows = windows.filter((row) => toWindowType(row.window_type) === type);
              if (!rows.length) return null;

              return (
                <Card key={type}>
                  <CardHeader>
                    <CardTitle>{windowTypeLabels[type]}</CardTitle>
                    <CardDescription>
                      {type === 'daily' && 'Intervalos cobertos pela tarifa diária.'}
                      {type === 'overnight' &&
                        'Períodos de pernoite. Horas além do fim serão cobradas como extra.'}
                      {type === 'weekly' &&
                        'Controle de planos semanais com limite máximo de permanência.'}
                      {type === 'biweekly' &&
                        'Controle de planos quinzenais com limite máximo de permanência.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">{rows.map(renderWindowRow)}</CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sugestões Automáticas</CardTitle>
              <CardDescription>
                Configure o valor máximo para sugerir (ou aplicar automaticamente) outra tarifa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitThreshold} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label>Tarifa alvo</Label>
                    <Select
                      value={thresholdForm.targetRateId}
                      onValueChange={(value) =>
                        setThresholdForm((prev) => ({ ...prev, targetRateId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a tarifa de destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetRates.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.vehicleType} - {r.rateType} (R$ {r.value.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor limite (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={thresholdForm.thresholdAmount}
                      onChange={(e) =>
                        setThresholdForm((prev) => ({ ...prev, thresholdAmount: e.target.value }))
                      }
                      placeholder="Ex: 30.00"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label>Aplicar automaticamente?</Label>
                    <p className="text-xs text-muted-foreground">
                      Se ativado, a tarifa será trocada sem necessidade de confirmação.
                    </p>
                  </div>
                  <Switch
                    checked={thresholdForm.autoApply}
                    onCheckedChange={(checked) =>
                      setThresholdForm((prev) => ({ ...prev, autoApply: checked }))
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {thresholdForm.id ? 'Atualizar Sugestão' : 'Adicionar Sugestão'}
                  </Button>
                  {thresholdForm.id && (
                    <Button type="button" variant="outline" onClick={resetThresholdForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limites configurados</CardTitle>
              <CardDescription>
                Quando o valor atual de cobrança exceder o limite, uma sugestão de troca será
                exibida para o operador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {thresholds.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Nenhuma sugestão configurada ainda.
                </p>
              ) : (
                thresholds.map(renderThresholdRow)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração da Tarifa</CardTitle>
              <CardDescription>
                Ajuste parâmetros complementares da tarifa, como tolerância e valores padrão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Minutos de cortesia</Label>
                <Input
                  type="number"
                  min="0"
                  value={String(config.courtesyMinutes ?? rate.courtesyMinutes ?? 0)}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      courtesyMinutes: Number(e.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Tempo tolerado antes de cobrar a próxima fração em Hora/Fração.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Observações adicionais</Label>
                <Textarea
                  rows={4}
                  placeholder="Notas internas, instruções especiais, etc."
                  value={config.metadata?.notes || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      metadata: { ...(prev.metadata || {}), notes: e.target.value },
                    }))
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      const updated = await updateRate(rate.id, {
                        config,
                        courtesyMinutes: config.courtesyMinutes ?? rate.courtesyMinutes,
                      });
                      setConfig((updated?.config as RateConfig) || {});
                      toast({ title: 'Configuração da tarifa atualizada.' });
                      onUpdated?.();
                    } catch (error) {
                      toast({
                        title: 'Erro ao salvar configuração',
                        description: (error as Error).message,
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  Salvar configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <PricingRulesManager rateId={rate.id} onClose={onClose} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function parseMetadata(raw: string) {
  if (!raw || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Metadata inválido. Informe um JSON válido.');
  }
}
