"""Modelos de entrada y salida de la API (contrato, sección 3 del plan)."""

from datetime import date

from pydantic import BaseModel, Field, model_validator


# --- Salud ---


class Salud(BaseModel):
    estado: str


# --- Datos ---


class CargarIn(BaseModel):
    inicio: date
    fin: date

    @model_validator(mode="after")
    def _fin_no_antes_de_inicio(self) -> "CargarIn":
        if self.fin < self.inicio:
            raise ValueError("fin debe ser igual o posterior a inicio")
        return self


class Periodo(BaseModel):
    """Periodo de análisis; null mientras no esté fijado."""

    inicio: date | None = None
    fin: date | None = None


class ResumenDatos(BaseModel):
    periodo: Periodo
    descargados: int = Field(ge=0)
    rechazados: int = Field(ge=0, description="CVE con estado Rejected")
    sin_puntuacion: int = Field(ge=0, description="CVE sin puntuación CVSS")
    N: int = Field(ge=0, description="Tamaño del espacio muestral Ω")


# --- Binomial ---


class BinomialIn(BaseModel):
    n: int = Field(gt=0)
    p: float = Field(ge=0, le=1)
    k: int = Field(ge=0)


class BinomialOut(BaseModel):
    prob_al_menos_k: float
