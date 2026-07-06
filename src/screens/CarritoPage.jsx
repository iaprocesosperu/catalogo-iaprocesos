import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, comprimirImagen, subirFoto } from '../supabase'

const DPTOS = ['Ica', 'Lima', 'Arequipa', 'Cusco', 'Piura', 'La Libertad', 'Lambayeque', 'Junín', 'Puno', 'Ancash', 'Cajamarca', 'Loreto', 'Ucayali', 'San Martín', 'Áncash', 'Huánuco', 'Ayacucho', 'Apurímac', 'Amazonas', 'Moquegua', 'Tacna', 'Tumbes', 'Pasco', 'Huancavelica', 'Madre de Dios', 'Callao']
const PROVINCIAS = { 'Ica': ['Ica', 'Chincha', 'Pisco', 'Nazca', 'Palpa'], 'Lima': ['Lima', 'Huaura', 'Cañete', 'Huarochirí', 'Yauyos', 'Barranca', 'Cajatambo', 'Huaral', 'Oyón'], 'Arequipa': ['Arequipa', 'Camaná', 'Caravelí', 'Castilla', 'Caylloma', 'Condesuyos', 'Islay', 'La Unión'] }
const DISTRITOS = { 'Nazca': ['Nazca', 'Marcona', 'Changuillo', 'El Ingenio', 'Vista Alegre'], 'Ica': ['Ica', 'La Tinguiña', 'Los Aquijes', 'Ocucaje', 'Pachacútec', 'Parcona', 'Pueblo Nuevo', 'Salas', 'San José de los Molinos', 'San Juan Bautista', 'Santiago', 'Subtanjalla', 'Tate', 'Yauca del Rosario'], 'Chincha': ['Chincha Alta', 'Chincha Baja', 'El Carmen', 'Grocio Prado', 'Sunampe', 'Tambo de Mora'], 'Lima': ['Lima', 'Miraflores', 'San Isidro', 'Surco', 'La Molina', 'San Borja', 'Barranco', 'Chorrillos', 'Ate', 'San Juan de Lurigancho', 'San Martín de Porres', 'Los Olivos', 'Comas', 'Independencia', 'Carabayllo', 'Puente Piedra', 'Villa El Salvador', 'Villa María del Triunfo', 'San Juan de Miraflores', 'Lince', 'Pueblo Libre', 'Jesús María', 'Breña', 'Rímac', 'El Agustino', 'Santa Anita', 'San Luis', 'La Victoria', 'Magdalena del Mar', 'San Miguel'] }

export default function CarritoPage({ carrito, config, onVolver, onPedidoEnviado }) {
  const C = config?.color_primario || '#C5A55A'
  const C2 = config?.color_secundario || '#2D7D7D'

  const [form, setForm] = useState({ nombre: '', telefono: '', nota: '' })
  const [delivery, setDelivery] = useState(false)
  const [dpto, setDpto] = useState('Ica')
  const [provincia, setProvincia] = useState('Nazca')
  const [distrito, setDistrito] = useState('Marcona')
  const [direccion, setDireccion] = useState('')
  const [fotos, setFotos] = useState([]) // array de { file, prev }
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const fileRef = useRef(null)
  const pasteZoneRef = useRef(null)
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const total = carrito.reduce((s, i) => s + i.precio_venta * i.cantidad, 0)
  const provincias = PROVINCIAS[dpto] || []
  const distritos = DISTRITOS[provincia] || []

  // Pegar desde portapapeles
  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) agregarFoto(file)
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const agregarFoto = (file) => {
    const r = new FileReader()
    r.onload = ev => setFotos(fs => [...fs, { file, prev: ev.target.result }])
    r.readAsDataURL(file)
  }

  const onFileChange = (e) => {
    Array.from(e.target.files || []).forEach(agregarFoto)
    e.target.value = ''
  }

  const quitarFoto = (idx) => setFotos(fs => fs.filter((_, i) => i !== idx))

  const enviar = async () => {
    if (!form.nombre.trim()) { alert('Tu nombre es obligatorio'); return }
    if (!form.telefono.trim()) { alert('Tu teléfono es obligatorio para coordinar el pedido'); return }
    if (fotos.length === 0) { alert('Adjunta al menos un comprobante de pago'); return }
    if (delivery && !direccion.trim()) { alert('Ingresa tu dirección de entrega'); return }
    setEnviando(true)
    try {
      // Subir fotos comprobante
      const urlsFotos = []
      for (const f of fotos) {
        const blob = await comprimirImagen(f.file, 800)
        const url = await subirFoto(blob, `comp_${Date.now()}_${Math.random().toString(36).slice(2)}`)
        urlsFotos.push(url)
      }

      // Crear pedido principal
      const { data: pedido, error: pedErr } = await supabase.from('pedidos').insert({
        empresa_id: config.empresa_id,
        nombre_cliente: form.nombre.trim(),
        telefono_cliente: form.telefono || null,
        nota: form.nota || null,
        tipo_pedido: 'carrito',
        delivery,
        dpto: delivery ? dpto : null,
        provincia: delivery ? provincia : null,
        distrito: delivery ? distrito : null,
        direccion_delivery: delivery ? direccion.trim() : null,
        fotos_comprobante: urlsFotos,
        total_pedido: total,
        estado: 'pendiente',
        // Para compatibilidad con campos existentes
        nombre_producto: carrito.map(i => `${i.cantidad}x ${i.nombre}`).join(', '),
        precio_venta: total,
        foto_comprobante: urlsFotos[0] || null
      }).select().single()

      if (pedErr) throw pedErr

      // Insertar items del carrito
      const items = carrito.map(i => ({
        pedido_id: pedido.id,
        producto_id: i.id,
        codigo: i.codigo,
        nombre: i.nombre,
        precio_venta: i.precio_venta,
        cantidad: i.cantidad,
        subtotal: i.precio_venta * i.cantidad
      }))
      await supabase.from('pedido_items').insert(items)

      setEnviado(true)
    } catch (e) { alert('Error al enviar: ' + e.message) }
    setEnviando(false)
  }

  const iS = { width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 10, background: '#fff', fontFamily: 'inherit' }
  const selS = { ...iS, cursor: 'pointer' }

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: '#FFFDF7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <p style={{ fontSize: 64, margin: 0 }}>✅</p>
      <h2 style={{ color: C, fontSize: 22, fontWeight: 900, margin: '12px 0 8px' }}>¡Pedido enviado!</h2>
      <p style={{ fontSize: 15, margin: '0 0 6px' }}>Hola <strong>{form.nombre}</strong>, recibimos tu pedido.</p>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 8px' }}>{carrito.length} producto{carrito.length > 1 ? 's' : ''} · Total S/{total.toFixed(2)}</p>
      {delivery && <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px' }}>🛵 Delivery a {distrito}, {provincia}</p>}
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>Verificaremos tu pago y nos pondremos en contacto contigo.</p>
      {config?.whatsapp && (
        <a href={`https://wa.me/51${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 28px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 15, marginBottom: 12 }}>
          💬 Contactar por WhatsApp
        </a>
      )}
      <button onClick={() => { onPedidoEnviado?.(); onVolver() }}
        style={{ display: 'block', width: '100%', maxWidth: 320, padding: 13, borderRadius: 12, border: `2px solid ${C}`, background: 'transparent', color: C, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        Seguir comprando
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FFFDF7', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: C, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={onVolver} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>←</button>
        <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0, flex: 1 }}>🛒 Tu carrito</h2>
        <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
          S/{total.toFixed(2)}
        </span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 14px 40px' }}>

        {/* Items del carrito */}
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', marginBottom: 14, border: '1px solid #eee' }}>
          {carrito.map((item, idx) => (
            <div key={item.id} style={{ padding: '12px 14px', borderBottom: idx < carrito.length - 1 ? '1px solid #f5f5f5' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              {item.foto_url && <img src={item.foto_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{item.nombre}</p>
                <p style={{ fontSize: 11, color: '#999', margin: '2px 0 0' }}>{item.cantidad} × S/{item.precio_venta} = <strong style={{ color: C }}>S/{(item.precio_venta * item.cantidad).toFixed(2)}</strong></p>
              </div>
            </div>
          ))}
          <div style={{ padding: '12px 14px', background: C, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{carrito.reduce((s, i) => s + i.cantidad, 0)} productos</span>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>Total S/{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Instrucciones pago */}
        <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '12px 14px', marginBottom: 14, border: '1px solid #BFDBFE' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: '0 0 6px' }}>📱 Cómo pagar:</p>
          <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 3px' }}>1. Envía S/{total.toFixed(2)} por Yape o transferencia</p>
          {config?.whatsapp && <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 3px' }}>2. Número Yape: <strong>{config.whatsapp}</strong></p>}
          <p style={{ fontSize: 12, color: '#1E40AF', margin: 0 }}>3. Toma foto del comprobante y adjúntala abajo</p>
        </div>

        {/* Datos personales */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #eee' }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>👤 Tus datos</p>
          <input value={form.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Tu nombre *" style={iS} />
          <input value={form.telefono} onChange={e => s('telefono', e.target.value)} placeholder="Tu teléfono *" style={iS} type="tel" required />
          <textarea value={form.nota} onChange={e => s('nota', e.target.value)} placeholder="Nota adicional (opcional)" rows={2} style={{ ...iS, resize: 'vertical' }} />
        </div>

        {/* Delivery */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #eee' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: delivery ? 14 : 0 }}>
            <input type="checkbox" checked={delivery} onChange={e => setDelivery(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: C, cursor: 'pointer' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🛵 Quiero delivery</p>
              <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Coordinamos el envío contigo</p>
            </div>
          </label>

          {delivery && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>DEPARTAMENTO</label>
                  <select value={dpto} onChange={e => { setDpto(e.target.value); setProvincia(''); setDistrito('') }} style={selS}>
                    {DPTOS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>PROVINCIA</label>
                  <select value={provincia} onChange={e => { setProvincia(e.target.value); setDistrito('') }} style={selS}>
                    <option value="">Seleccionar</option>
                    {provincias.map(p => <option key={p}>{p}</option>)}
                    {!provincias.length && <option value={dpto}>{dpto}</option>}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>DISTRITO</label>
                <select value={distrito} onChange={e => setDistrito(e.target.value)} style={selS}>
                  <option value="">Seleccionar</option>
                  {distritos.map(d => <option key={d}>{d}</option>)}
                  {!distritos.length && <option value={provincia}>{provincia}</option>}
                </select>
              </div>

              {/* Lógica de delivery según destino y monto */}
              {distrito && (() => {
                const esMarcona = distrito === 'Marcona' || distrito?.toLowerCase().includes('marcona')
                const esFueraPeru = dpto !== 'Ica' && dpto !== 'Lima' && dpto !== 'Arequipa'

                if (esMarcona && total >= 20) {
                  return (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>✅ Delivery GRATIS</p>
                      <p style={{ fontSize: 12, color: '#166534', margin: 0 }}>Tu pedido supera S/20 — te lo llevamos sin costo adicional a Marcona.</p>
                    </div>
                  )
                } else if (esMarcona && total < 20) {
                  return (
                    <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>🏪 Recojo en tienda</p>
                      <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 3px' }}>Por compras menores a S/20 en Marcona, el recojo es en tienda:</p>
                      <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 3px' }}>📍 <strong>San Martín 0-12</strong></p>
                      <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 3px' }}>🕐 Lunes a Sábado de 5:30 a 9:00</p>
                      <a href={`https://wa.me/51${config?.whatsapp?.replace(/\D/g, '') || '967539739'}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', marginTop: 6, background: '#25D366', color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                        💬 Coordinar con El Miau
                      </a>
                    </div>
                  )
                } else {
                  return (
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: '0 0 4px' }}>📦 Envío por agencia</p>
                      <p style={{ fontSize: 12, color: '#1E40AF', margin: '0 0 6px' }}>Tu pedido será enviado por agencia de transporte a tu ciudad. Coordinamos contigo los detalles.</p>
                      <a href={`https://wa.me/51${config?.whatsapp?.replace(/\D/g, '') || '967539739'}`} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                        💬 Coordinar envío
                      </a>
                    </div>
                  )
                }
              })()}

              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>DIRECCIÓN *</label>
                <input value={direccion} onChange={e => setDireccion(e.target.value)}
                  placeholder="Calle, número, referencia..." style={iS} />
              </div>

              {/* Mapa OpenStreetMap */}
              {distrito && (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #ddd', marginTop: 4 }}>
                  <iframe title="mapa" width="100%" height="180" style={{ display: 'block', border: 'none' }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=-75.5,-15.5,-74.5,-14.5&layer=mapnik&marker=${encodeURIComponent(distrito + ', ' + provincia + ', Peru')}`} />
                  <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(distrito + ' ' + provincia + ' Peru')}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'block', textAlign: 'center', padding: '6px', fontSize: 11, color: C, background: '#f9f9f9' }}>
                    Ver mapa completo →
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Comprobantes */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 14, marginBottom: 16, border: '1px solid #eee' }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>📸 Comprobante(s) de pago *</p>
          <p style={{ fontSize: 11, color: '#999', margin: '0 0 12px' }}>Puedes subir varias fotos, o pegar desde el portapapeles (Ctrl+V)</p>

          {/* Zona pegar portapapeles */}
          <div ref={pasteZoneRef}
            style={{ border: `2px dashed ${C}`, borderRadius: 10, padding: '14px', textAlign: 'center', background: '#FFFDF7', marginBottom: 10, cursor: 'pointer' }}
            onClick={() => fileRef.current?.click()}>
            <p style={{ fontSize: 24, margin: '0 0 4px' }}>📋</p>
            <p style={{ fontSize: 12, color: C, fontWeight: 600, margin: 0 }}>Toca para seleccionar fotos</p>
            <p style={{ fontSize: 11, color: '#999', margin: '2px 0 0' }}>o pega con Ctrl+V desde el portapapeles</p>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFileChange} style={{ display: 'none' }} />
          </div>

          {/* Preview fotos */}
          {fotos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {fotos.map((f, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={f.prev} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => quitarFoto(idx)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón enviar */}
        <button onClick={enviar} disabled={enviando || !form.nombre.trim() || !form.telefono.trim() || fotos.length === 0}
          style={{ width: '100%', padding: 17, borderRadius: 14, border: 'none', background: (form.nombre.trim() && form.telefono.trim() && fotos.length > 0) ? C : '#ccc', color: '#fff', fontSize: 17, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
          {enviando ? '⏳ Enviando pedido...' : `✅ Confirmar pedido · S/${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}
