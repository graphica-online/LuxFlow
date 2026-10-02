export interface FilterState {
  enabled: boolean;
  kelvin: number;
  intensity: number;
  paused: boolean;
  pausedUntil: number;
  autoMode: boolean;
  effect: string;
  cinemaMode: boolean;
  vignetteIntensity: number;
  city: string;
  lat: number;
  lon: number;
  bedtimeHour: number;
  bedtimeMinute: number;
  transitionMinutes: number;
  dayK: number;
  sunsetK: number;
  nightK: number;
  /** Домены, где фильтр не применяется */
  excludedDomains: string[];
  /** Отключать фильтр в fullscreen */
  disableFullscreen: boolean;
  /** Тема: light | dark */
  theme: 'light' | 'dark';
}

export const DEFAULT_FILTER_STATE: FilterState = {
  enabled: true,
  kelvin: 3400,
  intensity: 35,
  paused: false,
  pausedUntil: 0,
  autoMode: true,
  effect: 'classic',
  cinemaMode: false,
  vignetteIntensity: 50,
  city: 'Москва',
  lat: 55.7558,
  lon: 37.6173,
  bedtimeHour: 23,
  bedtimeMinute: 0,
  transitionMinutes: 30,
  dayK: 5500,
  sunsetK: 3400,
  nightK: 2300,
  excludedDomains: [],
  disableFullscreen: true,
  theme: 'light',
};

export const RESETTABLE_DEFAULTS = {
  bedtimeHour: 23,
  bedtimeMinute: 0,
  transitionMinutes: 30,
} as const;

export type LuxFlowMessage =
  | { type: 'LUXFLOW_UPDATE'; state: FilterState }
  | { type: 'LUXFLOW_GET_STATE' }
  | { type: 'LUXFLOW_PAUSE'; durationMinutes: number }
  | { type: 'LUXFLOW_RESUME' };

export interface GetStateResponse {
  state: FilterState;
}

export function isLuxFlowMessage(msg: unknown): msg is LuxFlowMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as { type: unknown }).type === 'string' &&
    (msg as { type: string }).type.startsWith('LUXFLOW_')
  );
}