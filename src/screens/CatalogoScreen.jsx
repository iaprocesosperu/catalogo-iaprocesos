import { useState } from 'react'
import { supabase } from '../supabase'
import { G } from '../constants'
import { downloadPhoto, exportCSV, generarCatalogoPDF } from '../helpers'
import { LineSel } from '../components/index'
import PhotoViewerModal from '../components/PhotoViewerModal'

export default function CatalogoScreen(P) {
  const { tit, lineas, linAct, setLinAct, prods, setScr, setEditP, setVentaP, logout, notify, loadAll, emp } = P
  const [f, setF] = useState('')
  const [viewerProd, setViewerProd] = useState(null)
  const fl = prods.filter(p => !f || p.nombre?.toLowerCase().includes(f.toLowerCase()) || p.codigo?.toLowerCase().includes(f.toLowerCase()))

  const eliminar = async (p) => {
    const { data: v } = await supabase.from('ventas').select('id').eq('producto_id', p.id).limit(1)
    if (v?.length > 0) { notify('No se puede eliminar, tiene ventas', 'error'); return }
    if (!confirm('¿Eliminar ' + p.nombre + '?')) return
    await supabase.from('productos').update({ activo: false }).eq('id', p.id)
    notify('Eliminado'); await loadAll()
  }

  const exportar = () => {
    exportCSV(fl, 'catalogo_' + new Date().toISOString().split('T')[0], [
      { k: 'codigo', l: 'Código' }, { k: 'nombre', l: 'Nombre' },
      { k: r => r.lineas?.nombre || '', l: 'Línea' }, { k: r => r.categorias?.nombre || '', l: 'Categoría' },
      { k: r => r.origenes?.nombre || '', l: 'Origen' }, { k: 'color', l: 'Color' },
      { k: 'precio_costo', l: 'Precio Costo' }, { k: 'precio_venta', l: 'Precio Venta' },
      { k: 'cantidad', l: 'Stock' }, { k: 'observacion', l: 'Observación' },
      { k: r => new Date(r.created_at).toLocaleDateString('es-PE'), l: 'Fecha Registro' }
    ]); notify('Exportado')
  }

  return (
    <div>
      {viewerProd && <PhotoViewerModal prod={viewerProd} emp={emp} notify={notify} loadAll={loadAll} onClose={() => setViewerProd(null)} />}
      <div style={{ background: G.gold, padding: '16px 16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, margin: 0 }}>{emp?.nombre}</p>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>📦 Catálogo</h1>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => generarCatalogoPDF(fl, emp, linAct?.nombre)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>📄 PDF</button>
            <button onClick={exportar} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>📥</button>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Salir</button>
          </div>
        </div>
        <input value={f} onChange={e => setF(e.target.value)} placeholder="Filtrar por nombre, código..."
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.9)', boxSizing: 'border-box' }} />
      </div>
      <LineSel lineas={lineas} linAct={linAct} setLinAct={setLinAct} />
      <div style={{ padding: '4px 12px 0', fontSize: 12, color: G.muted }}>{fl.length} productos</div>
      {fl.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: G.muted }}>
          <p style={{ fontSize: 40 }}>📦</p><p>No hay productos</p>
          <button onClick={() => setScr('registrar')} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>➕ Registrar</button>
        </div>
      ) : (
        <div style={{ padding: '8px 12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {fl.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: '1px solid ' + G.border }}>
              <div onClick={() => setViewerProd(p)} style={{ cursor: 'pointer', position: 'relative' }}>
                {p.foto_url
                  ? <img src={p.foto_url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: 130, background: G.goldLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 36, opacity: 0.3 }}>📦</span></div>
                }
                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: '2px 6px', fontSize: 9, color: '#fff', pointerEvents: 'none' }}>👁 Ver</div>
              </div>
              <div style={{ padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <span style={{ fontSize: 9, background: G.goldSf, color: G.goldDk, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{p.codigo}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: G.gold }}>S/{p.precio_venta}</span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, margin: '3px 0 1px', color: G.text, lineHeight: 1.2 }}>{p.nombre}</p>
                <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Stock: {p.cantidad} {p.color ? '• ' + p.color : ''}</p>
                <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                  <button onClick={() => { setEditP(p); setScr('registrar') }} style={{ flex: 1, padding: 4, borderRadius: 5, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => { setVentaP(p); setScr('venta') }} disabled={p.cantidad <= 0} style={{ flex: 1, padding: 4, borderRadius: 5, border: 'none', background: p.cantidad > 0 ? G.gold : '#ccc', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Vender</button>
                  {p.foto_url && <button onClick={() => downloadPhoto(p.foto_url, p.codigo)} style={{ padding: 4, borderRadius: 5, border: '1px solid ' + G.border, background: 'transparent', color: G.gold, fontSize: 9, cursor: 'pointer' }}>📥</button>}
                  <button onClick={() => eliminar(p)} style={{ padding: 4, borderRadius: 5, border: '1px solid #eee', background: 'transparent', color: G.err, fontSize: 9, cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
