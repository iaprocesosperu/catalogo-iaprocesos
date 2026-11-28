import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// ═══════════════════════════════════════════════════════════════
// PLANTILLA PERSONALIZADO 1 — "La Casita del Ahorro" (diseño rosa)
// 100% dinámico: lee subdominios (config), lineas y productos.
// Soporta mostrar TODAS las líneas de la empresa (mostrar_todas_lineas).
// ═══════════════════════════════════════════════════════════════

// Íconos SVG por línea (nítidos a cualquier tamaño, sin pedir imágenes)
const ICONOS = {
  ropa: '👚', 'ropa importada': '👗', 'ropa de segundo uso': '♻️', 'segunda mano': '♻️',
  hogar: '🏠', jardineria: '🌱', 'jardinería': '🌱', mascotas: '🐾',
  velas: '🕯️', 'velas y rosarios': '🕯️', rosarios: '📿',
  libros: '📖', 'libros en inglés': '📖', 'libros de inglés': '📖',
  default: '🛍️'
}
const iconoDe = (nombre) => {
  const k = (nombre || '').toLowerCase().trim()
  return ICONOS[k] || ICONOS.default
}

export default function PlantillaP1({ config, onIntranet }) {
  const [lineas, setLineas] = useState([])
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(true)
  const [lineaSel, setLineaSel] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([])
  const [verCarrito, setVerCarrito] = useState(false)

  const C = config?.color_primario || '#EC1C7D'
  const C2 = config?.color_secundario || '#F0C040'
  const todas = !!config?.mostrar_todas_lineas

  useEffect(() => {
    const cargar = async () => {
      // Líneas de la empresa
      const { data: lns } = await supabase.from('lineas').select('*')
        .eq('empresa_id', config.empresa_id).eq('activo', true).order('nombre')
      setLineas(lns || [])
      // Productos: todas las líneas, o solo la ligada al subdominio
      let q = supabase.from('productos').select('*,categorias(nombre),lineas(nombre)')
        .eq('empresa_id', config.empresa_id).eq('activo', true)
        .eq('oculto', false).gt('cantidad', 0).order('created_at', { ascending: false })
      if (!todas && config.linea_id) q = q.eq('linea_id', config.linea_id)
      const { data: ps } = await q
      setProds(ps || [])
      setLoading(false)
    }
    cargar()
  }, [])

  useEffect(() => {
    if (config?.nombre_tienda) document.title = `${config.nombre_tienda} — ${config.slogan || 'Tienda'}`
  }, [config])

  const waNum = (config?.whatsapp || '').replace(/\D/g, '')
  const waLink = (texto) => `https://wa.me/51${waNum}?text=${encodeURIComponent(texto)}`

  const agregar = (p) => {
    setCarrito(c => {
      const ex = c.find(i => i.id === p.id)
      if (ex) return c.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...c, { id: p.id, nombre: p.nombre, codigo: p.codigo, precio_venta: p.precio_venta, foto_url: p.foto_url, cantidad: 1 }]
    })
  }
  const quitar = (id) => setCarrito(c => c.filter(i => i.id !== id))
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)
  const totalPrecio = carrito.reduce((s, i) => s + (i.precio_venta || 0) * i.cantidad, 0)

  // Filtrado por línea + búsqueda
  const fl = prods.filter(p => {
    if (lineaSel !== 'todas' && String(p.linea_id) !== String(lineaSel)) return false
    if (busqueda) {
      const t = busqueda.toLowerCase()
      if (!(p.nombre?.toLowerCase().includes(t) || p.codigo?.toLowerCase().includes(t))) return false
    }
    return true
  })
  const destacados = prods.slice(0, 4)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff0f6' }}>
      <p style={{ color: C, fontSize: 16, fontWeight: 700 }}>Cargando tienda…</p>
    </div>
  )

  const Card = (p) => (
    <div key={p.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,.08)', border: '1px solid #ffe0ee', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', aspectRatio: '1/1', background: '#fff6fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {p.foto_url ? <img src={p.foto_url} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 48, opacity: .3 }}>📦</span>}
        <span style={{ position: 'absolute', top: 8, right: 8, background: '#fff', color: '#888', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>#{p.codigo}</span>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#333', lineHeight: 1.2 }}>{p.nombre}</p>
        {p.lineas?.nombre && <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>{p.lineas.nombre}</p>}
        <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 900, color: C }}>S/ {(p.precio_venta || 0).toFixed(2)}</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
          <button onClick={() => agregar(p)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', background: C2, color: '#7a5a00', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>🛒 Agregar</button>
          <a href={waLink(`Hola! Me interesa el producto ${p.codigo} - ${p.nombre} (S/ ${(p.precio_venta || 0).toFixed(2)})`)} target="_blank" rel="noreferrer"
            style={{ padding: '9px 12px', borderRadius: 10, background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>📲</a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui,Segoe UI,sans-serif' }}>
      {/* Barra superior */}
      <div style={{ background: C, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {config?.logo_url && <img src={config.logo_url} alt="logo" style={{ height: 40, borderRadius: 8 }} />}
          <div>
            <p style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 900 }}>{config?.nombre_tienda}</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.85)', fontSize: 11 }}>{config?.slogan}</p>
          </div>
        </div>
        <button onClick={() => setVerCarrito(true)} style={{ background: '#fff', border: 'none', borderRadius: 24, padding: '8px 16px', fontWeight: 800, color: C, cursor: 'pointer', fontSize: 14 }}>
          🛒 {totalItems > 0 ? totalItems : ''}
        </button>
      </div>

      {/* Menú de líneas (chips) */}
      {todas && lineas.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px', background: '#fff6fb', borderBottom: '1px solid #ffe0ee' }}>
          <button onClick={() => setLineaSel('todas')} style={chip(lineaSel === 'todas', C)}>Todos</button>
          {lineas.map(l => (
            <button key={l.id} onClick={() => setLineaSel(l.id)} style={chip(String(lineaSel) === String(l.id), C)}>
              {iconoDe(l.nombre)} {l.nombre}
            </button>
          ))}
        </div>
      )}

      {/* HERO */}
      <div style={{ background: `linear-gradient(135deg, ${C} 0%, ${C}dd 100%)`, padding: '36px 16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: config?.hero_url ? '1fr 1fr' : '1fr', gap: 28, alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 'clamp(28px,5vw,46px)', fontWeight: 900, margin: 0, lineHeight: 1.1, textShadow: '0 3px 12px rgba(0,0,0,.25)' }}>
              {config?.slogan || 'Variedad, calidad y buenos precios'}
            </h1>
            <p style={{ color: C2, fontSize: 'clamp(16px,2.5vw,22px)', fontWeight: 800, margin: '14px 0 20px' }}>Desde S/ 15 · Ropa importada</p>
            <a href={waLink(`Hola ${config?.nombre_tienda || ''}! Quiero más información`)} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', color: C, padding: '14px 28px', borderRadius: 50, fontWeight: 900, fontSize: 16, textDecoration: 'none', boxShadow: '0 6px 18px rgba(0,0,0,.2)' }}>
              📲 {config?.whatsapp || 'Contáctanos'}
            </a>
          </div>
          {config?.hero_url && (
            <div style={{ borderRadius: 24, overflow: 'hidden', minHeight: 240, background: '#fff6e8' }}>
              <img src={config.hero_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 240 }} />
            </div>
          )}
        </div>
      </div>

      {/* Franja de beneficios */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', padding: '16px', background: '#fffaf0', borderBottom: '1px solid #f3e4c0' }}>
        {[['🚚', 'Tienda física en Caraz'], ['🏷️', 'Precios accesibles'], ['🤝', 'Se reciben consignaciones']].map(([ic, tx]) => (
          <div key={tx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#8a6d1a' }}>
            <span style={{ fontSize: 22 }}>{ic}</span>{tx}
          </div>
        ))}
      </div>

      {/* Compra por líneas (íconos) */}
      {todas && lineas.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px' }}>
          <h2 style={{ textAlign: 'center', color: '#333', fontSize: 24, fontWeight: 900, margin: '0 0 20px' }}>Compra por categoría</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14 }}>
            {lineas.map(l => (
              <button key={l.id} onClick={() => { setLineaSel(l.id); window.scrollTo({ top: 9999, behavior: 'smooth' }) }}
                style={{ background: '#fff6fb', border: '1px solid #ffe0ee', borderRadius: 16, padding: '20px 10px', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 40 }}>{iconoDe(l.nombre)}</div>
                <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 800, color: C }}>{l.nombre}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Destacados */}
      {destacados.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 16px 28px' }}>
          <h2 style={{ color: '#333', fontSize: 22, fontWeight: 900, margin: '0 0 16px' }}>✨ Productos destacados</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>
            {destacados.map(Card)}
          </div>
        </div>
      )}

      {/* Todos los productos */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '10px 16px 40px' }}>
        <h2 style={{ color: '#333', fontSize: 22, fontWeight: 900, margin: '0 0 12px' }}>Todos nuestros productos</h2>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar por nombre o código…"
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #ffd0e6', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }} />
        {fl.length === 0 ? <p style={{ textAlign: 'center', color: '#aaa', padding: 30 }}>No hay productos con ese filtro</p>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 14 }}>{fl.map(Card)}</div>}
      </div>

      {/* Footer */}
      <div style={{ background: C, padding: '24px 16px', textAlign: 'center', color: '#fff' }}>
        {config?.logo_url && <img src={config.logo_url} alt="logo" style={{ height: 48, borderRadius: 10, marginBottom: 10 }} />}
        <p style={{ margin: '0 0 6px', fontWeight: 900, fontSize: 18 }}>{config?.nombre_tienda}</p>
        <p style={{ margin: '0 0 10px', fontSize: 13, opacity: .9 }}>{config?.direccion}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={waLink('Hola!')} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: 50, fontWeight: 800, textDecoration: 'none' }}>📲 {config?.whatsapp}</a>
          {config?.facebook_url && <a href={config.facebook_url} target="_blank" rel="noreferrer" style={{ background: '#1877F2', color: '#fff', padding: '10px 20px', borderRadius: 50, fontWeight: 800, textDecoration: 'none' }}>Facebook</a>}
        </div>
        {onIntranet && <p onClick={onIntranet} style={{ marginTop: 16, fontSize: 11, opacity: .6, cursor: 'pointer' }}>· intranet ·</p>}
      </div>

      {/* Carrito lateral */}
      {verCarrito && (
        <div onClick={() => setVerCarrito(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, background: '#fff', height: '100%', padding: 20, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: C, fontWeight: 900 }}>🛒 Tu pedido</h3>
              <button onClick={() => setVerCarrito(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            {carrito.length === 0 ? <p style={{ color: '#aaa', textAlign: 'center', padding: 30 }}>Carrito vacío</p> : (
              <>
                {carrito.map(i => (
                  <div key={i.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{i.nombre}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#888' }}>#{i.codigo} · {i.cantidad} × S/ {(i.precio_venta || 0).toFixed(2)}</p>
                    </div>
                    <button onClick={() => quitar(i.id)} style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
                <p style={{ textAlign: 'right', fontSize: 20, fontWeight: 900, color: C, margin: '16px 0' }}>Total: S/ {totalPrecio.toFixed(2)}</p>
                <a href={waLink('Hola! Quiero pedir:\n' + carrito.map(i => `• ${i.cantidad}x ${i.codigo} ${i.nombre}`).join('\n') + `\n\nTotal: S/ ${totalPrecio.toFixed(2)}`)}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'block', textAlign: 'center', background: '#25D366', color: '#fff', padding: 14, borderRadius: 12, fontWeight: 900, textDecoration: 'none' }}>
                  📲 Enviar pedido por WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const chip = (activo, C) => ({
  padding: '8px 16px', borderRadius: 24, border: '1px solid ' + (activo ? C : '#ffd0e6'),
  background: activo ? C : '#fff', color: activo ? '#fff' : '#888',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
})
