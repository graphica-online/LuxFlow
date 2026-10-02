import { useEffect, useRef, useState } from 'react';
import { searchCities, type City } from '../lib/cities';

interface Props {
  currentCity: string;
  onSave: (city: City) => void;
}

const IconPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function CityInput({ currentCity, onSave }: Props) {
  const [value, setValue] = useState(currentCity);
  const [results, setResults] = useState<City[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<City | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Синхронизация с изменениями снаружи
  useEffect(() => {
    setValue(currentCity);
    setSelected(null);
  }, [currentCity]);

  // Автокомплит при вводе
  useEffect(() => {
    if (value === currentCity) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const found = searchCities(value);
    setResults(found);
    setShowDropdown(found.length > 0);
  }, [value, currentCity]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePick = (city: City) => {
    setValue(city.name);
    setSelected(city);
    setShowDropdown(false);
  };

  const handleSave = () => {
    if (selected) {
      onSave(selected);
    }
  };

  const isChanged = value !== currentCity;
  const canSave = selected !== null && selected.name === value;

  return (
    <div ref={wrapRef} className="autocomplete">
      <div className="input-wrap">
        <span className="input-icon"><IconPin /></span>
        <input
          className={`input input-has-icon ${isChanged ? 'input-has-btn' : ''}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder="Введите город..."
          style={{ height: '32px', fontSize: '12px' }}
        />
        {canSave && (
          <button
            className="btn btn-primary btn-sm input-btn"
            style={{ height: '24px', fontSize: '11px', padding: '0 10px' }}
            onClick={handleSave}
          >
            Сохранить
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="autocomplete-list">
          {results.length > 0 ? (
            results.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                className="autocomplete-item"
                onClick={() => handlePick(c)}
              >
                <svg
                  className="autocomplete-item-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {c.name}
                <span className="autocomplete-item-region">{c.region}</span>
              </div>
            ))
          ) : (
            <div className="autocomplete-empty">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}