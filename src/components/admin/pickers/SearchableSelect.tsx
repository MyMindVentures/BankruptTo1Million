import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, X } from 'lucide-react';

export type SearchableOption = {
  value: string;
  label: string;
  description?: string;
};

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Search…',
  allowClear = true,
  emptyLabel = 'No matches',
  selectedOption,
}: {
  value: string | null;
  options: SearchableOption[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  emptyLabel?: string;
  /** Pin a known selection so the trigger stays labeled even if options reload. */
  selectedOption?: SearchableOption | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const mergedOptions = useMemo(() => {
    const byValue = new Map<string, SearchableOption>();
    for (const option of options) byValue.set(option.value, option);
    if (selectedOption?.value) byValue.set(selectedOption.value, selectedOption);
    if (value && !byValue.has(value)) {
      byValue.set(value, { value, label: selectedOption?.label || value });
    }
    return Array.from(byValue.values());
  }, [options, selectedOption, value]);

  const selected = mergedOptions.find((option) => option.value === value) || null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return mergedOptions.slice(0, 80);
    return mergedOptions
      .filter((option) => `${option.label} ${option.description || ''} ${option.value}`.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [mergedOptions, query]);

  function updatePanelPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const maxHeight = Math.min(280, window.innerHeight - 24);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openUp = spaceBelow < 160 && rect.top > spaceBelow;
    setPanelStyle({
      position: 'fixed',
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(rect.width, 360) - 8)),
      width: Math.max(rect.width, 220),
      maxHeight,
      zIndex: 10050,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6, top: 'auto' }
        : { top: rect.bottom + 6, bottom: 'auto' }),
    });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    function onScrollOrResize() {
      updatePanelPosition();
    }
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [open]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery('');
  }

  const panel = open
    ? createPortal(
      <div
        ref={panelRef}
        className="admin-picker-search__panel admin-picker-search__panel--portal"
        style={panelStyle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          placeholder={placeholder}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
          }}
        />
        <ul>
          {filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={option.value === value ? 'is-active' : ''}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  choose(option.value);
                }}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
                {option.value === value ? <Check size={14} /> : null}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? <li className="admin-picker-search__empty">{emptyLabel}</li> : null}
        </ul>
      </div>,
      document.body,
    )
    : null;

  return (
    <div className={`admin-picker-search ${open ? 'is-open' : ''}${value ? ' has-value' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`admin-picker-search__trigger${value ? ' is-selected' : ''}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronsUpDown size={14} />
      </button>
      {allowClear && value ? (
        <button
          type="button"
          className="admin-picker-search__clear"
          aria-label="Clear"
          onClick={(event) => {
            event.stopPropagation();
            onChange(null);
          }}
        >
          <X size={14} />
        </button>
      ) : null}
      {panel}
    </div>
  );
}
