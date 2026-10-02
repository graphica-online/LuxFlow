/**
 * LuxFlow — Content Script (Автономная версия).
 *
 * Все функции расчета цвета встроены напрямую, чтобы избежать багов сборщика Vite/CRXJS.
 */

const OVERLAY_HOST_ID = 'luxflow-overlay-host';
const OVERLAY_Z_INDEX = '2147483646';

// === Встроенные типы ===
interface RGB {
  r: number;
  g: number;
  b: number;
}

interface FilterState {
  enabled: boolean;
  kelvin: number;
  intensity: number;
  paused: boolean;
  pausedUntil: number;
  autoMode: boolean;
  effect: string;
  cinemaMode: boolean;
  vignetteIntensity: number;
  excludedDomains: string[];
  disableFullscreen: boolean;
}

interface EffectModifier {
  tint?: RGB;
  tintAmount?: number;
  filter?: string;
}

// === Встроенный алгоритм Tanner Helland (Kelvin -> RGB) ===
function kelvinToRGB(kelvin: number): RGB {
  const temp = kelvin / 100;
  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
  }

  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
  }

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
}

function rgbToCss(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

// === Встроенные модификаторы эффектов ===
const EFFECT_MODIFIERS: Record<string, EffectModifier> = {
  classic: {},
  darkroom: { tint: { r: 220, g: 0, b: 0 }, tintAmount: 0.55 },
  salt: { tint: { r: 255, g: 150, b: 180 }, tintAmount: 0.3 },
  bluesky: { tint: { r: 120, g: 180, b: 255 }, tintAmount: 0.4 },
  macular: { tint: { r: 220, g: 220, b: 100 }, tintAmount: 0.3, filter: 'saturate(0.9)' },
  emerald: { tint: { r: 100, g: 220, b: 150 }, tintAmount: 0.35 },
  halftone: { filter: 'contrast(1.15) saturate(0.65)' },
  soft: { filter: 'brightness(1.03) saturate(0.9)' },
  himalaya: { tint: { r: 255, g: 130, b: 160 }, tintAmount: 0.4 },
  twilight: { tint: { r: 130, g: 130, b: 220 }, tintAmount: 0.4 },
};

function tintColor(base: RGB, tint: RGB, amount: number): RGB {
  return {
    r: Math.round(base.r * (1 - amount) + tint.r * amount),
    g: Math.round(base.g * (1 - amount) + tint.g * amount),
    b: Math.round(base.b * (1 - amount) + tint.b * amount),
  };
}

function isDomainExcluded(domains: string[]): boolean {
  const hostname = window.location.hostname;
  return domains.some((d) => hostname === d || hostname.endsWith('.' + d));
}

// === Главный класс управления overlay ===
class LuxFlowOverlay {
  private host: HTMLDivElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private vignette: HTMLDivElement | null = null;
  private state: FilterState | null = null;
  private isFullscreen = false;

  init(): void {
    if (document.getElementById(OVERLAY_HOST_ID)) return;

    if (!document.body) {
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          this.createHost();
        }
      });
      observer.observe(document.documentElement, { childList: true });
      return;
    }

    this.createHost();
  }

  private createHost(): void {
    this.host = document.createElement('div');
    this.host.id = OVERLAY_HOST_ID;
    this.host.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: ${OVERLAY_Z_INDEX} !important;
    `;

    const shadow = this.host.attachShadow({ mode: 'closed' });

    this.overlay = document.createElement('div');
    shadow.appendChild(this.overlay);

    this.vignette = document.createElement('div');
    shadow.appendChild(this.vignette);

    document.body.appendChild(this.host);

    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.applyState();
    });

    this.applyState();
  }

  private applyState(): void {
    if (!this.overlay || !this.vignette || !this.state) return;

    const isPaused =
      this.state.paused ||
      (this.state.pausedUntil > 0 && Date.now() < this.state.pausedUntil);

    const isExcluded = isDomainExcluded(this.state.excludedDomains ?? []);
    const fullscreenBlock = this.isFullscreen && this.state.disableFullscreen;

    const shouldShow =
      this.state.enabled && !isPaused && !isExcluded && !fullscreenBlock && this.state.intensity > 0;

    const showVignette =
      this.state.cinemaMode && this.state.enabled && !isPaused && !isExcluded && !fullscreenBlock;

    // 1. Отрисовка виньетки
    if (showVignette) {
      const intensity = this.state.vignetteIntensity / 100;
      const blur = 60 + intensity * 120;
      const alpha = 0.3 + intensity * 0.55;
      this.vignette.style.cssText = `
        position: fixed; inset: 0;
        box-shadow: inset 0 0 ${blur}px rgba(0,0,0,${alpha});
        pointer-events: none; z-index: ${parseInt(OVERLAY_Z_INDEX) + 1}; display: block;
        transition: box-shadow 0.3s ease;
      `;
    } else {
      this.vignette.style.cssText = 'display: none;';
    }

    // 2. Отрисовка оверлея
    if (!shouldShow) {
      this.overlay.style.cssText = 'display: none;';
      return;
    }

    let rgb = kelvinToRGB(this.state.kelvin);
    const opacity = this.state.intensity / 100;
    const mod = EFFECT_MODIFIERS[this.state.effect] ?? EFFECT_MODIFIERS.classic;
    if (mod.tint && mod.tintAmount) {
      rgb = tintColor(rgb, mod.tint, mod.tintAmount);
    }
    const cssFilter = mod.filter ?? '';

    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: ${rgbToCss(rgb)}; opacity: ${opacity};
      mix-blend-mode: multiply; pointer-events: none;
      z-index: ${OVERLAY_Z_INDEX}; filter: ${cssFilter};
      transition: opacity 0.25s ease, background 0.25s ease, filter 0.25s ease;
    `;
  }

  update(state: FilterState): void {
    this.state = state;
    if (!this.host) this.init();
    this.applyState();
  }
}

const overlay = new LuxFlowOverlay();
overlay.init();

// Запрос состояния
try {
  chrome.runtime.sendMessage({ type: 'LUXFLOW_GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.state) overlay.update(response.state);
  });
} catch {}

// Прослушивание сообщений
chrome.runtime.onMessage.addListener((message) => {
  if (message && typeof message === 'object' && 'type' in message) {
    const msgType = (message as { type: string }).type;
    if (msgType === 'LUXFLOW_UPDATE' && 'state' in message) {
      overlay.update((message as { state: FilterState }).state);
    }
  }
  return false;
});

console.log('[LuxFlow] Content script loaded on', window.location.hostname);