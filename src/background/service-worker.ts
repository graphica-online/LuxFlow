import {
  DEFAULT_FILTER_STATE,
  isLuxFlowMessage,
  type FilterState,
} from '../lib/messages';
import { loadState, saveState } from '../lib/storage';
import { calculateAutoKelvin } from '../lib/auto-kelvin';
import { detectLocation } from '../lib/geo';

const PAUSE_ALARM_NAME = 'luxflow_pause_alarm';
const AUTO_TICK_ALARM_NAME = 'luxflow_auto_tick';

console.log('[LuxFlow] Service Worker: loaded');

async function broadcastToTabs(state: FilterState): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs.sendMessage(tab.id, { type: 'LUXFLOW_UPDATE', state }).catch(() => {});
    }
  } catch (err) {
    console.warn('[LuxFlow] broadcast failed:', err);
  }
}

async function tickAutoKelvin(): Promise<void> {
  const state = await loadState();
  if (!state.autoMode || !state.enabled) return;

  const newK = calculateAutoKelvin({
    lat: state.lat, lon: state.lon,
    dayK: state.dayK, sunsetK: state.sunsetK, nightK: state.nightK,
    bedtimeHour: state.bedtimeHour, bedtimeMinute: state.bedtimeMinute,
    transitionMinutes: state.transitionMinutes,
  });

  if (Math.abs(newK - state.kelvin) < 10) return;

  const updated = { ...state, kelvin: newK };
  await saveState(updated);
  broadcastToTabs(updated);
}

async function ensureAutoTickAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(AUTO_TICK_ALARM_NAME);
  if (!existing) {
    await chrome.alarms.create(AUTO_TICK_ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: 5,
    });
  }
}

// === Горячие клавиши ===
chrome.commands.onCommand.addListener(async (command) => {
  const state = await loadState();

  if (command === 'toggle-pause') {
    if (state.paused) {
      const updated = { ...state, paused: false, pausedUntil: 0 };
      await saveState(updated);
      await chrome.alarms.clear(PAUSE_ALARM_NAME);
      broadcastToTabs(updated);
    } else {
      const pausedUntil = Date.now() + 60 * 60 * 1000;
      const updated = { ...state, paused: true, pausedUntil };
      await saveState(updated);
      await chrome.alarms.create(PAUSE_ALARM_NAME, { delayInMinutes: 60 });
      broadcastToTabs(updated);
    }
    return;
  }

  if (command === 'toggle-filter') {
    // Toggle основного фильтра (Вкл/Выкл overlay, но расширение остаётся активным)
    const updated = { ...state, enabled: !state.enabled };
    await saveState(updated);
    broadcastToTabs(updated);
    return;
  }

  if (command === 'toggle-extension') {
    // Полное отключение: enabled=false + paused=false + autoMode=false
    if (state.enabled) {
      const updated = { ...state, enabled: false, paused: false, pausedUntil: 0, autoMode: false };
      await saveState(updated);
      await chrome.alarms.clear(PAUSE_ALARM_NAME);
      broadcastToTabs(updated);
    } else {
      const updated = { ...state, enabled: true, autoMode: true };
      await saveState(updated);
      broadcastToTabs(updated);
      tickAutoKelvin();
    }
    return;
  }
});

// === Обработчик сообщений ===
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isLuxFlowMessage(message)) return false;

  if (message.type === 'LUXFLOW_GET_STATE') {
    loadState().then(async (state) => {
      if (state.paused && state.pausedUntil > 0 && Date.now() > state.pausedUntil) {
        const updated = { ...state, paused: false, pausedUntil: 0 };
        await saveState(updated);
        broadcastToTabs(updated);
        sendResponse({ state: updated });
      } else {
        sendResponse({ state });
      }
    });
    return true;
  }

  if (message.type === 'LUXFLOW_UPDATE') {
    saveState(message.state).then(() => {
      broadcastToTabs(message.state);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'LUXFLOW_PAUSE') {
    const pausedUntil = Date.now() + message.durationMinutes * 60 * 1000;
    loadState().then(async (state) => {
      const updated = { ...state, paused: true, pausedUntil };
      await saveState(updated);
      await chrome.alarms.create(PAUSE_ALARM_NAME, { delayInMinutes: message.durationMinutes });
      broadcastToTabs(updated);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'LUXFLOW_RESUME') {
    loadState().then(async (state) => {
      const updated = { ...state, paused: false, pausedUntil: 0 };
      await saveState(updated);
      await chrome.alarms.clear(PAUSE_ALARM_NAME);
      broadcastToTabs(updated);
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});

// === Alarm handlers ===
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PAUSE_ALARM_NAME) {
    loadState().then(async (state) => {
      const updated = { ...state, paused: false, pausedUntil: 0 };
      await saveState(updated);
      broadcastToTabs(updated);
    });
  }
  if (alarm.name === AUTO_TICK_ALARM_NAME) {
    tickAutoKelvin();
  }
});

// === Tab update ===
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  loadState().then((state) => {
    chrome.tabs.sendMessage(tabId, { type: 'LUXFLOW_UPDATE', state }).catch(() => {});
  });
});

// === Install / Startup ===
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[LuxFlow] Installed:', details.reason);
  if (details.reason === 'install') {
    try {
      const detected = await detectLocation();
      const initialState = {
        ...DEFAULT_FILTER_STATE,
        city: detected.city,
        lat: detected.lat,
        lon: detected.lon,
      };
      await saveState(initialState);
    } catch {
      await saveState(DEFAULT_FILTER_STATE);
    }
  } else {
    const current = await loadState();
    await saveState(current);
  }
  await ensureAutoTickAlarm();
  tickAutoKelvin();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAutoTickAlarm();
  tickAutoKelvin();
});

ensureAutoTickAlarm();