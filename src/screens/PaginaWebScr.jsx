import { useState, useEffect } from 'react'
import { supabase, comprimirImagen, subirFoto } from '../supabase'
import { G } from '../constants'

export default function PaginaWebScr({ emp, notify }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [f, setF] = useState({
    nombre_tienda: '', slogan: '', whatsapp: '', whatsapp_link: '',
    email: '', direccion: '', facebook_url: '', color_primario: '#C5A55A', color_secundario: '#2D7D7D'
  })
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPrev, setBannerPrev] = useState(null)
  const [heroFile, setHeroFile] = useState(null)
  const [heroPrev, setHeroPrev] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPrev, setLogoPrev] = useState(null)
  const [subdominios, setSubdominios] = useState([])
  const [subSel, setSubSel] = useState(null)
  const s = (k, v) => setF(p => ({ ...p, [k]: v }))

  useEffect(() => { cargar() }, [emp])

  const cargar = async () => {
    if (!emp?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('subdominios')
      .select('*,lineas(nombre)')
      .eq('empresa_id', emp.id)
      .eq('activo', true)
    if (data?.length) {
      setSubdominios(data)
      seleccionar(data[0])
    }
    setLoading(false)
  }

  const seleccionar = (sub) => {
    setSubSel(sub)
    setF({
      nombre_tienda:    sub.nombre_tienda    || '',
      slogan:           sub.slogan           || '',
      whatsapp:         sub.whatsapp         || '',
      whatsapp_link:    sub.whatsapp_link    || '',
      email:            sub.email            || '',
      direccion:        sub.direccion        || '',
      facebook_url:     sub.facebook_url     || '',
      color_primario:   sub.color_primario   || '#C5A55A',
      color_secundario: sub.color_secundario || '#2D7D7D'
    })
    setBannerPrev(sub.banner_url || null)
    setHeroPrev(sub.hero_url || null)
    setLogoPrev(sub.logo_url || null)
    setBannerFile(null)
    setHeroFile(null)
    setLogoFile(null)
  }

  const onBanner = e => {
    const file = e.target.files?.[0]; if (!file) return
    setBannerFile(file)
    const r = new FileReader(); r.onload = ev => setBannerPrev(ev.target.result); r.readAsDataURL(file)
  }

  const onHero = e => {
    const file = e.target.files?.[0]; if (!file) return
    setHeroFile(file)
    const r = new FileReader(); r.onload = ev => setHeroPrev(ev.target.result); r.readAsDataURL(file)
  }

  const onLogo = e => {
    const file = e.target.files?.[0]; if (!file) return
    setLogoFile(file)
    const r = new FileReader(); r.onload = ev => setLogoPrev(ev.target.result); r.readAsDataURL(file)
  }

  const guardar = async () => {
    if (!subSel) return
    setSaving(true)
    try {
      let updates = { ...f }
      if (bannerFile) {
        const blob = await comprimirImagen(bannerFile, 1200)
        updates.banner_url = await subirFoto(blob, `banner_${subSel.subdominio}`)
      }
      if (heroFile) {
        const blob = await comprimirImagen(heroFile, 1200)
        updates.hero_url = await subirFoto(blob, `hero_${subSel.subdominio}`)
      }
      if (logoFile) {
        const blob = await comprimirImagen(logoFile, 400)
        updates.logo_url = await subirFoto(blob, `logo_${subSel.subdominio}`)
      }
      await supabase.from('subdominios').update(updates).eq('id', subSel.id)
      notify('Página web actualizada ✓')
      await cargar()
    } catch(e) { notify('Error: ' + e.message, 'error') }
    setSaving(false)
  }

  const iS = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 14, boxSizing: 'border-box', marginBottom: 4, background: '#fff' }
  const lS = { fontSize: 11, fontWeight: 700, color: G.muted, marginBottom: 4, display: 'block', letterSpacing: 0.5 }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: G.muted }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ background: G.gold, padding: '16px 20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>{emp?.nombre}</p>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>🌐 Administrar Página Web</h2>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Selector de subdominio si tiene más de uno */}
        {subdominios.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <span style={lS}>PÁGINA A EDITAR</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {subdominios.map(sub => (
                <button key={sub.id} onClick={() => seleccionar(sub)}
                  style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: subSel?.id === sub.id ? G.gold : '#F0F0F0',
                    color: subSel?.id === sub.id ? '#fff' : G.text }}>
                  {sub.nombre_tienda || sub.subdominio}
                </button>
              ))}
            </div>
          </div>
        )}

        {subSel && (
          <>
            {/* URL activa */}
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🌐</span>
              <div>
                <p style={{ fontSize: 11, color: '#166534', margin: 0 }}>URL pública activa</p>
                <a href={`https://${subSel.subdominio}.iaprocesos.com.pe`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 14, fontWeight: 700, color: '#15803D', textDecoration: 'none' }}>
                  {subSel.subdominio}.iaprocesos.com.pe ↗
                </a>
              </div>
            </div>

            {/* BANNER NAV */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid ' + G.border }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>🎨 Imagen de fondo del menú superior</p>
              <p style={{ fontSize: 11, color: G.muted, margin: '0 0 12px' }}>Imagen decorativa que aparece de fondo en la barra de navegación (ancha, ej: huellas de gato)</p>
              {bannerPrev ? (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <img src={bannerPrev} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 10 }} />
                  <button onClick={() => { setBannerFile(null); setBannerPrev(null) }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
                    Quitar
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', padding: 16, borderRadius: 10, border: '2px dashed ' + G.gold, background: G.goldLt, textAlign: 'center', cursor: 'pointer', marginBottom: 10 }}>
                  <span style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>🐾</span>
                  <span style={{ fontSize: 13, color: G.gold, fontWeight: 600 }}>Subir imagen de fondo del menú</span>
                  <input type="file" accept="image/*" onChange={onBanner} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {/* FOTO HERO */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid ' + G.border }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>🐱 Foto principal (hero)</p>
              <p style={{ fontSize: 11, color: G.muted, margin: '0 0 12px' }}>Foto grande que aparece al lado del título en la página de inicio (ej: foto de tus gatos)</p>
              {heroPrev ? (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <img src={heroPrev} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10 }} />
                  <button onClick={() => { setHeroFile(null); setHeroPrev(null) }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>
                    Quitar
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', padding: 20, borderRadius: 10, border: '2px dashed ' + G.gold, background: G.goldLt, textAlign: 'center', cursor: 'pointer', marginBottom: 10 }}>
                  <span style={{ fontSize: 28, display: 'block', marginBottom: 4 }}>📷</span>
                  <span style={{ fontSize: 13, color: G.gold, fontWeight: 600 }}>Subir foto principal</span>
                  <input type="file" accept="image/*" onChange={onHero} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {/* LOGO */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid ' + G.border }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>🏷️ Logo (opcional)</p>
              {logoPrev ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <img src={logoPrev} alt="" style={{ height: 60, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee' }} />
                  <button onClick={() => { setLogoFile(null); setLogoPrev(null) }}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
                    Quitar
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', padding: 14, borderRadius: 10, border: '2px dashed ' + G.border, background: '#FAFAFA', textAlign: 'center', cursor: 'pointer', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: G.muted }}>📁 Subir logo</span>
                  <input type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {/* TEXTOS */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid ' + G.border }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>✏️ Textos</p>
              <label style={lS}>NOMBRE DE LA TIENDA</label>
              <input value={f.nombre_tienda} onChange={e => s('nombre_tienda', e.target.value)} placeholder="Ej: El Miau" style={iS} />
              <label style={lS}>SLOGAN</label>
              <input value={f.slogan} onChange={e => s('slogan', e.target.value)} placeholder="Ej: Delivery gratis a Marcona" style={iS} />
            </div>

            {/* CONTACTO */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid ' + G.border }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>📞 Contacto</p>
              <label style={lS}>WHATSAPP (solo números)</label>
              <input value={f.whatsapp} onChange={e => s('whatsapp', e.target.value)} placeholder="967539739" style={iS} type="tel" />
              <label style={lS}>LINK WHATSAPP (wa.link/...)</label>
              <input value={f.whatsapp_link} onChange={e => s('whatsapp_link', e.target.value)} placeholder="wa.link/p8pspb" style={iS} />
              <label style={lS}>EMAIL</label>
              <input value={f.email} onChange={e => s('email', e.target.value)} placeholder="elmiau@gmail.com" style={iS} type="email" />
              <label style={lS}>DIRECCIÓN</label>
              <input value={f.direccion} onChange={e => s('direccion', e.target.value)} placeholder="Marcona, 11420, Peru" style={iS} />
              <label style={lS}>FACEBOOK (URL completa)</label>
              <input value={f.facebook_url} onChange={e => s('facebook_url', e.target.value)} placeholder="https://facebook.com/..." style={iS} />
            </div>

            {/* COLORES */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid ' + G.border }}>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>🎨 Colores</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lS}>COLOR PRINCIPAL</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={f.color_primario} onChange={e => s('color_primario', e.target.value)}
                      style={{ width: 40, height: 36, borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
                    <input value={f.color_primario} onChange={e => s('color_primario', e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13 }} />
                  </div>
                </div>
                <div>
                  <label style={lS}>COLOR SECUNDARIO</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={f.color_secundario} onChange={e => s('color_secundario', e.target.value)}
                      style={{ width: 40, height: 36, borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer', padding: 2 }} />
                    <input value={f.color_secundario} onChange={e => s('color_secundario', e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + G.border, fontSize: 13 }} />
                  </div>
                </div>
              </div>
              {/* Preview colores */}
              <div style={{ marginTop: 12, borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
                <div style={{ background: f.color_primario, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{f.nombre_tienda || 'Nombre tienda'}</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>🛒 Comprar</span>
                </div>
                <div style={{ background: f.color_secundario, padding: '8px 16px' }}>
                  <span style={{ color: '#fff', fontSize: 12 }}>🔍 Buscar producto...</span>
                </div>
              </div>
            </div>

            {/* GUARDAR */}
            <button onClick={guardar} disabled={saving}
              style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: saving ? '#ccc' : G.gold, color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
              {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>

            {/* Link ver página */}
            <a href={`https://${subSel.subdominio}.iaprocesos.com.pe`} target="_blank" rel="noreferrer"
              style={{ display: 'block', textAlign: 'center', marginTop: 12, color: G.gold, fontSize: 13, fontWeight: 600 }}>
              👁 Ver página pública →
            </a>
          </>
        )}
      </div>
    </div>
  )
}
