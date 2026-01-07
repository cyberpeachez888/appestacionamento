import React, { useState, useEffect } from 'react';
import {
    History as HistoryIcon,
    Download,
    Search,
    FileText,
    Printer,
    ChevronRight,
    Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const ShiftHistory = () => {
    const [loading, setLoading] = useState(true);
    const [closings, setClosings] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get<any[]>('/cash-register/history');
            setClosings(res);
        } catch (error) {
            toast({ title: 'Erro ao carregar histórico', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDownload = async (id: string, formatSuffix: string) => {
        try {
            const response = await api.get<any>(`/cash-register/report/${id}/${formatSuffix}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `fechamento_${id.substring(0, 8)}.${formatSuffix === 'thermal' ? 'txt' : formatSuffix}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast({ title: 'Erro ao baixar arquivo', variant: 'destructive' });
        }
    };

    const filtered = closings.filter(c =>
        (c.operator_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        format(new Date(c.closed_at), 'dd/MM/yyyy').includes(searchTerm)
    );

    return (
        <Card className="shadow-sm border-gray-100">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <HistoryIcon className="h-5 w-5 text-blue-500" />
                            Histórico de Turnos
                        </CardTitle>
                        <CardDescription>Consulte fechamentos passados e re-emita relatórios</CardDescription>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por operador ou data..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="text-muted-foreground">Carregando histórico...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-2">
                        <Calendar className="h-10 w-10 text-muted/30" />
                        <span className="text-muted-foreground font-medium">Nenhum fechamento encontrado.</span>
                    </div>
                ) : (
                    <div className="border rounded-md overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[120px]">Relatório</TableHead>
                                    <TableHead>Data / Hora</TableHead>
                                    <TableHead>Operador</TableHead>
                                    <TableHead>Valor em Caixa</TableHead>
                                    <TableHead>Diferença</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((closing) => (
                                    <TableRow key={closing.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-bold text-primary">
                                            #{closing.report_sequential_number || closing.id.substring(0, 6)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{format(new Date(closing.closed_at), 'dd/MM/yyyy')}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                                    {closing?.opened_at && closing?.closed_at ? `${format(new Date(closing.opened_at), 'HH:mm')} ➜ ${format(new Date(closing.closed_at), 'HH:mm')}` : 'N/A'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-black ring-2 ring-white">
                                                    {closing?.operator_name?.[0] || '?'}
                                                </div>
                                                <span className="text-sm font-medium">{closing?.operator_name || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-bold text-gray-900">R$ {Number(closing.actual_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${closing.difference === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {closing.difference === 0 ? 'Exato' : `R$ ${Number(closing.difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 border-dashed">
                                                        <Download className="h-3 w-3 mr-2" /> Relatórios
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuItem onClick={() => handleDownload(closing.id, 'pdf')}>
                                                        <FileText className="h-4 w-4 mr-2 text-red-500" /> PDF Formal (A4)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDownload(closing.id, 'thermal')}>
                                                        <Printer className="h-4 w-4 mr-2 text-blue-500" /> Térmico (80mm)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDownload(closing.id, 'xml')}>
                                                        <FileText className="h-4 w-4 mr-2 text-emerald-500" /> XML Contábil
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
