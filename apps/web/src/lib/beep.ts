'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'attendance_beep_enabled';
const EVENT_NAME = 'beep-setting-changed';

export function getBeepEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function setBeepEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: enabled }));
}

/** Shared "Beep On/Off" preference, kept in sync across every page in the workspace. */
export function useBeepEnabled(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(getBeepEnabled);

  useEffect(() => {
    const handler = (e: Event) => setEnabled((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return [enabled, setBeepEnabled];
}

export function playBeep(success: boolean) {
  if (!getBeepEnabled() || typeof window === 'undefined') return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (success) {
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.12);
      }, 80);
    } else {
      osc.frequency.setValueAtTime(180, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch (_) {
    // Audio unsupported/blocked - ignore.
  }
}
