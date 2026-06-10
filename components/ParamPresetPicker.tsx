"use client";

import { useState } from "react";
import { useI18n } from "@/lib/client/i18n";
import { useParamPresets, type ParamPreset, type PresetValues } from "@/lib/client/useParamPresets";

interface Props {
  currentValues: PresetValues;
  onSelect: (preset: ParamPreset) => void;
}

const MAX_CUSTOM = 2;

export function ParamPresetPicker({ currentValues, onSelect }: Props) {
  const { t } = useI18n();
  const { presets, addPreset, removePreset } = useParamPresets();
  const customCount = presets.filter((p) => !p.system).length;
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSave() {
    if (!newName.trim()) return;
    const id = addPreset(newName.trim(), currentValues);
    setSelectedId(id);
    setNewName("");
    setAdding(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") { setAdding(false); setNewName(""); }
  }

  function handleSelect(preset: ParamPreset) {
    setSelectedId(preset.id);
    onSelect(preset);
  }

  return (
    <div className="flex flex-col items-end gap-1.5" data-id="param-preset-picker">
      <div className="flex flex-wrap items-center justify-end gap-1">
        {presets.map((preset) => {
          const isActive = preset.id === selectedId;
          return (
          <div key={preset.id} className="group relative" data-id={`preset-item-${preset.id}`}>
            <button
              type="button"
              data-id={`preset-badge-${preset.id}`}
              onClick={() => handleSelect(preset)}
              className={[
                "rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 transition-colors",
                isActive
                  ? "bg-[var(--accent-cyan)] text-[var(--surface)] ring-[var(--accent-cyan)]"
                  : "bg-[var(--card-face)]/12 text-[var(--card-face)]/80 ring-[var(--card-face)]/20 hover:bg-[var(--accent-cyan)]/25 hover:text-[var(--card-face)]",
              ].join(" ")}
            >
              {preset.name}
            </button>
            {!preset.system && (
              <button
                type="button"
                data-id={`preset-remove-${preset.id}`}
                onClick={() => { if (selectedId === preset.id) setSelectedId(null); removePreset(preset.id); }}
                aria-label="Supprimer ce preset"
                className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--accent-red)] text-[9px] font-black leading-none text-white group-hover:flex"
              >
                ×
              </button>
            )}
          </div>
          );
        })}
        {customCount < MAX_CUSTOM && (
          <button
            type="button"
            data-id="preset-add-trigger"
            onClick={() => setAdding((v) => !v)}
            aria-label={t("addPreset")}
            className="rounded-full bg-[var(--accent-yellow)]/20 px-2 py-0.5 text-xs font-black text-[var(--accent-yellow)] ring-1 ring-[var(--accent-yellow)]/40 transition-colors hover:bg-[var(--accent-yellow)]/35"
          >
            +
          </button>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-1.5" data-id="preset-add-form">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("presetName")}
            data-id="preset-name-input"
            className="w-28 rounded-lg bg-[rgba(255,250,242,0.12)] px-2 py-1 text-xs text-[var(--card-face)] outline-none ring-1 ring-[var(--accent-yellow)]/50 focus:ring-[var(--accent-yellow)]"
          />
          <button
            type="button"
            data-id="preset-save-button"
            onClick={handleSave}
            disabled={!newName.trim()}
            className="rounded-lg bg-[var(--accent-yellow)] px-2 py-1 text-xs font-bold text-[var(--surface)] disabled:opacity-40"
          >
            {t("savePreset")}
          </button>
          <button
            type="button"
            data-id="preset-cancel-button"
            onClick={() => { setAdding(false); setNewName(""); }}
            className="text-xs text-[var(--card-face)]/50 hover:text-[var(--card-face)]"
            aria-label="Annuler"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
