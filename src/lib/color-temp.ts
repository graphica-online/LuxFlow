/**
 * LuxFlow — конвертер температуры в RGB.
 *
 * Алгоритм: Tanner Helland (public domain)
 * https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html
 *
 * Диапазон входных данных: 1000–40000K.
 * Для наших целей используем 1200–6500K.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Конвертировать температуру (в Кельвинах) в RGB. */
export function kelvinToRGB(kelvin: number): RGB {
  const temp = kelvin / 100;

  let r: number;
  let g: number;
  let b: number;

  // Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
  }

  // Green
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
  }

  // Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
  }

  return {
    r: clamp(r),
    g: clamp(g),
    b: clamp(b),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Форматировать RGB как CSS-строку */
export function rgbToCss(rgb: RGB): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}