import { useState, useEffect, useRef } from 'react'
import { supabase, subirFoto, comprimirImagen } from '../supabase'
import { G } from '../constants'
import { downloadPhoto, mejorarFotoConIA } from '../helpers'
import { CamModal } from './index'

export default function PhotoViewerModal({ prod, emp, notify, loadAll, onClose }) {
  const empresaId = emp?.id || 'default'
  const [fotos, setFotos] = useState([])
  const [idx, setIdx] = useState(0)
  const [mejorando, setMejorando] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [fotoMejorada, setFotoMejorada] = useState(null) // {url, blob} temporal
  const [cargando, setCargando] = useState(true)
  const [cam, setCam] = useState(false)
  const fileRef = useRef(null)

  const cargarFotos = async () => {
    setCargando(true)
    const { data } = await supabase.from('fotos_producto')
      .select('*').eq('producto_id', prod.id).order('orden', { ascending: true })
    if (data?.length) {
      setFotos(data)
      const pi = data.findIndex(f => f.es_principal)
      setIdx(pi >= 0 ? pi : 0)
    } else if (prod.foto_url) {
      setFotos([{ id: null, url: prod.foto_url, es_principal: true, producto_id: prod.id }])
    } else {
      setFotos([])
    }
    setCargando(false)
  }

  useEffect(() => { cargarFotos() }, [])

  const agregarFoto = async (fileOrBlob) => {
    setAgregando(true)
    try {
      const blob = await comprimirImagen(fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], 'f.jpg', { type: 'image/jpeg' }), 800)
      const esPrimera = fotos.length === 0
      const url = await subirFoto(blob, prod.codigo + '_' + Date.now())
      const { data } = await supabase.from('fotos_producto').insert({
        producto_id: prod.id, empresa_id: prod.empresa_id,
        url, es_principal: esPrimera, orden: fotos.length
      }).select().single()
      if (esPrimera) await supabase.from('productos').update({ foto_url: url }).eq('id', prod.id)
      notify('✅ Foto agregada')
      await loadAll()
      await cargarFotos()
      setIdx(fotos.length) // ir a la nueva foto
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setAgregando(false)
  }

  const onCamCapture = async (b) => { setCam(false); await agregarFoto(b) }
  const onFileSelect = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''; await agregarFoto(file)
  }

  const marcarPrincipal = async (foto) => {
    if (!foto.id) { notify('Esta es la única foto y ya es principal', 'error'); return }
    await supabase.from('fotos_producto').update({ es_principal: false }).eq('producto_id', prod.id)
    await supabase.from('fotos_producto').update({ es_principal: true }).eq('id', foto.id)
    await supabase.from('productos').update({ foto_url: foto.url }).eq('id', prod.id)
    notify('⭐ Foto principal actualizada')
    await loadAll(); await cargarFotos()
  }

  const eliminar = async (foto) => {
    if (!confirm('¿Eliminar esta foto del producto?')) return
    if (foto.id) {
      await supabase.from('fotos_producto').delete().eq('id', foto.id)
      if (foto.es_principal) {
        const resto = fotos.filter(f => f.id !== foto.id)
        if (resto.length > 0) {
          const sig = resto[0]
          if (sig.id) await supabase.from('fotos_producto').update({ es_principal: true }).eq('id', sig.id)
          await supabase.from('productos').update({ foto_url: sig.url }).eq('id', prod.id)
        } else {
          await supabase.from('productos').update({ foto_url: null }).eq('id', prod.id)
        }
      }
    } else {
      await supabase.from('productos').update({ foto_url: null }).eq('id', prod.id)
    }
    notify('Foto eliminada')
    await loadAll()
    const nf = fotos.filter(f => f !== foto)
    setFotos(nf)
    if (nf.length === 0) { onClose(); return }
    setIdx(Math.max(0, Math.min(idx, nf.length - 1)))
  }

  const mejorar = async (foto) => {
    if (!emp?.api_openai_key) return
    setMejorando(true)
    setFotoMejorada(null)
    try {
      const resp = await fetch(foto.url)
      if (!resp.ok) throw new Error('No se pudo descargar la foto')
      const blob = await resp.blob()
      const mejorada = await mejorarFotoConIA(blob, empresaId)
      const prevUrl = URL.createObjectURL(mejorada)
      // Guardar temporal — no sube hasta confirmar
      setFotoMejorada({ url: prevUrl, blob: mejorada, fotoOrig: foto })
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setMejorando(false)
  }

  const confirmarMejora = async () => {
    if (!fotoMejorada) return
    setMejorando(true)
    try {
      const { fotoOrig } = fotoMejorada
      const nuevaUrl = await subirFoto(fotoMejorada.blob, 'mejora_' + prod.codigo + '_' + Date.now())
      if (fotoOrig.id) {
        await supabase.from('fotos_producto').update({ url: nuevaUrl }).eq('id', fotoOrig.id)
        if (fotoOrig.es_principal) await supabase.from('productos').update({ foto_url: nuevaUrl }).eq('id', prod.id)
      } else {
        await supabase.from('productos').update({ foto_url: nuevaUrl }).eq('id', prod.id)
      }
      notify('✅ Foto mejorada guardada')
      URL.revokeObjectURL(fotoMejorada.url)
      setFotoMejorada(null)
      await loadAll(); await cargarFotos()
    } catch (e) { notify('Error al guardar: ' + e.message, 'error') }
    setMejorando(false)
  }

  const mantenerAmbas = async () => {
    if (!fotoMejorada) return
    setMejorando(true)
    try {
      // Subir mejorada como nueva foto (principal)
      const nuevaUrl = await subirFoto(fotoMejorada.blob, 'mejora_' + prod.codigo + '_' + Date.now())
      // Insertar mejorada como principal
      await supabase.from('fotos_producto').insert({
        producto_id: prod.id, empresa_id: prod.empresa_id,
        url: nuevaUrl, es_principal: true, orden: 0
      })
      // Original pasa a no-principal
      const fOrig = fotoMejorada.fotoOrig
      if (fOrig.id) {
        await supabase.from('fotos_producto').update({ es_principal: false }).eq('id', fOrig.id)
      }
      // foto_url = mejorada (principal)
      await supabase.from('productos').update({ foto_url: nuevaUrl }).eq('id', prod.id)
      notify('✅ Ambas fotos guardadas — mejorada como principal')
      URL.revokeObjectURL(fotoMejorada.url)
      setFotoMejorada(null)
      await loadAll(); await cargarFotos()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setMejorando(false)
  }

  const pegarDesdePortapapeles = async () => {
    try {
      if (!navigator.clipboard?.read) { notify('Tu navegador no soporta pegar imágenes', 'error'); return }
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const tipo = item.types.find(t => t.startsWith('image/'))
        if (tipo) {
          const blob = await item.getType(tipo)
          await agregarFoto(blob)
          return
        }
      }
      notify('No hay imagen en el portapapeles', 'error')
    } catch (e) {
      if (e.name === 'NotAllowedError') notify('Permiso de portapapeles denegado', 'error')
      else notify('Error al pegar: ' + e.message, 'error')
    }
  }

  const copiarAlPortapapeles = async (url) => {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      // Convertir a PNG si no lo es (requerido por clipboard API)
      const img = new Image()
      const blobUrl = URL.createObjectURL(blob)
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = blobUrl })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      URL.revokeObjectURL(blobUrl)
      const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
      notify('📋 Foto copiada al portapapeles')
    } catch (e) {
      // Fallback: abrir en nueva pestaña para guardar manualmente
      window.open(url, '_blank')
      notify('Abre la foto y guárdala manualmente', 'error')
    }
  }

  const descartarMejora = () => {
    if (fotoMejorada) URL.revokeObjectURL(fotoMejorada.url)
    setFotoMejorada(null)
    notify('↩️ Se mantuvo la foto original')
  }

  // ── ZOOM ──
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const lastTap = useRef(0)
  const pinchRef = useRef(null) // { dist, scale, offsetX, offsetY }
  const isDragging = useRef(false)
  const dragStart = useRef(null)

  const resetZoom = () => { setScale(1); setOffset({ x: 0, y: 0 }) }

  const getPinchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = e => {
    if (e.touches.length === 2) {
      // Inicio de pinch
      pinchRef.current = { dist: getPinchDist(e.touches), scale, offsetX: offset.x, offsetY: offset.y }
      touchX.current = null
    } else if (e.touches.length === 1) {
      const now = Date.now()
      if (now - lastTap.current < 300) {
        // Doble tap — toggle zoom 1x / 2.5x
        if (scale > 1) { resetZoom() } else { setScale(2.5); setOffset({ x: 0, y: 0 }) }
        lastTap.current = 0
      } else {
        lastTap.current = now
        if (scale > 1) {
          isDragging.current = true
          dragStart.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y }
        } else {
          touchX.current = e.touches[0].clientX
        }
      }
    }
  }

  const onTouchMove = e => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const newDist = getPinchDist(e.touches)
      const ratio = newDist / pinchRef.current.dist
      const newScale = Math.max(1, Math.min(5, pinchRef.current.scale * ratio))
      setScale(newScale)
      if (newScale <= 1) setOffset({ x: 0, y: 0 })
    } else if (e.touches.length === 1 && isDragging.current && dragStart.current) {
      e.preventDefault()
      setOffset({ x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y })
    }
  }

  const onTouchEnd = e => {
    pinchRef.current = null
    if (isDragging.current) { isDragging.current = false; dragStart.current = null; return }
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 50 && scale <= 1) {
      if (dx < 0 && idx < fotos.length - 1) { setIdx(idx + 1); resetZoom() }
      else if (dx > 0 && idx > 0) { setIdx(idx - 1); resetZoom() }
    }
    touchX.current = null
  }

  const fAct = fotos[idx]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.97)', zIndex: 9500, display: 'flex', flexDirection: 'column' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

      {cam && <CamModal onCapture={onCamCapture} onClose={() => setCam(false)} />}
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFileSelect} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <p style={{ color: G.gold, fontSize: 10, margin: 0, fontWeight: 700 }}>{prod.codigo}</p>
          <p style={{ color: '#fff', fontSize: 13, margin: 0, fontWeight: 600, lineHeight: 1.2 }}>{prod.nombre}</p>
          <p style={{ color: '#888', fontSize: 10, margin: 0 }}>S/{prod.precio_venta} • Stock: {prod.cantidad} • {fotos.length} foto{fotos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>

      {/* Foto / Progreso / Comparación */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', minHeight: 0, flexDirection: 'column', gap: 12, padding: fotoMejorada ? 16 : 0 }}>
        {cargando ? (
          <div style={{ color: '#888', textAlign: 'center' }}><p style={{ fontSize: 32 }}>⏳</p><p style={{ fontSize: 12 }}>Cargando fotos...</p></div>
        ) : mejorando ? (
          <div style={{ textAlign: 'center', color: '#fff', width: '100%', maxWidth: 320, padding: 16 }}>
            <p style={{ fontSize: 36, margin: '0 0 12px' }}>✨</p>
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Mejorando foto con IA...</p>
            <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 20px' }}>Puede tardar hasta 1 minuto</p>
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#6C47FF,#C5A55A)', borderRadius: 3, animation: 'pb 2s ease-in-out infinite', width: '60%' }} />
            </div>
            <style>{`@keyframes pb{0%{transform:translateX(-100%)}100%{transform:translateX(260%)}}`}</style>
          </div>
        ) : fotoMejorada ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <p style={{ color: G.gold, fontSize: 12, fontWeight: 700, margin: 0 }}>¿Con cuál te quedas?</p>
            <div style={{ display: 'flex', gap: 8, width: '100%' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ color: '#aaa', fontSize: 10, margin: '0 0 4px' }}>ORIGINAL</p>
                <img src={fAct?.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', borderRadius: 8, border: '2px solid rgba(255,255,255,0.2)' }} />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ color: G.gold, fontSize: 10, margin: '0 0 4px', fontWeight: 700 }}>✨ MEJORADA</p>
                <img src={fotoMejorada.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', borderRadius: 8, border: '2px solid ' + G.gold }} />
              </div>
            </div>
          </div>
        ) : fAct ? (
          <img src={fAct.url} alt="" style={{ maxWidth: '94%', maxHeight: '94%', objectFit: 'contain', borderRadius: 8, transform: `scale(${scale}) translate(${offset.x/scale}px, ${offset.y/scale}px)`, transformOrigin: 'center', transition: isDragging.current || pinchRef.current ? 'none' : 'transform 0.2s', touchAction: 'none', userSelect: 'none' }} />
        ) : (
          <div style={{ color: '#555', textAlign: 'center' }}>
            <p style={{ fontSize: 48 }}>📦</p>
            <p style={{ fontSize: 13 }}>Sin fotos — agrega una abajo</p>
          </div>
        )}
        {fotos.length > 1 && idx > 0 && (
          <button onClick={() => { setIdx(idx - 1); resetZoom() }} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 26, width: 44, height: 44, borderRadius: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        )}
        {fotos.length > 1 && idx < fotos.length - 1 && (
          <button onClick={() => { setIdx(idx + 1); resetZoom() }} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 26, width: 44, height: 44, borderRadius: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        )}
        {fAct?.es_principal && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: G.gold, color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700 }}>⭐ PRINCIPAL</div>
        )}
        {fotos.length > 1 && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 10 }}>{idx + 1}/{fotos.length}</div>
        )}
        {scale > 1 && (
          <button onClick={resetZoom} style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>🔍 {scale.toFixed(1)}x ✕</button>
        )}
        {scale <= 1 && fAct && (
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.4)', color: '#888', padding: '3px 10px', borderRadius: 6, fontSize: 9 }}>👌 Pellizca para zoom • 2x tap para agrandar</div>
        )}
      </div>

      {/* Dots */}
      {fotos.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0', flexShrink: 0 }}>
          {fotos.map((_, i) => (
            <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 20 : 8, height: 8, borderRadius: 4, background: i === idx ? G.gold : '#444', cursor: 'pointer', transition: 'all 0.2s' }} />
          ))}
        </div>
      )}

      {/* Acciones foto actual */}
      {fAct && !mejorando && (
        <div style={{ padding: '8px 12px 4px', background: 'rgba(0,0,0,0.5)', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {fotoMejorada ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={confirmarMejora} style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: 'none', background: G.ok, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✅ Usar mejorada</button>
              <button onClick={mantenerAmbas} style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>🖼️ Guardar ambas</button>
              <button onClick={descartarMejora} style={{ flex: '0 0 100%', padding: '8px 4px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#aaa', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>↩️ Mantener solo original</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              {!fAct.es_principal && fAct.id && (
                <button onClick={() => marcarPrincipal(fAct)} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>⭐ Principal</button>
              )}
              {emp?.api_openai_key && (
                <button onClick={() => mejorar(fAct)} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', background: '#6C47FF', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✨ Mejorar IA</button>
              )}
              <button onClick={() => copiarAlPortapapeles(fAct.url)} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📋 Copiar</button>
              <button onClick={() => downloadPhoto(fAct.url, prod.codigo + (fotos.length > 1 ? '_' + (idx + 1) : ''))} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', background: '#333', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📥</button>
              <button onClick={() => eliminar(fAct)} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: 'none', background: '#C0392B', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>🗑</button>
            </div>
          )}
        </div>
      )}

      {/* Agregar fotos */}
      <div style={{ padding: '8px 12px 14px', background: 'rgba(0,0,0,0.5)', flexShrink: 0 }}>
        <p style={{ color: '#666', fontSize: 9, margin: '0 0 6px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>Agregar foto</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setCam(true)} disabled={agregando} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px dashed rgba(197,165,90,0.5)', background: 'rgba(197,165,90,0.1)', color: G.gold, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {agregando ? '⏳' : '📷 Cámara'}
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={agregando} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#aaa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            📁 Galería
          </button>
          <button onClick={pegarDesdePortapapeles} disabled={agregando} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#aaa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            📋 Pegar
          </button>
        </div>
      </div>
    </div>
  )
}
