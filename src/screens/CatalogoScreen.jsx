import { useState, useRef } from 'react'
import { supabase, subirFoto, comprimirImagen } from '../supabase'
import { G } from '../constants'
import { downloadPhoto, exportCSV } from '../helpers'
import { LineSel } from '../components/index'
import PhotoViewerModal from '../components/PhotoViewerModal'

export default function CatalogoScreen(P) {
  const { tit, lineas, linAct, setLinAct, prods, setScr, setEditP, setVentaP, logout, notify, loadAll, emp } = P
  const [f, setF] = useState('')
  const [fOrigen, setFOrigen] = useState('')
  const [viewerProd, setViewerProd] = useState(null)
  const origenesDisp = [...new Set(prods.map(p => p.origenes?.nombre).filter(Boolean))].sort()
  const fl = prods.filter(p =>
    (!f || p.nombre?.toLowerCase().includes(f.toLowerCase()) || p.codigo?.toLowerCase().includes(f.toLowerCase())) &&
    (!fOrigen || p.origenes?.nombre === fOrigen)
  )

  // ── Selección múltiple + ZIP fotos ──
  const [modoSel, setModoSel] = useState(false)
  const [sel, setSel] = useState([]) // ids seleccionados
  const [trabajando, setTrabajando] = useState('')
  const fileZipRef = useRef(null)

  const toggleSel = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const selTodos = () => setSel(fl.map(p => p.id))
  const limpiarSel = () => setSel([])

  const descargarZip = async () => {
    if (!window.JSZip) { notify('No cargó JSZip, recarga la página', 'error'); return }
    const elegidos = fl.filter(p => sel.includes(p.id) && p.foto_url)
    const sinFoto = sel.length - elegidos.length
    if (!elegidos.length) { notify('Ninguno de los seleccionados tiene foto', 'error'); return }
    setTrabajando('Generando ZIP...')
    try {
      const zip = new window.JSZip()
      for (let i = 0; i < elegidos.length; i++) {
        const p = elegidos[i]
        setTrabajando(`Descargando ${i + 1}/${elegidos.length}...`)
        try {
          const resp = await fetch(p.foto_url)
          const blob = await resp.blob()
          zip.file(`${p.codigo}.jpg`, blob)
        } catch (e) { /* si una falla, sigue con las demás */ }
      }
      setTrabajando('Comprimiendo...')
      const contenido = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(contenido)
      const a = document.createElement('a')
      a.href = url; a.download = `fotos_${(linAct?.nombre || 'catalogo')}_${new Date().toISOString().split('T')[0]}.zip`
      a.click(); URL.revokeObjectURL(url)
      notify(`✅ ${elegidos.length} fotos${sinFoto > 0 ? ` (${sinFoto} sin foto omitidos)` : ''}`)
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setTrabajando('')
  }

  const subirZip = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permitir resubir el mismo
    if (!file) return
    if (!window.JSZip) { notify('No cargó JSZip, recarga la página', 'error'); return }
    setTrabajando('Leyendo ZIP...')
    try {
      const zip = await window.JSZip.loadAsync(file)
      const archivos = Object.values(zip.files).filter(f => !f.dir && /\.(jpe?g|png|webp)$/i.test(f.name))
      if (!archivos.length) { notify('El ZIP no tiene imágenes jpg/png/webp', 'error'); setTrabajando(''); return }
      let ok = 0, noEnc = 0
      const noEncontrados = []
      for (let i = 0; i < archivos.length; i++) {
        const f2 = archivos[i]
        setTrabajando(`Subiendo ${i + 1}/${archivos.length}...`)
        // código = nombre sin carpeta ni extensión
        const base = f2.name.split('/').pop()
        const codigo = base.replace(/\.(jpe?g|png|webp)$/i, '').trim()
        const prod = prods.find(p => String(p.codigo) === codigo)
        if (!prod) { noEnc++; noEncontrados.push(codigo); continue }
        try {
          const blob = await f2.async('blob')
          const comprimida = await comprimirImagen(new File([blob], base, { type: blob.type || 'image/jpeg' }))
          const url = await subirFoto(comprimida, prod.codigo + '_' + Date.now())
          // marcar todas las anteriores como no principal, insertar nueva como principal
          await supabase.from('fotos_producto').update({ es_principal: false }).eq('producto_id', prod.id)
          await supabase.from('fotos_producto').insert({ producto_id: prod.id, url, es_principal: true, orden: 0 })
          await supabase.from('productos').update({ foto_url: url }).eq('id', prod.id)
          ok++
        } catch (er) { noEnc++; noEncontrados.push(codigo + '(error)') }
      }
      setTrabajando('')
      let msg = `✅ ${ok} fotos subidas como principal`
      if (noEnc > 0) msg += `. ${noEnc} no procesados: ${noEncontrados.slice(0, 8).join(', ')}${noEncontrados.length > 8 ? '...' : ''}`
      notify(msg)
      await loadAll()
    } catch (er) { notify('Error al leer ZIP: ' + er.message, 'error'); setTrabajando('') }
  }

  const eliminar = async (p) => {
    const { data: v } = await supabase.from('ventas').select('id').eq('producto_id', p.id).limit(1)
    if (v?.length > 0) { notify('No se puede eliminar, tiene ventas', 'error'); return }
    if (!confirm('¿Eliminar ' + p.nombre + '?')) return
    await supabase.from('productos').update({ activo: false }).eq('id', p.id)
    notify('Eliminado'); await loadAll()
  }

  const exportar = () => {
    exportCSV(fl, 'catalogo_' + new Date().toISOString().split('T')[0], [
      { k: 'codigo', l: 'Código' }, { k: 'nombre', l: 'Nombre' },
      { k: r => r.lineas?.nombre || '', l: 'Línea' }, { k: r => r.categorias?.nombre || '', l: 'Categoría' },
      { k: r => r.origenes?.nombre || '', l: 'Origen' }, { k: 'color', l: 'Color' },
      { k: 'precio_costo', l: 'Precio Costo' }, { k: 'precio_venta', l: 'Precio Venta' },
      { k: 'cantidad', l: 'Stock' }, { k: 'observacion', l: 'Observación' },
      { k: r => new Date(r.created_at).toLocaleDateString('es-PE'), l: 'Fecha Registro' }
    ]); notify('Exportado')
  }

  return (
    <div>
      {viewerProd && <PhotoViewerModal prod={viewerProd} emp={emp} notify={notify} loadAll={loadAll} onClose={() => setViewerProd(null)} />}
      <div style={{ background: G.gold, padding: '16px 16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, margin: 0 }}>{emp?.nombre}</p>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>📦 Catálogo</h1>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { setModoSel(m => !m); limpiarSel() }} style={{ background: modoSel ? '#fff' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: modoSel ? G.gold : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{modoSel ? '✕ Cancelar' : '☑️ Fotos'}</button>
            <button onClick={() => fileZipRef.current?.click()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>📤 ZIP</button>
            <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>🔄</button>
            <button onClick={exportar} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>📥</button>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Salir</button>
          </div>
          <input ref={fileZipRef} type="file" accept=".zip" onChange={subirZip} style={{ display: 'none' }} />
        </div>
        <input value={f} onChange={e => setF(e.target.value)} placeholder="Filtrar por nombre, código..."
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.9)', boxSizing: 'border-box' }} />
        {origenesDisp.length > 0 && (
          <select value={fOrigen} onChange={e => setFOrigen(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.9)', boxSizing: 'border-box', marginTop: 8, color: G.text }}>
            <option value="">📋 Origen: todos</option>
            {origenesDisp.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
      </div>
      <LineSel lineas={lineas} linAct={linAct} setLinAct={setLinAct} />
      <div style={{ padding: '4px 12px 0', fontSize: 12, color: G.muted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{fl.length} productos</span>
        {modoSel && <span style={{ display: 'flex', gap: 8 }}><button onClick={selTodos} style={{ background: 'none', border: 'none', color: G.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Todos</button><button onClick={limpiarSel} style={{ background: 'none', border: 'none', color: G.err, fontSize: 12, cursor: 'pointer' }}>Ninguno</button></span>}
      </div>
      {fl.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: G.muted }}>
          <p style={{ fontSize: 40 }}>📦</p><p>No hay productos</p>
          <button onClick={() => setScr('registrar')} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>➕ Registrar</button>
        </div>
      ) : (
        <div style={{ padding: '8px 12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {fl.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: modoSel && sel.includes(p.id) ? '2px solid ' + G.gold : '1px solid ' + G.border }}>
              <div onClick={() => modoSel ? toggleSel(p.id) : setViewerProd(p)} style={{ cursor: 'pointer', position: 'relative' }}>
                {modoSel && <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 2, width: 26, height: 26, borderRadius: 13, background: sel.includes(p.id) ? G.gold : 'rgba(255,255,255,0.85)', border: '2px solid ' + (sel.includes(p.id) ? G.gold : '#fff'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800 }}>{sel.includes(p.id) ? '✓' : ''}</div>}
                {p.foto_url
                  ? <img src={p.foto_url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: 130, background: G.goldLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 36, opacity: 0.3 }}>📦</span></div>
                }
                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: '2px 6px', fontSize: 9, color: '#fff', pointerEvents: 'none' }}>{modoSel ? 'Tocar' : '👁 Ver'}</div>
              </div>
              <div style={{ padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <span style={{ fontSize: 9, background: G.goldSf, color: G.goldDk, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{p.codigo}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: G.gold }}>S/{p.precio_venta}</span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, margin: '3px 0 1px', color: G.text, lineHeight: 1.2 }}>{p.nombre}</p>
                <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Stock: {p.cantidad} {p.color ? '• ' + p.color : ''}</p>
                {p.secciones?.nombre && <p style={{ fontSize: 8, color: G.goldDk, margin: '1px 0 0', fontWeight: 600 }}>🗂️ {p.secciones.nombre}</p>}
                <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                  <button onClick={() => { setEditP(p); setScr('registrar') }} style={{ flex: 1, padding: 4, borderRadius: 5, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => { setVentaP(p); setScr('venta') }} disabled={p.cantidad <= 0} style={{ flex: 1, padding: 4, borderRadius: 5, border: 'none', background: p.cantidad > 0 ? G.gold : '#ccc', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Vender</button>
                  {p.foto_url && <button onClick={() => downloadPhoto(p.foto_url, p.codigo)} style={{ padding: 4, borderRadius: 5, border: '1px solid ' + G.border, background: 'transparent', color: G.gold, fontSize: 9, cursor: 'pointer' }}>📥</button>}
                  <button onClick={() => eliminar(p)} style={{ padding: 4, borderRadius: 5, border: '1px solid #eee', background: 'transparent', color: G.err, fontSize: 9, cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barra flotante: descargar ZIP de seleccionados */}
      {modoSel && sel.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid ' + G.border, padding: 12, boxShadow: '0 -2px 12px rgba(0,0,0,0.12)', zIndex: 50 }}>
          <button onClick={descargarZip} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>📦 Descargar ZIP de fotos ({sel.length})</button>
        </div>
      )}

      {/* Overlay de progreso */}
      {trabajando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: G.text }}>{trabajando}</p>
          </div>
        </div>
      )}
    </div>
  )
}
