import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Clock, Calendar, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BusinessHours {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  allowAfterHours: boolean;
  afterHoursSurchargeType: 'percentage' | 'fixed';
  afterHoursSurchargeValue: number;
  hasBreak: boolean;
  breakStartTime?: string;
  breakEndTime?: string;
  notes?: string;
}

interface Holiday {
  id: string;
  holidayName: string;
  holidayDate: string;
  isRecurring: boolean;
  recurringMonth?: number;
  recurringDay?: number;
  isClosed: boolean;
  specialHours: boolean;
  specialOpenTime?: string;
  specialCloseTime?: string;
  hasSpecialPricing: boolean;
  specialPricingType: 'percentage' | 'fixed' | 'multiplier';
  specialPricingValue: number;
  description?: string;
}

interface SpecialEvent {
  id: string;
  eventName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isClosed: boolean;
  hasSpecialPricing: boolean;
  specialPricingType: 'percentage' | 'fixed' | 'multiplier';
  specialPricingValue: number;
  description?: string;
  requiresReservation: boolean;
  maxCapacity?: number;
  isActive: boolean;
}

interface OperationalStatus {
  status: string;
  isOpen: boolean;
  reason: string;
  surchargeType?: string;
  surchargeValue?: number;
  specialPricing?: boolean;
  pricingType?: string;
  pricingValue?: number;
}

const DAYS_OF_WEEK = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];

export default function HorarioFuncionamento() {
  const { toast } = useToast();
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [operationalStatus, setOperationalStatus] = useState<OperationalStatus | null>(null);
  
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [editingEvent, setEditingEvent] = useState<SpecialEvent | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await Promise.all([
      fetchBusinessHours(),
      fetchHolidays(),
      fetchEvents(),
      fetchOperationalStatus()
    ]);
  };

  const fetchBusinessHours = async () => {
    try {
      const data = await api.getBusinessHours();
      setBusinessHours(data);
    } catch (err) {
      console.error('Error fetching business hours:', err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const data = await api.getHolidays(true);
      setHolidays(data);
    } catch (err) {
      console.error('Error fetching holidays:', err);
    }
  };

  const fetchEvents = async () => {
    try {
      const data = await api.getSpecialEvents(true);
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchOperationalStatus = async () => {
    try {
      const data = await api.getOperationalStatus();
      setOperationalStatus(data);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  const handleUpdateHours = async (dayOfWeek: number, updates: Partial<BusinessHours>) => {
    try {
      const current = businessHours.find(h => h.dayOfWeek === dayOfWeek);
      if (!current) return;

      await api.updateBusinessHours(dayOfWeek, { ...current, ...updates });
      
      toast({ title: 'Horário atualizado com sucesso' });
      fetchBusinessHours();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível atualizar o horário',
        variant: 'destructive'
      });
    }
  };

  const handleSaveHoliday = async (holiday: Partial<Holiday>) => {
    try {
      if (editingHoliday) {
        await api.updateHoliday(editingHoliday.id, holiday);
      } else {
        await api.createHoliday(holiday);
      }
      
      toast({
        title: editingHoliday ? 'Feriado atualizado' : 'Feriado criado'
      });
      setHolidayDialogOpen(false);
      setEditingHoliday(null);
      fetchHolidays();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível salvar o feriado',
        variant: 'destructive'
      });
    }
  };

  const handleSaveEvent = async (event: Partial<SpecialEvent>) => {
    try {
      if (editingEvent) {
        await api.updateSpecialEvent(editingEvent.id, event);
      } else {
        await api.createSpecialEvent(event);
      }
      
      toast({
        title: editingEvent ? 'Evento atualizado' : 'Evento criado'
      });
      setEventDialogOpen(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível salvar o evento',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      if (deletingItem.type === 'holiday') {
        await api.deleteHoliday(deletingItem.id);
      } else {
        await api.deleteSpecialEvent(deletingItem.id);
      }
      
      toast({ title: 'Item excluído com sucesso' });
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      
      if (deletingItem.type === 'holiday') {
        fetchHolidays();
      } else {
        fetchEvents();
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível excluir',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-success/10 text-success border-success';
      case 'after_hours': return 'bg-warning/10 text-warning border-warning';
      case 'closed': return 'bg-destructive/10 text-destructive border-destructive';
      case 'holiday': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'special_event': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Aberto',
      after_hours: 'Fora do Horário',
      closed: 'Fechado',
      holiday: 'Feriado',
      special_event: 'Evento Especial'
    };
    return labels[status] || status;
  };

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Horário de Funcionamento</h1>
          <p className="text-muted-foreground">
            Configure horários, feriados e eventos especiais
          </p>
        </div>

        {/* Current Operational Status */}
        {operationalStatus && (
          <div className={`p-4 rounded-lg border-2 mb-6 ${getStatusColor(operationalStatus.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold text-lg">
                    Status: {getStatusLabel(operationalStatus.status)}
                  </h3>
                  <p className="text-sm">{operationalStatus.reason}</p>
                </div>
              </div>
              {operationalStatus.surchargeValue && operationalStatus.surchargeValue > 0 && (
                <div className="text-right">
                  <p className="text-sm font-medium">Taxa Extra:</p>
                  <p className="text-lg font-bold">
                    {operationalStatus.surchargeType === 'percentage'
                      ? `+${operationalStatus.surchargeValue}%`
                      : `R$ ${operationalStatus.surchargeValue.toFixed(2)}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <Tabs defaultValue="hours">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="hours">
              <Clock className="h-4 w-4 mr-2" />
              Horários
            </TabsTrigger>
            <TabsTrigger value="holidays">
              <Calendar className="h-4 w-4 mr-2" />
              Feriados
            </TabsTrigger>
            <TabsTrigger value="events">
              <Sparkles className="h-4 w-4 mr-2" />
              Eventos Especiais
            </TabsTrigger>
          </TabsList>

          {/* Business Hours Tab */}
          <TabsContent value="hours" className="space-y-4">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Horário Semanal</h3>
              <div className="space-y-4">
                {businessHours.map((hours) => (
                  <BusinessHoursRow
                    key={hours.id}
                    hours={hours}
                    dayName={DAYS_OF_WEEK[hours.dayOfWeek]}
                    onUpdate={(updates) => handleUpdateHours(hours.dayOfWeek, updates)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Holidays Tab */}
          <TabsContent value="holidays" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingHoliday(null); setHolidayDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Feriado
              </Button>
            </div>

            <div className="grid gap-4">
              {holidays.map((holiday) => (
                <HolidayCard
                  key={holiday.id}
                  holiday={holiday}
                  onEdit={() => { setEditingHoliday(holiday); setHolidayDialogOpen(true); }}
                  onDelete={() => { setDeletingItem({ type: 'holiday', id: holiday.id }); setDeleteDialogOpen(true); }}
                />
              ))}
            </div>

            {holidays.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum feriado cadastrado
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { setEditingEvent(null); setEventDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </div>

            <div className="grid gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={() => { setEditingEvent(event); setEventDialogOpen(true); }}
                  onDelete={() => { setDeletingItem({ type: 'event', id: event.id }); setDeleteDialogOpen(true); }}
                />
              ))}
            </div>

            {events.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum evento especial cadastrado
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Holiday Dialog */}
        <HolidayDialog
          open={holidayDialogOpen}
          onOpenChange={setHolidayDialogOpen}
          holiday={editingHoliday}
          onSave={handleSaveHoliday}
        />

        {/* Event Dialog */}
        <EventDialog
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
          event={editingEvent}
          onSave={handleSaveEvent}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// Component for each day's business hours
function BusinessHoursRow({ hours, dayName, onUpdate }: {
  hours: BusinessHours;
  dayName: string;
  onUpdate: (updates: Partial<BusinessHours>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Switch
            checked={hours.isOpen}
            onCheckedChange={(checked) => onUpdate({ isOpen: checked })}
          />
          <span className="font-medium w-24">{dayName}</span>
          
          {hours.isOpen ? (
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={hours.openTime}
                onChange={(e) => onUpdate({ openTime: e.target.value })}
                className="w-32"
              />
              <span>até</span>
              <Input
                type="time"
                value={hours.closeTime}
                onChange={(e) => onUpdate({ closeTime: e.target.value })}
                className="w-32"
              />
            </div>
          ) : (
            <span className="text-muted-foreground">Fechado</span>
          )}
        </div>

        {hours.isOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Menos' : 'Mais'} Opções
          </Button>
        )}
      </div>

      {expanded && hours.isOpen && (
        <div className="mt-4 pt-4 border-t space-y-4">
          {/* After Hours */}
          <div className="flex items-center justify-between">
            <Label>Permitir fora do horário</Label>
            <Switch
              checked={hours.allowAfterHours}
              onCheckedChange={(checked) => onUpdate({ allowAfterHours: checked })}
            />
          </div>

          {hours.allowAfterHours && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <Label>Tipo de Taxa</Label>
                <Select
                  value={hours.afterHoursSurchargeType}
                  onValueChange={(v: any) => onUpdate({ afterHoursSurchargeType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem</SelectItem>
                    <SelectItem value="fixed">Valor Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor da Taxa</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={hours.afterHoursSurchargeValue}
                  onChange={(e) => onUpdate({ afterHoursSurchargeValue: parseFloat(e.target.value) })}
                  placeholder={hours.afterHoursSurchargeType === 'percentage' ? '%' : 'R$'}
                />
              </div>
            </div>
          )}

          {/* Break Time */}
          <div className="flex items-center justify-between">
            <Label>Intervalo de almoço</Label>
            <Switch
              checked={hours.hasBreak}
              onCheckedChange={(checked) => onUpdate({ hasBreak: checked })}
            />
          </div>

          {hours.hasBreak && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <Label>Início do Intervalo</Label>
                <Input
                  type="time"
                  value={hours.breakStartTime || ''}
                  onChange={(e) => onUpdate({ breakStartTime: e.target.value })}
                />
              </div>
              <div>
                <Label>Fim do Intervalo</Label>
                <Input
                  type="time"
                  value={hours.breakEndTime || ''}
                  onChange={(e) => onUpdate({ breakEndTime: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Holiday Card Component
function HolidayCard({ holiday, onEdit, onDelete }: {
  holiday: Holiday;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold">{holiday.holidayName}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(holiday.holidayDate), 'dd/MM/yyyy', { locale: ptBR })}
            {holiday.isRecurring && ' (Recorrente)'}
          </p>
          {holiday.description && (
            <p className="text-sm mt-2">{holiday.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded ${
              holiday.isClosed ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
            }`}>
              {holiday.isClosed ? 'Fechado' : 'Aberto'}
            </span>
            {holiday.hasSpecialPricing && (
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                Preço Especial
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
          <Button variant="outline" size="sm" onClick={onDelete}>Excluir</Button>
        </div>
      </div>
    </div>
  );
}

// Event Card Component
function EventCard({ event, onEdit, onDelete }: {
  event: SpecialEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold">{event.eventName}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(event.startDate), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
            {format(new Date(event.endDate), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
          {event.description && (
            <p className="text-sm mt-2">{event.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <span className={`text-xs px-2 py-1 rounded ${
              event.isClosed ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
            }`}>
              {event.isClosed ? 'Fechado' : 'Aberto'}
            </span>
            {event.hasSpecialPricing && (
              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                Preço Especial: {event.specialPricingValue}x
              </span>
            )}
            {!event.isActive && (
              <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                Inativo
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
          <Button variant="outline" size="sm" onClick={onDelete}>Excluir</Button>
        </div>
      </div>
    </div>
  );
}

// Holiday Dialog Component
function HolidayDialog({ open, onOpenChange, holiday, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday: Holiday | null;
  onSave: (holiday: Partial<Holiday>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Holiday>>({
    holidayName: '',
    holidayDate: '',
    isRecurring: false,
    isClosed: true,
    specialHours: false,
    hasSpecialPricing: false,
    specialPricingType: 'percentage',
    specialPricingValue: 0,
  });

  useEffect(() => {
    if (holiday) {
      setFormData(holiday);
    } else {
      setFormData({
        holidayName: '',
        holidayDate: '',
        isRecurring: false,
        isClosed: true,
        specialHours: false,
        hasSpecialPricing: false,
        specialPricingType: 'percentage',
        specialPricingValue: 0,
      });
    }
  }, [holiday, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{holiday ? 'Editar Feriado' : 'Novo Feriado'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do Feriado *</Label>
            <Input
              value={formData.holidayName}
              onChange={(e) => setFormData({ ...formData, holidayName: e.target.value })}
              placeholder="Natal"
            />
          </div>

          <div>
            <Label>Data *</Label>
            <Input
              type="date"
              value={formData.holidayDate}
              onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Recorrente (todo ano)</Label>
            <Switch
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Estacionamento fechado</Label>
            <Switch
              checked={formData.isClosed}
              onCheckedChange={(checked) => setFormData({ ...formData, isClosed: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Preço especial</Label>
            <Switch
              checked={formData.hasSpecialPricing}
              onCheckedChange={(checked) => setFormData({ ...formData, hasSpecialPricing: checked })}
            />
          </div>

          {formData.hasSpecialPricing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.specialPricingType}
                  onValueChange={(v: any) => setFormData({ ...formData, specialPricingType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem</SelectItem>
                    <SelectItem value="fixed">Valor Fixo</SelectItem>
                    <SelectItem value="multiplier">Multiplicador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.specialPricingValue}
                  onChange={(e) => setFormData({ ...formData, specialPricingValue: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => onSave(formData)}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Event Dialog Component
function EventDialog({ open, onOpenChange, event, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SpecialEvent | null;
  onSave: (event: Partial<SpecialEvent>) => void;
}) {
  const [formData, setFormData] = useState<Partial<SpecialEvent>>({
    eventName: '',
    startDate: '',
    endDate: '',
    isClosed: false,
    hasSpecialPricing: true,
    specialPricingType: 'multiplier',
    specialPricingValue: 1.5,
    isActive: true,
    requiresReservation: false,
  });

  useEffect(() => {
    if (event) {
      setFormData(event);
    } else {
      setFormData({
        eventName: '',
        startDate: '',
        endDate: '',
        isClosed: false,
        hasSpecialPricing: true,
        specialPricingType: 'multiplier',
        specialPricingValue: 1.5,
        isActive: true,
        requiresReservation: false,
      });
    }
  }, [event, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do Evento *</Label>
            <Input
              value={formData.eventName}
              onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
              placeholder="Show no estádio"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início *</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Fim *</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Estacionamento fechado</Label>
            <Switch
              checked={formData.isClosed}
              onCheckedChange={(checked) => setFormData({ ...formData, isClosed: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Preço especial</Label>
            <Switch
              checked={formData.hasSpecialPricing}
              onCheckedChange={(checked) => setFormData({ ...formData, hasSpecialPricing: checked })}
            />
          </div>

          {formData.hasSpecialPricing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={formData.specialPricingType}
                  onValueChange={(v: any) => setFormData({ ...formData, specialPricingType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem</SelectItem>
                    <SelectItem value="fixed">Valor Fixo</SelectItem>
                    <SelectItem value="multiplier">Multiplicador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.specialPricingValue}
                  onChange={(e) => setFormData({ ...formData, specialPricingValue: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          )}

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Evento ativo</Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => onSave(formData)}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
