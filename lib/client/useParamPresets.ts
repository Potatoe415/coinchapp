import { useState } from "react";

export interface ParamPreset {
  id: string;
  name: string;
  system: boolean;
  capotMadePoints: number;
  capotFailedDefensePoints: number;
  countContractOnlyIfMade: boolean;
  failedContractDefensePoints: number;
  zeroPointsForNonContractingTeamWhenContractMade: boolean;
}

export type PresetValues = Omit<ParamPreset, "id" | "name" | "system">;

const SYSTEM_PRESETS: ParamPreset[] = [
  {
    id: "P1",
    name: "P1",
    system: true,
    capotMadePoints: 250,
    capotFailedDefensePoints: 250,
    countContractOnlyIfMade: false,
    failedContractDefensePoints: 160,
    zeroPointsForNonContractingTeamWhenContractMade: true,
  },
  {
    id: "P2",
    name: "P2",
    system: true,
    capotMadePoints: 250,
    capotFailedDefensePoints: 250,
    countContractOnlyIfMade: false,
    failedContractDefensePoints: 160,
    zeroPointsForNonContractingTeamWhenContractMade: true,
  },
];

const STORAGE_KEY = "coinchapp:param-presets";

function loadCustom(): ParamPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ParamPreset[]) : [];
  } catch {
    return [];
  }
}

function persist(presets: ParamPreset[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function useParamPresets() {
  const [custom, setCustom] = useState<ParamPreset[]>(loadCustom);

  const presets = [...SYSTEM_PRESETS, ...custom];

  function addPreset(name: string, values: PresetValues): string {
    const id = `custom-${Date.now()}`;
    const next = [...custom, { ...values, id, name, system: false }];
    setCustom(next);
    persist(next);
    return id;
  }

  function removePreset(id: string): void {
    const next = custom.filter((p) => p.id !== id);
    setCustom(next);
    persist(next);
  }

  return { presets, addPreset, removePreset };
}
