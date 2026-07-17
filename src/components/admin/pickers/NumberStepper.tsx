export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  allowNull = false,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  allowNull?: boolean;
}) {
  const display = value ?? '';

  function clamp(next: number) {
    let result = next;
    if (typeof min === 'number') result = Math.max(min, result);
    if (typeof max === 'number') result = Math.min(max, result);
    return result;
  }

  function bump(delta: number) {
    const base = value ?? (typeof min === 'number' ? min : 0);
    onChange(clamp(base + delta));
  }

  return (
    <div className="admin-picker-stepper">
      <button type="button" aria-label="Decrease" onClick={() => bump(-step)} disabled={typeof min === 'number' && (value ?? min) <= min}>
        −
      </button>
      <input
        type="number"
        value={display}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          if (allowNull && event.target.value === '') {
            onChange(null);
            return;
          }
          const parsed = Number(event.target.value);
          if (!Number.isFinite(parsed)) return;
          onChange(clamp(parsed));
        }}
      />
      <button type="button" aria-label="Increase" onClick={() => bump(step)} disabled={typeof max === 'number' && value !== null && value >= max}>
        +
      </button>
    </div>
  );
}
