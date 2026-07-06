import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import CarritoPage from './CarritoPage'

const TESTIMONIOS = [
  { nombre: 'María R.', texto: 'Excelente arena, mi gato la adora. El delivery llegó rapidísimo.', estrellas: 5 },
  { nombre: 'Carlos M.', texto: 'Muy buena atención por WhatsApp. Siempre responden al instante.', estrellas: 5 },
  { nombre: 'Ana L.', texto: 'Los precios son muy accesibles y la calidad es increíble.', estrellas: 5 },
]

const BENEFICIOS = [
  { i: '🚚', t: 'Delivery gratis', s: 'A todo Marcona' },
  { i: '📱', t: 'Pago por Yape', s: 'Rápido y seguro' },
  { i: '💬', t: 'Atención directa', s: 'WhatsApp disponible' },
  { i: '⭐', t: 'Calidad garantizada', s: 'Productos seleccionados' },
]

export default function PublicCatalogPage({ onIntranet }) {
  const [config, setConfig] = useState(null)
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([])
  const [verCarrito, setVerCarrito] = useState(false)
  const [cantModal, setCantModal] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      const hostname = window.location.hostname
      const sub = hostname.split('.')[0]
      const { data: cfg, error: cfgErr } = await supabase
        .from('subdominios').select('*,empresas(*),lineas(*)')
        .eq('subdominio', sub).eq('activo', true).single()
      if (cfgErr || !cfg) { setError('Catálogo no disponible'); setLoading(false); return }
      setConfig(cfg)
      const { data: ps } = await supabase
        .from('productos').select('*,categorias(nombre)')
        .eq('empresa_id', cfg.empresa_id).eq('linea_id', cfg.linea_id)
        .eq('activo', true).gt('cantidad', 0).order('created_at', { ascending: false })
      setProds(ps || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const C = config?.color_primario || '#F5A623'
  const C2 = config?.color_secundario || '#2D7D7D'
  const totalCarrito = carrito.reduce((s, i) => s + i.cantidad, 0)
  const totalPrecio = carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0)

  const fl = prods.filter(p =>
    !busqueda || p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const agregarAlCarrito = (prod, cant) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === prod.id)
      if (existe) return prev.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + cant } : i)
      return [...prev, { ...prod, cantidad: cant }]
    })
    setCantModal(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFDF5' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 48, margin: 0 }}>🐾</p>
        <p style={{ color: C, fontSize: 15, fontWeight: 600 }}>Cargando catálogo...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', background: '#FFFDF5' }}>
      <p style={{ fontSize: 48 }}>😿</p>
      <p style={{ fontSize: 18, fontWeight: 600 }}>Catálogo no disponible</p>
    </div>
  )

  if (verCarrito) return (
    <CarritoPage carrito={carrito} config={config}
      onVolver={() => setVerCarrito(false)}
      onPedidoEnviado={() => { setCarrito([]); setVerCarrito(false) }} />
  )

  const waLink = config?.whatsapp_link
    ? `https://${config.whatsapp_link}`
    : config?.whatsapp ? `https://wa.me/51${config.whatsapp.replace(/\D/g, '')}` : null

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1A1A1A' }}>

      {/* Modal cantidad */}
      {cantModal && <CantidadModal prod={cantModal} C={C} onAgregar={cant => agregarAlCarrito(cantModal, cant)} onClose={() => setCantModal(null)} />}

      {/* Carrito flotante */}
      {totalCarrito > 0 && (
        <button onClick={() => setVerCarrito(true)} style={{
          position: 'fixed', bottom: 24, right: 20, zIndex: 200,
          background: C, border: 'none', borderRadius: 30, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)', color: '#fff'
        }}>
          <span style={{ fontSize: 20 }}>🛒</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 11, margin: 0, opacity: 0.85 }}>{totalCarrito} producto{totalCarrito > 1 ? 's' : ''}</p>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>S/{totalPrecio.toFixed(2)}</p>
          </div>
          <span style={{ fontSize: 16 }}>→</span>
        </button>
      )}

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, background: '#fff',
        borderBottom: '1px solid #F0F0F0', padding: '14px 5%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {config?.logo_url
            ? <img src={config.logo_url} alt="logo" style={{ height: 36, objectFit: 'contain' }} />
            : <><span style={{ fontSize: 22 }}>🐾</span><span style={{ fontSize: 17, fontWeight: 700, color: C }}>{config?.nombre_tienda || 'El Miau'}</span><span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>Cat Shop</span></>
          }
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#666' }}>
          <a href="#productos" style={{ textDecoration: 'none', color: '#666' }}>Productos</a>
          <a href="#contacto" style={{ textDecoration: 'none', color: '#666' }}>Contacto</a>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer"
              style={{ background: '#25D366', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              💬 WhatsApp
            </a>
          )}
          {totalCarrito > 0 && (
            <button onClick={() => setVerCarrito(true)} style={{ background: C, color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              🛒 {totalCarrito}
            </button>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: '#FFFDF5', padding: '72px 5% 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <span style={{ background: '#FFF3DC', color: '#B86B00', fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
            🚚 {config?.slogan || 'Delivery gratis a Marcona'}
          </span>
          <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.12, margin: '18px 0 16px', letterSpacing: -1 }}>
            Lo mejor para<br/><span style={{ color: C }}>tu gato,</span><br/>a tu puerta
          </h1>
          <p style={{ fontSize: 16, color: '#666', lineHeight: 1.7, margin: '0 0 32px', maxWidth: 420 }}>
            Arena, alimento y accesorios de calidad. Pide hoy y recíbelo en Marcona sin costo adicional.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#productos" style={{ background: C, color: '#fff', padding: '13px 28px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
              Ver productos
            </a>
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer"
                style={{ background: 'transparent', color: C, border: `2px solid ${C}`, padding: '11px 24px', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: 15 }}>
                💬 {config?.whatsapp || 'Contactar'}
              </a>
            )}
          </div>
        </div>
        <div style={{ borderRadius: 24, overflow: 'hidden', background: '#FFF3DC', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {config?.banner_url
            ? <img src={config.banner_url} alt="El Miau" style={{ width: '100%', height: 300, objectFit: 'cover' }} />
            : <span style={{ fontSize: 100 }}>🐱</span>
          }
        </div>
      </section>

      {/* BENEFICIOS */}
      <section style={{ borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 5%', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {BENEFICIOS.map((b, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '32px 16px', borderRight: i < 3 ? '1px solid #F0F0F0' : 'none' }}>
              <p style={{ fontSize: 30, margin: '0 0 10px' }}>{b.i}</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{b.t}</p>
              <p style={{ fontSize: 12, color: '#999', margin: 0 }}>{b.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTOS */}
      <section id="productos" style={{ padding: '64px 5%', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: -0.5 }}>Productos disponibles</h2>
            <p style={{ fontSize: 14, color: '#999', margin: 0 }}>{fl.length} productos</p>
          </div>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto..."
            style={{ padding: '10px 16px', borderRadius: 30, border: '1px solid #E0E0E0', fontSize: 14, width: 220, outline: 'none' }} />
        </div>

        {fl.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <p style={{ fontSize: 48 }}>😿</p>
            <p>No hay productos disponibles</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {fl.map(p => {
              const enCarrito = carrito.find(i => i.id === p.id)
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: 16, border: enCarrito ? `2px solid ${C}` : '1px solid #F0F0F0', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
                  <div style={{ position: 'relative', paddingTop: '100%', background: '#FFF8EE' }}>
                    {p.foto_url
                      ? <img src={p.foto_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, opacity: 0.3 }}>🐱</div>
                    }
                    {enCarrito && (
                      <div style={{ position: 'absolute', top: 10, right: 10, background: C, color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                        ×{enCarrito.cantidad}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '14px 14px 16px' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 3px', lineHeight: 1.3 }}>{p.nombre}</p>
                    {p.color && <p style={{ fontSize: 12, color: '#999', margin: '0 0 10px' }}>{p.color}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: C }}>S/{p.precio_venta}</span>
                      <button onClick={() => setCantModal(p)}
                        style={{ background: C, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        {enCarrito ? '+ Más' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* TESTIMONIOS */}
      <section style={{ background: '#FFFDF5', borderTop: '1px solid #F0F0F0', padding: '64px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', textAlign: 'center', letterSpacing: -0.5 }}>Lo que dicen nuestros clientes</h2>
          <p style={{ textAlign: 'center', color: '#999', fontSize: 14, margin: '0 0 40px' }}>Más de 100 familias confían en El Miau</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {TESTIMONIOS.map((t, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', padding: '20px 22px' }}>
                <p style={{ color: C, fontSize: 18, margin: '0 0 10px' }}>{'★'.repeat(t.estrellas)}</p>
                <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, margin: '0 0 14px' }}>"{t.texto}"</p>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{t.nombre}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" style={{ background: '#fff', borderTop: '1px solid #F0F0F0', padding: '64px 5%' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', letterSpacing: -0.5 }}>¿Tienes alguna consulta?</h2>
          <p style={{ color: '#999', fontSize: 14, margin: '0 0 32px' }}>Escríbenos directamente y te respondemos al instante</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer"
                style={{ background: '#25D366', color: '#fff', padding: '13px 28px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
                💬 Escribir por WhatsApp
              </a>
            )}
            {config?.facebook_url && (
              <a href={config.facebook_url} target="_blank" rel="noreferrer"
                style={{ background: '#1877F2', color: '#fff', padding: '13px 28px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
                📘 Facebook
              </a>
            )}
          </div>
          {config?.direccion && <p style={{ color: '#999', fontSize: 13, margin: '24px 0 0' }}>📍 {config.direccion}</p>}
          {config?.email && <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0' }}>✉️ {config.email}</p>}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#1A1A1A', padding: '32px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ color: C, fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{config?.nombre_tienda || 'El Miau'} 🐾</p>
            {config?.direccion && <p style={{ color: '#666', fontSize: 12, margin: 0 }}>📍 {config.direccion}</p>}
          </div>
          <button onClick={onIntranet} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#666', padding: '8px 18px', borderRadius: 20, fontSize: 11, cursor: 'pointer' }}>
            🔐 Acceso Intranet
          </button>
          <p style={{ color: '#333', fontSize: 11, width: '100%', margin: '8px 0 0' }}>
            Powered by <span style={{ color: C }}>IA Procesos</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

function CantidadModal({ prod, C, onAgregar, onClose }) {
  const [cant, setCant] = useState(1)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 -4px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          {prod.foto_url && <img src={prod.foto_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12 }} />}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 3px' }}>{prod.nombre}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: C, margin: 0 }}>S/{prod.precio_venta}</p>
          </div>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', margin: '0 0 14px', color: '#666' }}>¿Cuántos quieres?</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
          <button onClick={() => setCant(Math.max(1, cant - 1))}
            style={{ width: 46, height: 46, borderRadius: 23, border: `2px solid ${C}`, background: 'transparent', color: C, fontSize: 24, cursor: 'pointer', fontWeight: 700 }}>−</button>
          <span style={{ fontSize: 34, fontWeight: 800, minWidth: 48, textAlign: 'center' }}>{cant}</span>
          <button onClick={() => setCant(cant + 1)}
            style={{ width: 46, height: 46, borderRadius: 23, border: 'none', background: C, color: '#fff', fontSize: 24, cursor: 'pointer', fontWeight: 700 }}>+</button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#888', margin: '0 0 18px' }}>
          Subtotal: <strong style={{ color: C }}>S/{(prod.precio_venta * cant).toFixed(2)}</strong>
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid #E0E0E0', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#666' }}>Cancelar</button>
          <button onClick={() => onAgregar(cant)}
            style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: C, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            🛒 Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  )
}
