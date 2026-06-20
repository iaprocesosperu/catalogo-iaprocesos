-- ═══════════════════════════════════════════
-- IA PROCESOS — Catálogo de Productos
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════

-- 1. Tabla de Categorías (mantenible)
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Orígenes (mantenible)
CREATE TABLE origenes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Productos
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  precio DECIMAL(10,2) DEFAULT 0,
  color VARCHAR(50),
  talla VARCHAR(10),
  genero VARCHAR(10) DEFAULT 'Unisex',
  categoria_id INTEGER REFERENCES categorias(id),
  origen_id INTEGER REFERENCES origenes(id),
  observacion TEXT,
  foto_url TEXT,
  descripcion_ia TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_origen ON productos(origen_id);

-- 4. Tabla de Ventas (simple por ahora)
CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER REFERENCES productos(id),
  codigo_producto VARCHAR(20),
  nombre_producto VARCHAR(200),
  precio_venta DECIMAL(10,2) NOT NULL,
  cantidad INTEGER DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(30) DEFAULT 'Efectivo',
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Seed categorías iniciales
INSERT INTO categorias (nombre) VALUES
  ('Blusas'),
  ('Pantalones'),
  ('Vestidos'),
  ('Faldas'),
  ('Camisas'),
  ('Casacas'),
  ('Calzado'),
  ('Accesorios'),
  ('Ropa Interior'),
  ('Deportivo');

-- 6. Seed orígenes iniciales
INSERT INTO origenes (nombre) VALUES
  ('Fardo 1'),
  ('Fardo 2'),
  ('Entrega 1'),
  ('Entrega 2');

-- 7. Habilitar Row Level Security (RLS) - abierto por ahora
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- Policies abiertas (para MVP, luego se restringe)
CREATE POLICY "Acceso público categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público origenes" ON origenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público productos" ON productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso público ventas" ON ventas FOR ALL USING (true) WITH CHECK (true);

-- 8. Función para búsqueda de texto en descripción IA
CREATE OR REPLACE FUNCTION buscar_por_descripcion(terminos TEXT)
RETURNS SETOF productos AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM productos
  WHERE activo = true
  AND (
    descripcion_ia ILIKE '%' || terminos || '%'
    OR nombre ILIKE '%' || terminos || '%'
    OR color ILIKE '%' || terminos || '%'
    OR observacion ILIKE '%' || terminos || '%'
  )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;
