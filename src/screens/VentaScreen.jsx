import { useState, useRef } from 'react'
import { supabase, comprimirImagen, subirFoto } from '../supabase'
import { G, iS } from '../constants'
import { CamModal, Hdr, Crd, VoiceBtn } from '../components/index'

export default function VentaScreen(P) {
  const { eid, tit, prod, clis, notify, loadAll, setScr } = P
  const [cant, setCant] = useState(1)
  const [precio, setPrecio] = useState(String(prod?.precio_venta || 0))
  const [metodo, setMetodo] = useState('Efectivo')
  const [entrega, setEntrega] = useState('En tienda')
  const [cliId, setCliId] = useState('')
  const [cliBusq, setCliBusq] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newC, setNewC] = useState({ nombre: '', telefono: '', direccion: '', preferencias: '', acepta_publicidad: false })
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const [cam, setCam] = useState(null)
  const [fotoYape, setFotoYape] = useState(null)
  const yapeRef = useRef(null)
  if (!prod) return null
  const total = parseFloat(precio) * cant
  const clFilt = clis.filter(c => !cliBusq || c.nombre?.toLowerCase().includes(cliBusq.toLowerCase()) || c.telefono?.includes(cliBusq))

  const crearCli = async () => {
    if (!newC.nombre) { notify('Nombre obligatorio', 'error'); return }
    const cod = 'C' + String(clis.length + 1).padStart(4, '0')
    const { data, error } = await supabase.from('clientes').insert({ empresa_id: eid, codigo: cod, ...newC }).select().single()
    if (error) { notify('Error', 'error'); return }
    await loadAll(); setCliId(data.id); setCliBusq(data.nombre); setShowNew(false); notify('Cliente creado')
  }

  const onYapeCam = b => { setCam(null); setFotoYape(new File([b], 'y.jpg', { type: 'image/jpeg' })) }
  const onYapeFile = e => { const f = e.target.files?.[0]; if (f) setFotoYape(f); if (e.target) e.target.value = '' }

  const vender = async () => {
    if (cant > prod.cantidad) { notify('Stock insuficiente: ' + prod.cantidad + ' disponibles', 'error'); return }
    if (cant <= 0) { notify('Cantidad inválida', 'error'); return }
    setSaving(true)
    try {
      let foto_yape_url = null
      if (fotoYape) { const blob = await comprimirImagen(fotoYape, 600); foto_yape_url = await subirFoto(blob, 'yape_' + Date.now()) }
      await supabase.from('ventas').insert({
        empresa_id: eid, producto_id: prod.id, cliente_id: cliId || null,
        codigo_producto: prod.codigo, nombre_producto: prod.nombre,
        precio_costo: prod.precio_costo, precio_venta_original: prod.precio_venta, precio_venta_real: parseFloat(precio),
        cantidad: cant, total, metodo_pago: metodo, tipo_entrega: entrega, foto_yape: foto_yape_url, nota,
        estado: 'entregado'
      })
      await supabase.from('productos').update({ cantidad: prod.cantidad - cant }).eq('id', prod.id)
      notify('¡Venta registrada! S/' + total.toFixed(2)); await loadAll(); setScr('catalogo')
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setSaving(false)
  }

  return (
    <div>
      <Hdr tit={tit} sec="💰 Vender" onBack={() => setScr('catalogo')} />
      {cam === 'yape' && <CamModal onCapture={onYapeCam} onClose={() => setCam(null)} />}
      <div style={{ padding: 16 }}>
        <Crd>
          <div style={{ display: 'flex', gap: 12 }}>
            {prod.foto_url ? <img src={prod.foto_url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8 }} />
              : <div style={{ width: 70, height: 70, background: G.goldLt, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 20, opacity: 0.3 }}>📦</span></div>}
            <div>
              <span style={{ fontSize: 9, background: G.goldSf, color: G.goldDk, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{prod.codigo}</span>
              <p style={{ fontSize: 13, fontWeight: 700, margin: '3px 0' }}>{prod.nombre}</p>
              <p style={{ fontSize: 11, color: G.muted }}>Stock: {prod.cantidad} • Costo: S/{prod.precio_costo}</p>
            </div>
          </div>
        </Crd>
        <Crd title="Precio de Venta">
          <input value={precio} onChange={e => setPrecio(e.target.value)} type="text" inputMode="decimal"
            style={{ width: '100%', padding: 14, borderRadius: 8, border: '2px solid ' + G.gold, fontSize: 28, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box', background: '#fff' }} />
          {parseFloat(precio) !== prod.precio_venta && <p style={{ fontSize: 10, color: G.warn, margin: '6px 0 0', textAlign: 'center' }}>Original: S/{prod.precio_venta}</p>}
        </Crd>
        <Crd title="Cantidad">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <button onClick={() => setCant(Math.max(1, cant - 1))} style={{ width: 40, height: 40, borderRadius: 20, border: '2px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 20, cursor: 'pointer' }}>-</button>
            <span style={{ fontSize: 28, fontWeight: 800, minWidth: 40, textAlign: 'center' }}>{cant}</span>
            <button onClick={() => setCant(Math.min(prod.cantidad, cant + 1))} style={{ width: 40, height: 40, borderRadius: 20, border: 'none', background: G.gold, color: '#fff', fontSize: 20, cursor: 'pointer' }}>+</button>
          </div>
          {cant > prod.cantidad && <p style={{ textAlign: 'center', fontSize: 11, color: G.err, marginTop: 4 }}>Solo {prod.cantidad} disponibles</p>}
        </Crd>
        <div style={{ background: G.gold, borderRadius: 12, padding: 14, textAlign: 'center', marginBottom: 12 }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>Total</p>
          <p style={{ color: '#fff', fontSize: 30, fontWeight: 800, margin: '2px 0' }}>S/ {total.toFixed(2)}</p>
        </div>
        <Crd title="Cliente (opcional)">
          <input value={cliBusq} onChange={e => setCliBusq(e.target.value)} placeholder="Buscar cliente..." style={iS(G)} />
          {cliBusq && clFilt.length > 0 && (
            <div style={{ maxHeight: 100, overflowY: 'auto', marginBottom: 8 }}>
              {clFilt.slice(0, 5).map(c => (
                <button key={c.id} onClick={() => { setCliId(c.id); setCliBusq(c.nombre) }}
                  style={{ width: '100%', padding: 8, background: cliId === c.id ? G.goldSf : '#fff', border: '1px solid ' + G.border, borderRadius: 6, marginBottom: 4, textAlign: 'left', cursor: 'pointer', fontSize: 12 }}>
                  {c.nombre} {c.telefono ? '• ' + c.telefono : ''}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowNew(!showNew)} style={{ fontSize: 11, color: G.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>➕ Nuevo cliente</button>
          {showNew && (
            <div style={{ background: G.goldLt, borderRadius: 8, padding: 10, marginTop: 6 }}>
              <input value={newC.nombre} onChange={e => setNewC(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" style={iS(G)} />
              <input value={newC.telefono} onChange={e => setNewC(p => ({ ...p, telefono: e.target.value }))} placeholder="Teléfono" style={iS(G)} />
              <input value={newC.direccion} onChange={e => setNewC(p => ({ ...p, direccion: e.target.value }))} placeholder="Dirección" style={iS(G)} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'end' }}>
                <div style={{ flex: 1 }}><textarea value={newC.preferencias} onChange={e => setNewC(p => ({ ...p, preferencias: e.target.value }))} placeholder="Preferencias" rows={2} style={{ ...iS(G), resize: 'vertical' }} /></div>
                <VoiceBtn onResult={t => setNewC(p => ({ ...p, preferencias: (p.preferencias ? p.preferencias + ' ' : '') + t }))} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={newC.acepta_publicidad} onChange={e => setNewC(p => ({ ...p, acepta_publicidad: e.target.checked }))} />Acepta publicidad
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={crearCli} style={{ flex: 1, padding: 8, borderRadius: 6, border: 'none', background: G.gold, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
              </div>
            </div>
          )}
        </Crd>
        <Crd title="Entrega">
          <div style={{ display: 'flex', gap: 8 }}>
            {['En tienda', 'Delivery'].map(e => (
              <button key={e} onClick={() => setEntrega(e)} style={{ flex: 1, padding: 10, borderRadius: 8, border: entrega === e ? '2px solid ' + G.gold : '2px solid transparent', background: entrega === e ? G.goldSf : '#f5f5f5', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: entrega === e ? G.goldDk : G.text }}>
                {e === 'En tienda' ? '🏪' : '🛵'} {e}
              </button>
            ))}
          </div>
        </Crd>
        <Crd title="Método de pago">
          <div style={{ display: 'flex', gap: 8 }}>
            {['Efectivo', 'Yape'].map(m => (
              <button key={m} onClick={() => { setMetodo(m); if (m === 'Yape' && !fotoYape) setCam('yape') }}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: metodo === m ? '2px solid ' + G.gold : '2px solid transparent', background: metodo === m ? G.goldSf : '#f5f5f5', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: metodo === m ? G.goldDk : G.text }}>
                {m === 'Efectivo' ? '💵' : '📱'} {m}
              </button>
            ))}
          </div>
          {metodo === 'Yape' && (
            <div style={{ marginTop: 8 }}>
              {fotoYape ? (
                <div><p style={{ fontSize: 11, color: G.ok, margin: '0 0 4px' }}>✅ Comprobante capturado</p>
                  <button onClick={() => setFotoYape(null)} style={{ fontSize: 10, color: G.err, background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar foto</button></div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setCam('yape')} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', fontSize: 11, color: G.gold }}>📷 Capturar</button>
                  <button onClick={() => yapeRef.current?.click()} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px dashed ' + G.border, background: G.goldLt, cursor: 'pointer', fontSize: 11, color: G.muted }}>📁 Galería</button>
                  <input ref={yapeRef} type="file" accept="image/*" onChange={onYapeFile} style={{ display: 'none' }} />
                </div>
              )}
            </div>
          )}
        </Crd>
        <button onClick={vender} disabled={saving || cant > prod.cantidad}
          style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: G.gold, color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 15px rgba(197,165,90,0.4)', marginBottom: 20 }}>
          {saving ? 'Registrando...' : '✅ CONFIRMAR VENTA'}
        </button>
      </div>
    </div>
  )
}
