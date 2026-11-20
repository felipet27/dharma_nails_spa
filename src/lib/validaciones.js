// Validaciones de seguridad reutilizables en las rutas de API.

// Tipos de imagen permitidos para comprobantes de pago.
const MIME_COMPROBANTE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Límite del tamaño real de la imagen (bytes decodificados), no del string base64.
const MAX_COMPROBANTE_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Valida un comprobante enviado como data URL base64.
 * Devuelve { ok: true, valor } con el data URL saneado, o { ok: false, error }.
 * Un comprobante vacío/ausente es válido (no requerido a este nivel).
 */
export function validarComprobante(comprobante) {
  if (!comprobante) return { ok: true, valor: "" };

  if (typeof comprobante !== "string")
    return { ok: false, error: "Comprobante inválido" };

  // Formato esperado: data:image/xxx;base64,AAAA...
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(comprobante);
  if (!match)
    return { ok: false, error: "El comprobante debe ser una imagen válida" };

  const [, mime, datos] = match;
  if (!MIME_COMPROBANTE.includes(mime.toLowerCase()))
    return { ok: false, error: "Formato de imagen no permitido (usa JPG, PNG, WEBP o GIF)" };

  // Tamaño real aproximado a partir de la longitud base64.
  const padding = (datos.match(/=+$/) || [""])[0].length;
  const bytes = Math.floor((datos.length * 3) / 4) - padding;
  if (bytes > MAX_COMPROBANTE_BYTES)
    return { ok: false, error: "El comprobante no debe superar 4 MB" };

  return { ok: true, valor: comprobante };
}

// ---------------------------------------------------------------------------
// Validación de tipos de entrada.
//
// Los valores que llegan en el cuerpo JSON pueden ser objetos en vez de texto
// (p. ej. {"$ne": null}). Si llegan así a un filtro de MongoDB funcionan como
// operadores (inyección NoSQL). Toda entrada que vaya a una consulta debe
// pasar antes por estas funciones.
// ---------------------------------------------------------------------------

export function esTexto(v, max = 2000) {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}

// 'YYYY-MM-DD' con valores de calendario razonables.
export function esFecha(v) {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);
}

// 'HH:mm' en 24 horas.
export function esHora(v) {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

// Imagen en base64 (foto de perfil, QR de pago) con tamaño máximo en bytes reales.
export function esImagenBase64(v, maxBytes = 3 * 1024 * 1024) {
  if (v === "") return true;
  if (typeof v !== "string") return false;
  if (/^https:\/\/\S+$/i.test(v) && v.length <= 2000) return true; // URL pública
  const m = /^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!m) return false;
  return Math.floor((m[2].length * 3) / 4) <= maxBytes;
}
