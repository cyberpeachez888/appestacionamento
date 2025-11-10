import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Plus, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper to get auth token from storage (matches AuthContext)
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth:token') || sessionStorage.getItem('auth:token');
};

// Helper to get day name from day_of_week number (0=Sunday, 6=Saturday)
const getDayName = (dayOfWeek: number): string => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[dayOfWeek] || 'Desconhecido';
};

interface BusinessHour {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  surcharge_multiplier: number;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  is_recurring: boolean;
  is_closed: boolean;
  surcharge_multiplier: number | null;
}

interface SpecialEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_multiplier: number;
  description: string | null;
}

export default function HorariosFeriados() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('horarios');
  
  // Business Hours State
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [selectedHour, setSelectedHour] = useState<BusinessHour | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Holidays State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  
  // Special Events State
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[DEBUG] Component mounted');
    console.log('[DEBUG] API_BASE_URL:', API_BASE_URL);
    console.log('[DEBUG] import.meta.env.VITE_API_URL:', import.meta.env.VITE_API_URL);
  }, []);

  useEffect(() => {
    console.log('[DEBUG] businessHours state updated, count:', businessHours.length);
    if (businessHours.length > 0) {
      console.log('[DEBUG] First business hour:', businessHours[0]);
    }
  }, [businessHours]);

  useEffect(() => {
    fetchBusinessHours();
    fetchHolidays();
    fetchSpecialEvents();
  }, []);

  const fetchBusinessHours = async () => {
    try {
      const token = getAuthToken();
      console.log('[DEBUG] Fetching business hours from:', `${API_BASE_URL}/business-hours`);
      console.log('[DEBUG] Token exists:', !!token);
      console.log('[DEBUG] Token value (first 20 chars):', token?.substring(0, 20));
      
      if (!token) {
        console.error('[DEBUG] No authentication token found!');
        toast({ title: 'Erro', description: 'Você não está autenticado. Faça login novamente.', variant: 'destructive' });
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/business-hours`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('[DEBUG] Response status:', response.status);
      const data = await response.json();
      console.log('[DEBUG] Business hours data received:', data);
      
      if (data.success) {
        console.log('[DEBUG] Setting business hours, count:', data.data?.length);
        setBusinessHours(data.data);
      } else {
        console.error('[DEBUG] API returned success=false:', data.error);
        toast({ title: 'Erro', description: data.error || 'Falha ao carregar horários', variant: 'destructive' });
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching business hours:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar horários', variant: 'destructive' });
    }
  };

  const fetchHolidays = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/holidays`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setHolidays(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar feriados', variant: 'destructive' });
    }
  };

  const fetchSpecialEvents = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/special-events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSpecialEvents(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar eventos', variant: 'destructive' });
    }
  };

  const handleEditHour = (hour: BusinessHour) => {
    setSelectedHour(hour);
    setDialogOpen(true);
  };

  const handleSaveBusinessHour = async (hour: BusinessHour) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/business-hours/${hour.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hour)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Horário atualizado' });
        fetchBusinessHours();
        setDialogOpen(false);
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar horário', variant: 'destructive' });
    }
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setHolidayDialogOpen(true);
  };

  const handleAddHoliday = () => {
    setSelectedHoliday(null);
    setHolidayDialogOpen(true);
  };

  const handleSaveHoliday = async (holiday: Partial<Holiday>) => {
    try {
      const token = getAuthToken();
      const url = holiday.id ? `${API_BASE_URL}/holidays/${holiday.id}` : `${API_BASE_URL}/holidays`;
      const method = holiday.id ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(holiday)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Feriado salvo' });
        fetchHolidays();
        setHolidayDialogOpen(false);
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar feriado', variant: 'destructive' });
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Excluir feriado?')) return;
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/holidays/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Feriado excluído' });
        fetchHolidays();
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir', variant: 'destructive' });
    }
  };

  const handleEditEvent = (event: SpecialEvent) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const handleSaveEvent = async (event: Partial<SpecialEvent>) => {
    try {
      const token = getAuthToken();
      const url = event.id ? `${API_BASE_URL}/special-events/${event.id}` : `${API_BASE_URL}/special-events`;
      const method = event.id ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Evento salvo' });
        fetchSpecialEvents();
        setEventDialogOpen(false);
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar evento', variant: 'destructive' });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Excluir evento?')) return;
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/special-events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Evento excluído' });
        fetchSpecialEvents();
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Horários e Feriados</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="horarios"><Clock className="w-4 h-4 mr-2" />Horários</TabsTrigger>
          <TabsTrigger value="feriados"><Calendar className="w-4 h-4 mr-2" />Feriados</TabsTrigger>
          <TabsTrigger value="eventos"><Calendar className="w-4 h-4 mr-2" />Eventos</TabsTrigger>
        </TabsList>
        <TabsContent value="horarios">
          <Card>
            <CardHeader><CardTitle>Horários de Funcionamento</CardTitle></CardHeader>
            <CardContent>
              {businessHours.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum horário configurado. Verifique o console para detalhes.
                </div>
              ) : (
                businessHours.map(hour => {
                  console.log('[DEBUG] Rendering hour:', hour);
                  const dayName = getDayName(hour.day_of_week);
                  return (
                    <div key={hour.id} className="flex justify-between p-4 border rounded mb-2">
                      <div>
                        <strong>{dayName}</strong>: {hour.is_open ? `${hour.open_time} - ${hour.close_time}` : 'Fechado'}
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleEditHour(hour)}><Pencil className="w-4 h-4" /></Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="feriados">
          <Button onClick={handleAddHoliday} className="mb-4"><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map(h => (
                    <TableRow key={h.id}>
                      <TableCell>{h.name}</TableCell>
                      <TableCell>{new Date(h.date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => handleEditHoliday(h)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteHoliday(h.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="eventos">
          <Button onClick={handleAddEvent} className="mb-4"><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Multiplicador</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialEvents.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>{e.name}</TableCell>
                      <TableCell>{new Date(e.start_date).toLocaleDateString('pt-BR')} - {new Date(e.end_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{e.price_multiplier}x</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => handleEditEvent(e)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteEvent(e.id)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar - {selectedHour ? getDayName(selectedHour.day_of_week) : ''}</DialogTitle></DialogHeader>
          {selectedHour && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch checked={selectedHour.is_open} onCheckedChange={(c) => setSelectedHour({...selectedHour, is_open: c})} />
                <Label>Aberto</Label>
              </div>
              {selectedHour.is_open && (<>
                <div className="space-y-2">
                  <Label>Abertura</Label>
                  <Input type="time" value={selectedHour.open_time || ''} onChange={(e) => setSelectedHour({...selectedHour, open_time: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Fechamento</Label>
                  <Input type="time" value={selectedHour.close_time || ''} onChange={(e) => setSelectedHour({...selectedHour, close_time: e.target.value})} />
                </div>
              </>)}
              <Button onClick={() => handleSaveBusinessHour(selectedHour)}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedHoliday?.id ? 'Editar' : 'Adicionar'} Feriado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={selectedHoliday?.name || ''} onChange={(e) => setSelectedHoliday({...selectedHoliday, name: e.target.value} as Holiday)} />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={selectedHoliday?.date || ''} onChange={(e) => setSelectedHoliday({...selectedHoliday, date: e.target.value} as Holiday)} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={selectedHoliday?.is_recurring || false} onCheckedChange={(c) => setSelectedHoliday({...selectedHoliday, is_recurring: c} as Holiday)} />
              <Label>Recorrente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={selectedHoliday?.is_closed || false} onCheckedChange={(c) => setSelectedHoliday({...selectedHoliday, is_closed: c} as Holiday)} />
              <Label>Fechado</Label>
            </div>
            <Button onClick={() => handleSaveHoliday(selectedHoliday || {})}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedEvent?.id ? 'Editar' : 'Adicionar'} Evento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={selectedEvent?.name || ''} onChange={(e) => setSelectedEvent({...selectedEvent, name: e.target.value} as SpecialEvent)} />
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={selectedEvent?.start_date || ''} onChange={(e) => setSelectedEvent({...selectedEvent, start_date: e.target.value} as SpecialEvent)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={selectedEvent?.end_date || ''} onChange={(e) => setSelectedEvent({...selectedEvent, end_date: e.target.value} as SpecialEvent)} />
            </div>
            <div className="space-y-2">
              <Label>Multiplicador</Label>
              <Input type="number" step="0.1" value={selectedEvent?.price_multiplier || 1} onChange={(e) => setSelectedEvent({...selectedEvent, price_multiplier: parseFloat(e.target.value)} as SpecialEvent)} />
            </div>
            <Button onClick={() => handleSaveEvent(selectedEvent || {})}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
