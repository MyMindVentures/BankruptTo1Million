import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, X } from 'lucide-react';

export type MultiSelectOption = {
  value: string;
  label: string;
  description?: string;
  warning?: string;
};

export function SearchableMultiSelect({
  values,
  options,
  onChange,
  placeholder = 'Search…',
  emptyLabel = 'No matches',
}: {
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLUListElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const optionByValue = useMemo(() => {
    const map = new Map<string, MultiSelectOption>();
    for (const option of options) map.set(option.value, option);
    return map;
  }, [options]);

  const selected = values.map((id) => optionByValue.get(id) || { value: id, label: id });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options.slice(0, 100);
    return options
      .filter((option) => `${option.label} ${option.description || ''} ${option.value}`.toLowerCase().includes(needle))
      .slice(0, 100);
  }, [options, query]);

  function updatePanelPosition() {
    const anchor = searchRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const maxHeight = Math.min(280, window.innerHeight - 24);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openUp = spaceBelow < 160 && rect.top > spaceBelow;
    setPanelStyle({
      position: 'fixed',
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(rect.width, 420) - 8)),
      width: Math.max(rect.width, 260),
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
  }, [open, filtered.length]);

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

  function toggle(nextValue: string) {
    onChange(values.includes(nextValue) ? values.filter((item) => item !== nextValue) : [...values, nextValue]);
  }

  const panel = open
    ? createPortal(
      <ul
        ref={panelRef}
        className="admin-picker-multi__results admin-picker-multi__results--portal"
        style={panelStyle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {filtered.map((option) => {
          const active = values.includes(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                className={active ? 'is-active' : ''}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  toggle(option.value);
                }}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                  {option.warning ? <small className="admin-picker-multi__warning">{option.warning}</small> : null}
                </span>
                {active ? <Check size={14} /> : null}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 ? <li className="admin-picker-search__empty">{emptyLabel}</li> : null}
      </ul>,
      document.body,
    )
    : null;

  return (
    <div className="admin-picker-multi" ref={rootRef}>
      <div className="admin-picker-multi__chips">
        {selected.map((option) => (
          <button key={option.value} type="button" onClick={() => toggle(option.value)}>
            {option.label}
            <X size={12} />
          </button>
        ))}
        {selected.length === 0 ? <span className="admin-picker-multi__empty">None selected</span> : null}
      </div>
      <div ref={searchRef} className={`admin-picker-multi__search ${open ? 'is-open' : ''}`}>
        <Search size={14} />
        <input
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
          }}
        />
      </div>
      {panel}
    </div>
  );
}
