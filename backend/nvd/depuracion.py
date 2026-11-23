from dataclasses import dataclass
import numpy as np
import pandas as pd
from nvd.extraccion import (
    COL_COMPLEJIDAD,
    COL_ESTADO,
    COL_EXPLOTABILIDAD,
    COL_FUENTE,
    COL_IMPACTO,
    COL_IMPACTO_C,
    COL_IMPACTO_D,
    COL_IMPACTO_I,
    COL_INTERACCION,
    COL_KEV,
    COL_MODIFICADO,
    COL_REFERENCIAS,
    COL_VERSION,
    COLUMNAS,
)
from stats.eventos import (
    COL_CWE,
    COL_ID,
    COL_PRIVILEGIOS,
    COL_PUBLICADO,
    COL_PUNTUACION,
    COL_SEVERIDAD,
    COL_VECTOR,
)

ESTADO_RECHAZADO = "Rejected"

# Valores permitidos de las variables categóricas (CVSS v3.x y v4.0)
DOMINIOS: dict[str, tuple[str, ...]] = {
    COL_SEVERIDAD: ("NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"),
    COL_VECTOR: ("NETWORK", "ADJACENT_NETWORK", "ADJACENT", "LOCAL", "PHYSICAL"),
    COL_COMPLEJIDAD: ("LOW", "HIGH"),
    COL_PRIVILEGIOS: ("NONE", "LOW", "HIGH"),
    COL_INTERACCION: ("NONE", "REQUIRED"),
    COL_IMPACTO_C: ("NONE", "LOW", "HIGH"),
    COL_IMPACTO_I: ("NONE", "LOW", "HIGH"),
    COL_IMPACTO_D: ("NONE", "LOW", "HIGH"),
}
COLUMNAS_NUMERICAS = (COL_PUNTUACION, COL_EXPLOTABILIDAD, COL_IMPACTO)
COLUMNAS_FECHA = (COL_PUBLICADO, COL_MODIFICADO)
# Se pasan a mayúsculas; el resto de texto solo se recorta (fuente va en minúsculas)
COLUMNAS_MAYUSCULAS = (COL_ID, *DOMINIOS)
COLUMNAS_TEXTO = (COL_ID, COL_ESTADO, COL_VERSION, COL_CWE, COL_FUENTE, *DOMINIOS)
_BOOLEANOS = {"true": True, "false": False, "1": True, "0": False}

@dataclass(frozen=True)
class PasoDepuracion:
    paso: str  # "4.1" … "4.7", como en el notebook
    descripcion: str
    antes: int  # filas antes del paso
    despues: int
    eliminados: int
    justificacion: str

@dataclass(frozen=True)
class NuloColumna:
    columna: str
    antes: int  # nulos en lo descargado
    despues: int  # nulos en Ω

@dataclass(frozen=True)
class Validacion:
    nombre: str
    cumple: bool
    detalle: str

@dataclass(frozen=True)
class ConteoDepuracion:
    descargados: int  # filas descargadas, con duplicados
    rechazados: int  # estado Rejected
    duplicados: int  # mismo cve_id repetido
    sin_puntuacion: int  # sin puntuación CVSS (vacía)
    formato_invalido: int  # puntuación que no es un número entre 0 y 10
    N: int  # tamaño de Ω

    @property
    def eliminados(self) -> int:
        return self.rechazados + self.duplicados + self.sin_puntuacion + self.formato_invalido

@dataclass(frozen=True)
class ResultadoDepuracion:
    omega: pd.DataFrame
    conteo: ConteoDepuracion
    pasos: list[PasoDepuracion]
    nulos: list[NuloColumna]
    frecuencias: dict[str, dict[str, int]]  # valores de cada columna con dominio, ya limpios
    fuera_de_dominio: dict[str, int]  # valores fuera del dominio que quedaron nulos
    validaciones: list[Validacion]

def _texto(serie: pd.Series) -> pd.Series:
    """Texto sin espacios en los bordes y con las celdas vacías como nulos."""
    t = serie.astype("string").str.strip()
    return t.mask(t == "")

def _como_float(texto: pd.Series) -> pd.Series:
    return pd.to_numeric(texto, errors="coerce").astype("float64")

def _no_nulo(serie: pd.Series) -> np.ndarray:
    return serie.notna().to_numpy()

def _tipos(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, int]:
    """Paso 4.4. Devuelve la tabla con tipos, qué filas traen una puntuación con formato
    inválido y cuántas otras celdas con formato inválido quedaron nulas."""
    df = df.copy()
    otras = 0
    puntuacion_invalida = pd.Series(False, index=df.index)
    for col in COLUMNAS_NUMERICAS:
        texto = _texto(df[col])
        valor = _como_float(texto)
        invalido = _no_nulo(texto) & ~_no_nulo(valor)
        if col == COL_PUNTUACION:
            # El CVSS va de 0 a 10: otro número tampoco es una puntuación válida
            invalido |= _no_nulo(valor) & ~valor.between(0, 10).to_numpy()
            puntuacion_invalida = pd.Series(invalido, index=df.index)
        else:
            otras += int(invalido.sum())
        df[col] = valor.mask(invalido)

    for col in COLUMNAS_FECHA:
        texto = _texto(df[col])
        fecha = pd.to_datetime(texto, utc=True, format="ISO8601", errors="coerce")
        otras += int((_no_nulo(texto) & ~_no_nulo(fecha)).sum())
        df[col] = fecha  # la NVD publica en UTC

    texto = _texto(df[COL_REFERENCIAS])
    cantidad = _como_float(texto)
    invalido = _no_nulo(texto) & (~_no_nulo(cantidad) | (cantidad % 1 != 0).to_numpy() | (cantidad < 0).to_numpy())
    otras += int(invalido.sum())
    df[COL_REFERENCIAS] = cantidad.mask(invalido).astype("Int64")

    texto = _texto(df[COL_KEV]).str.lower()
    booleano = texto.map(_BOOLEANOS)
    otras += int((_no_nulo(texto) & ~_no_nulo(booleano)).sum())
    df[COL_KEV] = booleano.astype("boolean")
    return df, puntuacion_invalida, otras

def _texto_y_dominio(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, int]]:
    """Paso 4.5: recorta, unifica mayúsculas y deja nulo lo que no esté en su dominio."""
    df = df.copy()
    fuera: dict[str, int] = {}
    for col in COLUMNAS_TEXTO:
        texto = _texto(df[col])
        if col in COLUMNAS_MAYUSCULAS:
            texto = texto.str.upper()
        elif col == COL_FUENTE:
            texto = texto.str.lower()
        if col in DOMINIOS:
            invalido = _no_nulo(texto) & ~texto.isin(DOMINIOS[col]).to_numpy()
            fuera[col] = int(invalido.sum())
            texto = texto.mask(invalido)
        df[col] = texto
    return df, fuera

def depurar(df: pd.DataFrame) -> ResultadoDepuracion:
    """Ω = CVE no rechazados, sin repetir y con puntuación CVSS válida (RF2).

    Sigue los pasos 4.1 a 4.7 del notebook y los deja anotados, de modo que
    `descargados − eliminados = N` siempre se pueda comprobar.
    """
    faltantes = [c for c in COLUMNAS if c not in df.columns]
    if faltantes:
        raise ValueError(f"faltan columnas: {faltantes}")
    df = df.loc[:, list(COLUMNAS)].reset_index(drop=True)
    descargados = len(df)
    nulos_antes = df.isna().sum()
    pasos: list[PasoDepuracion] = []

    def anotar(paso: str, descripcion: str, antes: int, despues: int, justificacion: str) -> None:
        pasos.append(PasoDepuracion(paso, descripcion, antes, despues, antes - despues, justificacion))

    # 4.1 Inventario
    con_nulos = int((nulos_antes > 0).sum())
    anotar(
        "4.1", "Inventario de nulos", descargados, descargados,
        f"{con_nulos} de {len(COLUMNAS)} columnas tienen nulos; se cuentan antes de limpiar para compararlos después",
    )

    # 4.2 Rejected
    estado = df[COL_ESTADO].astype("string").str.strip().str.casefold()
    rechazado = estado.eq(ESTADO_RECHAZADO.casefold()).fillna(False).to_numpy(dtype=bool)
    df = df[~rechazado]
    rechazados = int(rechazado.sum())
    anotar("4.2", "Excluir Rejected", descargados, len(df), "No son vulnerabilidades reales: el CVE fue anulado")

    # 4.3 Duplicados: queda la versión con la última modificación más reciente
    antes = len(df)
    modificado = pd.to_datetime(_texto(df[COL_MODIFICADO]), utc=True, format="ISO8601", errors="coerce")
    df = df.loc[modificado.sort_values(kind="stable", na_position="first").index]
    repetido = df.duplicated(subset=COL_ID, keep="last").to_numpy()
    df = df[~repetido].sort_index()
    duplicados = int(repetido.sum())
    anotar("4.3", "Quitar duplicados por cve_id", antes, len(df), "Un CVE cuenta una sola vez; se conserva su versión más reciente")

    # 4.4 Tipos
    df, puntuacion_invalida, otras_invalidas = _tipos(df)
    anotar(
        "4.4", "Convertir tipos", len(df), len(df),
        "Puntuaciones a número, fechas a UTC, n_referencias a entero y kev a booleano; "
        f"los valores que no se pueden convertir quedan nulos ({otras_invalidas} fuera de la puntuación)",
    )

    # 4.5 Texto y dominio
    df, fuera_de_dominio = _texto_y_dominio(df)
    n_fuera = sum(fuera_de_dominio.values())
    anotar(
        "4.5", "Normalizar texto y validar dominios", len(df), len(df),
        f"Sin espacios sobrantes y en mayúsculas; {n_fuera} valores fuera de su dominio quedan nulos",
    )

    # 4.6 Nulos: sin puntuación válida no se puede clasificar
    antes = len(df)
    sin_valor = df[COL_PUNTUACION].isna().to_numpy()
    puntuacion_invalida = puntuacion_invalida.loc[df.index].to_numpy()
    formato_invalido = int((sin_valor & puntuacion_invalida).sum())
    sin_puntuacion = int((sin_valor & ~puntuacion_invalida).sum())
    omega = df[~sin_valor].reset_index(drop=True)
    anotar(
        "4.6", "Excluir sin puntuación", antes, len(omega),
        "Sin CVSS no se puede clasificar el CVE. Se conservan los nulos de CWE, explotabilidad "
        "e impacto: la v4.0 no los trae y no afectan a los eventos",
    )

    # 4.7 Validaciones y conciliación
    conteo = ConteoDepuracion(
        descargados=descargados,
        rechazados=rechazados,
        duplicados=duplicados,
        sin_puntuacion=sin_puntuacion,
        formato_invalido=formato_invalido,
        N=len(omega),
    )
    validaciones = [
        Validacion(
            "base_score en [0, 10]",
            bool(omega[COL_PUNTUACION].between(0, 10).all()),
            "Toda puntuación de Ω está entre 0 y 10",
        ),
        Validacion(
            "cve_id únicos",
            bool(omega[COL_ID].is_unique),
            f"{int(omega[COL_ID].duplicated().sum())} ids repetidos en Ω",
        ),
        Validacion(
            "descargados − eliminados = N",
            conteo.descargados - conteo.eliminados == conteo.N,
            f"{conteo.descargados} − {conteo.eliminados} = {conteo.descargados - conteo.eliminados}; N = {conteo.N}",
        ),
    ]
    cumplidas = sum(v.cumple for v in validaciones)
    anotar("4.7", "Validaciones y conciliación", len(omega), len(omega), f"Se cumplen {cumplidas} de {len(validaciones)} validaciones")

    nulos_despues = omega.isna().sum()
    return ResultadoDepuracion(
        omega=omega,
        conteo=conteo,
        pasos=pasos,
        nulos=[NuloColumna(c, int(nulos_antes[c]), int(nulos_despues[c])) for c in COLUMNAS],
        frecuencias={c: {str(k): int(v) for k, v in omega[c].value_counts().items()} for c in DOMINIOS},
        fuera_de_dominio=fuera_de_dominio,
        validaciones=validaciones,
    )
