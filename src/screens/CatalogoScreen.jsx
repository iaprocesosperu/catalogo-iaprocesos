import { useState, useRef } from 'react'
import { supabase, subirFoto, comprimirImagen } from '../supabase'
import { G } from '../constants'
import { downloadPhoto, exportCSV } from '../helpers'
import { LineSel } from '../components/index'
import PhotoViewerModal from '../components/PhotoViewerModal'

export default function CatalogoScreen(P) {
  const { tit, lineas, linAct, setLinAct, prods, setScr, setEditP, setVentaP, logout, notify, loadAll, emp, setRetorno } = P
  const [f, setF] = useState('')
  const [fOrigen, setFOrigen] = useState('')
  const [viewerProd, setViewerProd] = useState(null)
  const [ocultarAgotados, setOcultarAgotados] = useState(true)
  const origenesDisp = [...new Set(prods.map(p => p.origenes?.nombre).filter(Boolean))].sort()
  const fl = prods.filter(p =>
    (!f || p.nombre?.toLowerCase().includes(f.toLowerCase()) || p.codigo?.toLowerCase().includes(f.toLowerCase())) &&
    (!fOrigen || p.origenes?.nombre === fOrigen) &&
    (!ocultarAgotados || p.cantidad > 0)
  )

  // ── Selección múltiple + ZIP fotos ──
  const [modoSel, setModoSel] = useState(false)
  const [modoNav, setModoNav] = useState(false)
  const [navIdx, setNavIdx] = useState(null) // índice en fl del producto en el visor
  const [sel, setSel] = useState([]) // ids seleccionados
  const [trabajando, setTrabajando] = useState('')
  const [pideTipo, setPideTipo] = useState(false)
  const fileZipRef = useRef(null)

  const toggleSel = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const selTodos = () => setSel(fl.map(p => p.id))
  const limpiarSel = () => setSel([])

  // ── Acciones masivas ──
  const ocultarSel = async (valor) => {
    if (!sel.length) return
    setTrabajando(valor ? 'Ocultando...' : 'Mostrando...')
    try {
      await supabase.from('productos').update({ oculto: valor }).in('id', sel)
      notify(`✅ ${sel.length} ${valor ? 'ocultados' : 'mostrados'}`)
      limpiarSel(); await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setTrabajando('')
  }
  const eliminarSel = async () => {
    if (!sel.length) return
    if (!confirm(`¿Eliminar ${sel.length} productos? Esta acción no se puede deshacer.`)) return
    if (!confirm('Confirma de nuevo: se eliminarán definitivamente.')) return
    setTrabajando('Eliminando...')
    try {
      await supabase.from('productos').update({ activo: false }).in('id', sel)
      notify(`✅ ${sel.length} eliminados`)
      limpiarSel(); await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setTrabajando('')
  }

  // ── Modo navegación (visor) ──
  const navProd = navIdx != null ? fl[navIdx] : null
  const abrirNav = (p) => { const i = fl.findIndex(x => x.id === p.id); setNavIdx(i >= 0 ? i : 0) }
  const cerrarNav = () => setNavIdx(null)
  const editarDesdeNav = () => {
    if (!navProd) return
    if (setRetorno) setRetorno('catalogo')
    setEditP(navProd); cerrarNav(); setScr('registrar')
  }

  // Dibuja el código en una franja blanca inferior (para lectura por IA/OCR)
  const fotoConCodigo = (fotoUrl, codigo) => new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = img.naturalWidth, h = img.naturalHeight
        const franja = Math.max(70, Math.round(h * 0.15)) // 15% del alto, mínimo 70px
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h + franja
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, w, h)
        // texto del código, centrado en la franja
        const texto = 'COD: ' + codigo
        let fontSize = Math.round(franja * 0.55)
        ctx.fillStyle = '#000000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `bold ${fontSize}px Arial, sans-serif`
        // reducir si no cabe a lo ancho
        while (ctx.measureText(texto).width > w * 0.92 && fontSize > 12) {
          fontSize -= 2; ctx.font = `bold ${fontSize}px Arial, sans-serif`
        }
        ctx.fillText(texto, w / 2, h + franja / 2)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob null')), 'image/jpeg', 0.9)
      } catch (e) { reject(e) }
    }
    img.onerror = () => reject(new Error('no se pudo cargar la imagen'))
    img.src = fotoUrl
  })

  const descargarZip = async (conCodigo) => {
    if (!window.JSZip) { notify('No cargó JSZip, recarga la página', 'error'); return }
    setPideTipo(false)
    const elegidos = fl.filter(p => sel.includes(p.id) && p.foto_url)
    const sinFoto = sel.length - elegidos.length
    if (!elegidos.length) { notify('Ninguno de los seleccionados tiene foto', 'error'); return }
    setTrabajando('Generando ZIP...')
    let fallidas = 0
    try {
      const zip = new window.JSZip()
      for (let i = 0; i < elegidos.length; i++) {
        const p = elegidos[i]
        setTrabajando(`Procesando ${i + 1}/${elegidos.length}...`)
        try {
          if (conCodigo) {
            const blob = await fotoConCodigo(p.foto_url, p.codigo)
            zip.file(`${p.codigo}.jpg`, blob)
          } else {
            const resp = await fetch(p.foto_url)
            const blob = await resp.blob()
            zip.file(`${p.codigo}.jpg`, blob)
          }
        } catch (e) { fallidas++ }
      }
      setTrabajando('Comprimiendo...')
      const contenido = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(contenido)
      const a = document.createElement('a')
      const sufijo = conCodigo ? '_con_codigo' : ''
      a.href = url; a.download = `fotos${sufijo}_${(linAct?.nombre || 'catalogo')}_${new Date().toISOString().split('T')[0]}.zip`
      a.click(); URL.revokeObjectURL(url)
      let msg = `✅ ${elegidos.length - fallidas} fotos`
      if (fallidas > 0) msg += `, ${fallidas} fallaron`
      if (sinFoto > 0) msg += `, ${sinFoto} sin foto`
      notify(msg)
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
      <div style={{ background: G.gold, padding: '16px 16px 12px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, margin: 0 }}>{emp?.nombre}</p>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>📦 Catálogo</h1>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => { setModoNav(n => !n); setModoSel(false); limpiarSel() }} style={{ background: modoNav ? '#fff' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: modoNav ? G.gold : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{modoNav ? '✕ Salir' : '👁️ Ver'}</button>
            <button onClick={() => { setModoSel(m => !m); setModoNav(false); limpiarSel() }} style={{ background: modoSel ? '#fff' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: modoSel ? G.gold : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{modoSel ? '✕ Cancelar' : '☑️ Sel'}</button>
            <button onClick={() => fileZipRef.current?.click()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>📤 ZIP</button>
            <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>🔄</button>
            <button onClick={exportar} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>📥</button>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Salir</button>
          </div>
          <input ref={fileZipRef} type="file" accept=".zip" onChange={subirZip} style={{ display: 'none' }} />
        </div>
        <input value={f} onChange={e => setF(e.target.value)} placeholder="Filtrar por nombre, código..."
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.9)', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          {origenesDisp.length > 0 && (
            <select value={fOrigen} onChange={e => setFOrigen(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.9)', boxSizing: 'border-box', color: G.text }}>
              <option value="">📋 Origen: todos</option>
              {origenesDisp.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          <button onClick={() => setOcultarAgotados(v => !v)} style={{ padding: '8px 10px', borderRadius: 10, border: 'none', background: ocultarAgotados ? '#fff' : 'rgba(255,255,255,0.2)', color: ocultarAgotados ? G.gold : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{ocultarAgotados ? '✓ Sin agotados' : 'Ver agotados'}</button>
        </div>
      </div>
      <div style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 39 }}>
        <LineSel lineas={lineas} linAct={linAct} setLinAct={setLinAct} />
      </div>
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
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: modoSel && sel.includes(p.id) ? '2px solid ' + G.gold : '1px solid ' + G.border, opacity: p.oculto ? 0.5 : 1 }}>
              <div onClick={() => modoSel ? toggleSel(p.id) : modoNav ? abrirNav(p) : setViewerProd(p)} style={{ cursor: 'pointer', position: 'relative' }}>
                {modoSel && <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 2, width: 26, height: 26, borderRadius: 13, background: sel.includes(p.id) ? G.gold : 'rgba(255,255,255,0.85)', border: '2px solid ' + (sel.includes(p.id) ? G.gold : '#fff'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800 }}>{sel.includes(p.id) ? '✓' : ''}</div>}
                {p.oculto && <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, background: '#374151', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>👁️‍🗨️ Oculto</div>}
                {p.foto_url
                  ? <img src={p.foto_url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: 130, background: G.goldLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 36, opacity: 0.3 }}>📦</span></div>
                }
                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: '2px 6px', fontSize: 9, color: '#fff', pointerEvents: 'none' }}>{modoSel ? 'Tocar' : modoNav ? '👁️ Abrir' : '👁 Ver'}</div>
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
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: G.text, textAlign: 'center' }}>{sel.length} seleccionados</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => setPideTipo(true)} style={{ padding: 11, borderRadius: 10, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📦 Descargar ZIP</button>
            <button onClick={() => ocultarSel(true)} style={{ padding: 11, borderRadius: 10, border: 'none', background: '#374151', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>👁️‍🗨️ Ocultar</button>
            <button onClick={() => ocultarSel(false)} style={{ padding: 11, borderRadius: 10, border: 'none', background: G.ok, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>👁️ Mostrar</button>
            <button onClick={eliminarSel} style={{ padding: 11, borderRadius: 10, border: 'none', background: G.err, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🗑️ Eliminar</button>
          </div>
        </div>
      )}

      {/* Visor de navegación */}
      {navProd && (
        <div onClick={cerrarNav} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ background: G.gold, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 800, margin: 0 }}>{navIdx + 1} / {fl.length}</p>
              <button onClick={cerrarNav} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              {navProd.foto_url
                ? <img src={navProd.foto_url} alt="" style={{ width: '100%', height: 340, objectFit: 'contain', borderRadius: 12, background: G.goldLt }} />
                : <div style={{ width: '100%', height: 340, background: G.goldLt, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 48, opacity: 0.3 }}>📦</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 11, background: G.goldSf, color: G.goldDk, padding: '3px 8px', borderRadius: 5, fontWeight: 700 }}>{navProd.codigo}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: G.gold }}>S/{navProd.precio_venta}</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, margin: '6px 0 2px', color: G.text }}>{navProd.nombre}{navProd.oculto ? ' 👁️‍🗨️' : ''}</p>
              <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>Stock: {navProd.cantidad}{navProd.color ? ' • ' + navProd.color : ''}{navProd.atributos?.talla ? ' • T:' + navProd.atributos.talla : ''}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => setNavIdx(i => Math.max(0, i - 1))} disabled={navIdx === 0} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: navIdx === 0 ? '#f5f5f5' : '#fff', color: navIdx === 0 ? '#bbb' : G.text, fontSize: 13, fontWeight: 700, cursor: navIdx === 0 ? 'default' : 'pointer' }}>‹ Anterior</button>
                <button onClick={() => setNavIdx(i => Math.min(fl.length - 1, i + 1))} disabled={navIdx >= fl.length - 1} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: navIdx >= fl.length - 1 ? '#f5f5f5' : '#fff', color: navIdx >= fl.length - 1 ? '#bbb' : G.text, fontSize: 13, fontWeight: 700, cursor: navIdx >= fl.length - 1 ? 'default' : 'pointer' }}>Siguiente ›</button>
              </div>
              <button onClick={editarDesdeNav} style={{ width: '100%', padding: 13, marginTop: 8, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✏️ Editar en catálogo</button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: tipo de descarga */}
      {pideTipo && (
        <div onClick={() => setPideTipo(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: G.text }}>📦 Descargar {sel.length} fotos</h3>
            <p style={{ fontSize: 12, color: G.muted, margin: '0 0 16px' }}>¿Cómo quieres las imágenes?</p>
            <button onClick={() => descargarZip(false)} style={{ width: '100%', padding: 14, borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', color: G.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}>📷 Fotos sin código<br /><span style={{ fontSize: 11, fontWeight: 400, color: G.muted }}>La imagen original, tal cual</span></button>
            <button onClick={() => descargarZip(true)} style={{ width: '100%', padding: 14, borderRadius: 10, border: '1px solid ' + G.gold, background: G.goldLt, color: G.goldDk, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>🏷️ Fotos con código<br /><span style={{ fontSize: 11, fontWeight: 400, color: G.muted }}>Agrega el código abajo (para leer con IA)</span></button>
            <button onClick={() => setPideTipo(false)} style={{ width: '100%', padding: 10, marginTop: 12, borderRadius: 10, border: 'none', background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
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
