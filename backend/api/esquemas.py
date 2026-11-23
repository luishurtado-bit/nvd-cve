from datetime import date, datetime
from typing import Any, Literal
from pydantic import BaseModel, Field, model_validator

# Valores de la NVD (CVSS v3.x y v4.0)
VectorAtaque = Literal["NETWORK", "ADJACENT_NETWORK", "ADJACENT", "LOCAL", "PHYSICAL"]
Privilegios = Literal["NONE", "LOW", "HIGH"]
Severidad = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"]
Evento = Literal["A", "B", "C"]
Condicionante = Literal["B", "C"]
Origen = Literal["simulado", "api", "csv"]
EstadoDescarga = Literal["en_curso", "terminada", "fallida"]

# Tope de n en la binomial: la tabla de la pmf tiene n + 1 filas
N_MAXIMO_BINOMIAL = 10_000

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
        if self.inicio > date.today():
            raise ValueError("inicio no puede ser una fecha futura")
        return self

class Periodo(BaseModel):
    """Periodo de análisis; null mientras no esté fijado."""

    inicio: date | None = None
    fin: date | None = None

class ResumenDatos(BaseModel):
    periodo: Periodo
    descargados: int = Field(ge=0, description="Filas descargadas, con los duplicados")
    rechazados: int = Field(ge=0, description="CVE con estado Rejected")
    duplicados: int = Field(0, ge=0, description="Filas con un cve_id ya visto (queda la más reciente)")
    sin_puntuacion: int = Field(ge=0, description="CVE sin puntuación CVSS")
    formato_invalido: int = Field(
        0, ge=0, description="CVE cuya puntuación no es un número entre 0 y 10"
    )
    N: int = Field(
        ge=0,
        description="Tamaño del espacio muestral Ω: descargados − rechazados − duplicados "
        "− sin puntuación − formato inválido",
    )
    origen: Origen = Field(
        "simulado", description="De dónde salen los datos: simulados, API de la NVD o CSV"
    )
    fecha_consulta: datetime | None = Field(
        None, description="Cuándo se consultó la NVD (UTC); null con datos simulados o de un CSV"
    )

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
    n: int = Field(gt=0, le=N_MAXIMO_BINOMIAL, description="Tamaño del lote")
    k: int = Field(ge=0, description="Número de CVE críticos")
    p: float | None = Field(
        None, ge=0, le=1, description="Si falta, se estima como K/N con los criterios"
    )
    confianza: float | None = Field(
        None, gt=0, lt=1, description="Para el n mínimo con P(X ≥ 1) ≥ confianza"
    )
    criterios: CriteriosIn = CriteriosIn()

class PuntoPmf(BaseModel):
    k: int
    probabilidad: float

class Advertencia(BaseModel):
    codigo: str
    mensaje: str

class BinomialOut(BaseModel):
    n: int
    k: int
    p: float
    p_estimada: bool = Field(description="True si p se estimó como K/N")
    N: int = Field(description="Tamaño de Ω")
    K: int = Field(description="Críticos en Ω (evento A)")
    pmf: list[PuntoPmf]
    prob_igual: float = Field(description="P(X = k)")
    prob_a_lo_sumo: float = Field(description="P(X ≤ k)")
    prob_al_menos: float = Field(description="P(X ≥ k)")
    media: float = Field(description="E(X) = n·p")
    varianza: float = Field(description="Var(X) = n·p·(1 − p)")
    desviacion: float
    confianza: float | None
    n_minimo: int | None = Field(description="Menor n con P(X ≥ 1) ≥ confianza")
    advertencias: list[Advertencia]

# --- Dashboard ---

class ConteoCategoria(BaseModel):
    categoria: str
    conteo: int = Field(ge=0)
    proporcion: float = Field(ge=0, le=1, description="Sobre el total de CVE con dato")

class DistribucionOut(BaseModel):
    total: int = Field(description="CVE con dato en esa columna")
    categorias: list[ConteoCategoria]

class PuntoSerie(BaseModel):
    fecha: date = Field(description="Día, lunes de la semana o primer día del mes")
    conteo: int = Field(ge=0)
    criticos: int = Field(0, ge=0, description="CVE con baseScore ≥ umbral")
    proporcion_criticos: float | None = Field(None, description="criticos / conteo; null si conteo = 0")

class SerieDiariaOut(BaseModel):
    total: int
    agrupar: Literal["dia", "semana", "mes"] = "dia"
    umbral: float = 9.0
    puntos: list[PuntoSerie] = Field(description="Un punto por periodo, incluidos los periodos sin CVE")

class IntervaloHistograma(BaseModel):
    desde: float
    hasta: float
    conteo: int = Field(ge=0)

class HistogramaOut(BaseModel):
    n: int
    media: float | None
    mediana: float | None
    desviacion: float | None = Field(description="Desviación estándar muestral")
    intervalos: list[IntervaloHistograma]

# --- Descargas en segundo plano ---

class DescargaOut(BaseModel):
    id: str
    estado: EstadoDescarga
    periodo: Periodo
    tramo: int = Field(description="Tramo de 120 días en curso")
    n_tramos: int
    descargados: int = Field(description="CVE descargados hasta ahora")
    total_tramo: int = Field(description="CVE del tramo en curso según la NVD")
    mensaje: str | None = Field(None, description="Último aviso de progreso")
    resumen: ResumenDatos | None = Field(None, description="Al terminar: el resumen de los datos")
    error: str | None = Field(None, description="Si falló: el motivo")
    iniciada: datetime
    terminada: datetime | None = None

# --- Registro de ejecuciones ---

class Ejecucion(BaseModel):
    fecha: datetime
    operacion: str
    origen: Origen = Field(description="Datos con los que se calculó")
    N: int
    periodo: Periodo
    parametros: dict[str, Any]
    resultado: dict[str, Any]

# --- Exportar (parámetros por query string, para descargar con un enlace) ---

class ReglasQuery(CriteriosIn):
    x: Evento = "A"
    y: Evento = "B"

    @model_validator(mode="after")
    def _eventos_distintos(self) -> "ReglasQuery":
        if self.x == self.y:
            raise ValueError("x e y deben ser eventos distintos")
        return self

class BayesQuery(CriteriosIn):
    condicionante: Condicionante = "B"
    prior: float | None = Field(None, ge=0, le=1)

class BinomialQuery(CriteriosIn):
    n: int = Field(gt=0, le=N_MAXIMO_BINOMIAL)
    k: int = Field(0, ge=0)
    p: float | None = Field(None, ge=0, le=1)

# --- Calidad de datos (B19) ---

class PasoDepuracionOut(BaseModel):
    paso: str = Field(description='"4.1" … "4.7", como en el notebook')
    descripcion: str
    antes: int = Field(ge=0, description="Filas antes del paso")
    despues: int = Field(ge=0)
    eliminados: int = Field(ge=0)
    justificacion: str

class NulosColumna(BaseModel):
    columna: str
    antes: int = Field(ge=0, description="Nulos en lo descargado")
    despues: int = Field(ge=0, description="Nulos en Ω")

class DominioColumna(BaseModel):
    columna: str
    valores: list[ConteoCategoria] = Field(description="Valores permitidos que aparecen en Ω, de mayor a menor")
    fuera_de_dominio: int = Field(ge=0, description="Valores no permitidos que quedaron nulos")

class AtipicosOut(BaseModel):
    variable: str
    q1: float | None
    q3: float | None
    limite_inferior: float | None = Field(description="Q1 − 1,5·IQR")
    limite_superior: float | None = Field(description="Q3 + 1,5·IQR")
    cantidad: int = Field(ge=0, description="Valores fuera de los límites: se marcan, no se eliminan")
    nota: str

class ValidacionOut(BaseModel):
    nombre: str
    cumple: bool
    detalle: str

class Conciliacion(BaseModel):
    descargados: int
    eliminados: int = Field(description="Rechazados + duplicados + sin puntuación + formato inválido")
    N: int
    cuadra: bool = Field(description="descargados − eliminados = N")

class CalidadOut(BaseModel):
    resumen: ResumenDatos
    pasos: list[PasoDepuracionOut]
    nulos: list[NulosColumna] = Field(description="Las 20 variables, antes y después de limpiar")
    dominios: list[DominioColumna]
    atipicos: list[AtipicosOut]
    validaciones: list[ValidacionOut]
    conciliacion: Conciliacion

# --- Indicadores clave (B24) ---

class KpisOut(BaseModel):
    N: int = Field(description="CVE en Ω que cumplen los filtros")
    N_sin_filtro: int = Field(description="CVE en Ω, sin filtros")
    umbral: float = Field(description="Crítico: baseScore ≥ umbral")
    criticos: int
    proporcion_criticos: float | None = Field(description="Entre 0 y 1; null si N = 0")
    media_puntuacion: float | None
    mediana_puntuacion: float | None
    red: int = Field(description="CVE con vector de ataque NETWORK")
    proporcion_red: float | None
    sin_privilegios: int = Field(description="CVE con privilegios NONE")
    proporcion_sin_privilegios: float | None
    kev: int = Field(description="CVE en el catálogo KEV de CISA")
    periodo: Periodo
    fecha_consulta: datetime | None
    origen: Origen

# --- Descriptivo (B22, B23) ---

VariableGrupo = Literal["vector", "privilegios", "version", "fuente"]
VariableCruce = Literal["severidad", "vector", "privilegios", "version"]

class ResumenNumericoOut(BaseModel):
    variable: str
    n: int = Field(description="Valores no nulos")
    media: float | None
    mediana: float | None
    desviacion: float | None = Field(description="Desviación estándar muestral; null si n < 2")
    minimo: float | None
    q1: float | None
    q3: float | None
    maximo: float | None
    asimetria: float | None = Field(description="> 0: cola a la derecha; < 0: a la izquierda; null si n < 3")

class GrupoCriticoOut(BaseModel):
    grupo: str
    total: int = Field(ge=0)
    criticos: int = Field(ge=0)
    proporcion_criticos: float = Field(ge=0, le=1, description="criticos / total")

class CriticoPorOut(BaseModel):
    variable: VariableGrupo
    umbral: float
    total: int = Field(description="CVE con dato en la variable")
    criticos: int
    proporcion_criticos: float | None = Field(description="La de todos los grupos juntos, para comparar")
    sin_dato: int = Field(description="CVE sin valor en la variable (no entran en los grupos)")
    grupos: list[GrupoCriticoOut]

class CeldaCruce(BaseModel):
    categoria: str = Field(description="Categoría de la columna")
    conteo: int = Field(ge=0)
    proporcion: float = Field(ge=0, le=1, description="Sobre el total de la fila")

class FilaCruceOut(BaseModel):
    categoria: str
    total: int
    celdas: list[CeldaCruce] = Field(description="Una por columna, en el orden de `columnas`")

class CruceOut(BaseModel):
    fila: VariableCruce
    columna: VariableCruce
    total: int = Field(description="CVE con dato en las dos variables")
    columnas: list[str]
    filas: list[FilaCruceOut]
