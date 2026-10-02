interface Props {
  hour: number;
  minute: number;
  defaultHour: number;
  defaultMinute: number;
  onChange: (hour: number, minute: number) => void;
  onReset: () => void;
}

const IconChevronUp = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M18 15l-6-6-6 6" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const IconReset = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export default function TimeStepper({
  hour,
  minute,
  defaultHour,
  defaultMinute,
  onChange,
  onReset,
}: Props) {
  const step = (type: 'h' | 'm', delta: number) => {
    if (type === 'h') {
      let next = hour + delta;
      if (next > 23) next = 0;
      if (next < 0) next = 23;
      onChange(next, minute);
    } else {
      let next = minute + delta;
      if (next > 59) next = 0;
      if (next < 0) next = 59;
      onChange(hour, next);
    }
  };

  const isChanged = hour !== defaultHour || minute !== defaultMinute;

  return (
    <div className="setting-control">
      <div className="time-stepper">
        <div className="time-stepper-segment">
          <button className="time-stepper-up" onClick={() => step('h', 1)}>
            <IconChevronUp />
          </button>
          <span className="time-stepper-display">
            {hour.toString().padStart(2, '0')}
          </span>
          <button className="time-stepper-down" onClick={() => step('h', -1)}>
            <IconChevronDown />
          </button>
        </div>
        <span className="time-stepper-colon">:</span>
        <div className="time-stepper-segment">
          <button className="time-stepper-up" onClick={() => step('m', 5)}>
            <IconChevronUp />
          </button>
          <span className="time-stepper-display">
            {minute.toString().padStart(2, '0')}
          </span>
          <button className="time-stepper-down" onClick={() => step('m', -5)}>
            <IconChevronDown />
          </button>
        </div>
      </div>
      {isChanged && (
        <button className="reset-btn" title="Сбросить" onClick={onReset}>
          <IconReset />
        </button>
      )}
    </div>
  );
}