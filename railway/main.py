from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
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

# Control simple en memoria (se reinicia con el servidor)
uso_diario: dict = defaultdict(lambda: {"fecha": str(date.today()), "count": 0})

PROMPT = """Edita esta fotografía de prenda de ropa para catálogo profesional. Sigue estas reglas con precisión:

FONDO: Reemplaza el fondo con un color neutro liso y cálido — preferir crema o beige claro para prendas oscuras, blanco puro para prendas de colores. El fondo debe ser completamente uniforme sin gradientes ni sombras.

TEXTURA Y TELA — MUY IMPORTANTE: Conserva fielmente TODA la textura original de la prenda. Si la prenda es peluda, afelpada, de punto, con brillos, lentejuelas o destellos — estos detalles son PARTE DEL DISEÑO y deben verse claramente en la imagen final. NO alisar, NO suavizar, NO simplificar la superficie de la tela. Solo elimina arrugas de pliegue o doblez, nunca la textura propia del tejido.

BRILLO Y DESTELLOS: Si la prenda tiene hilos brillantes, lentejuelas o destellos metálicos, resáltalos con buena iluminación. Son características clave del producto.

ILUMINACIÓN: Luz suave, difusa y uniforme que resalte la textura real de la prenda. Sin sombras duras. La iluminación debe hacer que los materiales especiales (pelusa, brillo, bordados) se vean atractivos.

COLGADOR: Usa un colgador negro elegante tipo premium. Debe estar colgado en una barra o soporte negro visible en la parte superior de la imagen. La prenda nunca debe parecer flotando — siempre debe verse el soporte del colgador.

COMPOSICIÓN: Prenda completamente visible de arriba a abajo, centrada, con espacio uniforme en todos los bordes. Incluir la parte superior del colgador y su soporte.

COLOR: Conserva exactamente el color real de la prenda sin alterar tonos.

LIMPIEZA: Elimina etiquetas de precio, códigos de barras y elementos del fondo original. No elimines nada de la prenda misma.

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
    return {"status": "ok", "service": "IA Procesos - Mejora de Fotos"}


@app.post("/mejorar-foto")
async def mejorar_foto(
    imagen: UploadFile = File(...),
    empresa_id: str = Header(default="default")
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="API key no configurada")

    # Control de uso diario por empresa
    hoy = str(date.today())
    u = uso_diario[empresa_id]
    if u["fecha"] != hoy:
        u["fecha"] = hoy
        u["count"] = 0
    if u["count"] >= LIMITE_DIARIO:
        raise HTTPException(
            status_code=429,
            detail=f"Límite diario de {LIMITE_DIARIO} mejoras alcanzado. Reinicia mañana."
        )

    # Leer y comprimir imagen
    data = await imagen.read()
    compressed = comprimir_imagen(data, max_px=1024)

    # Llamar a OpenAI
    async with httpx.AsyncClient(timeout=120) as client:
        files = {"image": ("product.png", compressed, "image/png")}
        data_form = {
            "model": "gpt-image-1-mini",
            "quality": "medium",  # medium desde servidor para mejor calidad que low
            "size": "1024x1024",
            "prompt": PROMPT,
        }
        resp = await client.post(
            "https://api.openai.com/v1/images/edits",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            files=files,
            data=data_form,
        )

    if resp.status_code != 200:
        try:
            err = resp.json()
            msg = err.get("error", {}).get("message", "Error OpenAI")
        except Exception:
            msg = resp.text
        raise HTTPException(status_code=502, detail=msg)

    resultado = resp.json()
    b64 = resultado["data"][0].get("b64_json")
    if not b64:
        raise HTTPException(status_code=502, detail="Sin imagen en respuesta")

    # Registrar uso
    u["count"] += 1
    restantes = LIMITE_DIARIO - u["count"]

    return {
        "imagen_b64": b64,
        "formato": "image/png",
        "uso_hoy": u["count"],
        "restantes_hoy": restantes
    }


@app.get("/uso/{empresa_id}")
def ver_uso(empresa_id: str):
    hoy = str(date.today())
    u = uso_diario.get(empresa_id, {"fecha": hoy, "count": 0})
    return {
        "empresa_id": empresa_id,
        "fecha": hoy,
        "uso_hoy": u["count"] if u["fecha"] == hoy else 0,
        "limite_diario": LIMITE_DIARIO,
        "restantes": LIMITE_DIARIO - (u["count"] if u["fecha"] == hoy else 0)
    }
