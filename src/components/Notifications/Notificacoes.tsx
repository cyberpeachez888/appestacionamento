import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface Notificacao {
    id: string;
    titulo: string;
    mensagem: string;
    tipo: 'alerta' | 'info' | 'erro' | 'sucesso';
    lida: boolean;
    data_criacao: string;
    acao_url?: string;
}

export function Notificacoes() {
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Buscar notificações ao carregar e a cada 60s
        fetchNotificacoes();
        const interval = setInterval(fetchNotificacoes, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotificacoes = async () => {
        try {
            const data = await api.getNotificacoes();
            setNotificacoes(data || []);
            setUnreadCount(data?.filter((n: Notificacao) => !n.lida).length || 0);
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await api.markNotificacaoRead(id);
            setNotificacoes(prev =>
                prev.map(n => n.id === id ? { ...n, lida: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Erro ao marcar como lida:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.markAllNotificacoesRead();
            setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Erro ao marcar todas como lidas:', error);
        }
    };

    const handleClickNotification = async (notification: Notificacao) => {
        if (!notification.lida) {
            handleMarkAsRead(notification.id);
        }
        if (notification.acao_url) {
            setOpen(false);
            navigate(notification.acao_url);
        }
    };

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case 'erro': return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'alerta': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case 'sucesso': return <CheckCircle className="h-4 w-4 text-green-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-600 border-2 border-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notificações</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 text-muted-foreground"
                            onClick={handleMarkAllAsRead}
                        >
                            Marcar lidas
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notificacoes.length > 0 ? (
                        <div className="flex flex-col">
                            {notificacoes.map((notificacao) => (
                                <button
                                    key={notificacao.id}
                                    className={`flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${!notificacao.lida ? 'bg-muted/20' : ''
                                        }`}
                                    onClick={() => handleClickNotification(notificacao)}
                                >
                                    <div className="mt-1">
                                        {getIcon(notificacao.tipo)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={`text-sm font-medium leading-none ${!notificacao.lida ? 'text-primary' : ''}`}>
                                            {notificacao.titulo}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notificacao.mensagem}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(notificacao.data_criacao).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    {!notificacao.lida && (
                                        <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Nenhuma notificação</p>
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
