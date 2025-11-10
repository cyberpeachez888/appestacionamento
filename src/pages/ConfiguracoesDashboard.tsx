import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Plus, Settings as SettingsIcon, LayoutDashboard, Bell, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth:token') || sessionStorage.getItem('auth:token');
};

interface DashboardSettings {
  id: string;
  refresh_interval: number;
  default_date_range: string;
  theme: string;
  chart_style: string;
  show_trends: boolean;
  show_comparisons: boolean;
  data_retention_months: number;
  archive_old_data: boolean;
}

interface Widget {
  id: string;
  widget_type: string;
  title: string;
  position: number;
  size: string;
  is_visible: boolean;
  settings: any;
}

interface KPIThreshold {
  id: string;
  kpi_type: string;
  kpi_name: string;
  threshold_type: string;
  min_value: number | null;
  max_value: number | null;
  target_value: number | null;
  alert_enabled: boolean;
  alert_method: string;
  is_active: boolean;
}

interface ReportSchedule {
  id: string;
  report_name: string;
  report_type: string;
  frequency: string;
  schedule_time: string;
  day_of_week: number | null;
  day_of_month: number | null;
  delivery_method: string;
  is_active: boolean;
}

export default function ConfiguracoesDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('settings');
  
  // Dashboard Settings
  const [settings, setSettings] = useState<DashboardSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // Widgets
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  
  // KPI Thresholds
  const [thresholds, setThresholds] = useState<KPIThreshold[]>([]);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [selectedThreshold, setSelectedThreshold] = useState<KPIThreshold | null>(null);
  
  // Report Schedules
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ReportSchedule | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchWidgets();
    fetchThresholds();
    fetchSchedules();
  }, []);

  // ============ Dashboard Settings Functions ============
  
  const fetchSettings = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/dashboard-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({ title: 'Erro', description: 'Falha ao carregar configurações', variant: 'destructive' });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/dashboard-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Configurações salvas' });
        setSettings(data.data);
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar configurações', variant: 'destructive' });
    }
  };

  // ============ Widget Functions ============
  
  const fetchWidgets = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/dashboard-widgets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setWidgets(data.data);
      }
    } catch (error) {
      console.error('Error fetching widgets:', error);
    }
  };

  const handleAddWidget = () => {
    setSelectedWidget(null);
    setWidgetDialogOpen(true);
  };

  const handleEditWidget = (widget: Widget) => {
    setSelectedWidget(widget);
    setWidgetDialogOpen(true);
  };

  const handleSaveWidget = async (widget: Partial<Widget>) => {
    try {
      const token = getAuthToken();
      const url = widget.id 
        ? `${API_BASE_URL}/dashboard-widgets/${widget.id}`
        : `${API_BASE_URL}/dashboard-widgets`;
      const method = widget.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(widget)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Widget salvo' });
        fetchWidgets();
        setWidgetDialogOpen(false);
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar widget', variant: 'destructive' });
    }
  };

  const handleDeleteWidget = async (id: string) => {
    if (!confirm('Excluir widget?')) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/dashboard-widgets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Widget excluído' });
        fetchWidgets();
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir widget', variant: 'destructive' });
    }
  };

  // ============ KPI Threshold Functions ============
  
  const fetchThresholds = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/kpi-thresholds`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setThresholds(data.data);
      }
    } catch (error) {
      console.error('Error fetching thresholds:', error);
    }
  };

  const handleAddThreshold = () => {
    setSelectedThreshold(null);
    setThresholdDialogOpen(true);
  };

  const handleEditThreshold = (threshold: KPIThreshold) => {
    setSelectedThreshold(threshold);
    setThresholdDialogOpen(true);
  };

  const handleSaveThreshold = async (threshold: Partial<KPIThreshold>) => {
    try {
      const token = getAuthToken();
      const url = threshold.id 
        ? `${API_BASE_URL}/kpi-thresholds/${threshold.id}`
        : `${API_BASE_URL}/kpi-thresholds`;
      const method = threshold.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(threshold)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Alerta configurado' });
        fetchThresholds();
        setThresholdDialogOpen(false);
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao configurar alerta', variant: 'destructive' });
    }
  };

  const handleDeleteThreshold = async (id: string) => {
    if (!confirm('Excluir alerta?')) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/kpi-thresholds/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Alerta excluído' });
        fetchThresholds();
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir alerta', variant: 'destructive' });
    }
  };

  // ============ Report Schedule Functions ============
  
  const fetchSchedules = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/report-schedules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSchedules(data.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleAddSchedule = () => {
    setSelectedSchedule(null);
    setScheduleDialogOpen(true);
  };

  const handleEditSchedule = (schedule: ReportSchedule) => {
    setSelectedSchedule(schedule);
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async (schedule: Partial<ReportSchedule>) => {
    try {
      const token = getAuthToken();
      const url = schedule.id 
        ? `${API_BASE_URL}/report-schedules/${schedule.id}`
        : `${API_BASE_URL}/report-schedules`;
      const method = schedule.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(schedule)
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Agendamento salvo' });
        fetchSchedules();
        setScheduleDialogOpen(false);
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao salvar agendamento', variant: 'destructive' });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Excluir agendamento?')) return;
    
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/report-schedules/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Agendamento excluído' });
        fetchSchedules();
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao excluir agendamento', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações do Dashboard</h1>
        <p className="text-muted-foreground">
          Personalize sua experiência de análise e relatórios
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Preferências
          </TabsTrigger>
          <TabsTrigger value="widgets">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Widgets
          </TabsTrigger>
          <TabsTrigger value="thresholds">
            <Bell className="w-4 h-4 mr-2" />
            Alertas KPI
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <Mail className="w-4 h-4 mr-2" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {settingsLoading ? (
            <Card><CardContent className="pt-6">Carregando...</CardContent></Card>
          ) : settings && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Atualização e Exibição</CardTitle>
                  <CardDescription>Configure como o dashboard é exibido e atualizado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Intervalo de Atualização (segundos)</Label>
                      <Input
                        type="number"
                        value={settings.refresh_interval}
                        onChange={(e) => setSettings({ ...settings, refresh_interval: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Período Padrão</Label>
                      <Select
                        value={settings.default_date_range}
                        onValueChange={(v) => setSettings({ ...settings, default_date_range: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                          <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                          <SelectItem value="this_month">Este mês</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Mostrar Tendências</Label>
                    <Switch
                      checked={settings.show_trends}
                      onCheckedChange={(checked) => setSettings({ ...settings, show_trends: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Mostrar Comparações</Label>
                    <Switch
                      checked={settings.show_comparisons}
                      onCheckedChange={(checked) => setSettings({ ...settings, show_comparisons: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Retenção de Dados</CardTitle>
                  <CardDescription>Gerencie o armazenamento de dados históricos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Manter dados por (meses)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.data_retention_months}
                      onChange={(e) => setSettings({ ...settings, data_retention_months: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Dados mais antigos serão arquivados ou excluídos automaticamente
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Arquivar dados antigos</Label>
                      <p className="text-sm text-muted-foreground">Em vez de excluir, mova para arquivo</p>
                    </div>
                    <Switch
                      checked={settings.archive_old_data}
                      onCheckedChange={(checked) => setSettings({ ...settings, archive_old_data: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveSettings}>Salvar Configurações</Button>
            </div>
          )}
        </TabsContent>

        {/* Widgets Tab */}
        <TabsContent value="widgets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAddWidget}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Widget
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Posição</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Visível</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {widgets.map((widget) => (
                    <TableRow key={widget.id}>
                      <TableCell>{widget.position}</TableCell>
                      <TableCell className="font-medium">{widget.title}</TableCell>
                      <TableCell>{widget.widget_type}</TableCell>
                      <TableCell>{widget.size}</TableCell>
                      <TableCell>{widget.is_visible ? 'Sim' : 'Não'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditWidget(widget)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteWidget(widget.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI Thresholds Tab */}
        <TabsContent value="thresholds" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAddThreshold}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Alerta
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thresholds.map((threshold) => (
                    <TableRow key={threshold.id}>
                      <TableCell className="font-medium">{threshold.kpi_name}</TableCell>
                      <TableCell>{threshold.kpi_type}</TableCell>
                      <TableCell>
                        {threshold.threshold_type === 'minimum' && `≥ ${threshold.min_value}`}
                        {threshold.threshold_type === 'maximum' && `≤ ${threshold.max_value}`}
                        {threshold.threshold_type === 'range' && `${threshold.min_value} - ${threshold.max_value}`}
                      </TableCell>
                      <TableCell>{threshold.alert_method}</TableCell>
                      <TableCell>
                        <span className={threshold.is_active ? 'text-green-600' : 'text-gray-400'}>
                          {threshold.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditThreshold(threshold)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteThreshold(threshold.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAddSchedule}>
              <Plus className="w-4 h-4 mr-2" />
              Agendar Relatório
            </Button>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.report_name}</TableCell>
                      <TableCell>{schedule.frequency}</TableCell>
                      <TableCell>{schedule.schedule_time}</TableCell>
                      <TableCell>{schedule.delivery_method}</TableCell>
                      <TableCell>
                        <span className={schedule.is_active ? 'text-green-600' : 'text-gray-400'}>
                          {schedule.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditSchedule(schedule)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(schedule.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Widget Dialog - Simplified for now */}
      <Dialog open={widgetDialogOpen} onOpenChange={setWidgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedWidget ? 'Editar' : 'Adicionar'} Widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Funcionalidade de widgets em desenvolvimento. Use a API diretamente por enquanto.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWidgetDialogOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Threshold Dialog - Simplified for now */}
      <Dialog open={thresholdDialogOpen} onOpenChange={setThresholdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedThreshold ? 'Editar' : 'Adicionar'} Alerta KPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Formulário de alertas em desenvolvimento. Use a API diretamente por enquanto.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdDialogOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog - Simplified for now */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSchedule ? 'Editar' : 'Agendar'} Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Formulário de agendamento em desenvolvimento. Use a API diretamente por enquanto.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
