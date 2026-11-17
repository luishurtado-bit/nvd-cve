import os
from pathlib import Path
from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent.parent
# Valor de ejemplo de .env.example: equivale a no tener clave.
# La clave real va SOLO en .env (ignorado por Git), nunca en el código.
_CLAVE_DE_EJEMPLO = "pega_aqui_tu_clave"

# No sobrescribe variables que ya estén definidas en el entorno
load_dotenv(RAIZ / ".env")

def nvd_api_key() -> str | None:
    """Clave de la API de la NVD, o None si no está configurada."""
    clave = os.getenv("NVD_API_KEY", "").strip()
    if not clave or clave == _CLAVE_DE_EJEMPLO:
        return None
    return clave

def dir_datos() -> Path:
    """Carpeta donde se guardan los datos descargados (por defecto, <raíz>/data)."""
    ruta = os.getenv("DIR_DATOS", "").strip()
    return Path(ruta) if ruta else RAIZ / "data"
