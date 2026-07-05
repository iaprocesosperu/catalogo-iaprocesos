import { useState, useEffect } from 'react'
import { supabase, comprimirImagen, subirFoto } from '../supabase'
import { G } from '../constants'

/* ─── VISTA DETALLE + COMPRA ─── */
function DetalleModal({ prod, emp, onClose }) {
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
        empresa_id: emp.id, producto_id: prod.id,
        codigo_producto: prod.codigo, nombre_producto: prod.nombre, precio_venta: prod.precio_venta,
        nombre_cliente: form.nombre.trim(), telefono_cliente: form.telefono || null,
        foto_comprobante: url, nota: form.nota || null, estado: 'pendiente'
      })
      setEnviado(true)
    } catch (e) { alert('Error al enviar: ' + e.message) }
    setEnviando(false)
  }

  const iS = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid ' + G.border, fontSize: 15, boxSizing: 'border-box', marginBottom: 12, background: '#fff' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 12px' }}>
      <div style={{ background: G.goldLt, borderRadius: 16, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ background: G.gold, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>🛒 Comprar producto</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: 16 }}>
          {enviado ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ fontSize: 64, margin: 0 }}>✅</p>
              <h3 style={{ color: G.gold, fontSize: 20, fontWeight: 800, margin: '8px 0' }}>¡Pedido enviado!</h3>
              <p style={{ color: G.text, fontSize: 14, margin: '0 0 16px' }}>Hola <strong>{form.nombre}</strong>, tu pedido fue recibido.</p>
              <p style={{ color: G.muted, fontSize: 13, margin: '0 0 20px' }}>La tienda verificará tu pago y se pondrá en contacto contigo.</p>
              {emp?.whatsapp && (
                <a href={'https://wa.me/51' + emp.whatsapp.replace(/\D/g, '')} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                  💬 Contactar por WhatsApp
                </a>
              )}
              <button onClick={onClose} style={{ display: 'block', width: '100%', marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', color: G.text, fontSize: 14, cursor: 'pointer' }}>
                Seguir viendo productos
              </button>
            </div>
          ) : (
            <>
              {/* Info producto */}
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
                {prod.foto_url && <img src={prod.foto_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />}
                <div style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 10, background: G.goldSf, color: G.goldDk, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{prod.codigo}</span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: '6px 0 4px', color: G.text }}>{prod.nombre}</h3>
                  {prod.color && <p style={{ fontSize: 12, color: G.muted, margin: '0 0 8px' }}>{prod.color}</p>}
                  <div style={{ background: G.gold, borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                    <p style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 }}>S/{prod.precio_venta}</p>
                  </div>
                </div>
              </div>

              {/* Instrucciones pago */}
              <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 14, marginBottom: 14, border: '1px solid #BFDBFE' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: '0 0 6px' }}>📱 Cómo pagar:</p>
                <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 3px' }}>1. Envía S/{prod.precio_venta} por Yape o transferencia</p>
                {emp?.whatsapp && <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 3px' }}>2. Número Yape: <strong>{emp.whatsapp}</strong></p>}
                <p style={{ fontSize: 12, color: '#1E40AF', margin: 0 }}>3. Toma foto del comprobante y completa el formulario</p>
              </div>

              {/* Formulario */}
              <input value={form.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Tu nombre *" style={iS} />
              <input value={form.telefono} onChange={e => s('telefono', e.target.value)} placeholder="Tu teléfono (opcional)" style={iS} type="tel" />
              <textarea value={form.nota} onChange={e => s('nota', e.target.value)} placeholder="Nota adicional (opcional)" rows={2} style={{ ...iS, resize: 'vertical' }} />

              <p style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 10px', color: G.text }}>📸 Foto del comprobante *</p>
              {fotoPrev ? (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <img src={fotoPrev} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover' }} />
                  <button onClick={() => { setFotoComp(null); setFotoPrev(null) }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>
                    Cambiar
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', padding: 20, borderRadius: 10, border: '2px dashed ' + G.gold, background: '#fff', textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}>
                  <span style={{ fontSize: 28, display: 'block', marginBottom: 4 }}>📷</span>
                  <span style={{ fontSize: 13, color: G.gold, fontWeight: 600 }}>Toca para adjuntar comprobante</span>
                  <input type="file" accept="image/*" onChange={onFoto} style={{ display: 'none' }} />
                </label>
              )}

              <button onClick={enviar} disabled={enviando || !form.nombre.trim() || !fotoComp}
                style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: (form.nombre.trim() && fotoComp) ? G.gold : '#ccc', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
                {enviando ? '⏳ Enviando...' : '✅ Enviar pedido'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── PÁGINA PRINCIPAL CATÁLOGO PÚBLICO ─── */
export default function PublicCatalogPage() {
  const [config, setConfig] = useState(null)   // datos de subdominios
  const [emp, setEmp] = useState(null)
  const [prods, setProds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [prodSel, setProdSel] = useState(null)  // producto para modal compra

  useEffect(() => {
    const cargar = async () => {
      // Detectar subdominio
      const hostname = window.location.hostname  // ej: lacasita.iaprocesos.com.pe
      const sub = hostname.split('.')[0]          // ej: lacasita

      // Buscar en tabla subdominios
      const { data: cfg, error: cfgErr } = await supabase
        .from('subdominios')
        .select('*,empresas(*),lineas(*)')
        .eq('subdominio', sub)
        .eq('activo', true)
        .single()

      if (cfgErr || !cfg) { setError('Catálogo no encontrado'); setLoading(false); return }

      setConfig(cfg)
      setEmp(cfg.empresas)

      // Cargar productos de esa línea
      const { data: ps } = await supabase
        .from('productos')
        .select('*,categorias(nombre),colores(nombre)')
        .eq('empresa_id', cfg.empresas.id)
        .eq('linea_id', cfg.linea_id)
        .eq('activo', true)
        .gt('cantidad', 0)
        .order('created_at', { ascending: false })

      setProds(ps || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const fl = prods.filter(p =>
    !busqueda ||
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.color?.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.goldLt }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 40, margin: 0 }}>⏳</p>
        <p style={{ color: G.gold, fontSize: 15, fontWeight: 600 }}>Cargando catálogo...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: G.goldLt, padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 48 }}>🔍</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: G.text }}>Catálogo no disponible</p>
      <p style={{ color: G.muted, fontSize: 14 }}>Este enlace no está activo o no existe.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: G.goldLt }}>
      {/* Modal compra */}
      {prodSel && <DetalleModal prod={prodSel} emp={emp} onClose={() => setProdSel(null)} />}

      {/* Header */}
      <div style={{ background: G.gold, padding: '16px 16px 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '0 0 2px' }}>{emp?.nombre}</p>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 12px' }}>
            {config?.lineas?.nombre || 'Catálogo'}
          </h1>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.92)', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Contador */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 16px 0', fontSize: 12, color: G.muted }}>
        {fl.length} productos disponibles
      </div>

      {/* Grid productos */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '8px 12px 32px' }}>
        {fl.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: G.muted }}>
            <p style={{ fontSize: 40 }}>📦</p>
            <p>No hay productos disponibles</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {fl.map(p => (
              <div key={p.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', border: '1px solid ' + G.border }}>
                {/* Foto */}
                <div style={{ position: 'relative', paddingTop: '100%', background: G.goldLt }}>
                  {p.foto_url
                    ? <img src={p.foto_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 36, opacity: 0.3 }}>📦</span></div>
                  }
                </div>
                {/* Info */}
                <div style={{ padding: '10px 10px 12px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, margin: '0 0 2px', color: G.text, lineHeight: 1.3 }}>{p.nombre}</p>
                  {p.color && <p style={{ fontSize: 10, color: G.muted, margin: '0 0 6px' }}>{p.color}</p>}
                  <p style={{ fontSize: 16, fontWeight: 900, color: G.gold, margin: '0 0 8px' }}>S/{p.precio_venta}</p>
                  <button
                    onClick={() => setProdSel(p)}
                    style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    🛒 Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 0 32px', borderTop: '1px solid ' + G.border }}>
        <p style={{ fontSize: 11, color: G.muted, margin: 0 }}>
          {emp?.nombre} • Powered by <strong style={{ color: G.gold }}>IA Procesos</strong>
        </p>
      </div>
    </div>
  )
}
