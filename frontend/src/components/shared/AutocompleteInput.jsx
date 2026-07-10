import React, { useState, useRef, useEffect } from 'react';

export default function AutocompleteInput({ value, onChange, onSelect, fetchOptions, placeholder = '', style = {} }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const ref = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = async (term) => {
    if (timer.current) clearTimeout(timer.current);
    if (!term || term.length < 1) { setOptions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchOptions(term);
        setOptions(results);
        setOpen(results.length > 0);
        setHighlightIdx(-1);
      } catch { setOptions([]); }
      setLoading(false);
    }, 300);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    doSearch(v);
  };

  const handleSelect = (item) => {
    setOpen(false);
    onSelect(item);
  };

  const handleKeyDown = (e) => {
    if (!open || options.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && highlightIdx >= 0) { e.preventDefault(); handleSelect(options[highlightIdx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (options.length > 0) setOpen(true); }}
        placeholder={placeholder}
        style={{ width: '100%', padding: '6px 8px' }}
      />
      {loading && <span style={{ position: 'absolute', right: 8, top: 8, fontSize: 11, color: '#6b6d7b' }}>buscando...</span>}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#1a1b26', border: '1px solid #2a2c38', borderRadius: 6,
          maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginTop: 2,
        }}>
          {options.map((item, idx) => (
            <div
              key={item.id || idx}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightIdx(idx)}
              style={{
                padding: '6px 10px', cursor: 'pointer', fontSize: 13,
                background: idx === highlightIdx ? '#2563eb' : 'transparent',
                color: idx === highlightIdx ? 'white' : '#e0e1e6',
                borderBottom: idx < options.length - 1 ? '1px solid #23252e' : 'none',
              }}
            >
              {item.label || item.name || item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
