'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Plus, Trash2, Hash } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function KeywordsPage() {
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newPriority, setNewPriority] = useState(1);
  const queryClient = useQueryClient();

  const { data: keywordsData, isLoading } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => apiClient.getKeywords({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createKeyword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success('Keyword added successfully');
      setNewKeyword('');
      setNewPriority(1);
      setIsAddingKeyword(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add keyword');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteKeyword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success('Keyword deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete keyword');
    },
  });

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) {
      toast.error('Please enter a keyword');
      return;
    }
    createMutation.mutate({
      keyword: newKeyword.trim(),
      priority: newPriority,
    });
  };

  const handleDeleteKeyword = (id: string, keyword: string) => {
    if (confirm(`Are you sure you want to delete "${keyword}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const stats = [
    { label: 'Total Keywords', value: keywordsData?.meta?.total || 0, color: 'text-card-foreground' },
    { label: 'Active Keywords', value: keywordsData?.data?.filter((k: any) => k.isActive).length || 0, color: 'text-emerald-500' },
    { label: 'Inactive Keywords', value: keywordsData?.data?.filter((k: any) => !k.isActive).length || 0, color: 'text-muted-foreground' },
  ];

  const inputClasses = 'w-full rounded-lg border border-input bg-card px-4 py-2 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keywords Management"
        description="Manage keywords for social media monitoring"
      >
        <Button onClick={() => setIsAddingKeyword(true)} size="md">
          <Plus className="h-5 w-5" />
          Add Keyword
        </Button>
      </PageHeader>

      {/* Add Keyword Form */}
      {isAddingKeyword && (
        <Card className="animate-fade-up p-6">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Add New Keyword</h2>
          <form onSubmit={handleAddKeyword} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  Keyword
                </label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="e.g., festival mbois, #mbois"
                  className={inputClasses}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-card-foreground">
                  Priority
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
                {createMutation.isPending ? 'Adding...' : 'Add Keyword'}
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
                Cancel
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

      {/* Keywords List */}
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading keywords...</p>
        </div>
      ) : keywordsData?.data?.length === 0 ? (
        <Card className="p-12 text-center">
          <Hash className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No keywords yet. Add your first keyword to start monitoring.</p>
          <Button
            onClick={() => setIsAddingKeyword(true)}
            variant="outline"
            className="mt-4"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add Keyword
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Keyword
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {keywordsData?.data?.map((keyword: any) => (
                  <tr key={keyword.id} className="transition-colors duration-150 hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-card-foreground">
                          {keyword.keyword}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        Priority {keyword.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {keyword.isActive ? (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(keyword.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteKeyword(keyword.id, keyword.keyword)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md p-1.5 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50 dark:hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Delete keyword"
                        aria-label={`Delete keyword ${keyword.keyword}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Info */}
      <div className="rounded-xl border border-blue-200 bg-primary/5 p-4 dark:border-blue-500/20">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>Note:</strong> Keywords are used by workers to collect social media posts.
          Active keywords will be monitored during the next scraping cycle.
        </p>
      </div>
    </div>
  );
}