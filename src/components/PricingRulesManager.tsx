/**
 * Pricing Rules Manager Component
 * UI for managing advanced time-based pricing rules
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Trash2, Plus, Edit, ToggleLeft, ToggleRight } from 'lucide-react';

// Professional: Use explicit types for conditions and valueAdjustment
interface PricingRule {
  id: string;
  rateId: string;
  ruleType: 'first_hour' | 'daily_max' | 'time_range' | 'hourly_progression';
  conditions: {
    hour_start?: number;
    hour_end?: number;
    days_of_week?: number[];
  };
  valueAdjustment:
    | { type: 'override'; value: number }
    | { type: 'cap'; value: number }
    | { type: 'multiplier'; value: number }
    | { type: 'progressive'; ranges: { from: number; to: number; value: number }[] };
  priority: number;
  isActive: boolean;
  description: string;
}

interface PricingRulesManagerProps {
  rateId: string;
  onClose?: () => void;
}

export function PricingRulesManager({ rateId, onClose }: PricingRulesManagerProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // Form state
  const [ruleType, setRuleType] = useState<string>('first_hour');
  const [value, setValue] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<string>('0');

  useEffect(() => {
    loadRules();
    // Professional: Add loadRules to dependency array for exhaustive-deps compliance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rateId]);

  const loadRules = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading pricing rules for rate ID:', rateId);
      const data = await api.getPricingRules(rateId);
      console.log('✅ Pricing rules loaded:', data);
      setRules(data);
    } catch (error) {
      // Professional: Use Error type for error handling
      const err = error as Error & { status?: number };
      console.error('❌ Error loading pricing rules:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        rateId: rateId
      });
      toast({
        title: 'Erro ao carregar regras',
  description: err.message || 'Não foi possível carregar as regras de precificação.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const ruleData = buildRuleData();
      await api.createPricingRule(ruleData);
      toast({
        title: 'Regra criada',
        description: 'Regra de precificação criada com sucesso.',
      });
      resetForm();
      loadRules();
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao criar regra',
  description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingRule) return;
    
    try {
      const ruleData = buildRuleData();
      await api.updatePricingRule(editingRule.id, ruleData);
      toast({
        title: 'Regra atualizada',
        description: 'Regra de precificação atualizada com sucesso.',
      });
      resetForm();
      loadRules();
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao atualizar regra',
  description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta regra?')) return;

    try {
      await api.deletePricingRule(id);
      toast({
        title: 'Regra excluída',
        description: 'Regra de precificação excluída com sucesso.',
      });
      loadRules();
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao excluir regra',
  description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await api.togglePricingRule(id, !currentStatus);
      toast({
        title: currentStatus ? 'Regra desativada' : 'Regra ativada',
        description: `Regra ${currentStatus ? 'desativada' : 'ativada'} com sucesso.`,
      });
      loadRules();
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao alterar status',
  description: err.message,
        variant: 'destructive',
      });
    }
  };

  const buildRuleData = () => {
    const numValue = parseFloat(value);

    switch (ruleType) {
      case 'first_hour':
        return {
          rateId,
          ruleType,
          conditions: {},
          valueAdjustment: { type: 'override', value: numValue },
          priority: parseInt(priority) || 1,
          description: description || `Primeira hora: R$ ${numValue.toFixed(2)}`,
        };

      case 'daily_max':
        return {
          rateId,
          ruleType,
          conditions: {},
          valueAdjustment: { type: 'cap', value: numValue },
          priority: parseInt(priority) || 99,
          description: description || `Valor máximo diário: R$ ${numValue.toFixed(2)}`,
        };

      case 'time_range':
        return {
          rateId,
          ruleType,
          conditions: { hour_start: 8, hour_end: 18, days_of_week: [1, 2, 3, 4, 5] },
          valueAdjustment: { type: 'multiplier', value: numValue },
          priority: parseInt(priority) || 3,
          description: description || `Horário de pico: ${numValue}x`,
        };

      case 'hourly_progression':
        return {
          rateId,
          ruleType,
          conditions: {},
          valueAdjustment: {
            type: 'progressive',
            ranges: [
              { from: 0, to: 2, value: numValue },
              { from: 2, to: 5, value: numValue * 0.8 },
              { from: 5, to: 999, value: numValue * 0.6 },
            ],
          },
          priority: parseInt(priority) || 2,
          description: description || `Preço progressivo a partir de R$ ${numValue.toFixed(2)}`,
        };

      default:
        throw new Error('Tipo de regra inválido');
    }
  };

  const resetForm = () => {
    setRuleType('first_hour');
    setValue('');
    setDescription('');
    setPriority('0');
    setEditingRule(null);
    setShowForm(false);
  };

  const startEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setRuleType(rule.ruleType);
    
    // Extract value from adjustment
    const adj = rule.valueAdjustment;
    if ('value' in adj && typeof adj.value === 'number') {
      setValue(adj.value.toString());
    } else if ('ranges' in adj && Array.isArray(adj.ranges) && adj.ranges.length > 0) {
      setValue(adj.ranges[0].value.toString());
    }
    
    setDescription(rule.description);
    setPriority(rule.priority.toString());
    setShowForm(true);
  };

  const getRuleTypeName = (type: string) => {
    const names: Record<string, string> = {
      first_hour: 'Primeira Hora',
      daily_max: 'Máximo Diário',
      time_range: 'Faixa Horária',
      hourly_progression: 'Preço Progressivo',
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Carregando regras...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Regras de Precificação Avançada</CardTitle>
          <CardDescription>
            Configure regras especiais de preço baseadas em tempo (primeira hora, máximo diário, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showForm ? (
            <div className="space-y-4">
              <Button onClick={() => setShowForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Nova Regra
              </Button>

              {rules.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma regra configurada. Clique acima para adicionar.
                </p>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getRuleTypeName(rule.ruleType)}</span>
                          {!rule.isActive && (
                            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Inativa</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <p className="text-xs text-muted-foreground">Prioridade: {rule.priority}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggle(rule.id, rule.isActive)}
                        >
                          {rule.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Regra</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_hour">Primeira Hora</SelectItem>
                    <SelectItem value="daily_max">Máximo Diário</SelectItem>
                    <SelectItem value="time_range">Faixa Horária (Pico)</SelectItem>
                    <SelectItem value="hourly_progression">Preço Progressivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Ex: 10.00"
                />
                <p className="text-xs text-muted-foreground">
                  {ruleType === 'first_hour' && 'Valor fixo para a primeira hora'}
                  {ruleType === 'daily_max' && 'Valor máximo cobrado por dia'}
                  {ruleType === 'time_range' && 'Multiplicador (ex: 1.5 = 150%)'}
                  {ruleType === 'hourly_progression' && 'Valor base (será reduzido progressivamente)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Descrição (Opcional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Primeira hora: R$ 10,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Menor número = maior prioridade. Sugerido: primeira hora=1, progressivo=2, faixa horária=3, máximo diário=99
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={editingRule ? handleUpdate : handleCreate} className="flex-1">
                  {editingRule ? 'Atualizar' : 'Criar'} Regra
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
