'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Hash } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keywords Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage keywords for social media monitoring
          </p>
        </div>
        <button
          onClick={() => setIsAddingKeyword(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Keyword
        </button>
      </div>

      {/* Add Keyword Form */}
      {isAddingKeyword && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Keyword</h2>
          <form onSubmit={handleAddKeyword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keyword
                </label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="e.g., festival mbois, #mbois"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newPriority}
                  onChange={(e) => setNewPriority(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Keyword'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingKeyword(false);
                  setNewKeyword('');
                  setNewPriority(1);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Keywords Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Keywords</p>
          <p className="text-2xl font-bold text-gray-900">
            {keywordsData?.meta?.total || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Active Keywords</p>
          <p className="text-2xl font-bold text-green-600">
            {keywordsData?.data?.filter((k: any) => k.isActive).length || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Inactive Keywords</p>
          <p className="text-2xl font-bold text-gray-600">
            {keywordsData?.data?.filter((k: any) => !k.isActive).length || 0}
          </p>
        </div>
      </div>

      {/* Keywords List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading keywords...</p>
        </div>
      ) : keywordsData?.data?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No keywords yet. Add your first keyword to start monitoring.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keyword
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {keywordsData?.data?.map((keyword: any) => (
                <tr key={keyword.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {keyword.keyword}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      Priority {keyword.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {keyword.isActive ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(keyword.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteKeyword(keyword.id, keyword.keyword)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      title="Delete keyword"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Keywords are used by workers to collect social media posts. 
          Active keywords will be monitored during the next scraping cycle.
        </p>
      </div>
    </div>
  );
}
