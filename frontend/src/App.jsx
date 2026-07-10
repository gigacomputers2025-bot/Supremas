import React from 'react';
import Dashboard from './components/Dashboard';
import { ToastProvider, ServerStatusProvider } from './components/shared';

export default function App() {
  return (
    <ServerStatusProvider>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </ServerStatusProvider>
  );
}
