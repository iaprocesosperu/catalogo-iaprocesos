import { useState, useEffect, useRef } from 'react'
import { supabase, comprimirImagen, subirFoto } from './supabase'

const G={gold:'#C5A55A',goldDk:'#A8893E',goldLt:'#F9F5EB',goldSf:'#F0E8D0',
  bg:'#FFFFFF',card:'#FFFFFF',text:'#1F2937',muted:'#6B7280',border:'#E8E3D8',
  ok:'#10B981',err:'#EF4444',warn:'#F59E0B'}

/* ═══ HELPERS ═══ */
function blobToBase64(b){return new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result.split(',')[1]);rd.readAsDataURL(b)})}
const iS=G=>({width:'100%',padding:10,borderRadius:8,border:'1px solid '+G.border,fontSize:14,color:G.text,boxSizing:'border-box',marginBottom:8,background:'#fff'})
const sS=G=>({width:'100%',padding:10,borderRadius:8,border:'1px solid '+G.border,fontSize:14,marginBottom:8,background:'#fff'})

function exportCSV(data,filename,columns){
  const h=columns.map(c=>c.l).join(',')
  const rows=data.map(r=>columns.map(c=>{let v=typeof c.k==='function'?c.k(r):r[c.k];if(v==null)v='';return '"'+String(v).replace(/"/g,'""')+'"'}).join(','))
  const csv='\uFEFF'+h+'\n'+rows.join('\n')
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename+'.csv';a.click()
}

function startVoice(cb){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition
  if(!SR){cb(null);return}
  const r=new SR();r.lang='es-PE';r.onresult=e=>cb(e.results[0][0].transcript);r.onerror=()=>cb(null);r.start()
}

function detectColor(imgSrc){
  return new Promise(res=>{
    const img=new Image();img.crossOrigin='anonymous'
    img.onload=()=>{
      const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=50;c.height=50
      ctx.drawImage(img,0,0,50,50);const d=ctx.getImageData(0,0,50,50).data
      let r=0,g=0,b=0,n=0
      for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];n++}
      r=Math.round(r/n);g=Math.round(g/n);b=Math.round(b/n)
      const colors=[['Negro',0,0,0],['Blanco',255,255,255],['Rojo',200,30,30],['Azul',30,30,200],
        ['Verde',30,150,30],['Amarillo',230,220,50],['Rosado',230,130,170],['Morado',130,30,180],
        ['Naranja',230,140,30],['Gris',140,140,140],['Marrón',130,80,30],['Beige',210,190,150],
        ['Celeste',100,180,230],['Turquesa',0,200,180],['Coral',230,100,80],['Crema',240,230,200],
        ['Dorado',200,170,50],['Plateado',190,190,200]]
      let best='',minD=Infinity
      colors.forEach(([name,cr,cg,cb])=>{const dist=Math.sqrt((r-cr)**2+(g-cg)**2+(b-cb)**2);if(dist<minD){minD=dist;best=name}})
      res(best)
    }
    img.onerror=()=>res('');img.src=imgSrc
  })
}

/* ═══ APP ═══ */
export default function App(){
  const [scr,setScr]=useState('access')
  const [emp,setEmp]=useState(null)
  const [lineas,setLineas]=useState([])
  const [linAct,setLinAct]=useState(null)
  const [cats,setCats]=useState([])
  const [oris,setOris]=useState([])
  const [cols,setCols]=useState([])
  const [prods,setProds]=useState([])
  const [clis,setClis]=useState([])
  const [vents,setVents]=useState([])
  const [loading,setLoading]=useState(false)
  const [notif,setNotif]=useState(null)
  const [editP,setEditP]=useState(null)
  const [ventaP,setVentaP]=useState(null)
  const [shareImg,setShareImg]=useState(null)

  const notify=(m,t='success')=>{setNotif({m,t});setTimeout(()=>setNotif(null),3000)}

  // Back button handling
  useEffect(()=>{
    const h=()=>{if(scr!=='catalogo'&&scr!=='access'){setScr('catalogo')}else{window.history.pushState(null,'',window.location.href)}}
    window.history.pushState(null,'',window.location.href)
    window.addEventListener('popstate',h)
    return()=>window.removeEventListener('popstate',h)
  },[scr])

  // PWA share target
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search)
    if(params.get('share')==='true'){setScr('registrar')}
  },[])

  useEffect(()=>{const k=localStorage.getItem('ia_key');if(k)loginKey(k)},[])

  const loginKey=async(k)=>{
    setLoading(true)
    const{data}=await supabase.from('empresas').select('*').eq('access_key',k).eq('activo',true).single()
    if(data){setEmp(data);localStorage.setItem('ia_key',k);await loadAll(data.id);setScr('catalogo')}
    else{notify('Clave inválida','error');localStorage.removeItem('ia_key')}
    setLoading(false)
  }
  const logout=()=>{localStorage.removeItem('ia_key');setEmp(null);setScr('access')}

  const loadAll=async(eid)=>{
    const id=eid||emp?.id;if(!id)return
    const[ln,ct,or,co,pr,cl,ve]=await Promise.all([
      supabase.from('lineas').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('categorias').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('origenes').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('colores').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('productos').select('*,categorias(nombre),origenes(nombre),lineas(nombre)').eq('empresa_id',id).eq('activo',true).order('created_at',{ascending:false}),
      supabase.from('clientes').select('*').eq('empresa_id',id).eq('activo',true).order('nombre'),
      supabase.from('ventas').select('*,clientes(nombre)').eq('empresa_id',id).order('created_at',{ascending:false})
    ])
    setLineas(ln.data||[]);setCats(ct.data||[]);setOris(or.data||[]);setCols(co.data||[])
    setProds(pr.data||[]);setClis(cl.data||[]);setVents(ve.data||[])
    if(!linAct&&ln.data?.length)setLinAct(ln.data[0])
  }

  const eid=emp?.id,lid=linAct?.id
  const tit=`${emp?.nombre||''} › ${linAct?.nombre||''}`
  const cF=cats.filter(c=>c.linea_id===lid),oF=oris.filter(o=>o.linea_id===lid),pF=prods.filter(p=>p.linea_id===lid)
  const P={emp,eid,lid,tit,lineas,linAct,setLinAct,cats:cF,oris:oF,cols,prods:pF,allProds:prods,clis,vents,
    notify,loadAll,scr,setScr,setEditP,setVentaP,logout,G,shareImg}

  return(
    <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:G.bg,position:'relative',paddingBottom:68}}>
      {notif&&<div style={{position:'fixed',top:12,left:'50%',transform:'translateX(-50%)',zIndex:999,
        background:notif.t==='success'?G.ok:G.err,color:'#fff',padding:'10px 20px',borderRadius:12,fontSize:14,fontWeight:600,
        boxShadow:'0 4px 15px rgba(0,0,0,0.2)',zIndex:10000}}>{notif.m}</div>}
      {scr==='access'&&<AccessScreen login={loginKey} loading={loading}/>}
      {scr==='catalogo'&&<CatalogoScreen {...P}/>}
      {scr==='registrar'&&<RegistrarScreen {...P} editP={editP}/>}
      {scr==='buscar'&&<BuscarScreen {...P}/>}
      {scr==='venta'&&<VentaScreen {...P} prod={ventaP}/>}
      {scr==='submenu'&&<SubMenu {...P}/>}
      {scr==='lineas'&&<MantScr tipo="lineas" data={lineas} {...P}/>}
      {scr==='categorias'&&<MantScr tipo="categorias" data={cF} {...P}/>}
      {scr==='origenes'&&<OrigenesScr {...P}/>}
      {scr==='colores'&&<MantScr tipo="colores" data={cols} {...P}/>}
      {scr==='clientes'&&<ClientesScr {...P}/>}
      {scr==='stock'&&<StockScr {...P}/>}
      {scr==='historial'&&<HistorialScr {...P}/>}
      {emp&&scr!=='access'&&<NavBar scr={scr} setScr={setScr} setEditP={setEditP}/>}
    </div>
  )
}

function AccessScreen({login,loading}){
  const[k,setK]=useState('')
  return(<div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1A1A1A,#2D2D2D)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
    <div style={{fontSize:48,marginBottom:8}}>🔑</div>
    <h1 style={{color:G.gold,fontSize:26,fontWeight:800,margin:'0 0 4px'}}>IA <span style={{color:'#E8E8E8'}}>PROCESOS</span></h1>
    <p style={{color:'#999',fontSize:13,marginBottom:32}}>Ingresa tu clave de acceso</p>
    <input value={k} onChange={e=>setK(e.target.value.toUpperCase())} placeholder="CLAVE"
      style={{width:'100%',maxWidth:300,padding:14,borderRadius:10,border:'2px solid '+G.gold,background:'#333',color:'#fff',fontSize:18,fontWeight:700,textAlign:'center',letterSpacing:3,boxSizing:'border-box'}}/>
    <button onClick={()=>k&&login(k)} disabled={!k||loading}
      style={{width:'100%',maxWidth:300,padding:14,borderRadius:10,border:'none',background:k?G.gold:'#555',color:k?'#1A1A1A':'#888',fontSize:16,fontWeight:700,cursor:k?'pointer':'default',marginTop:12}}>
      {loading?'Verificando...':'Entrar'}</button>
  </div>)
}

function NavBar({scr,setScr,setEditP}){
  return(<div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,
    background:'#fff',borderTop:'2px solid '+G.goldSf,padding:'6px 0 env(safe-area-inset-bottom,6px)',display:'flex',justifyContent:'space-around',zIndex:100}}>
    {[{id:'catalogo',i:'📦',l:'Catálogo'},{id:'registrar',i:'➕',l:'Registrar'},{id:'buscar',i:'🔍',l:'Buscar'},{id:'submenu',i:'⚙️',l:'Más'}].map(n=>(
      <button key={n.id} onClick={()=>{setScr(n.id);if(n.id==='registrar')setEditP(null)}}
        style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1,padding:'4px 8px'}}>
        <span style={{fontSize:18}}>{n.i}</span>
        <span style={{fontSize:9,color:scr===n.id?G.gold:G.muted,fontWeight:scr===n.id?700:400}}>{n.l}</span>
      </button>))}
  </div>)
}

function CamModal({onCapture,onClose}){
  const vRef=useRef(null),sRef=useRef(null)
  const[rdy,setRdy]=useState(false)
  useEffect(()=>{let m=true
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}})
      .then(s=>{if(!m){s.getTracks().forEach(t=>t.stop());return};sRef.current=s;if(vRef.current){vRef.current.srcObject=s;vRef.current.play()};setRdy(true)})
      .catch(()=>{if(m)onClose()})
    return()=>{m=false;if(sRef.current)sRef.current.getTracks().forEach(t=>t.stop())}
  },[])
  const cap=()=>{const v=vRef.current;if(!v)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);c.toBlob(b=>{if(sRef.current)sRef.current.getTracks().forEach(t=>t.stop());onCapture(b)},'image/jpeg',0.85)}
  return(<div style={{position:'fixed',inset:0,background:'#000',zIndex:9999,display:'flex',flexDirection:'column'}}>
    <video ref={vRef} autoPlay playsInline muted style={{flex:1,objectFit:'cover',width:'100%'}}/>
    <div style={{position:'absolute',bottom:0,left:0,right:0,padding:20,display:'flex',justifyContent:'center',alignItems:'center',gap:20,background:'linear-gradient(transparent,rgba(0,0,0,0.7))'}}>
      <button onClick={()=>{if(sRef.current)sRef.current.getTracks().forEach(t=>t.stop());onClose()}} style={{width:50,height:50,borderRadius:25,border:'2px solid #fff',background:'rgba(255,255,255,0.2)',color:'#fff',fontSize:18,cursor:'pointer'}}>✕</button>
      <button onClick={cap} disabled={!rdy} style={{width:70,height:70,borderRadius:35,border:'4px solid #fff',background:rdy?G.gold:'#666',cursor:'pointer'}}/>
      <div style={{width:50}}/>
    </div>
  </div>)
}

function Hdr({tit,sec,onBack}){
  return(<div style={{background:G.gold,padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
    {onBack&&<button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'#fff',fontSize:18}}>←</button>}
    <div style={{flex:1}}><p style={{color:'rgba(255,255,255,0.8)',fontSize:10,margin:0}}>{tit}</p>
      <h2 style={{color:'#fff',fontSize:16,fontWeight:700,margin:0}}>{sec}</h2></div>
  </div>)
}

function LineSel({lineas,linAct,setLinAct}){
  return(<div style={{display:'flex',gap:6,padding:'10px 16px',overflowX:'auto',background:G.goldLt}}>
    {lineas.map(l=>(<button key={l.id} onClick={()=>setLinAct(l)}
      style={{padding:'6px 16px',borderRadius:20,border:'none',whiteSpace:'nowrap',fontSize:13,fontWeight:600,cursor:'pointer',
        background:linAct?.id===l.id?G.gold:'#fff',color:linAct?.id===l.id?'#fff':G.gold}}>{l.nombre}</button>))}
  </div>)
}

function Crd({title,children}){return(<div style={{background:'#fff',borderRadius:12,padding:14,marginBottom:12,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid '+G.border}}>
  {title&&<p style={{fontSize:13,fontWeight:700,margin:'0 0 8px',color:G.text}}>{title}</p>}{children}</div>)}

function VoiceBtn({onResult}){
  const[rec,setRec]=useState(false)
  return(<button onClick={()=>{setRec(true);startVoice(t=>{setRec(false);if(t)onResult(t)})}}
    style={{padding:'6px 10px',borderRadius:8,border:'1px solid '+G.gold,background:rec?G.goldSf:'transparent',
      color:G.gold,fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>{rec?'🔴 Escuchando...':'🎤'}</button>)
}

/* ═══ CATÁLOGO ═══ */
function CatalogoScreen(P){
  const{tit,lineas,linAct,setLinAct,prods,allProds,setScr,setEditP,setVentaP,logout,notify}=P
  const[f,setF]=useState('')
  const fl=prods.filter(p=>!f||p.nombre?.toLowerCase().includes(f.toLowerCase())||p.codigo?.toLowerCase().includes(f.toLowerCase()))

  const eliminar=async(p)=>{
    const{data:v}=await supabase.from('ventas').select('id').eq('producto_id',p.id).limit(1)
    if(v?.length>0){notify('No se puede eliminar, tiene ventas','error');return}
    if(!confirm('¿Eliminar '+p.nombre+'?'))return
    await supabase.from('productos').update({activo:false}).eq('id',p.id)
    notify('Eliminado');await P.loadAll()
  }

  const exportar=()=>{
    exportCSV(fl,'catalogo_'+new Date().toISOString().split('T')[0],[
      {k:'codigo',l:'Código'},{k:'nombre',l:'Nombre'},{k:r=>r.lineas?.nombre||'',l:'Línea'},
      {k:r=>r.categorias?.nombre||'',l:'Categoría'},{k:r=>r.origenes?.nombre||'',l:'Origen'},
      {k:'color',l:'Color'},{k:'precio_costo',l:'Precio Costo'},{k:'precio_venta',l:'Precio Venta'},
      {k:'cantidad',l:'Stock'},{k:'observacion',l:'Observación'},
      {k:r=>new Date(r.created_at).toLocaleDateString('es-PE'),l:'Fecha Registro'}
    ]);notify('Exportado')
  }

  return(<div>
    <div style={{background:G.gold,padding:'16px 16px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div><p style={{color:'rgba(255,255,255,0.8)',fontSize:10,margin:0}}>{P.emp?.nombre}</p>
          <h1 style={{color:'#fff',fontSize:18,fontWeight:800,margin:0}}>📦 Catálogo</h1></div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={exportar} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,padding:'6px 10px',color:'#fff',fontSize:11,cursor:'pointer'}}>📥</button>
          <button onClick={logout} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:8,padding:'6px 10px',color:'#fff',fontSize:11,cursor:'pointer'}}>Salir</button>
        </div>
      </div>
      <input value={f} onChange={e=>setF(e.target.value)} placeholder="Filtrar por nombre, código..."
        style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'none',fontSize:14,background:'rgba(255,255,255,0.9)',boxSizing:'border-box'}}/>
    </div>
    <LineSel lineas={lineas} linAct={linAct} setLinAct={setLinAct}/>
    <div style={{padding:'4px 12px 0',fontSize:12,color:G.muted}}>{fl.length} productos</div>
    {fl.length===0?(<div style={{textAlign:'center',padding:40,color:G.muted}}><p style={{fontSize:40}}>📦</p><p>No hay productos</p>
      <button onClick={()=>setScr('registrar')} style={{marginTop:12,padding:'10px 24px',borderRadius:10,border:'none',background:G.gold,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>➕ Registrar</button></div>
    ):(<div style={{padding:'8px 12px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
      {fl.map(p=>(<div key={p.id} style={{background:'#fff',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 6px rgba(0,0,0,0.08)',border:'1px solid '+G.border}}>
        {p.foto_url?<img src={p.foto_url} alt="" style={{width:'100%',height:130,objectFit:'cover'}}/>
        :<div style={{width:'100%',height:130,background:G.goldLt,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:36,opacity:0.3}}>📦</span></div>}
        <div style={{padding:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
            <span style={{fontSize:9,background:G.goldSf,color:G.goldDk,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{p.codigo}</span>
            <span style={{fontSize:12,fontWeight:800,color:G.gold}}>S/{p.precio_venta}</span>
          </div>
          <p style={{fontSize:11,fontWeight:600,margin:'3px 0 1px',color:G.text,lineHeight:1.2}}>{p.nombre}</p>
          <p style={{fontSize:9,color:G.muted,margin:0}}>Stock: {p.cantidad} {p.color?'• '+p.color:''}</p>
          <div style={{display:'flex',gap:3,marginTop:5}}>
            <button onClick={()=>{setEditP(p);setScr('registrar')}} style={{flex:1,padding:4,borderRadius:5,border:'1px solid '+G.gold,background:'transparent',color:G.gold,fontSize:9,fontWeight:600,cursor:'pointer'}}>Editar</button>
            <button onClick={()=>{setVentaP(p);setScr('venta')}} disabled={p.cantidad<=0} style={{flex:1,padding:4,borderRadius:5,border:'none',background:p.cantidad>0?G.gold:'#ccc',color:'#fff',fontSize:9,fontWeight:600,cursor:'pointer'}}>Vender</button>
            <button onClick={()=>eliminar(p)} style={{padding:4,borderRadius:5,border:'1px solid #eee',background:'transparent',color:G.err,fontSize:9,cursor:'pointer'}}>🗑</button>
          </div>
        </div>
      </div>))}
    </div>)}
  </div>)
}

/* ═══ REGISTRAR ═══ */
function RegistrarScreen(P){
  const{eid,lid,tit,cats,oris,cols,notify,loadAll,setScr,editP}=P
  const ep=editP
  const[f,setF]=useState(ep?{codigo:ep.codigo||'',nombre:ep.nombre||'',precio_costo:String(ep.precio_costo||''),
    precio_venta:String(ep.precio_venta||''),color:ep.color||'',cantidad:String(ep.cantidad||1),
    categoria_id:ep.categoria_id||'',origen_id:ep.origen_id||'',observacion:ep.observacion||'',
    atributos:ep.atributos||{}}:{codigo:'',nombre:'',precio_costo:'',precio_venta:'',color:'',cantidad:'1',
    categoria_id:'',origen_id:'',observacion:'',atributos:{}})
  const[fotoFile,setFotoFile]=useState(null)
  const[fotoPrev,setFotoPrev]=useState(ep?.foto_url||null)
  const[saving,setSaving]=useState(false)
  const[ocrLoad,setOcrLoad]=useState(false)
  const[detecting,setDetecting]=useState(false)
  const[cam,setCam]=useState(null)
  const[colSrch,setColSrch]=useState('')
  const fileRef=useRef(null)
  const s=(k,v)=>setF(p=>({...p,[k]:v}))
  const sA=(k,v)=>setF(p=>({...p,atributos:{...p.atributos,[k]:v}}))

  const catSel=cats.find(c=>c.id===parseInt(f.categoria_id))
  const tallas=catSel?.tallas||[]
  const attrsDef=catSel?.atributos||[]
  const colsFilt=cols.filter(c=>!colSrch||c.nombre.toLowerCase().includes(colSrch.toLowerCase()))

  // Auto nombre
  useEffect(()=>{if(ep)return;const pts=[catSel?.nombre||''];if(f.color)pts.push(f.color)
    if(f.atributos)Object.values(f.atributos).forEach(v=>{if(v)pts.push(v)})
    const a=pts.filter(Boolean).join(' ');if(a&&a!==catSel?.nombre)s('nombre',a)},[f.categoria_id,f.color,f.atributos])

  const onOrigenChange=v=>{s('origen_id',v);const o=oris.find(x=>x.id===parseInt(v))
    if(o){if(o.precio_costo_defecto&&!f.precio_costo)s('precio_costo',String(o.precio_costo_defecto))
      if(o.precio_venta_defecto&&!f.precio_venta)s('precio_venta',String(o.precio_venta_defecto))}}

  const onCamCapture=async b=>{
    if(cam==='label'){setCam(null);setOcrLoad(true)
      try{const comp=await comprimirImagen(new File([b],'l.jpg'),600);const b64=await blobToBase64(comp)
        const fd=new FormData();fd.append('base64Image','data:image/jpeg;base64,'+b64);fd.append('OCREngine','3');fd.append('isTable','false')
        const r=await fetch('https://api.ocr.space/parse/image',{method:'POST',headers:{'apikey':'K85837551988957'},body:fd})
        const d=await r.json();const t=(d?.ParsedResults?.[0]?.ParsedText||'').trim().replace(/[^a-zA-Z0-9]/g,'')
        if(t){s('codigo',t.substring(0,20).toUpperCase());notify('Código: '+t.substring(0,20).toUpperCase())}
        else notify('No se pudo leer','error')
      }catch(e){notify('Error OCR','error')};setOcrLoad(false)
    }else if(cam==='product'){setCam(null);setFotoFile(new File([b],'p.jpg',{type:'image/jpeg'}))
      const r=new FileReader();r.onload=e=>setFotoPrev(e.target.result);r.readAsDataURL(b)
    }else if(cam==='yape'){setCam(null)}
  }
  const onFileSelect=e=>{const file=e.target.files?.[0];if(!file)return;setFotoFile(file)
    const r=new FileReader();r.onload=ev=>setFotoPrev(ev.target.result);r.readAsDataURL(file);e.target.value=''}
  const clearFoto=()=>{setFotoPrev(null);setFotoFile(null);if(fileRef.current)fileRef.current.value=''}

  // Auto detect from photo
  const autoDetect=async()=>{if(!fotoPrev)return;setDetecting(true)
    try{
      // Color
      const color=await detectColor(fotoPrev);if(color)s('color',color)
      // OCR text
      const comp=await comprimirImagen(fotoFile||new File([],'x'),600)
      const b64=await blobToBase64(comp)
      const fd=new FormData();fd.append('base64Image','data:image/jpeg;base64,'+b64);fd.append('OCREngine','3')
      const r=await fetch('https://api.ocr.space/parse/image',{method:'POST',headers:{'apikey':'K85837551988957'},body:fd})
      const d=await r.json();const txt=(d?.ParsedResults?.[0]?.ParsedText||'').trim()
      if(txt){const m=txt.match(/[SMLX]{1,3}/i);if(m)sA('talla',m[0].toUpperCase())
        notify('Detectado: Color '+color+(m?' Talla '+m[0].toUpperCase():''))}
      else notify('Color detectado: '+color)
    }catch(e){notify('Error al detectar','error')};setDetecting(false)
  }

  const guardar=async(yNuevo=false)=>{
    if(!f.codigo||!f.nombre){notify('Código y nombre obligatorios','error');return}
    // Validar código único
    if(!ep){const{data:dup}=await supabase.from('productos').select('id').eq('empresa_id',eid).eq('codigo',f.codigo).eq('activo',true).limit(1)
      if(dup?.length>0){notify('Código '+f.codigo+' ya existe','error');return}}
    setSaving(true)
    try{let foto_url=ep?.foto_url||null
      if(fotoFile){const blob=await comprimirImagen(fotoFile,800);foto_url=await subirFoto(blob,f.codigo)}
      const data={empresa_id:eid,linea_id:lid,categoria_id:f.categoria_id||null,origen_id:f.origen_id||null,
        codigo:f.codigo,nombre:f.nombre,precio_costo:parseFloat(f.precio_costo)||0,precio_venta:parseFloat(f.precio_venta)||0,
        cantidad:parseInt(f.cantidad)||1,color:f.color,atributos:f.atributos,observacion:f.observacion,foto_url,
        updated_at:new Date().toISOString()}
      if(ep){await supabase.from('productos').update(data).eq('id',ep.id);notify('Actualizado')}
      else{await supabase.from('productos').insert(data);notify('Registrado')}
      await loadAll()
      if(yNuevo){setF(p=>({...p,codigo:'',nombre:'',color:'',cantidad:'1',observacion:'',atributos:{}}));setFotoFile(null);setFotoPrev(null)}
      else setScr('catalogo')
    }catch(e){notify('Error: '+e.message,'error')};setSaving(false)
  }

  return(<div>
    {cam&&<CamModal onCapture={onCamCapture} onClose={()=>setCam(null)}/>}
    <Hdr tit={tit} sec={ep?'✏️ Editar':'➕ Registrar'} onBack={()=>setScr('catalogo')}/>
    <div style={{padding:16}}>
      {/* Código */}
      <Crd title="1. Código de etiqueta">
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input value={f.codigo} onChange={e=>s('codigo',e.target.value.toUpperCase())} placeholder="125"
            style={{width:100,padding:10,borderRadius:8,border:'2px solid '+G.gold,fontSize:20,fontWeight:700,textAlign:'center',letterSpacing:2}}/>
          <button onClick={()=>setCam('label')} disabled={ocrLoad}
            style={{flex:1,padding:'12px',borderRadius:8,border:'none',background:ocrLoad?G.muted:G.gold,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer'}}>
            {ocrLoad?'⏳ Leyendo...':'📷 Escanear código'}</button>
        </div>
      </Crd>
      {/* Foto */}
      <Crd title="2. Foto del producto">
        {fotoPrev?(<div style={{position:'relative'}}>
          <img src={fotoPrev} alt="" style={{width:'100%',height:180,objectFit:'cover',borderRadius:8}}/>
          <button onClick={clearFoto} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.5)',color:'#fff',border:'none',borderRadius:16,width:28,height:28,fontSize:14,cursor:'pointer'}}>✕</button>
          <button onClick={autoDetect} disabled={detecting} style={{position:'absolute',bottom:6,right:6,background:G.gold,color:'#fff',border:'none',borderRadius:8,padding:'6px 10px',fontSize:11,fontWeight:600,cursor:'pointer'}}>
            {detecting?'⏳':'🔍 Auto-detectar'}</button>
        </div>):(<div style={{display:'flex',gap:8}}>
          <button onClick={()=>setCam('product')} style={{flex:1,padding:18,borderRadius:8,border:'2px dashed '+G.gold,background:G.goldLt,cursor:'pointer',textAlign:'center'}}>
            <span style={{fontSize:22,display:'block'}}>📷</span><span style={{fontSize:11,color:G.gold,fontWeight:600}}>Cámara</span></button>
          <button onClick={()=>fileRef.current?.click()} style={{flex:1,padding:18,borderRadius:8,border:'2px dashed '+G.border,background:G.goldLt,cursor:'pointer',textAlign:'center'}}>
            <span style={{fontSize:22,display:'block'}}>📁</span><span style={{fontSize:11,color:G.muted,fontWeight:600}}>Galería</span></button>
        </div>)}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileSelect} style={{display:'none'}}/>
      </Crd>
      {/* Datos */}
      <Crd title="3. Datos">
        <label style={{fontSize:11,color:G.muted}}>Origen</label>
        <select value={f.origen_id} onChange={e=>onOrigenChange(e.target.value)} style={sS(G)}>
          <option value="">Seleccionar origen</option>
          {oris.map(o=><option key={o.id} value={o.id}>{o.nombre}{o.precio_venta_defecto?' (C:'+o.precio_costo_defecto+' V:'+o.precio_venta_defecto+')':''}</option>)}
        </select>
        <label style={{fontSize:11,color:G.muted}}>Categoría</label>
        <select value={f.categoria_id} onChange={e=>s('categoria_id',e.target.value)} style={sS(G)}>
          <option value="">Seleccionar</option>{cats.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
        {tallas.length>0&&(<><label style={{fontSize:11,color:G.muted}}>Talla</label>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
            {tallas.map(t=><button key={t} onClick={()=>sA('talla',t)} style={{padding:'5px 9px',borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
              background:f.atributos?.talla===t?G.gold:G.goldSf,color:f.atributos?.talla===t?'#fff':G.goldDk}}>{t}</button>)}</div></>)}
        {attrsDef.map(a=>(<div key={a.key} style={{marginBottom:8}}><label style={{fontSize:11,color:G.muted}}>{a.label}</label>
          {a.tipo==='select'?(<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {a.opciones.map(op=><button key={op} onClick={()=>sA(a.key,op)} style={{padding:'5px 9px',borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
              background:f.atributos?.[a.key]===op?G.gold:G.goldSf,color:f.atributos?.[a.key]===op?'#fff':G.goldDk}}>{op}</button>)}</div>
          ):<input value={f.atributos?.[a.key]||''} onChange={e=>sA(a.key,e.target.value)} style={iS(G)}/>}</div>))}
        {catSel&&tallas.length>0&&!attrsDef.find(a=>a.key==='genero')&&(<><label style={{fontSize:11,color:G.muted}}>Género</label>
          <div style={{display:'flex',gap:6,marginBottom:8}}>
            {['Mujer','Hombre','Unisex'].map(g=><button key={g} onClick={()=>sA('genero',g)} style={{flex:1,padding:7,borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
              background:f.atributos?.genero===g?G.gold:G.goldSf,color:f.atributos?.genero===g?'#fff':G.goldDk}}>{g}</button>)}</div></>)}
        <label style={{fontSize:11,color:G.muted}}>Color</label>
        <input value={f.color} onChange={e=>{s('color',e.target.value);setColSrch(e.target.value)}} placeholder="Escribe..." style={iS(G)}/>
        {colSrch&&colsFilt.length>0&&(<div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
          {colsFilt.slice(0,8).map(c=><button key={c.id} onClick={()=>{s('color',c.nombre);setColSrch('')}}
            style={{padding:'3px 8px',borderRadius:10,border:'1px solid '+G.border,background:'#fff',fontSize:10,cursor:'pointer'}}>{c.nombre}</button>)}</div>)}
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}><label style={{fontSize:11,color:G.muted}}>Precio Costo (S/)</label>
            <input value={f.precio_costo} onChange={e=>s('precio_costo',e.target.value)} type="number" placeholder="0" style={iS(G)}/></div>
          <div style={{flex:1}}><label style={{fontSize:11,color:G.muted}}>Precio Venta (S/)</label>
            <input value={f.precio_venta} onChange={e=>s('precio_venta',e.target.value)} type="number" placeholder="0" style={iS(G)}/></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}><label style={{fontSize:11,color:G.muted}}>Cantidad</label>
            <input value={f.cantidad} onChange={e=>s('cantidad',e.target.value)} type="number" style={iS(G)}/></div>
        </div>
        <label style={{fontSize:11,color:G.muted}}>Nombre (auto-generado)</label>
        <input value={f.nombre} onChange={e=>s('nombre',e.target.value)} style={iS(G)}/>
        <div style={{display:'flex',gap:8,alignItems:'end'}}>
          <div style={{flex:1}}><label style={{fontSize:11,color:G.muted}}>Observación</label>
            <textarea value={f.observacion} onChange={e=>s('observacion',e.target.value)} rows={2} style={{...iS(G),resize:'vertical'}}/></div>
          <VoiceBtn onResult={t=>s('observacion',(f.observacion?f.observacion+' ':'')+t)}/>
        </div>
      </Crd>
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        <button onClick={()=>guardar(false)} disabled={saving||!f.codigo}
          style={{flex:1,padding:14,borderRadius:12,border:'none',background:f.codigo?G.gold:'#ccc',color:'#fff',fontSize:14,fontWeight:700,cursor:f.codigo?'pointer':'default'}}>
          {saving?'...':ep?'✅ Actualizar':'✅ Registrar y Salir'}</button>
        {!ep&&<button onClick={()=>guardar(true)} disabled={saving||!f.codigo}
          style={{flex:1,padding:14,borderRadius:12,border:'2px solid '+G.gold,background:'transparent',color:G.gold,fontSize:14,fontWeight:700,cursor:f.codigo?'pointer':'default'}}>
          {saving?'...':'➕ Registrar y Nuevo'}</button>}
      </div>
    </div>
  </div>)
}

/* ═══ BUSCAR ═══ */
function BuscarScreen(P){
  const{tit,allProds,notify,setScr,setEditP,setVentaP}=P
  const[modo,setModo]=useState('texto')
  const[q,setQ]=useState('')
  const[results,setResults]=useState(null)
  const[busy,setBusy]=useState(false)
  const[cam,setCam]=useState(null)
  const fileRef=useRef(null)

  const buscarTexto=()=>{if(!q.trim())return;const s=q.toLowerCase()
    setResults(allProds.filter(p=>p.nombre?.toLowerCase().includes(s)||p.codigo?.toLowerCase().includes(s)||p.color?.toLowerCase().includes(s)))}

  const onCamCapture=async b=>{setCam(null);setBusy(true)
    try{const comp=await comprimirImagen(new File([b],'s.jpg'),600);const b64=await blobToBase64(comp)
      const fd=new FormData();fd.append('base64Image','data:image/jpeg;base64,'+b64);fd.append('OCREngine','3')
      const r=await fetch('https://api.ocr.space/parse/image',{method:'POST',headers:{'apikey':'K85837551988957'},body:fd})
      const d=await r.json();const t=(d?.ParsedResults?.[0]?.ParsedText||'').trim().replace(/[^a-zA-Z0-9]/g,'')
      if(t){setQ(t.toUpperCase());const found=allProds.filter(p=>p.codigo?.toUpperCase()===t.toUpperCase());setResults(found)
        if(!found.length)notify('Código no encontrado','error')}
      else notify('No se pudo leer','error')
    }catch(e){notify('Error','error')};setBusy(false)
  }

  const buscarPorFoto=async(blob)=>{setBusy(true)
    try{
      const url=URL.createObjectURL(blob)
      const color=await detectColor(url)
      URL.revokeObjectURL(url)
      if(color){setQ('🔍 Color: '+color)
        const found=allProds.filter(p=>p.color?.toLowerCase()===color.toLowerCase())
          .concat(allProds.filter(p=>p.color?.toLowerCase()!==color.toLowerCase()&&p.nombre?.toLowerCase().includes(color.toLowerCase())))
        setResults(found);if(!found.length)notify('No hay productos de color '+color,'error')
        else notify(found.length+' resultado(s) para '+color)}
      else notify('No se pudo detectar color','error')
    }catch(e){notify('Error','error')};setBusy(false)
  }

  const onCamProdCapture=b=>{setCam(null);buscarPorFoto(b)}
  const onFileSearch=e=>{const f=e.target.files?.[0];if(!f)return;buscarPorFoto(f);e.target.value=''}

  return(<div>
    <Hdr tit={tit} sec="🔍 Buscar" onBack={()=>setScr('catalogo')}/>
    {cam==='scan'&&<CamModal onCapture={onCamCapture} onClose={()=>setCam(null)}/>}
    {cam==='photo'&&<CamModal onCapture={onCamProdCapture} onClose={()=>setCam(null)}/>}
    <div style={{padding:16}}>
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        {[{id:'texto',i:'⌨️',l:'Nombre'},{id:'codigo',i:'📷',l:'Foto código'},{id:'foto',i:'🖼️',l:'Foto producto'}].map(m=>(
          <button key={m.id} onClick={()=>setModo(m.id)} style={{flex:1,padding:8,borderRadius:8,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',
            background:modo===m.id?G.gold:G.goldSf,color:modo===m.id?'#fff':G.goldDk}}>{m.i} {m.l}</button>))}
      </div>
      {modo==='texto'&&(<div style={{display:'flex',gap:8}}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&buscarTexto()} placeholder="Nombre, código, color..." style={{flex:1,...iS(G),marginBottom:0}}/>
        <button onClick={buscarTexto} style={{padding:'10px 16px',borderRadius:8,border:'none',background:G.gold,color:'#fff',fontWeight:700,cursor:'pointer'}}>Buscar</button></div>)}
      {modo==='codigo'&&(<button onClick={()=>setCam('scan')} disabled={busy} style={{width:'100%',padding:18,borderRadius:8,border:'2px dashed '+G.gold,background:G.goldLt,cursor:'pointer',textAlign:'center'}}>
        <span style={{fontSize:26,display:'block'}}>{busy?'⏳':'📷'}</span><span style={{fontSize:13,color:G.gold,fontWeight:600}}>{busy?'Leyendo...':'Escanear etiqueta'}</span></button>)}
      {modo==='foto'&&(<div style={{display:'flex',gap:8}}>
        <button onClick={()=>setCam('photo')} disabled={busy} style={{flex:1,padding:18,borderRadius:8,border:'2px dashed '+G.gold,background:G.goldLt,cursor:'pointer',textAlign:'center'}}>
          <span style={{fontSize:22,display:'block'}}>📷</span><span style={{fontSize:11,color:G.gold,fontWeight:600}}>Cámara</span></button>
        <button onClick={()=>fileRef.current?.click()} disabled={busy} style={{flex:1,padding:18,borderRadius:8,border:'2px dashed '+G.border,background:G.goldLt,cursor:'pointer',textAlign:'center'}}>
          <span style={{fontSize:22,display:'block'}}>📁</span><span style={{fontSize:11,color:G.muted,fontWeight:600}}>Galería</span></button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileSearch} style={{display:'none'}}/></div>)}
      {results&&<p style={{fontSize:12,color:G.muted,margin:'12px 0 8px'}}>{results.length} resultado(s)</p>}
      {results?.map(p=>(<div key={p.id} style={{background:'#fff',borderRadius:12,padding:10,marginBottom:8,display:'flex',gap:10,border:'1px solid '+G.border}}>
        {p.foto_url?<img src={p.foto_url} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:8}}/>
        :<div style={{width:60,height:60,background:G.goldLt,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:18,opacity:0.3}}>📦</span></div>}
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:9,background:G.goldSf,color:G.goldDk,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{p.codigo}</span>
            <span style={{fontSize:12,fontWeight:800,color:G.gold}}>S/{p.precio_venta}</span></div>
          <p style={{fontSize:11,fontWeight:600,margin:'2px 0'}}>{p.nombre}</p>
          <p style={{fontSize:9,color:G.muted,margin:0}}>Stock: {p.cantidad}</p>
          <div style={{display:'flex',gap:4,marginTop:4}}>
            <button onClick={()=>{setEditP(p);setScr('registrar')}} style={{padding:'3px 8px',borderRadius:4,border:'1px solid '+G.gold,background:'transparent',color:G.gold,fontSize:9,fontWeight:600,cursor:'pointer'}}>Editar</button>
            <button onClick={()=>{setVentaP(p);setScr('venta')}} disabled={p.cantidad<=0} style={{padding:'3px 8px',borderRadius:4,border:'none',background:p.cantidad>0?G.gold:'#ccc',color:'#fff',fontSize:9,fontWeight:600,cursor:'pointer'}}>Vender</button>
          </div></div></div>))}
    </div>
  </div>)
}

/* ═══ VENTA ═══ */
function VentaScreen(P){
  const{eid,tit,prod,clis,notify,loadAll,setScr}=P
  const[cant,setCant]=useState(1)
  const[precio,setPrecio]=useState(String(prod?.precio_venta||0))
  const[metodo,setMetodo]=useState('Efectivo')
  const[entrega,setEntrega]=useState('En tienda')
  const[cliId,setCliId]=useState('')
  const[cliBusq,setCliBusq]=useState('')
  const[showNew,setShowNew]=useState(false)
  const[newC,setNewC]=useState({nombre:'',telefono:'',direccion:'',preferencias:'',acepta_publicidad:false})
  const[nota,setNota]=useState('')
  const[saving,setSaving]=useState(false)
  const[cam,setCam]=useState(null)
  const[fotoYape,setFotoYape]=useState(null)
  const yapeRef=useRef(null)
  if(!prod)return null
  const total=parseFloat(precio)*cant
  const clFilt=clis.filter(c=>!cliBusq||c.nombre?.toLowerCase().includes(cliBusq.toLowerCase())||c.telefono?.includes(cliBusq))

  const crearCli=async()=>{if(!newC.nombre){notify('Nombre obligatorio','error');return}
    const cod='C'+String(clis.length+1).padStart(4,'0')
    const{data,error}=await supabase.from('clientes').insert({empresa_id:eid,codigo:cod,...newC}).select().single()
    if(error){notify('Error','error');return}
    await loadAll();setCliId(data.id);setCliBusq(data.nombre);setShowNew(false);notify('Cliente creado')}

  const onYapeCam=b=>{setCam(null);setFotoYape(new File([b],'y.jpg',{type:'image/jpeg'}))}
  const onYapeFile=e=>{const f=e.target.files?.[0];if(f)setFotoYape(f);if(e.target)e.target.value=''}

  const vender=async()=>{
    if(cant>prod.cantidad){notify('Stock insuficiente: '+prod.cantidad+' disponibles','error');return}
    if(cant<=0){notify('Cantidad inválida','error');return}
    setSaving(true)
    try{
      let foto_yape_url=null
      if(fotoYape){const blob=await comprimirImagen(fotoYape,600);foto_yape_url=await subirFoto(blob,'yape_'+Date.now())}
      await supabase.from('ventas').insert({empresa_id:eid,producto_id:prod.id,cliente_id:cliId||null,
        codigo_producto:prod.codigo,nombre_producto:prod.nombre,
        precio_costo:prod.precio_costo,precio_venta_original:prod.precio_venta,precio_venta_real:parseFloat(precio),
        cantidad:cant,total,metodo_pago:metodo,tipo_entrega:entrega,foto_yape:foto_yape_url,nota})
      await supabase.from('productos').update({cantidad:prod.cantidad-cant}).eq('id',prod.id)
      notify('¡Venta registrada! S/'+total.toFixed(2));await loadAll();setScr('catalogo')
    }catch(e){notify('Error: '+e.message,'error')};setSaving(false)
  }

  return(<div>
    <Hdr tit={tit} sec="💰 Vender" onBack={()=>setScr('catalogo')}/>
    {cam==='yape'&&<CamModal onCapture={onYapeCam} onClose={()=>setCam(null)}/>}
    <div style={{padding:16}}>
      <Crd><div style={{display:'flex',gap:12}}>
        {prod.foto_url?<img src={prod.foto_url} alt="" style={{width:70,height:70,objectFit:'cover',borderRadius:8}}/>
        :<div style={{width:70,height:70,background:G.goldLt,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:20,opacity:0.3}}>📦</span></div>}
        <div><span style={{fontSize:9,background:G.goldSf,color:G.goldDk,padding:'2px 6px',borderRadius:4,fontWeight:600}}>{prod.codigo}</span>
          <p style={{fontSize:13,fontWeight:700,margin:'3px 0'}}>{prod.nombre}</p>
          <p style={{fontSize:11,color:G.muted}}>Stock: {prod.cantidad} • Costo: S/{prod.precio_costo}</p></div>
      </div></Crd>
      <Crd title="Precio de Venta">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:16,fontWeight:700,color:G.muted}}>S/</span>
          <input value={precio} onChange={e=>setPrecio(e.target.value)} type="text" inputMode="decimal"
            style={{flex:1,padding:12,borderRadius:8,border:'2px solid '+G.gold,fontSize:24,fontWeight:700,textAlign:'center',boxSizing:'border-box'}}/>
        </div>
        {parseFloat(precio)!==prod.precio_venta&&<p style={{fontSize:10,color:G.warn,margin:'4px 0 0'}}>Original: S/{prod.precio_venta}</p>}
      </Crd>
      <Crd title="Cantidad">
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16}}>
          <button onClick={()=>setCant(Math.max(1,cant-1))} style={{width:40,height:40,borderRadius:20,border:'2px solid '+G.gold,background:'transparent',color:G.gold,fontSize:20,cursor:'pointer'}}>-</button>
          <span style={{fontSize:28,fontWeight:800,minWidth:40,textAlign:'center'}}>{cant}</span>
          <button onClick={()=>setCant(Math.min(prod.cantidad,cant+1))} style={{width:40,height:40,borderRadius:20,border:'none',background:G.gold,color:'#fff',fontSize:20,cursor:'pointer'}}>+</button>
        </div>
        {cant>prod.cantidad&&<p style={{textAlign:'center',fontSize:11,color:G.err,marginTop:4}}>Solo {prod.cantidad} disponibles</p>}
      </Crd>
      <div style={{background:G.gold,borderRadius:12,padding:14,textAlign:'center',marginBottom:12}}>
        <p style={{color:'rgba(255,255,255,0.7)',fontSize:12,margin:0}}>Total</p>
        <p style={{color:'#fff',fontSize:30,fontWeight:800,margin:'2px 0'}}>S/ {total.toFixed(2)}</p>
      </div>
      {/* Cliente */}
      <Crd title="Cliente (opcional)">
        <input value={cliBusq} onChange={e=>setCliBusq(e.target.value)} placeholder="Buscar cliente..." style={iS(G)}/>
        {cliBusq&&clFilt.length>0&&(<div style={{maxHeight:100,overflowY:'auto',marginBottom:8}}>
          {clFilt.slice(0,5).map(c=>(<button key={c.id} onClick={()=>{setCliId(c.id);setCliBusq(c.nombre)}}
            style={{width:'100%',padding:8,background:cliId===c.id?G.goldSf:'#fff',border:'1px solid '+G.border,borderRadius:6,marginBottom:4,textAlign:'left',cursor:'pointer',fontSize:12}}>
            {c.nombre} {c.telefono?'• '+c.telefono:''}</button>))}</div>)}
        <button onClick={()=>setShowNew(!showNew)} style={{fontSize:11,color:G.gold,background:'none',border:'none',cursor:'pointer',fontWeight:600}}>➕ Nuevo cliente</button>
        {showNew&&(<div style={{background:G.goldLt,borderRadius:8,padding:10,marginTop:6}}>
          <input value={newC.nombre} onChange={e=>setNewC(p=>({...p,nombre:e.target.value}))} placeholder="Nombre" style={iS(G)}/>
          <input value={newC.telefono} onChange={e=>setNewC(p=>({...p,telefono:e.target.value}))} placeholder="Teléfono" style={iS(G)}/>
          <input value={newC.direccion} onChange={e=>setNewC(p=>({...p,direccion:e.target.value}))} placeholder="Dirección" style={iS(G)}/>
          <div style={{display:'flex',gap:6,alignItems:'end'}}><div style={{flex:1}}>
            <textarea value={newC.preferencias} onChange={e=>setNewC(p=>({...p,preferencias:e.target.value}))} placeholder="Preferencias" rows={2} style={{...iS(G),resize:'vertical'}}/></div>
            <VoiceBtn onResult={t=>setNewC(p=>({...p,preferencias:(p.preferencias?p.preferencias+' ':'')+t}))}/></div>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,marginBottom:8,cursor:'pointer'}}>
            <input type="checkbox" checked={newC.acepta_publicidad} onChange={e=>setNewC(p=>({...p,acepta_publicidad:e.target.checked}))}/>Acepta publicidad</label>
          <button onClick={crearCli} style={{width:'100%',padding:8,borderRadius:6,border:'none',background:G.gold,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>Guardar</button>
        </div>)}
      </Crd>
      {/* Entrega */}
      <Crd title="Entrega"><div style={{display:'flex',gap:8}}>
        {['En tienda','Delivery'].map(e=>(<button key={e} onClick={()=>setEntrega(e)}
          style={{flex:1,padding:10,borderRadius:8,border:entrega===e?'2px solid '+G.gold:'2px solid transparent',
            background:entrega===e?G.goldSf:'#f5f5f5',cursor:'pointer',fontSize:13,fontWeight:600,color:entrega===e?G.goldDk:G.text}}>
          {e==='En tienda'?'🏪':'🛵'} {e}</button>))}</div></Crd>
      {/* Pago */}
      <Crd title="Método de pago"><div style={{display:'flex',gap:8}}>
        {['Efectivo','Yape'].map(m=>(<button key={m} onClick={()=>{setMetodo(m);if(m==='Yape'&&!fotoYape)setCam('yape')}}
          style={{flex:1,padding:12,borderRadius:8,border:metodo===m?'2px solid '+G.gold:'2px solid transparent',
            background:metodo===m?G.goldSf:'#f5f5f5',cursor:'pointer',fontSize:14,fontWeight:600,color:metodo===m?G.goldDk:G.text}}>
          {m==='Efectivo'?'💵':'📱'} {m}</button>))}</div>
        {metodo==='Yape'&&(<div style={{marginTop:8}}>
          {fotoYape?(<div style={{position:'relative'}}><p style={{fontSize:11,color:G.ok,margin:'0 0 4px'}}>✅ Comprobante capturado</p>
            <button onClick={()=>setFotoYape(null)} style={{fontSize:10,color:G.err,background:'none',border:'none',cursor:'pointer'}}>Eliminar foto</button></div>
          ):(<div style={{display:'flex',gap:6}}>
            <button onClick={()=>setCam('yape')} style={{flex:1,padding:8,borderRadius:6,border:'1px dashed '+G.gold,background:G.goldLt,cursor:'pointer',fontSize:11,color:G.gold}}>📷 Capturar</button>
            <button onClick={()=>yapeRef.current?.click()} style={{flex:1,padding:8,borderRadius:6,border:'1px dashed '+G.border,background:G.goldLt,cursor:'pointer',fontSize:11,color:G.muted}}>📁 Galería</button>
            <input ref={yapeRef} type="file" accept="image/*" onChange={onYapeFile} style={{display:'none'}}/></div>)}</div>)}
      </Crd>
      <button onClick={vender} disabled={saving||cant>prod.cantidad}
        style={{width:'100%',padding:16,borderRadius:12,border:'none',background:G.gold,color:'#fff',fontSize:17,fontWeight:800,cursor:'pointer',
          boxShadow:'0 4px 15px rgba(197,165,90,0.4)',marginBottom:20}}>
        {saving?'Registrando...':'✅ CONFIRMAR VENTA'}</button>
    </div>
  </div>)
}

/* ═══ SUBMENÚ ═══ */
function SubMenu(P){
  const{tit,setScr}=P
  const items=[{id:'lineas',i:'📏',l:'Líneas',d:'Ropa, Gatos...'},{id:'categorias',i:'🏷️',l:'Categorías',d:'Por línea activa'},
    {id:'origenes',i:'📋',l:'Orígenes',d:'Fardos, entregas'},{id:'colores',i:'🎨',l:'Colores',d:'Maestro de colores'},
    {id:'clientes',i:'👥',l:'Clientes',d:'Gestión clientes'},{id:'stock',i:'📊',l:'Stock',d:'Inventario'},{id:'historial',i:'📋',l:'Ventas',d:'Historial'}]
  return(<div>
    <Hdr tit={tit} sec="⚙️ Más opciones" onBack={()=>setScr('catalogo')}/>
    <div style={{padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      {items.map(it=>(<button key={it.id} onClick={()=>setScr(it.id)}
        style={{background:'#fff',borderRadius:12,padding:14,border:'1px solid '+G.border,cursor:'pointer',textAlign:'left',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
        <span style={{fontSize:22,display:'block',marginBottom:4}}>{it.i}</span>
        <p style={{fontSize:13,fontWeight:700,margin:0,color:G.text}}>{it.l}</p>
        <p style={{fontSize:10,color:G.muted,margin:'2px 0 0'}}>{it.d}</p></button>))}</div></div>)
}

/* ═══ ORÍGENES (específico) ═══ */
function OrigenesScr(P){
  const{eid,lid,tit,oris,notify,loadAll,setScr}=P
  const[showAdd,setShowAdd]=useState(false)
  const[f,setF]=useState({nombre:'',inversion:'',precio_costo_defecto:'',precio_venta_defecto:'',fecha:'',observaciones:''})
  const[editId,setEditId]=useState(null)
  const s=(k,v)=>setF(p=>({...p,[k]:v}))

  const guardar=async()=>{if(!f.nombre.trim()){notify('Nombre obligatorio','error');return}
    const data={empresa_id:eid,linea_id:lid,nombre:f.nombre.trim(),inversion:parseFloat(f.inversion)||null,
      precio_costo_defecto:parseFloat(f.precio_costo_defecto)||null,precio_venta_defecto:parseFloat(f.precio_venta_defecto)||null,
      fecha:f.fecha||null,observaciones:f.observaciones||null}
    if(editId){await supabase.from('origenes').update(data).eq('id',editId);notify('Actualizado')}
    else{await supabase.from('origenes').insert(data);notify('Agregado')}
    setShowAdd(false);setEditId(null);setF({nombre:'',inversion:'',precio_costo_defecto:'',precio_venta_defecto:'',fecha:'',observaciones:''});await loadAll()
  }
  const editar=o=>{setEditId(o.id);setF({nombre:o.nombre||'',inversion:String(o.inversion||''),precio_costo_defecto:String(o.precio_costo_defecto||''),
    precio_venta_defecto:String(o.precio_venta_defecto||''),fecha:o.fecha||'',observaciones:o.observaciones||''});setShowAdd(true)}
  const eliminar=async id=>{if(!confirm('¿Eliminar?'))return;await supabase.from('origenes').update({activo:false}).eq('id',id);notify('Eliminado');await loadAll()}

  return(<div>
    <Hdr tit={tit} sec="📋 Orígenes" onBack={()=>setScr('submenu')}/>
    <div style={{padding:16}}>
      <button onClick={()=>{setShowAdd(!showAdd);setEditId(null);setF({nombre:'',inversion:'',precio_costo_defecto:'',precio_venta_defecto:'',fecha:'',observaciones:''})}}
        style={{width:'100%',padding:12,borderRadius:8,border:'2px dashed '+G.gold,background:G.goldLt,cursor:'pointer',color:G.gold,fontWeight:700,fontSize:13,marginBottom:12}}>
        ➕ Nuevo origen</button>
      {showAdd&&(<Crd title={editId?'Editar origen':'Nuevo origen'}>
        <label style={{fontSize:11,color:G.muted}}>Nombre *</label>
        <input value={f.nombre} onChange={e=>s('nombre',e.target.value)} placeholder="Fardo 1 Mujeres" style={iS(G)}/>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}><label style={{fontSize:11,color:G.muted}}>Precio Costo (S/)</label>
            <input value={f.precio_costo_defecto} onChange={e=>s('precio_costo_defecto',e.target.value)} type="number" placeholder="5" style={iS(G)}/></div>
          <div style={{flex:1}}><label style={{fontSize:11,color:G.muted}}>Precio Venta (S/)</label>
            <input value={f.precio_venta_defecto} onChange={e=>s('precio_venta_defecto',e.target.value)} type="number" placeholder="15" style={iS(G)}/></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}><label style={{fontSize:11,color:G.muted}}>Inversión total (S/)</label>
            <input value={f.inversion} onChange={e=>s('inversion',e.target.value)} type="number" placeholder="500" style={iS(G)}/></div>
          <div style={{flex:1}}><label style={{fontSize:11,color:G.muted}}>Fecha</label>
            <input value={f.fecha} onChange={e=>s('fecha',e.target.value)} type="date" style={iS(G)}/></div>
        </div>
        <label style={{fontSize:11,color:G.muted}}>Observaciones</label>
        <textarea value={f.observaciones} onChange={e=>s('observaciones',e.target.value)} rows={2} style={{...iS(G),resize:'vertical'}}/>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{setShowAdd(false);setEditId(null)}} style={{flex:1,padding:10,borderRadius:8,border:'1px solid '+G.border,background:'transparent',color:G.muted,fontSize:13,cursor:'pointer'}}>Cancelar</button>
          <button onClick={guardar} style={{flex:1,padding:10,borderRadius:8,border:'none',background:G.gold,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>
            {editId?'Actualizar':'Guardar'}</button></div>
      </Crd>)}
      {oris.map(o=>(<div key={o.id} style={{background:'#fff',borderRadius:10,padding:12,marginBottom:6,border:'1px solid '+G.border}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
          <div><p style={{fontSize:14,fontWeight:600,margin:0}}>{o.nombre}</p>
            <p style={{fontSize:10,color:G.muted,margin:'2px 0'}}>
              {o.precio_costo_defecto?'C: S/'+o.precio_costo_defecto:''} {o.precio_venta_defecto?'V: S/'+o.precio_venta_defecto:''}
              {o.inversion?' • Inv: S/'+o.inversion:''} {o.fecha?' • '+o.fecha:''}</p>
            {o.observaciones&&<p style={{fontSize:9,color:G.muted,margin:0}}>{o.observaciones}</p>}</div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={()=>editar(o)} style={{background:G.goldSf,color:G.goldDk,border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:10}}>Editar</button>
            <button onClick={()=>eliminar(o.id)} style={{background:'#FEE2E2',color:G.err,border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:10}}>🗑</button>
          </div></div></div>))}
    </div></div>)
}

/* ═══ MANTENIMIENTO GENÉRICO ═══ */
function MantScr(P){
  const{tipo,data,eid,lid,tit,notify,loadAll,setScr}=P
  const[nuevo,setNuevo]=useState('')
  const[eId,setEId]=useState(null)
  const[eVal,setEVal]=useState('')
  const tits={lineas:'📏 Líneas',categorias:'🏷️ Categorías',colores:'🎨 Colores'}

  const agregar=async()=>{if(!nuevo.trim())return;const row={empresa_id:eid,nombre:nuevo.trim()}
    if(tipo==='categorias'){row.linea_id=lid;row.tallas=[];row.atributos=[]}
    await supabase.from(tipo).insert(row);setNuevo('');notify('Agregado');await loadAll()}
  const actualizar=async id=>{if(!eVal.trim())return;await supabase.from(tipo).update({nombre:eVal.trim()}).eq('id',id);setEId(null);notify('Actualizado');await loadAll()}
  const eliminar=async id=>{if(!confirm('¿Eliminar?'))return;await supabase.from(tipo).update({activo:false}).eq('id',id);notify('Eliminado');await loadAll()}

  return(<div>
    <Hdr tit={tit} sec={tits[tipo]||tipo} onBack={()=>setScr('submenu')}/>
    <div style={{padding:16}}>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <input value={nuevo} onChange={e=>setNuevo(e.target.value)} placeholder="Nuevo..." onKeyDown={e=>e.key==='Enter'&&agregar()}
          style={{flex:1,...iS(G),marginBottom:0}}/>
        <button onClick={agregar} disabled={!nuevo.trim()} style={{padding:'10px 16px',borderRadius:8,border:'none',background:nuevo.trim()?G.gold:'#ccc',color:'#fff',fontWeight:700,cursor:'pointer'}}>➕</button>
      </div>
      {data.map(it=>(<div key={it.id} style={{background:'#fff',borderRadius:10,padding:12,marginBottom:6,display:'flex',alignItems:'center',gap:8,border:'1px solid '+G.border}}>
        {eId===it.id?(
          <><input value={eVal} onChange={e=>setEVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&actualizar(it.id)} style={{flex:1,...iS(G),marginBottom:0}}/>
            <button onClick={()=>actualizar(it.id)} style={{background:G.ok,color:'#fff',border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:11}}>✓</button>
            <button onClick={()=>setEId(null)} style={{background:G.muted,color:'#fff',border:'none',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:11}}>✕</button></>
        ):(<><span style={{flex:1,fontSize:14,fontWeight:500}}>{it.nombre}</span>
            <button onClick={()=>{setEId(it.id);setEVal(it.nombre)}} style={{background:G.goldSf,color:G.goldDk,border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:10}}>Editar</button>
            <button onClick={()=>eliminar(it.id)} style={{background:'#FEE2E2',color:G.err,border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',fontSize:10}}>🗑</button></>)}
      </div>))}
    </div></div>)
}

/* ═══ CLIENTES ═══ */
function ClientesScr(P){
  const{eid,tit,clis,vents,notify,loadAll,setScr}=P
  const[showAdd,setShowAdd]=useState(false)
  const[editCli,setEditCli]=useState(null)
  const[f,setF]=useState({nombre:'',telefono:'',direccion:'',preferencias:'',acepta_publicidad:false})
  const[buscar,setBuscar]=useState('')
  const s=(k,v)=>setF(p=>({...p,[k]:v}))
  const filt=clis.filter(c=>!buscar||c.nombre?.toLowerCase().includes(buscar.toLowerCase())||c.telefono?.includes(buscar))

  const abrir=(c)=>{if(c){setEditCli(c);setF({nombre:c.nombre||'',telefono:c.telefono||'',direccion:c.direccion||'',preferencias:c.preferencias||'',acepta_publicidad:c.acepta_publicidad||false})}
    else{setEditCli(null);setF({nombre:'',telefono:'',direccion:'',preferencias:'',acepta_publicidad:false})};setShowAdd(true)}

  const guardar=async()=>{if(!f.nombre){notify('Nombre obligatorio','error');return}
    if(editCli){await supabase.from('clientes').update(f).eq('id',editCli.id);notify('Actualizado')}
    else{const cod='C'+String(clis.length+1).padStart(4,'0');await supabase.from('clientes').insert({empresa_id:eid,codigo:cod,...f});notify('Creado')}
    setShowAdd(false);setEditCli(null);await loadAll()}

  const eliminar=async c=>{const{data:v}=await supabase.from('ventas').select('id').eq('cliente_id',c.id).limit(1)
    if(v?.length>0){notify('No se puede eliminar, tiene ventas','error');return}
    if(!confirm('¿Eliminar '+c.nombre+'?'))return
    await supabase.from('clientes').update({activo:false}).eq('id',c.id);notify('Eliminado');await loadAll()}

  return(<div>
    <Hdr tit={tit} sec="👥 Clientes" onBack={()=>setScr('submenu')}/>
    <div style={{padding:16}}>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar..." style={{flex:1,...iS(G),marginBottom:0}}/>
        <button onClick={()=>abrir(null)} style={{padding:'10px 14px',borderRadius:8,border:'none',background:G.gold,color:'#fff',fontWeight:600,cursor:'pointer',fontSize:12}}>➕</button></div>
      {showAdd&&(<Crd title={editCli?'Editar cliente':'Nuevo cliente'}>
        <input value={f.nombre} onChange={e=>s('nombre',e.target.value)} placeholder="Nombre completo o nickname" style={iS(G)}/>
        <input value={f.telefono} onChange={e=>s('telefono',e.target.value)} placeholder="Teléfono" style={iS(G)}/>
        <input value={f.direccion} onChange={e=>s('direccion',e.target.value)} placeholder="Dirección" style={iS(G)}/>
        <div style={{display:'flex',gap:6,alignItems:'end'}}><div style={{flex:1}}>
          <textarea value={f.preferencias} onChange={e=>s('preferencias',e.target.value)} placeholder="Preferencias" rows={2} style={{...iS(G),resize:'vertical'}}/></div>
          <VoiceBtn onResult={t=>s('preferencias',(f.preferencias?f.preferencias+' ':'')+t)}/></div>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,marginBottom:8,cursor:'pointer'}}>
          <input type="checkbox" checked={f.acepta_publicidad} onChange={e=>s('acepta_publicidad',e.target.checked)}/>Acepta publicidad</label>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{setShowAdd(false);setEditCli(null)}} style={{flex:1,padding:10,borderRadius:8,border:'1px solid '+G.border,background:'transparent',color:G.muted,fontSize:13,cursor:'pointer'}}>Cancelar</button>
          <button onClick={guardar} style={{flex:1,padding:10,borderRadius:8,border:'none',background:G.gold,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer'}}>Guardar</button></div>
      </Crd>)}
      {filt.map(c=>(<div key={c.id} style={{background:'#fff',borderRadius:10,padding:12,marginBottom:6,border:'1px solid '+G.border}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
          <div><p style={{fontSize:14,fontWeight:600,margin:0}}>{c.nombre}</p>
            <p style={{fontSize:10,color:G.muted,margin:'2px 0'}}>{c.codigo} {c.telefono?'• '+c.telefono:''} {c.direccion?'• '+c.direccion:''}</p>
            {c.preferencias&&<p style={{fontSize:10,color:G.gold,margin:0}}>❤️ {c.preferencias}</p>}</div>
          <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'end'}}>
            {c.acepta_publicidad&&<span style={{fontSize:8,background:G.goldSf,color:G.goldDk,padding:'2px 6px',borderRadius:4}}>📢</span>}
            <div style={{display:'flex',gap:4}}>
              <button onClick={()=>abrir(c)} style={{background:G.goldSf,color:G.goldDk,border:'none',borderRadius:4,padding:'3px 6px',cursor:'pointer',fontSize:9}}>Editar</button>
              <button onClick={()=>eliminar(c)} style={{background:'#FEE2E2',color:G.err,border:'none',borderRadius:4,padding:'3px 6px',cursor:'pointer',fontSize:9}}>🗑</button>
            </div></div></div></div>))}
    </div></div>)
}

/* ═══ STOCK ═══ */
function StockScr(P){
  const{tit,allProds,setScr,notify}=P
  const[flt,setFlt]=useState('todos')
  const fl=allProds.filter(p=>{if(flt==='bajo')return p.cantidad>0&&p.cantidad<=3;if(flt==='agotado')return p.cantidad<=0;return true})
  const tI=allProds.reduce((s,p)=>s+p.cantidad,0),tV=allProds.reduce((s,p)=>s+(p.precio_venta*p.cantidad),0)

  const exp=()=>{exportCSV(allProds,'stock_'+new Date().toISOString().split('T')[0],[
    {k:'codigo',l:'Código'},{k:'nombre',l:'Nombre'},{k:r=>r.lineas?.nombre||'',l:'Línea'},
    {k:r=>r.categorias?.nombre||'',l:'Categoría'},{k:'color',l:'Color'},
    {k:'cantidad',l:'Stock'},{k:'precio_costo',l:'P.Costo'},{k:'precio_venta',l:'P.Venta'},
    {k:r=>(r.precio_venta*r.cantidad).toFixed(2),l:'Valorizado'}]);notify('Exportado')}

  return(<div>
    <Hdr tit={tit} sec="📊 Stock" onBack={()=>setScr('submenu')}/>
    <div style={{padding:16}}>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <div style={{flex:1,background:G.gold,borderRadius:10,padding:12,textAlign:'center'}}>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:10,margin:0}}>Items</p><p style={{color:'#fff',fontSize:22,fontWeight:800,margin:0}}>{tI}</p></div>
        <div style={{flex:1,background:G.goldDk,borderRadius:10,padding:12,textAlign:'center'}}>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:10,margin:0}}>Valorizado</p><p style={{color:'#fff',fontSize:22,fontWeight:800,margin:0}}>S/{tV.toFixed(0)}</p></div></div>
      <div style={{display:'flex',gap:6,marginBottom:12,alignItems:'center'}}>
        {[{id:'todos',l:'Todos'},{id:'bajo',l:'⚠️ Bajo'},{id:'agotado',l:'🔴 Agotado'}].map(f=>(<button key={f.id} onClick={()=>setFlt(f.id)}
          style={{padding:'6px 12px',borderRadius:20,border:'none',background:flt===f.id?G.gold:G.goldSf,color:flt===f.id?'#fff':G.goldDk,fontSize:11,fontWeight:600,cursor:'pointer'}}>{f.l}</button>))}
        <button onClick={exp} style={{marginLeft:'auto',padding:'6px 12px',borderRadius:8,border:'1px solid '+G.gold,background:'transparent',color:G.gold,fontSize:11,fontWeight:600,cursor:'pointer'}}>📥 Excel</button></div>
      {fl.map(p=>{const st=p.cantidad<=0?'x':p.cantidad<=3?'b':'o'
        return(<div key={p.id} style={{background:'#fff',borderRadius:10,padding:10,marginBottom:6,display:'flex',alignItems:'center',gap:10,border:'1px solid '+G.border}}>
          {p.foto_url?<img src={p.foto_url} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:6}}/>
          :<div style={{width:40,height:40,background:G.goldLt,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:14,opacity:0.3}}>📦</span></div>}
          <div style={{flex:1}}><p style={{fontSize:12,fontWeight:600,margin:0}}>{p.nombre}</p>
            <p style={{fontSize:10,color:G.muted,margin:0}}>{p.codigo} • C:S/{p.precio_costo} V:S/{p.precio_venta}</p></div>
          <span style={{fontSize:14,fontWeight:700,padding:'4px 10px',borderRadius:8,
            color:st==='x'?'#fff':st==='b'?G.warn:G.goldDk,background:st==='x'?G.err:st==='b'?'#FEF3C7':G.goldSf}}>{p.cantidad}</span>
        </div>)})}
    </div></div>)
}

/* ═══ HISTORIAL VENTAS ═══ */
function HistorialScr(P){
  const{tit,vents,setScr,notify}=P
  const tV=vents.reduce((s,v)=>s+v.total,0),tI=vents.reduce((s,v)=>s+v.cantidad,0)
  const tG=vents.reduce((s,v)=>s+(v.precio_venta_real-v.precio_costo)*v.cantidad,0)

  const exp=()=>{exportCSV(vents,'ventas_'+new Date().toISOString().split('T')[0],[
    {k:r=>new Date(r.created_at).toLocaleDateString('es-PE'),l:'Fecha'},
    {k:r=>new Date(r.created_at).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}),l:'Hora'},
    {k:'codigo_producto',l:'Código'},{k:'nombre_producto',l:'Producto'},{k:'cantidad',l:'Cant'},
    {k:'precio_costo',l:'P.Costo'},{k:'precio_venta_original',l:'P.Venta Orig'},
    {k:'precio_venta_real',l:'P.Venta Real'},{k:'total',l:'Total'},
    {k:'metodo_pago',l:'Pago'},{k:'tipo_entrega',l:'Entrega'},
    {k:r=>r.clientes?.nombre||'',l:'Cliente'}]);notify('Exportado')}

  return(<div>
    <Hdr tit={tit} sec="📋 Ventas" onBack={()=>setScr('submenu')}/>
    <div style={{padding:16}}>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <div style={{flex:1,background:G.gold,borderRadius:10,padding:12,textAlign:'center'}}>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:10,margin:0}}>Vendido</p><p style={{color:'#fff',fontSize:22,fontWeight:800,margin:0}}>S/{tV.toFixed(0)}</p></div>
        <div style={{flex:1,background:G.goldDk,borderRadius:10,padding:12,textAlign:'center'}}>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:10,margin:0}}>Ganancia</p><p style={{color:'#fff',fontSize:22,fontWeight:800,margin:0}}>S/{tG.toFixed(0)}</p></div></div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        <button onClick={exp} style={{padding:'6px 12px',borderRadius:8,border:'1px solid '+G.gold,background:'transparent',color:G.gold,fontSize:11,fontWeight:600,cursor:'pointer'}}>📥 Excel</button></div>
      {vents.length===0?(<div style={{textAlign:'center',padding:40,color:G.muted}}><p style={{fontSize:32}}>📋</p><p>No hay ventas</p></div>
      ):vents.map(v=>(<div key={v.id} style={{background:'#fff',borderRadius:10,padding:12,marginBottom:6,border:'1px solid '+G.border}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start'}}>
          <div><p style={{fontSize:13,fontWeight:700,margin:0}}>{v.nombre_producto}</p>
            <p style={{fontSize:10,color:G.muted,margin:'2px 0'}}>{v.codigo_producto} • {v.cantidad} und • {v.metodo_pago}
              {v.tipo_entrega==='Delivery'?' • 🛵':''}</p>
            <p style={{fontSize:10,color:G.muted,margin:0}}>
              {new Date(v.created_at).toLocaleDateString('es-PE')} {new Date(v.created_at).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}
              {v.clientes?.nombre?' • '+v.clientes.nombre:''}</p></div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:15,fontWeight:800,color:G.gold,margin:0}}>S/{v.total.toFixed(2)}</p>
            <p style={{fontSize:9,color:G.ok,margin:'2px 0 0'}}>+S/{((v.precio_venta_real-v.precio_costo)*v.cantidad).toFixed(2)}</p>
            {v.precio_venta_real!==v.precio_venta_original&&<p style={{fontSize:9,color:G.warn,margin:0}}>Orig: S/{v.precio_venta_original}</p>}
            {v.foto_yape&&<span style={{fontSize:9,color:G.gold}}>📱 Yape</span>}
          </div></div></div>))}
    </div></div>)
}
