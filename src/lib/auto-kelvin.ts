/**
 * LuxFlow — расчёт автоматического Kelvin по времени суток.
 *
 * Логика:
 *   Ночь (после bedtime до sunrise-transition)     → nightK
 *   Рассвет: sunrise - transition/2 ... sunrise + transition/2  → nightK → dayK
 *   День (sunrise+transition до sunset-transition) → dayK
 *   Закат: sunset - transition/2 ... sunset + transition/2 → dayK → sunsetK
 *   Вечер (sunset+transition до bedtime)           → sunsetK
 *   Bedtime: линейный переход за transition минут  → sunsetK → nightK
 *
 * transition берётся из state.transitionMinutes.
 */

import { getTimes } from 'suncalc';

interface CalcInput {
  lat: number;
  lon: number;
  dayK: number;
  sunsetK: number;
  nightK: number;
  bedtimeHour: number;
  bedtimeMinute: number;
  transitionMinutes: number;
  now?: Date; // для тестов
}

/** Smoothstep для мягких переходов */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Линейная интерполяция с smoothstep */
function lerp(a: number, b: number, t: number): number {
  const s = smoothstep(Math.max(0, Math.min(1, t)));
  return a + (b - a) * s;
}

/** Разность в часах (учитывает перепрыгивание через полночь) */
function hourDiff(from: number, to: number): number {
  let d = to - from;
  if (d < 0) d += 24;
  return d;
}

/** Проверка: находится ли час в диапазоне (с учётом полуночи) */
function inRange(h: number, start: number, end: number): boolean {
  if (start <= end) return h >= start && h < end;
  return h >= start || h < end;
}

/**
 * Основная функция: возвращает K для текущего момента.
 */
export function calculateAutoKelvin(input: CalcInput): number {
  const {
    lat,
    lon,
    dayK,
    sunsetK,
    nightK,
    bedtimeHour,
    bedtimeMinute,
    transitionMinutes,
    now = new Date(),
  } = input;

  const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const bedtime = bedtimeHour + bedtimeMinute / 60;
  const transHours = transitionMinutes / 60;
  const halfTrans = transHours / 2;

  // Получаем восход/закат
  let sunrise: number;
  let sunset: number;
  try {
    const times = getTimes(now, lat, lon);
    sunrise = times.sunrise.getHours() + times.sunrise.getMinutes() / 60;
    sunset = times.sunset.getHours() + times.sunset.getMinutes() / 60;
  } catch {
    sunrise = 6;
    sunset = 20;
  }

  // Границы переходов
  const dawnStart = sunrise - halfTrans;
  const dawnEnd = sunrise + halfTrans;
  const duskStart = sunset - halfTrans;
  const duskEnd = sunset + halfTrans;
  const nightStart = bedtime;
  const nightEnd = (bedtime + transHours) % 24; // конец перехода в ночь

  // === 1. Полный день ===
  if (currentHour >= dawnEnd && currentHour < duskStart) {
    return Math.round(dayK);
  }

  // === 2. Рассвет: night → day ===
  if (currentHour >= dawnStart && currentHour < dawnEnd) {
    const t = (currentHour - dawnStart) / transHours;
    return Math.round(lerp(nightK, dayK, t));
  }

  // === 3. Закат: day → sunset ===
  if (currentHour >= duskStart && currentHour < duskEnd) {
    const t = (currentHour - duskStart) / transHours;
    return Math.round(lerp(dayK, sunsetK, t));
  }

  // === 4. Вечер (sunset до bedtime): sunsetK ===
  if (currentHour >= duskEnd && currentHour < nightStart) {
    return Math.round(sunsetK);
  }

  // === 5. Переход в ночь после bedtime: sunset → night ===
  if (inRange(currentHour, nightStart, nightEnd)) {
    // t = сколько прошло от bedtime
    const passed = hourDiff(nightStart, currentHour);
    const t = passed / transHours;
    return Math.round(lerp(sunsetK, nightK, t));
  }

  // === 6. Ночь: nightK ===
  return Math.round(nightK);
}