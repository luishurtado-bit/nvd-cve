export function descargarGraficaPng(contenedorId: string, nombreArchivo: string): void {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor) return;

  const svg = contenedor.querySelector("svg");
  if (!svg) return;

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const rect = svg.getBoundingClientRect();
    const escala = 2; // Alta resolución para el informe
    const canvas = document.createElement("canvas");
    canvas.width = (rect.width || 600) * escala;
    canvas.height = (rect.height || 300) * escala;

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
  img.src = url;
}