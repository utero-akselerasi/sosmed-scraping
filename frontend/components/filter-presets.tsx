// Filter Presets Component
'use client';

import { Save, Trash2, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FilterPreset {
  id: string;
  name: string;
  filters: any;
}

interface FilterPresetsProps {
  currentFilters: any;
  onApplyPreset: (filters: any) => void;
}

export function FilterPresets({ currentFilters, onApplyPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    const saved = localStorage.getItem('filter-presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const savePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: currentFilters,
    };
    
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('filter-presets', JSON.stringify(updated));
    setPresetName('');
    setShowSaveModal(false);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('filter-presets', JSON.stringify(updated));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPresets(!showPresets)}
        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <Save className="w-4 h-4" />
        Filter Presets
        <ChevronDown className="w-4 h-4" />
      </button>

      {showPresets && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowSaveModal(true)}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Save Current Filters
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {presets.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No saved presets
              </div>
            ) : (
              <div className="p-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg group"
                  >
                    <button
                      onClick={() => {
                        onApplyPreset(preset.filters);
                        setShowPresets(false);
                      }}
                      className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Save Filter Preset
            </h3>
            <input
              type="text"
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && savePreset()}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={savePreset}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setPresetName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
