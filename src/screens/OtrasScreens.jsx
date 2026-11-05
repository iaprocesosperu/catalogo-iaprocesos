import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabase'
import { G, iS } from '../constants'
import { exportCSV, generarCatalogoPDF, generarCatalogoPDFGrid } from '../helpers'
import { Hdr, Crd, VoiceBtn } from '../components/index'

/* ═══ SUBMENÚ ═══ */
export function SubMenu(P) {
  const { tit, setScr } = P
  const items = [
    { id: 'lineas', i: '📏', l: 'Líneas', d: 'Ropa, Gatos...' },
    { id: 'categorias', i: '🏷️', l: 'Categorías', d: 'Por línea activa' },
    { id: 'origenes', i: '📋', l: 'Orígenes', d: 'Fardos, entregas' },
    { id: 'proveedores', i: '🏷️', l: 'Proveedores', d: 'Betsy, Nina...' },
    { id: 'reporteOrigenes', i: '📈', l: 'Reporte Orígenes', d: 'Inversión por proveedor' },
    { id: 'colores', i: '🎨', l: 'Colores', d: 'Maestro de colores' },
    { id: 'listaTallas', i: '📐', l: 'Listas de Tallas', d: 'Mis listas de tallas' },
    { id: 'secciones', i: '🗂️', l: 'Secciones', d: 'Zonas de la tienda' },
    { id: 'pedidos', i: '🛒', l: 'Pedidos', d: 'Compras online' },
    { id: 'inventario', i: '📦', l: 'Inventario', d: 'Conteo físico' },
    { id: 'conciliacion', i: '🔄', l: 'Conciliación', d: 'Yape vs ventas' },
    { id: 'marketing', i: '📲', l: 'WhatsApp', d: 'Enviar catálogo' },
    { id: 'promos', i: '🎯', l: 'Promociones', d: 'Links de promo' },
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
  const [recalculando, setRecalculando] = useState(false)

  const recalcularCostos = async () => {
    if (origen.precio_costo_defecto == null) { alert('Este origen no tiene precio costo definido'); return }
    if (!confirm(`¿Recalcular todos los productos y ventas de "${origen.nombre}" con costo S/${origen.precio_costo_defecto}?`)) return
    setRecalculando(true)
    try {
      const prodIds = prods.map(p => p.id)
      // Actualizar precio_costo en productos
      if (prodIds.length > 0) {
        await supabase.from('productos').update({ precio_costo: origen.precio_costo_defecto }).in('id', prodIds)
      }
      // Actualizar precio_costo en ventas de esos productos
      if (prodIds.length > 0) {
        await supabase.from('ventas').update({ precio_costo: origen.precio_costo_defecto }).in('producto_id', prodIds)
      }
      alert('✅ Costos actualizados correctamente')
      // Recargar
      const [{ data: ps }, { data: vs }] = await Promise.all([
        supabase.from('productos').select('*,categorias(nombre)').eq('empresa_id', eid).eq('origen_id', origen.id).eq('activo', true).order('codigo'),
        supabase.from('ventas').select('*').eq('empresa_id', eid)
      ])
      const newProds = ps || []
      const prodIdsSet = new Set(newProds.map(p => p.id))
      setProds(newProds); setVentas((vs || []).filter(v => prodIdsSet.has(v.producto_id)))
    } catch(e) { alert('Error: ' + e.message) }
    setRecalculando(false)
  }

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
          {origen.es_granel && (
            <div style={{ gridColumn: '1 / -1', background: '#FFF8E7', borderRadius: 10, padding: 12, border: '1px solid #F5A623' }}>
              <p style={{ fontSize: 9, color: '#B45309', fontWeight: 700, margin: 0 }}>🌾 STOCK GRANEL DISPONIBLE</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#F5A623', margin: '2px 0' }}>
                {origen.stock_granel ?? origen.cantidad ?? 0}
                <span style={{ fontSize: 12, color: '#B45309', marginLeft: 4 }}>{origen.unidad_base || 'unidades'}</span>
              </p>
              <p style={{ fontSize: 9, color: '#B45309', margin: 0 }}>
                de {origen.cantidad || 0} {origen.unidad_base || 'unidades'} totales
              </p>
            </div>
          )}
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
        {(
          <div style={{ background: '#FFF8E7', border: '1px solid #F5A623', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#B45309', margin: 0 }}>🔄 Recalcular costos</p>
              <p style={{ fontSize: 10, color: '#B45309', margin: '2px 0 0' }}>Aplicar S/{origen.precio_costo_defecto} a todos los productos y ventas</p>
            </div>
            <button onClick={recalcularCostos} disabled={recalculando}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: recalculando ? '#ccc' : '#F5A623', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {recalculando ? '⏳...' : '🔄 Aplicar'}
            </button>
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
  const { eid, lid, tit, oris, notify, loadAll, setScr, origenEdit, setOrigenEdit, retorno, setRetorno } = P
  const [showAdd, setShowAdd] = useState(false)
  const [f, setF] = useState({ nombre: '', cantidad: '', precio_costo_defecto: '', precio_venta_defecto: '', fecha: '', observaciones: '', es_granel: false, unidad_base: 'kg', proveedor_id: '' })
  const [editId, setEditId] = useState(null)
  const [detalleOrigen, setDetalleOrigen] = useState(null)
  const [usados, setUsados] = useState({})
  const [proveedores, setProveedores] = useState([])
  const [provAnterior, setProvAnterior] = useState(null) // proveedor antes de editar
  const [afectadas, setAfectadas] = useState(null) // { origenId, nuevoProv, nuevoProvNombre, ventas: [] }
  const [afSel, setAfSel] = useState([]) // ventas seleccionadas para actualizar
  const [afDesde, setAfDesde] = useState('')
  const [afHasta, setAfHasta] = useState('')
  const [afTrabajando, setAfTrabajando] = useState(false)
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

  useEffect(() => {
    const cargarProv = async () => {
      const { data } = await supabase.from('proveedores').select('*').eq('empresa_id', eid).eq('activo', true).order('nombre')
      if (data) setProveedores(data)
    }
    if (eid) cargarProv()
  }, [eid])

  useEffect(() => {
    if (origenEdit) {
      editar(origenEdit)
      if (setOrigenEdit) setOrigenEdit(null)
    }
  }, [origenEdit])

  const guardar = async () => {
    if (!f.nombre.trim()) { notify('Nombre obligatorio', 'error'); return }
    const data = { empresa_id: eid, linea_id: lid, nombre: f.nombre.trim(), cantidad: parseInt(f.cantidad) || 0, precio_costo_defecto: f.precio_costo_defecto !== '' ? parseFloat(f.precio_costo_defecto) : null, precio_venta_defecto: f.precio_venta_defecto !== '' ? parseFloat(f.precio_venta_defecto) : null, fecha: f.fecha || null, observaciones: f.observaciones || null, es_granel: f.es_granel, unidad_base: f.es_granel ? (f.unidad_base || 'kg') : null, stock_granel: f.es_granel ? (parseFloat(f.cantidad) || 0) : null, proveedor_id: f.proveedor_id !== '' ? parseInt(f.proveedor_id) : null }
    const nuevoProv = f.proveedor_id !== '' ? parseInt(f.proveedor_id) : null
    const idEditado = editId
    const cambioProv = editId && (provAnterior ?? null) !== (nuevoProv ?? null)
    if (editId) { const upd = { ...data }; if (f.linea_id) upd.linea_id = f.linea_id; await supabase.from('origenes').update(upd).eq('id', editId); notify('Actualizado') }
    else { await supabase.from('origenes').insert({ ...data, estado: 'activo' }); notify('Agregado') }
    setShowAdd(false); setEditId(null); setF({ nombre: '', cantidad: '', precio_costo_defecto: '', precio_venta_defecto: '', fecha: '', observaciones: '', es_granel: false, unidad_base: 'kg', proveedor_id: '' }); await loadAll()

    if (cambioProv) {
      const { data: vtas } = await supabase.from('ventas')
        .select('id,nombre_producto,codigo_producto,cantidad,total,created_at,proveedor_id')
        .eq('empresa_id', eid).eq('origen_id', idEditado)
        .order('created_at', { ascending: false })
      if (vtas && vtas.length) {
        const nombreProv = nuevoProv ? (proveedores.find(p => p.id === nuevoProv)?.nombre || '') : 'Sin proveedor'
        setAfectadas({ origenId: idEditado, nuevoProv, nuevoProvNombre: nombreProv, ventas: vtas })
        setAfSel(vtas.map(v => v.id)); setAfDesde(''); setAfHasta('')
        return
      }
    }
    if (retorno === 'reporteOrigenes') { if (setRetorno) setRetorno(null); setScr('reporteOrigenes') }
  }

  const afVisibles = afectadas ? afectadas.ventas.filter(v => {
    if (afDesde && new Date(v.created_at) < new Date(afDesde)) return false
    if (afHasta && new Date(v.created_at) > new Date(afHasta + 'T23:59:59')) return false
    return true
  }) : []
  const toggleAf = (id) => setAfSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const aplicarAfectadas = async () => {
    if (!afSel.length) { notify('No seleccionaste ninguna venta', 'error'); return }
    setAfTrabajando(true)
    try {
      await supabase.from('ventas').update({ proveedor_id: afectadas.nuevoProv }).in('id', afSel)
      notify(`✅ ${afSel.length} ventas actualizadas a ${afectadas.nuevoProvNombre}`)
      setAfectadas(null); setAfSel([]); await loadAll()
      if (retorno === 'reporteOrigenes') { if (setRetorno) setRetorno(null); setScr('reporteOrigenes') }
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setAfTrabajando(false)
  }
  const cerrarAfectadas = () => {
    setAfectadas(null); setAfSel([])
    if (retorno === 'reporteOrigenes') { if (setRetorno) setRetorno(null); setScr('reporteOrigenes') }
  }

  const editar = o => {
    setEditId(o.id); setProvAnterior(o.proveedor_id ?? null); setF({ nombre: o.nombre || '', cantidad: String(o.cantidad || ''), precio_costo_defecto: o.precio_costo_defecto != null ? String(o.precio_costo_defecto) : '', precio_venta_defecto: o.precio_venta_defecto != null ? String(o.precio_venta_defecto) : '', fecha: o.fecha || '', observaciones: o.observaciones || '', es_granel: o.es_granel || false, unidad_base: o.unidad_base || 'kg', proveedor_id: o.proveedor_id != null ? String(o.proveedor_id) : '', linea_id: o.linea_id || null })
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
        <button onClick={() => { setShowAdd(!showAdd); setEditId(null); setF({ nombre: '', cantidad: '', precio_costo_defecto: '', precio_venta_defecto: '', fecha: '', observaciones: '', es_granel: false, unidad_base: 'kg', proveedor_id: '' }); if (!showAdd) setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }}
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
              <label style={{ fontSize: 11, color: G.muted }}>Proveedor</label>
              <select value={f.proveedor_id} onChange={e => s('proveedor_id', e.target.value)} style={iS(G)}>
                <option value="">— Sin proveedor —</option>
                {proveedores.map(pv => <option key={pv.id} value={pv.id}>{pv.nombre}</option>)}
              </select>
              {invCalc > 0 && (<div style={{ background: G.goldLt, borderRadius: 8, padding: 10, marginBottom: 8, textAlign: 'center' }}><p style={{ fontSize: 10, color: G.muted, margin: 0 }}>Inversión calculada</p><p style={{ fontSize: 18, fontWeight: 800, color: G.gold, margin: 0 }}>S/ {invCalc.toFixed(2)}</p><p style={{ fontSize: 9, color: G.muted, margin: 0 }}>{f.cantidad} items × S/{f.precio_costo_defecto}</p></div>)}
              <label style={{ fontSize: 11, color: G.muted }}>Observaciones</label>
              <textarea value={f.observaciones} onChange={e => s('observaciones', e.target.value)} rows={2} style={{ ...iS(G), resize: 'vertical' }} />
              {/* Control Granel */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: G.text, padding: '10px 12px', background: f.es_granel ? '#FFF8E7' : G.goldLt, borderRadius: 8, marginBottom: 8, border: f.es_granel ? '1px solid #F5A623' : '1px solid ' + G.border }}>
                <input type="checkbox" checked={f.es_granel} onChange={e => s('es_granel', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#F5A623', cursor: 'pointer' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>🌾 Control Granel</p>
                  <p style={{ margin: 0, fontSize: 10, color: G.muted }}>El stock se descuenta por unidad base (kg, litros, etc.)</p>
                </div>
              </label>
              {f.es_granel && (
                <div style={{ background: '#FFF8E7', borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: '1px solid #F5A623' }}>
                  <label style={{ fontSize: 11, color: '#B45309', fontWeight: 700 }}>UNIDAD BASE</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {['kg', 'g', 'litros', 'ml', 'metros', 'unidades'].map(u => (
                      <button key={u} onClick={() => s('unidad_base', u)}
                        style={{ padding: '6px 12px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: f.unidad_base === u ? '#F5A623' : '#fff', color: f.unidad_base === u ? '#fff' : '#B45309' }}>
                        {u}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: '#B45309', margin: '8px 0 0' }}>
                    El campo "Cantidad" arriba indica el stock total en {f.unidad_base}
                  </p>
                </div>
              )}
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
                      {o.es_granel && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: '#FFF8E7', color: '#B45309' }}>🌾 Granel · {o.stock_granel ?? o.cantidad ?? 0}{o.unidad_base}</span>}
                    </div>
                    <p style={{ fontSize: 10, color: G.muted, margin: '3px 0 1px' }}>
                      {o.cantidad > 0 ? <span style={{ fontWeight: 600, color: pct >= 1 ? G.err : pct >= 0.8 ? G.warn : G.text }}>{usadosCount}/{o.cantidad} usados</span> : <span>{usadosCount} registrados</span>}
                      {o.precio_costo_defecto ? ' • C: S/' + o.precio_costo_defecto : ''}{o.precio_venta_defecto ? ' V: S/' + o.precio_venta_defecto : ''}{o.cantidad && o.precio_costo_defecto ? ' • Inv: S/' + (o.cantidad * o.precio_costo_defecto).toFixed(0) : ''}{o.fecha ? ' • ' + o.fecha : ''}
                    </p>
                    {o.proveedor_id && <p style={{ fontSize: 9, color: G.gold, margin: '1px 0 0', fontWeight: 700 }}>🏷️ {proveedores.find(pv => pv.id === o.proveedor_id)?.nombre || ''}</p>}
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

        {/* Modal: ventas históricas afectadas por cambio de proveedor */}
        {afectadas && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '92vh', overflow: 'auto' }}>
              <div style={{ background: G.gold, padding: '12px 16px', position: 'sticky', top: 0 }}>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>⚠️ Ventas históricas afectadas</p>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, margin: '2px 0 0' }}>Cambiaste el proveedor a <b>{afectadas.nuevoProvNombre}</b>. ¿Actualizar también estas ventas pasadas?</p>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: G.muted }}>Rango:</span>
                  <input type="date" value={afDesde} onChange={e => setAfDesde(e.target.value)} style={{ flex: 1, minWidth: 110, padding: '6px 8px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 12 }} />
                  <span style={{ fontSize: 11, color: G.muted }}>a</span>
                  <input type="date" value={afHasta} onChange={e => setAfHasta(e.target.value)} style={{ flex: 1, minWidth: 110, padding: '6px 8px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 12 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: G.muted }}>{afVisibles.length} ventas • {afSel.length} seleccionadas</span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setAfSel(afVisibles.map(v => v.id))} style={{ background: 'none', border: 'none', color: G.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Todas</button>
                    <button onClick={() => setAfSel([])} style={{ background: 'none', border: 'none', color: G.err, fontSize: 12, cursor: 'pointer' }}>Ninguna</button>
                  </span>
                </div>
                <div style={{ maxHeight: 320, overflow: 'auto', marginBottom: 12 }}>
                  {afVisibles.map(v => (
                    <div key={v.id} onClick={() => toggleAf(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, marginBottom: 4, border: '1px solid ' + (afSel.includes(v.id) ? G.gold : G.border), background: afSel.includes(v.id) ? G.goldLt : '#fff', cursor: 'pointer' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, background: afSel.includes(v.id) ? G.gold : '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800 }}>{afSel.includes(v.id) ? '✓' : ''}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.nombre_producto}</p>
                        <p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{v.codigo_producto} • {v.cantidad} und • {new Date(v.created_at).toLocaleDateString('es-PE')}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: G.gold, flexShrink: 0 }}>S/{v.total.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <button onClick={aplicarAfectadas} disabled={afTrabajando} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{afTrabajando ? '⏳ Actualizando...' : `Actualizar ${afSel.length} ventas a ${afectadas.nuevoProvNombre}`}</button>
                <button onClick={cerrarAfectadas} style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 10, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>No actualizar (dejar como estaban)</button>
              </div>
            </div>
          </div>
        )}
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
  const [eOrigenNombre, setEOrigenNombre] = useState(false)
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
    if (tipo === 'lineas') setEOrigenNombre(it.incluir_origen_nombre || false)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  const actualizar = async id => {
    if (!eVal.trim()) return
    const upd = { nombre: eVal.trim() }
    if (tipo === 'lineas') upd.incluir_origen_nombre = eOrigenNombre
    await supabase.from(tipo).update(upd).eq('id', id)
    setEId(null); notify('Actualizado'); await loadAll()
  }
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
          <div key={it.id} ref={eId === it.id ? formRef : null} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, border: `1px solid ${eId === it.id ? G.gold : G.border}` }}>
            {eId === it.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={eVal} onChange={e => setEVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && actualizar(it.id)} style={{ flex: 1, ...iS(G), marginBottom: 0 }} autoFocus />
                  <button onClick={() => actualizar(it.id)} style={{ background: G.ok, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>✓</button>
                  <button onClick={() => setEId(null)} style={{ background: G.muted, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>✕</button>
                </div>
                {tipo === 'lineas' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: G.text, padding: '6px 8px', background: G.goldLt, borderRadius: 8 }}>
                    <input type="checkbox" checked={eOrigenNombre} onChange={e => setEOrigenNombre(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: G.gold, cursor: 'pointer' }} />
                    Incluir origen al inicio del nombre automático
                  </label>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{it.nombre}</span>
                  {tipo === 'lineas' && it.incluir_origen_nombre && (
                    <span style={{ marginLeft: 8, fontSize: 10, background: G.goldSf, color: G.goldDk, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>+Origen</span>
                  )}
                </div>
                <button onClick={() => abrirEditar(it)} style={{ background: G.goldSf, color: G.goldDk, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>Editar</button>
                <button onClick={() => eliminar(it.id)} style={{ background: '#FEE2E2', color: G.err, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>🗑</button>
              </div>
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
  const [f, setF] = useState({ nombre: '', telefono: '', direccion: '', preferencias: '', acepta_publicidad: false, genero: '', precio_min: '', precio_max: '' })
  const [buscar, setBuscar] = useState('')
  const formRef = useRef(null)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))
  const filt = clis.filter(c => !buscar || c.nombre?.toLowerCase().includes(buscar.toLowerCase()) || c.telefono?.includes(buscar))

  const abrir = (c) => {
    if (c) { setEditCli(c); setF({ nombre: c.nombre || '', telefono: c.telefono || '', direccion: c.direccion || '', preferencias: c.preferencias || '', acepta_publicidad: c.acepta_publicidad || false, genero: c.genero || '', precio_min: c.precio_min || '', precio_max: c.precio_max || '' }) }
    else { setEditCli(null); setF({ nombre: '', telefono: '', direccion: '', preferencias: '', acepta_publicidad: false }) }
    setShowAdd(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const guardar = async () => {
    if (!f.nombre) { notify('Nombre obligatorio', 'error'); return }
    const norm = f.nombre.trim().toLowerCase()
    const dup = (clis || []).some(c => c.nombre?.trim().toLowerCase() === norm && (!editCli || c.id !== editCli.id))
    if (dup) { notify('Ya existe un cliente con ese nombre', 'error'); return }
    if (editCli) { await supabase.from('clientes').update({ ...f, nombre: f.nombre.trim() }).eq('id', editCli.id); notify('Actualizado') }
    else { const cod = 'C' + String(clis.length + 1).padStart(4, '0'); await supabase.from('clientes').insert({ empresa_id: eid, codigo: cod, ...f, nombre: f.nombre.trim() }); notify('Creado') }
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
              <label style={{ fontSize: 11, color: G.muted }}>Género</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {['Mujer','Hombre','Niño','Unisex'].map(g => (
                  <button key={g} onClick={() => s('genero', f.genero === g ? '' : g)} style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: f.genero === g ? G.gold : G.goldSf, color: f.genero === g ? '#fff' : G.goldDk }}>{g}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Precio mín (S/)</label><input value={f.precio_min||''} onChange={e => s('precio_min', e.target.value)} type="number" placeholder="10" style={iS(G)} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Precio máx (S/)</label><input value={f.precio_max||''} onChange={e => s('precio_max', e.target.value)} type="number" placeholder="50" style={iS(G)} /></div>
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
                {(c.genero || c.precio_min || c.precio_max) && <p style={{ fontSize: 9, color: G.muted, margin: '2px 0 0' }}>{c.genero || ''}{c.precio_min ? ' • S/' + c.precio_min + '-' + (c.precio_max||'∞') : ''}</p>}
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
  const { tit, vents, clis, eid, lid, setScr, notify, loadAll } = P
  const [tab, setTab] = useState('lista')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [filCliente, setFilCliente] = useState('')
  const [filProveedor, setFilProveedor] = useState('')
  const [filPendiente, setFilPendiente] = useState(false)
  const [provList, setProvList] = useState([])
  useEffect(() => { (async () => { const { data } = await supabase.from('proveedores').select('*').eq('empresa_id', eid).eq('activo', true).order('nombre'); if (data) setProvList(data) })() }, [eid])
  const [editV, setEditV] = useState(null) // venta en edición
  const [ef, setEf] = useState({ cantidad: '', precio_venta_real: '', precio_costo: '', cliente_id: '', metodo_pago: '', tipo_entrega: '', nota: '', costo_devuelto: false, fecha: '' })
  const [filPorPagar, setFilPorPagar] = useState(false)
  const [agrupar, setAgrupar] = useState('detalle') // detalle | cliente | fecha | origen
  const [fotoVenta, setFotoVenta] = useState(null) // {foto, nombre, codigo} para ver imagen
  const [verDeben, setVerDeben] = useState(false)
  const [debenAbierto, setDebenAbierto] = useState({})
  const [modoSelV, setModoSelV] = useState(false)
  const [selV, setSelV] = useState([])
  const toggleSelV = (id) => setSelV(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const [gruposAbiertos, setGruposAbiertos] = useState({})
  const toggleGrupo = (k) => setGruposAbiertos(s => ({ ...s, [k]: !s[k] }))
  const [guardandoV, setGuardandoV] = useState(false)

  const abrirEdit = (v) => {
    setEditV(v)
    setEf({ cantidad: String(v.cantidad), precio_venta_real: String(v.precio_venta_real), precio_costo: v.precio_costo != null ? String(v.precio_costo) : '', cliente_id: v.cliente_id || '', metodo_pago: v.metodo_pago || '', tipo_entrega: v.tipo_entrega || '', nota: v.nota || '', costo_devuelto: !!v.costo_devuelto, fecha: v.created_at ? v.created_at.slice(0, 10) : '' })
  }

  const guardarEdit = async () => {
    if (!editV) return
    const nuevaCant = parseInt(ef.cantidad) || 0
    const nuevoPV = parseFloat(ef.precio_venta_real)
    if (nuevaCant <= 0) { notify('Cantidad inválida', 'error'); return }
    if (isNaN(nuevoPV)) { notify('Precio inválido', 'error'); return }
    setGuardandoV(true)
    try {
      const difCant = nuevaCant - editV.cantidad // positivo = se vendió más → descontar stock
      // Ajustar stock si cambió la cantidad
      if (difCant !== 0 && editV.producto_id) {
        const { data: prod } = await supabase.from('productos').select('cantidad, equivalente_granel, origen_id').eq('id', editV.producto_id).single()
        if (prod) {
          if (prod.equivalente_granel && prod.origen_id) {
            const { data: origen } = await supabase.from('origenes').select('stock_granel').eq('id', prod.origen_id).single()
            if (origen) await supabase.from('origenes').update({ stock_granel: (origen.stock_granel || 0) - (prod.equivalente_granel * difCant) }).eq('id', prod.origen_id)
          } else {
            await supabase.from('productos').update({ cantidad: (prod.cantidad || 0) - difCant }).eq('id', editV.producto_id)
          }
        }
      }
      await supabase.from('ventas').update({
        cantidad: nuevaCant,
        precio_venta_real: nuevoPV,
        precio_costo: ef.precio_costo !== '' ? parseFloat(ef.precio_costo) : 0,
        total: nuevoPV * nuevaCant,
        cliente_id: ef.cliente_id || null,
        metodo_pago: ef.metodo_pago || null,
        tipo_entrega: ef.tipo_entrega || null,
        nota: ef.nota || null,
        costo_devuelto: ef.costo_devuelto,
        ...(ef.fecha ? { created_at: new Date(ef.fecha + 'T12:00:00').toISOString() } : {})
      }).eq('id', editV.id)
      notify('✅ Venta actualizada')
      setEditV(null); await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setGuardandoV(false)
  }

  const toggleDevuelto = async (v) => {
    try {
      await supabase.from('ventas').update({ costo_devuelto: !v.costo_devuelto }).eq('id', v.id)
      await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
  }

  const eliminarVenta = async (v) => {
    if (!confirm(`¿Eliminar venta de "${v.nombre_producto}"? Se devolverá el stock.`)) return
    setEliminando(true)
    try {
      // Devolver stock
      if (v.producto_id) {
        const { data: prod } = await supabase.from('productos').select('cantidad, equivalente_granel, origen_id').eq('id', v.producto_id).single()
        if (prod) {
          if (prod.equivalente_granel && prod.origen_id) {
            // Granel: devolver al stock_granel del origen
            const { data: origen } = await supabase.from('origenes').select('stock_granel').eq('id', prod.origen_id).single()
            if (origen) await supabase.from('origenes').update({ stock_granel: (origen.stock_granel || 0) + (prod.equivalente_granel * v.cantidad) }).eq('id', prod.origen_id)
          } else {
            // Normal: devolver al producto
            await supabase.from('productos').update({ cantidad: (prod.cantidad || 0) + v.cantidad }).eq('id', v.producto_id)
          }
        }
      }
      // Eliminar venta
      await supabase.from('ventas').delete().eq('id', v.id)
      notify('Venta eliminada y stock devuelto')
      await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setEliminando(false)
  }

  const fl = vents.filter(v => {
    if (desde && new Date(v.created_at) < new Date(desde)) return false
    if (hasta && new Date(v.created_at) > new Date(hasta + 'T23:59:59')) return false
    if (filCliente && String(v.cliente_id) !== String(filCliente)) return false
    if (filProveedor && String(v.proveedor_id) !== String(filProveedor)) return false
    if (filPendiente && v.costo_devuelto) return false
    if (filPorPagar && v.metodo_pago !== 'Por Pagar') return false
    if (buscar) {
      const t = buscar.toLowerCase()
      const enProd = (v.nombre_producto || '').toLowerCase().includes(t) || (v.codigo_producto || '').toLowerCase().includes(t)
      const enCli = (v.clientes?.nombre || '').toLowerCase().includes(t)
      if (!enProd && !enCli) return false
    }
    return true
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const tV = fl.reduce((s, v) => s + v.total, 0)
  const tG = fl.reduce((s, v) => s + (v.precio_venta_real - v.precio_costo) * v.cantidad, 0)
  const tPend = fl.filter(v => !v.costo_devuelto).reduce((s, v) => s + (v.precio_costo || 0) * v.cantidad, 0)
  const tPorCobrar = fl.filter(v => v.metodo_pago === 'Por Pagar').reduce((s, v) => s + v.total, 0)
  const marcarPagado = async (v, metodo) => {
    await supabase.from('ventas').update({ metodo_pago: metodo }).eq('id', v.id)
    await loadAll()
  }

  // Deuda (fiado) agrupada por cliente
  const debenPorCliente = (() => {
    const mapa = {}
    fl.filter(v => v.metodo_pago === 'Por Pagar').forEach(v => {
      const clave = v.cliente_id || 'sin'
      if (!mapa[clave]) mapa[clave] = { clave, nombre: v.clientes?.nombre || 'Sin cliente', total: 0, ventas: [] }
      mapa[clave].total += v.total
      mapa[clave].ventas.push(v)
    })
    return Object.values(mapa).sort((a, b) => b.total - a.total)
  })()
  const enviarLiquidacion = async () => {
    const ventas = fl.filter(v => selV.includes(v.id))
    if (!ventas.length) { notify('Selecciona ventas primero', 'error'); return }
    notify('Generando comprobante...')
    const cliente = ventas[0].clientes?.nombre || 'Cliente'
    const fecha = new Date().toLocaleDateString('es-PE')
    const total = ventas.reduce((s, v) => s + v.total, 0)
    // Canvas tipo ticket
    const W = 600, pad = 32, lineH = 46
    const H = 260 + ventas.length * lineH + 140
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H)
    // Encabezado dorado
    ctx.fillStyle = '#C5A55A'; ctx.fillRect(0, 0, W, 110)
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'
    ctx.font = 'bold 34px Arial'; ctx.fillText(emp?.nombre || 'La Casita del Ahorro', W / 2, 50)
    ctx.font = '18px Arial'; ctx.fillText('Comprobante de compra', W / 2, 82)
    // Datos
    ctx.fillStyle = '#374151'; ctx.textAlign = 'left'; ctx.font = 'bold 18px Arial'
    ctx.fillText('Cliente: ' + cliente, pad, 150)
    ctx.textAlign = 'right'; ctx.font = '16px Arial'; ctx.fillStyle = '#6B7280'
    ctx.fillText('Fecha: ' + fecha, W - pad, 150)
    // Línea
    ctx.strokeStyle = '#E5E7EB'; ctx.beginPath(); ctx.moveTo(pad, 175); ctx.lineTo(W - pad, 175); ctx.stroke()
    // Items
    let y = 215
    ctx.textAlign = 'left'
    ventas.forEach(v => {
      ctx.fillStyle = '#1F2937'; ctx.font = 'bold 17px Arial'
      const nom = v.nombre_producto.length > 34 ? v.nombre_producto.slice(0, 34) + '…' : v.nombre_producto
      ctx.fillText(nom, pad, y)
      ctx.fillStyle = '#6B7280'; ctx.font = '14px Arial'
      ctx.fillText(`${v.cantidad} x S/${v.precio_venta_real.toFixed(2)}`, pad, y + 20)
      ctx.fillStyle = '#C5A55A'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'right'
      ctx.fillText('S/' + v.total.toFixed(2), W - pad, y + 10)
      ctx.textAlign = 'left'
      y += lineH
    })
    // Total
    ctx.strokeStyle = '#C5A55A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke()
    y += 45
    ctx.fillStyle = '#1F2937'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'left'; ctx.fillText('TOTAL', pad, y)
    ctx.fillStyle = '#C5A55A'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'right'; ctx.fillText('S/' + total.toFixed(2), W - pad, y)
    y += 40
    // método
    const metodos = [...new Set(ventas.map(v => v.metodo_pago))].join(', ')
    ctx.fillStyle = '#6B7280'; ctx.font = '15px Arial'; ctx.textAlign = 'left'; ctx.fillText('Pago: ' + metodos, pad, y)
    // pie
    y += 36
    ctx.fillStyle = '#C5A55A'; ctx.font = 'italic 16px Arial'; ctx.textAlign = 'center'; ctx.fillText('¡Gracias por tu compra! 💛', W / 2, y)

    const dataUrl = c.toDataURL('image/png')
    const descargar = () => {
      const a = document.createElement('a')
      a.href = dataUrl; a.download = `liquidacion_${cliente}_${fecha.replace(/\//g, '-')}.png`
      document.body.appendChild(a); a.click(); a.remove()
      notify('📥 Comprobante descargado')
    }
    // Intentar copiar al portapapeles preservando el gesto del clic
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const item = new window.ClipboardItem({ 'image/png': (async () => (await fetch(dataUrl)).blob())() })
        await navigator.clipboard.write([item])
        notify('📋 Copiada — pégala en WhatsApp (Ctrl+V / mantén presionado → Pegar)')
        return
      } catch (e) {
        descargar()
        return
      }
    }
    descargar()
  }

  const cobrarCliente = async (grupo) => {
    const m = prompt(`${grupo.nombre} debe S/${grupo.total.toFixed(2)}. ¿Con qué pagó? (Efectivo/Yape/Plin/Transferencia)`, 'Efectivo')
    if (!m) return
    await supabase.from('ventas').update({ metodo_pago: m }).in('id', grupo.ventas.map(v => v.id))
    notify(`✅ ${grupo.nombre}: S/${grupo.total.toFixed(2)} cobrado`)
    await loadAll()
  }

  // Agrupación de ventas
  const grupos = (() => {
    if (agrupar === 'detalle') return null
    const mapa = {}
    fl.forEach(v => {
      let clave, etiqueta
      if (agrupar === 'cliente') { clave = v.cliente_id || 'sin'; etiqueta = v.clientes?.nombre || 'Sin cliente' }
      else if (agrupar === 'fecha') { clave = new Date(v.created_at).toLocaleDateString('es-PE'); etiqueta = clave }
      else { clave = v.origen_id || 'sin'; etiqueta = v.origenes?.nombre || 'Sin origen' }
      if (!mapa[clave]) mapa[clave] = { clave, etiqueta, ventas: [], total: 0, ganancia: 0, prendas: 0, orden: 0 }
      mapa[clave].ventas.push(v)
      mapa[clave].total += v.total
      mapa[clave].ganancia += (v.precio_venta_real - v.precio_costo) * v.cantidad
      mapa[clave].prendas += v.cantidad
      const t = new Date(v.created_at).getTime()
      if (t > mapa[clave].orden) mapa[clave].orden = t
    })
    const arr = Object.values(mapa)
    if (agrupar === 'fecha') arr.sort((a, b) => b.orden - a.orden)
    else arr.sort((a, b) => b.total - a.total)
    return arr
  })()

  const exp = () => {
    exportCSV(fl, 'ventas_' + new Date().toISOString().split('T')[0], [
      { k: r => new Date(r.created_at).toLocaleDateString('es-PE'), l: 'Fecha' },
      { k: r => new Date(r.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), l: 'Hora' },
      { k: 'codigo_producto', l: 'Código' }, { k: 'nombre_producto', l: 'Producto' },
      { k: 'cantidad', l: 'Cant' }, { k: 'precio_costo', l: 'P.Costo' },
      { k: 'precio_venta_original', l: 'P.Venta Orig' }, { k: 'precio_venta_real', l: 'P.Venta Real' },
      { k: 'total', l: 'Total' }, { k: r => ((r.precio_venta_real - r.precio_costo) * r.cantidad).toFixed(2), l: 'Ganancia' },
      { k: 'metodo_pago', l: 'Pago' }, { k: 'tipo_entrega', l: 'Entrega' },
      { k: r => r.clientes?.nombre || '', l: 'Cliente' },
      { k: r => r.origenes?.nombre || '', l: 'Origen' },
      { k: r => r.proveedores?.nombre || '', l: 'Proveedor' },
      { k: r => r.costo_devuelto ? 'SI' : 'NO', l: 'Costo devuelto' }
    ]); notify('Exportado')
  }

  const porProducto = Object.values(fl.reduce((acc, v) => {
    const k = v.nombre_producto
    if (!acc[k]) acc[k] = { nombre: k, cant: 0, total: 0 }
    acc[k].cant += v.cantidad; acc[k].total += v.total; return acc
  }, {})).sort((a, b) => b.cant - a.cant).slice(0, 10)

  const porDia = Object.values(fl.reduce((acc, v) => {
    const d = new Date(v.created_at).toLocaleDateString('es-PE', { weekday: 'long' })
    if (!acc[d]) acc[d] = { dia: d, cant: 0, total: 0 }
    acc[d].cant += v.cantidad; acc[d].total += v.total; return acc
  }, {})).sort((a, b) => b.total - a.total)

  const porMetodo = Object.values(fl.reduce((acc, v) => {
    const k = v.metodo_pago || 'Otro'
    if (!acc[k]) acc[k] = { metodo: k, cant: 0, total: 0 }
    acc[k].cant++; acc[k].total += v.total; return acc
  }, {})).sort((a, b) => b.total - a.total)

  const maxDia = porDia[0]?.total || 1
  const maxProd = porProducto[0]?.cant || 1
  const tabStyle = (t) => ({ flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: tab === t ? G.gold : '#F5F5F5', color: tab === t ? '#fff' : G.muted })

  const renderVenta = (v) => (<div key={v.id} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, border: modoSelV && selV.includes(v.id) ? '2px solid ' + G.gold : '1px solid ' + G.border }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>{modoSelV && <div onClick={() => toggleSelV(v.id)} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 12, background: selV.includes(v.id) ? G.gold : '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginTop: 2 }}>{selV.includes(v.id) ? '✓' : ''}</div>}<div style={{ flex: 1 }}><p onClick={() => setFotoVenta({ foto: v.productos?.foto_url, nombre: v.nombre_producto, codigo: v.codigo_producto })} style={{ fontSize: 13, fontWeight: 700, margin: 0, color: G.gold, cursor: 'pointer', textDecoration: 'underline' }}>{v.nombre_producto}</p><p style={{ fontSize: 10, color: G.muted, margin: '2px 0' }}>{v.codigo_producto} • {v.cantidad} und • {v.metodo_pago}{v.tipo_entrega === 'Delivery' ? ' • 🛵' : ''}</p><p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{new Date(v.created_at).toLocaleDateString('es-PE')} {new Date(v.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}{v.clientes?.nombre ? ' • ' + v.clientes.nombre : ''}</p>{(v.proveedores?.nombre || v.origenes?.nombre) && <p style={{ fontSize: 10, color: G.goldDk, margin: '2px 0 0', fontWeight: 700 }}>{v.proveedores?.nombre ? '🏷️ ' + v.proveedores.nombre : ''}{v.origenes?.nombre ? (v.proveedores?.nombre ? ' • ' : '') + '📋 ' + v.origenes.nombre : ''}</p>}</div><div style={{ textAlign: 'right' }}><p style={{ fontSize: 15, fontWeight: 800, color: G.gold, margin: 0 }}>S/{v.total.toFixed(2)}</p><p style={{ fontSize: 9, color: G.ok, margin: '2px 0 0' }}>+S/{((v.precio_venta_real - v.precio_costo) * v.cantidad).toFixed(2)}</p>{v.precio_venta_real !== v.precio_venta_original && <p style={{ fontSize: 9, color: G.warn, margin: 0 }}>Orig: S/{v.precio_venta_original}</p>}{v.foto_yape && <span style={{ fontSize: 9, color: G.gold }}>📱 Yape</span>}<div style={{ marginTop: 4, display: 'flex', gap: 3, justifyContent: 'flex-end', flexWrap: 'wrap' }}>{v.metodo_pago === 'Por Pagar' && <button onClick={() => { const m = prompt('¿Con qué pagó? (Efectivo/Yape/Plin/Transferencia)', 'Efectivo'); if (m) marcarPagado(v, m) }} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#FFEDD5', color: '#9A3412', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>💳 Cobrar</button>}<button onClick={() => toggleDevuelto(v)} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: v.costo_devuelto ? '#D1FAE5' : '#FEF3C7', color: v.costo_devuelto ? '#065F46' : '#92400E', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{v.costo_devuelto ? '✓ Devuelto' : '⏳ Falta'}</button><button onClick={() => abrirEdit(v)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>✏️</button><button onClick={() => eliminarVenta(v)} disabled={eliminando} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: G.err, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>🗑</button></div></div></div></div>)

  return (
    <div>
      <Hdr tit={tit} sec="📋 Ventas" onBack={() => setScr('submenu')} />
      <div style={{ display: 'flex', borderBottom: '2px solid ' + G.goldSf }}>
        <button onClick={() => setTab('lista')} style={tabStyle('lista')}>📋 Lista</button>
        <button onClick={() => setTab('analisis')} style={tabStyle('analisis')}>📊 Análisis</button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: G.gold, borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Vendido</p><p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>S/{tV.toFixed(0)}</p></div>
          <div style={{ flex: 1, background: G.goldDk, borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Ganancia</p><p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>S/{tG.toFixed(0)}</p></div>
        </div>
        <div style={{ background: G.goldLt, borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: G.goldDk }}>📅 Rango:</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ flex: 1, minWidth: 120, padding: '6px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 12 }} />
          <span style={{ fontSize: 11, color: G.muted }}>hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ flex: 1, minWidth: 120, padding: '6px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 12 }} />
          {(desde || hasta) && <button onClick={() => { setDesde(''); setHasta('') }} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: G.err, color: '#fff', fontSize: 11, cursor: 'pointer' }}>✕</button>}
        </div>
        {/* Búsqueda + filtro cliente + pendientes */}
        <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="🔍 Buscar por producto, código o cliente..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <select value={filCliente} onChange={e => setFilCliente(e.target.value)} style={{ flex: 1, minWidth: 150, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 12, background: '#fff', color: G.text }}>
            <option value="">👥 Todos los clientes</option>
            {(clis || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select value={filProveedor} onChange={e => setFilProveedor(e.target.value)} style={{ flex: 1, minWidth: 150, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 12, background: '#fff', color: G.text }}>
            <option value="">🏷️ Todos los proveedores</option>
            {provList.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button onClick={() => setFilPendiente(v => !v)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + (filPendiente ? G.err : G.border), background: filPendiente ? G.err : '#fff', color: filPendiente ? '#fff' : G.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{filPendiente ? '✓ ' : ''}⏳ Falta devolver</button>
          <button onClick={() => setFilPorPagar(v => !v)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid ' + (filPorPagar ? '#D97706' : G.border), background: filPorPagar ? '#D97706' : '#fff', color: filPorPagar ? '#fff' : G.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{filPorPagar ? '✓ ' : ''}💳 Por cobrar</button>
        </div>
        {tPend > 0 && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 12, color: '#92400E', fontWeight: 700 }}>
            💰 Costo pendiente de devolver a proveedores: S/{tPend.toFixed(2)}
          </div>
        )}
        {tPorCobrar > 0 && (
          <div onClick={() => setVerDeben(true)} style={{ background: '#FFEDD5', border: '1px solid #D97706', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#9A3412', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💳 Te deben (fiado / por pagar): S/{tPorCobrar.toFixed(2)}</span>
            <span style={{ fontSize: 11, textDecoration: 'underline' }}>Ver quién →</span>
          </div>
        )}
        {tab === 'lista' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: G.muted }}>{fl.length} ventas</span>
              <button onClick={() => { setModoSelV(m => !m); setSelV([]) }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (modoSelV ? G.gold : G.border), background: modoSelV ? G.gold : 'transparent', color: modoSelV ? '#fff' : G.text, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{modoSelV ? '✕ Cancelar' : '📤 Liquidación'}</button>
              <button onClick={exp} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📥 Excel</button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[['detalle','📋 Detallado'],['cliente','👥 Cliente'],['fecha','📅 Fecha'],['origen','📦 Origen']].map(([k,lbl]) => (
                <button key={k} onClick={() => setAgrupar(k)} style={{ padding: '6px 12px', borderRadius: 16, border: '1px solid ' + (agrupar === k ? G.gold : G.border), background: agrupar === k ? G.gold : '#fff', color: agrupar === k ? '#fff' : G.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{lbl}</button>
              ))}
            </div>
            {fl.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: G.muted }}><p style={{ fontSize: 32 }}>📋</p><p>No hay ventas</p></div>
              : agrupar === 'detalle' ? fl.map(v => renderVenta(v))
              : (grupos || []).map(g => (
                <div key={g.clave} style={{ marginBottom: 8 }}>
                  <div onClick={() => toggleGrupo(g.clave)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: G.goldLt, borderRadius: 10, padding: '10px 14px', cursor: 'pointer', border: '1px solid ' + G.border }}>
                    <div><p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: G.text }}>{gruposAbiertos[g.clave] ? '▼ ' : '▶ '}{g.etiqueta}</p><p style={{ fontSize: 10, color: G.muted, margin: '2px 0 0' }}>{g.ventas.length} ventas • {g.prendas} prendas</p></div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {modoSelV && <button onClick={(e) => { e.stopPropagation(); const ids = g.ventas.map(v => v.id); const todos = ids.every(id => selV.includes(id)); setSelV(s => todos ? s.filter(x => !ids.includes(x)) : [...new Set([...s, ...ids])]) }} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>☑ Todo</button>}
                      <div><p style={{ fontSize: 15, fontWeight: 900, color: G.gold, margin: 0 }}>S/{g.total.toFixed(2)}</p><p style={{ fontSize: 10, color: G.ok, margin: 0, fontWeight: 700 }}>+S/{g.ganancia.toFixed(2)}</p></div>
                    </div>
                  </div>
                  {gruposAbiertos[g.clave] && <div style={{ marginTop: 6, paddingLeft: 6 }}>{g.ventas.map(v => renderVenta(v))}</div>}
                </div>
              ))}
          </>
        )}
        {tab === 'analisis' && (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: G.text }}>🏆 Productos más vendidos</p>
            {porProducto.length === 0 ? <p style={{ color: G.muted, fontSize: 13 }}>Sin datos</p>
              : porProducto.map((p, i) => (<div key={p.nombre} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{i + 1}. {p.nombre}</span><span style={{ fontSize: 12, color: G.gold, fontWeight: 700 }}>{p.cant} und · S/{p.total.toFixed(0)}</span></div><div style={{ height: 6, background: '#F0F0F0', borderRadius: 3 }}><div style={{ height: '100%', width: (p.cant / maxProd * 100) + '%', background: G.gold, borderRadius: 3 }} /></div></div>))}
            <p style={{ fontSize: 13, fontWeight: 700, margin: '20px 0 10px', color: G.text }}>📅 Días con más ventas</p>
            {porDia.length === 0 ? <p style={{ color: G.muted, fontSize: 13 }}>Sin datos</p>
              : porDia.map(d => (<div key={d.dia} style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{d.dia}</span><span style={{ fontSize: 12, color: G.goldDk, fontWeight: 700 }}>S/{d.total.toFixed(0)} · {d.cant} ventas</span></div><div style={{ height: 6, background: '#F0F0F0', borderRadius: 3 }}><div style={{ height: '100%', width: (d.total / maxDia * 100) + '%', background: G.goldDk, borderRadius: 3 }} /></div></div>))}
            <p style={{ fontSize: 13, fontWeight: 700, margin: '20px 0 10px', color: G.text }}>💳 Método de pago</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {porMetodo.map(m => (<div key={m.metodo} style={{ background: G.goldLt, borderRadius: 10, padding: '10px 14px', textAlign: 'center', minWidth: 100 }}><p style={{ fontSize: 18, margin: 0 }}>{m.metodo === 'Efectivo' ? '💵' : '📱'}</p><p style={{ fontSize: 12, fontWeight: 700, margin: '4px 0 2px' }}>{m.metodo}</p><p style={{ fontSize: 11, color: G.gold, fontWeight: 800, margin: 0 }}>S/{m.total.toFixed(0)}</p><p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{m.cant} ventas</p></div>))}
            </div>
          </>
        )}

        {verDeben && (
          <div onClick={() => setVerDeben(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 156, padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ background: '#D97706', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
                <div><p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>💳 Quién te debe</p><p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, margin: 0 }}>Total: S/{tPorCobrar.toFixed(2)}</p></div>
                <button onClick={() => setVerDeben(false)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: 14 }}>
                {debenPorCliente.map(g => (
                  <div key={g.clave} style={{ marginBottom: 8, border: '1px solid ' + G.border, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#FFF7ED' }}>
                      <div onClick={() => setDebenAbierto(s => ({ ...s, [g.clave]: !s[g.clave] }))} style={{ flex: 1, cursor: 'pointer' }}>
                        <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: G.text }}>{debenAbierto[g.clave] ? '▼ ' : '▶ '}{g.nombre}</p>
                        <p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{g.ventas.length} prenda(s)</p>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#9A3412', marginRight: 8 }}>S/{g.total.toFixed(2)}</span>
                      <button onClick={() => cobrarCliente(g)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: G.ok, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>💰 Cobrar todo</button>
                    </div>
                    {debenAbierto[g.clave] && (
                      <div style={{ padding: '4px 12px 8px' }}>
                        {g.ventas.map(v => (
                          <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderTop: '1px solid ' + G.border }}>
                            <span>{v.nombre_producto} ({v.codigo_producto})</span>
                            <span style={{ fontWeight: 700 }}>S/{v.total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {fotoVenta && (
          <div onClick={() => setFotoVenta(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 155, padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 16, width: '100%', maxWidth: 360 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{fotoVenta.nombre}</p><p style={{ fontSize: 11, color: G.muted, margin: 0 }}>{fotoVenta.codigo}</p></div>
                <button onClick={() => setFotoVenta(null)} style={{ background: G.goldLt, border: 'none', borderRadius: 8, width: 30, height: 30, color: G.goldDk, fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
              {fotoVenta.foto
                ? <img src={fotoVenta.foto} alt="" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12, background: G.goldLt }} />
                : <div style={{ width: '100%', height: 260, background: G.goldLt, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: G.muted }}><span style={{ fontSize: 48, opacity: 0.3 }}>📦</span><p style={{ fontSize: 12, marginTop: 8 }}>Sin foto</p></div>}
            </div>
          </div>
        )}

        {editV && (
          <div onClick={() => setEditV(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, maxHeight: '92vh', overflow: 'auto' }}>
              <div style={{ background: G.gold, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>✏️ Editar venta</p>
                <button onClick={() => setEditV(null)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>{editV.nombre_producto}</p>
                <p style={{ fontSize: 10, color: G.muted, margin: '0 0 12px' }}>{editV.codigo_producto} • Costo: S/{editV.precio_costo}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Cantidad</label><input type="number" value={ef.cantidad} onChange={e => setEf(s => ({ ...s, cantidad: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box' }} /></div>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Precio venta</label><input type="number" value={ef.precio_venta_real} onChange={e => setEf(s => ({ ...s, precio_venta_real: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box' }} /></div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: G.muted }}>Costo (lo que te costó)</label>
                  <input type="number" value={ef.precio_costo} onChange={e => setEf(s => ({ ...s, precio_costo: e.target.value }))} placeholder="0" style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <p style={{ fontSize: 10, color: G.warn, margin: '4px 0 10px' }}>⚠️ Cambiar la cantidad ajusta el stock. El costo afecta la ganancia.</p>
                <label style={{ fontSize: 11, color: G.muted }}>Cliente</label>
                <select value={ef.cliente_id} onChange={e => setEf(s => ({ ...s, cliente_id: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, background: '#fff', marginBottom: 8, boxSizing: 'border-box' }}>
                  <option value="">— Sin cliente —</option>
                  {(clis || []).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Método pago</label>
                    <select value={ef.metodo_pago} onChange={e => setEf(s => ({ ...s, metodo_pago: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}>
                      <option value="">—</option><option value="Efectivo">Efectivo</option><option value="Yape">Yape</option><option value="Plin">Plin</option><option value="Transferencia">Transferencia</option><option value="Por Pagar">Por Pagar (fiado)</option></select></div>
                  <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Entrega</label>
                    <select value={ef.tipo_entrega} onChange={e => setEf(s => ({ ...s, tipo_entrega: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}>
                      <option value="">—</option><option value="Tienda">Tienda</option><option value="Delivery">Delivery</option></select></div>
                </div>
                <label style={{ fontSize: 11, color: G.muted, display: 'block', marginTop: 8 }}>Fecha de venta</label>
                <input type="date" value={ef.fecha} onChange={e => setEf(s => ({ ...s, fecha: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} />
                <label style={{ fontSize: 11, color: G.muted, display: 'block' }}>Nota</label>
                <input value={ef.nota} onChange={e => setEf(s => ({ ...s, nota: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box', marginBottom: 10 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: G.text, cursor: 'pointer', background: G.goldLt, padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <input type="checkbox" checked={ef.costo_devuelto} onChange={e => setEf(s => ({ ...s, costo_devuelto: e.target.checked }))} style={{ width: 18, height: 18 }} />
                  Ya devolví el costo al proveedor
                </label>
                <button onClick={guardarEdit} disabled={guardandoV} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{guardandoV ? '⏳ Guardando...' : '💾 Guardar cambios'}</button>
                <button onClick={() => setEditV(null)} style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 10, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {modoSelV && selV.length > 0 && (
          <div style={{ position: 'fixed', bottom: 80, left: 0, right: 0, background: '#fff', borderTop: '1px solid ' + G.border, padding: 12, boxShadow: '0 -2px 12px rgba(0,0,0,0.12)', zIndex: 60 }}>
            <button onClick={enviarLiquidacion} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>📋 Copiar liquidación ({selV.length})</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══ SECCIONES ═══ */
export function SeccionesScr(P) {
  const { eid, tit, secciones, notify, loadAll, setScr } = P
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const formRef = useRef(null)

  const abrir = (s) => {
    if (s) { setEditId(s.id); setNombre(s.nombre); setDescripcion(s.descripcion || '') }
    else { setEditId(null); setNombre(''); setDescripcion('') }
    setShowAdd(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const guardar = async () => {
    if (!nombre.trim()) { notify('Nombre obligatorio', 'error'); return }
    if (editId) {
      await supabase.from('secciones').update({ nombre: nombre.trim(), descripcion: descripcion || null }).eq('id', editId)
      notify('Sección actualizada')
    } else {
      await supabase.from('secciones').insert({ empresa_id: eid, nombre: nombre.trim(), descripcion: descripcion || null })
      notify('Sección creada')
    }
    setShowAdd(false); setEditId(null); setNombre(''); setDescripcion('')
    await loadAll()
  }

  const eliminar = async (s) => {
    if (s.nombre === 'General') { notify('No puedes eliminar la sección General', 'error'); return }
    const { data } = await supabase.from('productos').select('id').eq('seccion_id', s.id).eq('activo', true).limit(1)
    if (data?.length > 0) { notify('Tiene productos asignados. Muévelos primero.', 'error'); return }
    if (!confirm('¿Eliminar sección ' + s.nombre + '?')) return
    await supabase.from('secciones').update({ activo: false }).eq('id', s.id)
    notify('Eliminada'); await loadAll()
  }

  return (
    <div>
      <Hdr tit={tit} sec="🗂️ Secciones" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 11, color: G.muted, margin: '0 0 12px' }}>Define las zonas o exhibidores de tu tienda para ubicar tus productos.</p>
        <button onClick={() => abrir(null)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', color: G.gold, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          ➕ Nueva sección
        </button>
        {showAdd && (
          <div ref={formRef}>
            <Crd title={editId ? 'Editar sección' : 'Nueva sección'}>
              <label style={{ fontSize: 11, color: G.muted }}>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Estante 1, Exhibidor Entrada..." style={iS(G)} />
              <label style={{ fontSize: 11, color: G.muted }}>Descripción (opcional)</label>
              <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej: Perchero lado izquierdo entrada" style={iS(G)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setShowAdd(false); setEditId(null) }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={guardar} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{editId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </Crd>
          </div>
        )}
        {secciones.map(s => (
          <div key={s.id} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, border: '1px solid ' + G.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>🗂️ {s.nombre}</p>
                  {s.nombre === 'General' && <span style={{ fontSize: 9, background: G.goldSf, color: G.goldDk, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Por defecto</span>}
                </div>
                {s.descripcion && <p style={{ fontSize: 10, color: G.muted, margin: '2px 0 0' }}>{s.descripcion}</p>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => abrir(s)} style={{ background: G.goldSf, color: G.goldDk, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>Editar</button>
                {s.nombre !== 'General' && <button onClick={() => eliminar(s)} style={{ background: '#FEE2E2', color: G.err, border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 10 }}>🗑</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ PEDIDOS ONLINE ═══ */
export function PedidosScr(P) {
  const { eid, lid, tit, notify, loadAll, setScr } = P
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fotoVer, setFotoVer] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(null) // pedido a confirmar
  const [entregado, setEntregado] = useState(null) // true/false
  const [procesando, setProcesando] = useState(false)

  const cargarPedidos = async () => {
    const { data } = await supabase.from('pedidos').select('*').eq('empresa_id', eid).order('created_at', { ascending: false })
    setPedidos(data || []); setCargando(false)
  }

  useEffect(() => { cargarPedidos() }, [])

  /* ── Descontar stock de un producto ── */
  const descontarStock = async (productoId, cantidad) => {
    const { data: prod } = await supabase.from('productos').select('cantidad, equivalente_granel, origen_id').eq('id', productoId).single()
    if (!prod) return
    if (prod.equivalente_granel && prod.origen_id) {
      // Granel: descontar del origen
      const { data: origen } = await supabase.from('origenes').select('stock_granel').eq('id', prod.origen_id).single()
      if (origen) {
        const nuevo = (origen.stock_granel || 0) - (prod.equivalente_granel * cantidad)
        await supabase.from('origenes').update({ stock_granel: nuevo }).eq('id', prod.origen_id)
      }
    } else {
      // Normal: descontar del producto
      await supabase.from('productos').update({ cantidad: Math.max(0, (prod.cantidad || 0) - cantidad) }).eq('id', productoId)
    }
  }

  /* ── Confirmar pedido → crear venta(s) + descontar stock ── */
  const confirmarPedido = async () => {
    if (entregado === null) { notify('Indica si ya entregaste el producto', 'error'); return }
    setProcesando(true)
    const p = modalConfirm
    try {
      const tipoEntrega = entregado ? 'entregado' : 'por entregar'

      if (p.tipo_pedido === 'carrito') {
        // Carrito: leer items del pedido
        const { data: items } = await supabase.from('pedido_items').select('*,productos(precio_costo,equivalente_granel,origen_id,cantidad)').eq('pedido_id', p.id)
        for (const item of (items || [])) {
          const { error: ve } = await supabase.from('ventas').insert({
            empresa_id: eid,
            producto_id: item.producto_id,
            codigo_producto: item.codigo,
            nombre_producto: item.nombre,
            precio_costo: item.productos?.precio_costo || 0,
            precio_venta_original: item.precio_venta,
            precio_venta_real: item.precio_venta,
            cantidad: item.cantidad,
            total: item.subtotal,
            metodo_pago: 'Yape',
            tipo_entrega: tipoEntrega,
            estado: tipoEntrega,
            nota: p.nota || null
          })
          if (ve) throw new Error('Error venta: ' + ve.message)
          if (item.producto_id) await descontarStock(item.producto_id, item.cantidad)
        }
      } else {
        // Pedido individual
        const { data: prod } = await supabase.from('productos').select('id,codigo,precio_costo,equivalente_granel,origen_id,cantidad').eq('codigo', p.codigo_producto).eq('empresa_id', eid).single()
        const { error: ve } = await supabase.from('ventas').insert({
          empresa_id: eid,
          producto_id: prod?.id || p.producto_id,
          codigo_producto: p.codigo_producto,
          nombre_producto: p.nombre_producto,
          precio_costo: prod?.precio_costo || 0,
          precio_venta_original: p.precio_venta,
          precio_venta_real: p.precio_venta,
          cantidad: 1,
          total: p.precio_venta,
          metodo_pago: 'Yape',
          tipo_entrega: tipoEntrega,
          estado: tipoEntrega,
          nota: p.nota || null
        })
        if (ve) throw new Error('Error venta: ' + ve.message)
        if (prod?.id) await descontarStock(prod.id, 1)
      }

      // Actualizar pedido a verificado
      await supabase.from('pedidos').update({ estado: 'verificado' }).eq('id', p.id)
      notify(entregado ? '✅ Pedido verificado y venta registrada' : '✅ Verificado — pendiente de entrega')
      setModalConfirm(null); setEntregado(null)
      await cargarPedidos()
      await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setProcesando(false)
  }

  const cancelar = async (id) => {
    await supabase.from('pedidos').update({ estado: 'cancelado' }).eq('id', id)
    setPedidos(ps => ps.map(p => p.id === id ? { ...p, estado: 'cancelado' } : p))
    notify('Pedido cancelado')
  }

  const colorEstado = e => e === 'verificado' ? G.ok : e === 'cancelado' ? G.err : G.warn
  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length

  return (
    <div>
      <Hdr tit={tit} sec="🛒 Pedidos Online" onBack={() => setScr('submenu')} />

      {/* Visor foto */}
      {fotoVer && (
        <div onClick={() => setFotoVer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={fotoVer} alt="" style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}

      {/* Modal confirmación */}
      {modalConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>✅ Confirmar pago verificado</h3>
            <p style={{ fontSize: 13, color: G.muted, margin: '0 0 14px' }}>
              {modalConfirm.nombre_cliente} · <strong style={{ color: G.gold }}>S/{modalConfirm.total_pedido || modalConfirm.precio_venta}</strong>
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: G.text }}>¿Ya entregaste el producto?</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setEntregado(true)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: entregado === true ? G.ok : '#F0F0F0', color: entregado === true ? '#fff' : G.text }}>
                ✅ Sí, ya entregué
              </button>
              <button onClick={() => setEntregado(false)}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: entregado === false ? G.warn : '#F0F0F0', color: entregado === false ? '#fff' : G.text }}>
                🕐 Aún no
              </button>
            </div>
            {entregado === false && (
              <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12, color: '#92400E' }}>
                La venta se registrará como <strong>"por entregar"</strong> y podrás marcarla como entregada después.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setModalConfirm(null); setEntregado(null) }} disabled={procesando}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', fontSize: 13, cursor: 'pointer', color: G.muted }}>
                Cancelar
              </button>
              <button onClick={confirmarPedido} disabled={procesando || entregado === null}
                style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: entregado === null ? '#ccc' : G.gold, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {procesando ? '⏳ Procesando...' : '✅ Confirmar y registrar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: 16 }}>
        {pendientes > 0 && (
          <div style={{ background: G.warn, borderRadius: 10, padding: 12, marginBottom: 12, textAlign: 'center' }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>⚠️ {pendientes} pedido{pendientes > 1 ? 's' : ''} pendiente{pendientes > 1 ? 's' : ''} de verificar</p>
          </div>
        )}
        {cargando ? <p style={{ textAlign: 'center', color: G.muted }}>⏳ Cargando...</p>
          : pedidos.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: G.muted }}><p style={{ fontSize: 40 }}>🛒</p><p>Sin pedidos aún</p></div>
          : pedidos.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, border: '1px solid ' + G.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{p.nombre_cliente}</p>
                  <p style={{ fontSize: 10, color: G.muted, margin: '2px 0' }}>{p.telefono_cliente || ''} • {new Date(p.created_at).toLocaleDateString('es-PE')}</p>
                </div>
                <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, fontWeight: 700, background: colorEstado(p.estado) + '22', color: colorEstado(p.estado) }}>
                  {p.estado === 'pendiente' ? '⏳ Pendiente' : p.estado === 'verificado' ? '✅ Verificado' : '❌ Cancelado'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{p.nombre_producto}</p>
                  <p style={{ fontSize: 11, color: G.gold, fontWeight: 700, margin: '2px 0 0' }}>S/{p.total_pedido || p.precio_venta}</p>
                  {p.delivery && <p style={{ fontSize: 10, color: G.muted, margin: '2px 0 0' }}>🛵 {p.distrito}, {p.provincia} — {p.direccion_delivery}</p>}
                  {p.nota && <p style={{ fontSize: 10, color: G.muted, margin: '2px 0 0' }}>{p.nota}</p>}
                </div>
                {/* Fotos comprobante */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {p.fotos_comprobante?.map((url, i) => (
                    <img key={i} src={url} alt="" onClick={() => setFotoVer(url)}
                      style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '2px solid ' + G.border }} />
                  ))}
                  {!p.fotos_comprobante && p.foto_comprobante && (
                    <img src={p.foto_comprobante} alt="" onClick={() => setFotoVer(p.foto_comprobante)}
                      style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '2px solid ' + G.border }} />
                  )}
                </div>
              </div>
              {p.estado === 'pendiente' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setModalConfirm(p); setEntregado(null) }}
                    style={{ flex: 2, padding: '8px 0', borderRadius: 8, border: 'none', background: G.ok, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✅ ¡Clic aquí si ya verifiqué el pago!
                  </button>
                  <button onClick={() => cancelar(p.id)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: G.err, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ❌ Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

/* ═══ INVENTARIO FÍSICO ═══ */
export function InventarioScr(P) {
  const { eid, tit, allProds, notify, setScr } = P
  const [escaneados, setEscaneados] = useState([])
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [fase, setFase] = useState('inicio') // inicio | escaneando | resultado

  const limpiar = async () => {
    if (!confirm('¿Limpiar inventario actual y empezar de cero?')) return
    await supabase.from('inventario_fisico').delete().eq('empresa_id', eid)
    setEscaneados([]); setResultado(null); setFase('inicio'); notify('Inventario limpiado')
  }

  const procesarFoto = async (file) => {
    setProcesando(true)
    try {
      const fd = new FormData()
      fd.append('imagen', file)
      const RAILWAY = import.meta.env.VITE_RAILWAY_URL || ''
      const resp = await fetch(RAILWAY + '/ocr-etiqueta', { method: 'POST', body: fd })
      const data = await resp.json()
      if (data.codigo) {
        const ya = escaneados.find(e => e.codigo === data.codigo)
        if (!ya) {
          const prod = allProds.find(p => p.codigo === data.codigo)
          const nuevo = { codigo: data.codigo, nombre: prod?.nombre || '?', encontrado: !!prod }
          setEscaneados(prev => [...prev, nuevo])
          await supabase.from('inventario_fisico').insert({ empresa_id: eid, codigo: data.codigo, encontrado: !!prod })
          notify(prod ? '✅ ' + data.codigo + ' — ' + prod.nombre : '⚠️ ' + data.codigo + ' no está en el sistema')
        } else {
          notify('Ya escaneado: ' + data.codigo)
        }
      } else notify('No se pudo leer el código', 'error')
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setProcesando(false)
  }

  const onFotos = async (e) => {
    const files = Array.from(e.target.files || [])
    setFase('escaneando')
    for (const file of files) await procesarFoto(file)
    e.target.value = ''
  }

  const comparar = () => {
    const codsEscaneados = new Set(escaneados.map(e => e.codigo))
    const codsSistema = new Set(allProds.map(p => p.codigo))
    const encontrados = escaneados.filter(e => codsSistema.has(e.codigo))
    const sobrantes = escaneados.filter(e => !codsSistema.has(e.codigo))
    const faltantes = allProds.filter(p => !codsEscaneados.has(p.codigo))
    setResultado({ encontrados, sobrantes, faltantes })
    setFase('resultado')
  }

  return (
    <div>
      <Hdr tit={tit} sec="📦 Inventario Físico" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        {fase === 'inicio' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 48, margin: 0 }}>📦</p>
            <p style={{ fontSize: 16, fontWeight: 700, margin: '8px 0' }}>Inventario físico</p>
            <p style={{ fontSize: 13, color: G.muted, margin: '0 0 20px' }}>Toma fotos de las etiquetas de tus productos para hacer el conteo.</p>
            <button onClick={() => setFase('escaneando')} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>
              📷 Iniciar escaneo
            </button>
            <button onClick={limpiar} style={{ width: '100%', padding: 12, borderRadius: 10, border: '2px solid ' + G.err, background: 'transparent', color: G.err, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              🗑 Limpiar inventario anterior
            </button>
          </div>
        )}
        {fase === 'escaneando' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <label style={{ flex: 1, padding: 14, borderRadius: 10, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', textAlign: 'center' }}>
                <span style={{ fontSize: 22, display: 'block' }}>{procesando ? '⏳' : '📷'}</span>
                <span style={{ fontSize: 12, color: G.gold, fontWeight: 600 }}>{procesando ? 'Leyendo...' : 'Fotografiar etiquetas'}</span>
                <input type="file" accept="image/*" multiple onChange={onFotos} style={{ display: 'none' }} disabled={procesando} />
              </label>
            </div>
            <p style={{ fontSize: 12, color: G.muted, margin: '0 0 8px' }}>{escaneados.length} productos escaneados</p>
            {escaneados.map((e, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 8, padding: 10, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid ' + G.border }}>
                <span style={{ fontSize: 16 }}>{e.encontrado ? '✅' : '⚠️'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{e.codigo}</p>
                  <p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{e.nombre}</p>
                </div>
              </div>
            ))}
            {escaneados.length > 0 && (
              <button onClick={comparar} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>
                📊 Ver resultado vs catálogo
              </button>
            )}
          </>
        )}
        {fase === 'resultado' && resultado && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ background: '#D1FAE5', borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 22, fontWeight: 800, color: '#065F46', margin: 0 }}>{resultado.encontrados.length}</p><p style={{ fontSize: 10, color: '#065F46', margin: 0 }}>✅ OK</p></div>
              <div style={{ background: '#FEF3C7', borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 22, fontWeight: 800, color: '#92400E', margin: 0 }}>{resultado.sobrantes.length}</p><p style={{ fontSize: 10, color: '#92400E', margin: 0 }}>⚠️ Sobrantes</p></div>
              <div style={{ background: '#FEE2E2', borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 22, fontWeight: 800, color: G.err, margin: 0 }}>{resultado.faltantes.length}</p><p style={{ fontSize: 10, color: G.err, margin: 0 }}>🔴 Faltantes</p></div>
            </div>
            {resultado.sobrantes.length > 0 && (<><p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>⚠️ Sobrantes (físico pero no en sistema):</p>{resultado.sobrantes.map((e, i) => <div key={i} style={{ background: '#FEF3C7', borderRadius: 8, padding: 8, marginBottom: 4, fontSize: 12 }}>{e.codigo}</div>)}</>)}
            {resultado.faltantes.length > 0 && (<><p style={{ fontSize: 13, fontWeight: 700, color: G.err, marginTop: 12 }}>🔴 Faltantes (en sistema pero no encontrados):</p>{resultado.faltantes.map((p, i) => <div key={i} style={{ background: '#FEE2E2', borderRadius: 8, padding: 8, marginBottom: 4, fontSize: 12 }}>{p.codigo} — {p.nombre}</div>)}</>)}
            <button onClick={() => setFase('escaneando')} style={{ width: '100%', padding: 12, borderRadius: 10, border: '2px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 12 }}>← Seguir escaneando</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══ CONCILIACIÓN YAPE ═══ */
export function ConciliacionScr(P) {
  const { eid, tit, vents, notify, setScr } = P
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)

  const onExcel = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setCargando(true)
    try {
      // XLSX ya importado estáticamente al inicio
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      // Buscar cabecera
      const hdIdx = rows.findIndex(r => r.some(c => String(c).includes('Tipo')))
      const data = rows.slice(hdIdx + 1).filter(r => String(r[0]).includes('TE PAGÓ'))
      const yapeItems = data.map(r => ({
        tipo: String(r[0] || '').trim(),
        origen: String(r[1] || '').trim(),
        monto: parseFloat(String(r[3]).replace(',', '.')) || 0,
        mensaje: String(r[4] || '').trim(),
        fecha: String(r[5] || '').trim().split(' ')[0]
      })).filter(i => i.monto > 0)

      // Ventas Yape del sistema
      const ventasYape = vents.filter(v => v.metodo_pago === 'Yape')

      const coinciden = [], soloYape = [], soloSistema = []
      const usadas = new Set()

      yapeItems.forEach(yi => {
        const match = ventasYape.find(v => {
          const key = v.id
          if (usadas.has(key)) return false
          const montoOk = Math.abs(v.total - yi.monto) < 0.01
          const fechaOk = new Date(v.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').reverse().join('-').startsWith(yi.fecha.split('/').reverse().join('-').substring(0, 7))
          return montoOk && fechaOk
        })
        if (match) { usadas.add(match.id); coinciden.push({ yape: yi, venta: match }) }
        else soloYape.push(yi)
      })
      ventasYape.filter(v => !usadas.has(v.id)).forEach(v => soloSistema.push(v))

      setResultado({ coinciden, soloYape, soloSistema, total: yapeItems.length })
    } catch (e) { notify('Error al procesar: ' + e.message, 'error') }
    setCargando(false)
    e.target.value = ''
  }

  return (
    <div>
      <Hdr tit={tit} sec="🔄 Conciliación Yape" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 14, marginBottom: 16, border: '1px solid #BFDBFE' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: '0 0 6px' }}>📋 Cómo usar:</p>
          <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 4px' }}>1. Abre Yape → Historial → Exportar reporte Excel</p>
          <p style={{ fontSize: 12, color: '#1E40AF', margin: 0 }}>2. Sube el archivo aquí para cruzar con tus ventas</p>
        </div>
        <label style={{ display: 'block', padding: 20, borderRadius: 10, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 30, display: 'block', marginBottom: 4 }}>{cargando ? '⏳' : '📊'}</span>
          <span style={{ fontSize: 14, color: G.gold, fontWeight: 600 }}>{cargando ? 'Procesando...' : 'Subir reporte Yape (.xlsx)'}</span>
          <input type="file" accept=".xlsx,.xls" onChange={onExcel} style={{ display: 'none' }} disabled={cargando} />
        </label>
        {resultado && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ background: '#D1FAE5', borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 22, fontWeight: 800, color: '#065F46', margin: 0 }}>{resultado.coinciden.length}</p><p style={{ fontSize: 9, color: '#065F46', margin: 0 }}>✅ Coinciden</p></div>
              <div style={{ background: '#FEF3C7', borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 22, fontWeight: 800, color: '#92400E', margin: 0 }}>{resultado.soloYape.length}</p><p style={{ fontSize: 9, color: '#92400E', margin: 0 }}>⚠️ Solo Yape</p></div>
              <div style={{ background: '#FEE2E2', borderRadius: 10, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 22, fontWeight: 800, color: G.err, margin: 0 }}>{resultado.soloSistema.length}</p><p style={{ fontSize: 9, color: G.err, margin: 0 }}>🔴 Solo sistema</p></div>
            </div>
            {resultado.soloYape.length > 0 && (
              <><p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>⚠️ Pagos en Yape sin venta registrada:</p>
                {resultado.soloYape.map((y, i) => <div key={i} style={{ background: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 4, fontSize: 12 }}><strong>S/{y.monto}</strong> • {y.origen} • {y.fecha}{y.mensaje ? ' • ' + y.mensaje : ''}</div>)}</>
            )}
            {resultado.soloSistema.length > 0 && (
              <><p style={{ fontSize: 13, fontWeight: 700, color: G.err, marginTop: 12 }}>🔴 Ventas Yape en sistema sin pago en reporte:</p>
                {resultado.soloSistema.map((v, i) => <div key={i} style={{ background: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 4, fontSize: 12 }}><strong>S/{v.total}</strong> • {v.nombre_producto} • {new Date(v.created_at).toLocaleDateString('es-PE')}</div>)}</>
            )}
            {resultado.coinciden.length > 0 && (
              <><p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginTop: 12 }}>✅ Pagos verificados ({resultado.coinciden.length}):</p>
                {resultado.coinciden.map((c, i) => <div key={i} style={{ background: '#D1FAE5', borderRadius: 8, padding: 10, marginBottom: 4, fontSize: 12 }}><strong>S/{c.yape.monto}</strong> • {c.venta.nombre_producto} • {c.yape.origen}</div>)}</>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ═══ MARKETING WHATSAPP ═══ */
export function MarketingScr(P) {
  const { tit, prods, clis, emp, notify, setScr } = P
  const [filtroGenero, setFiltroGenero] = useState('')
  const [filtroPrecioMax, setFiltroPrecioMax] = useState('')
  const [selProds, setSelProds] = useState([])
  const [mensaje, setMensaje] = useState('')

  const RAILWAY_URL = import.meta.env.VITE_RAILWAY_URL || ''

  const clientesFiltrados = clis.filter(c => {
    if (filtroGenero && c.genero !== filtroGenero) return false
    if (filtroPrecioMax && c.precio_max && c.precio_max < parseFloat(filtroPrecioMax)) return false
    return c.acepta_publicidad
  })

  const toggleProd = (p) => {
    setSelProds(prev => prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p])
  }

  const generarMensaje = () => {
    if (!selProds.length) { notify('Selecciona al menos un producto', 'error'); return }
    const lineas = selProds.map(p => {
      const link = `${window.location.origin}/comprar/${p.codigo}`
      return `👗 *${p.nombre}* — S/${p.precio_venta}\n🛒 Comprar: ${link}`
    })
    const msg = `¡Hola! 👋 Mira estos productos de *${emp?.nombre}*:\n\n${lineas.join('\n\n')}\n\n📍 ${emp?.direccion || ''}\n📱 ${emp?.whatsapp || ''}`
    setMensaje(msg)
  }

  const copiarMensaje = () => { navigator.clipboard.writeText(mensaje); notify('📋 Mensaje copiado') }

  const abrirWhatsApp = (telefono) => {
    const url = `https://wa.me/51${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  return (
    <div>
      <Hdr tit={tit} sec="📲 WhatsApp Marketing" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        {/* Filtro clientes */}
        <Crd title="1. Filtrar clientes">
          <label style={{ fontSize: 11, color: G.muted }}>Género</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['', 'Mujer', 'Hombre', 'Niño', 'Unisex'].map(g => (
              <button key={g} onClick={() => setFiltroGenero(g)} style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer', background: filtroGenero === g ? G.gold : G.goldSf, color: filtroGenero === g ? '#fff' : G.goldDk }}>{g || 'Todos'}</button>
            ))}
          </div>
          <label style={{ fontSize: 11, color: G.muted }}>Precio máx (S/)</label>
          <input value={filtroPrecioMax} onChange={e => setFiltroPrecioMax(e.target.value)} type="number" placeholder="Sin límite" style={iS(G)} />
          <p style={{ fontSize: 12, color: G.gold, fontWeight: 600, margin: 0 }}>📋 {clientesFiltrados.length} clientes con publicidad habilitada</p>
        </Crd>

        {/* Selección de productos */}
        <Crd title={`2. Seleccionar productos (${selProds.length})`}>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {prods.filter(p => p.cantidad > 0).map(p => (
              <div key={p.id} onClick={() => toggleProd(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid ' + G.border, cursor: 'pointer', background: selProds.find(x => x.id === p.id) ? G.goldLt : 'transparent', borderRadius: 4, paddingLeft: 6 }}>
                <span style={{ fontSize: 18 }}>{selProds.find(x => x.id === p.id) ? '✅' : '⬜'}</span>
                {p.foto_url && <img src={p.foto_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{p.nombre}</p>
                  <p style={{ fontSize: 10, color: G.gold, margin: 0 }}>S/{p.precio_venta}</p>
                </div>
              </div>
            ))}
          </div>
        </Crd>

        {/* Generar mensaje */}
        <button onClick={generarMensaje} disabled={!selProds.length}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: selProds.length ? G.gold : '#ccc', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
          💬 Generar mensaje WhatsApp
        </button>

        {mensaje && (
          <Crd title="3. Enviar">
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={8} style={{ ...iS(G), fontSize: 12, fontFamily: 'monospace' }} />
            <button onClick={copiarMensaje} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>📋 Copiar mensaje</button>
            <p style={{ fontSize: 11, color: G.muted, margin: '0 0 8px' }}>Enviar a clientes filtrados:</p>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {clientesFiltrados.filter(c => c.telefono).map(c => (
                <button key={c.id} onClick={() => abrirWhatsApp(c.telefono)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 4, textAlign: 'left' }}>
                  💬 {c.nombre} — {c.telefono}
                </button>
              ))}
              {clientesFiltrados.filter(c => !c.telefono).length > 0 && (
                <p style={{ fontSize: 10, color: G.muted }}>{clientesFiltrados.filter(c => !c.telefono).length} clientes sin teléfono registrado</p>
              )}
            </div>
          </Crd>
        )}
      </div>
    </div>
  )
}

/* ═══ CREADOR DE PROMOCIONES ═══ */
export function PromoCreatorScr(P) {
  const { eid, tit, prods, emp, notify, setScr } = P
  const [selProds, setSelProds] = useState([])
  const [nombre, setNombre] = useState('')
  const [fechaVence, setFechaVence] = useState('')
  const [promoCreada, setPromoCreada] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [misPromos, setMisPromos] = useState([])
  const [vista, setVista] = useState('lista') // lista | crear
  // filtros del armador
  const [fCat, setFCat] = useState('')
  const [fTalla, setFTalla] = useState('')
  const [fColor, setFColor] = useState('')
  const [fGenero, setFGenero] = useState('')
  const [fTexto, setFTexto] = useState('')
  // diálogo PDF: guarda la promo (o selección) sobre la que se pide PDF
  const [pdfFor, setPdfFor] = useState(null) // {productos, nombrePromo} | null
  const BASE_URL = window.location.origin

  useEffect(() => { cargarPromos() }, [])

  const cargarPromos = async () => {
    const { data } = await supabase.from('promociones').select('*').eq('empresa_id', eid).eq('activo', true).order('created_at', { ascending: false })
    setMisPromos(data || [])
  }

  const disp = prods.filter(p => p.cantidad > 0 && !p.oculto)
  // valores únicos para los desplegables
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort()
  const cats = uniq(disp.map(p => p.categorias?.nombre))
  const tallas = uniq(disp.map(p => p.atributos?.talla))
  const colores = uniq(disp.map(p => p.color))
  const generos = uniq(disp.map(p => p.atributos?.genero))

  const filtrados = disp.filter(p =>
    (!fCat || p.categorias?.nombre === fCat) &&
    (!fTalla || p.atributos?.talla === fTalla) &&
    (!fColor || p.color === fColor) &&
    (!fGenero || p.atributos?.genero === fGenero) &&
    (!fTexto || (p.nombre || '').toLowerCase().includes(fTexto.toLowerCase()) || (p.codigo || '').toLowerCase().includes(fTexto.toLowerCase()))
  )

  const limpiarFiltros = () => { setFCat(''); setFTalla(''); setFColor(''); setFGenero(''); setFTexto('') }

  const toggleProd = (p) => {
    setSelProds(prev => prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p])
  }
  const agregarTodos = () => {
    setSelProds(prev => {
      const ids = new Set(prev.map(x => x.id))
      return [...prev, ...filtrados.filter(p => !ids.has(p.id))]
    })
  }

  const generarCodigo = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const crearPromo = async () => {
    if (!selProds.length) { notify('Selecciona al menos un producto', 'error'); return }
    setGuardando(true)
    try {
      const codigo = generarCodigo()
      const { data, error } = await supabase.from('promociones').insert({
        empresa_id: eid, codigo, nombre: nombre.trim() || 'Promoción especial',
        producto_ids: selProds.map(p => p.id),
        fecha_vence: fechaVence || null
      }).select().single()
      if (error) throw error
      setPromoCreada(data)
      await cargarPromos()
      notify('✅ Promoción creada')
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setGuardando(false)
  }

  const compartir = async (promo) => {
    const url = `${BASE_URL}/promo/${promo.codigo}`
    if (navigator.share) {
      try {
        const { data: ps } = await supabase.from('productos').select('foto_url,nombre').in('id', promo.producto_ids).eq('activo', true)
        const fotosDisp = (ps || []).filter(p => p.foto_url)
        if (fotosDisp.length > 0) {
          const blobs = await Promise.all(fotosDisp.slice(0, 10).map(p => fetch(p.foto_url).then(r => r.blob())))
          const files = blobs.map((b, i) => new File([b], `foto_${i+1}.jpg`, { type: 'image/jpeg' }))
          await navigator.share({ files, title: promo.nombre || 'Promoción', text: `🛍️ ${promo.nombre || 'Promoción especial'}\n\n👆 Toca para ver y comprar:\n${url}` })
        } else {
          await navigator.share({ title: promo.nombre || 'Promoción', text: `🛍️ ${promo.nombre || 'Promoción especial'}\n\n👆 Ver y comprar:\n${url}`, url })
        }
      } catch (e) { if (e.name !== 'AbortError') { navigator.clipboard.writeText(url); notify('📋 Link copiado') } }
    } else {
      navigator.clipboard.writeText(url); notify('📋 Link copiado al portapapeles')
    }
  }

  const copiarLink = (promo) => {
    navigator.clipboard.writeText(`${BASE_URL}/promo/${promo.codigo}`)
    notify('📋 Link copiado')
  }

  const desactivar = async (id) => {
    if (!confirm('¿Desactivar esta promoción?')) return
    await supabase.from('promociones').update({ activo: false }).eq('id', id)
    notify('Promoción desactivada'); await cargarPromos()
  }

  // Abre el diálogo de PDF para una promo guardada (resuelve sus productos) o para la selección actual
  const pedirPDFdePromo = async (promo) => {
    const { data } = await supabase.from('productos').select('*, categorias(nombre)').in('id', promo.producto_ids || []).eq('activo', true)
    setPdfFor({ productos: data || [], nombrePromo: promo.nombre })
  }
  const pedirPDFdeSeleccion = () => {
    if (!selProds.length) { notify('Selecciona productos primero', 'error'); return }
    setPdfFor({ productos: selProds, nombrePromo: nombre })
  }
  const hacerPDF = (porPagina) => {
    const items = pdfFor?.productos || []
    if (!items.length) { notify('Sin productos con stock', 'error'); setPdfFor(null); return }
    if (porPagina === 1) generarCatalogoPDF(items, emp, '')
    else generarCatalogoPDFGrid(items, emp, porPagina)
    setPdfFor(null)
  }

  const selS = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 12, background: '#fff', color: G.text, marginBottom: 6 }

  return (
    <div>
      <Hdr tit={tit} sec="🎯 Promociones / Catálogo" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setVista('lista')} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: vista === 'lista' ? G.gold : G.goldSf, color: vista === 'lista' ? '#fff' : G.goldDk, fontWeight: 700, cursor: 'pointer' }}>Mis promos</button>
          <button onClick={() => { setVista('crear'); setPromoCreada(null); setSelProds([]); setNombre(''); setFechaVence(''); limpiarFiltros() }} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: vista === 'crear' ? G.gold : G.goldSf, color: vista === 'crear' ? '#fff' : G.goldDk, fontWeight: 700, cursor: 'pointer' }}>➕ Armar nueva</button>
        </div>

        {/* Lista de promos existentes */}
        {vista === 'lista' && (
          <>
            {misPromos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: G.muted }}>
                <p style={{ fontSize: 40 }}>🎯</p>
                <p>No tienes promociones activas</p>
                <button onClick={() => setVista('crear')} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Armar la primera</button>
              </div>
            ) : misPromos.map(pr => (
              <div key={pr.id} style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, border: '1px solid ' + G.border }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{pr.nombre || 'Promoción especial'}</p>
                    <p style={{ fontSize: 10, color: G.muted, margin: '2px 0 0' }}>{pr.producto_ids?.length} productos • Código: {pr.codigo}</p>
                    {pr.fecha_vence && <p style={{ fontSize: 10, color: G.warn, margin: '2px 0 0' }}>Vence: {pr.fecha_vence}</p>}
                  </div>
                  <button onClick={() => desactivar(pr.id)} style={{ background: '#FEE2E2', color: G.err, border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 10 }}>🗑</button>
                </div>
                <div style={{ background: G.goldLt, borderRadius: 8, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 11, color: G.goldDk, margin: 0, fontFamily: 'monospace' }}>{BASE_URL}/promo/{pr.codigo}</p>
                  <button onClick={() => copiarLink(pr)} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 10, marginLeft: 8, whiteSpace: 'nowrap' }}>📋 Copiar</button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => compartir(pr)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📤 WhatsApp</button>
                  <button onClick={() => pedirPDFdePromo(pr)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📄 PDF</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Armar nueva promo/catálogo */}
        {vista === 'crear' && !promoCreada && (
          <>
            <Crd title="Datos">
              <label style={{ fontSize: 11, color: G.muted }}>Nombre (opcional)</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Ofertas de verano..." style={iS(G)} />
              <label style={{ fontSize: 11, color: G.muted }}>Vence el (opcional)</label>
              <input value={fechaVence} onChange={e => setFechaVence(e.target.value)} type="date" style={iS(G)} />
            </Crd>

            {/* Filtros */}
            <Crd title="🔍 Filtrar productos">
              <input value={fTexto} onChange={e => setFTexto(e.target.value)} placeholder="Nombre o código..." style={iS(G)} />
              {cats.length > 0 && <select value={fCat} onChange={e => setFCat(e.target.value)} style={selS}><option value="">Categoría: todas</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>}
              {tallas.length > 0 && <select value={fTalla} onChange={e => setFTalla(e.target.value)} style={selS}><option value="">Talla: todas</option>{tallas.map(t => <option key={t} value={t}>{t}</option>)}</select>}
              {colores.length > 0 && <select value={fColor} onChange={e => setFColor(e.target.value)} style={selS}><option value="">Color: todos</option>{colores.map(c => <option key={c} value={c}>{c}</option>)}</select>}
              {generos.length > 0 && <select value={fGenero} onChange={e => setFGenero(e.target.value)} style={selS}><option value="">Género: todos</option>{generos.map(g => <option key={g} value={g}>{g}</option>)}</select>}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={limpiarFiltros} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid ' + G.border, background: '#fff', color: G.err, fontSize: 12, cursor: 'pointer' }}>Limpiar filtros</button>
                <button onClick={agregarTodos} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: G.goldSf, color: G.goldDk, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>＋ Agregar {filtrados.length} filtrados</button>
              </div>
            </Crd>

            <p style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 10px', color: G.text }}>Productos ({filtrados.length}) — seleccionados: {selProds.length}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 90 }}>
              {filtrados.map(p => {
                const sel = selProds.find(x => x.id === p.id)
                return (
                  <div key={p.id} onClick={() => toggleProd(p)}
                    style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', border: sel ? '2px solid ' + G.gold : '2px solid transparent', cursor: 'pointer', position: 'relative', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {sel && <div style={{ position: 'absolute', top: 6, right: 6, background: G.gold, color: '#fff', borderRadius: 12, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, zIndex: 1 }}>✓</div>}
                    {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: 100, background: G.goldLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, opacity: 0.3 }}>👗</span></div>}
                    <div style={{ padding: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{p.nombre}</p>
                      <p style={{ fontSize: 9, color: G.muted, margin: '1px 0 0' }}>{[p.atributos?.talla && ('T:' + p.atributos.talla), p.color].filter(Boolean).join(' • ')}</p>
                      <p style={{ fontSize: 12, fontWeight: 800, color: G.gold, margin: '2px 0 0' }}>S/{p.precio_venta}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Barra flotante del carrito */}
            {selProds.length > 0 && (
              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid ' + G.border, padding: 12, display: 'flex', gap: 8, boxShadow: '0 -2px 12px rgba(0,0,0,0.1)', zIndex: 50 }}>
                <button onClick={pedirPDFdeSeleccion} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📄 PDF ({selProds.length})</button>
                <button onClick={crearPromo} disabled={guardando} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{guardando ? '⏳...' : `🎯 Guardar promo (${selProds.length})`}</button>
              </div>
            )}
          </>
        )}

        {/* Promo creada */}
        {promoCreada && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 48, margin: 0 }}>🎉</p>
            <h2 style={{ color: G.gold, fontSize: 20, fontWeight: 800, margin: '8px 0' }}>¡Promoción lista!</h2>
            <div style={{ background: G.goldLt, borderRadius: 12, padding: 16, margin: '12px 0', border: '1px solid ' + G.border }}>
              <p style={{ fontSize: 11, color: G.muted, margin: '0 0 4px' }}>Tu link:</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: G.goldDk, fontFamily: 'monospace', margin: 0, wordBreak: 'break-all' }}>{BASE_URL}/promo/{promoCreada.codigo}</p>
            </div>
            <button onClick={() => compartir(promoCreada)} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#25D366', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>📤 Compartir por WhatsApp</button>
            <button onClick={() => pedirPDFdePromo(promoCreada)} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: G.gold, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}>📄 Generar PDF</button>
            <button onClick={() => copiarLink(promoCreada)} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#2563EB', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>📋 Copiar link</button>
            <button onClick={() => { setVista('lista'); setPromoCreada(null) }} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 14, cursor: 'pointer' }}>Ver mis promociones</button>
          </div>
        )}

        {/* Diálogo: productos por página */}
        {pdfFor && (
          <div onClick={() => setPdfFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: G.text }}>📄 Generar PDF</h3>
              <p style={{ fontSize: 12, color: G.muted, margin: '0 0 14px' }}>{pdfFor.productos.length} productos. ¿Cuántos por página?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => hacerPDF(1)} style={{ padding: 14, borderRadius: 10, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>1 — ficha grande</button>
                <button onClick={() => hacerPDF(2)} style={{ padding: 14, borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', color: G.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>2 por página</button>
                <button onClick={() => hacerPDF(4)} style={{ padding: 14, borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', color: G.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>4 por página</button>
                <button onClick={() => hacerPDF(6)} style={{ padding: 14, borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', color: G.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>6 por página</button>
                <button onClick={() => hacerPDF(9)} style={{ padding: 14, borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', color: G.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', gridColumn: '1 / -1' }}>9 por página (grilla densa)</button>
              </div>
              <button onClick={() => setPdfFor(null)} style={{ width: '100%', padding: 10, marginTop: 12, borderRadius: 10, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
/* ═══ PROVEEDORES (mantenimiento) ═══ */
export function ProveedoresScr(P) {
  const { eid, tit, notify, setScr } = P
  const [lista, setLista] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState(null)
  const [nombre, setNombre] = useState('')
  const formRef = useRef(null)

  const cargar = async () => {
    const { data } = await supabase.from('proveedores').select('*').eq('empresa_id', eid).eq('activo', true).order('nombre')
    if (data) setLista(data)
  }
  useEffect(() => { if (eid) cargar() }, [eid])

  const abrir = (p) => {
    if (p) { setEditId(p.id); setNombre(p.nombre) }
    else { setEditId(null); setNombre('') }
    setShowAdd(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const guardar = async () => {
    if (!nombre.trim()) { notify('Nombre obligatorio', 'error'); return }
    if (editId) {
      const { error } = await supabase.from('proveedores').update({ nombre: nombre.trim() }).eq('id', editId)
      if (error) { notify('Error: ' + error.message, 'error'); return }
      notify('Actualizado')
    } else {
      const { error } = await supabase.from('proveedores').insert({ empresa_id: eid, nombre: nombre.trim() })
      if (error) { notify('Error: ' + error.message, 'error'); return }
      notify('Agregado')
    }
    setShowAdd(false); setEditId(null); setNombre(''); await cargar()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar proveedor?')) return
    await supabase.from('proveedores').update({ activo: false }).eq('id', id)
    notify('Eliminado'); await cargar()
  }

  return (
    <div>
      <Hdr tit={tit} sec="🏷️ Proveedores" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <button onClick={() => showAdd ? (setShowAdd(false), setEditId(null), setNombre('')) : abrir(null)}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
          {showAdd ? '✕ Cancelar' : '➕ Nuevo proveedor'}
        </button>
        {showAdd && (
          <div ref={formRef}>
            <Crd title={editId ? 'Editar proveedor' : 'Nuevo proveedor'}>
              <label style={{ fontSize: 11, color: G.muted }}>Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Betsy" style={iS(G)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={guardar} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: G.ok, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar</button>
                <button onClick={() => { setShowAdd(false); setEditId(null); setNombre('') }} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid ' + G.border, background: '#fff', color: G.text, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </Crd>
          </div>
        )}
        {lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: G.muted }}>Sin proveedores. Agrega el primero.</div>
        ) : lista.map(p => (
          <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid ' + G.border, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: G.text }}>🏷️ {p.nombre}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => abrir(p)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid ' + G.border, background: G.goldLt, color: G.goldDk, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
              <button onClick={() => eliminar(p.id)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: G.err, fontSize: 12, cursor: 'pointer' }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ REPORTE DE ORÍGENES (con filtro por proveedor + export Excel) ═══ */
export function ReporteOrigenesScr(P) {
  const { eid, tit, notify, setScr, setEditP, setRetorno, oris, setOrigenEdit } = P
  const [rows, setRows] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [filtro, setFiltro] = useState([]) // ids de proveedores seleccionados; [] = todos
  const [filtroOrigen, setFiltroOrigen] = useState('') // nombre de origen; '' = todos
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
      setLoading(true)
      const [prov, oris, prods, vtas] = await Promise.all([
        supabase.from('proveedores').select('*').eq('empresa_id', eid).eq('activo', true).order('nombre'),
        supabase.from('origenes').select('*').eq('empresa_id', eid).eq('activo', true).order('nombre'),
        supabase.from('productos').select('id,origen_id,cantidad,precio_costo').eq('empresa_id', eid).eq('activo', true),
        supabase.from('ventas').select('producto_id,cantidad,total,precio_costo,precio_venta_real').eq('empresa_id', eid)
      ])
      setProveedores(prov.data || [])
      const P2 = prov.data || [], O = oris.data || [], PR = prods.data || [], V = vtas.data || []
      // map producto_id -> origen_id
      const prodOrigen = {}; PR.forEach(p => { prodOrigen[p.id] = p.origen_id })
      // agregados por origen desde productos
      const regByOri = {}; PR.forEach(p => {
        const o = regByOri[p.origen_id] || { unidades: 0, inv: 0, count: 0 }
        o.unidades += (p.cantidad || 0); o.inv += (p.precio_costo || 0) * (p.cantidad || 0); o.count += 1
        regByOri[p.origen_id] = o
      })
      // agregados por origen desde ventas
      const venByOri = {}; V.forEach(v => {
        const oid = prodOrigen[v.producto_id]; if (!oid) return
        const o = venByOri[oid] || { und: 0, soles: 0, costo: 0 }
        o.und += (v.cantidad || 0); o.soles += (v.total || 0); o.costo += (v.precio_costo || 0) * (v.cantidad || 0)
        venByOri[oid] = o
      })
      const provName = {}; P2.forEach(p => { provName[p.id] = p.nombre })
      const out = O.map(o => {
        const reg = regByOri[o.id] || { unidades: 0, inv: 0, count: 0 }
        const ven = venByOri[o.id] || { und: 0, soles: 0, costo: 0 }
        return {
          origen_id: o.id,
          origen: o.nombre,
          num_productos: reg.count,
          proveedor_id: o.proveedor_id || null,
          proveedor: o.proveedor_id ? (provName[o.proveedor_id] || '') : '',
          und_declaradas: o.cantidad || 0,
          und_registradas: reg.unidades + ven.und,
          costo_unit: o.precio_costo_defecto ?? '',
          inv_declarada: (o.cantidad || 0) * (o.precio_costo_defecto || 0),
          und_vendidas: ven.und,
          vendido_soles: ven.soles,
          costo_recuperado: ven.costo
        }
      })
      setRows(out)
      setLoading(false)
  }

  useEffect(() => { if (eid) cargar() }, [eid])

  const toggleFiltro = (id) => {
    setFiltro(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id])
  }

  const origenesDisp = [...new Set(rows.map(r => r.origen).filter(Boolean))].sort()
  const visibles = rows.filter(r =>
    (filtro.length === 0 || filtro.includes(r.proveedor_id)) &&
    (!filtroOrigen || r.origen === filtroOrigen)
  )

  // ── Popup: productos de un origen ──
  const [popOrigen, setPopOrigen] = useState(null) // {nombre}
  const [popProds, setPopProds] = useState([])
  const [popIdx, setPopIdx] = useState(0)
  const [popLoad, setPopLoad] = useState(false)

  const abrirOrigen = async (row) => {
    if (!row.origen_id || !row.num_productos) return
    setPopOrigen({ nombre: row.origen }); setPopIdx(0); setPopProds([]); setPopLoad(true)
    const { data } = await supabase.from('productos')
      .select('id,codigo,nombre,precio_costo,precio_venta,cantidad,color,foto_url,atributos,categoria_id,origen_id,linea_id,seccion_id,empresa_id')
      .eq('origen_id', row.origen_id).eq('activo', true).order('codigo')
    setPopProds(data || []); setPopLoad(false)
  }
  const cerrarPop = () => { setPopOrigen(null); setPopProds([]); setPopIdx(0) }
  const popProd = popProds[popIdx]
  const editarEnCatalogo = () => {
    if (!popProd) return
    if (setRetorno) setRetorno('reporteOrigenes')
    setEditP(popProd); cerrarPop(); setScr('registrar')
  }

  // ── Editar el ORIGEN (desde el nombre) ──
  const editarOrigen = (row) => {
    const o = (oris || []).find(x => x.id === row.origen_id)
    if (!o) { notify('Origen no encontrado en esta línea', 'error'); return }
    if (setRetorno) setRetorno('reporteOrigenes')
    if (setOrigenEdit) setOrigenEdit(o)
    setScr('origenes')
  }

  // ── Visor de VENDIDOS de un origen ──
  const [popVen, setPopVen] = useState(null) // {nombre}
  const [popVenList, setPopVenList] = useState([])
  const [popVenIdx, setPopVenIdx] = useState(0)
  const [popVenLoad, setPopVenLoad] = useState(false)
  const abrirVendidos = async (row) => {
    if (!row.origen_id || !row.und_vendidas) return
    setPopVen({ nombre: row.origen }); setPopVenIdx(0); setPopVenList([]); setPopVenLoad(true)
    // productos de ese origen
    const { data: prodsO } = await supabase.from('productos').select('id,codigo,nombre,foto_url').eq('origen_id', row.origen_id)
    const ids = (prodsO || []).map(p => p.id)
    const mapP = {}; (prodsO || []).forEach(p => { mapP[p.id] = p })
    if (!ids.length) { setPopVenLoad(false); return }
    const { data: vtas } = await supabase.from('ventas')
      .select('producto_id,cantidad,precio_venta_real,metodo_pago,created_at')
      .eq('empresa_id', eid).in('producto_id', ids).order('created_at', { ascending: false })
    const lista = (vtas || []).map(v => ({ ...v, prod: mapP[v.producto_id] || {} }))
    setPopVenList(lista); setPopVenLoad(false)
  }
  const cerrarVen = () => { setPopVen(null); setPopVenList([]); setPopVenIdx(0) }
  const venItem = popVenList[popVenIdx]

  const tot = visibles.reduce((a, r) => ({
    und_declaradas: a.und_declaradas + r.und_declaradas,
    und_registradas: a.und_registradas + r.und_registradas,
    inv_declarada: a.inv_declarada + r.inv_declarada,
    und_vendidas: a.und_vendidas + r.und_vendidas,
    vendido_soles: a.vendido_soles + r.vendido_soles,
    costo_recuperado: a.costo_recuperado + r.costo_recuperado
  }), { und_declaradas: 0, und_registradas: 0, inv_declarada: 0, und_vendidas: 0, vendido_soles: 0, costo_recuperado: 0 })

  const exportar = () => {
    const aoa = [['Origen', 'Proveedor', 'Und declaradas', 'Und registradas', 'Costo unit', 'Inversion declarada', 'Und vendidas', 'Vendido S/', 'Costo recuperado']]
    visibles.forEach(r => aoa.push([r.origen, r.proveedor, r.und_declaradas, r.und_registradas, r.costo_unit, r.inv_declarada, r.und_vendidas, r.vendido_soles, r.costo_recuperado]))
    aoa.push(['TOTAL', '', tot.und_declaradas, tot.und_registradas, '', tot.inv_declarada, tot.und_vendidas, tot.vendido_soles, tot.costo_recuperado])
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Origenes')
    XLSX.writeFile(wb, 'reporte_origenes_' + new Date().toISOString().split('T')[0] + '.xlsx')
    notify('Exportado')
  }

  const tdS = { padding: '6px 8px', fontSize: 11, borderBottom: '1px solid ' + G.border, whiteSpace: 'nowrap' }
  const thS = { padding: '6px 8px', fontSize: 10, fontWeight: 700, textAlign: 'left', color: G.muted, borderBottom: '2px solid ' + G.border, whiteSpace: 'nowrap' }
  const num = { textAlign: 'right' }

  return (
    <div>
      <Hdr tit={tit} sec="📈 Reporte de Orígenes" onBack={() => setScr('submenu')} />
      <div style={{ padding: 16 }}>
        <button onClick={cargar} disabled={loading} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>{loading ? '⏳ Cargando...' : '🔄 Refrescar'}</button>
        {/* Filtro de proveedores */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: G.muted, margin: '0 0 6px' }}>Filtrar por proveedor (ninguno = todos):</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {proveedores.map(pv => {
              const on = filtro.includes(pv.id)
              return (
                <button key={pv.id} onClick={() => toggleFiltro(pv.id)}
                  style={{ padding: '5px 12px', borderRadius: 16, border: '1px solid ' + (on ? G.gold : G.border), background: on ? G.gold : '#fff', color: on ? '#fff' : G.text, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {on ? '✓ ' : ''}{pv.nombre}
                </button>
              )
            })}
            {filtro.length > 0 && <button onClick={() => setFiltro([])} style={{ padding: '5px 12px', borderRadius: 16, border: '1px solid ' + G.border, background: '#fff', color: G.err, fontSize: 12, cursor: 'pointer' }}>Limpiar</button>}
          </div>
        </div>

        {/* Filtro por origen */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: G.muted, margin: '0 0 6px' }}>Filtrar por origen:</p>
          <select value={filtroOrigen} onChange={e => setFiltroOrigen(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 12, background: '#fff', color: G.text }}>
            <option value="">📋 Todos los orígenes</option>
            {origenesDisp.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <button onClick={exportar} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: G.ok, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>📥 Exportar Excel</button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: G.muted }}>Cargando...</div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 10, border: '1px solid ' + G.border }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={thS}>Origen</th>
                  <th style={thS}>Proveedor</th>
                  <th style={{ ...thS, ...num }}>Und decl.</th>
                  <th style={{ ...thS, ...num }}>Und reg.</th>
                  <th style={{ ...thS, ...num }}>Costo u.</th>
                  <th style={{ ...thS, ...num }}>Inv. decl.</th>
                  <th style={{ ...thS, ...num }}>Und vend.</th>
                  <th style={{ ...thS, ...num }}>Vendido S/</th>
                  <th style={{ ...thS, ...num }}>Costo rec.</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((r, i) => (
                  <tr key={i}>
                    <td style={tdS}><span onClick={() => editarOrigen(r)} style={{ color: G.gold, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>{r.origen}</span></td>
                    <td style={tdS}>{r.proveedor || '—'}</td>
                    <td style={{ ...tdS, ...num }}>{r.und_declaradas}</td>
                    <td style={{ ...tdS, ...num }}>{r.num_productos > 0
                      ? <span onClick={() => abrirOrigen(r)} style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>{r.und_registradas}</span>
                      : r.und_registradas}</td>
                    <td style={{ ...tdS, ...num }}>{r.costo_unit !== '' ? r.costo_unit : '—'}</td>
                    <td style={{ ...tdS, ...num }}>{r.inv_declarada.toFixed(1)}</td>
                    <td style={{ ...tdS, ...num }}>{r.und_vendidas > 0
                      ? <span onClick={() => abrirVendidos(r)} style={{ color: '#059669', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>{r.und_vendidas}</span>
                      : r.und_vendidas}</td>
                    <td style={{ ...tdS, ...num }}>{r.vendido_soles.toFixed(1)}</td>
                    <td style={{ ...tdS, ...num }}>{r.costo_recuperado.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: G.goldLt, fontWeight: 800 }}>
                  <td style={{ ...tdS, fontWeight: 800 }}>TOTAL</td>
                  <td style={tdS}></td>
                  <td style={{ ...tdS, ...num, fontWeight: 800 }}>{tot.und_declaradas}</td>
                  <td style={{ ...tdS, ...num, fontWeight: 800 }}>{tot.und_registradas}</td>
                  <td style={tdS}></td>
                  <td style={{ ...tdS, ...num, fontWeight: 800 }}>{tot.inv_declarada.toFixed(1)}</td>
                  <td style={{ ...tdS, ...num, fontWeight: 800 }}>{tot.und_vendidas}</td>
                  <td style={{ ...tdS, ...num, fontWeight: 800 }}>{tot.vendido_soles.toFixed(1)}</td>
                  <td style={{ ...tdS, ...num, fontWeight: 800 }}>{tot.costo_recuperado.toFixed(1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Popup: productos del origen */}
        {popOrigen && (
          <div onClick={cerrarPop} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ background: G.gold, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, margin: 0 }}>Origen</p>
                  <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>{popOrigen.nombre}</p>
                </div>
                <button onClick={cerrarPop} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>

              {popLoad ? (
                <div style={{ padding: 40, textAlign: 'center', color: G.muted }}>⏳ Cargando productos...</div>
              ) : !popProd ? (
                <div style={{ padding: 40, textAlign: 'center', color: G.muted }}>Sin productos</div>
              ) : (
                <div style={{ padding: 16 }}>
                  <p style={{ textAlign: 'center', fontSize: 12, color: G.muted, margin: '0 0 10px' }}>{popIdx + 1} / {popProds.length}</p>
                  {popProd.foto_url
                    ? <img src={popProd.foto_url} alt="" style={{ width: '100%', height: 340, objectFit: 'contain', borderRadius: 12, background: G.goldLt }} />
                    : <div style={{ width: '100%', height: 340, background: G.goldLt, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 48, opacity: 0.3 }}>📦</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 11, background: G.goldSf, color: G.goldDk, padding: '3px 8px', borderRadius: 5, fontWeight: 700 }}>{popProd.codigo}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: G.gold }}>S/{popProd.precio_venta}</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: '6px 0 2px', color: G.text }}>{popProd.nombre}</p>
                  <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>
                    Costo: S/{popProd.precio_costo ?? '—'} • Stock: {popProd.cantidad}
                    {popProd.color ? ' • ' + popProd.color : ''}
                    {popProd.atributos?.talla ? ' • T:' + popProd.atributos.talla : ''}
                  </p>

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => setPopIdx(i => Math.max(0, i - 1))} disabled={popIdx === 0}
                      style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: popIdx === 0 ? '#f5f5f5' : '#fff', color: popIdx === 0 ? '#bbb' : G.text, fontSize: 13, fontWeight: 700, cursor: popIdx === 0 ? 'default' : 'pointer' }}>‹ Anterior</button>
                    <button onClick={() => setPopIdx(i => Math.min(popProds.length - 1, i + 1))} disabled={popIdx >= popProds.length - 1}
                      style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: popIdx >= popProds.length - 1 ? '#f5f5f5' : '#fff', color: popIdx >= popProds.length - 1 ? '#bbb' : G.text, fontSize: 13, fontWeight: 700, cursor: popIdx >= popProds.length - 1 ? 'default' : 'pointer' }}>Siguiente ›</button>
                  </div>
                  <button onClick={editarEnCatalogo} style={{ width: '100%', padding: 13, marginTop: 8, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✏️ Editar en catálogo</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Popup: vendidos del origen */}
        {popVen && (
          <div onClick={cerrarVen} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, maxHeight: '92vh', overflow: 'auto' }}>
              <div style={{ background: '#059669', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, margin: 0 }}>Vendidos de</p>
                  <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>{popVen.nombre}</p>
                </div>
                <button onClick={cerrarVen} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
              {popVenLoad ? (
                <div style={{ padding: 40, textAlign: 'center', color: G.muted }}>⏳ Cargando ventas...</div>
              ) : !venItem ? (
                <div style={{ padding: 40, textAlign: 'center', color: G.muted }}>Sin ventas</div>
              ) : (
                <div style={{ padding: 16 }}>
                  <p style={{ textAlign: 'center', fontSize: 12, color: G.muted, margin: '0 0 10px' }}>{popVenIdx + 1} / {popVenList.length}</p>
                  {venItem.prod?.foto_url
                    ? <img src={venItem.prod.foto_url} alt="" style={{ width: '100%', height: 300, objectFit: 'contain', borderRadius: 12, background: G.goldLt }} />
                    : <div style={{ width: '100%', height: 300, background: G.goldLt, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 48, opacity: 0.3 }}>📦</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 11, background: G.goldSf, color: G.goldDk, padding: '3px 8px', borderRadius: 5, fontWeight: 700 }}>{venItem.prod?.codigo || ''}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#059669' }}>S/{venItem.precio_venta_real}</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: '6px 0 2px', color: G.text }}>{venItem.prod?.nombre || ''}</p>
                  <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>
                    Cantidad: {venItem.cantidad}{venItem.metodo_pago ? ' • ' + venItem.metodo_pago : ''}
                    {venItem.created_at ? ' • ' + new Date(venItem.created_at).toLocaleDateString() : ''}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => setPopVenIdx(i => Math.max(0, i - 1))} disabled={popVenIdx === 0} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: popVenIdx === 0 ? '#f5f5f5' : '#fff', color: popVenIdx === 0 ? '#bbb' : G.text, fontSize: 13, fontWeight: 700, cursor: popVenIdx === 0 ? 'default' : 'pointer' }}>‹ Anterior</button>
                    <button onClick={() => setPopVenIdx(i => Math.min(popVenList.length - 1, i + 1))} disabled={popVenIdx >= popVenList.length - 1} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: popVenIdx >= popVenList.length - 1 ? '#f5f5f5' : '#fff', color: popVenIdx >= popVenList.length - 1 ? '#bbb' : G.text, fontSize: 13, fontWeight: 700, cursor: popVenIdx >= popVenList.length - 1 ? 'default' : 'pointer' }}>Siguiente ›</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
