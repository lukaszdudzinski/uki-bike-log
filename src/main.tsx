import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { GarageProvider } from './contexts/GarageContext.tsx'

declare global {
  interface Window {
    ukiLogError: (msg: string, stack: string) => void;
  }
}

window.ukiLogError = (msg: string, stack: string) => {
    let logs: any[] = [];
    try { logs = JSON.parse(localStorage.getItem('uki_error_logs') || '[]'); } catch(e) {}
    // @ts-ignore
    logs.unshift({ time: new Date().toISOString(), msg, stack, version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Nieznana' });
    if(logs.length > 50) logs.length = 50;
    localStorage.setItem('uki_error_logs', JSON.stringify(logs));
};

window.onerror = function(message, source, lineno, colno, error) {
    const stack = error ? error.stack : '';
    window.ukiLogError(`Global Error: ${message} at ${source}:${lineno}:${colno}`, stack || '');
    return false;
};

window.addEventListener('unhandledrejection', function(event) {
    const msg = event.reason ? event.reason.message || event.reason : 'Unhandled Promise Rejection';
    const stack = event.reason ? event.reason.stack || '' : '';
    window.ukiLogError(`Promise Rejection: ${msg}`, stack);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <GarageProvider>
        <App />
      </GarageProvider>
    </HashRouter>
  </StrictMode>,
)
