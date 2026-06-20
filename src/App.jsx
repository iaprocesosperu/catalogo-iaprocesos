import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, comprimirImagen, subirFoto } from './supabase'

const C = { pink: '#EC4899', pinkDark: '#DB2777', pinkLight: '#FDF2F8', pinkSoft: '#FCE7F3',
  bg: '#FDF2F8', card: '#FFFFFF', text: '#1F2937', muted: '#6B7280', border: '#F3E8F0',
  success: '#10B981', danger: '#EF4444', warning: '#F59E0B' }

const TALLAS = ['XS','S','M','L','XL','XXL','Única']
const GENEROS = ['Mujer','Hombre','Unisex']

export default function App() {
  const [screen, setScreen] = useState('catalogo')
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [origenes, setOrigenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [ventaProduct, setVentaProduct] = useState(null)

  const notify = (msg, type='success') => {
    setNotification({msg,type})
    setTimeout(()=>setNotification(null), 3000)
  }

  // Load data
  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [catRes, origRes, prodRes] = await Promise.all([
        supabase.from('categorias').select('*').eq('activo',true).order('nombre'),
        supabase.from('origenes').select('*').eq('activo',true).order('nombre'),
        supabase.from('productos').select('*,categorias(nombre),origenes(nombre)').eq('activo',true).order('created_at',{ascending:false})
      ])
      setCategorias(catRes.data||[])
      setOrigenes(origRes.data||[])
      setProductos(prodRes.data||[])
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const screenProps = { productos, categorias, origenes, notify, loadAll, setScreen, C, setEditProduct, setVentaProduct, setSearchQuery, searchQuery, searchResults, setSearchResults }

  return (
    <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:C.bg,position:'relative',paddingBottom:68}}>
      {notification && (
        <div style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',zIndex:999,
          background:notification.type==='success'?C.success:C.danger,color:'#fff',padding:'10px 20px',
          borderRadius:12,fontSize:14,fontWeight:600,boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}>
          {notification.msg}
        </div>
      )}

      {loading && screen==='catalogo' ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',flexDirection:'column',gap:12}}>
          <div style={{fontSize:40}}>👗</div>
          <p style={{color:C.muted}}>Cargando catálogo...</p>
        </div>
      ) : (
        <>
          {screen==='catalogo' && <CatalogoScreen {...screenProps}/>}
          {screen==='registrar' && <RegistrarScreen {...screenProps} editProduct={editProduct}/>}
          {screen==='buscar' && <BuscarScreen {...screenProps}/>}
          {screen==='categorias' && <MantenimientoScreen tipo="categorias" data={categorias} {...screenProps}/>}
          {screen==='origenes' && <MantenimientoScreen tipo="origenes" data={origenes} {...screenProps}/>}
          {screen==='venta' && <VentaScreen producto={ventaProduct} {...screenProps}/>}
        </>
      )}

      {/* Nav Bar */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,
        background:'#fff',borderTop:'1px solid #F3E8F0',padding:'6px 0 env(safe-area-inset-bottom,6px)',
        display:'flex',justifyContent:'space-around',zIndex:100}}>
        {[
          {id:'catalogo',icon:'📦',label:'Catálogo'},
          {id:'registrar',icon:'➕',label:'Registrar'},
          {id:'buscar',icon:'🔍',label:'Buscar'},
          {id:'categorias',icon:'🏷️',label:'Categorías'},
          {id:'origenes',icon:'📋',label:'Orígenes'},
        ].map(n => (
          <button key={n.id} onClick={()=>{setScreen(n.id);if(n.id==='registrar')setEditProduct(null)}}
            style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',
              alignItems:'center',gap:1,padding:'4px 6px'}}>
            <span style={{fontSize:18}}>{n.icon}</span>
            <span style={{fontSize:9,color:screen===n.id?C.pink:C.muted,fontWeight:screen===n.id?700:400}}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


/* ═══ CATÁLOGO ═══ */
function CatalogoScreen({ productos, setScreen, C, setEditProduct, setVentaProduct }) {
  const [filtro, setFiltro] = useState('')
  const filtered = productos.filter(p =>
    !filtro || p.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.color?.toLowerCase().includes(filtro.toLowerCase())
  )

  return (
    <div>
      <div style={{background:'linear-gradient(135deg,#EC4899,#DB2777)',padding:'20px 16px 24px',borderRadius:'0 0 20px 20px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <h1 style={{color:'#fff',fontSize:20,fontWeight:800,margin:0}}>👗 Catálogo</h1>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:12,margin:'2px 0 0'}}>{productos.length} productos registrados</p>
          </div>
        </div>
        <div style={{position:'relative'}}>
          <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Filtrar por nombre, código, color..."
            style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'none',fontSize:14,background:'rgba(255,255,255,0.9)',boxSizing:'border-box'}}/>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:40,color:C.muted}}>
          <p style={{fontSize:40,marginBottom:8}}>📦</p>
          <p style={{fontSize:14}}>{productos.length===0?'No hay productos registrados':'Sin resultados'}</p>
          {productos.length===0 && (
            <button onClick={()=>setScreen('registrar')} style={{marginTop:12,padding:'10px 24px',borderRadius:10,border:'none',
              background:C.pink,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              ➕ Registrar primer producto
            </button>
          )}
        </div>
      ) : (
        <div style={{padding:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {filtered.map(p => (
            <div key={p.id} style={{background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              {p.foto_url ? (
                <img src={p.foto_url} alt={p.nombre} style={{width:'100%',height:140,objectFit:'cover'}}/>
              ) : (
                <div style={{width:'100%',height:140,background:C.pinkSoft,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:36,opacity:0.3}}>👗</span>
                </div>
              )}
              <div style={{padding:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:4}}>
                  <span style={{fontSize:10,background:C.pinkSoft,color:C.pinkDark,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{p.codigo}</span>
                  <span style={{fontSize:14,fontWeight:800,color:C.pink}}>S/{p.precio}</span>
                </div>
                <p style={{fontSize:12,fontWeight:600,margin:'4px 0 2px',color:C.text,lineHeight:1.2}}>{p.nombre}</p>
                <p style={{fontSize:10,color:C.muted,margin:0}}>
                  {[p.color,p.talla,p.genero].filter(Boolean).join(' • ')}
                </p>
                {p.categorias && <p style={{fontSize:10,color:C.muted,margin:'2px 0 0'}}>{p.categorias.nombre}</p>}
                <div style={{display:'flex',gap:4,marginTop:8}}>
                  <button onClick={()=>{setEditProduct(p);setScreen('registrar')}}
                    style={{flex:1,padding:6,borderRadius:6,border:`1px solid ${C.pink}`,background:'transparent',
                      color:C.pink,fontSize:11,fontWeight:600,cursor:'pointer'}}>Editar</button>
                  <button onClick={()=>{setVentaProduct(p);setScreen('venta')}}
                    style={{flex:1,padding:6,borderRadius:6,border:'none',background:C.pink,
                      color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer'}}>Vender</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


/* ═══ CÁMARA INLINE (no sale de la app) ═══ */
function CameraModal({ onCapture, onClose, C }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
        setReady(true)
      })
      .catch(() => { if (mounted) onClose() })
    return () => { mounted = false; if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()) }
  }, [])

  const capture = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      onCapture(blob)
    }, 'image/jpeg', 0.85)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:9999,display:'flex',flexDirection:'column'}}>
      <video ref={videoRef} autoPlay playsInline muted style={{flex:1,objectFit:'cover',width:'100%'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'20px',display:'flex',justifyContent:'center',alignItems:'center',gap:20,background:'linear-gradient(transparent,rgba(0,0,0,0.7))'}}>
        <button onClick={()=>{if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop());onClose()}}
          style={{width:50,height:50,borderRadius:25,border:'2px solid #fff',background:'rgba(255,255,255,0.2)',color:'#fff',fontSize:18,cursor:'pointer'}}>✕</button>
        <button onClick={capture} disabled={!ready}
          style={{width:70,height:70,borderRadius:35,border:'4px solid #fff',background:ready?C.pink:'#666',cursor:'pointer'}}/>
        <div style={{width:50}}/>
      </div>
    </div>
  )
}

/* ═══ REGISTRAR PRODUCTO ═══ */
function RegistrarScreen({ categorias, origenes, notify, loadAll, setScreen, C, editProduct }) {
  const [form, setForm] = useState(editProduct ? {
    codigo: editProduct.codigo||'', nombre: editProduct.nombre||'', precio: String(editProduct.precio||''),
    color: editProduct.color||'', talla: editProduct.talla||'', genero: editProduct.genero||'Unisex',
    categoria_id: editProduct.categoria_id||'', origen_id: editProduct.origen_id||'', observacion: editProduct.observacion||''
  } : {
    codigo:'',nombre:'',precio:'',color:'',talla:'',genero:'Unisex',categoria_id:'',origen_id:'',observacion:''
  })
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(editProduct?.foto_url || null)
  const [saving, setSaving] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [cameraMode, setCameraMode] = useState(null) // null, 'label', 'product'

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  // Cámara capturó imagen
  const onCameraCapture = async (blob) => {
    if (cameraMode === 'label') {
      setCameraMode(null)
      setOcrLoading(true)
      try {
        const compressed = await comprimirImagen(new File([blob], 'label.jpg'), 600)
        const base64 = await blobToBase64(compressed)
        const formData = new FormData()
        formData.append('base64Image', 'data:image/jpeg;base64,' + base64)
        formData.append('OCREngine', '3')
        formData.append('isTable', 'false')
        const res = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST', headers: { 'apikey': 'K85837551988957' }, body: formData
        })
        const data = await res.json()
        const texto = (data?.ParsedResults?.[0]?.ParsedText || '').trim().replace(/[^a-zA-Z0-9]/g, '')
        if (texto) {
          set('codigo', texto.substring(0,20).toUpperCase())
          notify('Código leído: ' + texto.substring(0,20).toUpperCase())
        } else {
          notify('No se pudo leer, escríbelo manualmente', 'error')
        }
      } catch(err) {
        notify('Error de conexión', 'error')
      }
      setOcrLoading(false)
    } else if (cameraMode === 'product') {
      setCameraMode(null)
      setFotoFile(new File([blob], 'product.jpg', { type: 'image/jpeg' }))
      const reader = new FileReader()
      reader.onload = (ev) => setFotoPreview(ev.target.result)
      reader.readAsDataURL(blob)
    }
  }

  // Guardar producto
  const guardar = async () => {
    if (!form.codigo || !form.nombre) { notify('Código y nombre son obligatorios','error'); return }
    setSaving(true)
    try {
      let foto_url = editProduct?.foto_url || null
      let descripcion_ia = editProduct?.descripcion_ia || null
      if (fotoFile) {
        const blob = await comprimirImagen(fotoFile, 800)
        foto_url = await subirFoto(blob, form.codigo)
        try {
          const base64 = await blobToBase64(blob)
          const res = await fetch('/api/describe-image', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ image_base64: base64, mode:'register' })
          })
          if (res.ok) { const data = await res.json(); descripcion_ia = data.descripcion }
        } catch(e) { console.log('IA desc no disponible') }
      }
      const productData = {
        codigo: form.codigo, nombre: form.nombre, precio: parseFloat(form.precio)||0,
        color: form.color, talla: form.talla, genero: form.genero,
        categoria_id: form.categoria_id || null, origen_id: form.origen_id || null,
        observacion: form.observacion, foto_url, descripcion_ia,
        updated_at: new Date().toISOString()
      }
      if (editProduct) {
        const { error } = await supabase.from('productos').update(productData).eq('id', editProduct.id)
        if (error) throw error
        notify('Producto actualizado')
      } else {
        const { error } = await supabase.from('productos').insert(productData)
        if (error) throw error
        notify('Producto registrado')
      }
      await loadAll()
      setScreen('catalogo')
    } catch(err) { notify('Error: ' + err.message, 'error') }
    setSaving(false)
  }

  return (
    <div>
      {cameraMode && <CameraModal C={C} onCapture={onCameraCapture} onClose={()=>setCameraMode(null)}/>}

      <div style={{background:C.card,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid '+C.border}}>
        <button onClick={()=>setScreen('catalogo')} style={{background:'none',border:'none',cursor:'pointer',fontSize:18}}>←</button>
        <h2 style={{fontSize:16,fontWeight:700,margin:0}}>{editProduct?'✏️ Editar':'➕ Registrar'} producto</h2>
      </div>

      <div style={{padding:16}}>
        {/* Código de etiqueta */}
        <div style={{background:C.card,borderRadius:12,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{fontSize:13,fontWeight:700,margin:'0 0 8px',color:C.text}}>1. Código de etiqueta</p>
          <div style={{display:'flex',gap:8}}>
            <input value={form.codigo} onChange={e=>set('codigo',e.target.value.toUpperCase())} placeholder="Ej: 125, X5..."
              style={{flex:1,padding:10,borderRadius:8,border:'1px solid '+C.border,fontSize:18,fontWeight:700,color:C.text,letterSpacing:2}}/>
            <button onClick={()=>setCameraMode('label')} disabled={ocrLoading}
              style={{padding:'10px 14px',borderRadius:8,border:'none',background:ocrLoading?C.muted:C.pink,color:'#fff',
                fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
              {ocrLoading?'⏳ Leyendo...':'📷 Escanear'}
            </button>
          </div>
          <p style={{fontSize:10,color:C.muted,margin:'6px 0 0'}}>Escanea la etiqueta o escribe el código</p>
        </div>

        {/* Foto del producto */}
        <div style={{background:C.card,borderRadius:12,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{fontSize:13,fontWeight:700,margin:'0 0 8px',color:C.text}}>2. Foto del producto</p>
          {fotoPreview ? (
            <div style={{position:'relative'}}>
              <img src={fotoPreview} alt="Preview" style={{width:'100%',height:200,objectFit:'cover',borderRadius:8}}/>
              <button onClick={()=>{setFotoPreview(null);setFotoFile(null)}}
                style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.5)',color:'#fff',border:'none',
                  borderRadius:20,width:28,height:28,fontSize:14,cursor:'pointer'}}>✕</button>
            </div>
          ) : (
            <button onClick={()=>setCameraMode('product')}
              style={{width:'100%',padding:30,borderRadius:8,border:'2px dashed '+C.pink,background:C.pinkLight,
                cursor:'pointer',textAlign:'center'}}>
              <span style={{fontSize:32,display:'block',marginBottom:4}}>📷</span>
              <span style={{fontSize:13,color:C.pink,fontWeight:600}}>Tomar foto del producto</span>
            </button>
          )}
        </div>

        {/* Datos del producto */}
        <div style={{background:C.card,borderRadius:12,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{fontSize:13,fontWeight:700,margin:'0 0 10px',color:C.text}}>3. Datos del producto</p>
          
          <Field label="Nombre *" value={form.nombre} onChange={v=>set('nombre',v)} placeholder="Blusa manga larga"/>
          <Field label="Precio (S/)" value={form.precio} onChange={v=>set('precio',v)} placeholder="45.00" type="number"/>
          <Field label="Color" value={form.color} onChange={v=>set('color',v)} placeholder="Rosado"/>
          
          {/* Talla */}
          <p style={{fontSize:11,color:C.muted,margin:'0 0 4px'}}>Talla</p>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
            {TALLAS.map(t => (
              <button key={t} onClick={()=>set('talla',t)}
                style={{padding:'6px 10px',borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
                  background:form.talla===t?C.pink:C.pinkSoft,color:form.talla===t?'#fff':C.pinkDark}}>{t}</button>
            ))}
          </div>

          {/* Género */}
          <p style={{fontSize:11,color:C.muted,margin:'0 0 4px'}}>Género</p>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {GENEROS.map(g => (
              <button key={g} onClick={()=>set('genero',g)}
                style={{flex:1,padding:'8px',borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
                  background:form.genero===g?C.pink:C.pinkSoft,color:form.genero===g?'#fff':C.pinkDark}}>{g}</button>
            ))}
          </div>

          {/* Categoría */}
          <p style={{fontSize:11,color:C.muted,margin:'0 0 4px'}}>Categoría</p>
          <select value={form.categoria_id} onChange={e=>set('categoria_id',e.target.value?parseInt(e.target.value):'')}
            style={{width:'100%',padding:10,borderRadius:8,border:'1px solid '+C.border,fontSize:14,marginBottom:10,background:'#fff'}}>
            <option value="">Sin categoría</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          {/* Origen */}
          <p style={{fontSize:11,color:C.muted,margin:'0 0 4px'}}>Origen</p>
          <select value={form.origen_id} onChange={e=>set('origen_id',e.target.value?parseInt(e.target.value):'')}
            style={{width:'100%',padding:10,borderRadius:8,border:'1px solid '+C.border,fontSize:14,marginBottom:10,background:'#fff'}}>
            <option value="">Sin origen</option>
            {origenes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>

          <Field label="Observación" value={form.observacion} onChange={v=>set('observacion',v)} placeholder="Notas adicionales..." multiline/>
        </div>

        {/* Guardar */}
        <button onClick={guardar} disabled={saving || !form.codigo || !form.nombre}
          style={{width:'100%',padding:16,borderRadius:12,border:'none',fontSize:16,fontWeight:800,cursor:'pointer',
            background:(!form.codigo||!form.nombre)?'#D1D5DB':C.pink,color:'#fff',
            boxShadow:form.codigo&&form.nombre?'0 4px 15px rgba(236,72,153,0.4)':'none',marginBottom:20}}>
          {saving ? 'Guardando...' : editProduct ? '✅ Actualizar producto' : '✅ Registrar producto'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type, multiline }) {
  const C = { muted:'#6B7280', border:'#F3E8F0', text:'#1F2937' }
  return (
    <div style={{marginBottom:10}}>
      <p style={{fontSize:11,color:C.muted,margin:'0 0 4px'}}>{label}</p>
      {multiline ? (
        <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={2}
          style={{width:'100%',padding:10,borderRadius:8,border:'1px solid '+C.border,fontSize:14,color:C.text,resize:'vertical',boxSizing:'border-box'}}/>
      ) : (
        <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type||'text'}
          style={{width:'100%',padding:10,borderRadius:8,border:'1px solid '+C.border,fontSize:14,color:C.text,boxSizing:'border-box'}}/>
      )}
    </div>
  )
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(blob)
  })
}


/* ═══ BUSCAR ═══ */
function BuscarScreen({ productos, notify, C, setScreen, setEditProduct, setVentaProduct }) {
  const [modo, setModo] = useState('texto') // texto, codigo, foto
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const searchPhotoRef = useRef(null)

  // Buscar por texto
  const buscarTexto = () => {
    if (!query.trim()) return
    const q = query.toLowerCase()
    const found = productos.filter(p =>
      p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) ||
      p.color?.toLowerCase().includes(q) || p.observacion?.toLowerCase().includes(q) ||
      p.descripcion_ia?.toLowerCase().includes(q)
    )
    setResults(found)
  }

  // Buscar por código (manual)
  const buscarCodigo = () => {
    if (!query.trim()) return
    const q = query.trim().toLowerCase()
    const found = productos.filter(p => p.codigo?.toLowerCase() === q)
    setResults(found)
    if (found.length === 0) notify('Código "'+query+'" no encontrado', 'error')
    else notify('Producto encontrado: ' + found[0].nombre)
  }

  // Buscar por foto (IA)
  const buscarPorFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSearching(true)
    try {
      const blob = await comprimirImagen(file, 600)
      const base64 = await blobToBase64(blob)
      
      const res = await fetch('/api/describe-image', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ image_base64: base64, mode:'search' })
      })
      
      if (!res.ok) throw new Error('API no disponible')
      const data = await res.json()
      const keywords = data.descripcion.toLowerCase().split(',').map(s=>s.trim()).filter(Boolean)
      
      // Buscar productos que coincidan con las palabras clave
      const scored = productos.map(p => {
        let score = 0
        const pText = [p.nombre,p.color,p.descripcion_ia,p.observacion,p.categorias?.nombre].filter(Boolean).join(' ').toLowerCase()
        keywords.forEach(kw => { if (pText.includes(kw)) score++ })
        return { ...p, score }
      }).filter(p => p.score > 0).sort((a,b) => b.score - a.score)
      
      setResults(scored)
      setQuery('🔍 Búsqueda por foto: ' + keywords.slice(0,4).join(', '))
      
      if (scored.length === 0) notify('No se encontraron productos similares', 'error')
      else notify(`${scored.length} resultado(s) encontrado(s)`)
    } catch(err) {
      notify('Búsqueda por foto no disponible: ' + err.message, 'error')
    }
    setSearching(false)
  }

  return (
    <div>
      <div style={{background:C.card,padding:'14px 16px',borderBottom:'1px solid '+C.border}}>
        <h2 style={{fontSize:16,fontWeight:700,margin:'0 0 12px'}}>🔍 Buscar producto</h2>
        
        {/* Modos de búsqueda */}
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {[{id:'texto',icon:'⌨️',l:'Nombre'},{id:'codigo',icon:'🔢',l:'Código'},{id:'foto',icon:'🖼️',l:'Por foto'}].map(m => (
            <button key={m.id} onClick={()=>setModo(m.id)}
              style={{flex:1,padding:8,borderRadius:8,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
                background:modo===m.id?C.pink:C.pinkSoft,color:modo===m.id?'#fff':C.pinkDark}}>
              {m.icon} {m.l}
            </button>
          ))}
        </div>

        {modo === 'texto' && (
          <div style={{display:'flex',gap:8}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&buscarTexto()}
              placeholder="Nombre, código, color..." style={{flex:1,padding:10,borderRadius:8,border:'1px solid '+C.border,fontSize:14}}/>
            <button onClick={buscarTexto} style={{padding:'10px 16px',borderRadius:8,border:'none',background:C.pink,color:'#fff',fontWeight:700,cursor:'pointer'}}>
              Buscar
            </button>
          </div>
        )}

        {modo === 'codigo' && (
          <div style={{display:'flex',gap:8}}>
            <input value={query} onChange={e=>setQuery(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&buscarCodigo()}
              placeholder="Código exacto: 125, X5..." style={{flex:1,padding:10,borderRadius:8,border:'1px solid '+C.border,fontSize:16,fontWeight:700,letterSpacing:2}}/>
            <button onClick={buscarCodigo} style={{padding:'10px 16px',borderRadius:8,border:'none',background:C.pink,color:'#fff',fontWeight:700,cursor:'pointer'}}>
              Buscar
            </button>
          </div>
        )}

        {modo === 'foto' && (
          <button onClick={()=>searchPhotoRef.current?.click()} disabled={searching}
            style={{width:'100%',padding:14,borderRadius:8,border:'2px dashed '+C.pink,background:C.pinkLight,cursor:'pointer'}}>
            <span style={{fontSize:24,display:'block'}}>{searching?'⏳':'🖼️'}</span>
            <span style={{fontSize:13,color:C.pink,fontWeight:600}}>{searching?'Buscando con IA...':'Tomar foto para buscar producto similar'}</span>
            <input ref={searchPhotoRef} type="file" accept="image/*" onChange={buscarPorFoto} style={{display:'none'}}/>
          </button>
        )}
      </div>

      {/* Resultados */}
      <div style={{padding:12}}>
        {query && results !== null && (
          <p style={{fontSize:12,color:C.muted,marginBottom:8}}>
            {results.length} resultado(s) para "{query}"
          </p>
        )}
        {results?.map(p => (
          <div key={p.id} style={{background:'#fff',borderRadius:12,padding:10,marginBottom:8,display:'flex',gap:10,
            boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            {p.foto_url ? (
              <img src={p.foto_url} alt="" style={{width:70,height:70,objectFit:'cover',borderRadius:8}}/>
            ) : (
              <div style={{width:70,height:70,background:C.pinkSoft,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:24,opacity:0.3}}>👗</span>
              </div>
            )}
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:10,background:C.pinkSoft,color:C.pinkDark,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{p.codigo}</span>
                <span style={{fontSize:14,fontWeight:800,color:C.pink}}>S/{p.precio}</span>
              </div>
              <p style={{fontSize:13,fontWeight:600,margin:'4px 0 2px'}}>{p.nombre}</p>
              <p style={{fontSize:10,color:C.muted,margin:0}}>{[p.color,p.talla,p.genero].filter(Boolean).join(' • ')}</p>
              {p.score && <p style={{fontSize:9,color:C.success,margin:'2px 0 0'}}>Coincidencia: {p.score} palabras</p>}
              <div style={{display:'flex',gap:4,marginTop:6}}>
                <button onClick={()=>{setEditProduct(p);setScreen('registrar')}}
                  style={{padding:'4px 10px',borderRadius:4,border:`1px solid ${C.pink}`,background:'transparent',color:C.pink,fontSize:10,fontWeight:600,cursor:'pointer'}}>Editar</button>
                <button onClick={()=>{setVentaProduct(p);setScreen('venta')}}
                  style={{padding:'4px 10px',borderRadius:4,border:'none',background:C.pink,color:'#fff',fontSize:10,fontWeight:600,cursor:'pointer'}}>Vender</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


/* ═══ MANTENIMIENTO (Categorías / Orígenes) ═══ */
function MantenimientoScreen({ tipo, data, notify, loadAll, setScreen, C }) {
  const [nuevo, setNuevo] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const titulo = tipo === 'categorias' ? '🏷️ Categorías' : '📋 Orígenes'

  const agregar = async () => {
    if (!nuevo.trim()) return
    const { error } = await supabase.from(tipo).insert({ nombre: nuevo.trim() })
    if (error) { notify('Error: ' + error.message, 'error'); return }
    setNuevo('')
    notify(`${tipo === 'categorias' ? 'Categoría' : 'Origen'} agregado`)
    await loadAll()
  }

  const actualizar = async (id) => {
    if (!editNombre.trim()) return
    const { error } = await supabase.from(tipo).update({ nombre: editNombre.trim() }).eq('id', id)
    if (error) { notify('Error: ' + error.message, 'error'); return }
    setEditId(null)
    notify('Actualizado')
    await loadAll()
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar?')) return
    const { error } = await supabase.from(tipo).update({ activo: false }).eq('id', id)
    if (error) { notify('Error: ' + error.message, 'error'); return }
    notify('Eliminado')
    await loadAll()
  }

  return (
    <div>
      <div style={{background:C.card,padding:'14px 16px',borderBottom:'1px solid '+C.border}}>
        <h2 style={{fontSize:16,fontWeight:700,margin:0}}>{titulo}</h2>
        <p style={{fontSize:12,color:C.muted,margin:'4px 0 0'}}>{data.length} registros • Agrega, edita o elimina</p>
      </div>

      <div style={{padding:16}}>
        {/* Agregar nuevo */}
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <input value={nuevo} onChange={e=>setNuevo(e.target.value)} placeholder={`Nuevo ${tipo==='categorias'?'categoría':'origen'}...`}
            onKeyDown={e=>e.key==='Enter'&&agregar()}
            style={{flex:1,padding:10,borderRadius:8,border:'1px solid '+C.border,fontSize:14}}/>
          <button onClick={agregar} disabled={!nuevo.trim()}
            style={{padding:'10px 16px',borderRadius:8,border:'none',background:nuevo.trim()?C.pink:'#D1D5DB',color:'#fff',fontWeight:700,cursor:'pointer'}}>
            ➕
          </button>
        </div>

        {/* Lista */}
        {data.map(item => (
          <div key={item.id} style={{background:C.card,borderRadius:10,padding:12,marginBottom:6,display:'flex',alignItems:'center',gap:8,
            boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
            {editId === item.id ? (
              <>
                <input value={editNombre} onChange={e=>setEditNombre(e.target.value)} onKeyDown={e=>e.key==='Enter'&&actualizar(item.id)}
                  style={{flex:1,padding:8,borderRadius:6,border:'1px solid '+C.pink,fontSize:14}}/>
                <button onClick={()=>actualizar(item.id)} style={{background:C.success,color:'#fff',border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:12}}>✓</button>
                <button onClick={()=>setEditId(null)} style={{background:C.muted,color:'#fff',border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:12}}>✕</button>
              </>
            ) : (
              <>
                <span style={{flex:1,fontSize:14,fontWeight:500}}>{item.nombre}</span>
                <button onClick={()=>{setEditId(item.id);setEditNombre(item.nombre)}}
                  style={{background:C.pinkSoft,color:C.pinkDark,border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:11,fontWeight:600}}>Editar</button>
                <button onClick={()=>eliminar(item.id)}
                  style={{background:'#FEE2E2',color:C.danger,border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:11,fontWeight:600}}>Eliminar</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ VENTA RÁPIDA ═══ */
function VentaScreen({ producto, notify, loadAll, setScreen, C }) {
  const [cantidad, setCantidad] = useState(1)
  const [metodo, setMetodo] = useState('Efectivo')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  
  if (!producto) return null
  const total = (producto.precio || 0) * cantidad

  const registrarVenta = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ventas').insert({
        producto_id: producto.id,
        codigo_producto: producto.codigo,
        nombre_producto: producto.nombre,
        precio_venta: producto.precio,
        cantidad, total,
        metodo_pago: metodo,
        nota
      })
      if (error) throw error
      notify('¡Venta registrada! S/' + total.toFixed(2))
      setScreen('catalogo')
    } catch(err) {
      notify('Error: ' + err.message, 'error')
    }
    setSaving(false)
  }

  return (
    <div>
      <div style={{background:C.card,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid '+C.border}}>
        <button onClick={()=>setScreen('catalogo')} style={{background:'none',border:'none',cursor:'pointer',fontSize:18}}>←</button>
        <h2 style={{fontSize:16,fontWeight:700,margin:0}}>💰 Registrar venta</h2>
      </div>

      <div style={{padding:16}}>
        {/* Producto */}
        <div style={{background:C.card,borderRadius:12,padding:14,marginBottom:12,display:'flex',gap:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          {producto.foto_url ? (
            <img src={producto.foto_url} alt="" style={{width:80,height:80,objectFit:'cover',borderRadius:8}}/>
          ) : (
            <div style={{width:80,height:80,background:C.pinkSoft,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:28,opacity:0.3}}>👗</span>
            </div>
          )}
          <div>
            <span style={{fontSize:10,background:C.pinkSoft,color:C.pinkDark,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{producto.codigo}</span>
            <p style={{fontSize:14,fontWeight:700,margin:'4px 0'}}>{producto.nombre}</p>
            <p style={{fontSize:18,fontWeight:800,color:C.pink}}>S/ {producto.precio}</p>
          </div>
        </div>

        {/* Cantidad */}
        <div style={{background:C.card,borderRadius:12,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{fontSize:13,fontWeight:700,margin:'0 0 8px'}}>Cantidad</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16}}>
            <button onClick={()=>setCantidad(Math.max(1,cantidad-1))}
              style={{width:40,height:40,borderRadius:20,border:`2px solid ${C.pink}`,background:'transparent',color:C.pink,fontSize:20,cursor:'pointer'}}>-</button>
            <span style={{fontSize:28,fontWeight:800,minWidth:40,textAlign:'center'}}>{cantidad}</span>
            <button onClick={()=>setCantidad(cantidad+1)}
              style={{width:40,height:40,borderRadius:20,border:'none',background:C.pink,color:'#fff',fontSize:20,cursor:'pointer'}}>+</button>
          </div>
        </div>

        {/* Total */}
        <div style={{background:C.pink,borderRadius:12,padding:16,textAlign:'center',marginBottom:12}}>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:12,margin:0}}>Total</p>
          <p style={{color:'#fff',fontSize:32,fontWeight:800,margin:'4px 0'}}>S/ {total.toFixed(2)}</p>
        </div>

        {/* Método de pago */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
          {['Efectivo','Yape','Plin','Tarjeta'].map(m => (
            <button key={m} onClick={()=>setMetodo(m)}
              style={{padding:10,borderRadius:8,border:metodo===m?`2px solid ${C.pink}`:'2px solid transparent',
                background:metodo===m?C.pinkSoft:C.card,cursor:'pointer',fontSize:13,fontWeight:600,
                color:metodo===m?C.pinkDark:C.text}}>
              {m==='Efectivo'?'💵':m==='Yape'?'📱':m==='Plin'?'📱':'💳'} {m}
            </button>
          ))}
        </div>

        <button onClick={registrarVenta} disabled={saving}
          style={{width:'100%',padding:16,borderRadius:12,border:'none',background:C.pink,color:'#fff',
            fontSize:17,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 15px rgba(236,72,153,0.4)'}}>
          {saving ? 'Registrando...' : '✅ CONFIRMAR VENTA'}
        </button>
      </div>
    </div>
  )
}
