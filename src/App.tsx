import React, { useEffect, useMemo, useState } from 'react';
import { getTimes } from 'suncalc';
import { DEFAULT_FILTER_STATE, RESETTABLE_DEFAULTS, type FilterState } from './lib/messages';
import { calculateAutoKelvin } from './lib/auto-kelvin';
import TemperatureGraph from './components/TemperatureGraph';
import CityInput from './components/CityInput';
import TimeStepper from './components/TimeStepper';
import TransitionDropdown from './components/TransitionDropdown';
import type { City } from './lib/cities';

// === Утилиты для Hero-градиента ===
const KELVIN_STOPS = [
  { k: 6500, colors: ['#1e3a5f', '#1e40af', '#312e81'] },
  { k: 5500, colors: ['#1e3a5f', '#2d5a7b', '#1a365d'] },
  { k: 4000, colors: ['#5b3a1a', '#1e3a5f', '#2d1b4e'] },
  { k: 3400, colors: ['#7c2d12', '#1e3a5f', '#2d1b4e'] },
  { k: 2300, colors: ['#7c2d12', '#581c87', '#2d1b4e'] },
  { k: 1200, colors: ['#7f1d1d', '#581c87', '#1e1b4b'] },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

function kelvinToColors(kelvin: number): [string, string, string] {
  if (kelvin >= KELVIN_STOPS[0].k) return KELVIN_STOPS[0].colors as [string, string, string];
  const last = KELVIN_STOPS[KELVIN_STOPS.length - 1];
  if (kelvin <= last.k) return last.colors as [string, string, string];
  for (let i = 0; i < KELVIN_STOPS.length - 1; i++) {
    const high = KELVIN_STOPS[i];
    const low = KELVIN_STOPS[i + 1];
    if (kelvin <= high.k && kelvin >= low.k) {
      const t = (high.k - kelvin) / (high.k - low.k);
      return [
        lerpColor(high.colors[0], low.colors[0], t),
        lerpColor(high.colors[1], low.colors[1], t),
        lerpColor(high.colors[2], low.colors[2], t),
      ];
    }
  }
  return last.colors as [string, string, string];
}

function getSolarTimes(lat: number, lon: number) {
  try {
    const times = getTimes(new Date(), lat, lon);
    const sunrise = times.sunrise.getHours() + times.sunrise.getMinutes() / 60;
    const sunset = times.sunset.getHours() + times.sunset.getMinutes() / 60;
    return { sunrise, sunset };
  } catch {
    return { sunrise: 5.38, sunset: 20.78 };
  }
}

function getSolarCountdown(sunrise: number, sunset: number) {
  const now = new Date();
  const current = now.getHours() + now.getMinutes() / 60;
  const isDay = current >= sunrise && current <= sunset;

  if (isDay) {
    const diff = sunset - current;
    const h = Math.floor(diff);
    const m = Math.round((diff % 1) * 60);
    return `закат через ${h}ч ${m}м`;
  } else {
    let diff = 0;
    if (current > sunset) diff = 24 - current + sunrise;
    else diff = sunrise - current;
    const h = Math.floor(diff);
    const m = Math.round((diff % 1) * 60);
    return `рассвет через ${h}ч ${m}м`;
  }
}

function extractHostname(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol === 'chrome:' || u.protocol === 'chrome-extension:' || u.protocol === 'edge:' || u.protocol === 'about:') {
      return null;
    }
    return u.hostname || null;
  } catch {
    return null;
  }
}

// === Иконки ===
const IconPause = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const IconPlay = () => (
  <svg width="10" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const IconChevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const IconClock = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const IconGear = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconGearWhite = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconAuto = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    <polyline points="21 4 21 10 15 10" />
  </svg>
);

interface VisualEffect {
  id: string;
  name: string;
  desc: string;
  className: string;
}

const PRIMARY_EFFECTS: VisualEffect[] = [
  { id: 'classic', name: 'Классика', desc: 'Чистая температура без модификаций', className: 'featured-icon-classic' },
  { id: 'darkroom', name: 'Тёмная комната', desc: 'Красный оттенок для астрономии', className: 'featured-icon-darkroom' },
];

const HIDDEN_EFFECTS: VisualEffect[] = [
  { id: 'salt', name: 'Соляная лампа', desc: 'Розово-оранжевый, уютный', className: 'featured-icon-salt' },
  { id: 'bluesky', name: 'Голубое небо', desc: 'Холодный спектр для бодрости', className: 'featured-icon-bluesky' },
  { id: 'macular', name: 'Макулярный пигмент', desc: 'Подавление вредного синего', className: 'featured-icon-macular' },
  { id: 'emerald', name: 'Изумрудный город', desc: 'Успокаивающий зелёный', className: 'featured-icon-emerald' },
  { id: 'halftone', name: 'Полутоновый', desc: 'Художественная стилизация', className: 'featured-icon-halftone' },
  { id: 'soft', name: 'Мягкий белый', desc: 'Лёгкая десатурация', className: 'featured-icon-soft' },
  { id: 'himalaya', name: 'Гималайская лампа', desc: 'Глубокий тёплый с розовым', className: 'featured-icon-himalaya' },
  { id: 'twilight', name: 'Гражданские сумерки', desc: 'Фиолетовый переход', className: 'featured-icon-twilight' },
];

// === ПУЛЕНЕПРОБИВАЕМЫЙ ХУК СИНХРОНИЗАЦИИ ===
function useFilterState() {
  const [state, setState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [loaded, setLoaded] = useState(false);

  // 1. Загрузка при открытии
  useEffect(() => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        setLoaded(true);
        return;
      }
      chrome.runtime.sendMessage({ type: 'LUXFLOW_GET_STATE' }, (response) => {
        if (chrome.runtime.lastError) {
          setLoaded(true);
          return;
        }
        if (response && response.state) {
          setState(response.state);
          document.documentElement.setAttribute('data-theme', response.state.theme || 'light');
        }
        setLoaded(true);
      });
    } catch {
      setLoaded(true);
    }
  }, []);

  // 2. Дросселированная отправка при изменении state (чистый React способ)
  useEffect(() => {
    if (!loaded) return;

    const t = setTimeout(() => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: 'LUXFLOW_UPDATE', state });
        }
      } catch (err) {
        console.warn('[LuxFlow] Sync failed:', err);
      }
    }, 50); // отправка с задержкой 50мс (гладкое скольжение без лагов)

    return () => clearTimeout(t);
  }, [state, loaded]);

  const updateState = (patch: Partial<FilterState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const setPause = (durationMinutes: number) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
      chrome.runtime.sendMessage({ type: 'LUXFLOW_PAUSE', durationMinutes }, (response) => {
        if (response) {
          chrome.runtime.sendMessage({ type: 'LUXFLOW_GET_STATE' }, (res) => {
            if (res && res.state) setState(res.state);
          });
        }
      });
    } catch (err) {
      console.warn('[LuxFlow] setPause error:', err);
    }
  };

  const resume = () => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
      chrome.runtime.sendMessage({ type: 'LUXFLOW_RESUME' }, (response) => {
        if (response) {
          chrome.runtime.sendMessage({ type: 'LUXFLOW_GET_STATE' }, (res) => {
            if (res && res.state) setState(res.state);
          });
        }
      });
    } catch (err) {
      console.warn('[LuxFlow] resume error:', err);
    }
  };

  return { state, setState, updateState, setPause, resume, loaded };
}

export default function App() {
  const { state, setState, updateState, setPause, resume } = useFilterState();
  const [preset, setPreset] = useState<'day' | 'sunset' | 'sleep' | null>(null);
  const [cycleOpen, setCycleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [showAllEffects, setShowAllEffects] = useState(false);
  const [currentTabHost, setCurrentTabHost] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) return;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) return;
        const host = extractHostname(tabs[0]?.url);
        setCurrentTabHost(host);
      });
    } catch {}
  }, []);

  useEffect(() => {
    if (!state.paused || !state.pausedUntil) {
      setTimeLeft('');
      return;
    }
    const updateTimer = () => {
      const diff = state.pausedUntil - Date.now();
      if (diff <= 0) {
        setTimeLeft('');
        resume();
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}м ${s.toString().padStart(2, '0')}с`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [state.paused, state.pausedUntil]);

  const solar = useMemo(() => getSolarTimes(state.lat, state.lon), [state.lat, state.lon]);
  const solarCountdown = useMemo(() => getSolarCountdown(solar.sunrise, solar.sunset), [solar]);

  const [c1, c2, c3] = kelvinToColors(state.kelvin);
  const heroStyle = {
    '--hero-c1': c1,
    '--hero-c2': c2,
    '--hero-c3': c3,
  } as React.CSSProperties;

  const applyPreset = (p: 'day' | 'sunset' | 'sleep') => {
    setPreset(p);
    if (p === 'day') updateState({ kelvin: 5500, intensity: 15, autoMode: false });
    if (p === 'sunset') updateState({ kelvin: 3400, intensity: 35, autoMode: false });
    if (p === 'sleep') updateState({ kelvin: 2300, intensity: 55, autoMode: false });
  };

  const handleCitySave = (city: City) => {
    updateState({ city: city.name, lat: city.lat, lon: city.lon });
  };

  const handlePauseClick = () => {
    if (state.paused) resume();
    else setPause(60);
  };

  const handleKelvinChange = (k: number) => {
    updateState({ kelvin: k, autoMode: false });
  };

  const handleIntensityChange = (i: number) => {
    updateState({ intensity: i });
  };

  const handleReturnToAuto = () => {
    const autoK = calculateAutoKelvin({
      lat: state.lat, lon: state.lon,
      dayK: state.dayK, sunsetK: state.sunsetK, nightK: state.nightK,
      bedtimeHour: state.bedtimeHour, bedtimeMinute: state.bedtimeMinute,
      transitionMinutes: state.transitionMinutes,
    });
    updateState({ autoMode: true, kelvin: autoK });
    setPreset(null);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
    setTimeout(() => {
      const el = document.getElementById('luxflow-settings-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleAddCurrentSite = () => {
    if (!currentTabHost) return;
    setState((prev) => {
      if (prev.excludedDomains.includes(currentTabHost)) return prev;
      const next = { ...prev, excludedDomains: [...prev.excludedDomains, currentTabHost] };
      return next;
    });
  };

  const handleRemoveDomain = (domain: string) => {
    setState((prev) => {
      const next = { ...prev, excludedDomains: prev.excludedDomains.filter((x) => x !== domain) };
      return next;
    });
  };

  const currentSiteAlreadyExcluded = currentTabHost ? state.excludedDomains.includes(currentTabHost) : false;

  return (
    <div className="popup-frame">
      {/* ============ HERO ============ */}
      <div className="hero-bg" style={heroStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{ fontSize: '11px', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              LuxFlow · {state.city}
            </span>
            <span
              className={state.enabled ? 'status-dot active' : 'status-dot'}
              style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', flexShrink: 0 }}
              onClick={() => updateState({ enabled: !state.enabled })}
            >
              {state.enabled ? 'Вкл' : 'Выкл'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              className="hero-btn cursor-pointer"
              style={{
                width: timeLeft ? 'auto' : '24px',
                height: '24px',
                padding: timeLeft ? '0 8px' : '0',
                gap: '4px',
              }}
              onClick={handlePauseClick}
              title={state.paused ? 'Возобновить' : 'Пауза 1 час'}
            >
              {state.paused ? <IconPlay /> : <IconPause />}
              {timeLeft && <span className="num" style={{ fontSize: '10px', fontWeight: 600 }}>{timeLeft}</span>}
            </button>
                        <button
              className="hero-btn cursor-pointer"
              style={{ width: '24px', height: '24px' }}
              onClick={() => {
                const next = state.theme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', next);
                updateState({ theme: next });
              }}
              title={state.theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            >
              {state.theme === 'light' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
            <button
              className="hero-btn cursor-pointer"
              style={{ width: '24px', height: '24px' }}
              onClick={handleSettingsClick}
              title="Настройки"
            >
              <IconGearWhite />
            </button>
          </div>
        </div>

        <div className="num" style={{ fontSize: '42px', fontWeight: 100, lineHeight: 1 }}>
          {state.kelvin}
          <span style={{ fontSize: '16px', opacity: 0.4 }}>K</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0 14px' }}>
          <span style={{ fontSize: '11px', opacity: 0.5 }}>{solarCountdown}</span>
          <span style={{ opacity: 0.3, fontSize: '10px' }}>·</span>
          {state.autoMode ? (
            <span style={{
              fontSize: '10px', opacity: 0.7,
              background: 'rgba(255,255,255,0.15)', padding: '1px 6px',
              borderRadius: '999px', display: 'inline-flex',
              alignItems: 'center', gap: '4px', fontWeight: 500, letterSpacing: '0.05em',
            }}>
              <IconAuto /> АВТО
            </span>
          ) : (
            <button
              className="cursor-pointer"
              onClick={handleReturnToAuto}
              style={{
                fontSize: '10px', background: 'rgba(255,255,255,0.15)', color: 'white',
                padding: '1px 8px', borderRadius: '999px', border: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontWeight: 500, letterSpacing: '0.05em', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <IconAuto /> АВТО
            </button>
          )}
        </div>

        <div className="slider-header">
          <span className="slider-label">Температура</span>
          <span className="slider-value num">{state.kelvin}K</span>
        </div>
        <input
          type="range" className="slider-dark cursor-pointer"
          min={1200} max={6500} step={100} value={state.kelvin}
          onChange={(e) => handleKelvinChange(parseInt(e.target.value))}
        />

        <div className="slider-header" style={{ marginTop: '8px' }}>
          <span className="slider-label">Интенсивность</span>
          <span className="slider-value num">{state.intensity}%</span>
        </div>
        <input
          type="range" className="slider-dark cursor-pointer"
          min={0} max={100} value={state.intensity}
          onChange={(e) => handleIntensityChange(parseInt(e.target.value))}
        />
      </div>

      <div className="divider" />

      {/* ============ ГРАФИК ============ */}
      <TemperatureGraph
        dayK={state.dayK}
        sunsetK={state.sunsetK}
        nightK={state.nightK}
        sunriseHour={solar.sunrise}
        sunsetHour={solar.sunset}
        bedtimeHour={state.bedtimeHour + state.bedtimeMinute / 60}
      />

      <div className="divider" />

      {/* ============ ПРЕСЕТЫ ============ */}
      <div className="section" style={{ padding: '10px 20px' }}>
        <div className="segmented">
          <button
            className={`segmented-btn cursor-pointer ${preset === 'day' ? 'active' : ''}`}
            onClick={() => applyPreset('day')}
          >
            <span className="featured-icon featured-icon-sm featured-icon-day"></span>
            <span style={{ fontSize: '11px' }}>День</span>
          </button>
          <button
            className={`segmented-btn cursor-pointer ${preset === 'sunset' ? 'active' : ''}`}
            onClick={() => applyPreset('sunset')}
          >
            <span className="featured-icon featured-icon-sm featured-icon-sunset"></span>
            <span style={{ fontSize: '11px' }}>Закат</span>
          </button>
          <button
            className={`segmented-btn cursor-pointer ${preset === 'sleep' ? 'active' : ''}`}
            onClick={() => applyPreset('sleep')}
          >
            <span className="featured-icon featured-icon-sm featured-icon-night"></span>
            <span style={{ fontSize: '11px' }}>Сон</span>
          </button>
        </div>
      </div>

      <div className="divider" />

      {/* ============ СУТОЧНЫЙ ЦИКЛ ============ */}
      <div className="section" style={{ padding: '4px 20px' }}>
        <div className={cycleOpen ? 'accordion open' : 'accordion'}>
          <button
            className="accordion-trigger cursor-pointer"
            style={{ fontSize: '12px', padding: '10px 0' }}
            onClick={() => setCycleOpen(!cycleOpen)}
          >
            <span className="accordion-trigger-left">
              <span className="featured-icon featured-icon-sm featured-icon-cycle">
                <IconClock />
              </span>
              Суточный цикл
            </span>
            <span className="accordion-chevron">
              <IconChevron />
            </span>
          </button>
          <div className="accordion-body-wrap">
            <div className="accordion-body">
              <div className="accordion-body-inner">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="featured-icon featured-icon-sm featured-icon-day"></span>
                    <span style={{ fontSize: '11px', minWidth: '52px', color: 'var(--gray-700)' }}>Дневной</span>
                    <input
                      type="range" className="slider-gradient-day cursor-pointer"
                      min={4000} max={6500} step={100} value={state.dayK}
                      onChange={(e) => updateState({ dayK: parseInt(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span className="num" style={{ fontSize: '10px', color: 'var(--gray-700)', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>
                      {state.dayK}K
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="featured-icon featured-icon-sm featured-icon-sunset"></span>
                    <span style={{ fontSize: '11px', minWidth: '52px', color: 'var(--gray-700)' }}>Вечер</span>
                    <input
                      type="range" className="slider-gradient-evening cursor-pointer"
                      min={2500} max={4000} step={100} value={state.sunsetK}
                      onChange={(e) => updateState({ sunsetK: parseInt(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span className="num" style={{ fontSize: '10px', color: 'var(--gray-700)', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>
                      {state.sunsetK}K
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="featured-icon featured-icon-sm featured-icon-night"></span>
                    <span style={{ fontSize: '11px', minWidth: '52px', color: 'var(--gray-700)' }}>Ночной</span>
                    <input
                      type="range" className="slider-gradient-night cursor-pointer"
                      min={1200} max={2500} step={100} value={state.nightK}
                      onChange={(e) => updateState({ nightK: parseInt(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span className="num" style={{ fontSize: '10px', color: 'var(--gray-700)', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>
                      {state.nightK}K
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* ============ ЭФФЕКТЫ ============ */}
      <div className="section" style={{ padding: '10px 16px' }}>
        <div className="section-title" style={{ padding: '0 4px' }}>Эффекты</div>
        <div className="radio-list">
          {PRIMARY_EFFECTS.map((eff) => (
            <label
              key={eff.id}
              className={`radio-item cursor-pointer ${state.effect === eff.id ? 'active' : ''}`}
              style={{ padding: '6px 8px' }}
              onClick={() => updateState({ effect: eff.id })}
            >
              <span className={`radio-item-icon ${eff.className}`} style={{ width: '24px', height: '24px' }}></span>
              <span className="radio-item-text">
                <span className="radio-item-name" style={{ fontSize: '12px' }}>{eff.name}</span>
                <span className="radio-item-desc" style={{ fontSize: '10px' }}>{eff.desc}</span>
              </span>
              <span className="radio-circle" style={{ width: '16px', height: '16px' }}>
                <span className="radio-dot" style={{ width: '6px', height: '6px' }}></span>
              </span>
            </label>
          ))}

          <div
            className={`radio-show-more cursor-pointer ${showAllEffects ? 'expanded' : ''}`}
            style={{ fontSize: '11px', padding: '6px' }}
            onClick={() => setShowAllEffects(!showAllEffects)}
          >
            <span className="radio-show-more-text">
              {showAllEffects ? 'Свернуть' : `Ещё ${HIDDEN_EFFECTS.length} эффектов`}
            </span>
            <svg
              className="radio-show-more-icon"
              style={{ width: '12px', height: '12px', transform: showAllEffects ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          {showAllEffects && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {HIDDEN_EFFECTS.map((eff) => (
                <label
                  key={eff.id}
                  className={`radio-item cursor-pointer ${state.effect === eff.id ? 'active' : ''}`}
                  style={{ padding: '6px 8px' }}
                  onClick={() => updateState({ effect: eff.id })}
                >
                  <span className={`radio-item-icon ${eff.className}`} style={{ width: '24px', height: '24px' }}></span>
                  <span className="radio-item-text">
                    <span className="radio-item-name" style={{ fontSize: '12px' }}>{eff.name}</span>
                    <span className="radio-item-desc" style={{ fontSize: '10px' }}>{eff.desc}</span>
                  </span>
                  <span className="radio-circle" style={{ width: '16px', height: '16px' }}>
                    <span className="radio-dot" style={{ width: '6px', height: '6px' }}></span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="divider" />

      {/* ============ НАСТРОЙКИ ============ */}
      <div id="luxflow-settings-anchor" className="section" style={{ padding: '4px 20px' }}>
        <div className={settingsOpen ? 'accordion open' : 'accordion'}>
          <button
            className="accordion-trigger cursor-pointer"
            style={{ fontSize: '12px', padding: '10px 0' }}
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <span className="accordion-trigger-left">
              <span className="featured-icon featured-icon-sm featured-icon-settings">
                <IconGear />
              </span>
              Настройки
            </span>
            <span className="accordion-chevron">
              <IconChevron />
            </span>
          </button>
          <div className="accordion-body-wrap">
            <div className="accordion-body">
              <div className="accordion-body-inner">
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginBottom: '6px', fontWeight: 500 }}>
                    Город
                  </div>
                  <CityInput currentCity={state.city} onSave={handleCitySave} />
                  <div className="input-hint" style={{ fontSize: '10px', marginTop: '6px' }}>
                    Восход {Math.floor(solar.sunrise).toString().padStart(2, '0')}:
                    {Math.round((solar.sunrise % 1) * 60).toString().padStart(2, '0')} · Закат{' '}
                    {Math.floor(solar.sunset).toString().padStart(2, '0')}:
                    {Math.round((solar.sunset % 1) * 60).toString().padStart(2, '0')}
                  </div>
                </div>
                <div className="setting-row" style={{ marginBottom: '10px' }}>
                  <span className="setting-label" style={{ fontSize: '12px' }}>Время сна</span>
                  <TimeStepper
                    hour={state.bedtimeHour}
                    minute={state.bedtimeMinute}
                    defaultHour={RESETTABLE_DEFAULTS.bedtimeHour}
                    defaultMinute={RESETTABLE_DEFAULTS.bedtimeMinute}
                    onChange={(h, m) => updateState({ bedtimeHour: h, bedtimeMinute: m })}
                    onReset={() =>
                      updateState({
                        bedtimeHour: RESETTABLE_DEFAULTS.bedtimeHour,
                        bedtimeMinute: RESETTABLE_DEFAULTS.bedtimeMinute,
                      })
                    }
                  />
                </div>
                <div className="setting-row">
                  <span className="setting-label" style={{ fontSize: '12px' }}>Переход</span>
                  <TransitionDropdown
                    value={state.transitionMinutes}
                    defaultValue={RESETTABLE_DEFAULTS.transitionMinutes}
                    onChange={(v) => updateState({ transitionMinutes: v })}
                    onReset={() =>
                      updateState({ transitionMinutes: RESETTABLE_DEFAULTS.transitionMinutes })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="divider" />

      {/* ============ УПРАВЛЕНИЕ ============ */}
      <div className="section" style={{ padding: '10px 20px' }}>
        <div className="setting-row" style={{ marginBottom: '10px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Полноэкранный режим</span>
            <div style={{ fontSize: '10px', color: 'var(--gray-400)' }}>Отключать фильтр в fullscreen</div>
          </div>
          <label className="toggle toggle-sm cursor-pointer">
            <input
              type="checkbox"
              checked={state.disableFullscreen}
              onChange={(e) => updateState({ disableFullscreen: e.target.checked })}
            />
            <span className="toggle-track"></span>
            <span className="toggle-thumb"></span>
          </label>
        </div>

        <div className="setting-row" style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500 }}>Кино-режим</span>
          <label className="toggle toggle-sm cursor-pointer">
            <input
              type="checkbox"
              checked={state.cinemaMode}
              onChange={(e) => updateState({ cinemaMode: e.target.checked })}
            />
            <span className="toggle-track"></span>
            <span className="toggle-thumb"></span>
          </label>
        </div>

        {state.cinemaMode && (
          <div style={{ padding: '4px 0 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Виньетка</span>
              <span className="num" style={{ fontSize: '11px', color: 'var(--gray-700)', fontWeight: 600 }}>
                {state.vignetteIntensity}%
              </span>
            </div>
            <input
              type="range" className="slider-light cursor-pointer"
              min={0} max={100} value={state.vignetteIntensity}
              onChange={(e) => updateState({ vignetteIntensity: parseInt(e.target.value) })}
            />
          </div>
        )}

        {/* Исключения */}
        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '10px', marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="setting-section-title">Исключения</span>
            {currentTabHost && !currentSiteAlreadyExcluded && (
              <button
                className="btn btn-secondary btn-sm cursor-pointer"
                style={{ fontSize: '10px', padding: '3px 8px', height: '22px' }}
                onClick={handleAddCurrentSite}
                title={`Добавить ${currentTabHost}`}
              >
                + Текущий сайт
              </button>
            )}
            {currentTabHost && currentSiteAlreadyExcluded && (
              <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontWeight: 500 }}>
                ✓ В исключениях
              </span>
            )}
          </div>

          {currentTabHost && (
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
              Текущий: {currentTabHost}
            </div>
          )}

          {state.excludedDomains.length === 0 ? (
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              Список пуст
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {state.excludedDomains.map((d) => (
                <div key={d} className="excluded-domain-item">
                  <span className="excluded-domain-text">{d}</span>
                  <button
                    className="excluded-domain-remove cursor-pointer"
                    onClick={() => handleRemoveDomain(d)}
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

                {/* Горячие клавиши */}
                {/* Горячие клавиши */}
        <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '10px', marginTop: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-emphasis)', marginBottom: '6px' }}>
            Горячие клавиши
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Пауза / Возобновить</span>
              <span className="badge-mono">Alt+P</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Вкл / Выкл фильтр</span>
              <span className="badge-mono">Alt+F</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Вкл / Выкл расширение</span>
              <span className="badge-mono">Alt+E</span>
            </div>
          </div>
          <a
            href="chrome://extensions/shortcuts"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
            style={{ fontSize: '10px', color: 'var(--color-accent)', marginTop: '6px', display: 'inline-block', textDecoration: 'none' }}
            onClick={(e) => {
              e.preventDefault();
              try { chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); } catch {}
            }}
          >
            Изменить →
          </a>
        </div>
      </div>

      <div className="divider" />

            {/* ============ ПОДВАЛ ============ */}
      <div
        className="section"
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 20px 14px',
        }}
      >
        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>LuxFlow v1.0</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <a
            className="link cursor-pointer"
            href="https://github.com/graphica-online/LuxFlow"
            style={{ fontSize: '11px' }}
            onClick={(e) => {
              e.preventDefault();
              try { chrome.tabs.create({ url: 'https://github.com/graphica-online/LuxFlow' }); } catch {}
            }}
          >
            GitHub
          </a>
          <span style={{ color: 'var(--color-text-light)', fontSize: '11px' }}>·</span>
          <a
            className="link cursor-pointer"
            href="https://github.com/graphica-online/LuxFlow#readme"
            style={{ fontSize: '11px' }}
            onClick={(e) => {
              e.preventDefault();
              try { chrome.tabs.create({ url: 'https://github.com/graphica-online/LuxFlow#readme' }); } catch {}
            }}
          >
            О проекте
          </a>
        </div>
      </div>
    </div>
  );
}