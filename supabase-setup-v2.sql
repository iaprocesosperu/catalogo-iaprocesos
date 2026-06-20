-- ═══════════════════════════════════════════
-- IA PROCESOS — Catálogo V2 Completo
-- Ejecutar en Supabase SQL Editor
-- PRIMERO: borrar tablas anteriores si existen
-- ═══════════════════════════════════════════

DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS origenes CASCADE;
DROP TABLE IF EXISTS colores CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS lineas CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;

-- 1. Empresas
CREATE TABLE empresas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  ruc VARCHAR(11),
  access_key VARCHAR(50) UNIQUE NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Líneas
CREATE TABLE lineas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Categorías (por línea, con atributos dinámicos)
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  linea_id INTEGER REFERENCES lineas(id) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tallas JSONB DEFAULT '[]',
  atributos JSONB DEFAULT '[]',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Orígenes (por empresa Y por línea)
CREATE TABLE origenes (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  linea_id INTEGER REFERENCES lineas(id) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  inversion DECIMAL(12,2),
  precio_defecto DECIMAL(10,2),
  fecha DATE,
  observaciones TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Colores (por empresa)
CREATE TABLE colores (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  activo BOOLEAN DEFAULT true
);

-- 6. Clientes
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  codigo VARCHAR(20),
  nombre VARCHAR(200) NOT NULL,
  telefono VARCHAR(20),
  direccion VARCHAR(300),
  preferencias TEXT,
  acepta_publicidad BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Productos
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  linea_id INTEGER REFERENCES lineas(id),
  categoria_id INTEGER REFERENCES categorias(id),
  origen_id INTEGER REFERENCES origenes(id),
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  precio DECIMAL(10,2) DEFAULT 0,
  cantidad INTEGER DEFAULT 1,
  color VARCHAR(50),
  atributos JSONB DEFAULT '{}',
  observacion TEXT,
  foto_url TEXT,
  descripcion_ia TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Ventas
CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  producto_id INTEGER REFERENCES productos(id),
  cliente_id INTEGER REFERENCES clientes(id),
  codigo_producto VARCHAR(20),
  nombre_producto VARCHAR(200),
  precio_original DECIMAL(10,2) NOT NULL,
  precio_venta DECIMAL(10,2) NOT NULL,
  cantidad INTEGER DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(30) DEFAULT 'Efectivo',
  tipo_entrega VARCHAR(20) DEFAULT 'En tienda',
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_productos_empresa ON productos(empresa_id);
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_linea ON productos(linea_id);
CREATE INDEX idx_ventas_empresa ON ventas(empresa_id);
CREATE INDEX idx_ventas_fecha ON ventas(created_at);
CREATE INDEX idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX idx_categorias_linea ON categorias(linea_id);
CREATE INDEX idx_origenes_linea ON origenes(linea_id);

-- RLS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_empresas" ON empresas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_lineas" ON lineas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_origenes" ON origenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_colores" ON colores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_productos" ON productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_ventas" ON ventas FOR ALL USING (true) WITH CHECK (true);

-- ═══ SEED DATA ═══

-- Empresas
INSERT INTO empresas (nombre, access_key) VALUES
  ('La Casita del Ahorro', 'CASITA2026'),
  ('Amy Variedades', 'AMY2026');

-- Líneas para empresa 1
INSERT INTO lineas (empresa_id, nombre) VALUES
  (1, 'Ropa'), (1, 'Gatos'), (1, 'Cocina');
-- Líneas para empresa 2
INSERT INTO lineas (empresa_id, nombre) VALUES
  (2, 'Ropa'), (2, 'Gatos');

-- Categorías Ropa empresa 1 (linea_id=1)
INSERT INTO categorias (empresa_id, linea_id, nombre, tallas) VALUES
  (1, 1, 'Blusas', '["XS","S","M","L","XL","XXL"]'),
  (1, 1, 'Pantalones', '["28","30","32","34","36","38"]'),
  (1, 1, 'Vestidos', '["S","M","L","XL"]'),
  (1, 1, 'Faldas', '["S","M","L"]'),
  (1, 1, 'Camisas', '["S","M","L","XL"]'),
  (1, 1, 'Casacas', '["S","M","L","XL"]'),
  (1, 1, 'Zapatos', '["35","36","37","38","39","40","41","42"]'),
  (1, 1, 'Carteras', '[]'),
  (1, 1, 'Sombreros', '["S","M","L"]'),
  (1, 1, 'Accesorios', '[]'),
  (1, 1, 'Deportivo', '["S","M","L","XL"]');

-- Categorías Gatos empresa 1 (linea_id=2)
INSERT INTO categorias (empresa_id, linea_id, nombre, tallas, atributos) VALUES
  (1, 2, 'Arena', '[]', '[{"key":"tipo","label":"Tipo","tipo":"select","opciones":["Granulada","Bolita","Crystal"]},{"key":"peso","label":"Peso","tipo":"select","opciones":["5kg","10kg","25kg"]}]'),
  (1, 2, 'Comida', '[]', '[{"key":"peso","label":"Peso","tipo":"select","opciones":["1kg","3kg","10kg"]},{"key":"marca","label":"Marca","tipo":"text"}]'),
  (1, 2, 'Juguetes', '[]', '[]'),
  (1, 2, 'Accesorios', '[]', '[]');

-- Categorías Ropa empresa 2 (linea_id=4)
INSERT INTO categorias (empresa_id, linea_id, nombre, tallas) VALUES
  (2, 4, 'Blusas', '["XS","S","M","L","XL","XXL"]'),
  (2, 4, 'Pantalones', '["28","30","32","34","36","38"]'),
  (2, 4, 'Vestidos', '["S","M","L","XL"]'),
  (2, 4, 'Zapatos', '["35","36","37","38","39","40","41","42"]'),
  (2, 4, 'Carteras', '[]'),
  (2, 4, 'Accesorios', '[]');

-- Orígenes empresa 1
INSERT INTO origenes (empresa_id, linea_id, nombre, precio_defecto) VALUES
  (1, 1, 'Fardo 1 Mujeres', 15),
  (1, 1, 'Fardo 2 Premium', 25),
  (1, 2, 'Entrega Mascotas 1', 10);

-- Colores empresa 1
INSERT INTO colores (empresa_id, nombre) VALUES
  (1,'Negro'),(1,'Blanco'),(1,'Rojo'),(1,'Azul'),(1,'Verde'),(1,'Amarillo'),
  (1,'Rosado'),(1,'Morado'),(1,'Naranja'),(1,'Gris'),(1,'Marrón'),(1,'Beige'),
  (1,'Celeste'),(1,'Turquesa'),(1,'Coral'),(1,'Crema'),(1,'Dorado'),(1,'Plateado'),
  (1,'Multicolor');
-- Colores empresa 2
INSERT INTO colores (empresa_id, nombre) VALUES
  (2,'Negro'),(2,'Blanco'),(2,'Rojo'),(2,'Azul'),(2,'Verde'),(2,'Amarillo'),
  (2,'Rosado'),(2,'Morado'),(2,'Naranja'),(2,'Gris'),(2,'Marrón'),(2,'Beige'),
  (2,'Celeste'),(2,'Multicolor');
