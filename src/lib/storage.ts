/**
 * LuxFlow — обёртка над chrome.storage.local.
 *
 * - Типизированное чтение / запись.
 * - Дефолты возвращаются, если ключа нет.
 * - try/catch — работает и в dev-режиме (без chrome API).
 */

import { DEFAULT_FILTER_STATE, type FilterState } from './messages';

const STORAGE_KEY = 'luxflow_state';

/** Прочитать состояние фильтра. Если storage недоступен — вернёт дефолт. */
export async function loadState(): Promise<FilterState> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return DEFAULT_FILTER_STATE;
    }
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const stored = data[STORAGE_KEY];
    if (!stored || typeof stored !== 'object') {
      return DEFAULT_FILTER_STATE;
    }
    // Мержим с дефолтами (защита от отсутствующих полей после апдейта)
    return { ...DEFAULT_FILTER_STATE, ...stored } as FilterState;
  } catch (err) {
    console.warn('[LuxFlow] Failed to load state:', err);
    return DEFAULT_FILTER_STATE;
  }
}

/** Сохранить состояние фильтра. */
export async function saveState(state: FilterState): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return;
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
  } catch (err) {
    console.warn('[LuxFlow] Failed to save state:', err);
  }
}