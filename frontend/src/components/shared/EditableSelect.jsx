import React from 'react';

export default function EditableSelect({ value, options, onChange, style = {} }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', ...style }}
    >
      <option value="">—</option>
      {options.map((opt, i) => {
        const label = typeof opt === 'string' ? opt : opt.label;
        const val = typeof opt === 'string' ? opt : opt.value;
        return <option key={i} value={val}>{label}</option>;
      })}
    </select>
  );
}
