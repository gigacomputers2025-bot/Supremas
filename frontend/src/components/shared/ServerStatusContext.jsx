import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../config';

const ServerStatusContext = createContext();

export function ServerStatusProvider({ children }) {
  const [connected, setConnected] = useState(true);
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(true);
  const mounted = useRef(true);

  const check = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/backups/health`);
      if (res.ok) {
        const data = await res.json();
        if (mounted.current) {
          setHealth(data);
          setConnected(true);
        }
      } else {
        if (mounted.current) setConnected(false);
      }
    } catch {
      if (mounted.current) setConnected(false);
    } finally {
      if (mounted.current) setChecking(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    check();
    const interval = setInterval(check, 10000);
    return () => { mounted.current = false; clearInterval(interval); };
  }, []);

  return (
    <ServerStatusContext.Provider value={{ connected, health, checking }}>
      {children}
    </ServerStatusContext.Provider>
  );
}

export function useServerStatus() {
  return useContext(ServerStatusContext);
}
