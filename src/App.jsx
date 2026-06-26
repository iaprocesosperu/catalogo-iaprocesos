import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { G } from './constants'
import { NavBar } from './components/index'
import CatalogoScreen from './screens/CatalogoScreen'
import RegistrarScreen from './screens/RegistrarScreen'
import BuscarScreen from './screens/BuscarScreen'
import VentaScreen from './screens/VentaScreen'
import { SubMenu, OrigenesScr, CatsScr, MantScr, ClientesScr, StockScr, HistorialScr, ListasTallasScr } from './screens/OtrasScreens'

/* ═══ LOGIN ═══ */
function AccessScreen({ login, loading }) {
  const [k, setK] = useState('')
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1A1A1A,#2D2D2D)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🔑</div>
      <h1 style={{ color: G.gold, fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>IA <span style={{ color: '#E8E8E8' }}>PROCESOS</span></h1>
      <p style={{ color: '#999', fontSize: 13, marginBottom: 32 }}>Ingresa tu clave de acceso</p>
      <input value={k} onChange={e => setK(e.target.value.toUpperCase())} placeholder="CLAVE"
        style={{ width: '100%', maxWidth: 300, padding: 14, borderRadius: 10, border: '2px solid ' + G.gold, background: '#333', color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center', letterSpacing: 3, boxSizing: 'border-box' }} />
      <button onClick={() => k && login(k)} disabled={!k || loading}
        style={{ width: '100%', maxWidth: 300, padding: 14, borderRadius: 10, border: 'none', background: k ? G.gold : '#555', color: k ? '#1A1A1A' : '#888', fontSize: 16, fontWeight: 700, cursor: k ? 'pointer' : 'default', marginTop: 12 }}>
        {loading ? 'Verificando...' : 'Entrar'}
      </button>
    </div>
  )
}

/* ═══ APP ═══ */
export default function App() {
  const [scr, setScr] = useState('access')
  const [emp, setEmp] = useState(null)
  const [lineas, setLineas] = useState([])
  const [linAct, setLinAct] = useState(null)
  const [cats, setCats] = useState([])
  const [oris, setOris] = useState([])
  const [cols, setCols] = useState([])
  const [prods, setProds] = useState([])
  const [clis, setClis] = useState([])
  const [vents, setVents] = useState([])
  const [listaTallas, setListaTallas] = useState([])
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState(null)
  const [editP, setEditP] = useState(null)
  const [ventaP, setVentaP] = useState(null)

  const notify = (m, t = 'success') => { setNotif({ m, t }); setTimeout(() => setNotif(null), 3500) }

  useEffect(() => {
    const h = () => { if (scr !== 'catalogo' && scr !== 'access') { setScr('catalogo') } else { window.history.pushState(null, '', window.location.href) } }
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', h)
    return () => window.removeEventListener('popstate', h)
  }, [scr])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('share') === 'true') { setScr('registrar') }
  }, [])

  useEffect(() => { const k = localStorage.getItem('ia_key'); if (k) loginKey(k) }, [])

  const loginKey = async (k) => {
    setLoading(true)
    const { data } = await supabase.from('empresas').select('*').eq('access_key', k).eq('activo', true).single()
    if (data) { setEmp(data); localStorage.setItem('ia_key', k); await loadAll(data.id); setScr('catalogo') }
    else { notify('Clave inválida', 'error'); localStorage.removeItem('ia_key') }
    setLoading(false)
  }
  const logout = () => { localStorage.removeItem('ia_key'); setEmp(null); setScr('access') }

  const loadAll = async (eid) => {
    const id = eid || emp?.id; if (!id) return
    const [ln, ct, or, co, pr, cl, ve, lt] = await Promise.all([
      supabase.from('lineas').select('*').eq('empresa_id', id).eq('activo', true).order('nombre'),
      supabase.from('categorias').select('*').eq('empresa_id', id).eq('activo', true).order('nombre'),
      supabase.from('origenes').select('*').eq('empresa_id', id).eq('activo', true).order('nombre'),
      supabase.from('colores').select('*').eq('empresa_id', id).eq('activo', true).order('nombre'),
      supabase.from('productos').select('*,categorias(nombre),origenes(nombre),lineas(nombre)').eq('empresa_id', id).eq('activo', true).order('created_at', { ascending: false }),
      supabase.from('clientes').select('*').eq('empresa_id', id).eq('activo', true).order('nombre'),
      supabase.from('ventas').select('*,clientes(nombre)').eq('empresa_id', id).order('created_at', { ascending: false }),
      supabase.from('listas_tallas').select('*').eq('activo', true).order('nombre')
    ])
    setLineas(ln.data || []); setCats(ct.data || []); setOris(or.data || []); setCols(co.data || [])
    setProds(pr.data || []); setClis(cl.data || []); setVents(ve.data || [])
    setListaTallas(lt.data || [])
    if (!linAct && ln.data?.length) setLinAct(ln.data[0])
  }

  const eid = emp?.id, lid = linAct?.id
  const tit = `${emp?.nombre || ''} › ${linAct?.nombre || ''}`
  const cF = cats.filter(c => c.linea_id === lid), oF = oris.filter(o => o.linea_id === lid), pF = prods.filter(p => p.linea_id === lid)
  const P = { emp, eid, lid, tit, lineas, linAct, setLinAct, cats: cF, oris: oF, cols, prods: pF, allProds: prods, clis, vents, listaTallas, notify, loadAll, scr, setScr, setEditP, setVentaP, logout, G }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: G.bg, position: 'relative', paddingBottom: 68 }}>
      {notif && (
        <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: notif.t === 'success' ? G.ok : G.err, color: '#fff', padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          {notif.m}
        </div>
      )}
      {scr === 'access' && <AccessScreen login={loginKey} loading={loading} />}
      {scr === 'catalogo' && <CatalogoScreen {...P} />}
      {scr === 'registrar' && <RegistrarScreen {...P} editP={editP} />}
      {scr === 'buscar' && <BuscarScreen {...P} />}
      {scr === 'venta' && <VentaScreen {...P} prod={ventaP} />}
      {scr === 'submenu' && <SubMenu {...P} />}
      {scr === 'lineas' && <MantScr tipo="lineas" data={lineas} {...P} />}
      {scr === 'categorias' && <CatsScr {...P} />}
      {scr === 'origenes' && <OrigenesScr {...P} />}
      {scr === 'colores' && <MantScr tipo="colores" data={cols} {...P} />}
      {scr === 'clientes' && <ClientesScr {...P} />}
      {scr === 'stock' && <StockScr {...P} />}
      {scr === 'historial' && <HistorialScr {...P} />}
      {scr === 'listaTallas' && <ListasTallasScr {...P} />}
      {emp && scr !== 'access' && <NavBar scr={scr} setScr={setScr} setEditP={setEditP} />}
    </div>
  )
}
