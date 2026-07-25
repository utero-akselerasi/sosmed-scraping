'use client';

import { useState, useEffect } from 'react';
import { Save, Bookmark, Trash2, X } from 'lucide-react';

interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
}

interface FilterPresetsProps {
  onApplyPreset: (preset: FilterPreset) => void;
  currentFilters: Record<string, any>;
}

export function FilterPresets({ onApplyPreset, currentFilters }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    // Load presets from localStorage
    const savedPresets = localStorage.getItem('filterPresets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('filterPresets', JSON.stringify(updatedPresets));

    setPresetName('');
    setIsSaving(false);
  };

  const deletePreset = (id: string) => {
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem('filterPresets', JSON.stringify(updatedPresets));
  };

  const applyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
      >
        <Bookmark className="w-4 h-4" />
        Filter Presets
        {presets.length > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
            {presets.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Filter Presets</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {!isSaving ? (
              <button
                onClick={() => setIsSaving(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                Save Current Filters
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={savePreset}
                    disabled={!presetName.trim()}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsSaving(false);
                      setPresetName('');
                    }}
                    className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {presets.length > 0 ? (
              <div className="p-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <button
                      onClick={() => applyPreset(preset)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {preset.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(preset.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                No presets saved yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
