import { useState, useEffect } from 'react'
import { supabase, comprimirImagen, subirFoto } from '../supabase'
import { G } from '../constants'

export default function PublicProductPage() {
  const codigo = window.location.pathname.split('/comprar/')[1]?.split('/')[0]
  const [prod, setProd] = useState(null)
  const [emp, setEmp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', nota: '' })
  const [fotoComp, setFotoComp] = useState(null)
  const [fotoPrev, setFotoPrev] = useState(null)
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const cargar = async () => {
      if (!codigo) { setLoading(false); return }
      const { data: p } = await supabase.from('productos')
        .select('*,empresas(*),categorias(nombre),secciones(nombre)')
        .eq('codigo', codigo).eq('activo', true).single()
      if (p) { setProd(p); setEmp(p.empresas) }
      setLoading(false)
    }
    cargar()
  }, [])

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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.goldLt }}>
      <p style={{ color: G.gold, fontSize: 16 }}>⏳ Cargando...</p>
    </div>
  )

  if (!prod) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: G.goldLt, padding: 24 }}>
      <p style={{ fontSize: 48 }}>🔍</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: G.text }}>Producto no encontrado</p>
      <p style={{ color: G.muted }}>El código {codigo} no existe o ya no está disponible.</p>
    </div>
  )

  if (enviado) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: G.goldLt, padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 64 }}>✅</p>
      <h1 style={{ color: G.gold, fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>¡Pedido enviado!</h1>
      <p style={{ color: G.text, fontSize: 15, margin: '0 0 16px' }}>Hola <strong>{form.nombre}</strong>, tu pedido fue recibido correctamente.</p>
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid ' + G.border, maxWidth: 320, width: '100%' }}>
        <p style={{ fontSize: 13, color: G.muted, margin: '0 0 4px' }}>Producto</p>
        <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{prod.nombre}</p>
        <p style={{ fontSize: 20, fontWeight: 800, color: G.gold, margin: '4px 0 0' }}>S/{prod.precio_venta}</p>
      </div>
      <p style={{ color: G.muted, fontSize: 13 }}>La tienda verificará tu pago y se pondrá en contacto contigo.</p>
      {emp?.whatsapp && (
        <a href={'https://wa.me/51' + emp.whatsapp.replace(/\D/g, '')} target="_blank" rel="noreferrer"
          style={{ marginTop: 16, display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
          💬 Contactar por WhatsApp
        </a>
      )}
    </div>
  )

  const iS = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid ' + G.border, fontSize: 15, boxSizing: 'border-box', marginBottom: 12 }

  return (
    <div style={{ minHeight: '100vh', background: G.goldLt }}>
      {/* Header */}
      <div style={{ background: G.gold, padding: '16px 20px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: 0 }}>{emp?.nombre}</p>
        <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>🛒 Comprar producto</h1>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: 20 }}>
        {/* Producto */}
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          {prod.foto_url && <img src={prod.foto_url} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }} />}
          <div style={{ padding: 16 }}>
            <span style={{ fontSize: 10, background: G.goldSf, color: G.goldDk, padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{prod.codigo}</span>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '6px 0 4px', color: G.text }}>{prod.nombre}</h2>
            {prod.categorias?.nombre && <p style={{ fontSize: 13, color: G.muted, margin: 0 }}>{prod.categorias.nombre} {prod.color ? '• ' + prod.color : ''}</p>}
            <div style={{ background: G.gold, borderRadius: 10, padding: '12px 16px', marginTop: 12, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>PRECIO</p>
              <p style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: 0 }}>S/{prod.precio_venta}</p>
            </div>
            {prod.cantidad <= 0 && (
              <div style={{ background: '#FEE2E2', borderRadius: 8, padding: 12, marginTop: 10, textAlign: 'center' }}>
                <p style={{ color: G.err, fontSize: 14, fontWeight: 700, margin: 0 }}>❌ Sin stock disponible</p>
              </div>
            )}
          </div>
        </div>

        {prod.cantidad > 0 && (
          <>
            {/* Instrucciones de pago */}
            <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #BFDBFE' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', margin: '0 0 8px' }}>📱 Cómo pagar:</p>
              <p style={{ fontSize: 13, color: '#1E40AF', margin: '0 0 4px' }}>1. Envía S/{prod.precio_venta} por Yape o transferencia</p>
              {emp?.whatsapp && <p style={{ fontSize: 13, color: '#1E40AF', margin: '0 0 4px' }}>2. Número Yape: <strong>{emp.whatsapp}</strong></p>}
              <p style={{ fontSize: 13, color: '#1E40AF', margin: 0 }}>3. Toma foto del comprobante y completa el formulario</p>
            </div>

            {/* Formulario */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: G.text }}>Tus datos</h3>
              <input value={form.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Tu nombre *" style={iS} />
              <input value={form.telefono} onChange={e => s('telefono', e.target.value)} placeholder="Tu teléfono (opcional)" style={iS} type="tel" />
              <textarea value={form.nota} onChange={e => s('nota', e.target.value)} placeholder="Nota adicional (opcional)" rows={2} style={{ ...iS, resize: 'vertical' }} />

              <p style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 10px', color: G.text }}>📸 Foto del comprobante *</p>
              {fotoPrev ? (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <img src={fotoPrev} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
                  <button onClick={() => { setFotoComp(null); setFotoPrev(null) }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>
                    Cambiar
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', padding: 20, borderRadius: 10, border: '2px dashed ' + G.gold, background: G.goldLt, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}>
                  <span style={{ fontSize: 30, display: 'block', marginBottom: 4 }}>📷</span>
                  <span style={{ fontSize: 13, color: G.gold, fontWeight: 600 }}>Toca para adjuntar foto</span>
                  <input type="file" accept="image/*" onChange={onFoto} style={{ display: 'none' }} />
                </label>
              )}

              <button onClick={enviar} disabled={enviando || !form.nombre.trim() || !fotoComp}
                style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: (form.nombre.trim() && fotoComp) ? G.gold : '#ccc', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
                {enviando ? '⏳ Enviando...' : '✅ Enviar pedido'}
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', color: G.muted, fontSize: 11, marginTop: 20 }}>
          {emp?.nombre} • {emp?.direccion || ''}<br />
          Powered by IA Procesos
        </p>
      </div>
    </div>
  )
}
