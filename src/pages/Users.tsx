import React, { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import AuditLogDialog from '@/components/AuditLogDialog';

const Users: React.FC = () => {
  const { isAdmin, hasPermission, user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState<{ kind: 'role' | 'preset'; value: string } | null>(
    null
  );
  const { toast } = useToast();

  // Filters & search
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'operator'>('all');
  const permissionKeys = Object.keys({
    manageRates: false,
    manageMonthlyCustomers: false,
    viewReports: false,
    manageUsers: false,
    manageCompanyConfig: false,
    manageVehicleTypes: false,
    openCloseCash: false,
    manageBackups: false,
  });
  const [permFilter, setPermFilter] = useState<'any' | (typeof permissionKeys)[number]>('any');

  // Form state
  type Permissions = {
    manageRates: boolean;
    manageMonthlyCustomers: boolean;
    viewReports: boolean;
    manageUsers: boolean;
    manageCompanyConfig: boolean;
    manageVehicleTypes: boolean;
    openCloseCash: boolean;
    manageBackups: boolean;
  };
  const defaultPermissions: Permissions = {
    manageRates: false,
    manageMonthlyCustomers: true,
    viewReports: true,
    manageUsers: false,
    manageCompanyConfig: false,
    manageVehicleTypes: false,
    openCloseCash: true,
    manageBackups: false,
  };
  const allPermissionsTrue: Permissions = {
    manageRates: true,
    manageMonthlyCustomers: true,
    viewReports: true,
    manageUsers: true,
    manageCompanyConfig: true,
    manageVehicleTypes: true,
    openCloseCash: true,
    manageBackups: true,
  };

  // Permission presets
  const PRESETS: Record<string, { role: 'admin' | 'operator'; permissions: Permissions }> = {
    Admin: { role: 'admin', permissions: { ...allPermissionsTrue } },
    Operacional: {
      role: 'operator',
      permissions: {
        manageRates: false,
        manageMonthlyCustomers: true,
        viewReports: false,
        manageUsers: false,
        manageCompanyConfig: false,
        manageVehicleTypes: false,
        openCloseCash: true,
        manageBackups: false,
      },
    },
    Financeiro: {
      role: 'operator',
      permissions: {
        manageRates: true,
        manageMonthlyCustomers: false,
        viewReports: true,
        manageUsers: false,
        manageCompanyConfig: false,
        manageVehicleTypes: false,
        openCloseCash: true,
        manageBackups: false,
      },
    },
  };

  const applyCreatePreset = (name: keyof typeof PRESETS) => {
    const p = PRESETS[name];
    setForm((f) => ({ ...f, role: p.role, permissions: { ...p.permissions } }));
  };
  const applyEditPreset = (name: keyof typeof PRESETS) => {
    const p = PRESETS[name];
    setEditForm((f) => ({ ...f, role: p.role, permissions: { ...p.permissions } }));
  };

  const [form, setForm] = useState({
    name: '',
    email: '',
    login: '',
    password: '',
    role: 'operator',
    permissions: { ...defaultPermissions },
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    login: '',
    role: 'operator',
    permissions: { ...defaultPermissions },
  });
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Password strength evaluation
  type Strength = {
    score: number;
    label: 'Muito fraca' | 'Fraca' | 'Média' | 'Forte' | 'Muito forte';
    color: string;
    valid: boolean;
    issues: string[];
  };
  const evaluatePassword = (pwd: string): Strength => {
    const issues: string[] = [];
    const lengthOk = pwd.length >= 8;
    if (!lengthOk) issues.push('Mínimo de 8 caracteres');
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
    if (variety < 3) issues.push('Use 3 tipos: maiúscula, minúscula, número, símbolo');
    let score = 0;
    score += lengthOk ? 1 : 0;
    score += variety >= 2 ? 1 : 0;
    score += variety >= 3 ? 1 : 0;
    score += pwd.length >= 12 ? 1 : 0;
    score += pwd.length >= 16 ? 1 : 0;
    const labels: Strength['label'][] = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];
    const colors = [
      'text-red-600',
      'text-orange-500',
      'text-yellow-600',
      'text-green-600',
      'text-emerald-600',
    ];
    const idx = Math.min(score, 4);
    const valid = lengthOk && variety >= 3;
    return { score, label: labels[idx], color: colors[idx], valid, issues };
  };
  const createPwdStrength = useMemo(() => evaluatePassword(form.password || ''), [form.password]);
  const newPwdStrength = useMemo(() => evaluatePassword(newPassword || ''), [newPassword]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('manageUsers')) loadUsers();
  }, [isAdmin]);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const filteredUsers = useMemo(() => {
    let list = users.slice();
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (permFilter !== 'any') {
      list = list.filter((u) => {
        const perms = (u.permissions || {}) as Record<string, boolean>;
        return Boolean(perms[permFilter]);
      });
    }
    if (debouncedQuery) {
      list = list.filter((u) => {
        const hay = `${u.name || ''} ${u.login || ''} ${u.email || ''}`.toLowerCase();
        return hay.includes(debouncedQuery);
      });
    }
    return list;
  }, [users, roleFilter, permFilter, debouncedQuery]);

  const allSelectedOnPage = useMemo(() => {
    if (!filteredUsers.length) return false;
    return filteredUsers.every((u) => selectedIds.includes(u.id));
  }, [filteredUsers, selectedIds]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = Array.from(new Set([...selectedIds, ...filteredUsers.map((u) => u.id)]));
      setSelectedIds(ids);
    } else {
      const pageIds = new Set(filteredUsers.map((u) => u.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    );
  };

  const openCreate = () => {
    setForm({
      name: '',
      email: '',
      login: '',
      password: '',
      role: 'operator',
      permissions: { ...defaultPermissions },
    });
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createPwdStrength.valid) {
      toast({
        title: 'Senha fraca',
        description: createPwdStrength.issues.join(' • '),
        variant: 'destructive',
      });
      return;
    }
    try {
      const created = await api.createUser(form);
      toast({ title: 'Usuário criado', description: created.name });
      setCreateOpen(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erro ao criar usuário', description: err.message });
    }
  };

  const openEdit = (u: any) => {
    setSelectedUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      login: u.login,
      role: u.role,
      permissions: { ...defaultPermissions, ...(u.permissions || {}) },
    });
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const updated = await api.updateUser(selectedUser.id, editForm);
      toast({ title: 'Usuário atualizado', description: updated.name });
      setEditOpen(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message });
    }
  };

  const openPassword = (u: any) => {
    setSelectedUser(u);
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPasswords(false);
    setPasswordOpen(true);
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Senhas não conferem', description: 'Confirme a nova senha corretamente.' });
      return;
    }
    if (!newPwdStrength.valid) {
      toast({
        title: 'Senha fraca',
        description: newPwdStrength.issues.join(' • '),
        variant: 'destructive',
      });
      return;
    }
    try {
      if (oldPassword) {
        await api.updateOwnPassword(selectedUser.id, oldPassword, newPassword);
      } else {
        await api.updateUserPassword(selectedUser.id, newPassword);
      }
      toast({ title: 'Senha atualizada', description: selectedUser.name });
      setPasswordOpen(false);
      // Force logout if current user changed their own password
      if (user && selectedUser.id === user.id) {
        logout();
        navigate('/login');
      }
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar senha', description: err.message });
    }
  };

  const openDelete = (u: any) => {
    setSelectedUser(u);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await api.deleteUser(selectedUser.id);
      toast({ title: 'Usuário removido', description: selectedUser.name });
      setDeleteOpen(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Erro ao remover usuário', description: err.message });
    }
  };

  // Bulk actions
  const countAdmins = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);
  const selectedAdminsCount = useMemo(
    () => users.filter((u) => selectedIds.includes(u.id) && u.role === 'admin').length,
    [users, selectedIds]
  );

  const bulkSetRole = async (role: 'admin' | 'operator') => {
    if (!selectedIds.length) return;
    if (role === 'operator') {
      // Prevent removing last admin
      if (countAdmins > 0 && selectedAdminsCount === countAdmins) {
        toast({
          title: 'Operação bloqueada',
          description: 'Não é permitido remover o último admin.',
          variant: 'destructive',
        });
        return;
      }
    }
    try {
      const ops = selectedIds.map((id) => api.updateUser(id, { role }));
      await Promise.all(ops);
      toast({
        title: 'Papel atualizado',
        description: `${selectedIds.length} usuário(s) atualizado(s)`,
      });
      setSelectedIds([]);
      await loadUsers();
    } catch (err: any) {
      toast({
        title: 'Erro em atualização em massa',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const bulkApplyPreset = async (name: keyof typeof PRESETS) => {
    if (!selectedIds.length) return;
    const p = PRESETS[name];
    try {
      const ops = selectedIds.map((id) =>
        api.updateUser(id, { role: p.role, permissions: p.permissions })
      );
      await Promise.all(ops);
      toast({
        title: 'Preset aplicado',
        description: `${name} aplicado para ${selectedIds.length} usuário(s)`,
      });
      setSelectedIds([]);
      await loadUsers();
    } catch (err: any) {
      toast({ title: 'Erro ao aplicar preset', description: err.message, variant: 'destructive' });
    }
  };

  const confirmBulk = async () => {
    if (!bulkPending) return;
    const { kind, value } = bulkPending;
    try {
      if (kind === 'role') {
        await bulkSetRole(value as 'admin' | 'operator');
      } else {
        await bulkApplyPreset(value as keyof typeof PRESETS);
      }
      // Emit a summary audit event
      try {
        await api.createAuditEvent({
          action: 'user.bulkUpdate',
          targetType: 'user',
          details: {
            kind,
            value,
            count: selectedIds.length,
            ids: selectedIds,
          },
        });
      } catch (e) {
        // non-blocking
        console.warn('Failed to write bulk audit event', e);
      }
      setBulkOpen(false);
      setBulkPending(null);
    } catch (e) {
      // errors already toasts inside functions
    }
  };

  // Export helpers
  const permKeys = Object.keys(defaultPermissions);
  const exportJSON = () => {
    const data = filteredUsers.map((u) => ({
      id: u.id,
      name: u.name,
      login: u.login,
      email: u.email,
      role: u.role,
      permissions: permKeys.reduce(
        (acc: any, k) => ({ ...acc, [k]: Boolean((u.permissions || {})[k]) }),
        {}
      ),
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportCSV = () => {
    const cols = ['id', 'name', 'login', 'email', 'role', ...permKeys];
    const rows = filteredUsers.map((u) => {
      const perms = permKeys.map((k) => (u.permissions && u.permissions[k] ? '1' : '0'));
      const vals = [u.id, u.name, u.login, u.email, u.role, ...perms];
      return vals
        .map((v) => {
          const s = String(v ?? '');
          if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        })
        .join(',');
    });
    const csv = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hasPermission('manageUsers')) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold">Acesso negado</h2>
          <p className="text-sm text-muted-foreground">
            Você não tem permissão para ver esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-2xl font-bold">Usuários</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setAuditLogOpen(true)}>
              Log de Auditoria
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={exportJSON}>
              Exportar JSON
            </Button>
            {hasPermission('manageUsers') && <Button onClick={openCreate}>Criar usuário</Button>}
          </div>
        </div>

        {loading && <p>Carregando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {/* Search & Filters */}
        <div className="bg-card rounded-lg border p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Nome, login ou email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Papel</label>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Permissão</label>
              <Select value={permFilter} onValueChange={(v) => setPermFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer</SelectItem>
                  {permissionKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {permissionLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(query || roleFilter !== 'all' || permFilter !== 'any') && (
            <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
              <div>{filteredUsers.length} resultados</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setRoleFilter('all');
                  setPermFilter('any');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>

        {/* Bulk actions toolbar */}
        {selectedIds.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3 mb-3 flex flex-wrap items-center gap-2">
            <div className="text-sm">Selecionados: {selectedIds.length}</div>
            <div className="ml-auto flex items-center gap-2">
              <Select
                onValueChange={(v) => {
                  setBulkPending({ kind: 'role', value: v });
                  setBulkOpen(true);
                }}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Definir papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                </SelectContent>
              </Select>
              <Select
                onValueChange={(v) => {
                  setBulkPending({ kind: 'preset', value: v });
                  setBulkOpen(true);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Aplicar preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Limpar seleção
              </Button>
            </div>
          </div>
        )}

        <div className="bg-card rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={allSelectedOnPage}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    aria-label="Selecionar todos"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Login</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Papel</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedIds.includes(u.id)}
                      onChange={(e) => toggleSelectOne(u.id, e.target.checked)}
                      aria-label={`Selecionar ${u.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.login}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3 text-right flex gap-1 justify-end">
                    {hasPermission('manageUsers') && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openPassword(u)}>
                          Senha
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDelete(u)}>
                          Excluir
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create User Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitCreate} className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Presets rápidos</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyCreatePreset('Admin')}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyCreatePreset('Operacional')}
                  >
                    Operacional
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyCreatePreset('Financeiro')}
                  >
                    Financeiro
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Login</label>
                <Input
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Senha</label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                {form.password && (
                  <p className={`text-xs mt-1 ${createPwdStrength.color}`}>
                    Força da senha: {createPwdStrength.label}
                  </p>
                )}
                {!createPwdStrength.valid && form.password && (
                  <p className="text-xs text-muted-foreground">
                    {createPwdStrength.issues.join(' • ')}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Papel</label>
                <Select
                  value={form.role}
                  onValueChange={(val) =>
                    setForm({
                      ...form,
                      role: val as 'admin' | 'operator',
                      permissions:
                        val === 'admin' ? { ...allPermissionsTrue } : { ...defaultPermissions },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Permissões</div>
                {Object.keys(defaultPermissions).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(form.permissions as any)[key]}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          permissions: { ...form.permissions, [key]: Boolean(v) },
                        })
                      }
                    />
                    <span className="inline-flex items-center gap-1">
                      {permissionLabel(key)}
                      <Tooltip>
                        <TooltipTrigger className="cursor-help">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">{permissionHelp(key)}</TooltipContent>
                      </Tooltip>
                    </span>
                  </label>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Presets rápidos</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyEditPreset('Admin')}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyEditPreset('Operacional')}
                  >
                    Operacional
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyEditPreset('Financeiro')}
                  >
                    Financeiro
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Login</label>
                <Input
                  value={editForm.login}
                  onChange={(e) => setEditForm({ ...editForm, login: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Papel</label>
                <Select
                  value={editForm.role}
                  onValueChange={(val) =>
                    setEditForm({
                      ...editForm,
                      role: val as 'admin' | 'operator',
                      permissions:
                        val === 'admin' ? { ...allPermissionsTrue } : { ...editForm.permissions },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.role === 'admin' ? (
                <div className="text-xs text-muted-foreground">
                  Admins possuem acesso total por padrão.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Permissões</div>
                  {Object.keys(defaultPermissions).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={(editForm.permissions as any)[key]}
                        onCheckedChange={(v) =>
                          setEditForm({
                            ...editForm,
                            permissions: { ...editForm.permissions, [key]: Boolean(v) },
                          })
                        }
                      />
                      <span className="inline-flex items-center gap-1">
                        {permissionLabel(key)}
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {permissionHelp(key)}
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Update Password Dialog */}
        <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atualizar senha</DialogTitle>
            </DialogHeader>
            <form onSubmit={submitPassword} className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Administradores podem redefinir senhas sem informar a senha atual. Usuários comuns
                devem informar a senha atual.
              </div>
              <div>
                <label className="text-sm font-medium">
                  Senha atual (somente se for sua própria conta)
                </label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Opcional para admin"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Nova senha</label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  {newPassword && (
                    <p className={`text-xs mt-1 ${newPwdStrength.color}`}>
                      Força da senha: {newPwdStrength.label}
                    </p>
                  )}
                  {!newPwdStrength.valid && newPassword && (
                    <p className="text-xs text-muted-foreground">
                      {newPwdStrength.issues.join(' • ')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Confirmar nova senha</label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="showPasswords"
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="showPasswords" className="text-sm cursor-pointer select-none">
                  Mostrar senhas
                </label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Atualizar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir usuário</DialogTitle>
            </DialogHeader>
            <p>
              Tem certeza que deseja excluir {selectedUser?.name}? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk confirmation dialog */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar ação em massa</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>
                Você está prestes a aplicar{' '}
                <span className="font-medium">
                  {bulkPending?.kind === 'role'
                    ? `o papel "${bulkPending?.value}"`
                    : `o preset "${bulkPending?.value}"`}
                </span>{' '}
                em <span className="font-medium">{selectedIds.length}</span> usuário(s).
              </p>
              {bulkPending?.kind === 'role' &&
                bulkPending?.value === 'operator' &&
                selectedAdminsCount === countAdmins &&
                countAdmins > 0 && (
                  <p className="text-red-600">
                    Atenção: isso removeria o último admin, o que não é permitido.
                  </p>
                )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBulkOpen(false);
                  setBulkPending(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={confirmBulk}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Audit Log Dialog */}
        <AuditLogDialog open={auditLogOpen} onOpenChange={setAuditLogOpen} />
      </div>
    </div>
  );
};

export default Users;
function permissionLabel(key: string) {
  const map: Record<string, string> = {
    manageRates: 'Gerenciar tarifas',
    manageMonthlyCustomers: 'Gerenciar mensalistas',
    viewReports: 'Ver relatórios',
    manageUsers: 'Gerenciar usuários',
    manageCompanyConfig: 'Configurações da empresa',
    manageVehicleTypes: 'Tipos de veículos',
    openCloseCash: 'Abrir/Fechar caixa',
    manageBackups: 'Gerenciar backups',
  };
  return map[key] || key;
}

function permissionHelp(key: string) {
  const map: Record<string, string> = {
    manageRates:
      'Permite criar, editar e remover tarifas. Usuários sem esta permissão só conseguem visualizar as tarifas.',
    manageMonthlyCustomers:
      'Permite cadastrar, editar e excluir mensalistas, bem como registrar pagamentos de planos mensais.',
    viewReports:
      'Permite acessar relatórios financeiros e operacionais. Sem esta permissão, a página de relatórios fica inacessível.',
    manageUsers:
      'Permite criar, editar, redefinir senha e excluir usuários, além de gerenciar papéis e permissões.',
    manageCompanyConfig:
      'Permite alterar configurações gerais da empresa (nome, CNPJ, recibos, etc.). Sem esta permissão o formulário fica somente leitura.',
    manageVehicleTypes:
      'Permite gerenciar os tipos de veículos disponíveis (criar, editar, remover).',
    openCloseCash:
      'Permite abrir e fechar o caixa, além de registrar entradas/saídas avulsas e finalizar tickets.',
    manageBackups:
      'Permite criar, baixar, restaurar e excluir backups do sistema, bem como configurar backups automáticos programados.',
  };
  return map[key] || 'Permissão do sistema.';
}
