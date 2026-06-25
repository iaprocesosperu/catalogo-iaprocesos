import { subirFoto } from './supabase'

export function blobToBase64(b) {
  return new Promise(r => {
    const rd = new FileReader()
    rd.onload = () => r(rd.result.split(',')[1])
    rd.readAsDataURL(b)
  })
}

export function downloadPhoto(url, nombre) {
  fetch(url).then(r => r.blob()).then(b => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = (nombre || 'foto') + '.jpg'
    a.click()
    URL.revokeObjectURL(a.href)
  }).catch(() => { window.open(url, '_blank') })
}

// URL del backend Railway — se configura en .env como VITE_RAILWAY_URL
const RAILWAY_URL = import.meta.env.VITE_RAILWAY_URL || ''

export async function mejorarFotoConIA(fileOrBlob, empresaId) {
  if (!RAILWAY_URL) throw new Error('Backend no configurado. Agrega VITE_RAILWAY_URL en .env')

  const fd = new FormData()
  const file = fileOrBlob instanceof File
    ? fileOrBlob
    : new File([fileOrBlob], 'foto.jpg', { type: 'image/jpeg' })
  fd.append('imagen', file)

  const resp = await fetch(RAILWAY_URL + '/mejorar-foto', {
    method: 'POST',
    headers: { 'empresa-id': String(empresaId || 'default') },
    body: fd
  })

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}))
    throw new Error(err?.detail || 'Error del servidor (' + resp.status + ')')
  }

  const data = await resp.json()
  if (!data.imagen_b64) throw new Error('Sin imagen en respuesta')

  if (data.restantes_hoy !== undefined) {
    console.log('Mejoras restantes hoy:', data.restantes_hoy)
  }

  const bin = atob(data.imagen_b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: 'image/png' })
}

export function exportCSV(data, filename, columns) {
  const h = columns.map(c => c.l).join(',')
  const rows = data.map(r => columns.map(c => {
    let v = typeof c.k === 'function' ? c.k(r) : r[c.k]
    if (v == null) v = ''
    return '"' + String(v).replace(/"/g, '""') + '"'
  }).join(','))
  const csv = '\uFEFF' + h + '\n' + rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename + '.csv'; a.click()
}

export function startVoice(cb) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) { cb(null); return }
  const r = new SR(); r.lang = 'es-PE'
  r.onresult = e => cb(e.results[0][0].transcript)
  r.onerror = () => cb(null)
  r.start()
}

export function detectColor(imgSrc) {
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas'), ctx = c.getContext('2d')
      c.width = 50; c.height = 50
      ctx.drawImage(img, 0, 0, 50, 50); const d = ctx.getImageData(0, 0, 50, 50).data
      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++ }
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n)
      const colors = [['Negro', 0, 0, 0], ['Blanco', 255, 255, 255], ['Rojo', 200, 30, 30],
        ['Azul', 30, 30, 200], ['Verde', 30, 150, 30], ['Amarillo', 230, 220, 50],
        ['Rosado', 230, 130, 170], ['Morado', 130, 30, 180], ['Naranja', 230, 140, 30],
        ['Gris', 140, 140, 140], ['Marrón', 130, 80, 30], ['Beige', 210, 190, 150],
        ['Celeste', 100, 180, 230], ['Turquesa', 0, 200, 180], ['Coral', 230, 100, 80],
        ['Crema', 240, 230, 200], ['Dorado', 200, 170, 50], ['Plateado', 190, 190, 200]]
      let best = '', minD = Infinity
      colors.forEach(([name, cr, cg, cb]) => {
        const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2)
        if (dist < minD) { minD = dist; best = name }
      })
      res(best)
    }
    img.onerror = () => res(''); img.src = imgSrc
  })
}

export function generarCatalogoPDF(productos, empresa, linea) {
  const prods = productos.filter(p => p.cantidad > 0)
  if (!prods.length) { alert('No hay productos con stock para generar el catálogo'); return }

  const nom = empresa?.nombre || ''
  const slo = empresa?.slogan || 'Aquí todo es barato'
  const dir = empresa?.direccion || ''
  const wa = empresa?.whatsapp || ''

  const logo = (w, h) => `<svg width="${w}" height="${h}" viewBox="0 0 64 60" xmlns="http://www.w3.org/2000/svg"><path d="M32,3 L59,25 L54,25 L54,54 L10,54 L10,25 L5,25 Z" fill="none" stroke="#C5A55A" stroke-width="3" stroke-linejoin="round"/><rect x="22" y="23" width="20" height="14" rx="3" fill="#C5A55A" opacity="0.85"/><path d="M25,23 Q32,15 39,23" fill="none" stroke="#C5A55A" stroke-width="2.5"/><rect x="25" y="38" width="14" height="16" rx="2" fill="#C5A55A" opacity="0.65"/></svg>`

  const cover = `<div class="page cover">
    <div class="cover-body">
      <div class="cover-logo">${logo(60, 58)}</div>
      <h1 class="cover-title">${nom}</h1>
      <p class="cover-slogan">${slo}</p>
      <div class="cover-badge"><span>&#128722;</span> CAT&Aacute;LOGO DE PRODUCTOS</div>
      <div class="cover-features">
        <div class="feat"><div class="feat-ico">&#127991;</div><p>PRECIOS<br>BAJOS</p></div>
        <div class="feat"><div class="feat-ico">&#10003;</div><p>CALIDAD<br>GARANTIZADA</p></div>
        <div class="feat"><div class="feat-ico">&#128722;</div><p>VARIEDAD<br>PARA TODOS</p></div>
        <div class="feat"><div class="feat-ico">&#9786;</div><p>ATENCI&Oacute;N<br>AMIGABLE</p></div>
      </div>
    </div>
    <svg class="wave-svg" viewBox="0 0 210 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,28 C35,4 70,24 105,14 C140,4 175,22 210,8 L210,28 Z" fill="#1A1A1A"/>
    </svg>
    <div class="cover-dark">
      <div class="year-circle"><span class="y-num">2026</span><span class="y-txt">EDICI&Oacute;N</span></div>
    </div>
    <div class="cover-foot">
      <div class="cf-col"><span class="cf-lbl">DIRECCI&Oacute;N:</span><span>${dir}</span></div>
      <div class="cf-sep"></div>
      <div class="cf-col cf-right"><span class="cf-lbl">WHATSAPP:</span><span class="cf-wa">${wa}</span></div>
    </div>
  </div>`

  const pages = prods.map((p, i) => {
    const num = String(i + 1).padStart(3, '0')
    const genero = p.atributos?.genero || ''
    const talla = p.atributos?.talla || ''
    const color = p.color || ''
    const subcat = p.categorias?.nombre || ''

    let attrsHTML = ''
    if (genero) attrsHTML += `<div class="arow"><div class="aico">&#128100;</div><div class="atxt"><span class="albl">G&Eacute;NERO:</span><span class="aval">${genero.toUpperCase()}</span></div></div>`
    if (talla) attrsHTML += `<div class="arow"><div class="aico">&#128085;</div><div class="atxt"><span class="albl">TALLA:</span><span class="aval">${talla}</span></div></div>`
    if (color) attrsHTML += `<div class="arow"><div class="aico">&#127912;</div><div class="atxt"><span class="albl">COLOR:</span><span class="aval">${color.toUpperCase()}</span></div></div>`
    if (p.atributos) {
      Object.entries(p.atributos).filter(([k, v]) => k !== 'genero' && k !== 'talla' && v).forEach(([k, v]) => {
        attrsHTML += `<div class="arow"><div class="aico">&#9642;</div><div class="atxt"><span class="albl">${k.toUpperCase()}:</span><span class="aval">${String(v).toUpperCase()}</span></div></div>`
      })
    }

    return `<div class="page product">
      <div class="ph">
        <div class="ph-line"></div>
        <div class="ph-center">${logo(28, 27)}<h2>${nom}</h2><p>${slo}</p></div>
        <div class="ph-line"></div>
      </div>
      <div class="photo-area">
        <div class="num-badge">${num}</div>
        ${p.foto_url ? `<img src="${p.foto_url}" alt="">` : '<div class="no-foto"><p>' + (p.nombre || '').toUpperCase() + '</p><p>Sin foto</p></div>'}
      </div>
      <div class="pinfo">
        <h3 class="pname">${(p.nombre || '').toUpperCase()}</h3>
        ${subcat ? `<p class="pcat">${subcat.toUpperCase()}</p>` : ''}
      </div>
      <div class="attrs-wrap">${attrsHTML}</div>
      <div class="price-wrap">
        <div class="pgold">S/${p.precio_venta}</div>
        <div class="pblk">PRECIO</div>
      </div>
      <div class="pfoot">
        <div class="pf-col"><p class="pf-lbl">DIRECCI&Oacute;N:</p><p>${dir}</p></div>
        <div class="pf-sep"></div>
        <div class="pf-col pf-right"><p class="pf-lbl">WHATSAPP:</p><p class="pf-wa">${wa}</p></div>
      </div>
      <div class="brand-bar">&#8212; ${nom} &#8212; &nbsp; ${slo}</div>
    </div>`
  }).join('')

  const css = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#e0e0e0}@page{size:A4 portrait;margin:0}@media print{body{background:#fff}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.page{margin:0!important;box-shadow:none!important;page-break-after:always;page-break-inside:avoid}}.page{width:210mm;min-height:297mm;background:#fff;display:flex;flex-direction:column;margin:14px auto;box-shadow:0 4px 28px rgba(0,0,0,0.18);overflow:hidden;position:relative}.cover-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 30px 12px;gap:14px}.cover-logo{margin-bottom:2px}.cover-title{font-size:50px;font-weight:900;color:#C5A55A;text-align:center;text-transform:uppercase;line-height:1.05;letter-spacing:-1px}.cover-slogan{font-family:Georgia,serif;font-style:italic;font-size:19px;color:#666;margin-top:-4px}.cover-badge{background:#C5A55A;color:#fff;font-size:16px;font-weight:800;padding:11px 28px;border-radius:8px;display:flex;align-items:center;gap:10px;letter-spacing:0.5px}.cover-features{display:flex;gap:18px;margin-top:6px}.feat{display:flex;flex-direction:column;align-items:center;gap:6px;width:70px}.feat-ico{width:50px;height:50px;border-radius:50%;border:2.5px solid #C5A55A;display:flex;align-items:center;justify-content:center;font-size:20px}.feat p{font-size:8px;font-weight:700;color:#444;text-align:center;line-height:1.35}.wave-svg{display:block;width:100%;height:28px;background:#fff;flex-shrink:0}.cover-dark{background:#1A1A1A;padding:12px 30px 14px;display:flex;align-items:center;justify-content:flex-end;flex-shrink:0}.year-circle{width:78px;height:78px;background:#C5A55A;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid #fff}.y-num{font-size:22px;font-weight:900;color:#fff;line-height:1}.y-txt{font-size:8px;font-weight:700;color:#fff;letter-spacing:1.5px}.cover-foot{background:#1A1A1A;border-top:2.5px solid #C5A55A;display:flex;align-items:center;padding:12px 24px;color:#fff;font-size:10px;flex-shrink:0}.cf-col{flex:1;display:flex;flex-direction:column;gap:2px}.cf-right{align-items:flex-end}.cf-sep{width:1px;background:rgba(255,255,255,0.25);height:30px;margin:0 20px;flex-shrink:0}.cf-lbl{color:#C5A55A;font-weight:700;font-size:9px}.cf-wa{font-size:16px;font-weight:800}.ph{display:flex;align-items:center;padding:10px 20px;gap:12px;border-bottom:1px solid #E8E3D8;flex-shrink:0}.ph-line{flex:1;height:1px;background:#C5A55A;opacity:0.55}.ph-center{display:flex;flex-direction:column;align-items:center;gap:1px}.ph-center h2{font-size:10px;font-weight:800;color:#C5A55A;text-transform:uppercase;letter-spacing:0.5px}.ph-center p{font-size:7px;color:#999;font-family:Georgia,serif;font-style:italic}.photo-area{flex:1;background:#F9F5EB;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:110mm}.photo-area img{max-width:86%;max-height:86%;object-fit:contain}.no-foto{display:flex;flex-direction:column;align-items:center;gap:10px;color:#C5A55A;opacity:0.35}.no-foto p:first-child{font-size:18px;font-weight:800;text-align:center;padding:0 20px}.no-foto p:last-child{font-size:12px}.num-badge{position:absolute;top:0;left:0;background:#C5A55A;color:#fff;font-size:18px;font-weight:800;padding:7px 15px;letter-spacing:2px;z-index:2}.pinfo{padding:12px 22px 4px;background:#fff;flex-shrink:0}.pname{font-size:24px;font-weight:900;color:#1F2937;text-transform:uppercase;line-height:1.1}.pcat{font-size:15px;font-weight:700;color:#C5A55A;margin-top:2px;text-transform:uppercase}.attrs-wrap{padding:2px 22px 4px;background:#fff;flex-shrink:0}.arow{display:flex;align-items:center;padding:5px 0;border-bottom:1px solid #F0EBE0;gap:10px}.aico{width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}.atxt{flex:1}.albl{display:block;font-size:8px;color:#6B7280;font-weight:600}.aval{display:block;font-size:12px;font-weight:700;color:#1F2937}.price-wrap{margin:8px 22px 6px;border-radius:10px;overflow:hidden;text-align:center;flex-shrink:0}.pgold{background:#C5A55A;color:#fff;font-size:40px;font-weight:900;padding:10px}.pblk{background:#1A1A1A;color:#fff;font-size:11px;font-weight:700;padding:5px;letter-spacing:2px}.pfoot{background:#1A1A1A;display:flex;padding:9px 20px;flex-shrink:0}.pf-col{flex:1;color:#fff;font-size:8.5px;line-height:1.6}.pf-right{text-align:right}.pf-lbl{color:#C5A55A;font-weight:700;font-size:7.5px}.pf-wa{font-size:14px;font-weight:800}.pf-sep{width:1px;background:rgba(255,255,255,0.2);margin:0 14px;flex-shrink:0}.brand-bar{background:#0D0D0D;color:#C5A55A;font-size:7.5px;text-align:center;padding:4px;font-style:italic;flex-shrink:0}`

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Catálogo ${nom}</title><style>${css}</style></head><body>${cover}${pages}</body></html>`
  const w = window.open('', '_blank')
  if (!w) { alert('Permite ventanas emergentes para generar el PDF'); return }
  w.document.write(html); w.document.close()
  setTimeout(() => w.print(), 900)
}
