# 🚀 Setup — Catálogo IA Procesos
# De cero a funcionando en 2 celulares: ~20 minutos

---

## PASO 1: Crear proyecto en Supabase (5 min)

1. Ve a https://supabase.com → Sign up (gratis con GitHub)
2. Click "New Project"
   - Nombre: `iaprocesos-catalogo`
   - Password de BD: genera uno y GUÁRDALO
   - Región: South America (São Paulo)
   - Click "Create new project"
3. Espera ~2 minutos que se cree

## PASO 2: Crear las tablas (2 min)

1. En Supabase, ve al menú izquierdo → **SQL Editor**
2. Click "New query"
3. Copia y pega TODO el contenido del archivo `supabase-setup.sql`
4. Click **Run** (botón verde)
5. Debe decir "Success" — tablas y datos iniciales creados

## PASO 3: Crear bucket para fotos (1 min)

1. En Supabase, menú izquierdo → **Storage**
2. Click "New bucket"
   - Nombre: `productos`
   - ✅ Marca "Public bucket" (para que las fotos se vean)
   - Click "Create bucket"
3. Click en el bucket `productos` → **Policies** → **New Policy**
   - Selecciona "For full customization"
   - Policy name: `Acceso público`
   - Allowed operations: SELECT, INSERT, UPDATE, DELETE (todas)
   - Target roles: selecciona `anon`
   - En USING expression: `true`
   - En WITH CHECK expression: `true`
   - Click "Review" → "Save policy"

## PASO 4: Obtener las claves de Supabase (1 min)

1. En Supabase → **Settings** (engranaje abajo) → **API**
2. Copia estos 2 valores (los vas a necesitar):
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public key**: `eyJhbGciOi...` (la larga)

## PASO 5: Configurar el proyecto en tu PC (5 min)

```bash
# Descomprime el archivo catalogo-iaprocesos.tar.gz
# Entra a la carpeta
cd catalogo-iaprocesos

# Crea el archivo .env con tus claves de Supabase
# En Windows: usa Notepad o VS Code
```

Crea un archivo `.env` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOi...tu-clave-anon...
```

```bash
# Instala dependencias
npm install

# Ejecuta en local para probar
npm run dev

# Abre en el navegador: http://localhost:5173
```

## PASO 6: Desplegar en Vercel (5 min)

1. Sube el proyecto a GitHub:
```bash
git init
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo "dist/" >> .gitignore
git add .
git commit -m "Catálogo IA Procesos"
git remote add origin https://github.com/TU_USUARIO/catalogo-iaprocesos.git
git push -u origin main
```

2. Ve a https://vercel.com → Sign up con GitHub
3. "Import Project" → Selecciona `catalogo-iaprocesos`
4. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_KEY` = tu clave anon de Supabase
5. Click "Deploy"
6. En ~1 minuto tienes tu URL: `https://catalogo-iaprocesos.vercel.app`

## PASO 7: Configurar búsqueda por foto con IA (opcional)

Para que funcione la búsqueda por foto (tomar foto → buscar producto similar):

1. Ve a https://console.anthropic.com → crea cuenta
2. Genera un API key
3. En Vercel → Settings → Environment Variables, agrega:
   - `ANTHROPIC_API_KEY` = tu clave de API

Si NO configuras esto, todo lo demás funciona perfecto.
La búsqueda por foto simplemente no estará disponible.

## PASO 8: Abrir en los 2 celulares

Abre la URL de Vercel en Chrome del celular:
```
https://catalogo-iaprocesos.vercel.app
```

Los 2 celulares pueden registrar productos al mismo tiempo.
Los datos se sincronizan en tiempo real por Supabase.

---

## ¿ALGO FALLA?

### "No se conecta a Supabase"
- Verifica que las claves en `.env` son correctas
- Verifica que no hay espacios extra en las claves

### "No sube las fotos"
- Verifica que el bucket `productos` es público
- Verifica que la policy permite INSERT

### "OCR no lee bien la etiqueta"
- Escribe el código manualmente (son 2-4 caracteres)
- Asegúrate de que la foto de la etiqueta esté enfocada

### "Búsqueda por foto no funciona"
- Necesitas configurar el ANTHROPIC_API_KEY en Vercel
- Si no lo configuras, usa búsqueda por texto/código (funciona sin IA)
