import { useState, useRef, useEffect } from 'react'
import { supabase, subirFoto, comprimirImagen } from '../supabase'
import { G } from '../constants'
import { downloadPhoto, exportCSV, detectColor } from '../helpers'
import { LineSel } from '../components/index'
import PhotoViewerModal from '../components/PhotoViewerModal'

export default function CatalogoScreen(P) {
  const { tit, lineas, linAct, setLinAct, prods, allProds, oris, cats, eid, lid, setScr, setEditP, setVentaP, logout, notify, loadAll, emp, setRetorno } = P
  const [f, setF] = useState('')
  const [fOrigen, setFOrigen] = useState('')
  const [viewerProd, setViewerProd] = useState(null)
  const [ocultarAgotados, setOcultarAgotados] = useState(true)
  const [verOcultos, setVerOcultos] = useState(false)
  const [verGenericos, setVerGenericos] = useState(false)

  // ── Búsqueda visual (foto) ──
  const [bvOpen, setBvOpen] = useState(false)       // menú de foto abierto
  const [bvFoto, setBvFoto] = useState(null)        // {blob, preview} pendiente de elegir modo
  const [bvIds, setBvIds] = useState(null)          // ids resultantes (null = sin búsqueda visual activa)
  const [bvLabel, setBvLabel] = useState('')        // etiqueta mostrada
  const [bvBusy, setBvBusy] = useState(false)
  const bvGalRef = useRef(null)
  const bvCamRef = useRef(null)
  const RAILWAY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAILWAY_URL) || emp?.railway_url || ''

  const recibirFotoBV = (file) => { if (!file) return; setBvFoto({ blob: file, preview: URL.createObjectURL(file) }) }
  useEffect(() => {
    if (!bvOpen) return
    const onPaste = (e) => { const items = e.clipboardData?.items; if (!items) return; for (const it of items) { if (it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) { recibirFotoBV(f); notify('📋 Foto pegada') } break } } }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [bvOpen])

  const buscarColor = async () => {
    if (!bvFoto?.blob) return
    setBvBusy(true)
    try {
      const url = URL.createObjectURL(bvFoto.blob); const color = await detectColor(url); URL.revokeObjectURL(url)
      if (color) {
        const base = allProds || prods
        const found = base.filter(p => p.color?.toLowerCase() === color.toLowerCase() || p.nombre?.toLowerCase().includes(color.toLowerCase()))
        setBvIds(new Set(found.map(p => p.id))); setBvLabel('🎨 Color: ' + color)
        notify(found.length + ' resultado(s) para ' + color)
      } else notify('No se pudo detectar color', 'error')
    } catch (e) { notify('Error al detectar color', 'error') }
    setBvBusy(false); setBvOpen(false); setBvFoto(null)
  }
  const buscarSimilar = async () => {
    if (!bvFoto?.blob) return
    if (!RAILWAY) { notify('Búsqueda similar no está configurada; usa Por color', 'error'); return }
    setBvBusy(true)
    try {
      const base = allProds || prods
      const prodsConHash = base.filter(p => p.imagen_hash)
      if (!prodsConHash.length) { notify('No hay productos vectorizados aún', 'error'); setBvBusy(false); return }
      const hashes = JSON.stringify(prodsConHash.map(p => ({ id: p.id, hash: p.imagen_hash, codigo: p.codigo, nombre: p.nombre })))
      const fd = new FormData()
      fd.append('imagen', bvFoto.blob instanceof File ? bvFoto.blob : new File([bvFoto.blob], 'search.jpg'))
      const resp = await fetch(RAILWAY + '/buscar-similar', { method: 'POST', headers: { 'hashes': hashes }, body: fd })
      const data = await resp.json()
      if (data.resultados?.length) {
        setBvIds(new Set(data.resultados.map(r => r.id))); setBvLabel('🔍 Similares (' + data.resultados.length + ')')
        notify(data.resultados.length + ' similares')
      } else { notify('No se encontraron similares', 'error') }
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setBvBusy(false); setBvOpen(false); setBvFoto(null)
  }
  const limpiarBV = () => { setBvIds(null); setBvLabel('') }

  // ── CARRITOS (POS multi-cliente) ──
  const [carritos, setCarritos] = useState([])
  const [carActivo, setCarActivo] = useState(null) // id del carrito activo
  const [carItems, setCarItems] = useState([]) // items del carrito activo
  const [carOpen, setCarOpen] = useState(false) // panel abierto
  const [carClientes, setCarClientes] = useState([])
  const [carLiq, setCarLiq] = useState(false)
  const [liqOpen, setLiqOpen] = useState(false)
  const [liqMetodo, setLiqMetodo] = useState('Efectivo')
  const [liqFecha, setLiqFecha] = useState('')

  const cargarCarritos = async () => {
    const { data } = await supabase.from('carritos').select('*,clientes(nombre)').eq('empresa_id', eid).eq('estado', 'abierto').order('created_at')
    setCarritos(data || [])
    if (data && data.length && !data.find(c => c.id === carActivo)) setCarActivo(data[0].id)
    if (!data || !data.length) { setCarActivo(null); setCarItems([]) }
  }
  useEffect(() => { if (eid) cargarCarritos() }, [eid])
  useEffect(() => { (async () => { const { data } = await supabase.from('clientes').select('id,nombre').eq('empresa_id', eid).eq('activo', true).order('nombre'); if (data) setCarClientes(data) })() }, [eid])

  const cargarItems = async (cid) => {
    if (!cid) { setCarItems([]); return }
    const { data } = await supabase.from('carrito_items').select('*').eq('carrito_id', cid).order('created_at')
    setCarItems(data || [])
  }
  useEffect(() => { cargarItems(carActivo) }, [carActivo])

  const nuevoCarrito = async () => {
    const { data, error } = await supabase.from('carritos').insert({ empresa_id: eid, estado: 'abierto', nombre: 'Carrito ' + (carritos.length + 1) }).select().single()
    if (error) { notify('Error: ' + error.message, 'error'); return }
    await cargarCarritos(); setCarActivo(data.id); setCarItems([])
  }
  const cambiarClienteCarrito = async (cid, clienteId) => {
    await supabase.from('carritos').update({ cliente_id: clienteId || null }).eq('id', cid)
    await cargarCarritos()
  }
  const nuevoClienteRapido = async () => {
    const nombre = prompt('Nombre del nuevo cliente:')
    if (!nombre || !nombre.trim()) return
    const norm = nombre.trim().toLowerCase()
    const existe = carClientes.find(c => c.nombre?.trim().toLowerCase() === norm)
    if (existe) { await cambiarClienteCarrito(carActivo, existe.id); const { data } = await supabase.from('clientes').select('id,nombre').eq('empresa_id', eid).eq('activo', true).order('nombre'); if (data) setCarClientes(data); notify('Ese cliente ya existía, lo asigné'); return }
    const tel = prompt('Teléfono (opcional):') || null
    const cod = 'C' + String(carClientes.length + 1).padStart(4, '0')
    const { data: nc, error } = await supabase.from('clientes').insert({ empresa_id: eid, codigo: cod, nombre: nombre.trim(), telefono: tel }).select().single()
    if (error) { notify('Error: ' + error.message, 'error'); return }
    const { data } = await supabase.from('clientes').select('id,nombre').eq('empresa_id', eid).eq('activo', true).order('nombre')
    if (data) setCarClientes(data)
    await cambiarClienteCarrito(carActivo, nc.id)
    notify('✅ Cliente creado y asignado')
  }
  const cerrarCarritoVacio = async (cid) => {
    if (!confirm('¿Descartar este carrito?')) return
    await supabase.from('carritos').delete().eq('id', cid)
    await cargarCarritos()
  }

  const agregarAlCarrito = async (p, precioUnit) => {
    let cid = carActivo
    if (!cid) { // crear uno si no hay activo
      const { data } = await supabase.from('carritos').insert({ empresa_id: eid, estado: 'abierto', nombre: 'Carrito 1' }).select().single()
      cid = data.id; await cargarCarritos(); setCarActivo(cid)
    }
    // proveedor del origen
    let provId = null
    if (p.origen_id) { const { data: og } = await supabase.from('origenes').select('proveedor_id').eq('id', p.origen_id).single(); provId = og?.proveedor_id || null }
    // ¿ya está en el carrito? suma cantidad
    const { data: existe } = await supabase.from('carrito_items').select('*').eq('carrito_id', cid).eq('producto_id', p.id).maybeSingle()
    if (existe) {
      await supabase.from('carrito_items').update({ cantidad: existe.cantidad + 1 }).eq('id', existe.id)
    } else {
      await supabase.from('carrito_items').insert({ carrito_id: cid, producto_id: p.id, codigo: p.codigo, nombre: p.nombre, precio_costo: p.precio_costo || 0, precio_unit: precioUnit ?? p.precio_venta, cantidad: 1, origen_id: p.origen_id || null, proveedor_id: provId })
    }
    await cargarItems(cid); await cargarCarritos()
    notify('🛒 ' + p.nombre + ' al carrito')
  }

  const setItemCant = async (item, cant) => {
    const n = parseInt(cant) || 0
    if (n <= 0) { await supabase.from('carrito_items').delete().eq('id', item.id) }
    else { await supabase.from('carrito_items').update({ cantidad: n }).eq('id', item.id) }
    await cargarItems(carActivo)
  }
  const setItemPrecio = async (item, precio) => {
    const p = parseFloat(precio)
    if (isNaN(p)) return
    await supabase.from('carrito_items').update({ precio_unit: p }).eq('id', item.id)
    await cargarItems(carActivo)
  }
  const quitarItem = async (item) => { await supabase.from('carrito_items').delete().eq('id', item.id); await cargarItems(carActivo) }

  const totalCarrito = carItems.reduce((s, it) => s + it.precio_unit * it.cantidad, 0)

  const liquidarCarrito = async () => {
    if (!carItems.length) { notify('El carrito está vacío', 'error'); return }
    const car = carritos.find(c => c.id === carActivo)
    setCarLiq(true)
    try {
      const fechaVenta = liqFecha ? new Date(liqFecha + 'T12:00:00').toISOString() : new Date().toISOString()
      // 1) una venta por prenda
      for (const it of carItems) {
        await supabase.from('ventas').insert({
          empresa_id: eid, producto_id: it.producto_id, cliente_id: car?.cliente_id || null,
          codigo_producto: it.codigo, nombre_producto: it.nombre,
          precio_costo: it.precio_costo || 0, precio_venta_original: it.precio_unit, precio_venta_real: it.precio_unit,
          cantidad: it.cantidad, total: it.precio_unit * it.cantidad, metodo_pago: liqMetodo, tipo_entrega: 'Tienda',
          estado: 'entregado', costo_devuelto: false, proveedor_id: it.proveedor_id || null, origen_id: it.origen_id || null,
          created_at: fechaVenta
        })
        // 2) descontar stock
        if (it.producto_id) {
          const { data: prod } = await supabase.from('productos').select('cantidad, equivalente_granel, origen_id').eq('id', it.producto_id).single()
          if (prod) {
            if (prod.equivalente_granel && prod.origen_id) {
              const { data: og } = await supabase.from('origenes').select('stock_granel').eq('id', prod.origen_id).single()
              if (og) await supabase.from('origenes').update({ stock_granel: (og.stock_granel || 0) - (prod.equivalente_granel * it.cantidad) }).eq('id', prod.origen_id)
            } else {
              await supabase.from('productos').update({ cantidad: (prod.cantidad || 0) - it.cantidad }).eq('id', it.producto_id)
            }
          }
        }
      }
      // 3) cerrar carrito
      await supabase.from('carritos').update({ estado: 'liquidado' }).eq('id', carActivo)
      notify(`✅ Carrito liquidado: S/${totalCarrito.toFixed(2)} (${liqMetodo})`)
      setLiqOpen(false); setLiqFecha(''); setLiqMetodo('Efectivo')
      await cargarCarritos(); await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setCarLiq(false)
  }
  // Venta rápida
  const [vrOpen, setVrOpen] = useState(false)
  const [vrMas, setVrMas] = useState(false)
  const [vrSaving, setVrSaving] = useState(false)
  const [vr, setVr] = useState({ nombre: '', precio: '', cantidad: '1', costo: '', proveedor_id: '', origen_id: '', color: '', metodo: 'Efectivo', stock_extra: '' })
  const [vrProv, setVrProv] = useState([])
  const [vrFoto, setVrFoto] = useState(null) // {blob, preview}
  const vrGalRef = useRef(null)
  const vrCamRef = useRef(null)
  useEffect(() => { if (vrOpen && !vrProv.length) { (async () => { const { data } = await supabase.from('proveedores').select('*').eq('empresa_id', eid).eq('activo', true).order('nombre'); if (data) setVrProv(data) })() } }, [vrOpen])

  const ventaRapidaAlCarrito = async () => {
    if (!vr.nombre.trim()) { notify('Nombre obligatorio', 'error'); return }
    const precio = parseFloat(vr.precio)
    const cantVender = parseInt(vr.cantidad) || 1
    if (isNaN(precio) || precio <= 0) { notify('Precio inválido', 'error'); return }
    setVrSaving(true)
    try {
      const { data: cods } = await supabase.from('productos').select('codigo').eq('empresa_id', eid)
      const nums = (cods || []).map(p => parseInt(p.codigo)).filter(n => !isNaN(n))
      const codigo = String(nums.length ? Math.max(...nums) + 1 : 1).padStart(3, '0')
      const costo = vr.costo !== '' ? parseFloat(vr.costo) : 0
      const stockCrear = vr.stock_extra !== '' ? (parseInt(vr.stock_extra) || 0) : cantVender
      let foto_url = null
      if (vrFoto?.blob) { const comp = await comprimirImagen(new File([vrFoto.blob], 'vr.jpg', { type: vrFoto.blob.type || 'image/jpeg' })); foto_url = await subirFoto(comp, codigo + '_' + Date.now()) }
      const { data: prod, error: e1 } = await supabase.from('productos').insert({
        empresa_id: eid, linea_id: lid, codigo, nombre: vr.nombre.trim(),
        precio_costo: costo, precio_venta: precio, cantidad: stockCrear,
        color: vr.color || null, origen_id: vr.origen_id || null, es_generico: true, activo: true, foto_url
      }).select().single()
      if (e1) throw e1
      if (foto_url) await supabase.from('fotos_producto').insert({ producto_id: prod.id, url: foto_url, es_principal: true, orden: 0 })
      // agregar al carrito (cantVender veces → una línea con esa cantidad)
      let provId = vr.proveedor_id || null
      if (!provId && vr.origen_id) { const { data: og } = await supabase.from('origenes').select('proveedor_id').eq('id', vr.origen_id).single(); provId = og?.proveedor_id || null }
      let cid = carActivo
      if (!cid) { const { data: nc } = await supabase.from('carritos').insert({ empresa_id: eid, estado: 'abierto', nombre: 'Carrito 1' }).select().single(); cid = nc.id; setCarActivo(cid) }
      await supabase.from('carrito_items').insert({ carrito_id: cid, producto_id: prod.id, codigo, nombre: vr.nombre.trim(), precio_costo: costo, precio_unit: precio, cantidad: cantVender, origen_id: vr.origen_id || null, proveedor_id: provId })
      notify('🛒 ' + vr.nombre + ' al carrito')
      setVrOpen(false); setVrMas(false); setVrFoto(null); setVr({ nombre: '', precio: '', cantidad: '1', costo: '', proveedor_id: '', origen_id: '', color: '', metodo: 'Efectivo', stock_extra: '' })
      await cargarCarritos(); await cargarItems(cid); await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setVrSaving(false)
  }

  const setFotoVr = (file) => { if (!file) return; setVrFoto({ blob: file, preview: URL.createObjectURL(file) }) }
  useEffect(() => {
    if (!vrOpen || !vrMas) return
    const onPaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const it of items) { if (it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) { setFotoVr(f); notify('📋 Foto pegada') } break } }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [vrOpen, vrMas])

  const ventaRapida = async () => {
    if (!vr.nombre.trim()) { notify('Nombre obligatorio', 'error'); return }
    const precio = parseFloat(vr.precio)
    const cantVender = parseInt(vr.cantidad) || 1
    if (isNaN(precio) || precio <= 0) { notify('Precio inválido', 'error'); return }
    setVrSaving(true)
    try {
      // código automático
      const { data: cods } = await supabase.from('productos').select('codigo').eq('empresa_id', eid)
      const nums = (cods || []).map(p => parseInt(p.codigo)).filter(n => !isNaN(n))
      const codigo = String(nums.length ? Math.max(...nums) + 1 : 1).padStart(3, '0')
      const costo = vr.costo !== '' ? parseFloat(vr.costo) : 0
      const stockCrear = vr.stock_extra !== '' ? (parseInt(vr.stock_extra) || 0) : cantVender // en modo mínimo = lo que se vende
      // foto opcional
      let foto_url = null
      if (vrFoto?.blob) { const comp = await comprimirImagen(new File([vrFoto.blob], 'vr.jpg', { type: vrFoto.blob.type || 'image/jpeg' })); foto_url = await subirFoto(comp, codigo + '_' + Date.now()) }
      // crear producto genérico
      const { data: prod, error: e1 } = await supabase.from('productos').insert({
        empresa_id: eid, linea_id: lid, codigo, nombre: vr.nombre.trim(),
        precio_costo: costo, precio_venta: precio, cantidad: stockCrear,
        color: vr.color || null, origen_id: vr.origen_id || null, es_generico: true, activo: true, foto_url
      }).select().single()
      if (e1) throw e1
      if (foto_url) { await supabase.from('fotos_producto').insert({ producto_id: prod.id, url: foto_url, es_principal: true, orden: 0 }) }
      // proveedor: del origen elegido, o el elegido directo
      let provId = vr.proveedor_id || null
      if (!provId && vr.origen_id) { const { data: og } = await supabase.from('origenes').select('proveedor_id').eq('id', vr.origen_id).single(); provId = og?.proveedor_id || null }
      // registrar venta
      const { error: e2 } = await supabase.from('ventas').insert({
        empresa_id: eid, producto_id: prod.id, codigo_producto: codigo, nombre_producto: vr.nombre.trim(),
        precio_costo: costo, precio_venta_original: precio, precio_venta_real: precio,
        cantidad: cantVender, total: precio * cantVender, metodo_pago: vr.metodo, tipo_entrega: 'Tienda',
        estado: 'entregado', costo_devuelto: false, proveedor_id: provId, origen_id: vr.origen_id || null
      })
      if (e2) throw e2
      // descontar stock vendido
      await supabase.from('productos').update({ cantidad: stockCrear - cantVender }).eq('id', prod.id)
      notify(`✅ Venta rápida: ${vr.nombre} (S/${(precio * cantVender).toFixed(2)})`)
      setVrOpen(false); setVrMas(false); setVrFoto(null); setVr({ nombre: '', precio: '', cantidad: '1', costo: '', proveedor_id: '', origen_id: '', color: '', metodo: 'Efectivo', stock_extra: '' })
      await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setVrSaving(false)
  }
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('cat_vista') || 'grande' } catch { return 'grande' } })
  const ciclarVista = () => { const orden = ['grande', 'pequeno', 'lista']; const next = orden[(orden.indexOf(vista) + 1) % 3]; setVista(next); try { localStorage.setItem('cat_vista', next) } catch (e) {} }
  const vistaIcono = vista === 'grande' ? '▦' : vista === 'pequeno' ? '▪▪' : '☰'
  const vistaLabel = vista === 'grande' ? 'Grande' : vista === 'pequeno' ? 'Pequeño' : 'Lista'
  const origenesDisp = [...new Set(prods.map(p => p.origenes?.nombre).filter(Boolean))].sort()
  const fl = prods.filter(p =>
    (!f || p.nombre?.toLowerCase().includes(f.toLowerCase()) || p.codigo?.toLowerCase().includes(f.toLowerCase())) &&
    (!fOrigen || p.origenes?.nombre === fOrigen) &&
    (verGenericos || !ocultarAgotados || p.cantidad > 0) &&
    (verOcultos ? true : !p.oculto) &&
    (verGenericos ? p.es_generico : true) &&
    (!bvIds || bvIds.has(p.id))
  )

  // ── Selección múltiple + ZIP fotos ──
  const [modoSel, setModoSel] = useState(false)
  const [modoNav, setModoNav] = useState(false)
  const [navIdx, setNavIdx] = useState(null) // índice en fl del producto en el visor
  const [sel, setSel] = useState([]) // ids seleccionados
  const [trabajando, setTrabajando] = useState('')
  const [pideTipo, setPideTipo] = useState(false)
  const fileZipRef = useRef(null)

  const toggleSel = (id) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const selTodos = () => setSel(fl.map(p => p.id))
  const limpiarSel = () => setSel([])

  // ── Drag-select (pintar al arrastrar, solo desktop en modo selección) ──
  const [arrastrando, setArrastrando] = useState(false)
  const [modoArrastre, setModoArrastre] = useState(true) // true = marcar, false = desmarcar
  const iniciarArrastre = (p) => {
    const yaSel = sel.includes(p.id)
    const marcar = !yaSel
    setModoArrastre(marcar)
    setArrastrando(true)
    setSel(s => marcar ? (s.includes(p.id) ? s : [...s, p.id]) : s.filter(x => x !== p.id))
  }
  const pintarArrastre = (p) => {
    if (!arrastrando) return
    setSel(s => modoArrastre ? (s.includes(p.id) ? s : [...s, p.id]) : s.filter(x => x !== p.id))
  }
  useEffect(() => {
    if (!arrastrando) return
    const fin = () => setArrastrando(false)
    window.addEventListener('mouseup', fin)
    return () => window.removeEventListener('mouseup', fin)
  }, [arrastrando])

  // ── Acciones masivas ──
  const ocultarSel = async (valor) => {
    if (!sel.length) return
    setTrabajando(valor ? 'Ocultando...' : 'Mostrando...')
    try {
      await supabase.from('productos').update({ oculto: valor }).in('id', sel)
      notify(`✅ ${sel.length} ${valor ? 'ocultados' : 'mostrados'}`)
      limpiarSel(); await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setTrabajando('')
  }
  const eliminarSel = async () => {
    if (!sel.length) return
    if (!confirm(`¿Eliminar ${sel.length} productos? Esta acción no se puede deshacer.`)) return
    if (!confirm('Confirma de nuevo: se eliminarán definitivamente.')) return
    setTrabajando('Eliminando...')
    try {
      await supabase.from('productos').update({ activo: false }).in('id', sel)
      notify(`✅ ${sel.length} eliminados`)
      limpiarSel(); await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setTrabajando('')
  }

  // ── Cambiar origen masivo ──
  const [pideOrigen, setPideOrigen] = useState(false)
  const [nuevoOrigen, setNuevoOrigen] = useState('')
  const cambiarOrigen = async () => {
    if (!nuevoOrigen) { notify('Elige un origen', 'error'); return }
    const oNom = (oris || []).find(o => o.id === parseInt(nuevoOrigen))?.nombre || ''
    if (!confirm(`¿Mover ${sel.length} productos al origen "${oNom}"?`)) return
    setPideOrigen(false); setTrabajando('Cambiando origen...')
    try {
      await supabase.from('productos').update({ origen_id: parseInt(nuevoOrigen) }).in('id', sel)
      notify(`✅ ${sel.length} movidos a ${oNom}`)
      limpiarSel(); setNuevoOrigen(''); await loadAll()
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setTrabajando('')
  }

  // ── Modo navegación (visor) ──
  const navProd = navIdx != null ? fl[navIdx] : null
  const abrirNav = (p) => { const i = fl.findIndex(x => x.id === p.id); setNavIdx(i >= 0 ? i : 0) }
  const cerrarNav = () => setNavIdx(null)
  const editarDesdeNav = () => {
    if (!navProd) return
    if (setRetorno) setRetorno('catalogo')
    setEditP(navProd); cerrarNav(); setScr('registrar')
  }

  // Dibuja el código en una franja blanca inferior (para lectura por IA/OCR)
  const fotoConCodigo = (fotoUrl, codigo) => new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = img.naturalWidth, h = img.naturalHeight
        const franja = Math.max(70, Math.round(h * 0.15)) // 15% del alto, mínimo 70px
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h + franja
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, w, h)
        // texto del código, centrado en la franja
        const texto = 'COD: ' + codigo
        let fontSize = Math.round(franja * 0.55)
        ctx.fillStyle = '#000000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `bold ${fontSize}px Arial, sans-serif`
        // reducir si no cabe a lo ancho
        while (ctx.measureText(texto).width > w * 0.92 && fontSize > 12) {
          fontSize -= 2; ctx.font = `bold ${fontSize}px Arial, sans-serif`
        }
        ctx.fillText(texto, w / 2, h + franja / 2)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob null')), 'image/jpeg', 0.9)
      } catch (e) { reject(e) }
    }
    img.onerror = () => reject(new Error('no se pudo cargar la imagen'))
    img.src = fotoUrl
  })

  const descargarZip = async (conCodigo) => {
    if (!window.JSZip) { notify('No cargó JSZip, recarga la página', 'error'); return }
    setPideTipo(false)
    const elegidos = fl.filter(p => sel.includes(p.id) && p.foto_url)
    const sinFoto = sel.length - elegidos.length
    if (!elegidos.length) { notify('Ninguno de los seleccionados tiene foto', 'error'); return }
    setTrabajando('Generando ZIP...')
    let fallidas = 0
    try {
      const zip = new window.JSZip()
      for (let i = 0; i < elegidos.length; i++) {
        const p = elegidos[i]
        setTrabajando(`Procesando ${i + 1}/${elegidos.length}...`)
        try {
          if (conCodigo) {
            const blob = await fotoConCodigo(p.foto_url, p.codigo)
            zip.file(`${p.codigo}.jpg`, blob)
          } else {
            const resp = await fetch(p.foto_url)
            const blob = await resp.blob()
            zip.file(`${p.codigo}.jpg`, blob)
          }
        } catch (e) { fallidas++ }
      }
      setTrabajando('Comprimiendo...')
      const contenido = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(contenido)
      const a = document.createElement('a')
      const sufijo = conCodigo ? '_con_codigo' : ''
      a.href = url; a.download = `fotos${sufijo}_${(linAct?.nombre || 'catalogo')}_${new Date().toISOString().split('T')[0]}.zip`
      a.click(); URL.revokeObjectURL(url)
      let msg = `✅ ${elegidos.length - fallidas} fotos`
      if (fallidas > 0) msg += `, ${fallidas} fallaron`
      if (sinFoto > 0) msg += `, ${sinFoto} sin foto`
      notify(msg)
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setTrabajando('')
  }

  const subirZip = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permitir resubir el mismo
    if (!file) return
    if (!window.JSZip) { notify('No cargó JSZip, recarga la página', 'error'); return }
    setTrabajando('Leyendo ZIP...')
    try {
      const zip = await window.JSZip.loadAsync(file)
      const archivos = Object.values(zip.files).filter(f => !f.dir && /\.(jpe?g|png|webp)$/i.test(f.name))
      if (!archivos.length) { notify('El ZIP no tiene imágenes jpg/png/webp', 'error'); setTrabajando(''); return }
      let ok = 0, noEnc = 0
      const noEncontrados = []
      for (let i = 0; i < archivos.length; i++) {
        const f2 = archivos[i]
        setTrabajando(`Subiendo ${i + 1}/${archivos.length}...`)
        // código = nombre sin carpeta ni extensión
        const base = f2.name.split('/').pop()
        const codigo = base.replace(/\.(jpe?g|png|webp)$/i, '').trim()
        const prod = prods.find(p => String(p.codigo) === codigo)
        if (!prod) { noEnc++; noEncontrados.push(codigo); continue }
        try {
          const blob = await f2.async('blob')
          const comprimida = await comprimirImagen(new File([blob], base, { type: blob.type || 'image/jpeg' }))
          const url = await subirFoto(comprimida, prod.codigo + '_' + Date.now())
          // marcar todas las anteriores como no principal, insertar nueva como principal
          await supabase.from('fotos_producto').update({ es_principal: false }).eq('producto_id', prod.id)
          await supabase.from('fotos_producto').insert({ producto_id: prod.id, url, es_principal: true, orden: 0 })
          await supabase.from('productos').update({ foto_url: url }).eq('id', prod.id)
          ok++
        } catch (er) { noEnc++; noEncontrados.push(codigo + '(error)') }
      }
      setTrabajando('')
      let msg = `✅ ${ok} fotos subidas como principal`
      if (noEnc > 0) msg += `. ${noEnc} no procesados: ${noEncontrados.slice(0, 8).join(', ')}${noEncontrados.length > 8 ? '...' : ''}`
      notify(msg)
      await loadAll()
    } catch (er) { notify('Error al leer ZIP: ' + er.message, 'error'); setTrabajando('') }
  }

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
      <div style={{ position: 'sticky', top: 0, zIndex: 40 }}>
      <div style={{ background: G.gold, padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, margin: 0 }}>{emp?.nombre}</p>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>📦 Catálogo</h1>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button onClick={() => setCarOpen(true)} style={{ background: carritos.length ? '#059669' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>🛒 Carritos{carritos.length ? ' (' + carritos.length + ')' : ''}</button>
            <button onClick={() => { setVrOpen(true); setVrMas(false) }} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', color: G.gold, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>⚡ Venta rápida</button>
            <button onClick={ciclarVista} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{vistaIcono} {vistaLabel}</button>
            <button onClick={() => { setModoNav(n => !n); setModoSel(false); limpiarSel() }} style={{ background: modoNav ? '#fff' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: modoNav ? G.gold : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{modoNav ? '✕ Salir' : '👁️ Ver'}</button>
            <button onClick={() => { setModoSel(m => !m); setModoNav(false); limpiarSel() }} style={{ background: modoSel ? '#fff' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: modoSel ? G.gold : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{modoSel ? '✕ Cancelar' : '☑️ Sel'}</button>
            <button onClick={() => fileZipRef.current?.click()} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>📤 ZIP</button>
            <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>🔄</button>
            <button onClick={exportar} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>📥</button>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>Salir</button>
          </div>
          <input ref={fileZipRef} type="file" accept=".zip" onChange={subirZip} style={{ display: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={f} onChange={e => setF(e.target.value)} placeholder="Filtrar por nombre, código..."
            style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.9)', boxSizing: 'border-box' }} />
          <button onClick={() => { setBvOpen(true); setBvFoto(null) }} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#fff', color: G.gold, fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>📷</button>
        </div>
        {bvLabel && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '6px 12px', marginTop: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: G.goldDk }}>{bvLabel}</span>
            <button onClick={limpiarBV} style={{ background: 'none', border: 'none', color: G.err, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕ Quitar</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          {origenesDisp.length > 0 && (
            <select value={fOrigen} onChange={e => setFOrigen(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.9)', boxSizing: 'border-box', color: G.text }}>
              <option value="">📋 Origen: todos</option>
              {origenesDisp.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          <button onClick={() => setOcultarAgotados(v => !v)} style={{ padding: '8px 10px', borderRadius: 10, border: 'none', background: ocultarAgotados ? '#fff' : 'rgba(255,255,255,0.2)', color: ocultarAgotados ? G.gold : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{ocultarAgotados ? '✓ Sin agotados' : 'Ver agotados'}</button>
          <button onClick={() => setVerOcultos(v => !v)} style={{ padding: '8px 10px', borderRadius: 10, border: 'none', background: verOcultos ? '#374151' : 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{verOcultos ? '👁️‍🗨️ Viendo ocultos' : 'Ver ocultos'}</button>
          <button onClick={() => setVerGenericos(v => !v)} style={{ padding: '8px 10px', borderRadius: 10, border: 'none', background: verGenericos ? '#fff' : 'rgba(255,255,255,0.2)', color: verGenericos ? G.gold : '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{verGenericos ? '⚡ Solo genéricos' : 'Genéricos'}</button>
        </div>
      </div>
      <div style={{ background: '#fff' }}>
        <LineSel lineas={lineas} linAct={linAct} setLinAct={setLinAct} />
      </div>
      </div>
      <div style={{ padding: '4px 12px 0', fontSize: 12, color: G.muted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{fl.length} productos</span>
        {modoSel && <span style={{ display: 'flex', gap: 8 }}><button onClick={selTodos} style={{ background: 'none', border: 'none', color: G.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Todos</button><button onClick={limpiarSel} style={{ background: 'none', border: 'none', color: G.err, fontSize: 12, cursor: 'pointer' }}>Ninguno</button></span>}
      </div>
      {fl.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: G.muted }}>
          <p style={{ fontSize: 40 }}>📦</p><p>No hay productos</p>
          <button onClick={() => setScr('registrar')} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>➕ Registrar</button>
        </div>
      ) : (
        vista === 'lista' ? (
          <div style={{ padding: '8px 12px 16px' }}>
            {fl.map(p => (
              <div key={p.id}
                onMouseDown={() => { if (modoSel) iniciarArrastre(p) }}
                onMouseEnter={() => { if (modoSel) pintarArrastre(p) }}
                onClick={() => modoSel ? null : modoNav ? abrirNav(p) : setViewerProd(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 10, padding: 8, marginBottom: 6, border: modoSel && sel.includes(p.id) ? '2px solid ' + G.gold : '1px solid ' + G.border, opacity: p.oculto ? 0.5 : 1, cursor: 'pointer', userSelect: modoSel ? 'none' : 'auto' }}>
                {modoSel && <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 12, background: sel.includes(p.id) ? G.gold : '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800 }}>{sel.includes(p.id) ? '✓' : ''}</div>}
                {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 48, height: 48, background: G.goldLt, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 18, opacity: 0.3 }}>📦</span></div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}{p.oculto ? ' 👁️‍🗨️' : ''}</p>
                  <p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{p.codigo} • Stock: {p.cantidad}{p.color ? ' • ' + p.color : ''}</p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: G.gold, flexShrink: 0 }}>S/{p.precio_venta}</span>
              </div>
            ))}
          </div>
        ) : (
        <div style={{ padding: '8px 12px 16px', display: 'grid', gridTemplateColumns: vista === 'pequeno' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 8 }}>
          {fl.map(p => (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: modoSel && sel.includes(p.id) ? '2px solid ' + G.gold : '1px solid ' + G.border, opacity: p.oculto ? 0.5 : 1, userSelect: modoSel ? 'none' : 'auto' }}>
              <div
                onMouseDown={() => { if (modoSel) iniciarArrastre(p) }}
                onMouseEnter={() => { if (modoSel) pintarArrastre(p) }}
                onClick={() => modoSel ? null : modoNav ? abrirNav(p) : setViewerProd(p)}
                style={{ cursor: 'pointer', position: 'relative' }}>
                {modoSel && <div style={{ position: 'absolute', top: 6, left: 6, zIndex: 2, width: 26, height: 26, borderRadius: 13, background: sel.includes(p.id) ? G.gold : 'rgba(255,255,255,0.85)', border: '2px solid ' + (sel.includes(p.id) ? G.gold : '#fff'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800 }}>{sel.includes(p.id) ? '✓' : ''}</div>}
                {p.oculto && <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, background: '#374151', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6 }}>👁️‍🗨️ Oculto</div>}
                {p.foto_url
                  ? <img src={p.foto_url} alt="" style={{ width: '100%', height: vista === 'pequeno' ? 90 : 130, objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: vista === 'pequeno' ? 90 : 130, background: G.goldLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 36, opacity: 0.3 }}>📦</span></div>
                }
                <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: '2px 6px', fontSize: 9, color: '#fff', pointerEvents: 'none' }}>{modoSel ? 'Tocar' : modoNav ? '👁️ Abrir' : '👁 Ver'}</div>
              </div>
              <div style={{ padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <span style={{ fontSize: 9, background: G.goldSf, color: G.goldDk, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>{p.codigo}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: G.gold }}>S/{p.precio_venta}</span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, margin: '3px 0 1px', color: G.text, lineHeight: 1.2 }}>{p.nombre}</p>
                <p style={{ fontSize: 9, color: G.muted, margin: 0 }}>Stock: {p.cantidad} {p.color ? '• ' + p.color : ''}</p>
                {vista !== 'pequeno' && p.secciones?.nombre && <p style={{ fontSize: 8, color: G.goldDk, margin: '1px 0 0', fontWeight: 600 }}>🗂️ {p.secciones.nombre}</p>}
                {vista === 'pequeno' ? (
                <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                  <button onClick={() => { setEditP(p); setScr('registrar') }} style={{ flex: 1, padding: 4, borderRadius: 5, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => agregarAlCarrito(p)} disabled={p.cantidad <= 0} style={{ flex: 1, padding: 4, borderRadius: 5, border: 'none', background: p.cantidad > 0 ? '#059669' : '#ccc', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>🛒 Vender</button>
                </div>
                ) : (
                <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                  <button onClick={() => { setEditP(p); setScr('registrar') }} style={{ flex: 1, padding: 4, borderRadius: 5, border: '1px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => agregarAlCarrito(p)} disabled={p.cantidad <= 0} style={{ flex: 1, padding: 4, borderRadius: 5, border: 'none', background: p.cantidad > 0 ? '#059669' : '#ccc', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>🛒 Vender</button>
                  {p.foto_url && <button onClick={() => downloadPhoto(p.foto_url, p.codigo)} style={{ padding: 4, borderRadius: 5, border: '1px solid ' + G.border, background: 'transparent', color: G.gold, fontSize: 9, cursor: 'pointer' }}>📥</button>}
                  <button onClick={() => eliminar(p)} style={{ padding: 4, borderRadius: 5, border: '1px solid #eee', background: 'transparent', color: G.err, fontSize: 9, cursor: 'pointer' }}>🗑</button>
                </div>
                )}
              </div>
            </div>
          ))}
        </div>
        )
      )}

      {/* Barra flotante: descargar ZIP de seleccionados */}
      {modoSel && sel.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid ' + G.border, padding: 12, boxShadow: '0 -2px 12px rgba(0,0,0,0.12)', zIndex: 50 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: G.text, textAlign: 'center' }}>{sel.length} seleccionados</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => setPideTipo(true)} style={{ padding: 11, borderRadius: 10, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📦 Descargar ZIP</button>
            <button onClick={() => { setNuevoOrigen(''); setPideOrigen(true) }} style={{ padding: 11, borderRadius: 10, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📋 Cambiar origen</button>
            <button onClick={() => ocultarSel(true)} style={{ padding: 11, borderRadius: 10, border: 'none', background: '#374151', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>👁️‍🗨️ Ocultar</button>
            <button onClick={() => ocultarSel(false)} style={{ padding: 11, borderRadius: 10, border: 'none', background: G.ok, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>👁️ Mostrar</button>
            <button onClick={eliminarSel} style={{ padding: 11, borderRadius: 10, border: 'none', background: G.err, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', gridColumn: '1 / -1' }}>🗑️ Eliminar</button>
          </div>
        </div>
      )}

      {/* Visor de navegación */}
      {navProd && (
        <div onClick={cerrarNav} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ background: G.gold, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 800, margin: 0 }}>{navIdx + 1} / {fl.length}</p>
              <button onClick={cerrarNav} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              {navProd.foto_url
                ? <img src={navProd.foto_url} alt="" style={{ width: '100%', height: 340, objectFit: 'contain', borderRadius: 12, background: G.goldLt }} />
                : <div style={{ width: '100%', height: 340, background: G.goldLt, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 48, opacity: 0.3 }}>📦</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 11, background: G.goldSf, color: G.goldDk, padding: '3px 8px', borderRadius: 5, fontWeight: 700 }}>{navProd.codigo}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: G.gold }}>S/{navProd.precio_venta}</span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, margin: '6px 0 2px', color: G.text }}>{navProd.nombre}{navProd.oculto ? ' 👁️‍🗨️' : ''}</p>
              <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>Stock: {navProd.cantidad}{navProd.color ? ' • ' + navProd.color : ''}{navProd.atributos?.talla ? ' • T:' + navProd.atributos.talla : ''}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => setNavIdx(i => Math.max(0, i - 1))} disabled={navIdx === 0} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: navIdx === 0 ? '#f5f5f5' : '#fff', color: navIdx === 0 ? '#bbb' : G.text, fontSize: 13, fontWeight: 700, cursor: navIdx === 0 ? 'default' : 'pointer' }}>‹ Anterior</button>
                <button onClick={() => setNavIdx(i => Math.min(fl.length - 1, i + 1))} disabled={navIdx >= fl.length - 1} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + G.border, background: navIdx >= fl.length - 1 ? '#f5f5f5' : '#fff', color: navIdx >= fl.length - 1 ? '#bbb' : G.text, fontSize: 13, fontWeight: 700, cursor: navIdx >= fl.length - 1 ? 'default' : 'pointer' }}>Siguiente ›</button>
              </div>
              <button onClick={editarDesdeNav} style={{ width: '100%', padding: 13, marginTop: 8, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✏️ Editar en catálogo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: búsqueda visual */}
      {bvOpen && (
        <div onClick={() => { setBvOpen(false); setBvFoto(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 165, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: G.text }}>📷 Buscar por foto</h3>
            <p style={{ fontSize: 12, color: G.muted, margin: '0 0 14px' }}>Toma, carga o pega una foto (Ctrl+V)</p>
            {bvFoto ? (
              <>
                <img src={bvFoto.preview} alt="" style={{ width: '100%', height: 200, objectFit: 'contain', borderRadius: 10, background: G.goldLt, marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={buscarColor} disabled={bvBusy} style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{bvBusy ? '⏳' : '🎨 Por color'}</button>
                  <button onClick={buscarSimilar} disabled={bvBusy} style={{ flex: 1, padding: 13, borderRadius: 10, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{bvBusy ? '⏳' : '🔍 Similar'}</button>
                </div>
                <button onClick={() => setBvFoto(null)} style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 10, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Otra foto</button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => bvGalRef.current?.click()} style={{ flex: 1, padding: 16, borderRadius: 10, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🖼️ Galería</button>
                  <button onClick={() => bvCamRef.current?.click()} style={{ flex: 1, padding: 16, borderRadius: 10, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>📷 Cámara</button>
                </div>
                <p style={{ fontSize: 11, color: G.muted, textAlign: 'center', margin: '10px 0 0' }}>o pega una imagen con Ctrl+V</p>
              </>
            )}
            <input ref={bvGalRef} type="file" accept="image/*" onChange={e => { const f2 = e.target.files?.[0]; if (f2) recibirFotoBV(f2); e.target.value = '' }} style={{ display: 'none' }} />
            <input ref={bvCamRef} type="file" accept="image/*" capture="environment" onChange={e => { const f2 = e.target.files?.[0]; if (f2) recibirFotoBV(f2); e.target.value = '' }} style={{ display: 'none' }} />
            <button onClick={() => { setBvOpen(false); setBvFoto(null) }} style={{ width: '100%', padding: 10, marginTop: 12, borderRadius: 10, border: 'none', background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Panel de carritos */}
      {carOpen && (
        <div onClick={() => setCarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 170, padding: 12 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '94vh', overflow: 'auto' }}>
            <div style={{ background: '#059669', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 2 }}>
              <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>🛒 Carritos de venta</p>
              <button onClick={() => setCarOpen(false)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 14 }}>
              {/* Pestañas de carritos */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {carritos.map(c => (
                  <button key={c.id} onClick={() => setCarActivo(c.id)} style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid ' + (carActivo === c.id ? '#059669' : G.border), background: carActivo === c.id ? '#059669' : '#fff', color: carActivo === c.id ? '#fff' : G.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {c.clientes?.nombre || c.nombre || 'Carrito'}
                  </button>
                ))}
                <button onClick={nuevoCarrito} style={{ padding: '7px 12px', borderRadius: 10, border: '1px dashed ' + G.gold, background: '#fff', color: G.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Nuevo</button>
              </div>

              {!carActivo ? (
                <div style={{ textAlign: 'center', padding: 30, color: G.muted }}>
                  <p style={{ fontSize: 36 }}>🛒</p>
                  <p>No hay carritos abiertos.</p>
                  <button onClick={nuevoCarrito} style={{ marginTop: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Abrir carrito</button>
                </div>
              ) : (
                <>
                  {/* Cliente del carrito */}
                  <label style={{ fontSize: 11, color: G.muted }}>Cliente de este carrito</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    <select value={carritos.find(c => c.id === carActivo)?.cliente_id || ''} onChange={e => cambiarClienteCarrito(carActivo, e.target.value)} style={{ flex: 1, padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}>
                      <option value="">— Sin cliente —</option>
                      {carClientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <button onClick={nuevoClienteRapido} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Nuevo</button>
                  </div>

                  {/* Items */}
                  {carItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: G.muted, fontSize: 13 }}>Carrito vacío. Agrega prendas desde el catálogo con el botón 🛒</div>
                  ) : carItems.map(it => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid ' + G.border }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nombre}</p>
                        <p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{it.codigo}</p>
                      </div>
                      <input type="number" value={it.cantidad} onChange={e => setItemCant(it, e.target.value)} style={{ width: 44, padding: '5px', borderRadius: 6, border: '1px solid ' + G.border, fontSize: 12, textAlign: 'center' }} />
                      <span style={{ fontSize: 11, color: G.muted }}>×</span>
                      <input type="number" value={it.precio_unit} onChange={e => setItemPrecio(it, e.target.value)} style={{ width: 56, padding: '5px', borderRadius: 6, border: '1px solid ' + G.border, fontSize: 12, textAlign: 'right' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: G.gold, width: 52, textAlign: 'right' }}>S/{(it.precio_unit * it.cantidad).toFixed(0)}</span>
                      <button onClick={() => quitarItem(it)} style={{ padding: '4px 7px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: G.err, fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}

                  {/* Total + acciones */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0' }}>
                    <span style={{ fontSize: 13, color: G.muted }}>{carItems.length} prendas</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#059669' }}>Total: S/{totalCarrito.toFixed(2)}</span>
                  </div>
                  <button onClick={() => { setLiqMetodo('Efectivo'); setLiqFecha(''); setLiqOpen(true) }} disabled={carLiq || !carItems.length} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: carItems.length ? '#059669' : '#ccc', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>💰 Liquidar venta</button>
                  <button onClick={() => cerrarCarritoVacio(carActivo)} style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 10, border: '1px solid ' + G.border, background: 'transparent', color: G.err, fontSize: 13, cursor: 'pointer' }}>🗑 Descartar carrito</button>
                </>
              )}
            </div>

            {/* Sub-diálogo: método + fecha al liquidar */}
            {liqOpen && (
              <div onClick={() => setLiqOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 180, padding: 16 }}>
                <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, color: G.text }}>💰 Liquidar — S/{totalCarrito.toFixed(2)}</h3>
                  <p style={{ fontSize: 12, color: G.muted, margin: '0 0 14px' }}>{carItems.length} prendas</p>
                  <label style={{ fontSize: 11, color: G.muted }}>Método de pago</label>
                  <select value={liqMetodo} onChange={e => setLiqMetodo(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 14, background: '#fff', marginBottom: 10, boxSizing: 'border-box' }}>
                    <option value="Efectivo">💵 Efectivo</option><option value="Yape">📱 Yape</option><option value="Plin">📱 Plin</option><option value="Transferencia">🏦 Transferencia</option><option value="Por Pagar">⏳ Por Pagar (fiado)</option>
                  </select>
                  <label style={{ fontSize: 11, color: G.muted }}>Fecha de venta (vacío = hoy)</label>
                  <input type="date" value={liqFecha} onChange={e => setLiqFecha(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 14, boxSizing: 'border-box', marginBottom: 14 }} />
                  <button onClick={liquidarCarrito} disabled={carLiq} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{carLiq ? '⏳ Liquidando...' : '✅ Confirmar venta'}</button>
                  <button onClick={() => setLiqOpen(false)} style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 10, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: venta rápida */}
      {vrOpen && (
        <div onClick={() => setVrOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 160, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, maxHeight: '92vh', overflow: 'auto' }}>
            <div style={{ background: G.gold, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 }}>
              <p style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: 0 }}>⚡ Venta rápida</p>
              <button onClick={() => setVrOpen(false)} style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              <label style={{ fontSize: 11, color: G.muted }}>Nombre *</label>
              <input value={vr.nombre} onChange={e => setVr(s => ({ ...s, nombre: e.target.value }))} placeholder="Ej: Blusa suelta" autoFocus style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Precio *</label><input type="number" value={vr.precio} onChange={e => setVr(s => ({ ...s, precio: e.target.value }))} placeholder="S/" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 14, boxSizing: 'border-box' }} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Cantidad</label><input type="number" value={vr.cantidad} onChange={e => setVr(s => ({ ...s, cantidad: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 14, boxSizing: 'border-box' }} /></div>
              </div>

              <button onClick={() => setVrMas(m => !m)} style={{ marginTop: 10, background: 'none', border: 'none', color: G.gold, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>{vrMas ? '− Menos datos' : '+ Más datos (opcional)'}</button>

              {vrMas && (
                <div style={{ marginTop: 8, borderTop: '1px solid ' + G.border, paddingTop: 10 }}>
                  <label style={{ fontSize: 11, color: G.muted, display: 'block', marginBottom: 4 }}>Foto (pega del portapapeles o carga)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    {vrFoto
                      ? <img src={vrFoto.preview} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid ' + G.border }} />
                      : <div style={{ width: 60, height: 60, borderRadius: 8, background: G.goldLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, opacity: 0.4 }}>📷</div>}
                    <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                      <button onClick={() => vrGalRef.current?.click()} style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🖼️ Galería</button>
                      <button onClick={() => vrCamRef.current?.click()} style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid ' + G.gold, background: '#fff', color: G.goldDk, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>📷 Cámara</button>
                      {vrFoto && <button onClick={() => setVrFoto(null)} style={{ padding: 9, borderRadius: 8, border: '1px solid ' + G.border, background: '#fff', color: G.err, fontSize: 12, cursor: 'pointer' }}>✕</button>}
                    </div>
                  </div>
                  <input ref={vrGalRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) setFotoVr(f); e.target.value = '' }} style={{ display: 'none' }} />
                  <input ref={vrCamRef} type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) setFotoVr(f); e.target.value = '' }} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Costo</label><input type="number" value={vr.costo} onChange={e => setVr(s => ({ ...s, costo: e.target.value }))} placeholder="S/" style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box' }} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Stock a crear</label><input type="number" value={vr.stock_extra} onChange={e => setVr(s => ({ ...s, stock_extra: e.target.value }))} placeholder="= cant" style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box' }} /></div>
                  </div>
                  <label style={{ fontSize: 11, color: G.muted, display: 'block', marginTop: 8 }}>Color</label>
                  <input value={vr.color} onChange={e => setVr(s => ({ ...s, color: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }} />
                  <label style={{ fontSize: 11, color: G.muted }}>Origen</label>
                  <select value={vr.origen_id} onChange={e => { const oid = e.target.value; const og = (oris || []).find(o => String(o.id) === String(oid)); setVr(s => ({ ...s, origen_id: oid, proveedor_id: og?.proveedor_id ? String(og.proveedor_id) : s.proveedor_id })) }} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, background: '#fff', marginBottom: 8, boxSizing: 'border-box' }}>
                    <option value="">— Sin origen —</option>
                    {(oris || []).map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                  <label style={{ fontSize: 11, color: G.muted }}>Proveedor</label>
                  <select value={vr.proveedor_id} onChange={e => setVr(s => ({ ...s, proveedor_id: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, background: '#fff', boxSizing: 'border-box' }}>
                    <option value="">— Del origen / ninguno —</option>
                    {vrProv.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              )}

              <label style={{ fontSize: 11, color: G.muted, display: 'block', marginTop: 10 }}>Método de pago</label>
              <select value={vr.metodo} onChange={e => setVr(s => ({ ...s, metodo: e.target.value }))} style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13, background: '#fff', marginBottom: 12, boxSizing: 'border-box' }}>
                <option value="Efectivo">Efectivo</option><option value="Yape">Yape</option><option value="Plin">Plin</option><option value="Transferencia">Transferencia</option>
              </select>

              <button onClick={() => ventaRapidaAlCarrito()} disabled={vrSaving} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{vrSaving ? '⏳...' : '🛒 Agregar al carrito'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: cambiar origen */}
      {pideOrigen && (
        <div onClick={() => setPideOrigen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: G.text }}>📋 Cambiar origen</h3>
            <p style={{ fontSize: 12, color: G.muted, margin: '0 0 14px' }}>Mover {sel.length} productos a:</p>
            <select value={nuevoOrigen} onChange={e => setNuevoOrigen(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + G.border, fontSize: 14, background: '#fff', color: G.text, marginBottom: 14 }}>
              <option value="">— Elige un origen —</option>
              {(oris || []).map(o => <option key={o.id} value={o.id}>{o.nombre}{o.es_granel ? ' 🌾 GRANEL' : ''}</option>)}
            </select>
            <button onClick={cambiarOrigen} style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Mover</button>
            <button onClick={() => setPideOrigen(false)} style={{ width: '100%', padding: 10, marginTop: 8, borderRadius: 10, border: 'none', background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Diálogo: tipo de descarga */}
      {pideTipo && (
        <div onClick={() => setPideTipo(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, color: G.text }}>📦 Descargar {sel.length} fotos</h3>
            <p style={{ fontSize: 12, color: G.muted, margin: '0 0 16px' }}>¿Cómo quieres las imágenes?</p>
            <button onClick={() => descargarZip(false)} style={{ width: '100%', padding: 14, borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', color: G.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 10, textAlign: 'left' }}>📷 Fotos sin código<br /><span style={{ fontSize: 11, fontWeight: 400, color: G.muted }}>La imagen original, tal cual</span></button>
            <button onClick={() => descargarZip(true)} style={{ width: '100%', padding: 14, borderRadius: 10, border: '1px solid ' + G.gold, background: G.goldLt, color: G.goldDk, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>🏷️ Fotos con código<br /><span style={{ fontSize: 11, fontWeight: 400, color: G.muted }}>Agrega el código abajo (para leer con IA)</span></button>
            <button onClick={() => setPideTipo(false)} style={{ width: '100%', padding: 10, marginTop: 12, borderRadius: 10, border: 'none', background: 'transparent', color: G.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Overlay de progreso */}
      {trabajando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>⏳</div>
            <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: G.text }}>{trabajando}</p>
          </div>
        </div>
      )}
    </div>
  )
}
