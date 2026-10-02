import { useMemo } from 'react';

interface Props {
  dayK: number;
  sunsetK: number;
  nightK: number;
  sunriseHour: number;
  sunsetHour: number;
  bedtimeHour: number;
}

// === Keyframe-система (плато + ступеньки, как в f.lux) ===

interface Keyframe {
  h: number;
  k: number;
}

function buildKeyframes(
  sunrise: number,
  sunset: number,
  bedtime: number,
  dayK: number,
  sunsetK: number,
  nightK: number,
): Keyframe[] {
  // Промежуточные значения ступенек
  const dawnStep = nightK + (dayK - nightK) * 0.6;
  const duskStep1 = sunsetK;
  const duskStep2 = sunsetK + (nightK - sunsetK) * 0.5;

  return [
    { h: 0, k: nightK },
    { h: sunrise - 0.4, k: nightK },        // конец ночного плато
    { h: sunrise + 0.2, k: dawnStep },      // ступень зари
    { h: sunrise + 0.9, k: dayK },          // выход на плато дня
    { h: sunset - 0.3, k: dayK },           // конец дневного плато
    { h: sunset + 0.3, k: duskStep1 },      // первая ступень заката
    { h: sunset + 1.0, k: duskStep2 },      // вторая ступень
    { h: bedtime, k: nightK },              // выход на ночное плато
    { h: 24, k: nightK },
  ];
}

/** Smoothstep — S-образная функция сглаживания в диапазоне [0, 1] */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Найти K для любого часа по keyframe-ам */
function kelvinAtHour(h: number, frames: Keyframe[]): number {
  if (h <= frames[0].h) return frames[0].k;
  if (h >= frames[frames.length - 1].h) return frames[frames.length - 1].k;

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (h >= a.h && h <= b.h) {
      const t = (h - a.h) / (b.h - a.h);
      // Smoothstep даёт мягкое скругление углов между сегментами
      const s = smoothstep(t);
      return a.k + (b.k - a.k) * s;
    }
  }
  return frames[frames.length - 1].k;
}

// === Геометрия ===

const W = 340;
const H = 90;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;
const K_MIN = 1000;
const K_MAX = 6800;

function kToY(k: number): number {
  const drawH = H - PAD_TOP - PAD_BOTTOM;
  return PAD_TOP + drawH - ((k - K_MIN) / (K_MAX - K_MIN)) * drawH;
}

function hToX(h: number): number {
  return (h / 24) * W;
}

/** Cardinal spline с низкой tension для мягких изгибов */
function smoothPath(pts: [number, number][], tension: number = 0.3): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  const f = (1 - tension) / 6;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) * f;
    const cp1y = p1[1] + (p2[1] - p0[1]) * f;
    const cp2x = p2[0] - (p3[0] - p1[0]) * f;
    const cp2y = p2[1] - (p3[1] - p1[1]) * f;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

function fmtH(h: number): string {
  const hh = Math.floor(h).toString().padStart(2, '0');
  const mm = Math.round((h % 1) * 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// === Компонент ===

export default function TemperatureGraph({
  dayK,
  sunsetK,
  nightK,
  sunriseHour,
  sunsetHour,
  bedtimeHour,
}: Props) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  const frames = useMemo(
    () => buildKeyframes(sunriseHour, sunsetHour, bedtimeHour, dayK, sunsetK, nightK),
    [sunriseHour, sunsetHour, bedtimeHour, dayK, sunsetK, nightK],
  );

  // 96 точек — по 4 на час, гладкая кривая
  const curvePoints = useMemo(() => {
    const pts: [number, number][] = [];
    const steps = 96;
    for (let i = 0; i <= steps; i++) {
      const h = (i / steps) * 24;
      const k = kelvinAtHour(h, frames);
      pts.push([hToX(h), kToY(k)]);
    }
    return pts;
  }, [frames]);

  const curvePath = useMemo(() => smoothPath(curvePoints, 0.35), [curvePoints]);
  const bottomY = H - PAD_BOTTOM;
  const areaPath = curvePath + ` L ${W},${bottomY} L 0,${bottomY} Z`;

  // Точка «сейчас»
  const nowX = hToX(currentHour);
  const nowK = kelvinAtHour(currentHour, frames);
  const nowY = kToY(nowK);

  const dateStr = now.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  // Grid Y-линии
  const gridLines = [
    { k: 6500, label: '6500' },
    { k: 4000, label: '4000' },
    { k: 2000, label: '2000' },
  ];

  return (
    <div className="section" style={{ padding: '12px 20px 10px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '10px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700)' }}>
          Температурный профиль
        </span>
        <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'var(--font-mono)' }}>
          {dateStr}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Заливка: холодный сверху (день, синеватый) → тёплый снизу (ночь, оранжевый) */}
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#FEF3C7" stopOpacity="0.65" />
            <stop offset="80%" stopColor="#FED7AA" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FDBA74" stopOpacity="0.65" />
          </linearGradient>

          {/* Тонкая обводка кривой */}
          <linearGradient id="curve-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="25%" stopColor="#FBBF24" />
            <stop offset="50%" stopColor="#60A5FA" />
            <stop offset="75%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>

        {/* Горизонтальная сетка */}
        {gridLines.map((g) => (
          <g key={g.k}>
            <line x1="0" y1={kToY(g.k)} x2={W} y2={kToY(g.k)} stroke="#F3F4F6" strokeWidth="0.5" />
            <text
              x={W + 3}
              y={kToY(g.k) + 1.5}
              fontSize="4.5"
              fill="#D1D5DB"
              fontFamily="ui-monospace, monospace"
            >
              {g.label}
            </text>
          </g>
        ))}

        {/* Вертикальные пунктиры восхода/заката */}
        <line
          x1={hToX(sunriseHour)} y1={PAD_TOP}
          x2={hToX(sunriseHour)} y2={bottomY}
          stroke="#FBBF24" strokeWidth="0.4" strokeDasharray="1.5,2" opacity="0.5"
        />
        <line
          x1={hToX(sunsetHour)} y1={PAD_TOP}
          x2={hToX(sunsetHour)} y2={bottomY}
          stroke="#F97316" strokeWidth="0.4" strokeDasharray="1.5,2" opacity="0.5"
        />

        {/* Область заливки под кривой */}
        <path d={areaPath} fill="url(#area-fill)" />

        {/* Кривая — тонкая цветная обводка */}
        <path
          d={curvePath}
          fill="none"
          stroke="url(#curve-stroke)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Вертикальная линия «сейчас» */}
        <line
          x1={nowX} y1={PAD_TOP}
          x2={nowX} y2={bottomY}
          stroke="#F97316" strokeWidth="0.5" opacity="0.35"
        />

        {/* Точка «сейчас» — оранжевый круг с белой обводкой */}
        <circle cx={nowX} cy={nowY} r="3" fill="#F97316" stroke="white" strokeWidth="1.2" />

        {/* Подписи оси X */}
        <text x="0" y={H - 4} fontSize="4.5" fill="#9CA3AF" fontFamily="ui-monospace, monospace">
          00
        </text>
        <text
          x={hToX(sunriseHour) - 6}
          y={H - 4}
          fontSize="4.5"
          fill="#F59E0B"
          fontFamily="ui-monospace, monospace"
        >
          {fmtH(sunriseHour)}
        </text>
        <text
          x={hToX(12) - 3}
          y={H - 4}
          fontSize="4.5"
          fill="#9CA3AF"
          fontFamily="ui-monospace, monospace"
        >
          12
        </text>
        <text
          x={hToX(sunsetHour) - 6}
          y={H - 4}
          fontSize="4.5"
          fill="#F97316"
          fontFamily="ui-monospace, monospace"
        >
          {fmtH(sunsetHour)}
        </text>
        <text x={W - 6} y={H - 4} fontSize="4.5" fill="#9CA3AF" fontFamily="ui-monospace, monospace">
          24
        </text>
      </svg>
    </div>
  );
}