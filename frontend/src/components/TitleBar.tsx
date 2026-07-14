import { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Minimize2 } from 'lucide-react';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    window.electronAPI?.isMaximized().then(setMaximized);
    window.electronAPI?.isFullscreen().then(setFullscreen);
  }, []);
  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = async () => { const m = await window.electronAPI?.maximizeToggle(); setMaximized(!!m); };
  const handleClose = () => window.electronAPI?.close();
  const handleFullscreen = async () => { const f = await window.electronAPI?.toggleFullscreen(); setFullscreen(!!f); };
  return (
    <div className="titlebar-drag" style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', paddingLeft: 12, paddingRight: 4, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="../assets/veltrix-logo.svg" alt="VELTRIX" style={{ width: 20, height: 18, objectFit: 'contain' }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--accent-blue)' }}>VELTRIX</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>SCADA</span>
      </div>
      <div className="titlebar-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button className="btn-icon titlebar-no-drag" onClick={handleFullscreen} title="Toggle Fullscreen" style={{ width: 28, height: 28 }}>{fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        <button className="btn-icon titlebar-no-drag" onClick={handleMinimize} title="Minimize" style={{ width: 28, height: 28 }}><Minus size={15} /></button>
        <button className="btn-icon titlebar-no-drag" onClick={handleMaximize} title="Maximize" style={{ width: 28, height: 28 }}><Square size={12} /></button>
        <button className="btn-icon titlebar-no-drag" onClick={handleClose} title="Close" style={{ width: 28, height: 28 }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-red)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}><X size={16} /></button>
      </div>
    </div>
  );
}
