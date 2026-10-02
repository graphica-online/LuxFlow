import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
  onReset: () => void;
}

const OPTIONS = [15, 30, 45, 60];

const IconChevron = () => (
  <svg
    className="dropdown-arrow"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const IconCheck = () => (
  <svg
    className="dropdown-item-check"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const IconReset = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export default function TransitionDropdown({
  value,
  defaultValue,
  onChange,
  onReset,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePick = (v: number) => {
    onChange(v);
    setOpen(false);
  };

  const isChanged = value !== defaultValue;

  return (
    <div className="setting-control">
      <div ref={wrapRef} className="dropdown">
        <button
          className={`dropdown-trigger cursor-pointer ${open ? 'open' : ''}`}
          onClick={() => setOpen(!open)}
          style={{ height: '30px', fontSize: '12px' }}
        >
          <span>{value} мин</span>
          <IconChevron />
        </button>
        {/* Применяем inline-стиль для идеального выравнивания по правому краю */}
        <div 
          className={`dropdown-menu dropdown-menu-up ${open ? 'visible' : ''}`}
          style={{ left: 'auto', right: 0, minWidth: '100px' }}
        >
          {OPTIONS.map((opt) => (
            <div
              key={opt}
              className={`dropdown-item cursor-pointer ${opt === value ? 'selected' : ''}`}
              onClick={() => handlePick(opt)}
            >
              <IconCheck />
              {opt} мин
            </div>
          ))}
        </div>
      </div>
      {isChanged && (
        <button className="reset-btn cursor-pointer" title={`Сбросить к ${defaultValue} мин`} onClick={onReset}>
          <IconReset />
        </button>
      )}
    </div>
  );
}