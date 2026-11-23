import pandas as pd
import pytest
from nvd.depuracion import DOMINIOS, ResultadoDepuracion, depurar
from nvd.extraccion import COLUMNAS, a_dataframe
from stats.eventos import contar_eventos
from tests.ejemplos_nvd import cve, metrica, metrica_v4

V31 = "cvssMetricV31"

def _crudo() -> pd.DataFrame:
    return a_dataframe(
        [
            cve("CVE-1", metricas={V31: [metrica(9.8)]}),
            cve("CVE-2", metricas={V31: [metrica(5.5, "LOCAL", "LOW")]}),
            cve("CVE-3", estado="Rejected"),
            # Rechazado aunque tenga puntuación: cuenta como rechazado, no entra a Ω
            cve("CVE-4", estado="Rejected", metricas={V31: [metrica(7.0)]}),
            cve("CVE-5", estado="Awaiting Analysis"),  # sin puntuación
            cve("CVE-1", metricas={V31: [metrica(9.8)]}),  # repetido
        ]
    )

def _paso(r: ResultadoDepuracion, numero: str) -> tuple[int, int, int]:
    p = next(p for p in r.pasos if p.paso == numero)
    return p.antes, p.despues, p.eliminados

def _con(df: pd.DataFrame, **cambios: object) -> pd.DataFrame:
    """Copia de una tabla de una fila con algunas celdas cambiadas."""
    df = df.copy()
    for col, valor in cambios.items():
        df[col] = pd.Series([valor], dtype="object")
    return df

def _una_fila(**cambios: object) -> pd.DataFrame:
    return _con(a_dataframe([cve("CVE-1", metricas={V31: [metrica(9.8)]}, n_referencias=3)]), **cambios)

# --- Conteos y conciliación ---

def test_conteos() -> None:
    c = depurar(_crudo()).conteo
    # 6 filas: 2 rechazados, 1 duplicado (CVE-1), 1 sin puntuación (CVE-5)
    assert (c.descargados, c.rechazados, c.duplicados, c.sin_puntuacion, c.formato_invalido, c.N) == (6, 2, 1, 1, 0, 2)

def test_conciliacion() -> None:
    c = depurar(_crudo()).conteo
    assert c.descargados - c.eliminados == c.N

def test_omega() -> None:
    omega = depurar(_crudo()).omega
    assert omega["cve_id"].tolist() == ["CVE-2", "CVE-1"]
    assert omega["base_score"].notna().all()
    assert list(omega.columns) == list(COLUMNAS)
    # Ω sirve directo para los eventos de stats/
    eventos = contar_eventos(omega)
    assert (eventos.N, eventos.A, eventos.B, eventos.C) == (2, 1, 1, 1)

def test_sin_datos() -> None:
    r = depurar(a_dataframe([]))
    assert r.omega.empty and r.conteo.N == 0 and r.conteo.descargados == 0
    assert all(v.cumple for v in r.validaciones)

def test_todos_rechazados() -> None:
    c = depurar(a_dataframe([cve("A", estado="Rejected"), cve("B", estado="Rejected")])).conteo
    assert (c.rechazados, c.N) == (2, 0)

def test_faltan_columnas() -> None:
    with pytest.raises(ValueError, match="estado"):
        depurar(_crudo().drop(columns=["estado"]))

# --- Un caso por paso ---

def test_paso_4_1_inventario_cuenta_nulos_antes_de_limpiar() -> None:
    r = depurar(_crudo())
    nulos = {n.columna: n for n in r.nulos}
    # 2 de las 6 filas no tienen puntuación: CVE-3 (Rejected) y CVE-5
    assert nulos["base_score"].antes == 2 and nulos["base_score"].despues == 0
    assert nulos["cwe"].antes == 6 and nulos["cwe"].despues == 2
    assert _paso(r, "4.1") == (6, 6, 0)

def test_paso_4_2_excluye_rejected() -> None:
    r = depurar(_crudo())
    assert _paso(r, "4.2") == (6, 4, 2)

def test_paso_4_2_estado_vacio_o_con_espacios() -> None:
    df = _crudo()
    df["estado"] = pd.NA
    assert depurar(df).conteo.rechazados == 0
    assert depurar(_una_fila(estado="  rejected ")).conteo.rechazados == 1

def test_paso_4_3_duplicados_deja_la_ultima_modificacion() -> None:
    df = a_dataframe(
        [
            cve("CVE-1", metricas={V31: [metrica(9.8)]}, modificado="2026-11-09T00:00:00.000"),
            cve("CVE-1", metricas={V31: [metrica(5.0)]}, modificado="2026-11-02T00:00:00.000"),  # más vieja
            cve("CVE-2", metricas={V31: [metrica(6.0)]}),
        ]
    )
    r = depurar(df)
    assert _paso(r, "4.3") == (3, 2, 1)
    assert r.omega.set_index("cve_id")["base_score"].to_dict() == {"CVE-1": 9.8, "CVE-2": 6.0}

def test_paso_4_3_sin_fecha_de_modificacion_queda_la_ultima_fila() -> None:
    df = a_dataframe([cve("A", metricas={V31: [metrica(1.0)]}), cve("A", metricas={V31: [metrica(2.0)]})])
    assert depurar(df).omega["base_score"].tolist() == [2.0]

def test_paso_4_4_tipos() -> None:
    omega = depurar(_una_fila(ultima_modificacion="2026-11-09T01:02:03.004", kev="True")).omega
    assert omega["base_score"].dtype == "float64"
    assert str(omega["publicado"].dtype) == "datetime64[us, UTC]"
    assert str(omega["publicado"].dt.tz) == "UTC"
    assert str(omega["ultima_modificacion"].dtype) == "datetime64[us, UTC]"
    assert omega["n_referencias"].dtype == "Int64" and omega["n_referencias"].iloc[0] == 3
    assert omega["kev"].dtype == "boolean" and bool(omega["kev"].iloc[0]) is True

@pytest.mark.parametrize("malo", ["abc", "11", "-1", "NaN-ish"])
def test_paso_4_4_puntuacion_con_formato_invalido_se_cuenta_aparte(malo: str) -> None:
    r = depurar(_una_fila(base_score=malo))
    c = r.conteo
    assert (c.formato_invalido, c.sin_puntuacion, c.N) == (1, 0, 0)
    assert c.descargados - c.eliminados == c.N
    assert _paso(r, "4.6") == (1, 0, 1)

def test_paso_4_4_otros_formatos_invalidos_quedan_nulos_sin_eliminar_la_fila() -> None:
    omega = depurar(_una_fila(n_referencias="muchas", kev="quizá", publicado="no es fecha")).omega
    assert len(omega) == 1
    assert pd.isna(omega["n_referencias"].iloc[0]) and pd.isna(omega["kev"].iloc[0]) and pd.isna(omega["publicado"].iloc[0])

def test_paso_4_5_recorta_y_pasa_a_mayusculas() -> None:
    omega = depurar(_una_fila(cve_id=" cve-1 ", vector_ataque=" network ", severidad="critical", fuente="  CNA@X.org ")).omega
    assert omega.loc[0, "cve_id"] == "CVE-1"
    assert omega.loc[0, "vector_ataque"] == "NETWORK"
    assert omega.loc[0, "severidad"] == "CRITICAL"
    assert omega.loc[0, "fuente"] == "cna@x.org"

def test_paso_4_5_valor_fuera_de_dominio_se_cuenta_y_queda_nulo() -> None:
    r = depurar(_una_fila(vector_ataque="TELEPATICO", privilegios="NONE"))
    assert pd.isna(r.omega.loc[0, "vector_ataque"])
    assert r.fuera_de_dominio["vector_ataque"] == 1 and r.fuera_de_dominio["privilegios"] == 0
    # La fila se conserva: solo se anuló el valor
    assert r.conteo.N == 1

def test_paso_4_5_los_valores_v31_y_v40_son_validos() -> None:
    df = a_dataframe(
        [
            cve("A", metricas={V31: [metrica(9.8, "ADJACENT_NETWORK", complejidad="HIGH", interaccion="REQUIRED")]}),
            cve("B", metricas={"cvssMetricV40": [metrica_v4(8.0, "ADJACENT", interaccion="ACTIVE")]}),
        ]
    )
    r = depurar(df)
    assert sum(r.fuera_de_dominio.values()) == 0
    assert r.frecuencias["vector_ataque"] == {"ADJACENT_NETWORK": 1, "ADJACENT": 1}
    assert r.frecuencias["interaccion_usuario"] == {"REQUIRED": 2}

def test_paso_4_6_sin_puntuacion_se_excluye_pero_se_conservan_otros_nulos() -> None:
    df = a_dataframe(
        [
            cve("A", metricas={"cvssMetricV40": [metrica_v4(9.3)]}, cwes=None),  # v4.0: sin explotabilidad ni impacto
            cve("B", estado="Awaiting Analysis"),
        ]
    )
    r = depurar(df)
    assert (r.conteo.sin_puntuacion, r.conteo.N) == (1, 1)
    assert pd.isna(r.omega.loc[0, "puntaje_explotabilidad"]) and pd.isna(r.omega.loc[0, "cwe"])
    assert _paso(r, "4.6") == (2, 1, 1)

def test_paso_4_7_validaciones() -> None:
    r = depurar(_crudo())
    assert {v.nombre: v.cumple for v in r.validaciones} == {
        "base_score en [0, 10]": True,
        "cve_id únicos": True,
        "descargados − eliminados = N": True,
    }
    assert _paso(r, "4.7") == (2, 2, 0)

def test_los_pasos_van_en_orden_y_encadenan_sus_filas() -> None:
    pasos = depurar(_crudo()).pasos
    assert [p.paso for p in pasos] == ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"]
    for anterior, siguiente in zip(pasos, pasos[1:]):
        assert anterior.despues == siguiente.antes
    assert all(p.antes - p.despues == p.eliminados and p.justificacion for p in pasos)

def test_frecuencias_de_dominio_cubren_todas_las_columnas_categoricas() -> None:
    r = depurar(_crudo())
    assert set(r.frecuencias) == set(DOMINIOS) == set(r.fuera_de_dominio)
    assert r.frecuencias["severidad"] == {"CRITICAL": 1, "MEDIUM": 1}

def test_depurar_no_modifica_la_entrada() -> None:
    df = _crudo()
    copia = df.copy()
    depurar(df)
    pd.testing.assert_frame_equal(df, copia)
