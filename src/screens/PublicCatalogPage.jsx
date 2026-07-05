import { useState, useEffect } from 'react'
import { supabase, comprimirImagen, subirFoto } from '../supabase'

/* ─── MODAL COMPRA ─── */
function CompraModal({ prod, config, onClose }) {
  const C = config?.color_primario || '#C5A55A'
  const [form, setForm] = useState({ nombre: '', telefono: '', nota: '' })
  const [fotoComp, setFotoComp] = useState(null)
  const [fotoPrev, setFotoPrev] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const onFoto = e => {
    const f = e.target.files?.[0]; if (!f) return
    setFotoComp(f)
    const r = new FileReader(); r.onload = ev => setFotoPrev(ev.target.result); r.readAsDataURL(f)
  }

  const enviar = async () => {
    if (!form.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!fotoComp) { alert('Adjunta el comprobante de pago'); return }
    setEnviando(true)
    try {
      const blob = await comprimirImagen(fotoComp, 600)
      const url = await subirFoto(blob, 'pedido_' + Date.now())
      await supabase.from('pedidos').insert({
        empresa_id: config.empresa_id,
        producto_id: prod.id,
        codigo_producto: prod.codigo,
        nombre_producto: prod.nombre,
        precio_venta: prod.precio_venta,
        nombre_cliente: form.nombre.trim(),
        telefono_cliente: form.telefono || null,
        foto_comprobante: url,
        nota: form.nota || null,
        estado: 'pendiente'
      })
      setEnviado(true)
    } catch (e) { alert('Error al enviar: ' + e.message) }
    setEnviando(false)
  }

  const iS = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 10, background: '#fff' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 12px' }}>
      <div style={{ background: '#FFFDF7', borderRadius: 18, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ background: C, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>🛒 Realizar pedido</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          {enviado ? (
            <div style={{ textAlign: 'center', padding: '28px 16px' }}>
              <p style={{ fontSize: 56, margin: 0 }}>✅</p>
              <h3 style={{ color: C, fontSize: 20, fontWeight: 800, margin: '8px 0' }}>¡Pedido enviado!</h3>
              <p style={{ fontSize: 14, margin: '0 0 6px' }}>Hola <strong>{form.nombre}</strong>, recibimos tu pedido.</p>
              <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px' }}>Verificaremos tu pago y nos pondremos en contacto.</p>
              {config?.whatsapp && (
                <a href={`https://wa.me/51${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14, marginBottom: 10 }}>
                  💬 Contactar por WhatsApp
                </a>
              )}
              <button onClick={onClose} style={{ display: 'block', width: '100%', marginTop: 8, padding: 12, borderRadius: 10, border: '1px solid #ddd', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Seguir viendo productos
              </button>
            </div>
          ) : (
            <>
              {/* Producto */}
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '1px solid #eee' }}>
                {prod.foto_url && <img src={prod.foto_url} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />}
                <div style={{ padding: '10px 14px' }}>
                  <p style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>{prod.nombre}</p>
                  {prod.color && <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>{prod.color}</p>}
                  <div style={{ background: C, borderRadius: 8, padding: '8px 0', textAlign: 'center' }}>
                    <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: 0 }}>S/{prod.precio_venta}</p>
                  </div>
                </div>
              </div>

              {/* Instrucciones */}
              <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid #BFDBFE' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: '0 0 5px' }}>📱 Cómo pagar:</p>
                <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 3px' }}>1. Envía S/{prod.precio_venta} por Yape</p>
                {config?.whatsapp && <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 3px' }}>2. Número Yape: <strong>{config.whatsapp}</strong></p>}
                <p style={{ fontSize: 12, color: '#1E40AF', margin: 0 }}>3. Adjunta foto del comprobante abajo</p>
              </div>

              <input value={form.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Tu nombre *" style={iS} />
              <input value={form.telefono} onChange={e => s('telefono', e.target.value)} placeholder="Tu teléfono (opcional)" style={iS} type="tel" />
              <textarea value={form.nota} onChange={e => s('nota', e.target.value)} placeholder="Nota (talla, color, etc.)" rows={2} style={{ ...iS, resize: 'vertical' }} />

              <p style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 8px' }}>📸 Foto del comprobante *</p>
              {fotoPrev ? (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <img src={fotoPrev} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 160, objectFit: 'cover' }} />
                  <button onClick={() => { setFotoComp(null); setFotoPrev(null) }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
                    Cambiar
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', padding: 18, borderRadius: 10, border: `2px dashed ${C}`, background: '#fff', textAlign: 'center', cursor: 'pointer', marginBottom: 10 }}>
                  <span style={{ fontSize: 26, display: 'block', marginBottom: 4 }}>📷</span>
                  <span style={{ fontSize: 13, color: C, fontWeight: 600 }}>Toca para adjuntar comprobante</span>
                  <input type="file" accept="image/*" onChange={onFoto} style={{ display: 'none' }} />
                </label>
              )}

              <button onClick={enviar} disabled={enviando || !form.nombre.trim() || !fotoComp}
                style={{ width: '100%', padding: 15, borderRadius: 12, border: 'none', background: (form.nombre.trim() && fotoComp) ? C : '#ccc', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
                {enviando ? '⏳ Enviando...' : '✅ Enviar pedido'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── PÁGINA PÚBLICA PRINCIPAL ─── */
export default function PublicCatalogPage({ onIntranet }) {
  const [config, setConfig] = useState(null)
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [prodSel, setProdSel] = useState(null)

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

  return (
    <div style={{ minHeight: '100vh', background: '#FFFDF7', fontFamily: 'system-ui, sans-serif' }}>
      {/* Modal compra */}
      {prodSel && <CompraModal prod={prodSel} config={config} onClose={() => setProdSel(null)} />}

      {/* ── HEADER / BANNER ── */}
      <div style={{ background: C, position: 'relative', overflow: 'hidden' }}>
        {/* Manchas decorativas */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: C2, opacity: 0.4 }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: '#E05A5A', opacity: 0.35 }} />
        <div style={{ position: 'absolute', top: 10, left: '40%', width: 60, height: 60, borderRadius: '50%', background: '#F5F0E8', opacity: 0.2 }} />

        {/* Banner imagen si existe */}
        {config?.banner_url && (
          <img src={config.banner_url} alt="banner"
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block', opacity: 0.85 }} />
        )}

        {/* Info tienda */}
        <div style={{ padding: config?.banner_url ? '16px 20px' : '36px 20px 28px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {/* Huellas decorativas */}
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

          {/* WhatsApp */}
          {config?.whatsapp && (
            <a href={config.whatsapp_link ? `https://${config.whatsapp_link}` : `https://wa.me/51${config.whatsapp.replace(/\D/g, '')}`}
              target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: 30, fontWeight: 700, textDecoration: 'none', fontSize: 15, boxShadow: '0 3px 12px rgba(0,0,0,0.2)' }}>
              💬 {config.whatsapp}
            </a>
          )}
        </div>
      </div>

      {/* ── BUSCADOR ── */}
      <div style={{ background: C2, padding: '12px 16px' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar producto..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 30, border: 'none', fontSize: 14, boxSizing: 'border-box', background: 'rgba(255,255,255,0.95)' }}
        />
      </div>

      {/* ── GRID PRODUCTOS ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '12px 12px 40px' }}>
        <p style={{ fontSize: 12, color: '#999', margin: '0 0 10px 4px' }}>{fl.length} productos disponibles</p>
        {fl.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: 48 }}>😿</p>
            <p style={{ color: '#888', fontSize: 15 }}>No hay productos disponibles</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
            {fl.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 3px 12px rgba(0,0,0,0.09)', border: '1px solid #f0f0f0' }}>
                {/* Foto */}
                <div style={{ position: 'relative', paddingTop: '100%', background: '#FFF8EE' }}>
                  {p.foto_url
                    ? <img src={p.foto_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 40, opacity: 0.3 }}>🐱</span></div>
                  }
                </div>
                {/* Info */}
                <div style={{ padding: '10px 10px 12px' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', color: '#222', lineHeight: 1.3 }}>{p.nombre}</p>
                  {p.color && <p style={{ fontSize: 10, color: '#999', margin: '0 0 6px' }}>{p.color}</p>}
                  <p style={{ fontSize: 17, fontWeight: 900, color: C, margin: '0 0 8px' }}>S/{p.precio_venta}</p>
                  <button onClick={() => setProdSel(p)}
                    style={{ width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', background: C, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    🛒 Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#1A1A1A', padding: '20px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 20, margin: '0 0 8px' }}>🐾</p>
        <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{config?.nombre_tienda || 'El Miau'}</p>
        {config?.direccion && <p style={{ color: '#999', fontSize: 12, margin: '0 0 4px' }}>📍 {config.direccion}</p>}
        {config?.email && <p style={{ color: '#999', fontSize: 12, margin: '0 0 12px' }}>✉️ {config.email}</p>}

        {/* Redes sociales */}
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

        {/* Botón intranet */}
        <button onClick={onIntranet}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#888', padding: '8px 20px', borderRadius: 20, fontSize: 11, cursor: 'pointer' }}>
          🔐 Acceso Intranet
        </button>

        <p style={{ color: '#444', fontSize: 10, margin: '12px 0 0' }}>Powered by <span style={{ color: C }}>IA Procesos</span></p>
      </div>
    </div>
  )
}
