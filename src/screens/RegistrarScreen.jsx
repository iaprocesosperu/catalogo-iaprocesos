import { useState, useEffect, useRef } from 'react'
import { supabase, comprimirImagen, subirFoto } from '../supabase'
import { G, iS, sS } from '../constants'
import { blobToBase64, downloadPhoto, detectColor, mejorarFotoConIA } from '../helpers'
import { CamModal, Hdr, Crd, VoiceBtn } from '../components/index'

export default function RegistrarScreen(P) {
  const { eid, lid, tit, cats, oris, cols, notify, loadAll, setScr, editP, emp } = P
  const ep = editP

  const [f, setF] = useState(ep ? {
    codigo: ep.codigo || '', nombre: ep.nombre || '', precio_costo: String(ep.precio_costo || ''),
    precio_venta: String(ep.precio_venta || ''), color: ep.color || '', cantidad: String(ep.cantidad || 1),
    categoria_id: ep.categoria_id || '', origen_id: ep.origen_id || '', observacion: ep.observacion || '',
    atributos: ep.atributos || {}
  } : { codigo: '', nombre: '', precio_costo: '', precio_venta: '', color: '', cantidad: '1', categoria_id: '', origen_id: '', observacion: '', atributos: {} })

  // ── FOTOS (múltiples) ──
  // Cada entrada: { id, url, es_principal, esNueva, file }
  const [fotos, setFotos] = useState([])
  const [fotosEliminadas, setFotosEliminadas] = useState([]) // ids a eliminar al guardar
  const [saving, setSaving] = useState(false)
  const [ocrLoad, setOcrLoad] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [mejorandoIdx, setMejorandoIdx] = useState(null)
  const [fotoViewer, setFotoViewer] = useState(null) // índice de foto en viewer
  const [fotoMejorada, setFotoMejorada] = useState(null) // {idx, url, blob} — temporal hasta confirmar
  const [cam, setCam] = useState(null) // 'label' | 'foto'
  const [colSrch, setColSrch] = useState('')
  const [fileKey, setFileKey] = useState(0)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatTallas, setNewCatTallas] = useState('')
  const [showNewCol, setShowNewCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [errFields, setErrFields] = useState([])
  const fileRef = useRef(null)

  const iE = k => ({ ...iS(G), border: `1px solid ${errFields.includes(k) ? G.err : G.border}` })
  const sE = k => ({ ...sS(G), border: `1px solid ${errFields.includes(k) ? G.err : G.border}` })
  const s = (k, v) => { setF(p => ({ ...p, [k]: v })); setErrFields(prev => prev.filter(e => e !== k)) }
  const sA = (k, v) => setF(p => ({ ...p, atributos: { ...p.atributos, [k]: v } }))

  // Cargar fotos existentes en modo editar
  useEffect(() => {
    if (!ep) return
    const cargar = async () => {
      const { data } = await supabase.from('fotos_producto')
        .select('*').eq('producto_id', ep.id).order('orden', { ascending: true })
      if (data?.length) {
        setFotos(data.map(f => ({ id: f.id, url: f.url, es_principal: f.es_principal, esNueva: false, file: null })))
      } else if (ep.foto_url) {
        setFotos([{ id: null, url: ep.foto_url, es_principal: true, esNueva: false, file: null }])
      }
    }
    cargar()
  }, [])

  const calcAutoCode = async () => {
    const { data } = await supabase.from('productos').select('codigo').eq('empresa_id', eid)
    const nums = (data || []).map(p => parseInt(p.codigo)).filter(n => !isNaN(n))
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
    setF(prev => ({ ...prev, codigo: String(next).padStart(3, '0') }))
  }

  useEffect(() => { if (emp?.codigo_auto && !ep) calcAutoCode() }, [])

  const catSel = cats.find(c => c.id === parseInt(f.categoria_id))
  const _parseArr = (v) => { if (!v) return []; try { return typeof v === 'string' ? JSON.parse(v) : Array.isArray(v) ? v : [] } catch (e) { return [] } }
  const tallas = _parseArr(catSel?.tallas)
  const attrsDef = _parseArr(catSel?.atributos)
  const colsFilt = cols.filter(c => !colSrch || c.nombre.toLowerCase().includes(colSrch.toLowerCase()))

  useEffect(() => {
    const cat = cats.find(c => c.id === parseInt(f.categoria_id))
    const pts = [cat?.nombre || '']; if (f.color) pts.push(f.color)
    if (f.atributos) Object.values(f.atributos).forEach(v => { if (v) pts.push(v) })
    const a = pts.filter(Boolean).join(' '); if (a) s('nombre', a)
  }, [f.categoria_id, f.color, f.atributos, cats])

  // Control de unidades por origen
  const onOrigenChange = async (v) => {
    s('origen_id', v)
    const o = oris.find(x => x.id === parseInt(v))
    if (o) {
      if (o.precio_costo_defecto && !f.precio_costo) s('precio_costo', String(o.precio_costo_defecto))
      if (o.precio_venta_defecto && !f.precio_venta) s('precio_venta', String(o.precio_venta_defecto))
      // Verificar capacidad solo si cantidad > 0
      if (o.cantidad > 0) {
        const { count } = await supabase.from('productos').select('id', { count: 'exact', head: true })
          .eq('empresa_id', eid).eq('origen_id', o.id).eq('activo', true)
        const usado = count || 0
        const pct = usado / o.cantidad
        if (pct >= 1) {
          notify(`⚠️ ${o.nombre} está lleno (${usado}/${o.cantidad}). Se marcará como observado.`, 'error')
          await supabase.from('origenes').update({ estado: 'observado' }).eq('id', o.id)
          await loadAll()
        } else if (pct >= 0.8) {
          notify(`⚠️ ${o.nombre} casi lleno: ${usado}/${o.cantidad} unidades usadas`)
        }
      }
    }
  }

  // ── FOTOS helpers ──
  const agregarFotoDesdeBlob = async (blob, nombre) => {
    const prev = URL.createObjectURL(blob)
    setFotos(fs => [...fs, { id: null, url: prev, es_principal: fs.length === 0, esNueva: true, file: new File([blob], nombre || 'foto.jpg', { type: 'image/jpeg' }) }])
  }

  const onCamCapture = async (b) => {
    if (cam === 'label') {
      setCam(null); setOcrLoad(true)
      try {
        const comp = await comprimirImagen(new File([b], 'l.jpg'), 600); const b64 = await blobToBase64(comp)
        const fd = new FormData(); fd.append('base64Image', 'data:image/jpeg;base64,' + b64); fd.append('OCREngine', '3'); fd.append('isTable', 'false')
        const r = await fetch('https://api.ocr.space/parse/image', { method: 'POST', headers: { 'apikey': 'K85837551988957' }, body: fd })
        const d = await r.json(); const t = (d?.ParsedResults?.[0]?.ParsedText || '').trim().replace(/[^a-zA-Z0-9]/g, '')
        if (t) { s('codigo', t.substring(0, 20).toUpperCase()); notify('Código: ' + t.substring(0, 20).toUpperCase()) }
        else notify('No se pudo leer', 'error')
      } catch (e) { notify('Error OCR', 'error') }
      setOcrLoad(false)
    } else if (cam === 'foto') {
      setCam(null); await agregarFotoDesdeBlob(b, 'cam.jpg')
    }
  }

  const onFileSelect = async (e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return
    for (const file of files) await agregarFotoDesdeBlob(file, file.name)
    e.target.value = ''
  }

  const marcarPrincipal = (idx) => {
    setFotos(fs => fs.map((f, i) => ({ ...f, es_principal: i === idx })))
  }

  const eliminarFoto = (idx) => {
    const foto = fotos[idx]
    if (foto.id) setFotosEliminadas(prev => [...prev, foto.id])
    setFotos(fs => {
      const nf = fs.filter((_, i) => i !== idx)
      // Si era principal, marcar la primera como principal
      if (foto.es_principal && nf.length > 0) nf[0].es_principal = true
      return nf
    })
  }

  const autoDetect = async () => {
    const principal = fotos.find(f => f.es_principal) || fotos[0]
    if (!principal) return
    setDetecting(true)
    try {
      const color = await detectColor(principal.url); if (color) s('color', color)
      if (principal.file) {
        const comp = await comprimirImagen(principal.file, 600); const b64 = await blobToBase64(comp)
        const fd = new FormData(); fd.append('base64Image', 'data:image/jpeg;base64,' + b64); fd.append('OCREngine', '3')
        const r = await fetch('https://api.ocr.space/parse/image', { method: 'POST', headers: { 'apikey': 'K85837551988957' }, body: fd })
        const d = await r.json(); const txt = (d?.ParsedResults?.[0]?.ParsedText || '').trim()
        if (txt) { const m = txt.match(/[SMLX]{1,3}/i); if (m) sA('talla', m[0].toUpperCase()); notify('Detectado: Color ' + color + (m ? ' Talla ' + m[0].toUpperCase() : '')) }
        else notify('Color detectado: ' + color)
      } else notify('Color detectado: ' + color)
    } catch (e) { notify('Error al detectar', 'error') }
    setDetecting(false)
  }

  const crearCatRapido = async () => {
    if (!newCatName.trim()) return
    const tallas = newCatTallas ? newCatTallas.split(',').map(t => t.trim()).filter(Boolean) : []
    const { data, error } = await supabase.from('categorias').insert({ empresa_id: eid, linea_id: lid, nombre: newCatName.trim(), tallas, atributos: [] }).select().single()
    if (error) { notify('Error: ' + error.message, 'error'); return }
    await loadAll(); s('categoria_id', String(data.id)); setShowNewCat(false); setNewCatName(''); setNewCatTallas(''); notify('Categoría creada')
  }

  const crearColRapido = async () => {
    if (!newColName.trim()) return
    const { error } = await supabase.from('colores').insert({ empresa_id: eid, nombre: newColName.trim() })
    if (error) { notify('Error: ' + error.message, 'error'); return }
    await loadAll(); s('color', newColName.trim()); setColSrch(''); setShowNewCol(false); setNewColName(''); notify('Color creado')
  }

  // ── MEJORAR FOTO CON IA (en registro) ──
  const mejorarFotoEnReg = async (i) => {
    if (!emp?.api_openai_key) return
    const foto = fotos[i]
    if (!foto) return
    setMejorandoIdx(i)
    setFotoMejorada(null)
    try {
      let blob
      if (foto.file) { blob = foto.file }
      else { const resp = await fetch(foto.url); blob = await resp.blob() }
      const mejorada = await mejorarFotoConIA(blob, eid)
      const nuevaUrl = URL.createObjectURL(mejorada)
      // Guardar temporal — no reemplaza hasta que usuario confirme
      setFotoMejorada({ idx: i, url: nuevaUrl, file: new File([mejorada], 'mejorada.png', { type: 'image/png' }) })
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setMejorandoIdx(null)
  }

  const pegarDesdePortapapeles = async () => {
    try {
      if (!navigator.clipboard?.read) { notify('Tu navegador no soporta pegar imágenes', 'error'); return }
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const tipo = item.types.find(t => t.startsWith('image/'))
        if (tipo) {
          const blob = await item.getType(tipo)
          await agregarFotoDesdeBlob(blob, 'pegada.png')
          return
        }
      }
      notify('No hay imagen en el portapapeles', 'error')
    } catch (e) {
      if (e.name === 'NotAllowedError') notify('Permiso de portapapeles denegado', 'error')
      else notify('Error al pegar: ' + e.message, 'error')
    }
  }

  const usarFotoMejorada = () => {
    if (!fotoMejorada) return
    setFotos(fs => fs.map((f, i) => i === fotoMejorada.idx ? { ...f, url: fotoMejorada.url, file: fotoMejorada.file, esNueva: true } : f))
    setFotoMejorada(null)
    notify('✅ Foto mejorada aplicada')
  }

  const mantenerAmbas = () => {
    if (!fotoMejorada) return
    // Mejorada = principal, original = adicional
    setFotos(fs => {
      const nf = [...fs]
      // La original al índice actual → no principal
      if (nf[fotoMejorada.idx]) nf[fotoMejorada.idx] = { ...nf[fotoMejorada.idx], es_principal: false }
      // Insertar mejorada al inicio como principal
      nf.unshift({ id: null, url: fotoMejorada.url, es_principal: true, esNueva: true, file: fotoMejorada.file })
      return nf
    })
    setFotoMejorada(null)
    notify('🖼️ Ambas fotos guardadas — mejorada como principal')
  }

  const copiarAlPortapapeles = async (url) => {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      const img = new Image()
      const blobUrl = URL.createObjectURL(blob)
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = blobUrl })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      URL.revokeObjectURL(blobUrl)
      const pngBlob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
      notify('📋 Foto copiada — pégala en ChatGPT')
    } catch (e) {
      window.open(url, '_blank')
      notify('Abre la foto y guárdala manualmente', 'error')
    }
  }

  const descartarFotoMejorada = () => {
    if (fotoMejorada) URL.revokeObjectURL(fotoMejorada.url)
    setFotoMejorada(null)
    notify('↩️ Se mantuvo la foto original')
  }

  // ── GUARDAR ──
  const guardar = async (yNuevo = false) => {
    const errs = []
    if (!f.codigo) errs.push('codigo')
    if (!f.origen_id) errs.push('origen_id')
    if (!f.categoria_id) errs.push('categoria_id')
    if (!f.color) errs.push('color')
    if (!f.precio_venta) errs.push('precio_venta')
    if (!f.cantidad) errs.push('cantidad')
    if (errs.length > 0) {
      const nm = { codigo: 'Código', origen_id: 'Origen', categoria_id: 'Categoría', color: 'Color', precio_venta: 'Precio Venta', cantidad: 'Cantidad' }
      notify('Faltan campos: ' + errs.map(e => nm[e]).join(', '), 'error')
      setErrFields(errs); return
    }
    setErrFields([])

    if (!ep) {
      const { data: dup } = await supabase.from('productos').select('id').eq('empresa_id', eid).eq('codigo', f.codigo).limit(1)
      if (dup?.length > 0) { notify('Código ' + f.codigo + ' ya existe', 'error'); return }
    }
    setSaving(true)
    try {
      // Subir fotos nuevas
      const fotosSubidas = []
      for (const foto of fotos) {
        if (foto.esNueva && foto.file) {
          const blob = await comprimirImagen(foto.file, 800)
          const url = await subirFoto(blob, f.codigo + '_' + Date.now())
          fotosSubidas.push({ ...foto, url })
        } else {
          fotosSubidas.push(foto)
        }
      }

      // foto_url = la principal
      const principal = fotosSubidas.find(f => f.es_principal) || fotosSubidas[0]
      const foto_url = principal?.url || ep?.foto_url || null

      const data = {
        empresa_id: eid, linea_id: lid, categoria_id: f.categoria_id || null, origen_id: f.origen_id || null,
        codigo: f.codigo, nombre: f.nombre, precio_costo: parseFloat(f.precio_costo) || 0,
        precio_venta: parseFloat(f.precio_venta) || 0, cantidad: parseInt(f.cantidad) || 1,
        color: f.color, atributos: f.atributos, observacion: f.observacion, foto_url,
        updated_at: new Date().toISOString()
      }

      let prodId = ep?.id
      if (ep) {
        const { error } = await supabase.from('productos').update(data).eq('id', ep.id)
        if (error) throw error
        notify('Actualizado')
      } else {
        const { data: nuevo, error } = await supabase.from('productos').insert(data).select().single()
        if (error) throw error
        prodId = nuevo.id
        notify('Registrado')
      }

      // Eliminar fotos marcadas
      for (const id of fotosEliminadas) {
        await supabase.from('fotos_producto').delete().eq('id', id)
      }

      // Guardar fotos nuevas en fotos_producto
      const fotasNuevas = fotosSubidas.filter(f => f.esNueva)
      for (let i = 0; i < fotasNuevas.length; i++) {
        const foto = fotasNuevas[i]
        await supabase.from('fotos_producto').insert({
          producto_id: prodId, empresa_id: eid,
          url: foto.url, es_principal: foto.es_principal, orden: i
        })
      }

      // Actualizar es_principal en fotos existentes
      const fotasExistentes = fotosSubidas.filter(f => !f.esNueva && f.id)
      for (const foto of fotasExistentes) {
        await supabase.from('fotos_producto').update({ es_principal: foto.es_principal }).eq('id', foto.id)
      }

      await loadAll()
      if (yNuevo) {
        setF(p => ({ ...p, codigo: '', nombre: '', color: '', cantidad: '1', observacion: '', atributos: {} }))
        setFotos([]); setFotosEliminadas([])
        if (emp?.codigo_auto) calcAutoCode()
      } else setScr('catalogo')
    } catch (e) { notify('Error: ' + e.message, 'error') }
    setSaving(false)
  }

  // foto principal para auto-detectar y preview principal
  const fotoPrincipal = fotos.find(f => f.es_principal) || fotos[0]

  // Viewer local (sin guardar)
  const FotoViewerLocal = () => {
    if (fotoViewer === null) return null
    const foto = fotos[fotoViewer]
    if (!foto) return null
    const estaMejorando = mejorandoIdx === fotoViewer
    const hayMejorada = fotoMejorada?.idx === fotoViewer

    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.97)',zIndex:9500,display:'flex',flexDirection:'column'}}>
        {/* Header */}
        <div style={{padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
          <div>
            <p style={{color:G.gold,fontSize:11,margin:0,fontWeight:700}}>Foto {fotoViewer+1} de {fotos.length}</p>
            {foto.es_principal && <p style={{color:'#aaa',fontSize:10,margin:0}}>⭐ Principal</p>}
          </div>
          <button onClick={()=>{setFotoViewer(null);if(!hayMejorada)setFotoMejorada(null)}} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',fontSize:20,cursor:'pointer',width:36,height:36,borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Foto / Progreso / Comparación */}
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexDirection:'column',gap:12,padding:16}}>
          {estaMejorando ? (
            <div style={{textAlign:'center',color:'#fff',width:'100%',maxWidth:320}}>
              <p style={{fontSize:36,margin:'0 0 12px'}}>✨</p>
              <p style={{fontSize:14,fontWeight:600,margin:'0 0 16px'}}>Mejorando foto con IA...</p>
              <p style={{fontSize:11,color:'#aaa',margin:'0 0 20px'}}>Puede tardar hasta 1 minuto</p>
              {/* Barra animada */}
              <div style={{width:'100%',height:6,background:'rgba(255,255,255,0.15)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,#6C47FF,#C5A55A)',borderRadius:3,animation:'progress-bar 2s ease-in-out infinite',width:'60%'}}/>
              </div>
              <style>{`@keyframes progress-bar{0%{transform:translateX(-100%)}100%{transform:translateX(260%)}}`}</style>
            </div>
          ) : hayMejorada ? (
            // Comparación original vs mejorada
            <div style={{width:'100%',display:'flex',flexDirection:'column',gap:12,alignItems:'center'}}>
              <p style={{color:G.gold,fontSize:12,fontWeight:700,margin:0}}>¿Con cuál te quedas?</p>
              <div style={{display:'flex',gap:8,width:'100%'}}>
                <div style={{flex:1,textAlign:'center'}}>
                  <p style={{color:'#aaa',fontSize:10,margin:'0 0 4px'}}>ORIGINAL</p>
                  <img src={foto.url} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'contain',borderRadius:8,border:'2px solid rgba(255,255,255,0.2)'}}/>
                </div>
                <div style={{flex:1,textAlign:'center'}}>
                  <p style={{color:G.gold,fontSize:10,margin:'0 0 4px',fontWeight:700}}>✨ MEJORADA</p>
                  <img src={fotoMejorada.url} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'contain',borderRadius:8,border:'2px solid '+G.gold}}/>
                </div>
              </div>
            </div>
          ) : (
            <img src={foto.url} alt="" style={{maxWidth:'94%',maxHeight:'94%',objectFit:'contain',borderRadius:8}}/>
          )}
        </div>

        {/* Acciones */}
        <div style={{padding:'12px 16px 20px',background:'rgba(0,0,0,0.5)',display:'flex',gap:8,flexWrap:'wrap'}}>
          {hayMejorada ? (
            <div style={{display:'flex',gap:6,flexWrap:'wrap',width:'100%'}}>
              <button onClick={()=>{usarFotoMejorada();setFotoViewer(null)}}
                style={{flex:1,padding:'11px 4px',borderRadius:10,border:'none',background:G.ok,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                ✅ Usar mejorada
              </button>
              <button onClick={()=>{mantenerAmbas();setFotoViewer(null)}}
                style={{flex:1,padding:'11px 4px',borderRadius:10,border:'none',background:G.gold,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                🖼️ Guardar ambas
              </button>
              <button onClick={descartarFotoMejorada}
                style={{flex:'0 0 100%',padding:'9px 4px',borderRadius:10,border:'1px solid rgba(255,255,255,0.3)',background:'transparent',color:'#aaa',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                ↩️ Mantener solo original
              </button>
            </div>
          ) : (
            <>
              {emp?.api_openai_key && (
                <button onClick={()=>mejorarFotoEnReg(fotoViewer)} disabled={estaMejorando}
                  style={{flex:1,padding:'12px 0',borderRadius:10,border:'none',background:estaMejorando?'#444':'#6C47FF',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                  ✨ Mejorar IA
                </button>
              )}
              <button onClick={()=>copiarAlPortapapeles(foto.url)}
                style={{flex:1,padding:'12px 0',borderRadius:10,border:'none',background:'#2563EB',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                📋 Copiar
              </button>
              <button onClick={()=>{setCam('foto');setFotoViewer(null)}}
                style={{flex:1,padding:'12px 0',borderRadius:10,border:'1px solid rgba(197,165,90,0.5)',background:'rgba(197,165,90,0.1)',color:G.gold,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                🔄 Cambiar
              </button>
              <button onClick={()=>{eliminarFoto(fotoViewer);setFotoViewer(null)}}
                style={{flex:1,padding:'12px 0',borderRadius:10,border:'none',background:'#C0392B',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                🗑 Eliminar
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <FotoViewerLocal />
      {(cam === 'label' || cam === 'foto') && <CamModal onCapture={onCamCapture} onClose={() => setCam(null)} />}
      <Hdr tit={tit} sec={ep ? '✏️ Editar' : '➕ Registrar'} onBack={() => setScr('catalogo')} />
      <div style={{ padding: 16 }}>

        {/* 1. CÓDIGO */}
        <Crd title="1. Código de etiqueta">
          {emp?.codigo_auto ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 110, padding: 10, borderRadius: 8, border: '2px solid ' + G.gold, fontSize: 20, fontWeight: 700, textAlign: 'center', letterSpacing: 3, color: G.gold, background: G.goldLt }}>{f.codigo || '...'}</div>
              <div style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: G.goldLt, fontSize: 12, color: G.muted, textAlign: 'center', border: '1px dashed ' + G.gold }}>🔢 Código automático</div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={f.codigo} onChange={e => s('codigo', e.target.value.toUpperCase())} placeholder="125"
                style={{ width: 100, padding: 10, borderRadius: 8, fontSize: 20, fontWeight: 700, textAlign: 'center', letterSpacing: 2, border: `2px solid ${errFields.includes('codigo') ? G.err : G.gold}` }} />
              <button onClick={() => setCam('label')} disabled={ocrLoad}
                style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: ocrLoad ? G.muted : G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {ocrLoad ? '⏳ Leyendo...' : '📷 Escanear código'}
              </button>
            </div>
          )}
          {errFields.includes('codigo') && <p style={{ fontSize: 11, color: G.err, margin: '4px 0 0' }}>⚠ El código es obligatorio</p>}
        </Crd>

        {/* 2. FOTOS */}
        <Crd title={`2. Fotos del producto${fotos.length > 0 ? ' (' + fotos.length + ')' : ''}`}>
          {/* Grid de fotos actuales */}
          {fotos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
              {fotos.map((foto, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: foto.es_principal ? '2px solid ' + G.gold : '2px solid transparent', cursor: 'pointer' }} onClick={() => setFotoViewer(i)}>
                  <img src={foto.url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
                  {foto.es_principal && (
                    <div style={{ position: 'absolute', top: 2, left: 2, background: G.gold, color: '#fff', fontSize: 8, padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>⭐</div>
                  )}
                  {foto.esNueva && (
                    <div style={{ position: 'absolute', top: 2, right: 2, background: G.ok, color: '#fff', fontSize: 8, padding: '1px 4px', borderRadius: 4 }}>NEW</div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', background: 'rgba(0,0,0,0.6)' }}>
                    {!foto.es_principal && (
                      <button onClick={() => marcarPrincipal(i)} style={{ flex: 1, padding: '3px 0', border: 'none', background: 'transparent', color: G.gold, fontSize: 10, cursor: 'pointer' }}>⭐</button>
                    )}
                    {emp?.api_openai_key && (
                      <button onClick={() => mejorarFotoEnReg(i)} disabled={mejorandoIdx === i} style={{ flex: 1, padding: '3px 0', border: 'none', background: 'transparent', color: '#a78bfa', fontSize: 10, cursor: 'pointer' }}>
                        {mejorandoIdx === i ? '⏳' : '✨'}
                      </button>
                    )}
                    <button onClick={() => eliminarFoto(i)} style={{ flex: 1, padding: '3px 0', border: 'none', background: 'transparent', color: '#ff6b6b', fontSize: 10, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botones agregar */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setCam('foto')} style={{ flex: 1, padding: fotos.length > 0 ? 8 : 16, borderRadius: 8, border: '2px dashed ' + G.gold, background: G.goldLt, cursor: 'pointer', textAlign: 'center' }}>
              <span style={{ fontSize: fotos.length > 0 ? 16 : 22, display: 'block' }}>📷</span>
              <span style={{ fontSize: 10, color: G.gold, fontWeight: 600 }}>Cámara</span>
            </button>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: fotos.length > 0 ? 8 : 16, borderRadius: 8, border: '2px dashed ' + G.border, background: G.goldLt, cursor: 'pointer', textAlign: 'center' }}>
              <span style={{ fontSize: fotos.length > 0 ? 16 : 22, display: 'block' }}>📁</span>
              <span style={{ fontSize: 10, color: G.muted, fontWeight: 600 }}>Galería</span>
            </button>
            <button onClick={pegarDesdePortapapeles} style={{ flex: 1, padding: fotos.length > 0 ? 8 : 16, borderRadius: 8, border: '2px dashed ' + G.border, background: G.goldLt, cursor: 'pointer', textAlign: 'center' }}>
              <span style={{ fontSize: fotos.length > 0 ? 16 : 22, display: 'block' }}>📋</span>
              <span style={{ fontSize: 10, color: G.muted, fontWeight: 600 }}>Pegar</span>
            </button>
          </div>
          <input key={fileKey} ref={fileRef} type="file" accept="image/*" multiple onChange={onFileSelect} style={{ display: 'none' }} />

          {/* Auto-detectar */}
          {fotoPrincipal && (
            <button onClick={autoDetect} disabled={detecting} style={{ width: '100%', marginTop: 8, padding: '8px', borderRadius: 8, border: 'none', background: G.gold, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {detecting ? '⏳ Detectando...' : '🔍 Auto-detectar color y talla'}
            </button>
          )}
        </Crd>

        {/* 3. DATOS */}
        <Crd title="3. Datos">
          <label style={{ fontSize: 11, color: errFields.includes('origen_id') ? G.err : G.muted, fontWeight: errFields.includes('origen_id') ? 700 : 400 }}>
            Origen {errFields.includes('origen_id') && '⚠ obligatorio'}
          </label>
          <select value={f.origen_id} onChange={e => onOrigenChange(e.target.value)} style={sE('origen_id')}>
            <option value="">Seleccionar origen</option>
            {oris.map(o => <option key={o.id} value={o.id}>{o.nombre}{o.precio_venta_defecto ? ' (C:' + o.precio_costo_defecto + ' V:' + o.precio_venta_defecto + ')' : ''}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
            <label style={{ fontSize: 11, color: errFields.includes('categoria_id') ? G.err : G.muted, fontWeight: errFields.includes('categoria_id') ? 700 : 400 }}>
              Categoría {errFields.includes('categoria_id') && '⚠ obligatoria'}
            </label>
            <button onClick={() => setShowNewCat(!showNewCat)} style={{ fontSize: 10, color: G.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Nueva</button>
          </div>
          {showNewCat && (
            <div style={{ background: G.goldLt, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nombre categoría" style={iS(G)} />
              <input value={newCatTallas} onChange={e => setNewCatTallas(e.target.value)} placeholder="Tallas: XS, S, M, L (vacío si no aplica)" style={iS(G)} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setShowNewCat(false); setNewCatName(''); setNewCatTallas('') }} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={crearCatRapido} disabled={!newCatName.trim()} style={{ flex: 1, padding: 8, borderRadius: 6, border: 'none', background: newCatName.trim() ? G.gold : '#ccc', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Crear y seleccionar</button>
              </div>
            </div>
          )}
          <select value={f.categoria_id} onChange={e => s('categoria_id', e.target.value)} style={sE('categoria_id')}>
            <option value="">Seleccionar</option>{cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {tallas.length > 0 && (
            <><label style={{ fontSize: 11, color: G.muted }}>Talla</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {tallas.map(t => <button key={t} onClick={() => sA('talla', t)} style={{ padding: '5px 9px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: f.atributos?.talla === t ? G.gold : G.goldSf, color: f.atributos?.talla === t ? '#fff' : G.goldDk }}>{t}</button>)}
              </div></>
          )}

          {attrsDef.map(a => (
            <div key={a.key} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: G.muted }}>{a.label}</label>
              {a.tipo === 'select' ? (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {a.opciones.map(op => <button key={op} onClick={() => sA(a.key, op)} style={{ padding: '5px 9px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: f.atributos?.[a.key] === op ? G.gold : G.goldSf, color: f.atributos?.[a.key] === op ? '#fff' : G.goldDk }}>{op}</button>)}
                </div>
              ) : <input value={f.atributos?.[a.key] || ''} onChange={e => sA(a.key, e.target.value)} style={iS(G)} />}
            </div>
          ))}

          {catSel && tallas.length > 0 && !attrsDef.find(a => a.key === 'genero') && (
            <><label style={{ fontSize: 11, color: G.muted }}>Género</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {['Mujer', 'Hombre', 'Unisex'].map(g => <button key={g} onClick={() => sA('genero', g)} style={{ flex: 1, padding: 7, borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: f.atributos?.genero === g ? G.gold : G.goldSf, color: f.atributos?.genero === g ? '#fff' : G.goldDk }}>{g}</button>)}
              </div></>
          )}

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
            <label style={{ fontSize: 11, color: errFields.includes('color') ? G.err : G.muted, fontWeight: errFields.includes('color') ? 700 : 400 }}>
              Color {errFields.includes('color') && '⚠ obligatorio'}
            </label>
            <button onClick={() => setShowNewCol(!showNewCol)} style={{ fontSize: 10, color: G.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Nuevo</button>
          </div>
          {showNewCol && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Nuevo color" style={{ flex: 1, ...iS(G), marginBottom: 0 }} />
              <button onClick={crearColRapido} disabled={!newColName.trim()} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: newColName.trim() ? G.gold : '#ccc', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Crear</button>
              <button onClick={() => { setShowNewCol(false); setNewColName('') }} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid ' + G.border, background: 'transparent', color: G.muted, fontSize: 11, cursor: 'pointer' }}>✕</button>
            </div>
          )}
          <input value={f.color} onChange={e => { s('color', e.target.value); setColSrch(e.target.value) }} placeholder="Escribe o selecciona..." style={iE('color')} />
          {colSrch && colsFilt.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {colsFilt.slice(0, 8).map(c => <button key={c.id} onClick={() => { s('color', c.nombre); setColSrch('') }} style={{ padding: '3px 8px', borderRadius: 10, border: '1px solid ' + G.border, background: '#fff', fontSize: 10, cursor: 'pointer' }}>{c.nombre}</button>)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Precio Costo (S/) — opcional</label>
              <input value={f.precio_costo} onChange={e => s('precio_costo', e.target.value)} type="number" placeholder="0" style={iS(G)} /></div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: errFields.includes('precio_venta') ? G.err : G.muted, fontWeight: errFields.includes('precio_venta') ? 700 : 400 }}>
                Precio Venta (S/) {errFields.includes('precio_venta') && '⚠'}
              </label>
              <input value={f.precio_venta} onChange={e => s('precio_venta', e.target.value)} type="number" placeholder="0" style={iE('precio_venta')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: errFields.includes('cantidad') ? G.err : G.muted, fontWeight: errFields.includes('cantidad') ? 700 : 400 }}>
                Cantidad {errFields.includes('cantidad') && '⚠ obligatoria'}
              </label>
              <input value={f.cantidad} onChange={e => s('cantidad', e.target.value)} type="number" style={iE('cantidad')} />
            </div>
          </div>

          <label style={{ fontSize: 11, color: G.muted }}>Nombre (auto-generado)</label>
          <input value={f.nombre} onChange={e => s('nombre', e.target.value)} style={iS(G)} />

          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
            <div style={{ flex: 1 }}><label style={{ fontSize: 11, color: G.muted }}>Observación — opcional</label>
              <textarea value={f.observacion} onChange={e => s('observacion', e.target.value)} rows={2} style={{ ...iS(G), resize: 'vertical' }} /></div>
            <VoiceBtn onResult={t => s('observacion', (f.observacion ? f.observacion + ' ' : '') + t)} />
          </div>
        </Crd>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => guardar(false)} disabled={saving}
            style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: G.gold, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '...' : ep ? '✅ Actualizar' : '✅ Registrar y Salir'}
          </button>
          {!ep && <button onClick={() => guardar(true)} disabled={saving}
            style={{ flex: 1, padding: 14, borderRadius: 12, border: '2px solid ' + G.gold, background: 'transparent', color: G.gold, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? '...' : '➕ Registrar y Nuevo'}
          </button>}
        </div>
      </div>
    </div>
  )
}
