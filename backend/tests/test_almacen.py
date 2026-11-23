import json
import os
from datetime import date
from pathlib import Path
import pandas as pd
import pytest
import config
from nvd import almacen, descargar
from nvd.almacen import ErrorCSV, cargar, guardar, leer_csv, ultimo
from nvd.cliente import ErrorNVD
from nvd.depuracion import depurar
from nvd.extraccion import COLUMNAS, a_dataframe
from tests.ejemplos_nvd import cve, metrica, metrica_v4

INICIO, FIN = date(2026, 11, 1), date(2026, 11, 2)

def _crudo() -> pd.DataFrame:
    return a_dataframe(
        [
            cve("CVE-1", "2026-11-01T10:00:00.000", metricas={"cvssMetricV31": [metrica(9.8)]}, cwes=["CWE-79"]),
            cve("CVE-2", "2026-11-02T08:30:00", metricas={"cvssMetricV40": [metrica(5.1, "ADJACENT", "LOW")]}),
            cve("CVE-3", "2026-11-02T09:00:00.000", estado="Rejected"),
        ]
    )

def test_guardar_y_cargar_sin_perdidas(tmp_path: Path) -> None:
    original = _crudo()
    ruta = guardar(original, INICIO, FIN, "api", carpeta=tmp_path)
    assert ruta.suffix == ".csv" and ruta.with_suffix(".json").is_file()
    df, meta = cargar(ruta)
    assert list(df.columns) == list(COLUMNAS)
    assert df["cve_id"].tolist() == ["CVE-1", "CVE-2", "CVE-3"]
    # Se lee como texto: la conversión de tipos es el paso 4.4 de la depuración
    assert df["base_score"].tolist()[:2] == ["9.8", "5.1"] and pd.isna(df["base_score"].iloc[2])
    assert df["version_cvss"].tolist()[:2] == ["3.1", "4.0"]  # texto, no número
    assert df["vector_ataque"].tolist()[:2] == ["NETWORK", "ADJACENT"]
    assert df["cwe"].iloc[0] == "CWE-79" and pd.isna(df["cwe"].iloc[1])
    assert (meta.inicio, meta.fin, meta.origen) == (INICIO, FIN, "api")

def test_guardar_y_cargar_conservan_las_20_variables(tmp_path: Path) -> None:
    crudo = a_dataframe(
        [
            cve(
                "CVE-1",
                metricas={"cvssMetricV31": [metrica(9.8, complejidad="HIGH", interaccion="REQUIRED")]},
                fuente="Cna@Ejemplo.org",
                n_referencias=4,
                kev=True,
                modificado="2026-11-03T05:00:00.000",
            ),
            cve("CVE-2", metricas={"cvssMetricV40": [metrica_v4(8.1, interaccion="PASSIVE")]}),
        ]
    )
    df, _ = cargar(guardar(crudo, INICIO, FIN, "api", carpeta=tmp_path))
    assert list(df.columns) == list(COLUMNAS) and len(COLUMNAS) == 20
    assert df.loc[0, ["complejidad_ataque", "interaccion_usuario", "fuente"]].tolist() == [
        "HIGH", "REQUIRED", "cna@ejemplo.org"
    ]
    assert (df.loc[0, "n_referencias"], df.loc[0, "kev"]) == ("4", "True")
    assert df.loc[0, "ultima_modificacion"] == "2026-11-03T05:00:00.000"
    assert df.loc[1, "interaccion_usuario"] == "REQUIRED" and pd.isna(df.loc[1, "puntaje_impacto"])

def test_lo_guardado_se_depura_igual_que_lo_descargado(tmp_path: Path) -> None:
    crudo = _crudo()
    leido, _ = cargar(guardar(crudo, INICIO, FIN, "api", carpeta=tmp_path))
    directo, desde_csv = depurar(crudo), depurar(leido)
    assert desde_csv.conteo == directo.conteo
    pd.testing.assert_frame_equal(desde_csv.omega, directo.omega, check_dtype=False)

def test_guardar_usa_dir_datos_por_defecto() -> None:
    ruta = guardar(_crudo(), INICIO, FIN, "api")
    assert ruta.parent == config.dir_datos()  # carpeta temporal del conftest

def test_ultimo(tmp_path: Path) -> None:
    assert ultimo(tmp_path / "no-existe") is None
    assert ultimo(tmp_path) is None
    viejo = guardar(_crudo(), INICIO, FIN, "api", carpeta=tmp_path)
    nuevo = guardar(_crudo(), None, None, "csv", carpeta=tmp_path)
    os.utime(viejo, (1, 1))  # fuerza que el primero sea el más antiguo
    assert ultimo(tmp_path) == nuevo

def test_ultimo_ignora_csv_sin_metadatos(tmp_path: Path) -> None:
    (tmp_path / "cves_suelto.csv").write_text("cve_id\n", encoding="utf-8")
    assert ultimo(tmp_path) is None

def test_leer_csv_minimo_completa_columnas() -> None:
    contenido = (
        "cve_id,publicado,base_score,vector_ataque,privilegios\n"
        "CVE-1,2026-11-01T10:00:00,9.1,NETWORK,NONE\n"
        "CVE-2,2026-11-01T11:00:00,,LOCAL,LOW\n"
    ).encode()
    df = leer_csv(contenido)
    assert list(df.columns) == list(COLUMNAS)
    assert df["severidad"].iloc[0] == "CRITICAL"  # deducida de la puntuación
    assert pd.isna(df["severidad"].iloc[1]) and pd.isna(df["estado"].iloc[0])

def test_leer_csv_con_el_formato_de_9_columnas_sigue_funcionando() -> None:
    contenido = (
        "cve_id,publicado,estado,version_cvss,base_score,severidad,vector_ataque,privilegios,cwe\n"
        "CVE-1,2026-11-01T10:00:00,Analyzed,3.1,9.8,CRITICAL,NETWORK,NONE,CWE-79\n"
    ).encode()
    df = leer_csv(contenido)
    assert list(df.columns) == list(COLUMNAS)
    assert df.loc[0, "cwe"] == "CWE-79" and pd.isna(df.loc[0, "fuente"]) and pd.isna(df.loc[0, "kev"])
    omega = depurar(df).omega
    assert len(omega) == 1 and pd.isna(omega.loc[0, "n_referencias"])  # no se inventan valores

def test_leer_csv_con_puntuacion_invalida_no_deduce_severidad() -> None:
    contenido = b"cve_id,publicado,base_score,vector_ataque,privilegios\nCVE-1,2026-11-01,abc,NETWORK,NONE\n"
    df = leer_csv(contenido)
    assert df.loc[0, "base_score"] == "abc" and pd.isna(df.loc[0, "severidad"])

def test_leer_csv_con_bom_de_excel() -> None:
    contenido = "﻿cve_id,publicado,base_score,vector_ataque,privilegios\nCVE-1,2026-11-01,7.5,NETWORK,NONE\n"
    assert leer_csv(contenido.encode("utf-8"))["cve_id"].iloc[0] == "CVE-1"

@pytest.mark.parametrize(
    ("contenido", "mensaje"),
    [
        (b"cve_id,base_score\nCVE-1,9.8\n", "faltan columnas"),
        (b"cve_id,publicado,base_score,vector_ataque,privilegios\n", "no tiene filas"),
        (b"", "No se pudo leer"),
        ("cve_id;publicado\nñ".encode("latin-1"), "No se pudo leer"),
    ],
)
def test_leer_csv_invalido(contenido: bytes, mensaje: str) -> None:
    with pytest.raises(ErrorCSV, match=mensaje):
        leer_csv(contenido)

class ClienteFalso:
    def __init__(self, *args: object, **kwargs: object) -> None:
        pass

    def descargar(self, inicio: date, fin: date) -> list[dict]:
        return [cve("CVE-1", metricas={"cvssMetricV31": [metrica(9.8)]}), cve("CVE-2", estado="Rejected")]

class ClienteQueFalla(ClienteFalso):
    def descargar(self, inicio: date, fin: date) -> list[dict]:
        raise ErrorNVD("HTTP 503")

def test_script_de_descarga(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    monkeypatch.setattr(descargar, "ClienteNVD", ClienteFalso)
    assert descargar.main(["2026-11-01", "2026-11-02"]) == 0
    salida = capsys.readouterr().out
    assert (
        "Descargados: 2 | Rechazados: 1 | Duplicados: 0 | Sin puntuación: 0 | Formato inválido: 0 | N: 1" in salida
    )
    ruta = almacen.ultimo()
    assert ruta is not None
    assert json.loads(ruta.with_suffix(".json").read_text(encoding="utf-8"))["inicio"] == "2026-11-01"

def test_script_de_descarga_con_error(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    monkeypatch.setattr(descargar, "ClienteNVD", ClienteQueFalla)
    assert descargar.main(["2026-11-01", "2026-11-02"]) == 1
    assert "HTTP 503" in capsys.readouterr().out
    assert almacen.ultimo() is None

def test_script_fechas_invertidas() -> None:
    with pytest.raises(SystemExit):
        descargar.main(["2026-11-02", "2026-11-01"])
