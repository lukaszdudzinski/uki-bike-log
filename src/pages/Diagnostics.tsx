import { useEffect } from 'react';
import { DiagnosticsUI } from '../components/DiagnosticsUI';

export default function Diagnostics() {
  useEffect(() => {
    DiagnosticsUI.render();
  }, []);

  return (
    <div className="glass-panel" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Diagnostyka Systemu</h2>
        <div id="diagnostics-content-wrapper"></div>
    </div>
  );
}
