import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

async def _valor_invalido(_: Request, e: Exception) -> JSONResponse:
    """Un ValueError que se escapa de stats/ o de un modelo es un dato inválido,
    no una falla del servidor: 422 con el mismo formato que el resto ({"detail": texto})."""
    log.info("Dato inválido: %s", e)
    return JSONResponse(status_code=422, content={"detail": str(e)})

def registrar_manejadores(app: FastAPI) -> None:
    app.add_exception_handler(ValueError, _valor_invalido)
