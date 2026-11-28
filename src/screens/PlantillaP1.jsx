import { useState, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════
// PLANTILLA PERSONALIZADO 1 — "La Casita del Ahorro" (diseño rosa)
// Diseño base de ChatGPT. Recibe TODO por props desde PublicCatalogPage:
//   config, lineas, productos  → datos reales de Supabase
//   onAgregar(producto)        → añade al carrito (lo maneja el padre)
//   onIntranet                 → vuelve a la administración
//   carrito, totalItems, totalPrecio, onVerCarrito → carrito en vivo
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

  const primario = cfg.color_primario || "#e5005b";
  const secundario = cfg.color_secundario || "#ffcf00";
  const whatsapp = cfg.whatsapp || "";

  const whatsappUrl = String(whatsapp).startsWith("http")
    ? whatsapp
    : `https://wa.me/51${String(whatsapp).replace(/\D/g, "")}`;

  const nombreLinea = (item) =>
    item.nombre || item.nombre_linea || item.descripcion || item.titulo || "";

  const nombreProducto = (item) =>
    item.nombre || item.nombre_producto || item.descripcion || item.titulo || "Producto";

  const imagenProducto = (item) =>
    item.foto_url || item.imagen_url || item.url_imagen || item.image_url || "";

  const precioProducto = (item) =>
    item.precio_venta ?? item.precio ?? item.precio_publico;

  const formatPrecio = (precio) =>
    precio !== undefined && precio !== null && precio !== ""
      ? `S/ ${Number(precio).toFixed(2)}`
      : "";

  const sombra = "0 3px 12px rgba(80,30,50,0.09)";

  const card = {
    background: "#ffffff",
    border: "1px solid #f3dce5",
    borderRadius: "18px",
    overflow: "hidden",
    boxShadow: sombra
  };

  const boton = {
    background: primario,
    color: "#ffffff",
    border: "none",
    borderRadius: "25px",
    padding: "10px 20px",
    fontWeight: 700,
    cursor: "pointer"
  };

  const categoriasActivas = categorias.filter(Boolean);

  // Filtro por línea seleccionada + búsqueda
  const filtrados = useMemo(() => {
    return articulos.filter((p) => {
      if (lineaSel !== 'todas' && String(p.linea_id) !== String(lineaSel)) return false;
      if (busqueda) {
        const t = busqueda.toLowerCase();
        const n = nombreProducto(p).toLowerCase();
        const c = (p.codigo || '').toLowerCase();
        if (!n.includes(t) && !c.includes(t)) return false;
      }
      return true;
    });
  }, [articulos, lineaSel, busqueda]);

  const enCarrito = (p) => carrito.find((i) => i.id === p.id);

  const renderProducto = (producto, index) => {
    const imagen = imagenProducto(producto);
    const precio = precioProducto(producto);
    const nombre = nombreProducto(producto);
    const ec = enCarrito(producto);

    return (
      <div
        key={producto.id || producto.codigo || index}
        style={{
          ...card,
          width: "100%",
          maxWidth: "235px",
          minWidth: "155px",
          flex: "1 1 180px",
          display: "flex",
          flexDirection: "column",
          border: ec ? `2px solid ${primario}` : card.border
        }}
      >
        <div style={{
          height: "190px",
          background: "#fffafa",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px"
        }}>
          {imagen
            ? <img src={imagen} alt={nombre} loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
            : <span style={{ fontSize: 44, opacity: .3 }}>📦</span>}
          {producto.codigo && (
            <span style={{ position: 'absolute', top: 8, right: 8, background: '#fff', color: '#999', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>#{producto.codigo}</span>
          )}
          {ec && (
            <span style={{ position: 'absolute', top: 8, left: 8, background: primario, color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 12 }}>×{ec.cantidad}</span>
          )}
        </div>

        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "9px", flex: 1 }}>
          <div style={{ color: "#34303a", fontWeight: 700, fontSize: "14px", minHeight: "36px" }}>
            {nombre}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "5px", marginTop: "auto", flexWrap: "wrap" }}>
            {precio !== undefined && precio !== null && precio !== "" && (
              <span style={{ background: secundario, color: "#74002e", padding: "6px 12px", borderRadius: "20px", fontWeight: 800, fontSize: "15px" }}>
                {formatPrecio(precio)}
              </span>
            )}
            <button onClick={() => onAgregar?.(producto)} style={{ ...boton, padding: "7px 13px", fontSize: "12px" }}>
              🛒 Agregar
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fff", color: "#34303a", fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" }}>

      {/* CABECERA */}
      <header style={{ background: "#ffffff", padding: "12px 4%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {cfg.logo_url
            ? <img src={cfg.logo_url} alt={cfg.nombre_tienda || "La Casita del Ahorro"} style={{ width: "220px", maxWidth: "100%", height: "55px", objectFit: "contain" }} />
            : <strong style={{ color: primario, fontSize: "22px" }}>{cfg.nombre_tienda || "LA CASITA DEL AHORRO"}</strong>}
        </div>

        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} type="search" placeholder="⌕  Buscar productos..."
          style={{ flex: "1 1 200px", maxWidth: "360px", padding: "12px 18px", border: "1px solid #e6cbd7", borderRadius: "25px", fontSize: "14px", outlineColor: primario }} />

        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: primario }}>
          <button onClick={onVerCarrito} style={{ background: secundario, border: "none", color: "#74002e", cursor: "pointer", fontWeight: 800, padding: "8px 16px", borderRadius: 25 }}>
            🛒 {totalItems > 0 ? `${totalItems} · S/ ${Number(totalPrecio).toFixed(2)}` : 'Carrito'}
          </button>
        </div>
      </header>

      {/* NAVEGACIÓN */}
      <nav style={{ background: `linear-gradient(90deg, ${primario}, #bd004e)`, padding: "12px 4%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", flexWrap: "wrap", borderRadius: "25px 25px 0 0" }}>
        <button onClick={() => setLineaSel('todas')}
          style={{ background: lineaSel === 'todas' ? secundario : 'transparent', color: lineaSel === 'todas' ? "#74002e" : '#fff', padding: "9px 25px", borderRadius: "25px", fontWeight: 800, border: 'none', cursor: 'pointer' }}>
          Inicio
        </button>
        {categoriasActivas.map((linea, index) => (
          <button key={linea.id || index} onClick={() => setLineaSel(linea.id)}
            style={{ color: String(lineaSel) === String(linea.id) ? "#74002e" : "#fff", background: String(lineaSel) === String(linea.id) ? secundario : 'transparent', fontWeight: 600, padding: "8px 14px", fontSize: "14px", border: 'none', borderRadius: 25, cursor: 'pointer' }}>
            {nombreLinea(linea)}
          </button>
        ))}
      </nav>

      {/* BANNER PRINCIPAL
          La imagen se muestra COMPLETA (contain) y centrada, nunca estirada ni recortada.
          Se limita el ancho para que en pantallas grandes no se gigantice. */}
      <section style={{ width: "100%", background: "#fff5f8", position: "relative", display: "flex", justifyContent: "center" }}>
        {cfg.hero_url ? (
          <img src={cfg.hero_url} alt={cfg.slogan || "La Casita del Ahorro"}
            style={{ display: "block", width: "100%", maxWidth: "1200px", height: "auto", maxHeight: "360px", objectFit: "contain" }} />
        ) : (
          <div style={{ width: "100%", minHeight: "260px", display: "flex", alignItems: "center", padding: "35px 6%", background: `linear-gradient(120deg, #fff7fa, #ffe4ee)` }}>
            <h1 style={{ color: primario, fontSize: "clamp(28px, 4vw, 48px)" }}>
              {cfg.slogan || "Variedad, calidad y buenos precios"}
            </h1>
          </div>
        )}
      </section>

      {/* CATEGORÍAS */}
      {categoriasActivas.length > 0 && (
        <section style={{ padding: "25px 4%" }}>
          <h2 style={{ textAlign: "center", color: primario, fontSize: "25px", margin: "0 0 22px" }}>
            Compra por categorías
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
            {categoriasActivas.map((linea, index) => (
              <div key={linea.id || index} onClick={() => { setLineaSel(linea.id); window.scrollTo({ top: 9999, behavior: 'smooth' }); }}
                style={{ background: "#fff0f5", borderRadius: "22px", padding: "20px 12px", flex: "1 1 130px", maxWidth: "180px", textAlign: "center", color: primario, fontWeight: 700, border: "1px solid #f9e0e9", cursor: 'pointer' }}>
                <div style={{ fontSize: "30px", marginBottom: "8px" }}>{linea.icono || linea.emoji || "✦"}</div>
                {nombreLinea(linea)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BENEFICIOS */}
      <section style={{ margin: "0 4% 25px", padding: "15px", border: `1px solid ${secundario}`, borderRadius: "35px", background: "#fffafd", display: "flex", flexWrap: "wrap", justifyContent: "space-around", gap: "15px" }}>
        {[
          ["🚚", "Tienda física en Caraz", "Visítanos y encuentra más variedad"],
          ["🏷️", "Precios accesibles", "Para tu hogar y tu familia"],
          ["🤝", "Se reciben consignaciones", "Dale un nuevo uso a tu ropa"]
        ].map((item, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 200px" }}>
            <span style={{ color: primario, fontSize: "30px" }}>{item[0]}</span>
            <div>
              <strong style={{ color: primario, fontSize: "14px" }}>{item[1]}</strong>
              <div style={{ fontSize: "12px", color: "#666" }}>{item[2]}</div>
            </div>
          </div>
        ))}
      </section>

      {/* PRODUCTOS DESTACADOS */}
      {articulos.length > 0 && (
        <section style={{ padding: "0 4% 30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "18px" }}>
            <h2 style={{ color: primario, fontSize: "26px", margin: 0, fontStyle: "italic" }}>✦ Productos destacados</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", justifyContent: "center" }}>
            {articulos.slice(0, 4).map((producto, index) => renderProducto(producto, index))}
          </div>
        </section>
      )}

      {/* TODOS LOS PRODUCTOS */}
      <section style={{ padding: "0 4% 40px", background: "#fffafd" }}>
        <h2 style={{ color: primario, fontSize: "26px", fontStyle: "italic" }}>✦ Todos nuestros productos</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "9px", marginBottom: "20px" }}>
          <span onClick={() => setLineaSel('todas')} style={{ ...boton, padding: "9px 25px", background: lineaSel === 'todas' ? primario : '#fff0f5', color: lineaSel === 'todas' ? '#fff' : '#760035' }}>Todos</span>
          {categoriasActivas.map((linea, index) => (
            <span key={linea.id || index} onClick={() => setLineaSel(linea.id)}
              style={{ background: String(lineaSel) === String(linea.id) ? primario : "#fff0f5", color: String(lineaSel) === String(linea.id) ? '#fff' : "#760035", padding: "9px 20px", borderRadius: "25px", fontSize: "13px", cursor: 'pointer' }}>
              {nombreLinea(linea)}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "15px" }}>
          {filtrados.map((producto, index) => renderProducto(producto, index))}
        </div>

        {filtrados.length === 0 && (
          <p style={{ textAlign: "center", padding: "35px", color: "#888" }}>
            No hay productos con ese filtro.
          </p>
        )}
      </section>

      {/* FOOTER */}
      <footer style={{ background: `linear-gradient(100deg, ${primario}, #b90050)`, borderTop: `7px solid ${secundario}`, color: "#fff", padding: "25px 4%", display: "flex", alignItems: "center", justifyContent: "space-around", gap: "18px", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 900, fontSize: "20px" }}>{(cfg.nombre_tienda || "LA CASITA DEL AHORRO").toUpperCase()}</div>
        <div style={{ fontStyle: "italic", fontSize: "17px" }}>{cfg.slogan || "Aquí todo es barato"}</div>
        {whatsapp && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
            style={{ background: "#fff", color: primario, textDecoration: "none", padding: "12px 22px", borderRadius: "30px", fontSize: "20px", fontWeight: 900 }}>
            ☎ WhatsApp {whatsapp}
          </a>
        )}
        <div style={{ background: secundario, color: "#74002e", padding: "10px 22px", borderRadius: "30px", fontWeight: 900 }}>
          📍 {cfg.direccion || "Caraz"}
        </div>
      </footer>
      {onIntranet && (
        <p onClick={onIntranet} style={{ textAlign: 'center', fontSize: 11, color: '#bbb', padding: '10px', cursor: 'pointer', background: '#fff' }}>· intranet ·</p>
      )}
    </div>
  );
}
