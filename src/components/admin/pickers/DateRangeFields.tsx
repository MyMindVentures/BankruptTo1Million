export function DateRangeFields({
  start,
  end,
  onStartChange,
  onEndChange,
  startLabel = 'Starts on',
  endLabel = 'Ends on',
}: {
  start: string;
  end: string | null;
  onStartChange: (value: string) => void;
  onEndChange: (value: string | null) => void;
  startLabel?: string;
  endLabel?: string;
}) {
  return (
    <div className="admin-picker-date-range">
      <label>
        <span>{startLabel}</span>
        <input
          type="date"
          value={start}
          onChange={(event) => {
            const next = event.target.value;
            onStartChange(next);
            if (end && next && end < next) onEndChange(next);
          }}
        />
      </label>
      <label>
        <span>{endLabel}</span>
        <input
          type="date"
          value={end || ''}
          min={start || undefined}
          onChange={(event) => onEndChange(event.target.value || null)}
        />
      </label>
    </div>
  );
}
