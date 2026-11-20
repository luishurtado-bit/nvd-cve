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

export function descargarGraficaPng(contenedorId: string, nombreArchivo: string): void {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const svg = contenedor.querySelector("svg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const ancho = rect.width || 600;
  const alto = rect.height || 300;

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(prepararSvg(svg, ancho, alto));
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const escala = 2; // Alta resolución para el informe
    const canvas = document.createElement("canvas");
    canvas.width = (ancho + 2 * MARGEN) * escala;
    canvas.height = (alto + 2 * MARGEN) * escala;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(escala, escala);
      ctx.drawImage(img, 0, 0);

      const enlace = document.createElement("a");
      enlace.download = `${nombreArchivo}.png`;
      enlace.href = canvas.toDataURL("image/png");
      enlace.click();
    }
    URL.revokeObjectURL(url);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}
