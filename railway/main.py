from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import imagehash
import httpx, os, io, base64, json
from datetime import date
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
LIMITE_DIARIO = int(os.environ.get("LIMITE_DIARIO", "50"))
uso_diario: dict = defaultdict(lambda: {"fecha": str(date.today()), "count": 0})

PROMPT = """Edita esta fotografía de prenda de ropa para catálogo profesional. Sigue estas reglas con precisión:

FONDO: Reemplaza el fondo con un color neutro liso y cálido — preferir crema o beige claro para prendas oscuras, blanco puro para prendas de colores. El fondo debe ser completamente uniforme sin gradientes ni sombras.

TEXTURA Y TELA — CRÍTICO: Conserva fielmente y con máximo detalle TODA la textura original de la prenda. Si la prenda tiene pelos, pelusa, fieltro, tejido afelpado o material esponjoso — estos pelos deben verse individualmente igual que en la foto original. PROHIBIDO alisar, suavizar, comprimir o simplificar la superficie de la tela. La textura peluda debe verse igual o más nítida que en la foto original. Solo elimina arrugas de pliegue o doblez, NUNCA la textura propia del tejido.

BRILLO Y DESTELLOS — CRÍTICO: Si la prenda tiene hilos brillantes, lentejuelas, destellos o partículas metálicas, estos deben verse claramente en la imagen final con el mismo nivel de brillo que en el original. Son características clave del producto y no deben reducirse ni eliminarse.

ILUMINACIÓN: Luz suave, difusa y uniforme que resalte la textura real de la prenda. Sin sombras duras.

COLGADOR: Usa un colgador negro elegante tipo premium. Debe estar colgado en una barra o soporte negro visible en la parte superior de la imagen. La prenda nunca debe parecer flotando — siempre debe verse el soporte del colgador.

COMPOSICIÓN: Prenda completamente visible de arriba a abajo, centrada, con espacio uniforme en todos los bordes. Incluir la parte superior del colgador y su soporte.

COLOR: Conserva exactamente el color real de la prenda sin alterar tonos.

LIMPIEZA — MUY IMPORTANTE: Elimina ÚNICAMENTE las etiquetas externas de precio (etiqueta pequeña amarilla colgante) y etiquetas de código de barras (etiqueta pequeña celeste o blanca con números).
ETIQUETAS DE MARCA — CRÍTICO: NO toques, NO muevas, NO cambies el color ni el diseño de ninguna etiqueta cosida en la prenda. Deben aparecer exactamente igual que en la foto original — mismo color, mismo tamaño, misma posición. PROHIBIDO INVENTAR TEXTO: Si en la foto original el texto de la etiqueta no se lee claramente (aparece borroso, como sombra o manchas), déjalo exactamente así — como sombra indistinta. NO escribas, NO generes, NO inventes ningún texto, marca, nombre o letra que no sea perfectamente legible en la foto original.

RESULTADO: Foto de catálogo profesional donde la textura y materiales de la prenda sean el protagonista."""


def comprimir_imagen(data: bytes, max_px: int = 1024) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    w, h = img.size
    if w > max_px or h > max_px:
        ratio = min(max_px / w, max_px / h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@app.get("/")
def health():
    return {"status": "ok", "service": "IA Procesos - Backend"}


# ── MEJORAR FOTO ──
@app.post("/mejorar-foto")
async def mejorar_foto(imagen: UploadFile = File(...), empresa_id: str = Header(default="default")):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="API key no configurada")
    hoy = str(date.today())
    u = uso_diario[empresa_id]
    if u["fecha"] != hoy:
        u["fecha"] = hoy; u["count"] = 0
    if u["count"] >= LIMITE_DIARIO:
        raise HTTPException(status_code=429, detail=f"Límite diario de {LIMITE_DIARIO} mejoras alcanzado.")
    data = await imagen.read()
    compressed = comprimir_imagen(data, max_px=1024)
    async with httpx.AsyncClient(timeout=120) as client:
        files = {"image": ("product.png", compressed, "image/png")}
        data_form = {"model": "gpt-image-1-mini", "quality": "high", "size": "1024x1024", "prompt": PROMPT}
        resp = await client.post("https://api.openai.com/v1/images/edits",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"}, files=files, data=data_form)
    if resp.status_code != 200:
        try: msg = resp.json().get("error", {}).get("message", "Error OpenAI")
        except Exception: msg = resp.text
        raise HTTPException(status_code=502, detail=msg)
    resultado = resp.json()
    b64 = resultado["data"][0].get("b64_json")
    if not b64:
        raise HTTPException(status_code=502, detail="Sin imagen en respuesta")
    u["count"] += 1
    return {"imagen_b64": b64, "formato": "image/png", "uso_hoy": u["count"], "restantes_hoy": LIMITE_DIARIO - u["count"]}


# ── CALCULAR HASH (para búsqueda visual) ──
@app.post("/calcular-hash")
async def calcular_hash(imagen: UploadFile = File(...)):
    """Genera un hash perceptual de la imagen para búsqueda por similitud visual"""
    try:
        data = await imagen.read()
        img = Image.open(io.BytesIO(data)).convert("RGB")
        h = str(imagehash.phash(img))
        return {"hash": h}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── COMPARAR HASHES (búsqueda visual) ──
@app.post("/buscar-similar")
async def buscar_similar(imagen: UploadFile = File(...), hashes: str = Header(default="[]")):
    """
    Recibe imagen de búsqueda y lista de hashes conocidos.
    Devuelve los más similares ordenados por distancia.
    hashes: JSON string con lista de {id, hash, codigo, nombre}
    """
    try:
        data = await imagen.read()
        img = Image.open(io.BytesIO(data)).convert("RGB")
        hash_busqueda = imagehash.phash(img)
        catalogo = json.loads(hashes)
        resultados = []
        for item in catalogo:
            if not item.get("hash"):
                continue
            try:
                h = imagehash.hex_to_hash(item["hash"])
                distancia = hash_busqueda - h  # Hamming distance (0=idéntico, 64=máximo)
                if distancia <= 20:  # umbral de similitud
                    resultados.append({**item, "distancia": distancia, "similitud": round((1 - distancia/64) * 100)})
            except Exception:
                continue
        resultados.sort(key=lambda x: x["distancia"])
        return {"resultados": resultados[:10]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── OCR PARA INVENTARIO ──
@app.post("/ocr-etiqueta")
async def ocr_etiqueta(imagen: UploadFile = File(...)):
    """OCR rápido para leer código de etiqueta en inventario físico"""
    try:
        data = await imagen.read()
        compressed = comprimir_imagen(data, max_px=600)
        b64 = base64.b64encode(compressed).decode()
        import urllib.parse, urllib.request
        params = urllib.parse.urlencode({
            "base64Image": f"data:image/png;base64,{b64}",
            "OCREngine": "3",
            "isTable": "false"
        })
        req = urllib.request.Request(
            "https://api.ocr.space/parse/image",
            data=params.encode(),
            headers={"apikey": "K85837551988957"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
        texto = (result.get("ParsedResults", [{}])[0].get("ParsedText", "") or "").strip()
        codigo = "".join(c for c in texto if c.isalnum()).upper()[:20]
        return {"codigo": codigo, "texto_raw": texto}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/uso/{empresa_id}")
def ver_uso(empresa_id: str):
    hoy = str(date.today())
    u = uso_diario.get(empresa_id, {"fecha": hoy, "count": 0})
    return {"empresa_id": empresa_id, "uso_hoy": u["count"] if u["fecha"] == hoy else 0, "limite_diario": LIMITE_DIARIO}
