'use client';

import { useEffect, useRef, useState } from 'react';
import { Save, Bookmark, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { formatLocaleDate } from '@/lib/format';

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
  const { t } = useI18n();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [presetName, setPresetName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load presets from localStorage
    const savedPresets = localStorage.getItem('filterPresets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

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
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-card-foreground shadow-card transition-all duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bookmark className="h-4 w-4 text-primary" />
        {t('presets.button')}
        {presets.length > 0 && (
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {presets.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 w-80 rounded-xl border border-border bg-popover shadow-popover">
          <div className="border-b border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-popover-foreground">{t('presets.title')}</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label={t('common.close')}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!isSaving ? (
              <Button
                onClick={() => setIsSaving(true)}
                className="w-full"
                variant="primary"
                size="md"
              >
                <Save className="h-4 w-4" />
                {t('presets.saveCurrent')}
              </Button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') savePreset();
                    if (e.key === 'Escape') {
                      setIsSaving(false);
                      setPresetName('');
                    }
                  }}
                  placeholder={t('presets.enterName')}
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-card-foreground transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    onClick={savePreset}
                    disabled={!presetName.trim()}
                    className="flex-1"
                    size="md"
                  >
                    {t('common.save')}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsSaving(false);
                      setPresetName('');
                    }}
                    variant="outline"
                    className="flex-1"
                    size="md"
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {presets.length > 0 ? (
              <div>
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="group flex items-center justify-between rounded-lg p-3 transition-colors duration-150 hover:bg-accent"
                  >
                    <button
                      onClick={() => applyPreset(preset)}
                      className="flex-1 text-left focus-visible:outline-none"
                    >
                      <p className="text-sm font-medium text-popover-foreground">
                        {preset.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatLocaleDate(preset.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </button>
                    <button
                      onClick={() => deletePreset(preset.id)}
                      aria-label={t('presets.deleteAria', { name: preset.name })}
                      className="rounded-md p-1.5 text-red-500 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 focus-visible:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t('presets.empty')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}