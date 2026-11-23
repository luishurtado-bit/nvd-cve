import argparse
from datetime import date
from pathlib import Path
import config
from nvd import almacen
from nvd.cliente import ClienteNVD, ErrorNVD
from nvd.depuracion import depurar

def descargar_y_guardar(inicio: date, fin: date, cliente: ClienteNVD) -> Path:
    """Descarga los CVE publicados en el periodo (por rango, en tramos de 120 días)
    y los guarda en data/: base original, CSV de 20 columnas y metadatos.
    Devuelve la ruta del CSV, que es lo que se carga después."""
    return almacen.guardar_descarga(cliente.descargar(inicio, fin), inicio, fin)

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
        ruta = descargar_y_guardar(args.inicio, args.fin, cliente)
    except ErrorNVD as e:
        print(f"Error: {e}")
        return 1
    conteo = depurar(almacen.cargar(ruta)[0]).conteo
    print(f"Guardado en {ruta}")
    print(
        f"Descargados: {conteo.descargados} | Rechazados: {conteo.rechazados} | "
        f"Duplicados: {conteo.duplicados} | Sin puntuación: {conteo.sin_puntuacion} | "
        f"Formato inválido: {conteo.formato_invalido} | N: {conteo.N}"
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
