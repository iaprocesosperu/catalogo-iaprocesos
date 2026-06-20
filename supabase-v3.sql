-- ═══════════════════════════════════════════
-- IA PROCESOS — Catálogo V3 FINAL
-- ═══════════════════════════════════════════
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS origenes CASCADE;
DROP TABLE IF EXISTS colores CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS lineas CASCADE;
DROP TABLE IF EXISTS empresas CASCADE;

CREATE TABLE empresas (
  id SERIAL PRIMARY KEY, nombre VARCHAR(200) NOT NULL, ruc VARCHAR(11),
  access_key VARCHAR(50) UNIQUE NOT NULL, activo BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE lineas (
  id SERIAL PRIMARY KEY, empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  nombre VARCHAR(100) NOT NULL, activo BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY, empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  linea_id INTEGER REFERENCES lineas(id) NOT NULL, nombre VARCHAR(100) NOT NULL,
  tallas JSONB DEFAULT '[]', atributos JSONB DEFAULT '[]',
  activo BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE origenes (
  id SERIAL PRIMARY KEY, empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  linea_id INTEGER REFERENCES lineas(id) NOT NULL, nombre VARCHAR(100) NOT NULL,
  inversion DECIMAL(12,2), precio_costo_defecto DECIMAL(10,2), precio_venta_defecto DECIMAL(10,2),
  fecha DATE, observaciones TEXT, activo BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE colores (
  id SERIAL PRIMARY KEY, empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  nombre VARCHAR(50) NOT NULL, activo BOOLEAN DEFAULT true);

CREATE TABLE clientes (
  id SERIAL PRIMARY KEY, empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  codigo VARCHAR(20), nombre VARCHAR(200) NOT NULL, telefono VARCHAR(20),
  direccion VARCHAR(300), preferencias TEXT, acepta_publicidad BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE productos (
  id SERIAL PRIMARY KEY, empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  linea_id INTEGER REFERENCES lineas(id), categoria_id INTEGER REFERENCES categorias(id),
  origen_id INTEGER REFERENCES origenes(id), codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(200) NOT NULL, precio_costo DECIMAL(10,2) DEFAULT 0,
  precio_venta DECIMAL(10,2) DEFAULT 0, cantidad INTEGER DEFAULT 1,
  color VARCHAR(50), atributos JSONB DEFAULT '{}', observacion TEXT,
  foto_url TEXT, descripcion_ia TEXT, activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, codigo));

CREATE TABLE ventas (
  id SERIAL PRIMARY KEY, empresa_id INTEGER REFERENCES empresas(id) NOT NULL,
  producto_id INTEGER REFERENCES productos(id), cliente_id INTEGER REFERENCES clientes(id),
  codigo_producto VARCHAR(20), nombre_producto VARCHAR(200),
  precio_costo DECIMAL(10,2) DEFAULT 0, precio_venta_original DECIMAL(10,2) NOT NULL,
  precio_venta_real DECIMAL(10,2) NOT NULL, cantidad INTEGER DEFAULT 1,
  total DECIMAL(10,2) NOT NULL, metodo_pago VARCHAR(30) DEFAULT 'Efectivo',
  tipo_entrega VARCHAR(20) DEFAULT 'En tienda', foto_yape TEXT,
  nota TEXT, created_at TIMESTAMPTZ DEFAULT now());

CREATE INDEX idx_prod_emp ON productos(empresa_id);
CREATE INDEX idx_prod_cod ON productos(empresa_id,codigo);
CREATE INDEX idx_ven_emp ON ventas(empresa_id);
CREATE INDEX idx_ven_fecha ON ventas(created_at);
CREATE INDEX idx_cli_emp ON clientes(empresa_id);
CREATE INDEX idx_cat_lin ON categorias(linea_id);
CREATE INDEX idx_ori_lin ON origenes(linea_id);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE origenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p1" ON empresas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p2" ON lineas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p3" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p4" ON origenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p5" ON colores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p6" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p7" ON productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "p8" ON ventas FOR ALL USING (true) WITH CHECK (true);

-- SEED
INSERT INTO empresas (nombre, access_key) VALUES ('La Casita del Ahorro','CASITA2026'),('Amy Variedades','AMY2026');
INSERT INTO lineas (empresa_id, nombre) VALUES (1,'Ropa'),(1,'Gatos'),(1,'Cocina'),(2,'Ropa'),(2,'Gatos');
INSERT INTO categorias (empresa_id,linea_id,nombre,tallas) VALUES
  (1,1,'Blusas','["XS","S","M","L","XL","XXL"]'),(1,1,'Pantalones','["28","30","32","34","36","38"]'),
  (1,1,'Vestidos','["S","M","L","XL"]'),(1,1,'Faldas','["S","M","L"]'),
  (1,1,'Camisas','["S","M","L","XL"]'),(1,1,'Casacas','["S","M","L","XL"]'),
  (1,1,'Zapatos','["35","36","37","38","39","40","41","42"]'),
  (1,1,'Carteras','[]'),(1,1,'Sombreros','["S","M","L"]'),
  (1,1,'Accesorios','[]'),(1,1,'Deportivo','["S","M","L","XL"]');
INSERT INTO categorias (empresa_id,linea_id,nombre,tallas,atributos) VALUES
  (1,2,'Arena','[]','[{"key":"tipo","label":"Tipo","tipo":"select","opciones":["Granulada","Bolita","Crystal"]},{"key":"peso","label":"Peso","tipo":"select","opciones":["5kg","10kg","25kg"]}]'),
  (1,2,'Comida','[]','[{"key":"peso","label":"Peso","tipo":"select","opciones":["1kg","3kg","10kg"]},{"key":"marca","label":"Marca","tipo":"text"}]'),
  (1,2,'Juguetes','[]','[]'),(1,2,'Accesorios','[]','[]');
INSERT INTO categorias (empresa_id,linea_id,nombre,tallas) VALUES
  (2,4,'Blusas','["XS","S","M","L","XL","XXL"]'),(2,4,'Pantalones','["28","30","32","34","36","38"]'),
  (2,4,'Vestidos','["S","M","L","XL"]'),(2,4,'Zapatos','["35","36","37","38","39","40","41","42"]'),
  (2,4,'Carteras','[]'),(2,4,'Accesorios','[]');
INSERT INTO origenes (empresa_id,linea_id,nombre,precio_costo_defecto,precio_venta_defecto) VALUES
  (1,1,'Fardo 1 Mujeres',5,15),(1,1,'Fardo 2 Premium',10,25),(1,2,'Entrega Mascotas 1',8,20);
INSERT INTO colores (empresa_id,nombre) VALUES
  (1,'Negro'),(1,'Blanco'),(1,'Rojo'),(1,'Azul'),(1,'Verde'),(1,'Amarillo'),
  (1,'Rosado'),(1,'Morado'),(1,'Naranja'),(1,'Gris'),(1,'Marrón'),(1,'Beige'),
  (1,'Celeste'),(1,'Turquesa'),(1,'Coral'),(1,'Crema'),(1,'Dorado'),(1,'Plateado'),(1,'Multicolor'),
  (2,'Negro'),(2,'Blanco'),(2,'Rojo'),(2,'Azul'),(2,'Verde'),(2,'Amarillo'),
  (2,'Rosado'),(2,'Morado'),(2,'Gris'),(2,'Marrón'),(2,'Beige'),(2,'Multicolor');
