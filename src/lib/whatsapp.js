import { METODOS_PAGO_LABEL, formatoCOP } from "./constants";
import { EMOJI as E } from "./emojis";
import { formatearHora12 } from "./disponibilidad";
import { obtenerMarca, capitalizar } from "./brands";

// Sitio del proyecto: se usa como firma promocional en los mensajes que llegan
// al cliente final, para dar a conocer la plataforma.
const SITIO_URL_DEFAULT = "https://dharma-nails-spa.vercel.app";

// Resuelve la URL del sitio validando que sea realmente una URL http(s). Si la
// variable de entorno viene vacía o mal configurada (p. ej. en Vercel quedó
// pegado un token/clave en vez de la dirección), se descarta para no mostrar
// texto basura en el mensaje del cliente. Se quita el "/" final para una firma
// limpia.
function resolverSitioUrl() {
  const raw = (process.env.NEXT_PUBLIC_BASE_URL || "").trim();
  if (/^https?:\/\/\S+$/i.test(raw)) {
    return raw.replace(/\/+$/, "");
  }
  return SITIO_URL_DEFAULT;
}

const SITIO_URL = resolverSitioUrl();

// Pie para mensajes dirigidos al cliente con el enlace al sitio del spa.
// Respeta el modo "plano" (PC/WhatsApp Desktop) donde los emojis se corrompen.
function firmaSitio(marca, { plano = false } = {}) {
  const url = SITIO_URL;
  const texto = marca.textos.firmaCitas || "Agenda tus citas fácil con";
  if (plano) {
    return `\n\n${texto} ${marca.nombre}:\n${url}`;
  }
  return `\n\n${E.CALENDARIO} _${texto}_ *${marca.nombre}*\n👉 ${url}`;
}

// Nombre del negocio para los mensajes, con respaldo según el nicho
// ("el spa").
function nombreNegocio(barbero, marca) {
  if (barbero?.local) return barbero.local;
  const articulo = marca.textos.negocio === "spa" ? "el" : "la";
  return `${articulo} ${marca.textos.negocio}`;
}

// Emoji por clave; NICHO es el emoji de la marca (esmalte).
function emojiDe(k, marca) {
  return k === "NICHO" ? marca.textos.emoji : E[k];
}

export function normalizarCelular(celular) {
  if (!celular) return "";
  let n = String(celular).replace(/\D/g, "");
  if (n.startsWith("57")) return n;
  if (n.length === 10) return "57" + n;
  return n;
}

// plano=true limpia el texto para WhatsApp Desktop (ver textoParaPC). Los
// espacios duros que mete Intl ("$ 45.000", "10:00 a. m.") se cambian siempre
// por espacios normales: en algunos equipos se ven como un cuadro.
export function linkWhatsApp(celular, mensaje, { plano = false } = {}) {
  const num = normalizarCelular(celular);
  const limpio = plano ? textoParaPC(mensaje || "") : String(mensaje || "").replace(/[\u00A0\u202F]/g, " ");
  return `https://wa.me/${num}?text=${encodeURIComponent(limpio)}`;
}

// Deja un mensaje en texto simple para WhatsApp Desktop (PC), que al abrir el
// enlace wa.me en Windows convierte emojis y algunos símbolos en "�" o "??".
// Quita emojis, cambia comillas/guiones tipográficos por sus versiones simples
// y ordena los espacios SIN tocar los saltos de línea. Las tildes y la ñ se
// conservan (se ven bien). El *negrita* y _cursiva_ de WhatsApp también.
export function textoParaPC(s) {
  return String(s)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{200B}-\u{200D}\u{20E3}\u{E0000}-\u{E007F}]/gu, "")
    .replace(/[\u{10000}-\u{10FFFF}]/gu, "") // cualquier otro carácter fuera del plano básico
    .replace(/[\u00A0\u202F\u2007\u2009]/g, " ")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2022/g, "-")
    .split("\n")
    .map((linea) => linea.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Quita emojis y selectores de variación de un texto. Se usa en la versión
// "plana" (PC), donde WhatsApp Desktop en Windows corrompe los emojis a "�".
function limpiarEmojis(s) {
  return String(s)
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE0F}\u{200D}]/gu,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

// plano=true -> mensaje sin emojis (para PC/WhatsApp Desktop, más estético y sin "�").
// plano=false -> mensaje con emojis (para móvil, donde se ven bien).
export function mensajeNuevaCita(cita, barbero, { plano = false } = {}) {
  const plan = cita.planSnapshot || {};
  const marca = obtenerMarca(barbero?.marca);
  const em = (k) => (plano ? "" : `${emojiDe(k, marca)} `);
  const servicios = (plan.servicios || [])
    .map((s) => (plano ? limpiarEmojis(s) : s))
    .join(", ");
  const fecha = formatearFecha(cita.fecha);

  let texto =
    `${em("NICHO")}*Nueva cita solicitada*\n\n` +
    `${em("PERSONA")}*Clienta:* ${cita.clienteNombre}\n` +
    `${em("CELULAR")}*Cel:* ${cita.clienteCelular}\n` +
    `${em("UNAS")}*Servicio:* ${plan.nombre || cita.plan}\n` +
    `*Incluye:* ${servicios}\n` +
    `${em("CALENDARIO")}*Fecha:* ${fecha}\n` +
    `${em("RELOJ")}*Hora:* ${formatearHora12(cita.horaInicio)} - ${formatearHora12(cita.horaFin)} (${plan.duracion} min)\n` +
    `${em("BILLETE")}*Valor:* ${formatoCOP(plan.precio)}\n`;

  if (cita.metodoPago) {
    texto += `${em("DINERO")}*Pago:* ${METODOS_PAGO_LABEL[cita.metodoPago] || cita.metodoPago}\n`;
  }
  if ((plan.anticipo || 0) > 0) {
    const monto = Math.round((plan.precio * plan.anticipo) / 100);
    texto += `\n${em("BILLETE")}*Anticipo (${plan.anticipo}%):* ${formatoCOP(monto)} - te adjunto el comprobante.\n`;
  }
  texto += `\n_¡Quedo pendiente de la confirmación!_`;
  return plano ? textoParaPC(texto) : texto;
}

export function mensajeConfirmacion(cita, barbero, { plano = false } = {}) {
  const plan = cita.planSnapshot || {};
  const marca = obtenerMarca(barbero?.marca);
  const em = (k) => (plano ? "" : `${emojiDe(k, marca)} `);
  const servicios = (plan.servicios || [])
    .map((s) => (plano ? limpiarEmojis(s) : s))
    .join(", ");
  const fecha = formatearFecha(cita.fecha);
  const cierreTitulo = plano ? "" : ` ${marca.textos.emoji}`;
  const direccion = barbero?.direccion
    ? `\n${em("UBICACION")}*Dirección:* ${barbero.direccion}`
    : "";
  const tituloCliente = marca.textos.sujetoCliente
    ? `¡La cita de ${marca.textos.sujetoCliente} quedó confirmada en ${nombreNegocio(barbero, marca)}!`
    : `¡Tu cita quedó confirmada en ${nombreNegocio(barbero, marca)}!`;
  const texto = (
    `${em("NICHO")}*${tituloCliente}*${cierreTitulo}\n\n` +
    `${em("PERSONA")}*${capitalizar(marca.textos.profesional)}:* ${barbero?.nombre || ""}\n` +
    `${em("UNAS")}*Servicio:* ${plan.nombre || cita.plan}\n` +
    `*Incluye:* ${servicios}\n` +
    `${em("CALENDARIO")}*Fecha:* ${fecha}\n` +
    `${em("RELOJ")}*Hora:* ${formatearHora12(cita.horaInicio)} - ${formatearHora12(cita.horaFin)} (${plan.duracion} min)\n` +
    `${em("BILLETE")}*Valor:* ${formatoCOP(plan.precio)}` +
    direccion +
    `\n\n_${marca.textos.cierreEspera || "¡Te esperamos!"}_` +
    firmaSitio(marca, { plano })
  );
  return plano ? textoParaPC(texto) : texto;
}

export function mensajeRechazo(cita, barbero, { plano = false } = {}) {
  const marca = obtenerMarca(barbero?.marca);
  const sujeto = marca.textos.sujetoCliente;
  const motivo = sujeto
    ? `atender a ${sujeto} para el`
    : `atender tu cita para el`;
  const texto = (
    `Hola ${cita.clienteNombre}, soy *${barbero?.nombre || ""}* de *${nombreNegocio(barbero, marca)}*.\n\n` +
    `Lamentablemente no puedo ${motivo} ` +
    `${formatearFecha(cita.fecha)} a las ${formatearHora12(cita.horaInicio)}.\n\n` +
    `_Hablemos para reprogramar._`
  );
  return plano ? textoParaPC(texto) : texto;
}

export function mensajeCancelacion(cita, barbero, { motivo = "", plano = false } = {}) {
  const detalleMotivo = motivo ? `\n\n*Motivo:* ${motivo}` : "";
  const marca = obtenerMarca(barbero?.marca);
  const sujeto = marca.textos.sujetoCliente;
  const citaRef = sujeto ? `la cita de ${sujeto}` : `tu cita`;
  const texto = (
    `Hola ${cita.clienteNombre}, soy *${barbero?.nombre || ""}* de *${nombreNegocio(barbero, marca)}*.\n\n` +
    `Tuve que cancelar ${citaRef} para el ` +
    `${formatearFecha(cita.fecha)} a las ${formatearHora12(cita.horaInicio)}.` +
    detalleMotivo +
    `\n\n_Escríbeme para reprogramar cuando quieras._`
  );
  return plano ? textoParaPC(texto) : texto;
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return "";
  try {
    // "YYYY-MM-DD" sin hora se parsea como UTC 00:00, lo que en Bogotá (UTC-5)
    // retrocede al día anterior. Forzar mediodía UTC garantiza el día correcto
    // en cualquier timezone entre UTC-11 y UTC+11.
    const d = new Date(fechaISO + "T12:00:00Z");
    return d.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "America/Bogota",
    });
  } catch {
    return String(fechaISO);
  }
}
