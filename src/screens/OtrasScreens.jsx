import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'
import { G, iS } from '../constants'
import { exportCSV } from '../helpers'
import { Hdr, Crd, VoiceBtn } from '../components/index'

/* ═══ SUBMENÚ ═══ */
export function SubMenu(P) {
  const { tit, setScr } = P
  const items = [
    { id: 'lineas', i: '📏', l: 'Líneas', d: 'Ropa, Gatos...' },
    { id: 'categorias', i: '🏷️', l: 'Categorías', d: 'Por línea activa' },
    { id: 'origenes', i: '📋', l: 'Orígenes', d: 'Fardos, entregas' },
    { id: 'colores', i: '🎨', l: 'Colores', d: 'Maestro de colores' },
    { id: 'listaTallas', i: '📐', l: 'Listas de Tallas', d: 'Mis listas de tallas' },
    { id: 'clientes', i: '👥', l: 'Clientes', d: 'Gestión clientes' },
    { id: 'stock', i: '📊', l: 'Stock', d: 'Inventario' },
    { id: 'historial', i: '📋', l: 'Ventas', d: 'Historial' }
  ]
  return (
    <div>
      <Hdr tit={tit} sec="⚙️ Más opciones" onBack={() => setScr('catalogo')} />
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map(it => (
          <button key={it.id} onClick={() => setScr(it.id)} style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid ' + G.border, cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{it.i}</span>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: G.text }}>{it.l}</p>
            <p style={{ fontSize: 10, color: G.muted, margin: '2px 0 0' }}>{it.d}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══ LISTAS DE TALLAS ═══ */
export function ListasTallasScr(P) {
  const { eid, tit, listaTallas, notify, loadAll, setScr } = P
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [tallasStr, setTallasStr] = useState('')
  const formRef = useRef(null)

  const misListas = listaTallas.filter(l => l.empresa_id === eid || l.empresa_id === null)

  const abrir = (l) => {
    if (l) { setEditId(l.id); setNombre(l.nombre); setTallasStr(l.tallas?.join(', ') || '') }
    else { setEditId(null); setNombre(''); setTallasStr('') }
    setShowAdd(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const guardar = async () => {
    if (!nombre.trim()) { notify('Nombre obligatorio', 'error'); return }
    const tallas = tallasStr.split(',').map(t => t.trim()).filter(Boolean)
    if (!tallas.length) { notify('Agrega al menos una talla', 'error'); return }
    if (editId) {
      const lista = listaTallas.find(l => l.id === editId)
      if (lista?.empresa_id === null) { notify('No puedes editar listas predefinidas. Crea una propia.', 'error'); return }
      await supabase.from('listas_tallas').update({ nombre: nombre.trim(), tallas }).eq('id', editId)
      notify('Lista actualizada')
    } else {
      await supabase.from('listas_tallas').insert({ empresa_id: eid, nombre: nombre.trim(), tallas })
      notify('Lista creada')
    }
    setShowAdd(false); setEditId(null); setNombre(''); setTallasStr('')
    await loadAll()
  }

  const eliminar = async (l) => {
    if (l.empresa_id === null) { notify('No puedes eliminar listas predefinidas', 'error'); return }
    if (!confirm('¿Eliminar lista ' + l.nombre + '?')) return
    await supabase.from('listas_tallas').update({ activo: false }).eq('id', l.id)
    notify('Eliminada'); await loadAll()
  }

  return (
    <div>
      <Hdr tit={tit} sec="📐 Listas de Tallas" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <button onClick={() => abrir(null)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', color: G.gold, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          ➕ Nueva lista de tallas
        </button>

        {showAdd && (
          <div ref={formRef}>
            <Crd title={editId ? 'Editar lista' : 'Nueva lista'}>
              <label style={{ fontSize: 11, color: G.muted }}>Nombre de la lista *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Ropa Mujer, Zapatos, Pantalones..." style={iS(G)} />
              <label style={{ fontSize: 11, color: G.muted }}>Tallas (separadas por coma) *</label>
              <input value={tallasStr} onChange={e => setTallasStr(e.target.value)} placeholder="XS, S, M, L, XL, XXL" style={iS(G)} />
              {tallasStr && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                  {tallasStr.split(',').map((t, i) => t.trim() && (
                    <span key={i} style={{ padding: '4px 10px', borderRadius: 6, background: G.goldSf, color: G.goldDk, fontSize: 12, fontWeight: 600 }}>{t.trim()}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowAdd(false); setEditId(null) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={guardar} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
              </div>
            </Crd>
          </div>
        )}

        <p style={{ fontSize: 11, color: G.muted, margin: '4px 0 8px' }}>Las listas predefinidas (🌐) son globales. Crea las tuyas propias para personalizarlas.</p>

        {misListas.map(l => (
          <div key={l.id} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, border: '1px solid ' + G.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{l.nombre}</p>
                  {l.empresa_id === null && <span style={{ fontSize: 9, background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🌐 Global</span>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {l.tallas?.map((t, i) => (
                    <span key={i} style={{ padding: '2px 8px', borderRadius: 4, background: G.goldSf, color: G.goldDk, fontSize: 11, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              </div>
              {l.empresa_id !== null && (
                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                  <button onClick={() => abrir(l)} style={{ background: G.goldSf, color: G.goldDk, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>Editar</button>
                  <button onClick={() => eliminar(l)} style={{ background: '#FEE2E2', color: G.err, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>🗑</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ DETALLE ORIGEN ═══ */
function OrigenDetalle({ origen, eid, onClose }) {
  const [prods, setProds] = useState([])
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const [{ data: ps }, { data: vs }] = await Promise.all([
        supabase.from('productos').select('*,categorias(nombre)')
          .eq('empresa_id', eid).eq('origen_id', origen.id).eq('activo', true).order('codigo'),
        supabase.from('ventas').select('*').eq('empresa_id', eid)
      ])
      const prods = ps || []
      const prodIds = new Set(prods.map(p => p.id))
      const ventasOrigen = (vs || []).filter(v => prodIds.has(v.producto_id))
      setProds(prods); setVentas(ventasOrigen); setCargando(false)
    }
    cargar()
  }, [])

  const invStock = prods.reduce((s, p) => s + (p.precio_costo || 0) * p.cantidad, 0)
  const invVendido = ventas.reduce((s, v) => s + (v.precio_costo || 0) * v.cantidad, 0)
  const totalInv = invStock + invVendido
  const ventaReal = ventas.reduce((s, v) => s + v.total, 0)
  const ventaEsperada = prods.reduce((s, p) => s + (p.precio_venta || 0) * p.cantidad, 0)
  const gananciaReal = ventas.reduce((s, v) => s + (v.precio_venta_real - v.precio_costo) * v.cantidad, 0)
  const gananciaEsperada = gananciaReal + prods.reduce((s, p) => s + (p.precio_venta - p.precio_costo) * p.cantidad, 0)
  const pctGan = totalInv > 0 ? ((gananciaEsperada / totalInv) * 100).toFixed(0) : 0
  const totalItemsVendidos = ventas.reduce((s, v) => s + v.cantidad, 0)
  const totalItemsStock = prods.reduce((s, p) => s + p.cantidad, 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: G.bg, zIndex: 8000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ background: G.gold, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, margin: 0 }}>Detalle de origen</p>
          <h2 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{origen.nombre}</h2>
        </div>
        <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, fontWeight: 700,
          background: origen.estado === 'cerrado' ? '#FEE2E2' : origen.estado === 'observado' ? '#FEF3C7' : '#D1FAE5',
          color: origen.estado === 'cerrado' ? G.err : origen.estado === 'observado' ? '#92400E' : '#065F46' }}>
          {origen.estado === 'cerrado' ? '🔴 Cerrado' : origen.estado === 'observado' ? '⚠️ Observado' : '🟢 Activo'}
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: G.goldLt, borderRadius: 10, padding: 12, border: '1px solid ' + G.border }}>
            <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Items en stock</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: G.gold, margin: '2px 0' }}>{totalItemsStock}<span style={{ fontSize: 10, color: G.muted }}>/{origen.cantidad || '∞'}</span></p>
            <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>{prods.length} productos • {totalItemsVendidos} vendidos</p>
          </div>
          <div style={{ background: G.goldLt, borderRadius: 10, padding: 12, border: '1px solid ' + G.border }}>
            <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Fecha</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: G.text, margin: '2px 0' }}>{origen.fecha || '—'}</p>
            <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>{origen.observaciones || ''}</p>
          </div>
          <div style={{ background: '#1A1A1A', borderRadius: 10, padding: 12 }}>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Inversión total</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '2px 0' }}>S/{totalInv.toFixed(0)}</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', margin: 0 }}>stock S/{invStock.toFixed(0)} + vendido S/{invVendido.toFixed(0)}</p>
          </div>
          <div style={{ background: gananciaEsperada >= 0 ? G.ok : G.err, borderRadius: 10, padding: 12 }}>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', margin: 0 }}>Ganancia total</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '2px 0' }}>{gananciaEsperada >= 0 ? '+' : ''}S/{gananciaEsperada.toFixed(0)}</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{pctGan}% margen</p>
          </div>
        </div>
        {ventas.length > 0 && (
          <div style={{ background: '#F0FDF4', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid #BBF7D0' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#065F46', margin: '0 0 6px' }}>💰 Ventas realizadas</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <div><p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Cobrado</p><p style={{ fontSize: 16, fontWeight: 800, color: G.ok, margin: 0 }}>S/{ventaReal.toFixed(0)}</p></div>
              <div><p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Ganancia real</p><p style={{ fontSize: 16, fontWeight: 800, color: G.ok, margin: 0 }}>+S/{gananciaReal.toFixed(0)}</p></div>
              <div><p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Pendiente</p><p style={{ fontSize: 16, fontWeight: 800, color: G.gold, margin: 0 }}>S/{ventaEsperada.toFixed(0)}</p></div>
            </div>
          </div>
        )}
        <p style={{ fontSize: 12, fontWeight: 700, color: G.text, margin: '0 0 8px' }}>Productos de este origen</p>
        {cargando ? (
          <div style={{ textAlign: 'center', padding: 30, color: G.muted }}>⏳ Cargando...</div>
        ) : prods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: G.muted }}>Sin productos registrados</div>
        ) : prods.map(p => {
          const gan = p.precio_costo > 0 ? p.precio_venta - p.precio_costo : null
          const ganTotal = gan !== null ? gan * p.cantidad : null
          const pct = p.precio_costo > 0 ? ((gan / p.precio_costo) * 100).toFixed(0) : null
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', gap: 10, border: '1px solid ' + G.border }}>
              {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                : <div style={{ width: 52, height: 52, background: G.goldLt, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 18, opacity: 0.3 }}>📦</span></div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 9, background: G.goldSf, color: G.goldDk, padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>{p.codigo}</span>
                    <p style={{ fontSize: 11, fontWeight: 600, margin: '2px 0 0', lineHeight: 1.2 }}>{p.nombre}</p>
                    <p style={{ fontSize: 9, color: G.muted, margin: '1px 0 0' }}>Stock: {p.cantidad} • {p.categorias?.nombre || ''}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: G.gold, margin: 0 }}>S/{p.precio_venta}</p>
                    {p.precio_costo > 0 && <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>C: S/{p.precio_costo}</p>}
                  </div>
                </div>
                {gan !== null && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: gan > 0 ? '#D1FAE5' : '#FEE2E2', color: gan > 0 ? '#065F46' : G.err }}>
                      {gan > 0 ? '▲' : '▼'} S/{gan.toFixed(1)} x unid ({pct}%)
                    </span>
                    {ganTotal !== null && p.cantidad > 0 && <span style={{ fontSize: 9, color: G.muted }}>Total: S/{ganTotal.toFixed(0)}</span>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══ ORÍGENES ═══ */
export function OrigenesScr(P) {
  const { eid, lid, tit, oris, notify, loadAll, setScr } = P
  const [showAdd, setShowAdd] = useState(false)
  const [f, setF] = useState({ nombre: '', cantidad: '', precio_costo_defecto: '', precio_venta_defecto: '', fecha: '', observaciones: '' })
  const [editId, setEditId] = useState(null)
  const [detalleOrigen, setDetalleOrigen] = useState(null)
  const [usados, setUsados] = useState({})
  const formRef = useRef(null)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const invCalc = parseFloat(f.cantidad || 0) * parseFloat(f.precio_costo_defecto || 0)

  useEffect(() => {
    const cargarUsados = async () => {
      if (!oris.length) return
      const { data } = await supabase.from('productos').select('origen_id').eq('empresa_id', eid).eq('activo', true).in('origen_id', oris.map(o => o.id))
      if (data) { const c = {}; data.forEach(p => { c[p.origen_id] = (c[p.origen_id] || 0) + 1 }); setUsados(c) }
    }
    cargarUsados()
  }, [oris])

  const guardar = async () => {
    if (!f.nombre.trim()) { notify('Nombre obligatorio', 'error'); return }
    const data = { empresa_id: eid, linea_id: lid, nombre: f.nombre.trim(), cantidad: parseInt(f.cantidad) || 0, precio_costo_defecto: parseFloat(f.precio_costo_defecto) || null, precio_venta_defecto: parseFloat(f.precio_venta_defecto) || null, fecha: f.fecha || null, observaciones: f.observaciones || null }
    if (editId) { await supabase.from('origenes').update(data).eq('id', editId); notify('Actualizado') }
    else { await supabase.from('origenes').insert({ ...data, estado: 'activo' }); notify('Agregado') }
    setShowAdd(false); setEditId(null); setF({ nombre: '', cantidad: '', precio_costo_defecto: '', precio_venta_defecto: '', fecha: '', observaciones: '' }); await loadAll()
  }

  const editar = o => {
    setEditId(o.id); setF({ nombre: o.nombre || '', cantidad: String(o.cantidad || ''), precio_costo_defecto: String(o.precio_costo_defecto || ''), precio_venta_defecto: String(o.precio_venta_defecto || ''), fecha: o.fecha || '', observaciones: o.observaciones || '' })
    setShowAdd(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const eliminar = async id => { if (!confirm('¿Eliminar?')) return; await supabase.from('origenes').update({ activo: false }).eq('id', id); notify('Eliminado'); await loadAll() }
  const totalInv = oris.reduce((s, o) => s + (o.cantidad || 0) * (o.precio_costo_defecto || 0), 0)
  const totalItems = oris.reduce((s, o) => s + (o.cantidad || 0), 0)
  const totalVenta = oris.reduce((s, o) => s + (o.cantidad || 0) * (o.precio_venta_defecto || 0), 0)

  if (detalleOrigen) return <OrigenDetalle origen={detalleOrigen} eid={eid} onClose={() => setDetalleOrigen(null)} />

  return (
    <div>
      <Hdr tit={tit} sec="📋 Orígenes" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: G.gold, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, margin: 0 }}>Inversión Total</p>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>S/{totalInv.toFixed(0)}</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, margin: 0 }}>{totalItems} items</p>
          </div>
          <div style={{ flex: 1, background: G.goldDk, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, margin: 0 }}>Venta Esperada</p>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>S/{totalVenta.toFixed(0)}</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, margin: 0 }}>+S/{(totalVenta - totalInv).toFixed(0)} ganancia</p>
          </div>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null); setF({ nombre: '', cantidad: '', precio_costo_defecto: '', precio_venta_defecto: '', fecha: '', observaciones: '' }); if (!showAdd) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', color: G.gold, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          ➕ Nuevo origen
        </button>
        {showAdd && (
          <div ref={formRef}>
            <Crd title={editId ? 'Editar origen' : 'Nuevo origen'}>
              <label style={{ fontSize: 11, color: G.muted }}>Nombre *</label>
              <input value={f.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Fardo 1 Mujeres" style={iS(G)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Cantidad items <span style={{ fontWeight: 400 }}>(opcional)</span></label><input value={f.cantidad} onChange={e => s('cantidad', e.target.value)} type="number" placeholder="100" style={iS(G)} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Precio Costo (S/)</label><input value={f.precio_costo_defecto} onChange={e => s('precio_costo_defecto', e.target.value)} type="number" placeholder="5" style={iS(G)} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Precio Venta (S/)</label><input value={f.precio_venta_defecto} onChange={e => s('precio_venta_defecto', e.target.value)} type="number" placeholder="15" style={iS(G)} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Fecha</label><input value={f.fecha} onChange={e => s('fecha', e.target.value)} type="date" style={iS(G)} /></div>
              </div>
              {invCalc > 0 && (<div style={{ background: G.goldLt, borderRadius: 8, padding: 10, marginBottom: 8, textAlign: 'center' }}><p style={{ fontSize: 10, color: G.muted, margin: 0 }}>Inversión calculada</p><p style={{ fontSize: 18, fontWeight: 800, color: G.gold, margin: 0 }}>S/ {invCalc.toFixed(2)}</p><p style={{ fontSize: 9, color: G.muted, margin: 0 }}>{f.cantidad} items × S/{f.precio_costo_defecto}</p></div>)}
              <label style={{ fontSize: 11, color: G.muted }}>Observaciones</label>
              <textarea value={f.observaciones} onChange={e => s('observaciones', e.target.value)} rows={2} style={{ ...iS(G), resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowAdd(false); setEditId(null) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={guardar} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{editId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </Crd>
          </div>
        )}
        {oris.map(o => {
          const usadosCount = usados[o.id] || 0
          const pct = o.cantidad > 0 ? usadosCount / o.cantidad : null
          return (
            <div key={o.id} style={{ background: '#fff', borderRadius: 10, marginBottom: 6, border: '1px solid ' + G.border, overflow: 'hidden' }}>
              {o.cantidad > 0 && (<div style={{ height: 3, background: '#eee' }}><div style={{ height: '100%', width: Math.min(pct * 100, 100) + '%', background: pct >= 1 ? G.err : pct >= 0.8 ? G.warn : G.ok, transition: 'width 0.3s' }} /></div>)}
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setDetalleOrigen(o)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{o.nombre}</p>
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: o.estado === 'cerrado' ? '#FEE2E2' : o.estado === 'observado' ? '#FEF3C7' : '#D1FAE5', color: o.estado === 'cerrado' ? G.err : o.estado === 'observado' ? '#92400E' : '#065F46' }}>
                        {o.estado === 'cerrado' ? '🔴 Cerrado' : o.estado === 'observado' ? '⚠️ Observado' : '🟢 Activo'}
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: G.muted, margin: '3px 0 1px' }}>
                      {o.cantidad > 0 ? <span style={{ fontWeight: 600, color: pct >= 1 ? G.err : pct >= 0.8 ? G.warn : G.text }}>{usadosCount}/{o.cantidad} usados</span> : <span>{usadosCount} registrados</span>}
                      {o.precio_costo_defecto ? ' • C: S/' + o.precio_costo_defecto : ''}{o.precio_venta_defecto ? ' V: S/' + o.precio_venta_defecto : ''}{o.cantidad && o.precio_costo_defecto ? ' • Inv: S/' + (o.cantidad * o.precio_costo_defecto).toFixed(0) : ''}{o.fecha ? ' • ' + o.fecha : ''}
                    </p>
                    {o.observaciones && <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>{o.observaciones}</p>}
                    <p style={{ fontSize: 9, color: G.gold, margin: '2px 0 0' }}>👆 Toca para ver detalle</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                    <button onClick={() => editar(o)} style={{ background: G.goldSf, color: G.goldDk, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>Editar</button>
                    <button onClick={() => eliminar(o.id)} style={{ background: '#FEE2E2', color: G.err, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>🗑</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══ CATEGORÍAS ═══ */
export function CatsScr(P) {
  const { eid, lid, tit, cats, listaTallas, notify, loadAll, setScr } = P
  const [showAdd, setShowAdd] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [nombre, setNombre] = useState('')
  const [tallasStr, setTallasStr] = useState('')
  const [listaSelId, setListaSelId] = useState('')
  const formRef = useRef(null)

  const listasDisp = listaTallas?.filter(l => l.activo !== false) || []

  const abrir = c => {
    if (c) {
      setEditCat(c); setNombre(c.nombre)
      const t = c.tallas; const arr = !t ? [] : Array.isArray(t) ? t : []
      setTallasStr(arr.join(', ')); setListaSelId('')
    } else { setEditCat(null); setNombre(''); setTallasStr(''); setListaSelId('') }
    setShowAdd(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const onListaChange = (id) => {
    setListaSelId(id)
    if (id) {
      const lista = listasDisp.find(l => l.id === parseInt(id))
      if (lista) setTallasStr(lista.tallas.join(', '))
    }
  }

  const guardar = async () => {
    if (!nombre.trim()) { notify('Nombre obligatorio', 'error'); return }
    const tallas = tallasStr ? tallasStr.split(',').map(t => t.trim()).filter(Boolean) : []
    if (editCat) { const { error } = await supabase.from('categorias').update({ nombre: nombre.trim(), tallas }).eq('id', editCat.id); if (error) { notify('Error: ' + error.message, 'error'); return }; notify('Actualizado') }
    else { const { error } = await supabase.from('categorias').insert({ empresa_id: eid, linea_id: lid, nombre: nombre.trim(), tallas, atributos: [] }); if (error) { notify('Error: ' + error.message, 'error'); return }; notify('Agregado') }
    setShowAdd(false); setEditCat(null); await loadAll()
  }

  const eliminar = async c => { if (!confirm('¿Eliminar ' + c.nombre + '?')) return; await supabase.from('categorias').update({ activo: false }).eq('id', c.id); notify('Eliminado'); await loadAll() }

  return (
    <div>
      <Hdr tit={tit} sec="🏷️ Categorías" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <button onClick={() => abrir(null)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', color: G.gold, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>➕ Nueva categoría</button>
        {showAdd && (
          <div ref={formRef}>
            <Crd title={editCat ? 'Editar categoría' : 'Nueva categoría'}>
              <label style={{ fontSize: 11, color: G.muted }}>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Blusas" style={iS(G)} />

              <label style={{ fontSize: 11, color: G.muted }}>Seleccionar lista de tallas</label>
              <select value={listaSelId} onChange={e => onListaChange(e.target.value)} style={{ ...iS(G) }}>
                <option value="">— Elegir lista predefinida —</option>
                {listasDisp.map(l => <option key={l.id} value={l.id}>{l.nombre} ({l.tallas?.join(', ')})</option>)}
              </select>

              <label style={{ fontSize: 11, color: G.muted }}>O escribe tallas personalizadas</label>
              <input value={tallasStr} onChange={e => { setTallasStr(e.target.value); setListaSelId('') }} placeholder="XS, S, M, L, XL, XXL" style={iS(G)} />
              <p style={{ fontSize: 9, color: G.muted, margin: '-4px 0 8px' }}>Dejar vacío si no aplica.</p>
              {tallasStr && (<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>{tallasStr.split(',').map((t, i) => t.trim() && <span key={i} style={{ padding: '3px 8px', borderRadius: 6, background: G.goldSf, color: G.goldDk, fontSize: 11, fontWeight: 600 }}>{t.trim()}</span>)}</div>)}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowAdd(false); setEditCat(null) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={guardar} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
              </div>
            </Crd>
          </div>
        )}
        {cats.map(c => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, border: '1px solid ' + G.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div><p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nombre}</p><p style={{ fontSize: 10, color: G.muted, margin: '2px 0' }}>{c.tallas?.length ? 'Tallas: ' + c.tallas.join(', ') : 'Sin tallas'}</p></div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => abrir(c)} style={{ background: G.goldSf, color: G.goldDk, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>Editar</button>
                <button onClick={() => eliminar(c)} style={{ background: '#FEE2E2', color: G.err, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ MANTENIMIENTO GENÉRICO ═══ */
export function MantScr(P) {
  const { tipo, data, eid, lid, tit, notify, loadAll, setScr } = P
  const [nuevo, setNuevo] = useState('')
  const [eId, setEId] = useState(null)
  const [eVal, setEVal] = useState('')
  const formRef = useRef(null)
  const tits = { lineas: '📏 Líneas', categorias: '🏷️ Categorías', colores: '🎨 Colores' }

  const agregar = async () => {
    if (!nuevo.trim()) return
    const row = { empresa_id: eid, nombre: nuevo.trim() }
    if (tipo === 'categorias') { row.linea_id = lid; row.tallas = []; row.atributos = [] }
    await supabase.from(tipo).insert(row); setNuevo(''); notify('Agregado'); await loadAll()
  }

  const abrirEditar = (it) => {
    setEId(it.id); setEVal(it.nombre)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const actualizar = async id => { if (!eVal.trim()) return; await supabase.from(tipo).update({ nombre: eVal.trim() }).eq('id', id); setEId(null); notify('Actualizado'); await loadAll() }
  const eliminar = async id => { if (!confirm('¿Eliminar?')) return; await supabase.from(tipo).update({ activo: false }).eq('id', id); notify('Eliminado'); await loadAll() }

  return (
    <div>
      <Hdr tit={tit} sec={tits[tipo] || tipo} onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={nuevo} onChange={e => setNuevo(e.target.value)} placeholder="Nuevo..." onKeyDown={e => e.key === 'Enter' && agregar()} style={{ flex: 1, ...iS(G), marginBottom: 0 }} />
          <button onClick={agregar} disabled={!nuevo.trim()} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: nuevo.trim() ? G.gold : '#ccc', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>➕</button>
        </div>
        {data.map(it => (
          <div key={it.id} ref={eId === it.id ? formRef : null} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${eId === it.id ? G.gold : G.border}` }}>
            {eId === it.id ? (
              <><input value={eVal} onChange={e => setEVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && actualizar(it.id)} style={{ flex: 1, ...iS(G), marginBottom: 0 }} autoFocus />
                <button onClick={() => actualizar(it.id)} style={{ background: G.ok, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>✓</button>
                <button onClick={() => setEId(null)} style={{ background: G.muted, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>✕</button></>
            ) : (
              <><span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{it.nombre}</span>
                <button onClick={() => abrirEditar(it)} style={{ background: G.goldSf, color: G.goldDk, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>Editar</button>
                <button onClick={() => eliminar(it.id)} style={{ background: '#FEE2E2', color: G.err, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>🗑</button></>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ CLIENTES ═══ */
export function ClientesScr(P) {
  const { eid, tit, clis, notify, loadAll, setScr } = P
  const [showAdd, setShowAdd] = useState(false)
  const [editCli, setEditCli] = useState(null)
  const [f, setF] = useState({ nombre: '', telefono: '', direccion: '', preferencias: '', acepta_publicidad: false })
  const [buscar, setBuscar] = useState('')
  const formRef = useRef(null)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const filt = clis.filter(c => !buscar || c.nombre?.toLowerCase().includes(buscar.toLowerCase()) || c.telefono?.includes(buscar))

  const abrir = (c) => {
    if (c) { setEditCli(c); setF({ nombre: c.nombre || '', telefono: c.telefono || '', direccion: c.direccion || '', preferencias: c.preferencias || '', acepta_publicidad: c.acepta_publicidad || false }) }
    else { setEditCli(null); setF({ nombre: '', telefono: '', direccion: '', preferencias: '', acepta_publicidad: false }) }
    setShowAdd(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const guardar = async () => {
    if (!f.nombre) { notify('Nombre obligatorio', 'error'); return }
    if (editCli) { await supabase.from('clientes').update(f).eq('id', editCli.id); notify('Actualizado') }
    else { const cod = 'C' + String(clis.length + 1).padStart(4, '0'); await supabase.from('clientes').insert({ empresa_id: eid, codigo: cod, ...f }); notify('Creado') }
    setShowAdd(false); setEditCli(null); await loadAll()
  }

  const eliminar = async c => {
    const { data: v } = await supabase.from('ventas').select('id').eq('cliente_id', c.id).limit(1)
    if (v?.length > 0) { notify('No se puede eliminar, tiene ventas', 'error'); return }
    if (!confirm('¿Eliminar ' + c.nombre + '?')) return
    await supabase.from('clientes').update({ activo: false }).eq('id', c.id); notify('Eliminado'); await loadAll()
  }

  return (
    <div>
      <Hdr tit={tit} sec="👥 Clientes" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar..." style={{ flex: 1, ...iS(G), marginBottom: 0 }} />
          <button onClick={() => abrir(null)} style={{ padding: '10px 14px', borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>➕</button>
        </div>
        {showAdd && (
          <div ref={formRef}>
            <Crd title={editCli ? 'Editar cliente' : 'Nuevo cliente'}>
              <input value={f.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Nombre completo o nickname" style={iS(G)} />
              <input value={f.telefono} onChange={e => s('telefono', e.target.value)} placeholder="Teléfono" style={iS(G)} />
              <input value={f.direccion} onChange={e => s('direccion', e.target.value)} placeholder="Dirección" style={iS(G)} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'end' }}>
                <div style={{ flex: 1 }}><textarea value={f.preferencias} onChange={e => s('preferencias', e.target.value)} placeholder="Preferencias" rows={2} style={{ ...iS(G), resize: 'vertical' }} /></div>
                <VoiceBtn onResult={t => s('preferencias', (f.preferencias ? f.preferencias + ' ' : '') + t)} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={f.acepta_publicidad} onChange={e => s('acepta_publicidad', e.target.checked)} />Acepta publicidad
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowAdd(false); setEditCli(null) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={guardar} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
              </div>
            </Crd>
          </div>
        )}
        {filt.map(c => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, border: '1px solid ' + G.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{c.nombre}</p>
                <p style={{ fontSize: 10, color: G.muted, margin: '2px 0' }}>{c.codigo} {c.telefono ? '• ' + c.telefono : ''} {c.direccion ? '• ' + c.direccion : ''}</p>
                {c.preferencias && <p style={{ fontSize: 10, color: G.gold, margin: 0 }}>❤️ {c.preferencias}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'end' }}>
                {c.acepta_publicidad && <span style={{ fontSize: 8, background: G.goldSf, color: G.goldDk, padding: '2px 6px', borderRadius: 4 }}>📢</span>}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => abrir(c)} style={{ background: G.goldSf, color: G.goldDk, border: 'none', borderRadius: 4, padding: '3px 6px', cursor: 'pointer', fontSize: 9 }}>Editar</button>
                  <button onClick={() => eliminar(c)} style={{ background: '#FEE2E2', color: G.err, border: 'none', borderRadius: 4, padding: '3px 6px', cursor: 'pointer', fontSize: 9 }}>🗑</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ STOCK ═══ */
export function StockScr(P) {
  const { tit, allProds, setScr, notify } = P
  const [flt, setFlt] = useState('todos')
  const fl = allProds.filter(p => { if (flt === 'bajo') return p.cantidad > 0 && p.cantidad <= 3; if (flt === 'agotado') return p.cantidad <= 0; return true })
  const tI = allProds.reduce((s, p) => s + p.cantidad, 0), tV = allProds.reduce((s, p) => s + (p.precio_venta * p.cantidad), 0)
  const exp = () => { exportCSV(allProds, 'stock_' + new Date().toISOString().split('T')[0], [{ k: 'codigo', l: 'Código' }, { k: 'nombre', l: 'Nombre' }, { k: r => r.lineas?.nombre || '', l: 'Línea' }, { k: r => r.categorias?.nombre || '', l: 'Categoría' }, { k: 'color', l: 'Color' }, { k: 'cantidad', l: 'Stock' }, { k: 'precio_costo', l: 'P.Costo' }, { k: 'precio_venta', l: 'P.Venta' }, { k: r => (r.precio_venta * r.cantidad).toFixed(2), l: 'Valorizado' }]); notify('Exportado') }
  return (
    <div>
      <Hdr tit={tit} sec="📊 Stock" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: G.gold, borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Items</p><p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>{tI}</p></div>
          <div style={{ flex: 1, background: G.goldDk, borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Valorizado</p><p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>S/{tV.toFixed(0)}</p></div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
          {[{ id: 'todos', l: 'Todos' }, { id: 'bajo', l: '⚠️ Bajo' }, { id: 'agotado', l: '🔴 Agotado' }].map(f => (<button key={f.id} onClick={() => setFlt(f.id)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: flt === f.id ? G.gold : G.goldSf, color: flt === f.id ? '#fff' : G.goldDk, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{f.l}</button>))}
          <button onClick={exp} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📥 Excel</button>
        </div>
        {fl.map(p => { const st = p.cantidad <= 0 ? 'x' : p.cantidad <= 3 ? 'b' : 'o'; return (<div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid ' + G.border }}>{p.foto_url ? <img src={p.foto_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /> : <div style={{ width: 40, height: 40, background: G.goldLt, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 14, opacity: 0.3 }}>📦</span></div>}<div style={{ flex: 1 }}><p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{p.nombre}</p><p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{p.codigo} • C:S/{p.precio_costo} V:S/{p.precio_venta}</p></div><span style={{ fontSize: 14, fontWeight: 700, padding: '4px 10px', borderRadius: 8, color: st === 'x' ? '#fff' : st === 'b' ? G.warn : G.goldDk, background: st === 'x' ? G.err : st === 'b' ? '#FEF3C7' : G.goldSf }}>{p.cantidad}</span></div>) })}
      </div>
    </div>
  )
}

/* ═══ HISTORIAL VENTAS ═══ */
export function HistorialScr(P) {
  const { tit, vents, setScr, notify } = P
  const tV = vents.reduce((s, v) => s + v.total, 0)
  const tG = vents.reduce((s, v) => s + (v.precio_venta_real - v.precio_costo) * v.cantidad, 0)
  const exp = () => { exportCSV(vents, 'ventas_' + new Date().toISOString().split('T')[0], [{ k: r => new Date(r.created_at).toLocaleDateString('es-PE'), l: 'Fecha' }, { k: r => new Date(r.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), l: 'Hora' }, { k: 'codigo_producto', l: 'Código' }, { k: 'nombre_producto', l: 'Producto' }, { k: 'cantidad', l: 'Cant' }, { k: 'precio_costo', l: 'P.Costo' }, { k: 'precio_venta_original', l: 'P.Venta Orig' }, { k: 'precio_venta_real', l: 'P.Venta Real' }, { k: 'total', l: 'Total' }, { k: 'metodo_pago', l: 'Pago' }, { k: 'tipo_entrega', l: 'Entrega' }, { k: r => r.clientes?.nombre || '', l: 'Cliente' }]); notify('Exportado') }
  return (
    <div>
      <Hdr tit={tit} sec="📋 Ventas" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: G.gold, borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Vendido</p><p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>S/{tV.toFixed(0)}</p></div>
          <div style={{ flex: 1, background: G.goldDk, borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Ganancia</p><p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>S/{tG.toFixed(0)}</p></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={exp} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📥 Excel</button>
        </div>
        {vents.length === 0 ? (<div style={{ textAlign: 'center', padding: 40, color: G.muted }}><p style={{ fontSize: 32 }}>📋</p><p>No hay ventas</p></div>)
          : vents.map(v => (<div key={v.id} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, border: '1px solid ' + G.border }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}><div><p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{v.nombre_producto}</p><p style={{ fontSize: 10, color: G.muted, margin: '2px 0' }}>{v.codigo_producto} • {v.cantidad} und • {v.metodo_pago}{v.tipo_entrega === 'Delivery' ? ' • 🛵' : ''}</p><p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{new Date(v.created_at).toLocaleDateString('es-PE')} {new Date(v.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}{v.clientes?.nombre ? ' • ' + v.clientes.nombre : ''}</p></div><div style={{ textAlign: 'right' }}><p style={{ fontSize: 15, fontWeight: 800, color: G.gold, margin: 0 }}>S/{v.total.toFixed(2)}</p><p style={{ fontSize: 9, color: G.ok, margin: '2px 0 0' }}>+S/{((v.precio_venta_real - v.precio_costo) * v.cantidad).toFixed(2)}</p>{v.precio_venta_real !== v.precio_venta_original && <p style={{ fontSize: 9, color: G.warn, margin: 0 }}>Orig: S/{v.precio_venta_original}</p>}{v.foto_yape && <span style={{ fontSize: 9, color: G.gold }}>📱 Yape</span>}</div></div></div>))}
      </div>
    </div>
  )
}
