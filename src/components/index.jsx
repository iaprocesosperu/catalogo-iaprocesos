import { useState, useEffect, useRef } from 'react'
import { G } from '../constants'
import { startVoice } from '../helpers'

export function NavBar({ scr, setScr, setEditP, isMobile }) {
  const appItems = [
    { id: 'catalogo',  i: '📦', l: 'Catálogo' },
    { id: 'registrar', i: '➕', l: 'Registrar' },
    { id: 'buscar',    i: '🔍', l: 'Buscar' },
    { id: 'submenu',   i: '⚙️', l: 'Más' }
  ]

  const webItems = [
    { id: 'paginaweb', i: '🌐', l: 'Página Web' }
  ]

  const allWebIds = ['paginaweb']
  const isWebScr = allWebIds.includes(scr)

  /* ── DESKTOP: sidebar con dos secciones ── */
  if (!isMobile) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: 210, height: '100vh',
        background: '#1A1A1A', borderRight: '2px solid ' + G.gold,
        display: 'flex', flexDirection: 'column', zIndex: 100, paddingTop: 20
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #2A2A2A' }}>
          <p style={{ color: G.gold, fontSize: 17, fontWeight: 800, margin: 0 }}>IA <span style={{ color: '#E8E8E8' }}>PROCESOS</span></p>
        </div>

        {/* Sección APP */}
        <div style={{ paddingTop: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#555', letterSpacing: 2, padding: '0 20px', margin: '0 0 4px', textTransform: 'uppercase' }}>APP</p>
          {appItems.map(n => (
            <button key={n.id}
              onClick={() => { setScr(n.id); if (n.id === 'registrar') setEditP(null) }}
              style={{
                width: '100%', background: scr === n.id ? G.gold : 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', textAlign: 'left',
                borderLeft: scr === n.id ? '4px solid #fff' : '4px solid transparent',
                transition: 'background 0.15s'
              }}>
              <span style={{ fontSize: 18 }}>{n.i}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scr === n.id ? '#1A1A1A' : '#CCC' }}>{n.l}</span>
            </button>
          ))}
        </div>

        {/* Separador */}
        <div style={{ margin: '12px 20px', borderTop: '1px solid #2A2A2A' }} />

        {/* Sección PÁGINA WEB */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#555', letterSpacing: 2, padding: '0 20px', margin: '0 0 4px', textTransform: 'uppercase' }}>PÁGINA WEB</p>
          {webItems.map(n => (
            <button key={n.id}
              onClick={() => setScr(n.id)}
              style={{
                width: '100%', background: scr === n.id ? G.gold : 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', textAlign: 'left',
                borderLeft: scr === n.id ? '4px solid #fff' : '4px solid transparent',
                transition: 'background 0.15s'
              }}>
              <span style={{ fontSize: 18 }}>{n.i}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scr === n.id ? '#1A1A1A' : '#CCC' }}>{n.l}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── MOBILE: barra inferior con toggle APP / WEB ── */
  const items = isWebScr ? webItems : appItems

  return (
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '2px solid ' + G.goldSf, zIndex: 100 }}>
      {/* Toggle APP / PÁGINA WEB */}
      <div style={{ display: 'flex', borderBottom: '1px solid ' + G.goldSf }}>
        <button onClick={() => setScr('catalogo')}
          style={{ flex: 1, padding: '5px 0', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
            background: !isWebScr ? G.gold : 'transparent',
            color: !isWebScr ? '#fff' : G.muted }}>
          📦 APP
        </button>
        <button onClick={() => setScr('paginaweb')}
          style={{ flex: 1, padding: '5px 0', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
            background: isWebScr ? G.gold : 'transparent',
            color: isWebScr ? '#fff' : G.muted }}>
          🌐 PÁGINA WEB
        </button>
      </div>
      {/* Items de la sección activa */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '4px 0 env(safe-area-inset-bottom,4px)' }}>
        {items.map(n => (
          <button key={n.id} onClick={() => { setScr(n.id); if (n.id === 'registrar') setEditP(null) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '4px 12px' }}>
            <span style={{ fontSize: 18 }}>{n.i}</span>
            <span style={{ fontSize: 9, color: scr === n.id ? G.gold : G.muted, fontWeight: scr === n.id ? 700 : 400 }}>{n.l}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function CamModal({ onCapture, onClose }) {
  const vRef = useRef(null), sRef = useRef(null)
  const [rdy, setRdy] = useState(false)
  useEffect(() => {
    let m = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(s => {
        if (!m) { s.getTracks().forEach(t => t.stop()); return }
        sRef.current = s
        if (vRef.current) { vRef.current.srcObject = s; vRef.current.play() }
        setRdy(true)
      })
      .catch(() => { if (m) onClose() })
    return () => { m = false; if (sRef.current) sRef.current.getTracks().forEach(t => t.stop()) }
  }, [])
  const cap = () => {
    const v = vRef.current; if (!v) return
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    c.toBlob(b => { if (sRef.current) sRef.current.getTracks().forEach(t => t.stop()); onCapture(b) }, 'image/jpeg', 0.85)
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <video ref={vRef} autoPlay playsInline muted style={{ flex: 1, objectFit: 'cover', width: '100%' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, background: 'linear-gradient(transparent,rgba(0,0,0,0.7))' }}>
        <button onClick={() => { if (sRef.current) sRef.current.getTracks().forEach(t => t.stop()); onClose() }} style={{ width: 50, height: 50, borderRadius: 25, border: '2px solid #fff', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
        <button onClick={cap} disabled={!rdy} style={{ width: 70, height: 70, borderRadius: 35, border: '4px solid #fff', background: rdy ? G.gold : '#666', cursor: 'pointer' }} />
        <div style={{ width: 50 }} />
      </div>
    </div>
  )
}

export function Hdr({ tit, sec, onBack }) {
  return (
    <div style={{ background: G.gold, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
      {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 18 }}>←</button>}
      <div style={{ flex: 1 }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, margin: 0 }}>{tit}</p>
        <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{sec}</h2>
      </div>
    </div>
  )
}

export function LineSel({ lineas, linAct, setLinAct }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', background: G.goldLt }}>
      {lineas.map(l => (
        <button key={l.id} onClick={() => setLinAct(l)}
          style={{ padding: '6px 16px', borderRadius: 20, border: 'none', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: linAct?.id === l.id ? G.gold : '#fff', color: linAct?.id === l.id ? '#fff' : G.gold }}>
          {l.nombre}
        </button>
      ))}
    </div>
  )
}

export function Crd({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid ' + G.border }}>
      {title && <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px', color: G.text }}>{title}</p>}
      {children}
    </div>
  )
}

export function VoiceBtn({ onResult }) {
  const [rec, setRec] = useState(false)
  return (
    <button onClick={() => { setRec(true); startVoice(t => { setRec(false); if (t) onResult(t) }) }}
      style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid ' + G.gold, background: rec ? G.goldSf : 'transparent', color: G.gold, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {rec ? '🔴 Escuchando...' : '🎤'}
    </button>
  )
}
