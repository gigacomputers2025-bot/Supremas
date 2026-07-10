import React, { useState, useEffect } from 'react';

export default function InlineEdit({ value, onSave, placeholder = '—', style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  useEffect(() => setVal(value ?? ''), [value]);

  const commit = () => {
    if (val !== (value ?? '')) onSave(val);
    setEditing(false);
  };

  const cancel = () => {
    setVal(value ?? '');
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        autoFocus
        style={{ width: '100%', ...style }}
      />
    );
  }

  const display = value ?? '';
  return (
    <span
      onDoubleClick={() => setEditing(true)}
      style={{ cursor: 'pointer', display: 'block', minHeight: 22, padding: '2px 0', ...style }}
      title="Doble click para editar"
    >
      {display || <span style={{ color: '#3a3c48' }}>{placeholder}</span>}
    </span>
  );
}
