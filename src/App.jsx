import { useState, useEffect, useRef } from 'react'
import { supabase, comprimirImagen, subirFoto } from './supabase'

const G = { gold:'#C5A55A', goldDark:'#A8893E', goldLight:'#F9F5EB', goldSoft:'#F0E8D0',
  bg:'#FFFFFF', card:'#FFFFFF', text:'#1F2937', muted:'#6B7280', border:'#E8E3D8',
  success:'#10B981', danger:'#EF4444', warn:'#F59E0B' }

export default function App() {
  const [screen, setScreen] = useState('access')
  const [empresa, setEmpresa] = useState(null)
  const [lineas, setLineas] = useState([])
  const [lineaActiva, setLineaActiva] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [origenes, setOrigenes] = useState([])
  const [colores, setColores] = useState([])
  const [productos, setProductos] = useState([])
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [ventaProduct, setVentaProduct] = useState(null)

  const notify = (m,t='success') => { setNotif({m,t}); setTimeout(()=>setNotif(null),3000) }

  useEffect(() => {
    const key = localStorage.getItem('ia_access_key')
    if (key) loginWithKey(key)
  }, [])

  const loginWithKey = async (key) => {
    setLoading(true)
    const { data } = await supabase.from('empresas').select('*').eq('access_key', key).eq('activo', true).single()
    if (data) {
      setEmpresa(data)
      localStorage.setItem('ia_access_key', key)
      await loadAll(data.id)
      setScreen('catalogo')
    } else { notify('Clave inválida','error'); localStorage.removeItem('ia_access_key') }
    setLoading(false)
  }

  const logout = () => { localStorage.removeItem('ia_access_key'); setEmpresa(null); setScreen('access') }

  const loadAll = async (eid) => {
    const id = eid || empresa?.id
    if (!id) return
    const [ln, cat, ori, col, prod, cli, ven] = await Promise.all([
      supabase.from('lineas').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('categorias').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('origenes').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('colores').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('productos').select('*,categorias(nombre),origenes(nombre),lineas(nombre)').eq('empresa_id',id).eq('activo',true).order('created_at',{ascending:false}),
      supabase.from('clientes').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('ventas').select('*,clientes(nombre)').eq('empresa_id',id).order('created_at',{ascending:false})
    ])
    setLineas(ln.data||[]); setCategorias(cat.data||[]); setOrigenes(ori.data||[])
    setColores(col.data||[]); setProductos(prod.data||[]); setClientes(cli.data||[]); setVentas(ven.data||[])
    if (!lineaActiva && ln.data?.length) setLineaActiva(ln.data[0])
  }

  const eid = empresa?.id
  const lid = lineaActiva?.id
  const titulo = `${empresa?.nombre||''} › ${lineaActiva?.nombre||''}`
  const catsFilt = categorias.filter(c=>c.linea_id===lid)
  const origFilt = origenes.filter(o=>o.linea_id===lid)
  const prodFilt = productos.filter(p=>p.linea_id===lid)
  const P = { empresa, eid, lid, titulo, lineas, lineaActiva, setLineaActiva, categorias:catsFilt, origenes:origFilt,
    colores, productos:prodFilt, allProductos:productos, clientes, ventas, notify, loadAll, setScreen, setEditProduct,
    setVentaProduct, logout, G }

  return (
    <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:G.bg,position:'relative',paddingBottom:68}}>
      {notif&&<div style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',zIndex:999,
        background:notif.t==='success'?G.success:G.danger,color:'#fff',padding:'10px 20px',
        borderRadius:12,fontSize:14,fontWeight:600,boxShadow:'0 4px 15px rgba(0,0,0,0.2)'}}>{notif.m}</div>}
      {screen==='access'&&<AccessScreen loginWithKey={loginWithKey} loading={loading} G={G}/>}
      {screen==='catalogo'&&<CatalogoScreen {...P}/>}
      {screen==='registrar'&&<RegistrarScreen {...P} editProduct={editProduct}/>}
      {screen==='buscar'&&<BuscarScreen {...P}/>}
      {screen==='venta'&&<VentaScreen {...P} producto={ventaProduct}/>}
      {screen==='submenu'&&<SubMenuScreen {...P}/>}
      {screen==='lineas'&&<MantScreen tipo="lineas" data={lineas} {...P}/>}
      {screen==='categorias'&&<MantScreen tipo="categorias" data={catsFilt} {...P}/>}
      {screen==='origenes'&&<MantScreen tipo="origenes" data={origFilt} {...P}/>}
      {screen==='colores'&&<MantScreen tipo="colores" data={colores} {...P}/>}
      {screen==='clientes'&&<ClientesScreen {...P}/>}
      {screen==='stock'&&<StockScreen {...P}/>}
      {screen==='historial'&&<HistorialScreen {...P}/>}
      {empresa&&screen!=='access'&&<NavBar screen={screen} setScreen={setScreen} setEditProduct={setEditProduct} G={G}/>}
    </div>
  )
}

/* ═══ ACCESS ═══ */
function AccessScreen({loginWithKey,loading,G}){
  const [key,setKey]=useState('')
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1A1A1A,#2D2D2D)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{fontSize:48,marginBottom:8}}>🔑</div>
      <h1 style={{color:G.gold,fontSize:26,fontWeight:800,margin:'0 0 4px'}}>IA <span style={{color:'#E8E8E8'}}>PROCESOS</span></h1>
      <p style={{color:'#999',fontSize:13,marginBottom:32}}>Ingresa tu clave de acceso</p>
      <input value={key} onChange={e=>setKey(e.target.value.toUpperCase())} placeholder="CLAVE DE ACCESO"
        style={{width:'100%',maxWidth:300,padding:14,borderRadius:10,border:'2px solid '+G.gold,background:'#333',
          color:'#fff',fontSize:18,fontWeight:700,textAlign:'center',letterSpacing:3,boxSizing:'border-box'}}/>
      <button onClick={()=>key&&loginWithKey(key)} disabled={!key||loading}
        style={{width:'100%',maxWidth:300,padding:14,borderRadius:10,border:'none',background:key?G.gold:'#555',
          color:key?'#1A1A1A':'#888',fontSize:16,fontWeight:700,cursor:key?'pointer':'default',marginTop:12}}>
        {loading?'Verificando...':'Entrar'}
      </button>
      <p style={{color:'#555',fontSize:11,marginTop:40}}>IA Procesos © 2026</p>
    </div>
  )
}

/* ═══ NAV BAR ═══ */
function NavBar({screen,setScreen,setEditProduct,G}){
  const items=[{id:'catalogo',icon:'📦',l:'Catálogo'},{id:'registrar',icon:'➕',l:'Registrar'},{id:'buscar',icon:'🔍',l:'Buscar'},{id:'submenu',icon:'⚙️',l:'Más'}]
  return(
    <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,
      background:'#fff',borderTop:'2px solid '+G.goldSoft,padding:'6px 0 env(safe-area-inset-bottom,6px)',display:'flex',justifyContent:'space-around',zIndex:100}}>
      {items.map(i=>(
        <button key={i.id} onClick={()=>{setScreen(i.id);if(i.id==='registrar')setEditProduct(null)}}
          style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,padding:'4px 8px'}}>
          <span style={{fontSize:18}}>{i.icon}</span>
          <span style={{fontSize:9,color:screen===i.id?G.gold:G.muted,fontWeight:screen===i.id?700:400}}>{i.l}</span>
        </button>
      ))}
    </div>
  )
}

/* ═══ CAMERA INLINE ═══ */
function CameraModal({onCapture,onClose,G}){
  const videoRef=useRef(null),streamRef=useRef(null)
  const [ready,setReady]=useState(false)
  useEffect(()=>{
    let m=true
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}})
      .then(s=>{if(!m){s.getTracks().forEach(t=>t.stop());return};streamRef.current=s;if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.play()};setReady(true)})
      .catch(()=>{if(m)onClose()})
    return()=>{m=false;if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop())}
  },[])
  const capture=()=>{const v=videoRef.current;if(!v)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);c.toBlob(b=>{if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop());onCapture(b)},'image/jpeg',0.85)}
  return(
    <div style={{position:'fixed',inset:0,background:'#000',zIndex:9999,display:'flex',flexDirection:'column'}}>
      <video ref={videoRef} autoPlay playsInline muted style={{flex:1,objectFit:'cover',width:'100%'}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:20,display:'flex',justifyContent:'center',alignItems:'center',gap:20,background:'linear-gradient(transparent,rgba(0,0,0,0.7))'}}>
        <button onClick={()=>{if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop());onClose()}}
          style={{width:50,height:50,borderRadius:25,border:'2px solid #fff',background:'rgba(255,255,255,0.2)',color:'#fff',fontSize:18,cursor:'pointer'}}>✕</button>
        <button onClick={capture} disabled={!ready}
          style={{width:70,height:70,borderRadius:35,border:'4px solid #fff',background:ready?G.gold:'#666',cursor:'pointer'}}/>
        <div style={{width:50}}/>
      </div>
    </div>
  )
}

/* ═══ HEADER ═══ */
function Header({titulo,seccion,onBack,setScreen,G}){
  return(
    <div style={{background:G.gold,padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
      {onBack&&<button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'#fff',fontSize:18}}>←</button>}
      <div style={{flex:1}}>
        <p style={{color:'rgba(255,255,255,0.8)',fontSize:10,margin:0}}>{titulo}</p>
        <h2 style={{color:'#fff',fontSize:16,fontWeight:700,margin:0}}>{seccion}</h2>
      </div>
    </div>
  )
}

/* ═══ LINE SELECTOR ═══ */
function LineSelector({lineas,lineaActiva,setLineaActiva,G}){
  return(
    <div style={{display:'flex',gap:6,padding:'10px 16px',overflowX:'auto',background:G.goldLight}} className="scrollbar-hide">
      {lineas.map(l=>(
        <button key={l.id} onClick={()=>setLineaActiva(l)}
          style={{padding:'6px 16px',borderRadius:20,border:'none',whiteSpace:'nowrap',fontSize:13,fontWeight:600,cursor:'pointer',
            background:lineaActiva?.id===l.id?G.gold:'#fff',color:lineaActiva?.id===l.id?'#fff':G.gold}}>
          {l.nombre}
        </button>
      ))}
    </div>
  )
}

/* ═══ CATÁLOGO ═══ */
function CatalogoScreen(P){
  const {titulo,lineas,lineaActiva,setLineaActiva,productos,setScreen,setEditProduct,setVentaProduct,logout,G}=P
  const [filtro,setFiltro]=useState('')
  const filtered=productos.filter(p=>!filtro||p.nombre?.toLowerCase().includes(filtro.toLowerCase())||p.codigo?.toLowerCase().includes(filtro.toLowerCase()))

  const eliminar=async(p)=>{
    const {data:v}=await supabase.from('ventas').select('id').eq('producto_id',p.id).limit(1)
    if(v&&v.length>0){P.notify('No se puede eliminar, tiene ventas registradas','error');return}
    if(!confirm('¿Eliminar '+p.nombre+'?'))return
    await supabase.from('productos').update({activo:false}).eq('id',p.id)
    P.notify('Producto eliminado');await P.loadAll()
  }

  return(
    <div>
      <div style={{background:G.gold,padding:'16px 16px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div><p style={{color:'rgba(255,255,255,0.8)',fontSize:10,margin:0}}>{P.empresa?.nombre}</p>
            <h1 style={{color:'#fff',fontSize:18,fontWeight:800,margin:0}}>📦 Catálogo</h1></div>
          <button onClick={logout} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,padding:'6px 10px',color:'#fff',fontSize:11,cursor:'pointer'}}>Salir</button>
        </div>
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Filtrar por nombre, código..."
          style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'none',fontSize:14,background:'rgba(255,255,255,0.9)',boxSizing:'border-box'}}/>
      </div>
      <LineSelector lineas={lineas} lineaActiva={lineaActiva} setLineaActiva={setLineaActiva} G={G}/>
      <div style={{padding:'4px 12px 16px',fontSize:12,color:G.muted}}>{filtered.length} productos en {lineaActiva?.nombre}</div>
      {filtered.length===0?(
        <div style={{textAlign:'center',padding:40,color:G.muted}}>
          <p style={{fontSize:40}}>📦</p><p>{productos.length===0?'No hay productos':'Sin resultados'}</p>
          {productos.length===0&&<button onClick={()=>setScreen('registrar')} style={{marginTop:12,padding:'10px 24px',borderRadius:10,border:'none',background:G.gold,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>➕ Registrar</button>}
        </div>
      ):(
        <div style={{padding:'0 12px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {filtered.map(p=>(
            <div key={p.id} style={{background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.08)',border:'1px solid '+G.border}}>
              {p.foto_url?<img src={p.foto_url} alt="" style={{width:'100%',height:130,objectFit:'cover'}}/>
              :<div style={{width:'100%',height:130,background:G.goldLight,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:36,opacity:0.3}}>📦</span></div>}
              <div style={{padding:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
                  <span style={{fontSize:9,background:G.goldSoft,color:G.goldDark,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{p.codigo}</span>
                  <span style={{fontSize:13,fontWeight:800,color:G.gold}}>S/{p.precio}</span>
                </div>
                <p style={{fontSize:11,fontWeight:600,margin:'4px 0 2px',color:G.text,lineHeight:1.2}}>{p.nombre}</p>
                <p style={{fontSize:9,color:G.muted,margin:0}}>Stock: {p.cantidad}</p>
                <div style={{display:'flex',gap:3,marginTop:6}}>
                  <button onClick={()=>{setEditProduct(p);setScreen('registrar')}} style={{flex:1,padding:5,borderRadius:5,border:'1px solid '+G.gold,background:'transparent',color:G.gold,fontSize:10,fontWeight:600,cursor:'pointer'}}>Editar</button>
                  <button onClick={()=>{setVentaProduct(p);setScreen('venta')}} disabled={p.cantidad<=0} style={{flex:1,padding:5,borderRadius:5,border:'none',background:p.cantidad>0?G.gold:'#ccc',color:'#fff',fontSize:10,fontWeight:600,cursor:'pointer'}}>Vender</button>
                  <button onClick={()=>eliminar(p)} style={{padding:5,borderRadius:5,border:'1px solid #eee',background:'transparent',color:G.danger,fontSize:10,cursor:'pointer'}}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══ REGISTRAR ═══ */
function RegistrarScreen(P){
  const {eid,lid,titulo,categorias,origenes,colores,notify,loadAll,setScreen,editProduct,G}=P
  const ep=editProduct
  const [f,setF]=useState(ep?{codigo:ep.codigo||'',nombre:ep.nombre||'',precio:String(ep.precio||''),color:ep.color||'',
    cantidad:String(ep.cantidad||1),categoria_id:ep.categoria_id||'',origen_id:ep.origen_id||'',observacion:ep.observacion||'',
    atributos:ep.atributos||{}}:{codigo:'',nombre:'',precio:'',color:'',cantidad:'1',categoria_id:'',origen_id:'',observacion:'',atributos:{}})
  const [fotoFile,setFotoFile]=useState(null)
  const [fotoPreview,setFotoPreview]=useState(ep?.foto_url||null)
  const [saving,setSaving]=useState(false)
  const [ocrLoading,setOcrLoading]=useState(false)
  const [cam,setCam]=useState(null)
  const [colorSearch,setColorSearch]=useState('')
  const fileRef=useRef(null)
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  const setAttr=(k,v)=>setF(p=>({...p,atributos:{...p.atributos,[k]:v}}))

  const catSel=categorias.find(c=>c.id===parseInt(f.categoria_id))
  const tallas=catSel?.tallas||[]
  const attrsDef=catSel?.atributos||[]
  const colorsFilt=colores.filter(c=>!colorSearch||c.nombre.toLowerCase().includes(colorSearch.toLowerCase()))

  // Auto nombre
  useEffect(()=>{
    if(ep)return
    const parts=[catSel?.nombre||'']
    if(f.color)parts.push(f.color)
    if(f.atributos){Object.values(f.atributos).forEach(v=>{if(v)parts.push(v)})}
    const auto=parts.filter(Boolean).join(' ')
    if(auto&&auto!==catSel?.nombre)set('nombre',auto)
  },[f.categoria_id,f.color,f.atributos])

  // Origen → precio defecto
  const onOrigenChange=(v)=>{set('origen_id',v);const o=origenes.find(x=>x.id===parseInt(v));if(o?.precio_defecto&&!f.precio)set('precio',String(o.precio_defecto))}

  const onCamCapture=async(blob)=>{
    if(cam==='label'){
      setCam(null);setOcrLoading(true)
      try{
        const comp=await comprimirImagen(new File([blob],'l.jpg'),600)
        const b64=await blobToBase64(comp)
        const fd=new FormData();fd.append('base64Image','data:image/jpeg;base64,'+b64);fd.append('OCREngine','3');fd.append('isTable','false')
        const r=await fetch('https://api.ocr.space/parse/image',{method:'POST',headers:{'apikey':'K85837551988957'},body:fd})
        const d=await r.json();const t=(d?.ParsedResults?.[0]?.ParsedText||'').trim().replace(/[^a-zA-Z0-9]/g,'')
        if(t){set('codigo',t.substring(0,20).toUpperCase());notify('Código: '+t.substring(0,20).toUpperCase())}
        else notify('No se pudo leer','error')
      }catch(e){notify('Error OCR','error')}
      setOcrLoading(false)
    }else if(cam==='product'){
      setCam(null);setFotoFile(new File([blob],'p.jpg',{type:'image/jpeg'}))
      const r=new FileReader();r.onload=e=>setFotoPreview(e.target.result);r.readAsDataURL(blob)
    }
  }

  const onFileSelect=(e)=>{const file=e.target.files?.[0];if(!file)return;setFotoFile(file);const r=new FileReader();r.onload=ev=>setFotoPreview(ev.target.result);r.readAsDataURL(file)}

  const guardar=async()=>{
    if(!f.codigo||!f.nombre){notify('Código y nombre obligatorios','error');return}
    setSaving(true)
    try{
      let foto_url=ep?.foto_url||null
      if(fotoFile){const blob=await comprimirImagen(fotoFile,800);foto_url=await subirFoto(blob,f.codigo)}
      const data={empresa_id:eid,linea_id:lid,categoria_id:f.categoria_id||null,origen_id:f.origen_id||null,
        codigo:f.codigo,nombre:f.nombre,precio:parseFloat(f.precio)||0,cantidad:parseInt(f.cantidad)||1,
        color:f.color,atributos:f.atributos,observacion:f.observacion,foto_url,updated_at:new Date().toISOString()}
      if(ep){const{error}=await supabase.from('productos').update(data).eq('id',ep.id);if(error)throw error;notify('Actualizado')}
      else{const{error}=await supabase.from('productos').insert(data);if(error)throw error;notify('Registrado')}
      await loadAll();setScreen('catalogo')
    }catch(e){notify('Error: '+e.message,'error')}
    setSaving(false)
  }

  return(
    <div>
      {cam&&<CameraModal G={G} onCapture={onCamCapture} onClose={()=>setCam(null)}/>}
      <Header titulo={titulo} seccion={ep?'✏️ Editar':'➕ Registrar'} onBack={()=>setScreen('catalogo')} G={G}/>
      <div style={{padding:16}}>
        {/* Código */}
        <Card G={G} title="1. Código de etiqueta">
          <div style={{display:'flex',gap:8}}>
            <input value={f.codigo} onChange={e=>set('codigo',e.target.value.toUpperCase())} placeholder="125, X5..."
              style={{flex:1,padding:10,borderRadius:8,border:'1px solid '+G.border,fontSize:18,fontWeight:700,letterSpacing:2}}/>
            <button onClick={()=>setCam('label')} disabled={ocrLoading}
              style={{padding:'10px 12px',borderRadius:8,border:'none',background:ocrLoading?G.muted:G.gold,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
              {ocrLoading?'⏳':'📷 Escanear'}
            </button>
          </div>
        </Card>
        {/* Foto */}
        <Card G={G} title="2. Foto del producto">
          {fotoPreview?(
            <div style={{position:'relative'}}>
              <img src={fotoPreview} alt="" style={{width:'100%',height:180,objectFit:'cover',borderRadius:8}}/>
              <button onClick={()=>{setFotoPreview(null);setFotoFile(null)}} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.5)',color:'#fff',border:'none',borderRadius:16,width:28,height:28,fontSize:14,cursor:'pointer'}}>✕</button>
            </div>
          ):(
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setCam('product')} style={{flex:1,padding:20,borderRadius:8,border:'2px dashed '+G.gold,background:G.goldLight,cursor:'pointer',textAlign:'center'}}>
                <span style={{fontSize:24,display:'block'}}>📷</span><span style={{fontSize:11,color:G.gold,fontWeight:600}}>Cámara</span>
              </button>
              <button onClick={()=>fileRef.current?.click()} style={{flex:1,padding:20,borderRadius:8,border:'2px dashed '+G.border,background:G.goldLight,cursor:'pointer',textAlign:'center'}}>
                <span style={{fontSize:24,display:'block'}}>📁</span><span style={{fontSize:11,color:G.muted,fontWeight:600}}>Galería</span>
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFileSelect} style={{display:'none'}}/>
        </Card>
        {/* Datos */}
        <Card G={G} title="3. Datos del producto">
          <label style={{fontSize:11,color:G.muted}}>Origen</label>
          <select value={f.origen_id} onChange={e=>onOrigenChange(e.target.value)} style={selStyle(G)}>
            <option value="">Seleccionar origen</option>
            {origenes.map(o=><option key={o.id} value={o.id}>{o.nombre}{o.precio_defecto?' (S/'+o.precio_defecto+')':''}</option>)}
          </select>
          <label style={{fontSize:11,color:G.muted}}>Categoría</label>
          <select value={f.categoria_id} onChange={e=>set('categoria_id',e.target.value)} style={selStyle(G)}>
            <option value="">Seleccionar categoría</option>
            {categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {/* Tallas dinámicas */}
          {tallas.length>0&&(<>
            <label style={{fontSize:11,color:G.muted}}>Talla</label>
            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
              {tallas.map(t=><button key={t} onClick={()=>setAttr('talla',t)}
                style={{padding:'6px 10px',borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
                  background:f.atributos?.talla===t?G.gold:G.goldSoft,color:f.atributos?.talla===t?'#fff':G.goldDark}}>{t}</button>)}
            </div>
          </>)}
          {/* Atributos dinámicos */}
          {attrsDef.map(a=>(
            <div key={a.key} style={{marginBottom:8}}>
              <label style={{fontSize:11,color:G.muted}}>{a.label}</label>
              {a.tipo==='select'?(
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {a.opciones.map(op=><button key={op} onClick={()=>setAttr(a.key,op)}
                    style={{padding:'6px 10px',borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
                      background:f.atributos?.[a.key]===op?G.gold:G.goldSoft,color:f.atributos?.[a.key]===op?'#fff':G.goldDark}}>{op}</button>)}
                </div>
              ):<input value={f.atributos?.[a.key]||''} onChange={e=>setAttr(a.key,e.target.value)} style={inpStyle(G)}/>}
            </div>
          ))}
          {/* Género (para ropa) */}
          {catSel&&tallas.length>0&&!attrsDef.find(a=>a.key==='genero')&&(<>
            <label style={{fontSize:11,color:G.muted}}>Género</label>
            <div style={{display:'flex',gap:6,marginBottom:8}}>
              {['Mujer','Hombre','Unisex'].map(g=><button key={g} onClick={()=>setAttr('genero',g)}
                style={{flex:1,padding:8,borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
                  background:f.atributos?.genero===g?G.gold:G.goldSoft,color:f.atributos?.genero===g?'#fff':G.goldDark}}>{g}</button>)}
            </div>
          </>)}
          {/* Color con autocompletado */}
          <label style={{fontSize:11,color:G.muted}}>Color</label>
          <input value={f.color} onChange={e=>{set('color',e.target.value);setColorSearch(e.target.value)}} placeholder="Escribe o selecciona..." style={inpStyle(G)}/>
          {colorSearch&&colorsFilt.length>0&&f.color!==colorsFilt[0]?.nombre&&(
            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
              {colorsFilt.slice(0,8).map(c=><button key={c.id} onClick={()=>{set('color',c.nombre);setColorSearch('')}}
                style={{padding:'4px 10px',borderRadius:12,border:'1px solid '+G.border,background:'#fff',fontSize:11,cursor:'pointer',color:G.text}}>{c.nombre}</button>)}
            </div>
          )}
          <label style={{fontSize:11,color:G.muted}}>Precio (S/)</label>
          <input value={f.precio} onChange={e=>set('precio',e.target.value)} type="number" placeholder="0.00" style={inpStyle(G)}/>
          <label style={{fontSize:11,color:G.muted}}>Cantidad</label>
          <input value={f.cantidad} onChange={e=>set('cantidad',e.target.value)} type="number" placeholder="1" style={inpStyle(G)}/>
          <label style={{fontSize:11,color:G.muted}}>Nombre (auto-generado)</label>
          <input value={f.nombre} onChange={e=>set('nombre',e.target.value)} style={inpStyle(G)}/>
          <label style={{fontSize:11,color:G.muted}}>Observación</label>
          <textarea value={f.observacion} onChange={e=>set('observacion',e.target.value)} rows={2} style={{...inpStyle(G),resize:'vertical'}}/>
        </Card>
        <button onClick={guardar} disabled={saving||!f.codigo}
          style={{width:'100%',padding:16,borderRadius:12,border:'none',background:f.codigo?G.gold:'#ccc',color:'#fff',
            fontSize:16,fontWeight:800,cursor:f.codigo?'pointer':'default',boxShadow:f.codigo?'0 4px 15px rgba(197,165,90,0.4)':'none',marginBottom:20}}>
          {saving?'Guardando...':ep?'✅ Actualizar':'✅ Registrar producto'}
        </button>
      </div>
    </div>
  )
}

function Card({G,title,children}){return(<div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid '+G.border}}>
  {title&&<p style={{fontSize:13,fontWeight:700,margin:'0 0 8px',color:G.text}}>{title}</p>}{children}</div>)}
function blobToBase64(b){return new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result.split(',')[1]);rd.readAsDataURL(b)})}
const inpStyle=(G)=>({width:'100%',padding:10,borderRadius:8,border:'1px solid '+G.border,fontSize:14,color:G.text,boxSizing:'border-box',marginBottom:8})
const selStyle=(G)=>({width:'100%',padding:10,borderRadius:8,border:'1px solid '+G.border,fontSize:14,marginBottom:8,background:'#fff'})

/* ═══ BUSCAR ═══ */
function BuscarScreen(P){
  const {titulo,allProductos,productos,notify,setScreen,setEditProduct,setVentaProduct,G}=P
  const [modo,setModo]=useState('texto')
  const [q,setQ]=useState('')
  const [results,setResults]=useState(null)
  const [searching,setSearching]=useState(false)
  const [cam,setCam]=useState(null)
  const fileRef=useRef(null)

  const buscarTexto=()=>{if(!q.trim())return;const s=q.toLowerCase()
    setResults(allProductos.filter(p=>p.nombre?.toLowerCase().includes(s)||p.codigo?.toLowerCase().includes(s)||p.color?.toLowerCase().includes(s)))}

  const onCamCapture=async(blob)=>{
    setCam(null);setSearching(true)
    try{
      const comp=await comprimirImagen(new File([blob],'s.jpg'),600)
      const b64=await blobToBase64(comp)
      const fd=new FormData();fd.append('base64Image','data:image/jpeg;base64,'+b64);fd.append('OCREngine','3');fd.append('isTable','false')
      const r=await fetch('https://api.ocr.space/parse/image',{method:'POST',headers:{'apikey':'K85837551988957'},body:fd})
      const d=await r.json();const t=(d?.ParsedResults?.[0]?.ParsedText||'').trim().replace(/[^a-zA-Z0-9]/g,'')
      if(t){setQ(t.toUpperCase());setResults(allProductos.filter(p=>p.codigo?.toUpperCase()===t.toUpperCase()))
        if(allProductos.filter(p=>p.codigo?.toUpperCase()===t.toUpperCase()).length===0)notify('Código no encontrado','error')
      }else notify('No se pudo leer','error')
    }catch(e){notify('Error','error')}
    setSearching(false)
  }

  const buscarPorFoto=async(e)=>{
    const file=e?.target?.files?.[0];if(!file)return;setSearching(true)
    // Comparación simple por color dominante y nombre
    notify('Búsqueda por foto en desarrollo','error');setSearching(false)
  }

  return(
    <div>
      <Header titulo={titulo} seccion="🔍 Buscar" onBack={()=>setScreen('catalogo')} G={G}/>
      {cam&&<CameraModal G={G} onCapture={onCamCapture} onClose={()=>setCam(null)}/>}
      <div style={{padding:16}}>
        <div style={{display:'flex',gap:6,marginBottom:12}}>
          {[{id:'texto',i:'⌨️',l:'Nombre'},{id:'codigo',i:'📷',l:'Foto código'},{id:'foto',i:'🖼️',l:'Foto producto'}].map(m=>(
            <button key={m.id} onClick={()=>setModo(m.id)}
              style={{flex:1,padding:8,borderRadius:8,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',
                background:modo===m.id?G.gold:G.goldSoft,color:modo===m.id?'#fff':G.goldDark}}>{m.i} {m.l}</button>
          ))}
        </div>
        {modo==='texto'&&(
          <div style={{display:'flex',gap:8}}>
            <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&buscarTexto()}
              placeholder="Nombre, código, color..." style={{flex:1,...inpStyle(G)}}/>
            <button onClick={buscarTexto} style={{padding:'10px 16px',borderRadius:8,border:'none',background:G.gold,color:'#fff',fontWeight:700,cursor:'pointer'}}>Buscar</button>
          </div>
        )}
        {modo==='codigo'&&(
          <button onClick={()=>setCam('scan')} disabled={searching}
            style={{width:'100%',padding:20,borderRadius:8,border:'2px dashed '+G.gold,background:G.goldLight,cursor:'pointer',textAlign:'center'}}>
            <span style={{fontSize:28,display:'block'}}>{searching?'⏳':'📷'}</span>
            <span style={{fontSize:13,color:G.gold,fontWeight:600}}>{searching?'Leyendo...':'Escanear etiqueta'}</span>
          </button>
        )}
        {modo==='foto'&&(
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setCam('photo_search')} style={{flex:1,padding:20,borderRadius:8,border:'2px dashed '+G.gold,background:G.goldLight,cursor:'pointer',textAlign:'center'}}>
              <span style={{fontSize:24,display:'block'}}>📷</span><span style={{fontSize:11,color:G.gold,fontWeight:600}}>Cámara</span>
            </button>
            <button onClick={()=>fileRef.current?.click()} style={{flex:1,padding:20,borderRadius:8,border:'2px dashed '+G.border,background:G.goldLight,cursor:'pointer',textAlign:'center'}}>
              <span style={{fontSize:24,display:'block'}}>📁</span><span style={{fontSize:11,color:G.muted,fontWeight:600}}>Galería</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={buscarPorFoto} style={{display:'none'}}/>
          </div>
        )}
        {results&&<p style={{fontSize:12,color:G.muted,margin:'12px 0 8px'}}>{results.length} resultado(s)</p>}
        {results?.map(p=>(
          <div key={p.id} style={{background:'#fff',borderRadius:12,padding:10,marginBottom:8,display:'flex',gap:10,border:'1px solid '+G.border}}>
            {p.foto_url?<img src={p.foto_url} alt="" style={{width:65,height:65,objectFit:'cover',borderRadius:8}}/>
            :<div style={{width:65,height:65,background:G.goldLight,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:20,opacity:0.3}}>📦</span></div>}
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:9,background:G.goldSoft,color:G.goldDark,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{p.codigo}</span><span style={{fontSize:13,fontWeight:800,color:G.gold}}>S/{p.precio}</span></div>
              <p style={{fontSize:12,fontWeight:600,margin:'3px 0 1px'}}>{p.nombre}</p>
              <p style={{fontSize:9,color:G.muted,margin:0}}>Stock: {p.cantidad}</p>
              <div style={{display:'flex',gap:4,marginTop:4}}>
                <button onClick={()=>{setEditProduct(p);setScreen('registrar')}} style={{padding:'3px 8px',borderRadius:4,border:'1px solid '+G.gold,background:'transparent',color:G.gold,fontSize:9,fontWeight:600,cursor:'pointer'}}>Editar</button>
                <button onClick={()=>{setVentaProduct(p);setScreen('venta')}} disabled={p.cantidad<=0} style={{padding:'3px 8px',borderRadius:4,border:'none',background:p.cantidad>0?G.gold:'#ccc',color:'#fff',fontSize:9,fontWeight:600,cursor:'pointer'}}>Vender</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ VENTA ═══ */
function VentaScreen(P){
  const {eid,titulo,producto,clientes,notify,loadAll,setScreen,G}=P
  const [cant,setCant]=useState(1)
  const [precio,setPrecio]=useState(String(producto?.precio||0))
  const [metodo,setMetodo]=useState('Efectivo')
  const [entrega,setEntrega]=useState('En tienda')
  const [clienteId,setClienteId]=useState('')
  const [clienteBusq,setClienteBusq]=useState('')
  const [showNewCli,setShowNewCli]=useState(false)
  const [newCli,setNewCli]=useState({nombre:'',telefono:''})
  const [nota,setNota]=useState('')
  const [saving,setSaving]=useState(false)
  if(!producto)return null
  const total=parseFloat(precio)*cant
  const cliFilt=clientes.filter(c=>!clienteBusq||c.nombre?.toLowerCase().includes(clienteBusq.toLowerCase())||c.telefono?.includes(clienteBusq))

  const crearCliente=async()=>{
    if(!newCli.nombre){notify('Nombre obligatorio','error');return}
    const cod='C'+String(clientes.length+1).padStart(4,'0')
    const{data,error}=await supabase.from('clientes').insert({empresa_id:eid,codigo:cod,nombre:newCli.nombre,telefono:newCli.telefono}).select().single()
    if(error){notify('Error','error');return}
    await loadAll();setClienteId(data.id);setShowNewCli(false);notify('Cliente creado')
  }

  const vender=async()=>{
    if(cant>producto.cantidad){notify('Stock insuficiente. Disponible: '+producto.cantidad,'error');return}
    if(cant<=0){notify('Cantidad inválida','error');return}
    setSaving(true)
    try{
      await supabase.from('ventas').insert({empresa_id:eid,producto_id:producto.id,cliente_id:clienteId||null,
        codigo_producto:producto.codigo,nombre_producto:producto.nombre,
        precio_original:producto.precio,precio_venta:parseFloat(precio),cantidad:cant,total,
        metodo_pago:metodo,tipo_entrega:entrega,nota})
      await supabase.from('productos').update({cantidad:producto.cantidad-cant}).eq('id',producto.id)
      notify('¡Venta registrada! S/'+total.toFixed(2));await loadAll();setScreen('catalogo')
    }catch(e){notify('Error: '+e.message,'error')}
    setSaving(false)
  }

  return(
    <div>
      <Header titulo={titulo} seccion="💰 Vender" onBack={()=>setScreen('catalogo')} G={G}/>
      <div style={{padding:16}}>
        {/* Producto */}
        <Card G={G}>
          <div style={{display:'flex',gap:12}}>
            {producto.foto_url?<img src={producto.foto_url} alt="" style={{width:75,height:75,objectFit:'cover',borderRadius:8}}/>
            :<div style={{width:75,height:75,background:G.goldLight,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:24,opacity:0.3}}>📦</span></div>}
            <div><span style={{fontSize:9,background:G.goldSoft,color:G.goldDark,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{producto.codigo}</span>
              <p style={{fontSize:14,fontWeight:700,margin:'4px 0'}}>{producto.nombre}</p>
              <p style={{fontSize:11,color:G.muted}}>Stock: {producto.cantidad}</p></div>
          </div>
        </Card>
        {/* Precio */}
        <Card G={G} title="Precio de venta">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:16,fontWeight:700,color:G.muted}}>S/</span>
            <input value={precio} onChange={e=>setPrecio(e.target.value)} type="number"
              style={{flex:1,padding:10,borderRadius:8,border:'2px solid '+G.gold,fontSize:22,fontWeight:700,textAlign:'center'}}/>
          </div>
          {parseFloat(precio)!==producto.precio&&<p style={{fontSize:10,color:G.warn,margin:'4px 0 0'}}>Precio original: S/{producto.precio}</p>}
        </Card>
        {/* Cantidad */}
        <Card G={G} title="Cantidad">
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16}}>
            <button onClick={()=>setCant(Math.max(1,cant-1))} style={{width:40,height:40,borderRadius:20,border:'2px solid '+G.gold,background:'transparent',color:G.gold,fontSize:20,cursor:'pointer'}}>-</button>
            <span style={{fontSize:28,fontWeight:800,minWidth:40,textAlign:'center'}}>{cant}</span>
            <button onClick={()=>setCant(Math.min(producto.cantidad,cant+1))} style={{width:40,height:40,borderRadius:20,border:'none',background:G.gold,color:'#fff',fontSize:20,cursor:'pointer'}}>+</button>
          </div>
          {cant>producto.cantidad&&<p style={{textAlign:'center',fontSize:11,color:G.danger}}>Solo hay {producto.cantidad} disponibles</p>}
        </Card>
        {/* Total */}
        <div style={{background:G.gold,borderRadius:12,padding:14,textAlign:'center',marginBottom:12}}>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:12,margin:0}}>Total</p>
          <p style={{color:'#fff',fontSize:30,fontWeight:800,margin:'2px 0'}}>S/ {total.toFixed(2)}</p>
        </div>
        {/* Cliente */}
        <Card G={G} title="Cliente (opcional)">
          <input value={clienteBusq} onChange={e=>setClienteBusq(e.target.value)} placeholder="Buscar cliente..."
            style={inpStyle(G)}/>
          {clienteBusq&&cliFilt.length>0&&(
            <div style={{maxHeight:100,overflowY:'auto',marginBottom:8}}>
              {cliFilt.slice(0,5).map(c=>(
                <button key={c.id} onClick={()=>{setClienteId(c.id);setClienteBusq(c.nombre)}}
                  style={{width:'100%',padding:8,background:clienteId===c.id?G.goldSoft:'#fff',border:'1px solid '+G.border,
                    borderRadius:6,marginBottom:4,textAlign:'left',cursor:'pointer',fontSize:12}}>
                  {c.nombre} {c.telefono?'• '+c.telefono:''}
                </button>
              ))}
            </div>
          )}
          <button onClick={()=>setShowNewCli(!showNewCli)} style={{fontSize:11,color:G.gold,background:'none',border:'none',cursor:'pointer',fontWeight:600}}>
            ➕ Nuevo cliente rápido
          </button>
          {showNewCli&&(
            <div style={{background:G.goldLight,borderRadius:8,padding:10,marginTop:6}}>
              <input value={newCli.nombre} onChange={e=>setNewCli(p=>({...p,nombre:e.target.value}))} placeholder="Nombre" style={inpStyle(G)}/>
              <input value={newCli.telefono} onChange={e=>setNewCli(p=>({...p,telefono:e.target.value}))} placeholder="Teléfono" style={inpStyle(G)}/>
              <button onClick={crearCliente} style={{width:'100%',padding:8,borderRadius:6,border:'none',background:G.gold,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>Guardar cliente</button>
            </div>
          )}
        </Card>
        {/* Entrega */}
        <Card G={G} title="Entrega">
          <div style={{display:'flex',gap:8}}>
            {['En tienda','Delivery'].map(e=>(
              <button key={e} onClick={()=>setEntrega(e)}
                style={{flex:1,padding:10,borderRadius:8,border:entrega===e?'2px solid '+G.gold:'2px solid transparent',
                  background:entrega===e?G.goldSoft:'#f5f5f5',cursor:'pointer',fontSize:13,fontWeight:600,color:entrega===e?G.goldDark:G.text}}>
                {e==='En tienda'?'🏪':'🛵'} {e}
              </button>
            ))}
          </div>
        </Card>
        {/* Pago */}
        <Card G={G} title="Método de pago">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {['Efectivo','Yape','Plin','Tarjeta'].map(m=>(
              <button key={m} onClick={()=>setMetodo(m)}
                style={{padding:10,borderRadius:8,border:metodo===m?'2px solid '+G.gold:'2px solid transparent',
                  background:metodo===m?G.goldSoft:'#f5f5f5',cursor:'pointer',fontSize:12,fontWeight:600,color:metodo===m?G.goldDark:G.text}}>
                {m==='Efectivo'?'💵':m==='Yape'?'📱':m==='Plin'?'📱':'💳'} {m}
              </button>
            ))}
          </div>
        </Card>
        <button onClick={vender} disabled={saving||cant>producto.cantidad}
          style={{width:'100%',padding:16,borderRadius:12,border:'none',background:G.gold,color:'#fff',
            fontSize:17,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 15px rgba(197,165,90,0.4)',marginBottom:20}}>
          {saving?'Registrando...':'✅ CONFIRMAR VENTA'}
        </button>
      </div>
    </div>
  )
}

/* ═══ SUBMENÚ ═══ */
function SubMenuScreen(P){
  const {titulo,setScreen,G}=P
  const items=[
    {id:'lineas',i:'📏',l:'Líneas',d:'Ropa, Gatos, Cocina...'},
    {id:'categorias',i:'🏷️',l:'Categorías',d:'Por línea activa'},
    {id:'origenes',i:'📋',l:'Orígenes',d:'Fardos, entregas...'},
    {id:'colores',i:'🎨',l:'Colores',d:'Maestro de colores'},
    {id:'clientes',i:'👥',l:'Clientes',d:'Gestión de clientes'},
    {id:'stock',i:'📊',l:'Stock',d:'Inventario actual'},
    {id:'historial',i:'📋',l:'Ventas',d:'Historial y reportes'}
  ]
  return(
    <div>
      <Header titulo={titulo} seccion="⚙️ Más opciones" onBack={()=>setScreen('catalogo')} G={G}/>
      <div style={{padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        {items.map(it=>(
          <button key={it.id} onClick={()=>setScreen(it.id)}
            style={{background:'#fff',borderRadius:12,padding:16,border:'1px solid '+G.border,cursor:'pointer',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
            <span style={{fontSize:24,display:'block',marginBottom:6}}>{it.i}</span>
            <p style={{fontSize:14,fontWeight:700,margin:0,color:G.text}}>{it.l}</p>
            <p style={{fontSize:10,color:G.muted,margin:'2px 0 0'}}>{it.d}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══ MANTENIMIENTO GENÉRICO ═══ */
function MantScreen(P){
  const {tipo,data,eid,lid,titulo,notify,loadAll,setScreen,G}=P
  const [nuevo,setNuevo]=useState('')
  const [editId,setEditId]=useState(null)
  const [editVal,setEditVal]=useState('')
  const titulos={lineas:'📏 Líneas',categorias:'🏷️ Categorías',origenes:'📋 Orígenes',colores:'🎨 Colores'}

  const agregar=async()=>{
    if(!nuevo.trim())return
    const row={empresa_id:eid,nombre:nuevo.trim()}
    if(tipo==='categorias'||tipo==='origenes')row.linea_id=lid
    if(tipo==='categorias'){row.tallas=[];row.atributos=[]}
    const{error}=await supabase.from(tipo).insert(row)
    if(error){notify('Error: '+error.message,'error');return}
    setNuevo('');notify('Agregado');await loadAll()
  }

  const actualizar=async(id)=>{
    if(!editVal.trim())return
    await supabase.from(tipo).update({nombre:editVal.trim()}).eq('id',id)
    setEditId(null);notify('Actualizado');await loadAll()
  }

  const eliminar=async(id)=>{
    if(!confirm('¿Eliminar?'))return
    await supabase.from(tipo).update({activo:false}).eq('id',id)
    notify('Eliminado');await loadAll()
  }

  return(
    <div>
      <Header titulo={titulo} seccion={titulos[tipo]||tipo} onBack={()=>setScreen('submenu')} G={G}/>
      <div style={{padding:16}}>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <input value={nuevo} onChange={e=>setNuevo(e.target.value)} placeholder={'Nuevo...'} onKeyDown={e=>e.key==='Enter'&&agregar()}
            style={{flex:1,...inpStyle(G),marginBottom:0}}/>
          <button onClick={agregar} disabled={!nuevo.trim()}
            style={{padding:'10px 16px',borderRadius:8,border:'none',background:nuevo.trim()?G.gold:'#ccc',color:'#fff',fontWeight:700,cursor:'pointer'}}>➕</button>
        </div>
        {data.map(it=>(
          <div key={it.id} style={{background:'#fff',borderRadius:10,padding:12,marginBottom:6,display:'flex',alignItems:'center',gap:8,border:'1px solid '+G.border}}>
            {editId===it.id?(
              <><input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&actualizar(it.id)}
                  style={{flex:1,...inpStyle(G),marginBottom:0}}/>
                <button onClick={()=>actualizar(it.id)} style={{background:G.success,color:'#fff',border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:11}}>✓</button>
                <button onClick={()=>setEditId(null)} style={{background:G.muted,color:'#fff',border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:11}}>✕</button></>
            ):(
              <><span style={{flex:1,fontSize:14,fontWeight:500}}>{it.nombre}</span>
                {tipo==='origenes'&&it.precio_defecto&&<span style={{fontSize:10,color:G.gold,fontWeight:600}}>S/{it.precio_defecto}</span>}
                <button onClick={()=>{setEditId(it.id);setEditVal(it.nombre)}} style={{background:G.goldSoft,color:G.goldDark,border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:10,fontWeight:600}}>Editar</button>
                <button onClick={()=>eliminar(it.id)} style={{background:'#FEE2E2',color:G.danger,border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:10,fontWeight:600}}>🗑</button></>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ CLIENTES ═══ */
function ClientesScreen(P){
  const {eid,titulo,clientes,notify,loadAll,setScreen,G}=P
  const [showAdd,setShowAdd]=useState(false)
  const [f,setF]=useState({nombre:'',telefono:'',direccion:'',preferencias:'',acepta_publicidad:false})
  const [buscar,setBuscar]=useState('')
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  const filt=clientes.filter(c=>!buscar||c.nombre?.toLowerCase().includes(buscar.toLowerCase())||c.telefono?.includes(buscar))

  const guardar=async()=>{
    if(!f.nombre){notify('Nombre obligatorio','error');return}
    const cod='C'+String(clientes.length+1).padStart(4,'0')
    const{error}=await supabase.from('clientes').insert({empresa_id:eid,codigo:cod,...f})
    if(error){notify('Error','error');return}
    notify('Cliente creado');setShowAdd(false);setF({nombre:'',telefono:'',direccion:'',preferencias:'',acepta_publicidad:false});await loadAll()
  }

  return(
    <div>
      <Header titulo={titulo} seccion="👥 Clientes" onBack={()=>setScreen('submenu')} G={G}/>
      <div style={{padding:16}}>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar cliente..." style={{flex:1,...inpStyle(G),marginBottom:0}}/>
          <button onClick={()=>setShowAdd(true)} style={{padding:'10px 14px',borderRadius:8,border:'none',background:G.gold,color:'#fff',fontWeight:600,cursor:'pointer',fontSize:12}}>➕ Nuevo</button>
        </div>
        {showAdd&&(
          <Card G={G} title="Nuevo cliente">
            <input value={f.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Nombre completo o nickname" style={inpStyle(G)}/>
            <input value={f.telefono} onChange={e=>set('telefono',e.target.value)} placeholder="Teléfono" style={inpStyle(G)}/>
            <input value={f.direccion} onChange={e=>set('direccion',e.target.value)} placeholder="Dirección" style={inpStyle(G)}/>
            <textarea value={f.preferencias} onChange={e=>set('preferencias',e.target.value)} placeholder="Preferencias (qué le gusta)" rows={2} style={{...inpStyle(G),resize:'vertical'}}/>
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,marginBottom:8,cursor:'pointer'}}>
              <input type="checkbox" checked={f.acepta_publicidad} onChange={e=>set('acepta_publicidad',e.target.checked)}/>
              Acepta recibir publicidad
            </label>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:10,borderRadius:8,border:'1px solid '+G.border,background:'transparent',color:G.muted,fontSize:13,cursor:'pointer'}}>Cancelar</button>
              <button onClick={guardar} style={{flex:1,padding:10,borderRadius:8,border:'none',background:G.gold,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Guardar</button>
            </div>
          </Card>
        )}
        {filt.map(c=>(
          <div key={c.id} style={{background:'#fff',borderRadius:10,padding:12,marginBottom:6,border:'1px solid '+G.border}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
              <div><p style={{fontSize:14,fontWeight:600,margin:0}}>{c.nombre}</p>
                <p style={{fontSize:11,color:G.muted,margin:'2px 0'}}>{c.codigo} {c.telefono?'• '+c.telefono:''}</p>
                {c.preferencias&&<p style={{fontSize:10,color:G.gold,margin:0}}>❤️ {c.preferencias}</p>}
              </div>
              {c.acepta_publicidad&&<span style={{fontSize:9,background:G.goldSoft,color:G.goldDark,padding:'2px 6px',borderRadius:4}}>📢 Publicidad</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ EXPORT CSV ═══ */
function exportCSV(data, filename, columns) {
  const header = columns.map(c => c.label).join(',')
  const rows = data.map(row => columns.map(c => {
    let v = typeof c.key === 'function' ? c.key(row) : row[c.key]
    if (v === null || v === undefined) v = ''
    return '"' + String(v).replace(/"/g, '""') + '"'
  }).join(','))
  const csv = '\uFEFF' + header + '\n' + rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click()
  URL.revokeObjectURL(url)
}

/* ═══ STOCK ═══ */
function StockScreen(P) {
  const { titulo, allProductos, lineas, setScreen, G } = P
  const [filtro, setFiltro] = useState('todos')
  const prods = allProductos.filter(p => {
    if (filtro === 'bajo') return p.cantidad > 0 && p.cantidad <= 3
    if (filtro === 'agotado') return p.cantidad <= 0
    return true
  })
  const totalItems = allProductos.reduce((s, p) => s + p.cantidad, 0)
  const totalValor = allProductos.reduce((s, p) => s + (p.precio * p.cantidad), 0)

  const exportar = () => {
    exportCSV(allProductos, 'stock_' + new Date().toISOString().split('T')[0], [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: r => r.lineas?.nombre || '', label: 'Línea' },
      { key: r => r.categorias?.nombre || '', label: 'Categoría' },
      { key: 'color', label: 'Color' },
      { key: 'cantidad', label: 'Stock' },
      { key: 'precio', label: 'Precio' },
      { key: r => (r.precio * r.cantidad).toFixed(2), label: 'Valorizado' }
    ])
    P.notify('Excel exportado')
  }

  return (
    <div>
      <Header titulo={titulo} seccion="📊 Stock" onBack={() => setScreen('submenu')} G={G} />
      <div style={{ padding: 16 }}>
        {/* Resumen */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: G.gold, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Total items</p>
            <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>{totalItems}</p>
          </div>
          <div style={{ flex: 1, background: G.goldDark, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Valorizado</p>
            <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>S/{totalValor.toFixed(0)}</p>
          </div>
        </div>
        {/* Filtros + Export */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
          {[{ id: 'todos', l: 'Todos' }, { id: 'bajo', l: '⚠️ Bajo' }, { id: 'agotado', l: '🔴 Agotado' }].map(fl => (
            <button key={fl.id} onClick={() => setFiltro(fl.id)}
              style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: filtro === fl.id ? G.gold : G.goldSoft,
                color: filtro === fl.id ? '#fff' : G.goldDark, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{fl.l}</button>
          ))}
          <button onClick={exportar} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, border: '1px solid ' + G.gold,
            background: 'transparent', color: G.gold, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📥 Excel</button>
        </div>
        {/* Lista */}
        {prods.map(p => {
          const estado = p.cantidad <= 0 ? 'agotado' : p.cantidad <= 3 ? 'bajo' : 'ok'
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 10, padding: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid ' + G.border }}>
              {p.foto_url ? <img src={p.foto_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                : <div style={{ width: 40, height: 40, background: G.goldLight, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 16, opacity: 0.3 }}>📦</span></div>}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{p.nombre}</p>
                <p style={{ fontSize: 10, color: G.muted, margin: 0 }}>{p.codigo} • S/{p.precio}</p>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                color: estado === 'agotado' ? '#fff' : estado === 'bajo' ? G.warn : G.goldDark,
                background: estado === 'agotado' ? G.danger : estado === 'bajo' ? '#FEF3C7' : G.goldSoft }}>{p.cantidad}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══ HISTORIAL VENTAS ═══ */
function HistorialScreen(P) {
  const { titulo, ventas, setScreen, G } = P
  const totalVentas = ventas.reduce((s, v) => s + v.total, 0)
  const totalItems = ventas.reduce((s, v) => s + v.cantidad, 0)

  const exportar = () => {
    exportCSV(ventas, 'ventas_' + new Date().toISOString().split('T')[0], [
      { key: r => new Date(r.created_at).toLocaleDateString('es-PE'), label: 'Fecha' },
      { key: r => new Date(r.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), label: 'Hora' },
      { key: 'codigo_producto', label: 'Código' },
      { key: 'nombre_producto', label: 'Producto' },
      { key: 'cantidad', label: 'Cantidad' },
      { key: 'precio_original', label: 'Precio Original' },
      { key: 'precio_venta', label: 'Precio Venta' },
      { key: 'total', label: 'Total' },
      { key: 'metodo_pago', label: 'Método Pago' },
      { key: 'tipo_entrega', label: 'Entrega' },
      { key: r => r.clientes?.nombre || 'Sin cliente', label: 'Cliente' }
    ])
    P.notify('Excel exportado')
  }

  return (
    <div>
      <Header titulo={titulo} seccion="📋 Ventas" onBack={() => setScreen('submenu')} G={G} />
      <div style={{ padding: 16 }}>
        {/* Resumen */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, background: G.gold, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Total vendido</p>
            <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>S/{totalVentas.toFixed(0)}</p>
          </div>
          <div style={{ flex: 1, background: G.goldDark, borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>Items vendidos</p>
            <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>{totalItems}</p>
          </div>
        </div>
        {/* Export */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={exportar} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + G.gold,
            background: 'transparent', color: G.gold, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📥 Excel</button>
        </div>
        {/* Lista */}
        {ventas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: G.muted }}><p style={{ fontSize: 32 }}>📋</p><p>No hay ventas</p></div>
        ) : ventas.map(v => (
          <div key={v.id} style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, border: '1px solid ' + G.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{v.nombre_producto}</p>
                <p style={{ fontSize: 10, color: G.muted, margin: '2px 0' }}>{v.codigo_producto} • {v.cantidad} und • {v.metodo_pago}</p>
                <p style={{ fontSize: 10, color: G.muted, margin: 0 }}>
                  {new Date(v.created_at).toLocaleDateString('es-PE')} {new Date(v.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  {v.clientes?.nombre ? ' • ' + v.clientes.nombre : ''}
                  {v.tipo_entrega === 'Delivery' ? ' • 🛵' : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: G.gold, margin: 0 }}>S/{v.total.toFixed(2)}</p>
                {v.precio_venta !== v.precio_original && (
                  <p style={{ fontSize: 9, color: G.warn, margin: '2px 0 0' }}>Original: S/{v.precio_original}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
