import argparse
from datetime import date
import pandas as pd
import config
from nvd import almacen
from nvd.cliente import ClienteNVD, ErrorNVD
from nvd.depuracion import depurar
from nvd.extraccion import a_dataframe

def descargar_periodo(inicio: date, fin: date, cliente: ClienteNVD) -> pd.DataFrame:
    """Descarga los CVE del periodo y los deja en filas planas (sin depurar)."""
    return a_dataframe(cliente.descargar(inicio, fin))

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m nvd.descargar",
        description="Descarga los CVE publicados en un periodo y los guarda en data/.",
    )
    parser.add_argument("inicio", type=date.fromisoformat, help="AAAA-MM-DD")
    parser.add_argument("fin", type=date.fromisoformat, help="AAAA-MM-DD")
    args = parser.parse_args(argv)
    if args.fin < args.inicio:
        parser.error("fin debe ser igual o posterior a inicio")

    clave = config.nvd_api_key()
    print(f"Descargando de {args.inicio} a {args.fin} ({'con' if clave else 'sin'} clave de la NVD)")
    cliente = ClienteNVD(api_key=clave, progreso=print)
    try:
        df = descargar_periodo(args.inicio, args.fin, cliente)
    except ErrorNVD as e:
        print(f"Error: {e}")
        return 1
    ruta = almacen.guardar(df, args.inicio, args.fin, "api")
    conteo = depurar(df).conteo
    print(f"Guardado en {ruta}")
    print(
        f"Descargados: {conteo.descargados} | Rechazados: {conteo.rechazados} | "
        f"Duplicados: {conteo.duplicados} | Sin puntuación: {conteo.sin_puntuacion} | "
        f"Formato inválido: {conteo.formato_invalido} | N: {conteo.N}"
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
