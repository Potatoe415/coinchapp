"use client";

import { useI18n } from "@/lib/client/i18n";
import { BOT_PUNCH_LEVELS, type BotPunch } from "@/lib/coinche";
import { ParamPresetPicker } from "./ParamPresetPicker";
import type { ParamPreset } from "@/lib/client/useParamPresets";

export interface GameSetupValues {
  target: number;
  countContractOnlyIfMade: boolean;
  failedContractDefensePoints: string;
  zeroPointsForNonContractingTeamWhenContractMade: boolean;
  capotMadePoints: string;
  capotFailedDefensePoints: string;
  allowToutAtoutSansAtout: boolean;
  requireMorePointsToWin: boolean;
  botPunch: BotPunch;
  /** Seconds of silence on a human's turn before the "are you still there?"
   *  idle timer kicks in. Shared by both games (see docs/DATA_MODEL.md). */
  stillThereTimeoutSec: number;
}

export const DEFAULT_GAME_SETUP: GameSetupValues = {
  target: 1000,
  countContractOnlyIfMade: true,
  failedContractDefensePoints: "160",
  zeroPointsForNonContractingTeamWhenContractMade: true,
  capotMadePoints: "250",
  capotFailedDefensePoints: "250",
  allowToutAtoutSansAtout: false,
  requireMorePointsToWin: true,
  botPunch: "med",
  stillThereTimeoutSec: 15,
};

const TARGETS = [500, 1000, 1500, 2000];
const STILL_THERE_TIMEOUTS = [10, 15, 20, 30];
const PUNCH_LABEL_KEY = { low: "punchLow", med: "punchMed", high: "punchHigh" } as const;

interface ToggleProps {
  checked: boolean;
  onToggle: () => void;
  dataId: string;
}

function ToggleSwitch({ checked, onToggle, dataId }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-id={dataId}
      onClick={onToggle}
      className={[
        "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
        checked ? "bg-[var(--accent-yellow)]" : "bg-[var(--card-face)]/20",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

interface Props {
  values: GameSetupValues;
  onChange: (next: GameSetupValues) => void;
  /** Prefix for data-id attributes, e.g. "local" or "online". */
  idPrefix: string;
  title: string;
  /** Whether to show the Coinche-only fields (points/capot/preset picker/etc.).
   *  Defaults to true. */
  coincheFields?: boolean;
  /** Whether to show the shared idle-turn timer field. Online-only: local and
   *  ad-hoc games never run the server-side idle timer, so it would be dead UI
   *  there. Defaults to false. */
  showStillThereTimeout?: boolean;
}

export function GameSettingsPanel({
  values,
  onChange,
  idPrefix,
  title,
  coincheFields = true,
  showStillThereTimeout = false,
}: Props) {
  const { t } = useI18n();

  function set<K extends keyof GameSetupValues>(key: K, val: GameSetupValues[K]) {
    onChange({ ...values, [key]: val });
  }

  function applyPreset(preset: ParamPreset) {
    onChange({
      ...values,
      capotMadePoints: String(preset.capotMadePoints),
      capotFailedDefensePoints: String(preset.capotFailedDefensePoints),
      countContractOnlyIfMade: preset.countContractOnlyIfMade,
      failedContractDefensePoints: String(preset.failedContractDefensePoints),
      zeroPointsForNonContractingTeamWhenContractMade: preset.zeroPointsForNonContractingTeamWhenContractMade,
    });
  }

  return (
    <section
      className="rounded-2xl bg-[var(--surface)] p-5 text-[var(--card-face)] shadow-lg ring-1 ring-[var(--accent-cyan)]/25"
      data-id={`${idPrefix}-settings-card`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {coincheFields && (
          <ParamPresetPicker
            currentValues={{
              capotMadePoints: Number(values.capotMadePoints) || 250,
              capotFailedDefensePoints: Number(values.capotFailedDefensePoints) || 250,
              countContractOnlyIfMade: values.countContractOnlyIfMade,
              failedContractDefensePoints: Number(values.failedContractDefensePoints) || 160,
              zeroPointsForNonContractingTeamWhenContractMade: values.zeroPointsForNonContractingTeamWhenContractMade,
            }}
            onSelect={applyPreset}
          />
        )}
      </div>
      <div className="grid grid-cols-1 gap-3">
        {showStillThereTimeout && (
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-[var(--card-face)]/75">{t("stillThereTimeout")}</span>
            <select
              data-id={`${idPrefix}-still-there-timeout-select`}
              value={values.stillThereTimeoutSec}
              onChange={(e) => set("stillThereTimeoutSec", Number(e.target.value))}
              className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
            >
              {STILL_THERE_TIMEOUTS.map((seconds) => (
                <option key={seconds} value={seconds}>{seconds}s</option>
              ))}
            </select>
          </label>
        )}
        {coincheFields && (
          <>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--card-face)]/75">{t("pointsCount")}</span>
              <select
                data-id={`${idPrefix}-target-select`}
                value={values.target}
                onChange={(e) => set("target", Number(e.target.value))}
                className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
              >
                {TARGETS.map((p) => (
                  <option key={p} value={p}>{p} points</option>
                ))}
              </select>
            </label>
            <label
              className="flex items-center justify-between gap-3 text-sm"
              data-id={`${idPrefix}-count-contract-only-checkbox-row`}
            >
              <span className="text-[var(--card-face)]/75">{t("localOnlyContractPoints")}</span>
              <ToggleSwitch
                checked={values.countContractOnlyIfMade}
                onToggle={() => set("countContractOnlyIfMade", !values.countContractOnlyIfMade)}
                dataId={`${idPrefix}-count-contract-only-checkbox`}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--card-face)]/75">{t("failedContract")}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                data-id={`${idPrefix}-failed-contract-points-input`}
                value={values.failedContractDefensePoints}
                onChange={(e) => set("failedContractDefensePoints", e.target.value)}
                placeholder="160"
                className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--card-face)]/75">{t("opponentPoints")}</span>
              <ToggleSwitch
                checked={!values.zeroPointsForNonContractingTeamWhenContractMade}
                onToggle={() =>
                  set(
                    "zeroPointsForNonContractingTeamWhenContractMade",
                    !values.zeroPointsForNonContractingTeamWhenContractMade,
                  )
                }
                dataId={`${idPrefix}-opponent-points-switch`}
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--card-face)]/75">{t("capot")}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                data-id={`${idPrefix}-capot-made-points-input`}
                value={values.capotMadePoints}
                onChange={(e) => set("capotMadePoints", e.target.value)}
                placeholder="250"
                className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--card-face)]/75">{t("failedCapot")}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                data-id={`${idPrefix}-capot-failed-defense-points-input`}
                value={values.capotFailedDefensePoints}
                onChange={(e) => set("capotFailedDefensePoints", e.target.value)}
                placeholder="250"
                className="w-40 rounded-lg bg-[rgba(255,250,242,0.12)] px-3 py-2 ring-1 ring-[var(--accent-cyan)]/25"
              />
            </label>
            <label
              className="flex items-center justify-between gap-3 text-sm"
              data-id={`${idPrefix}-allow-special-bids-row`}
            >
              <span className="text-[var(--card-face)]/75">{t("allowSpecialBids")}</span>
              <ToggleSwitch
                checked={values.allowToutAtoutSansAtout}
                onToggle={() => set("allowToutAtoutSansAtout", !values.allowToutAtoutSansAtout)}
                dataId={`${idPrefix}-allow-special-bids-switch`}
              />
            </label>
            <label
              className="flex items-center justify-between gap-3 text-sm"
              data-id={`${idPrefix}-require-more-points-row`}
            >
              <span className="text-[var(--card-face)]/75">{t("requireMorePointsToWin")}</span>
              <ToggleSwitch
                checked={values.requireMorePointsToWin}
                onToggle={() => set("requireMorePointsToWin", !values.requireMorePointsToWin)}
                dataId={`${idPrefix}-require-more-points-switch`}
              />
            </label>
            <div className="flex flex-col gap-1.5 text-sm" data-id={`${idPrefix}-bot-punch-row`}>
              <div className="flex items-center justify-between">
                <span className="text-[var(--card-face)]/75">{t("botLevel")}</span>
                <span
                  className="font-bold text-[var(--accent-yellow)]"
                  data-id={`${idPrefix}-bot-punch-value`}
                >
                  {t(PUNCH_LABEL_KEY[values.botPunch])}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={BOT_PUNCH_LEVELS.length - 1}
                step={1}
                value={BOT_PUNCH_LEVELS.indexOf(values.botPunch)}
                onChange={(e) => set("botPunch", BOT_PUNCH_LEVELS[Number(e.target.value)])}
                data-id={`${idPrefix}-bot-punch-slider`}
                className="w-full accent-[var(--accent-yellow)]"
              />
              <div className="flex justify-between text-xs text-[var(--card-face)]/50">
                <span>{t("punchLow")}</span>
                <span>{t("punchMed")}</span>
                <span>{t("punchHigh")}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
