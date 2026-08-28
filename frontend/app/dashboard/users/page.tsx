'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/contexts/auth-context';
import { formatLocaleDate } from '@/lib/format';
import { Users, ShieldCheck, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300',
  analyst: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300',
  viewer: 'bg-muted text-muted-foreground',
};

const inputClasses =
  'w-full rounded-lg border border-input bg-card py-2 px-3 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

export default function UsersPage() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);

  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'viewer',
  });

  const [editForm, setEditForm] = useState({
    email: '',
    fullName: '',
    role: 'viewer',
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.getUsers({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.createdSuccess'));
      setShowCreateModal(false);
      setCreateForm({ email: '', fullName: '', password: '', role: 'viewer' });
    },
    onError: (error: any) => {
      toast.error(apiClient.getErrorMessage(error, t('users.createFailed')));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.updatedSuccess'));
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast.error(apiClient.getErrorMessage(error, t('users.updateFailed')));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.deletedSuccess'));
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast.error(apiClient.getErrorMessage(error, t('users.deleteFailed')));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiClient.toggleUserActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.toggledSuccess'));
    },
    onError: (error: any) => {
      toast.error(apiClient.getErrorMessage(error, t('users.toggleFailed')));
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(createForm);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: editForm });
    }
  };

  const handleDelete = () => {
    if (deletingUser) {
      if (deletingUser.id === currentUser?.id) {
        toast.error(t('users.cannotDeleteSelf'));
        return;
      }
      deleteMutation.mutate(deletingUser.id);
    }
  };

  const openEditModal = (user: any) => {
    setEditForm({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
    setEditingUser(user);
  };

  const stats = [
    { label: t('users.total'), value: usersData?.meta?.total || 0, icon: Users, color: 'text-primary' },
    { label: t('users.active'), value: usersData?.data?.filter((u: any) => u.isActive).length || 0, icon: ShieldCheck, color: 'text-emerald-500' },
    { label: t('users.admins'), value: usersData?.data?.filter((u: any) => u.role === 'admin').length || 0, icon: ShieldCheck, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.management')}
        description={t('users.description')}
      >
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('users.createUser')}
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={cn('text-2xl font-bold text-card-foreground', stat.color)}>
                    {stat.value}
                  </p>
                </div>
                <Icon className={cn('h-6 w-6', stat.color)} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t('users.loading')}</p>
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.user')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('users.lastLogin')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('users.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {usersData?.data?.map((user: any) => (
                  <tr key={user.id} className="transition-colors duration-150 hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{user.fullName}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn('rounded px-2 py-1 text-xs font-medium', ROLE_BADGES[user.role] ?? ROLE_BADGES.viewer)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {t('common.active')}
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">
                          {t('common.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.lastLogin ? formatLocaleDate(user.lastLogin, { year: 'numeric', month: 'short', day: 'numeric' }) : t('common.never')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
                          title={t('users.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(user.id)}
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
                          title={user.isActive ? t('users.disable') : t('users.enable')}
                        >
                          {user.isActive ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-red-500" />}
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => setDeletingUser(user)}
                            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                            title={t('users.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!usersData?.data || usersData.data.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      {t('users.noUsers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">{t('users.createUser')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground">{t('users.fullName')}</label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  required
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground">{t('users.email')}</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground">{t('users.password')}</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={6}
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground">{t('users.selectRole')}</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className={inputClasses}
                >
                  <option value="viewer">Viewer</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">{t('users.editUser')}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground">{t('users.fullName')}</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  required
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground">{t('users.email')}</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-card-foreground">{t('users.selectRole')}</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className={inputClasses}
                >
                  <option value="viewer">Viewer</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-2 text-lg font-semibold text-card-foreground">{t('users.deleteUser')}</h2>
            <p className="mb-4 text-sm text-muted-foreground">{t('users.deleteConfirm')}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeletingUser(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t('common.deleting') : t('common.delete')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
