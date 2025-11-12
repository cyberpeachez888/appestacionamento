import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, User, Activity, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditEvent {
  id: string;
  actor_id: string;
  actor_login: string;
  actor_name: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  created_at: string;
}

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuditLogDialog: React.FC<AuditLogDialogProps> = ({ open, onOpenChange }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    actorId: '',
  });
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Professional: Define params type for API
  type AuditEventParams = {
    start?: string;
    end?: string;
    action?: string;
    actorId?: string;
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params: AuditEventParams = {};
      if (filters.startDate) params.start = new Date(filters.startDate).toISOString();
      if (filters.endDate) params.end = new Date(filters.endDate).toISOString();
      if (filters.action) params.action = filters.action;
      if (filters.actorId) params.actorId = filters.actorId;

      const data = await api.getAuditEvents(params);
      setEvents(data || []);
    } catch (err: unknown) {
      // Professional: Type guard for error
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao carregar eventos', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadEvents();
    }
    // Professional: Add loadEvents to dependency array for exhaustive-deps compliance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loadEvents]);

  const toggleExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      'user.create': 'Criação de usuário',
      'user.update': 'Atualização de usuário',
      'user.delete': 'Exclusão de usuário',
      'user.password.update': 'Atualização de senha',
      'user.bulkUpdate': 'Atualização em massa',
      'cash.open': 'Abertura de caixa',
      'cash.close': 'Fechamento de caixa',
      'ticket.create': 'Criação de ticket',
      'ticket.finalize': 'Finalização de ticket',
      'payment.create': 'Criação de pagamento',
      'customer.create': 'Criação de mensalista',
      'customer.update': 'Atualização de mensalista',
      'customer.delete': 'Exclusão de mensalista',
      'rate.create': 'Criação de tarifa',
      'rate.update': 'Atualização de tarifa',
      'rate.delete': 'Exclusão de tarifa',
      'config.update': 'Atualização de configuração',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): string => {
    if (action.includes('create')) return 'text-green-600';
    if (action.includes('update')) return 'text-blue-600';
    if (action.includes('delete')) return 'text-red-600';
    if (action.includes('close') || action.includes('finalize')) return 'text-purple-600';
    if (action.includes('open')) return 'text-emerald-600';
    return 'text-gray-600';
  };

  const uniqueActions = Array.from(new Set(events.map(e => e.action)));
  const uniqueActors = Array.from(new Set(events.map(e => ({ id: e.actor_id, name: e.actor_name }))));

  // Professional: Refine return type for parseDetails
  const parseDetails = (detailsStr: string | null): object | string | null => {
    if (!detailsStr) return null;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return detailsStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Log de Auditoria
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="bg-muted/30 rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Início</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Data Fim</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ação</label>
              <Select value={filters.action} onValueChange={(v) => setFilters({ ...filters, action: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{getActionLabel(action)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Usuário</label>
              <Select value={filters.actorId} onValueChange={(v) => setFilters({ ...filters, actorId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {uniqueActors.map(actor => (
                    <SelectItem key={actor.id} value={actor.id}>{actor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {events.length} evento{events.length !== 1 ? 's' : ''} encontrado{events.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ startDate: '', endDate: '', action: '', actorId: '' })}
              >
                Limpar filtros
              </Button>
              <Button size="sm" onClick={loadEvents} disabled={loading}>
                {loading ? 'Carregando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando eventos...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum evento encontrado</div>
          ) : (
            <div className="divide-y">
              {events.map((event) => {
                const isExpanded = expandedEvents.has(event.id);
                const details = parseDetails(event.details);
                const hasDetails = details !== null;

                return (
                  <div key={event.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Expand/Collapse Button */}
                      {hasDetails ? (
                        <button
                          onClick={() => toggleExpanded(event.id)}
                          className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      ) : (
                        <div className="w-4" />
                      )}

                      {/* Event Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium ${getActionColor(event.action)}`}>
                                {getActionLabel(event.action)}
                              </span>
                              {event.target_type && (
                                <span className="text-xs text-muted-foreground">
                                  ({event.target_type})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {event.actor_name} ({event.actor_login})
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && hasDetails && (
                          <div className="mt-3 p-3 bg-muted/50 rounded border text-xs">
                            <div className="font-medium mb-2">Detalhes:</div>
                            <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                              {typeof details === 'object' 
                                ? JSON.stringify(details, null, 2) 
                                : String(details)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuditLogDialog;
