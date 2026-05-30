/**
 * useTrial — single source of truth for the 14-day free trial countdown.
 *
 * Reads from the `fuelpro_trial` localStorage key, supports both schemas:
 *  - { startedAt: epochMs, ... }          (written by TrialGate / subscriptionStore)
 *  - { trialStartedAt: ISO string, ... }  (written by lib/subscription.ts)
 */
import { useState, useEffect } from 'react';

/** 14-day trial, matching lib/subscription.ts */
export const TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

export interface TrialState {
  startedAt: number;
  isExpired: boolean;
  msLeft: number;
  isPaid: boolean;
  isInTrial: boolean;
  timeDisplay: string;
  timeDisplayLong: string;
  totalSeconds: number;
  progressPercent: number;
}

function readTrialState(): { startedAt: number; isExpired: boolean; msLeft: number } {
  try {
    const raw = localStorage.getItem('fuelpro_trial');
    if (!raw) {
      return { startedAt: Date.now(), isExpired: false, msLeft: TRIAL_MS };
    }
    const data = JSON.parse(raw);

    // Paid subscription — never expires from TrialGate perspective
    if (data.status === 'paid') return { startedAt: 0, isExpired: false, msLeft: Infinity };

    // Support both epoch-ms and ISO string schemas
    let startedAt: number;
    if (Number.isFinite(data.startedAt)) {
      startedAt = data.startedAt;
    } else if (data.trialStartedAt) {
      const parsed = Date.parse(data.trialStartedAt);
      startedAt = Number.isFinite(parsed) ? parsed : Date.now();
    } else {
      startedAt = Date.now();
    }

    // Guard against future/NaN timestamps
    if (!Number.isFinite(startedAt) || startedAt > Date.now()) {
      startedAt = Date.now();
    }

    const msLeft = Math.max(0, TRIAL_MS - (Date.now() - startedAt));
    return { startedAt, isExpired: msLeft <= 0, msLeft };
  } catch {
    return { startedAt: Date.now(), isExpired: false, msLeft: TRIAL_MS };
  }
}

function buildDisplay(msLeft: number, isPaid: boolean) {
  if (isPaid) return { timeDisplay: '∞', timeDisplayLong: '∞' };

  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const timeDisplayLong = `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  let timeDisplay: string;
  if (days > 0) timeDisplay = `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  else if (hours > 0) timeDisplay = `${hours}h ${pad(mins)}m ${pad(secs)}s`;
  else timeDisplay = `${pad(mins)}m ${pad(secs)}s`;

  return { timeDisplay, timeDisplayLong };
}

export function useTrial(): TrialState {
  const [raw, setRaw] = useState(readTrialState);

  useEffect(() => {
    const interval = setInterval(() => setRaw(readTrialState()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { msLeft, startedAt, isExpired } = raw;
  const isPaid = msLeft === Infinity;
  const isInTrial = !isExpired && !isPaid;
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const progressPercent = isPaid ? 100 : Math.max(0, Math.min(100, (msLeft / TRIAL_MS) * 100));
  const { timeDisplay, timeDisplayLong } = buildDisplay(msLeft, isPaid);

  const isExpiredFinal = isExpired && !isPaid;

  return {
    startedAt,
    isExpired: isExpiredFinal,
    msLeft,
    isPaid,
    isInTrial,
    timeDisplay,
    timeDisplayLong,
    totalSeconds,
    progressPercent,
  } as TrialState;
}

export function markTrialPaid() {
  try {
    const raw = localStorage.getItem('fuelpro_trial');
    const data = raw ? JSON.parse(raw) : {};
    data.status = 'paid';
    localStorage.setItem('fuelpro_trial', JSON.stringify(data));
  } catch { /* */ }
}
