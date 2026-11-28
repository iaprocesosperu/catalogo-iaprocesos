import { useState, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════
// PLANTILLA PERSONALIZADO 1 — "La Casita del Ahorro" (diseño rosa)
// Recibe TODO por props desde PublicCatalogPage:
//   config, lineas, productos  → datos reales de Supabase
//   onAgregar(producto)        → añade al carrito
//   onIntranet, carrito, totalItems, totalPrecio, onVerCarrito
// Incluye: menú fijo, banner, filtros (género/talla/color), popup de
// producto, sección Visítanos (mapa+horarios), y oculta "categorías"
// cuando hay una sola línea.
// ═══════════════════════════════════════════════════════════════

export default function PlantillaP1({
  config,
  lineas,
  productos,
  onAgregar,
  onIntranet,
  carrito = [],
  totalItems = 0,
  totalPrecio = 0,
  onVerCarrito
}) {
  const cfg = config || {};
  const categorias = Array.isArray(lineas) ? lineas : [];
  const articulos = Array.isArray(productos) ? productos : [];

  const [busqueda, setBusqueda] = useState('');
  const [lineaSel, setLineaSel] = useState('todas');
  const [fGenero, setFGenero] = useState('');
  const [fTalla, setFTalla] = useState('');
  const [fColor, setFColor] = useState('');
  const [prodModal, setProdModal] = useState(null);

  const primario = cfg.color_primario || "#e5005b";
  const secundario = cfg.color_secundario || "#ffcf00";
  const whatsapp = cfg.whatsapp || "";

  const whatsappUrl = String(whatsapp).startsWith("http")
    ? whatsapp
    : `https://wa.me/51${String(whatsapp).replace(/\D/g, "")}`;
  const waProducto = (p) =>
    `https://wa.me/51${String(whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Hola! Me interesa el producto ${p.codigo || ''} - ${nombreProducto(p)} (${formatPrecio(precioProducto(p))})`)}`;

  const nombreLinea = (item) => item.nombre || item.nombre_linea || "";
  const nombreProducto = (item) => item.nombre || item.nombre_producto || "Producto";
  const imagenProducto = (item) => item.foto_url || item.imagen_url || "";
  const precioProducto = (item) => item.precio_venta ?? item.precio;
  const generoDe = (p) => (p.atributos && p.atributos.genero) || '';
  const tallaDe = (p) => (p.atributos && p.atributos.talla) || '';
  const formatPrecio = (precio) =>
    precio !== undefined && precio !== null && precio !== "" ? `S/ ${Number(precio).toFixed(2)}` : "";

  const sombra = "0 3px 12px rgba(80,30,50,0.09)";
  const card = { background: "#ffffff", border: "1px solid #f3dce5", borderRadius: "18px", overflow: "hidden", boxShadow: sombra };
  const boton = { background: primario, color: "#ffffff", border: "none", borderRadius: "25px", padding: "10px 20px", fontWeight: 700, cursor: "pointer" };

  // Solo líneas activas y marcadas para web, ordenadas
  const categoriasActivas = categorias
    .filter(Boolean)
    .filter((l) => l.mostrar_en_web !== false)
    .sort((a, b) => (a.orden_web || 0) - (b.orden_web || 0));
  const hayCategorias = categoriasActivas.length >= 2; // si hay 1 sola, no tiene sentido mostrar menú/categorías

  // ─── Valores disponibles para los FILTROS (solo lo que existe en los productos visibles) ───
  const opciones = useMemo(() => {
    const g = new Map(), t = new Map(), c = new Map();
    const add = (map, v) => { if (v) map.set(v, (map.get(v) || 0) + 1); };
    articulos.forEach((p) => { add(g, generoDe(p)); add(t, tallaDe(p)); add(c, p.color); });
    const arr = (m, max) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map((e) => e[0]);
    return {
      generos: arr(g, 6).filter((x) => x.toLowerCase() !== 'sin género'),
      tallas: arr(t, 12),
      colores: arr(c, 12).filter((x) => x.toLowerCase() !== 'estándar'),
    };
  }, [articulos]);

  // ─── Filtro final ───
  const filtrados = useMemo(() => {
    return articulos.filter((p) => {
      if (lineaSel !== 'todas' && String(p.linea_id) !== String(lineaSel)) return false;
      if (fGenero && generoDe(p) !== fGenero) return false;
      if (fTalla && tallaDe(p) !== fTalla) return false;
      if (fColor && p.color !== fColor) return false;
      if (busqueda) {
        const t = busqueda.toLowerCase();
        if (!nombreProducto(p).toLowerCase().includes(t) && !(p.codigo || '').toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [articulos, lineaSel, fGenero, fTalla, fColor, busqueda]);

  // Destacados: los marcados; si no hay ninguno, los primeros 4 con foto
  const destacados = useMemo(() => {
    const marc = articulos.filter((p) => p.destacado);
    if (marc.length) return marc.slice(0, 8);
    return articulos.filter((p) => imagenProducto(p)).slice(0, 4);
  }, [articulos]);

  const enCarrito = (p) => carrito.find((i) => i.id === p.id);
  const hayFiltros = fGenero || fTalla || fColor;
  const limpiarFiltros = () => { setFGenero(''); setFTalla(''); setFColor(''); };
  // "Inicio": deja la página como recién entrada (sin filtros, sin búsqueda, arriba)
  const irInicio = () => {
    setLineaSel('todas'); setFGenero(''); setFTalla(''); setFColor(''); setBusqueda(''); setProdModal(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navegación del popup: avanza/retrocede dentro de la lista filtrada (da la vuelta)
  const navegarModal = (dir) => {
    if (!prodModal || filtrados.length === 0) return;
    const idx = filtrados.findIndex((p) => p.id === prodModal.id);
    if (idx === -1) return;
    const next = (idx + dir + filtrados.length) % filtrados.length;
    setProdModal(filtrados[next]);
  };

  const chipFiltro = (activo) => ({
    padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
    border: "1px solid " + (activo ? primario : "#f0d5e0"),
    background: activo ? primario : "#fff", color: activo ? "#fff" : "#8a5a70", whiteSpace: "nowrap"
  });

  const renderProducto = (producto, index) => {
    const imagen = imagenProducto(producto);
    const precio = precioProducto(producto);
    const nombre = nombreProducto(producto);
    const ec = enCarrito(producto);

    return (
      <div key={producto.id || producto.codigo || index}
        style={{ ...card, width: "100%", maxWidth: "235px", minWidth: "155px", flex: "1 1 180px", display: "flex", flexDirection: "column", border: ec ? `2px solid ${primario}` : card.border }}>
        <div onClick={() => setProdModal(producto)}
          style={{ height: "190px", background: "#fffafa", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", cursor: "pointer" }}>
          {imagen ? <img src={imagen} alt={nombre} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
            : <span style={{ fontSize: 44, opacity: .3 }}>📦</span>}
          {producto.codigo && <span style={{ position: 'absolute', top: 8, right: 8, background: '#fff', color: '#999', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>#{producto.codigo}</span>}
          {ec && <span style={{ position: 'absolute', top: 8, left: 8, background: primario, color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 12 }}>×{ec.cantidad}</span>}
        </div>
        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "9px", flex: 1 }}>
          <div onClick={() => setProdModal(producto)} style={{ color: "#34303a", fontWeight: 700, fontSize: "14px", minHeight: "36px", cursor: "pointer" }}>{nombre}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "5px", marginTop: "auto", flexWrap: "wrap" }}>
            {precio !== undefined && precio !== null && precio !== "" && (
              <span style={{ background: secundario, color: "#74002e", padding: "6px 12px", borderRadius: "20px", fontWeight: 800, fontSize: "15px" }}>{formatPrecio(precio)}</span>
            )}
            <button onClick={() => onAgregar?.(producto)} style={{ ...boton, padding: "7px 13px", fontSize: "12px" }}>🛒 Agregar</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fff", color: "#34303a", fontFamily: "Arial, Helvetica, sans-serif" }}>

      {/* ══ CABECERA + NAV (fijos) ══ */}
      <style>{`
        .lc-header { background:#fff; padding:12px 4%; display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
        .lc-logo { display:flex; align-items:center; }
        .lc-logo img { width:220px; max-width:100%; height:55px; object-fit:contain; }
        .lc-search { flex:1 1 200px; max-width:360px; padding:12px 18px; border:1px solid #e6cbd7; border-radius:25px; font-size:14px; box-sizing:border-box; }
        @media (max-width:640px){
          .lc-header { justify-content:center; }
          .lc-logo { width:100%; justify-content:center; }
          .lc-logo img { height:46px; }
          .lc-search { flex:1 1 auto; max-width:none; }
          .lc-cart { flex:0 0 auto; }
        }
      `}</style>
      <div style={{ position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 10px rgba(0,0,0,.08)" }}>
        <header className="lc-header">
          <div className="lc-logo">
            {cfg.logo_url
              ? <img src={cfg.logo_url} alt={cfg.nombre_tienda || "La Casita del Ahorro"} />
              : <strong style={{ color: primario, fontSize: "22px" }}>{cfg.nombre_tienda || "LA CASITA DEL AHORRO"}</strong>}
          </div>
          <input className="lc-search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} type="search" placeholder="⌕  Buscar productos..." style={{ outlineColor: primario }} />
          <button className="lc-cart" onClick={onVerCarrito} style={{ background: secundario, border: "none", color: "#74002e", cursor: "pointer", fontWeight: 800, padding: "10px 16px", borderRadius: 25, fontSize: 13, whiteSpace: "nowrap" }}>
            🛒 {totalItems > 0 ? `${totalItems} · S/ ${Number(totalPrecio).toFixed(2)}` : 'Carrito'}
          </button>
        </header>

        <nav style={{ background: `linear-gradient(90deg, ${primario}, #bd004e)`, padding: "12px 4%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={irInicio}
            style={{ background: lineaSel === 'todas' ? secundario : 'transparent', color: lineaSel === 'todas' ? "#74002e" : '#fff', padding: "9px 25px", borderRadius: "25px", fontWeight: 800, border: 'none', cursor: 'pointer' }}>Inicio</button>
          {hayCategorias && categoriasActivas.map((linea, index) => (
            <button key={linea.id || index} onClick={() => setLineaSel(linea.id)}
              style={{ color: String(lineaSel) === String(linea.id) ? "#74002e" : "#fff", background: String(lineaSel) === String(linea.id) ? secundario : 'transparent', fontWeight: 600, padding: "8px 14px", fontSize: "14px", border: 'none', borderRadius: 25, cursor: 'pointer' }}>
              {linea.icono ? linea.icono + ' ' : ''}{nombreLinea(linea)}
            </button>
          ))}
          <a href="#visitanos" style={{ color: '#fff', fontWeight: 600, padding: "8px 14px", fontSize: "14px", textDecoration: 'none' }}>📍 Visítanos</a>
        </nav>
      </div>

      {/* ══ BANNER ══
          PC: cover (llena todo el ancho). Celular: contain (completo, sin recortar). */}
      <style>{`
        .lc-banner { display:block; width:100%; height:auto; max-height:340px; object-fit:cover; object-position:center; background:#fff; }
        @media (max-width:640px){
          .lc-banner { height:150px; object-fit:cover; }
        }
      `}</style>
      <section style={{ width: "100%", background: "#fff" }}>
        {cfg.hero_url ? (
          <img className="lc-banner" src={cfg.hero_url} alt={cfg.nombre_tienda || "La Casita del Ahorro"} />
        ) : (
          <div style={{ width: "100%", minHeight: "240px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 6%", textAlign: "center", background: `linear-gradient(120deg, ${primario}, #bd004e)` }}>
            <h1 style={{ color: "#fff", fontSize: "clamp(26px,4vw,44px)", fontWeight: 900, margin: 0 }}>{cfg.slogan || "Variedad, calidad y buenos precios"}</h1>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 20, background: "#fff", color: primario, padding: "12px 26px", borderRadius: "50px", fontWeight: 900, fontSize: "15px", textDecoration: "none" }}>📲 {whatsapp || "Contáctanos"}</a>
          </div>
        )}
      </section>

      {/* ══ COMPRA POR CATEGORÍAS (solo si hay 2+ líneas) ══ */}
      {hayCategorias && (
        <section style={{ padding: "25px 4%" }}>
          <h2 style={{ textAlign: "center", color: primario, fontSize: "25px", margin: "0 0 22px" }}>Compra por categorías</h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
            {categoriasActivas.map((linea, index) => (
              <div key={linea.id || index} onClick={() => { setLineaSel(linea.id); window.scrollTo({ top: 9999, behavior: 'smooth' }); }}
                style={{ background: "#fff0f5", borderRadius: "22px", padding: "20px 12px", flex: "1 1 130px", maxWidth: "180px", textAlign: "center", color: primario, fontWeight: 700, border: "1px solid #f9e0e9", cursor: 'pointer' }}>
                <div style={{ fontSize: "30px", marginBottom: "8px" }}>{linea.icono || "✦"}</div>
                {nombreLinea(linea)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══ BENEFICIOS ══ */}
      <style>{`
        .lc-benef { margin:0 4% 22px; padding:14px 18px; border:1px solid ${secundario}; border-radius:24px; background:#fffafd; display:flex; flex-wrap:wrap; justify-content:space-around; gap:14px; }
        .lc-benef-item { display:flex; align-items:center; gap:12px; flex:1 1 200px; }
        @media (max-width:640px){
          .lc-benef { flex-direction:column; gap:10px; padding:14px 16px; }
          .lc-benef-item { flex:1 1 auto; width:100%; }
        }
      `}</style>
      <section className="lc-benef">
        {[["🚚", "Tienda física en Caraz", "Visítanos y encuentra más variedad"], ["🏷️", "Precios accesibles", "Para tu hogar y tu familia"], ["🤝", "Se reciben consignaciones", ""]].map((item, index) => (
          <div key={index} className="lc-benef-item">
            <span style={{ color: primario, fontSize: "28px" }}>{item[0]}</span>
            <div><strong style={{ color: primario, fontSize: "14px" }}>{item[1]}</strong>{item[2] && <div style={{ fontSize: "12px", color: "#666" }}>{item[2]}</div>}</div>
          </div>
        ))}
      </section>

      {/* ══ DESTACADOS ══ */}
      {destacados.length > 0 && (
        <section style={{ padding: "0 4% 30px" }}>
          <h2 style={{ color: primario, fontSize: "26px", margin: "0 0 18px", fontStyle: "italic" }}>✦ Productos destacados</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", justifyContent: "center" }}>
            {destacados.map((p, i) => renderProducto(p, i))}
          </div>
        </section>
      )}

      {/* ══ TODOS LOS PRODUCTOS + FILTROS ══ */}
      <section style={{ padding: "0 4% 40px", background: "#fffafd" }}>
        <h2 style={{ color: primario, fontSize: "26px", fontStyle: "italic" }}>✦ Todos nuestros productos</h2>

        {/* Chips de línea */}
        {hayCategorias && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "9px", marginBottom: "14px" }}>
            <span onClick={() => setLineaSel('todas')} style={{ ...boton, padding: "9px 25px", background: lineaSel === 'todas' ? primario : '#fff0f5', color: lineaSel === 'todas' ? '#fff' : '#760035' }}>Todos</span>
            {categoriasActivas.map((linea, index) => (
              <span key={linea.id || index} onClick={() => setLineaSel(linea.id)}
                style={{ background: String(lineaSel) === String(linea.id) ? primario : "#fff0f5", color: String(lineaSel) === String(linea.id) ? '#fff' : "#760035", padding: "9px 20px", borderRadius: "25px", fontSize: "13px", cursor: 'pointer' }}>
                {linea.icono ? linea.icono + ' ' : ''}{nombreLinea(linea)}
              </span>
            ))}
          </div>
        )}

        {/* Fila de FILTROS (género / talla / color) — solo los que existen */}
        <div style={{ background: "#fff", border: "1px solid #f3dce5", borderRadius: 16, padding: "12px 14px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {opciones.generos.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#9a6a80", minWidth: 70 }}>PARA</span>
              {opciones.generos.map((g) => <span key={g} onClick={() => setFGenero(fGenero === g ? '' : g)} style={chipFiltro(fGenero === g)}>{g}</span>)}
            </div>
          )}
          {opciones.tallas.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#9a6a80", minWidth: 70 }}>TALLA</span>
              {opciones.tallas.map((t) => <span key={t} onClick={() => setFTalla(fTalla === t ? '' : t)} style={chipFiltro(fTalla === t)}>{t}</span>)}
            </div>
          )}
          {opciones.colores.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#9a6a80", minWidth: 70 }}>COLOR</span>
              {opciones.colores.map((c) => <span key={c} onClick={() => setFColor(fColor === c ? '' : c)} style={chipFiltro(fColor === c)}>{c}</span>)}
            </div>
          )}
          {hayFiltros && (
            <div><span onClick={limpiarFiltros} style={{ fontSize: 12, color: primario, cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>✕ Limpiar filtros</span></div>
          )}
        </div>

        <p style={{ fontSize: 13, color: "#999", margin: "0 0 14px" }}>{filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}</p>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "15px" }}>
          {filtrados.map((p, i) => renderProducto(p, i))}
        </div>
        {filtrados.length === 0 && <p style={{ textAlign: "center", padding: "35px", color: "#888" }}>No hay productos con ese filtro.</p>}
      </section>

      {/* ══ VISÍTANOS (mapa + horarios + contacto) ══ */}
      <section id="visitanos" style={{ padding: "40px 4%", background: "#fff" }}>
        <h2 style={{ textAlign: "center", color: primario, fontSize: "26px", margin: "0 0 24px", fontWeight: 900 }}>📍 Visítanos</h2>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "stretch" }}>
          <div style={{ flex: "1 1 320px", minHeight: 240 }}>
            {cfg.mapa_url
              ? <img src={cfg.mapa_url} alt="Cómo llegar" style={{ width: "100%", borderRadius: 18, border: "1px solid #f3dce5", display: "block" }} />
              : <div style={{ height: "100%", minHeight: 240, borderRadius: 18, border: "2px dashed #f0cede", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 14 }}>Mapa próximamente</div>}
          </div>
          <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff0f5", borderRadius: 18, padding: "20px 22px", border: "1px solid #f9e0e9" }}>
              <p style={{ margin: "0 0 10px", fontWeight: 900, color: primario, fontSize: 18 }}>🕒 Horarios de atención</p>
              <p style={{ margin: 0, color: "#5a4650", fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-line" }}>
                {cfg.horarios || "Miércoles, Sábados, Domingos y Feriados\n12:00 pm a 8:00 pm"}
              </p>
            </div>
            <div style={{ background: "#fff0f5", borderRadius: 18, padding: "20px 22px", border: "1px solid #f9e0e9" }}>
              <p style={{ margin: "0 0 10px", fontWeight: 900, color: primario, fontSize: 18 }}>📞 Contáctanos</p>
              {cfg.direccion && <p style={{ margin: "0 0 10px", color: "#5a4650", fontSize: 14 }}>📍 {cfg.direccion}</p>}
              {whatsapp && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#25D366", color: "#fff", padding: "11px 22px", borderRadius: 50, fontWeight: 800, textDecoration: "none", fontSize: 15 }}>
                  📲 {whatsapp}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background: `linear-gradient(100deg, ${primario}, #b90050)`, borderTop: `7px solid ${secundario}`, color: "#fff", padding: "25px 4%", display: "flex", alignItems: "center", justifyContent: "space-around", gap: "18px", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: "20px" }}>{(cfg.nombre_tienda || "LA CASITA DEL AHORRO").toUpperCase()}</div>
        <div style={{ fontStyle: "italic", fontSize: "17px" }}>{cfg.slogan || "Aquí todo es barato"}</div>
        {whatsapp && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#fff", color: primario, textDecoration: "none", padding: "12px 22px", borderRadius: "30px", fontSize: "20px", fontWeight: 900 }}>☎ WhatsApp {whatsapp}</a>}
        <div style={{ background: secundario, color: "#74002e", padding: "10px 22px", borderRadius: "30px", fontWeight: 900 }}>📍 {cfg.direccion || "Caraz"}</div>
      </footer>
      {onIntranet && <p onClick={onIntranet} style={{ textAlign: 'center', fontSize: 11, color: '#bbb', padding: '10px', cursor: 'pointer', background: '#fff' }}>· intranet ·</p>}

      {/* ══ POPUP DE PRODUCTO (con flechas ‹ › y responsive) ══ */}
      {prodModal && (() => {
        const idx = filtrados.findIndex((p) => p.id === prodModal.id);
        const total = filtrados.length;
        return (
          <div onClick={() => setProdModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
            <style>{`
              .lc-modal { background:#fff; border-radius:20px; max-width:780px; width:100%; max-height:92vh; overflow:auto; display:flex; flex-wrap:wrap; position:relative; }
              .lc-modal-img { flex:1 1 300px; background:#fffafa; display:flex; align-items:center; justify-content:center; min-height:300px; padding:16px; position:relative; }
              .lc-modal-img img { max-width:100%; max-height:400px; object-fit:contain; border-radius:12px; }
              .lc-modal-info { flex:1 1 280px; padding:22px; display:flex; flex-direction:column; gap:11px; }
              .lc-nav { position:absolute; top:50%; transform:translateY(-50%); width:42px; height:42px; border-radius:50%; border:none; background:rgba(255,255,255,.95); box-shadow:0 2px 10px rgba(0,0,0,.2); font-size:22px; cursor:pointer; z-index:5; display:flex; align-items:center; justify-content:center; color:#74002e; }
              @media (max-width:640px){
                .lc-modal-img { min-height:200px; max-height:38vh; }
                .lc-modal-img img { max-height:36vh; }
                .lc-modal-info { padding:16px; }
                .lc-nav { width:36px; height:36px; font-size:18px; }
              }
            `}</style>
            <div onClick={(e) => e.stopPropagation()} className="lc-modal">
              {/* Flechas */}
              {total > 1 && (
                <>
                  <button className="lc-nav" style={{ left: 8 }} onClick={() => navegarModal(-1)}>‹</button>
                  <button className="lc-nav" style={{ right: 8 }} onClick={() => navegarModal(1)}>›</button>
                </>
              )}
              <div className="lc-modal-img">
                {imagenProducto(prodModal)
                  ? <img src={imagenProducto(prodModal)} alt={nombreProducto(prodModal)} />
                  : <span style={{ fontSize: 70, opacity: .3 }}>📦</span>}
                {prodModal.codigo && <span style={{ position: "absolute", top: 12, left: 12, background: "#fff", color: "#999", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 14 }}>#{prodModal.codigo}</span>}
              </div>
              <div className="lc-modal-info">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#34303a", lineHeight: 1.2 }}>{nombreProducto(prodModal)}</h3>
                  <button onClick={() => setProdModal(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#999", lineHeight: 1 }}>✕</button>
                </div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: primario }}>{formatPrecio(precioProducto(prodModal))}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {generoDe(prodModal) && <span style={pill()}>👤 {generoDe(prodModal)}</span>}
                  {tallaDe(prodModal) && <span style={pill()}>📏 Talla {tallaDe(prodModal)}</span>}
                  {prodModal.color && <span style={pill()}>🎨 {prodModal.color}</span>}
                  {prodModal.categorias?.nombre && <span style={pill()}>{prodModal.categorias.nombre}</span>}
                </div>
                {prodModal.observacion && <p style={{ margin: 0, fontSize: 14, color: "#777", lineHeight: 1.6 }}>{prodModal.observacion}</p>}
                <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap", paddingTop: 8 }}>
                  <button onClick={() => { onAgregar?.(prodModal); setProdModal(null); }} style={{ ...boton, flex: "1 1 150px", padding: "13px", fontSize: 15 }}>🛒 Agregar</button>
                  <a href={waProducto(prodModal)} target="_blank" rel="noreferrer" style={{ flex: "1 1 120px", textAlign: "center", background: "#25D366", color: "#fff", padding: "13px", borderRadius: 25, fontWeight: 800, textDecoration: "none", fontSize: 15 }}>📲 Consultar</a>
                </div>
                {total > 1 && idx >= 0 && <p style={{ textAlign: "center", fontSize: 12, color: "#bbb", margin: "4px 0 0" }}>{idx + 1} de {total} · usa ‹ › para navegar</p>}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  function pill() {
    return { background: "#fff0f5", color: "#8a3a5a", padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, border: "1px solid #f9e0e9" };
  }
}
