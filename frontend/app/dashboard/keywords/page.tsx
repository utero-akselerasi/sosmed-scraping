'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { formatLocaleDate } from '@/lib/format';
import toast from 'react-hot-toast';
import { Plus, Trash2, Hash, Search, Edit2, Check, X, Power, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Keyword {
  id: string;
  keyword: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export default function KeywordsPage() {
  const { t } = useI18n();
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newPriority, setNewPriority] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editPriority, setEditPriority] = useState(1);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: keywordsData, isLoading } = useQuery({
    queryKey: ['keywords', searchTerm],
    queryFn: () => apiClient.getKeywords({ limit: 100, search: searchTerm || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createKeyword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success(t('keywords.addedSuccess'));
      setNewKeyword('');
      setNewPriority(1);
      setIsAddingKeyword(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('keywords.addFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.updateKeyword(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success(t('keywords.updatedSuccess'));
      setEditingId(null);
      setEditKeyword('');
      setEditPriority(1);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('keywords.updateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteKeyword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success(t('keywords.deletedSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('keywords.deleteFailed'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiClient.toggleKeyword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success(t('keywords.toggledSuccess'));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('keywords.toggleFailed'));
    },
  });

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) {
      toast.error(t('keywords.enterKeyword'));
      return;
    }
    createMutation.mutate({
      keyword: newKeyword.trim(),
      priority: newPriority,
    });
  };

  const handleDeleteKeyword = (id: string, keyword: string) => {
    if (confirm(t('keywords.deleteConfirm', { keyword }))) {
      deleteMutation.mutate(id);
    }
  };

  const handleStartEdit = (keyword: Keyword) => {
    setEditingId(keyword.id);
    setEditKeyword(keyword.keyword);
    setEditPriority(keyword.priority);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditKeyword('');
    setEditPriority(1);
  };

  const handleSaveEdit = (id: string) => {
    if (!editKeyword.trim()) {
      toast.error(t('keywords.enterKeyword'));
      return;
    }
    updateMutation.mutate({
      id,
      data: {
        keyword: editKeyword.trim(),
        priority: editPriority,
      },
    });
  };

  const handleToggle = (id: string) => {
    toggleMutation.mutate(id);
  };

  const stats = [
    { label: t('keywords.total'), value: keywordsData?.meta?.total || 0, color: 'text-card-foreground' },
    { label: t('keywords.active'), value: keywordsData?.data?.filter((k: Keyword) => k.isActive).length || 0, color: 'text-emerald-500' },
    { label: t('keywords.inactive'), value: keywordsData?.data?.filter((k: Keyword) => !k.isActive).length || 0, color: 'text-muted-foreground' },
  ];

  const inputClasses = 'w-full rounded-lg border border-input bg-card px-4 py-2 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('keywords.management')}
        description={t('keywords.description')}
      >
        <Button onClick={() => setIsAddingKeyword(true)} size="md">
          <Plus className="h-5 w-5" />
          {t('keywords.add')}
        </Button>
      </PageHeader>

      {/* Add Keyword Form */}
      {isAddingKeyword && (
        <Card className="animate-fade-up p-6">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">{t('keywords.addNew')}</h2>
          <form onSubmit={handleAddKeyword} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  {t('keywords.keyword')}
                </label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder={t('keywords.placeholder')}
                  className={inputClasses}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  {t('common.priority')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newPriority}
                  onChange={(e) => setNewPriority(parseInt(e.target.value))}
                  className={inputClasses}
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                loading={createMutation.isPending}
              >
                {createMutation.isPending ? t('keywords.adding') : t('keywords.add')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingKeyword(false);
                  setNewKeyword('');
                  setNewPriority(1);
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Keywords Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className={cn('text-2xl font-bold', stat.color)}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('keywords.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-10 pr-4 py-2 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </Card>

      {/* Keywords List */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t('keywords.loading')}</p>
        </div>
      ) : keywordsData?.data?.length === 0 ? (
        <Card className="p-12 text-center">
          <Hash className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{searchTerm ? t('keywords.noResults') : t('keywords.empty')}</p>
          {!searchTerm && (
            <Button
              onClick={() => setIsAddingKeyword(true)}
              variant="outline"
              className="mt-4"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              {t('keywords.add')}
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('keywords.keyword')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.priority')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.created')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {keywordsData?.data?.map((keyword: Keyword) => (
                  <tr key={keyword.id} className="transition-colors duration-150 hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === keyword.id ? (
                        <input
                          type="text"
                          value={editKeyword}
                          onChange={(e) => setEditKeyword(e.target.value)}
                          className="w-full rounded border border-input bg-card px-2 py-1 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center">
                          <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-card-foreground">
                            {keyword.keyword}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === keyword.id ? (
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editPriority}
                          onChange={(e) => setEditPriority(parseInt(e.target.value))}
                          className="w-20 rounded border border-input bg-card px-2 py-1 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                        />
                      ) : (
                        <span className="text-sm text-card-foreground">{keyword.priority}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        keyword.isActive
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {keyword.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatLocaleDate(new Date(keyword.createdAt))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {editingId === keyword.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveEdit(keyword.id)}
                              disabled={updateMutation.isPending}
                              className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/dashboard/keywords/${keyword.id}`)}
                              className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600"
                              title={t('keywords.viewMonitoring')}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggle(keyword.id)}
                              disabled={toggleMutation.isPending}
                              className={cn(
                                'h-8 w-8 p-0',
                                keyword.isActive
                                  ? 'text-emerald-500 hover:text-emerald-600'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEdit(keyword)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteKeyword(keyword.id, keyword.keyword)}
                              disabled={deleteMutation.isPending}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
