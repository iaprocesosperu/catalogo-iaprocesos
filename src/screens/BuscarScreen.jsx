import { useState, useRef } from 'react'
import { supabase, comprimirImagen } from '../supabase'
import { G, iS } from '../constants'
import { blobToBase64, detectColor } from '../helpers'
import { CamModal, Hdr } from '../components/index'

export default function BuscarScreen(P) {
  const { tit, allProds, notify, setScr, setEditP, setVentaP } = P
  const [modo, setModo] = useState('texto')
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [cam, setCam] = useState(null)
  const fileRef = useRef(null)

  const buscarTexto = () => {
    if (!q.trim()) return; const s = q.toLowerCase()
    setResults(allProds.filter(p => p.nombre?.toLowerCase().includes(s) || p.codigo?.toLowerCase().includes(s) || p.color?.toLowerCase().includes(s)))
  }

  const onCamCapture = async b => {
    setCam(null); setBusy(true)
    try {
      const comp = await comprimirImagen(new File([b], 's.jpg'), 600); const b64 = await blobToBase64(comp)
      const fd = new FormData(); fd.append('base64Image', 'data:image/jpeg;base64,' + b64); fd.append('OCREngine', '3')
      const r = await fetch('https://api.ocr.space/parse/image', { method: 'POST', headers: { 'apikey': 'K85837551988957' }, body: fd })
      const d = await r.json(); const t = (d?.ParsedResults?.[0]?.ParsedText || '').trim().replace(/[^a-zA-Z0-9]/g, '')
      if (t) { setQ(t.toUpperCase()); const found = allProds.filter(p => p.codigo?.toUpperCase() === t.toUpperCase()); setResults(found); if (!found.length) notify('Código no encontrado', 'error') }
      else notify('No se pudo leer', 'error')
    } catch (e) { notify('Error', 'error') }
    setBusy(false)
  }

  const buscarPorFoto = async (blob) => {
    setBusy(true)
    try {
      const url = URL.createObjectURL(blob); const color = await detectColor(url); URL.revokeObjectURL(url)
      if (color) {
        setQ('🔍 Color: ' + color)
        const found = allProds.filter(p => p.color?.toLowerCase() === color.toLowerCase())
          .concat(allProds.filter(p => p.color?.toLowerCase() !== color.toLowerCase() && p.nombre?.toLowerCase().includes(color.toLowerCase())))
        setResults(found); if (!found.length) notify('No hay productos de color ' + color, 'error'); else notify(found.length + ' resultado(s) para ' + color)
      } else notify('No se pudo detectar color', 'error')
    } catch (e) { notify('Error', 'error') }
    setBusy(false)
  }

  const onCamProdCapture = b => { setCam(null); buscarPorFoto(b) }
  const onFileSearch = e => { const f = e.target.files?.[0]; if (!f) return; buscarPorFoto(f); e.target.value = '' }

  return (
    <div>
      <Hdr tit={tit} sec="🔍 Buscar" onBack={() => setScr('catalogo')} />
      {cam === 'scan' && <CamModal onCapture={onCamCapture} onClose={() => setCam(null)} />}
      {cam === 'photo' && <CamModal onCapture={onCamProdCapture} onClose={() => setCam(null)} />}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[{ id: 'texto', i: '⌨️', l: 'Nombre' }, { id: 'codigo', i: '📷', l: 'Foto código' }, { id: 'foto', i: '🖼️', l: 'Foto producto' }].map(m => (
            <button key={m.id} onClick={() => setModo(m.id)} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: modo === m.id ? G.gold : G.goldSf, color: modo === m.id ? '#fff' : G.goldDk }}>{m.i} {m.l}</button>
          ))}
        </div>
        {modo === 'texto' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarTexto()} placeholder="Nombre, código, color..." style={{ flex: 1, ...iS(G), marginBottom: 0 }} />
            <button onClick={buscarTexto} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Buscar</button>
          </div>
        )}
        {modo === 'codigo' && (
          <button onClick={() => setCam('scan')} disabled={busy} style={{ width: '100%', padding: 18, borderRadius: 8, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', textAlign: 'center' }}>
            <span style={{ fontSize: 26, display: 'block' }}>{busy ? '⏳' : '📷'}</span>
            <span style={{ fontSize: 13, color: G.gold, fontWeight: 600 }}>{busy ? 'Leyendo...' : 'Escanear etiqueta'}</span>
          </button>
        )}
        {modo === 'foto' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCam('photo')} disabled={busy} style={{ flex: 1, padding: 18, borderRadius: 8, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', textAlign: 'center' }}>
              <span style={{ fontSize: 22, display: 'block' }}>📷</span><span style={{ fontSize: 11, color: G.gold, fontWeight: 600 }}>Cámara</span>
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={busy} style={{ flex: 1, padding: 18, borderRadius: 8, border: '2px dashed ' + G.border, background: G.goldLt, cursor: 'pointer', textAlign: 'center' }}>
              <span style={{ fontSize: 22, display: 'block' }}>📁</span><span style={{ fontSize: 11, color: G.muted, fontWeight: 600 }}>Galería</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileSearch} style={{ display: 'none' }} />
          </div>
        )}
        {results && <p style={{ fontSize: 12, color: G.muted, margin: '12px 0 8px' }}>{results.length} resultado(s)</p>}
        {results?.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, display: 'flex', gap: 10, border: '1px solid ' + G.border }}>
            {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              : <div style={{ width: 60, height: 60, background: G.goldLt, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 18, opacity: 0.3 }}>📦</span></div>}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, background: G.goldSf, color: G.goldDk, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{p.codigo}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: G.gold }}>S/{p.precio_venta}</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, margin: '2px 0' }}>{p.nombre}</p>
              <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Stock: {p.cantidad}</p>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button onClick={() => { setEditP(p); setScr('registrar') }} style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                <button onClick={() => { setVentaP(p); setScr('venta') }} disabled={p.cantidad <= 0} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: p.cantidad > 0 ? G.gold : '#ccc', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Vender</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
