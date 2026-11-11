from datetime import date
from typing import Literal
from pydantic import BaseModel, Field, model_validator

# Valores de la NVD (CVSS v3.x y v4.0)
VectorAtaque = Literal["NETWORK", "ADJACENT_NETWORK", "ADJACENT", "LOCAL", "PHYSICAL"]
Privilegios = Literal["NONE", "LOW", "HIGH"]
Evento = Literal["A", "B", "C"]
Condicionante = Literal["B", "C"]

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

# --- Eventos ---

class CriteriosIn(BaseModel):
    """Definición de los eventos (Tabla I del informe)."""

    umbral: float = Field(9.0, ge=0, le=10, description="A: baseScore ≥ umbral")
    vector: VectorAtaque = Field("NETWORK", description="B: vector de ataque")
    privilegios: Privilegios = Field("NONE", description="C: privilegios requeridos")

class ConteoProb(BaseModel):
    conteo: int = Field(ge=0)
    probabilidad: float = Field(ge=0, le=1)

class TablaEventos(BaseModel):
    A: ConteoProb
    B: ConteoProb
    C: ConteoProb
    AB: ConteoProb = Field(description="A ∩ B")
    AC: ConteoProb = Field(description="A ∩ C")
    BC: ConteoProb = Field(description="B ∩ C")
    ABC: ConteoProb = Field(description="A ∩ B ∩ C")

class EventosOut(BaseModel):
    criterios: CriteriosIn
    N: int
    eventos: TablaEventos

# --- Reglas de probabilidad ---

class ReglasIn(BaseModel):
    criterios: CriteriosIn = CriteriosIn()
    x: Evento = "A"
    y: Evento = "B"

    @model_validator(mode="after")
    def _eventos_distintos(self) -> "ReglasIn":
        if self.x == self.y:
            raise ValueError("x e y deben ser eventos distintos")
        return self

class ReglasOut(BaseModel):
    x: Evento
    y: Evento
    p_x: float
    p_y: float
    p_x_complemento: float = Field(description="P(Xᶜ) = 1 − P(X)")
    p_y_complemento: float = Field(description="P(Yᶜ) = 1 − P(Y)")
    p_interseccion: float = Field(description="P(X ∩ Y)")
    p_union: float = Field(description="P(X ∪ Y) = P(X) + P(Y) − P(X ∩ Y)")
    producto: float = Field(description="P(X)·P(Y), para comparar con P(X ∩ Y)")
    independientes: bool
    nota: str | None = None

# --- Bayes ---

class BayesIn(BaseModel):
    criterios: CriteriosIn = CriteriosIn()
    condicionante: Condicionante = "B"
    prior: float | None = Field(
        None, ge=0, le=1, description="Probabilidad previa de A; si falta, se usa P(A)"
    )

class BayesOut(BaseModel):
    condicionante: Condicionante
    p_a: float = Field(description="P(A) de los datos")
    prior: float = Field(description="Probabilidad previa usada")
    p_e_dado_a: float = Field(description="P(E | A), de los datos")
    p_e_dado_ac: float = Field(description="P(E | Aᶜ), de los datos")
    p_e: float = Field(description="P(E) por probabilidad total con el prior")
    p_a_dado_e: float = Field(description="P(A | E) de los datos")
    posterior: float = Field(description="P(A | E) con el prior usado")

# --- Binomial ---

class BinomialIn(BaseModel):
    n: int = Field(gt=0)
    p: float = Field(ge=0, le=1)
    k: int = Field(ge=0)

class BinomialOut(BaseModel):
    prob_al_menos_k: float
