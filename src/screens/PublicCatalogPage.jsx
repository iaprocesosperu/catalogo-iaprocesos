import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import CarritoPage from './CarritoPage'

export default function PublicCatalogPage({ onIntranet }) {
  const [config, setConfig] = useState(null)
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([]) // [{ ...prod, cantidad }]
  const [verCarrito, setVerCarrito] = useState(false)
  const [cantModal, setCantModal] = useState(null) // prod seleccionado para cantidad

  useEffect(() => {
    const cargar = async () => {
      const hostname = window.location.hostname
      const sub = hostname.split('.')[0]
      const { data: cfg, error: cfgErr } = await supabase
        .from('subdominios')
        .select('*,empresas(*),lineas(*)')
        .eq('subdominio', sub)
        .eq('activo', true)
        .single()
      if (cfgErr || !cfg) { setError('Catálogo no disponible'); setLoading(false); return }
      setConfig(cfg)
      const { data: ps } = await supabase
        .from('productos')
        .select('*,categorias(nombre)')
        .eq('empresa_id', cfg.empresa_id)
        .eq('linea_id', cfg.linea_id)
        .eq('activo', true)
        .gt('cantidad', 0)
        .order('created_at', { ascending: false })
      setProds(ps || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const C = config?.color_primario || '#C5A55A'
  const C2 = config?.color_secundario || '#2D7D7D'

  const fl = prods.filter(p =>
    !busqueda ||
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.color?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalCarrito = carrito.reduce((s, i) => s + i.cantidad, 0)

  const agregarAlCarrito = (prod, cant) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === prod.id)
      if (existe) return prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + cant } : i)
      return [...prev, { ...prod, cantidad: cant }]
    })
    setCantModal(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFDF7' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 48, margin: 0 }}>🐾</p>
        <p style={{ color: C, fontSize: 15, fontWeight: 700 }}>Cargando catálogo...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 48 }}>😿</p>
      <p style={{ fontSize: 18, fontWeight: 700 }}>Catálogo no disponible</p>
    </div>
  )

  if (verCarrito) return (
    <CarritoPage
      carrito={carrito}
      config={config}
      onVolver={() => setVerCarrito(false)}
      onPedidoEnviado={() => { setCarrito([]); setVerCarrito(false) }}
    />
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFFDF7', fontFamily: 'system-ui, sans-serif' }}>

      {/* Modal cantidad */}
      {cantModal && (
        <CantidadModal
          prod={cantModal}
          config={config}
          C={C}
          onAgregar={(cant) => agregarAlCarrito(cantModal, cant)}
          onClose={() => setCantModal(null)}
        />
      )}

      {/* Carrito flotante */}
      {totalCarrito > 0 && (
        <button onClick={() => setVerCarrito(true)}
          style={{ position: 'fixed', bottom: 20, right: 16, zIndex: 200, background: C, border: 'none', borderRadius: 30, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', color: '#fff' }}>
          <span style={{ fontSize: 20 }}>🛒</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 11, margin: 0, opacity: 0.85 }}>{totalCarrito} producto{totalCarrito > 1 ? 's' : ''}</p>
            <p style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>S/{carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0).toFixed(2)}</p>
          </div>
          <span style={{ fontSize: 16 }}>→</span>
        </button>
      )}

      {/* HEADER */}
      <div style={{ background: C, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: C2, opacity: 0.4 }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: '#E05A5A', opacity: 0.35 }} />

        {config?.banner_url && (
          <img src={config.banner_url} alt="banner"
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block', opacity: 0.85 }} />
        )}

        <div style={{ padding: config?.banner_url ? '16px 20px' : '36px 20px 28px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 20, opacity: 0.5, marginBottom: 8, letterSpacing: 8 }}>🐾 🐾 🐾</div>
          {config?.logo_url
            ? <img src={config.logo_url} alt="logo" style={{ height: 70, objectFit: 'contain', marginBottom: 8 }} />
            : (
              <>
                <h1 style={{ color: '#fff', fontSize: 42, fontWeight: 900, margin: '0 0 2px', textShadow: '0 2px 8px rgba(0,0,0,0.2)', letterSpacing: -1 }}>
                  {config?.nombre_tienda || config?.lineas?.nombre || 'Catálogo'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 700, letterSpacing: 3, margin: '0 0 12px', textTransform: 'uppercase' }}>CAT SHOP</p>
              </>
            )
          }
          {config?.slogan && (
            <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: 14, margin: '0 0 16px', fontWeight: 500 }}>
              🚚 {config.slogan}
            </p>
          )}
          {config?.whatsapp && (
            <a href={config.whatsapp_link ? `https://${config.whatsapp_link}` : `https://wa.me/51${config.whatsapp.replace(/\D/g, '')}`}
              target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: 30, fontWeight: 700, textDecoration: 'none', fontSize: 15, boxShadow: '0 3px 12px rgba(0,0,0,0.2)' }}>
              💬 {config.whatsapp}
            </a>
          )}
        </div>
      </div>

      {/* BUSCADOR */}
      <div style={{ background: C2, padding: '12px 16px' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar producto..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 30, border: 'none', fontSize: 14, boxSizing: 'border-box', background: 'rgba(255,255,255,0.95)' }}
        />
      </div>

      {/* GRID PRODUCTOS */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '12px 12px 100px' }}>
        <p style={{ fontSize: 12, color: '#999', margin: '0 0 10px 4px' }}>{fl.length} productos disponibles</p>
        {fl.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: 48 }}>😿</p>
            <p style={{ color: '#888', fontSize: 15 }}>No hay productos disponibles</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
            {fl.map(p => {
              const enCarrito = carrito.find(i => i.id === p.id)
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 3px 12px rgba(0,0,0,0.09)', border: enCarrito ? `2px solid ${C}` : '1px solid #f0f0f0' }}>
                  <div style={{ position: 'relative', paddingTop: '100%', background: '#FFF8EE' }}>
                    {p.foto_url
                      ? <img src={p.foto_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 40, opacity: 0.3 }}>🐱</span></div>
                    }
                    {enCarrito && (
                      <div style={{ position: 'absolute', top: 6, right: 6, background: C, color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        ×{enCarrito.cantidad}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 10px 12px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', color: '#222', lineHeight: 1.3 }}>{p.nombre}</p>
                    {p.color && <p style={{ fontSize: 10, color: '#999', margin: '0 0 6px' }}>{p.color}</p>}
                    <p style={{ fontSize: 17, fontWeight: 900, color: C, margin: '0 0 8px' }}>S/{p.precio_venta}</p>
                    <button onClick={() => setCantModal(p)}
                      style={{ width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', background: C, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {enCarrito ? '✓ Agregar más' : '🛒 Agregar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ background: '#1A1A1A', padding: '20px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 20, margin: '0 0 8px' }}>🐾</p>
        <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{config?.nombre_tienda || 'El Miau'}</p>
        {config?.direccion && <p style={{ color: '#999', fontSize: 12, margin: '0 0 4px' }}>📍 {config.direccion}</p>}
        {config?.email && <p style={{ color: '#999', fontSize: 12, margin: '0 0 12px' }}>✉️ {config.email}</p>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          {config?.whatsapp && (
            <a href={`https://wa.me/51${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
              style={{ background: '#25D366', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              💬 WhatsApp
            </a>
          )}
          {config?.facebook_url && (
            <a href={config.facebook_url} target="_blank" rel="noreferrer"
              style={{ background: '#1877F2', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              📘 Facebook
            </a>
          )}
        </div>
        <button onClick={onIntranet}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#888', padding: '8px 20px', borderRadius: 20, fontSize: 11, cursor: 'pointer' }}>
          🔐 Acceso Intranet
        </button>
        <p style={{ color: '#444', fontSize: 10, margin: '12px 0 0' }}>Powered by <span style={{ color: C }}>IA Procesos</span></p>
      </div>
    </div>
  )
}

/* ─── MODAL CANTIDAD ─── */
function CantidadModal({ prod, C, onAgregar, onClose }) {
  const [cant, setCant] = useState(1)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 480, padding: 20, boxShadow: '0 -4px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {prod.foto_url && <img src={prod.foto_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10 }} />}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, margin: '0 0 2px' }}>{prod.nombre}</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: C, margin: 0 }}>S/{prod.precio_venta}</p>
          </div>
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', margin: '0 0 12px' }}>¿Cuántos quieres?</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          <button onClick={() => setCant(Math.max(1, cant - 1))}
            style={{ width: 44, height: 44, borderRadius: 22, border: `2px solid ${C}`, background: 'transparent', color: C, fontSize: 22, cursor: 'pointer', fontWeight: 700 }}>−</button>
          <span style={{ fontSize: 32, fontWeight: 900, minWidth: 48, textAlign: 'center' }}>{cant}</span>
          <button onClick={() => setCant(cant + 1)}
            style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: C, color: '#fff', fontSize: 22, cursor: 'pointer', fontWeight: 700 }}>+</button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#666', margin: '0 0 16px' }}>
          Subtotal: <strong style={{ color: C }}>S/{(prod.precio_venta * cant).toFixed(2)}</strong>
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={() => onAgregar(cant)}
            style={{ flex: 2, padding: 13, borderRadius: 12, border: 'none', background: C, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            🛒 Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
