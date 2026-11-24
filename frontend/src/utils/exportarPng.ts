const COLORES_EXPORTACION: Record<string, string> = {
  "--border": "#e2e8f0",
  "--muted-foreground": "#64748b",
  "--foreground": "#0f172a",
};

// Un <svg> serializado y cargado como imagen queda fuera de la página: no ve las variables CSS
// ni la fuente de la app. Se sustituyen las var(--x) por su color y se fija la fuente.
function resolverVariables(valor: string): string {
  return valor.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, (original, nombre: string) => {
    const guardado = COLORES_EXPORTACION[nombre];
    if (guardado) return guardado;
    const actual = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
    return actual || original;
  });
}

// Margen (en px) alrededor del gráfico: las etiquetas de los ejes sobresalen del <svg>
// (p. ej. el último valor del eje X) y sin margen quedarían cortadas en el PNG.
const MARGEN = 16;

function prepararSvg(svg: SVGSVGElement, ancho: number, alto: number): SVGSVGElement {
  const copia = svg.cloneNode(true) as SVGSVGElement;
  for (const elemento of [copia, ...Array.from(copia.querySelectorAll("*"))]) {
    for (const atributo of Array.from(elemento.attributes)) {
      if (atributo.value.includes("var(")) {
        elemento.setAttribute(atributo.name, resolverVariables(atributo.value));
      }
    }
  }
  copia.setAttribute("font-family", getComputedStyle(svg).fontFamily);
  copia.setAttribute("width", String(ancho + 2 * MARGEN));
  copia.setAttribute("height", String(alto + 2 * MARGEN));
  copia.setAttribute("viewBox", `${-MARGEN} ${-MARGEN} ${ancho + 2 * MARGEN} ${alto + 2 * MARGEN}`);
  copia.setAttribute("overflow", "visible");
  return copia;
}

export interface ItemLeyendaPng {
  color: string;
  texto: string;
  forma?: "cuadro" | "linea";
}

export interface OpcionesPng {
  /** Título de la imagen; sin él, el PNG es solo el gráfico. */
  titulo?: string;
  /** La pregunta que responde el gráfico, debajo del título. */
  subtitulo?: string;
  leyenda?: ItemLeyendaPng[];
  /** Pie de la imagen: fuente, fecha de consulta, periodo y N. */
  fuente?: string;
  /** Fondo de la imagen. En modo oscuro es el de la tarjeta, para que las letras claras se lean. */
  fondo: string;
  /** Color del título y de la leyenda. */
  texto: string;
  /** Color del subtítulo y de la fuente (por defecto, el mismo del texto). */
  textoSuave?: string;
}

const RELLENO = 20; // espacio entre el borde de la imagen y su contenido
const ESCALA = 2; // alta resolución, para el informe
const ANCHO_MINIMO = 640; // un gráfico angosto igual necesita espacio para el título

/** Parte un texto en líneas que no pasen de `anchoMax` (con la fuente que tenga puesta el contexto). */
function envolver(ctx: CanvasRenderingContext2D, texto: string, anchoMax: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  // Solo se parte en espacios normales: el espacio duro de «8,7 %» no debe separarse del número
  for (const palabra of texto.split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ctx.measureText(prueba).width > anchoMax) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

interface Bloque {
  lineas: string[];
  fuente: string;
  interlineado: number;
}

function medirBloque(ctx: CanvasRenderingContext2D, texto: string | undefined, fuente: string, interlineado: number, anchoMax: number): Bloque {
  ctx.font = fuente;
  return { lineas: texto ? envolver(ctx, texto, anchoMax) : [], fuente, interlineado };
}

const altoBloque = (b: Bloque) => b.lineas.length * b.interlineado;

const ANCHO_ICONO = 14;
const SEPARACION_ICONO = 6;
const SEPARACION_ITEMS = 20;
const ALTO_FILA_LEYENDA = 22;

/** Reparte los elementos de la leyenda en filas que quepan en `anchoMax`. */
function filasDeLeyenda(ctx: CanvasRenderingContext2D, items: ItemLeyendaPng[], anchoMax: number): ItemLeyendaPng[][] {
  const filas: ItemLeyendaPng[][] = [[]];
  let usado = 0;
  for (const item of items) {
    const ancho = ANCHO_ICONO + SEPARACION_ICONO + ctx.measureText(item.texto).width;
    if (usado > 0 && usado + ancho > anchoMax) {
      filas.push([]);
      usado = 0;
    }
    filas[filas.length - 1].push(item);
    usado += ancho + SEPARACION_ITEMS;
  }
  return filas;
}

function componer(img: HTMLImageElement, anchoSvg: number, altoSvg: number, familia: string, o: OpcionesPng): HTMLCanvasElement {
  const anchoContenido = Math.max(anchoSvg, ANCHO_MINIMO);
  const medida = document.createElement("canvas").getContext("2d");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!medida || !ctx) return canvas;

  // 1. Medir: cuánto ocupa cada bloque, para darle su tamaño al lienzo
  const titulo = medirBloque(medida, o.titulo, `bold 18px ${familia}`, 24, anchoContenido);
  const subtitulo = medirBloque(medida, o.subtitulo, `14px ${familia}`, 19, anchoContenido);
  const fuente = medirBloque(medida, o.fuente, `12px ${familia}`, 16, anchoContenido);
  medida.font = `13px ${familia}`;
  const filasLeyenda = o.leyenda?.length ? filasDeLeyenda(medida, o.leyenda, anchoContenido) : [];

  const alto =
    RELLENO +
    altoBloque(titulo) +
    (subtitulo.lineas.length ? altoBloque(subtitulo) + 4 : 0) +
    (titulo.lineas.length || subtitulo.lineas.length ? 8 : 0) +
    altoSvg +
    (filasLeyenda.length ? 8 + filasLeyenda.length * ALTO_FILA_LEYENDA : 0) +
    (fuente.lineas.length ? 12 + altoBloque(fuente) : 0) +
    RELLENO;
  canvas.width = (anchoContenido + 2 * RELLENO) * ESCALA;
  canvas.height = alto * ESCALA;

  // 2. Dibujar (cambiar el tamaño del lienzo borra su estado: se vuelve a poner todo)
  ctx.scale(ESCALA, ESCALA);
  ctx.fillStyle = o.fondo;
  ctx.fillRect(0, 0, anchoContenido + 2 * RELLENO, alto);
  ctx.textBaseline = "top";
  let y = RELLENO;

  const escribir = (b: Bloque, color: string) => {
    ctx.font = b.fuente;
    ctx.fillStyle = color;
    for (const linea of b.lineas) {
      ctx.fillText(linea, RELLENO, y);
      y += b.interlineado;
    }
  };
  escribir(titulo, o.texto);
  if (subtitulo.lineas.length) {
    y += 4;
    escribir(subtitulo, o.textoSuave ?? o.texto);
  }
  if (titulo.lineas.length || subtitulo.lineas.length) y += 8;

  ctx.drawImage(img, RELLENO + (anchoContenido - anchoSvg) / 2, y);
  y += altoSvg;

  if (filasLeyenda.length) {
    y += 8;
    ctx.font = `13px ${familia}`;
    for (const fila of filasLeyenda) {
      let x = RELLENO;
      for (const item of fila) {
        ctx.fillStyle = item.color;
        if (item.forma === "linea") ctx.fillRect(x, y + 8, ANCHO_ICONO, 3);
        else ctx.fillRect(x, y + 4, ANCHO_ICONO - 2, ANCHO_ICONO - 2);
        ctx.fillStyle = o.texto;
        ctx.fillText(item.texto, x + ANCHO_ICONO + SEPARACION_ICONO, y + 3);
        x += ANCHO_ICONO + SEPARACION_ICONO + ctx.measureText(item.texto).width + SEPARACION_ITEMS;
      }
      y += ALTO_FILA_LEYENDA;
    }
  }

  if (fuente.lineas.length) {
    y += 12;
    escribir(fuente, o.textoSuave ?? o.texto);
  }
  return canvas;
}

/**
 * Guarda como PNG el gráfico (el primer <svg> de Recharts) que hay dentro de `contenedor`, con su
 * título, la pregunta que responde, la leyenda y la fuente. La leyenda no sale de Recharts porque
 * <Legend> se dibuja fuera del <svg>; por eso se pasa aparte.
 */
export function descargarPng(contenedor: HTMLElement, nombreArchivo: string, opciones: OpcionesPng): void {
  const svg = contenedor.querySelector<SVGSVGElement>("svg.recharts-surface") ?? contenedor.querySelector("svg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const ancho = rect.width || 600;
  const alto = rect.height || 300;
  const familia = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";

  const svgString = new XMLSerializer().serializeToString(prepararSvg(svg, ancho, alto));
  const url = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }));

  const img = new Image();
  img.onload = () => {
    const canvas = componer(img, ancho + 2 * MARGEN, alto + 2 * MARGEN, familia, opciones);
    const enlace = document.createElement("a");
    enlace.download = `${nombreArchivo}.png`;
    enlace.href = canvas.toDataURL("image/png");
    enlace.click();
    URL.revokeObjectURL(url);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

/** Versión anterior, por id del contenedor y sin título: la usa el dashboard viejo hasta que se reemplace. */
export function descargarGraficaPng(contenedorId: string, nombreArchivo: string): void {
  const contenedor = document.getElementById(contenedorId);
  if (contenedor) descargarPng(contenedor, nombreArchivo, { fondo: "#ffffff", texto: "#0f172a" });
}
