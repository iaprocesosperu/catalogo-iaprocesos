import { useState, useEffect } from 'react'
import { supabase, comprimirImagen, subirFoto } from '../supabase'
import { G } from '../constants'

export default function PromoPage() {
  const codigo = window.location.pathname.split('/promo/')[1]?.split('/')[0]
  const [promo, setPromo] = useState(null)
  const [prods, setProds] = useState([])
  const [emp, setEmp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [prodSel, setProdSel] = useState(null) // producto seleccionado para comprar
  const [form, setForm] = useState({ nombre: '', telefono: '', nota: '' })
  const [fotoComp, setFotoComp] = useState(null)
  const [fotoPrev, setFotoPrev] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    const cargar = async () => {
      if (!codigo) { setLoading(false); return }
      const { data: pr } = await supabase.from('promociones')
        .select('*,empresas(*)').eq('codigo', codigo).eq('activo', true).single()
      if (!pr) { setLoading(false); return }
      setPromo(pr); setEmp(pr.empresas)
      if (pr.producto_ids?.length) {
        const { data: ps } = await supabase.from('productos')
          .select('*,categorias(nombre)').in('id', pr.producto_ids).eq('activo', true)
        // Mantener orden original
        const ordenados = pr.producto_ids.map(id => ps?.find(p => p.id === id)).filter(Boolean)
        setProds(ordenados)
      }
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
        empresa_id: emp.id, producto_id: prodSel.id,
        codigo_producto: prodSel.codigo, nombre_producto: prodSel.nombre,
        precio_venta: prodSel.precio_venta,
        nombre_cliente: form.nombre.trim(), telefono_cliente: form.telefono || null,
        foto_comprobante: url, nota: form.nota || null, estado: 'pendiente'
      })
      setEnviado(true)
    } catch (e) { alert('Error: ' + e.message) }
    setEnviando(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.goldLt }}>
      <p style={{ color: G.gold, fontSize: 16 }}>⏳ Cargando...</p>
    </div>
  )

  if (!promo) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: G.goldLt, padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 48 }}>🔍</p>
      <p style={{ fontSize: 18, fontWeight: 700 }}>Promoción no encontrada</p>
      <p style={{ color: G.muted }}>El link puede haber expirado.</p>
    </div>
  )

  // Pantalla de confirmación enviado
  if (enviado) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: G.goldLt, padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 64 }}>✅</p>
      <h1 style={{ color: G.gold, fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>¡Pedido enviado!</h1>
      <p style={{ fontSize: 14, color: G.text, margin: '0 0 16px' }}>Hola <strong>{form.nombre}</strong>, recibimos tu pedido de <strong>{prodSel?.nombre}</strong>.</p>
      <p style={{ fontSize: 13, color: G.muted, margin: '0 0 20px' }}>La tienda verificará tu pago y se contactará contigo.</p>
      {emp?.whatsapp && (
        <a href={'https://wa.me/51' + emp.whatsapp.replace(/\D/g, '')} target="_blank" rel="noreferrer"
          style={{ background: '#25D366', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
          💬 Contactar por WhatsApp
        </a>
      )}
      <button onClick={() => { setEnviado(false); setProdSel(null); setForm({ nombre: '', telefono: '', nota: '' }); setFotoComp(null); setFotoPrev(null) }}
        style={{ marginTop: 12, background: 'none', border: 'none', color: G.gold, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
        Ver más productos
      </button>
    </div>
  )

  // Formulario de compra
  if (prodSel) {
    const iS = { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid ' + G.border, fontSize: 15, boxSizing: 'border-box', marginBottom: 12 }
    return (
      <div style={{ minHeight: '100vh', background: G.goldLt }}>
        <div style={{ background: G.gold, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setProdSel(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>←</button>
          <h1 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>🛒 Comprar</h1>
        </div>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: 20 }}>
          {/* Producto seleccionado */}
          <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            {prodSel.foto_url && <img src={prodSel.foto_url} alt="" style={{ width: '100%', maxHeight: 250, objectFit: 'cover' }} />}
            <div style={{ padding: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>{prodSel.nombre}</h2>
              <div style={{ background: G.gold, borderRadius: 8, padding: '10px 14px', textAlign: 'center', marginTop: 8 }}>
                <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: 0 }}>S/{prodSel.precio_venta}</p>
              </div>
            </div>
          </div>
          {/* Instrucciones */}
          <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 16, border: '1px solid #BFDBFE' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: '0 0 6px' }}>📱 Cómo pagar:</p>
            <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 3px' }}>1. Envía S/{prodSel.precio_venta} por Yape o transferencia</p>
            {emp?.whatsapp && <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 3px' }}>2. Número: <strong>{emp.whatsapp}</strong></p>}
            <p style={{ fontSize: 12, color: '#1E40AF', margin: 0 }}>3. Toma foto del comprobante y completa el formulario</p>
          </div>
          {/* Form */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <input value={form.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Tu nombre *" style={iS} />
            <input value={form.telefono} onChange={e => s('telefono', e.target.value)} placeholder="Tu teléfono (opcional)" style={iS} type="tel" />
            <p style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 10px' }}>📸 Foto del comprobante *</p>
            {fotoPrev ? (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <img src={fotoPrev} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover' }} />
                <button onClick={() => { setFotoComp(null); setFotoPrev(null) }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>Cambiar</button>
              </div>
            ) : (
              <label style={{ display: 'block', padding: 18, borderRadius: 10, border: '2px dashed ' + G.gold, background: G.goldLt, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 4 }}>📷</span>
                <span style={{ fontSize: 13, color: G.gold, fontWeight: 600 }}>Adjuntar comprobante</span>
                <input type="file" accept="image/*" onChange={onFoto} style={{ display: 'none' }} />
              </label>
            )}
            <button onClick={enviar} disabled={enviando || !form.nombre.trim() || !fotoComp}
              style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: (form.nombre.trim() && fotoComp) ? G.gold : '#ccc', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
              {enviando ? '⏳ Enviando...' : '✅ Enviar pedido'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Página principal de la promo
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ background: G.gold, padding: '20px 20px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: '0 0 2px' }}>{emp?.nombre}</p>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>
          {promo.nombre || '🛍️ Promoción especial'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, margin: 0 }}>
          {prods.length} producto{prods.length !== 1 ? 's' : ''} disponibles
        </p>
      </div>

      {/* Grid de productos */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {prods.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              {p.foto_url
                ? <img src={p.foto_url} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} />
                : <div style={{ width: '100%', aspectRatio: '3/4', background: G.goldLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 36, opacity: 0.3 }}>👗</span></div>
              }
              <div style={{ padding: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 2px', lineHeight: 1.2, color: G.text }}>{p.nombre}</p>
                {p.color && <p style={{ fontSize: 10, color: G.muted, margin: '0 0 6px' }}>{p.color}{p.atributos?.talla ? ' • Talla ' + p.atributos.talla : ''}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 900, color: G.gold }}>S/{p.precio_venta}</span>
                  {p.cantidad > 0
                    ? <button onClick={() => setProdSel(p)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Quiero este
                      </button>
                    : <span style={{ fontSize: 10, color: G.err, fontWeight: 600 }}>Agotado</span>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24, padding: '16px 0' }}>
          {emp?.whatsapp && (
            <a href={'https://wa.me/51' + emp.whatsapp.replace(/\D/g, '')} target="_blank" rel="noreferrer"
              style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14, marginBottom: 12 }}>
              💬 Consultar por WhatsApp
            </a>
          )}
          <p style={{ fontSize: 11, color: G.muted, margin: 0 }}>{emp?.nombre} • {emp?.direccion || ''}</p>
          <p style={{ fontSize: 10, color: '#ccc', margin: '4px 0 0' }}>Powered by IA Procesos</p>
        </div>
      </div>
    </div>
  )
}
