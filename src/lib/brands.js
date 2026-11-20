// Configuración de la marca de Dharma Nails Spa. Es la única fuente de verdad
// de nombre, colores, logos, favicon y textos. Se usa tanto en el navegador
// (header, componentes) como en el servidor (mensajes de WhatsApp, push,
// calendario), así que no debe importar nada de React.
//
// El proyecto nació como plataforma multimarca (CitasApp); se conserva la
// estructura BRANDS con una sola entrada para no tocar todo el código que lee
// la marca con useBrand()/obtenerMarca().

export const MARCA_DEFAULT = "dharma";
export const STORAGE_KEY = "dharma-brand";
export const PARAM_URL = "marca";

// Emojis por codepoint (misma regla que src/lib/emojis.js: nada literal).
const EMOJI = {
  ESMALTE: String.fromCodePoint(0x1F485),
};

// Datos de contacto públicos del spa (pie de página, mensajes).
export const CONTACTO = {
  whatsapp: "3113912426",
  instagram: "https://www.instagram.com/dharma.nails.spa/",
  instagramUsuario: "@dharma.nails.spa",
};

export const BRANDS = {
  dharma: {
    id: "dharma",
    slug: "dharmanailsspa", // dominio de los correos de las especialistas
    nombre: "Dharma Nails Spa",
    nicho: "Dharma", // se usa en la contraseña temporal de especialistas nuevas
    // Texto del logo en el header: primera parte en dorado, segunda en claro
    logoTexto: ["Dharma", "Nails Spa"],
    icono: "esmalte",
    colores: {
      brand: "#1f4a3a", // verde bosque del elefante
      brandOnDark: "#d4a55e", // dorado de las hojas, legible sobre fondo oscuro
      brandDeep: "#143328",
      brandSoft: "#e8efe9",
      brandAccent: "#c8954a", // dorado / cobre
      onBrand: "#ffffff",
    },
    stripe: "linear-gradient(90deg,#1f4a3a 0%,#8fae9a 35%,#c8954a 70%,#9a6332 100%)",
    logos: {
      oscuro: "/brand/dharma-logo.png",
      claro: "/brand/dharma-logo.png",
    },
    favicon: "/brand/dharma-icono.png",
    // Íconos de la app instalada, hechos con el logo principal completo.
    iconoApp: "/brand/dharma-app.png", // 1024x1024 (avisos de instalación)
    iconoApple: "/apple-touch-icon.png", // 180x180, pantalla de inicio del iPhone
    textos: {
      hero: "Tu momento de calma, sin filas ni esperas.",
      profesional: "especialista",
      profesionales: "especialistas",
      negocio: "spa",
      escogeProfesional: "Elige tu especialista",
      servicioEjemplo: "Manicure semipermanente",
      cta: "¡Agenda tu cita!",
      emoji: EMOJI.ESMALTE,
      sujetoCliente: null,
      cierreEspera: "¡Te esperamos!",
      firmaCitas: "Agenda tu próxima cita en",
      descHero: "Agenda con tu especialista de confianza en un momento. Solo das tu nombre y tu celular, y te llega la confirmación por WhatsApp.",
      ctaEscoger: "Elige con quién quieres agendar",
      verboAgendar: "Agenda",
    },
  },
};

export const LISTA_MARCAS = Object.values(BRANDS);

export function esMarcaValida(id) {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(BRANDS, id);
}

// Devuelve la configuración de una marca, cayendo a la de por defecto si el id
// no existe (p. ej. negocios antiguos sin campo `marca`).
export function obtenerMarca(id) {
  return BRANDS[esMarcaValida(id) ? id : MARCA_DEFAULT];
}

export function capitalizar(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

// "#e3262f" -> "227 38 47" (formato que Tailwind necesita para soportar
// modificadores de opacidad como bg-brand/10).
function canales(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const VARIABLES = {
  brand: "--brand",
  brandOnDark: "--brand-on-dark",
  brandDeep: "--brand-deep",
  brandSoft: "--brand-soft",
  brandAccent: "--brand-accent",
  onBrand: "--on-brand",
};

// Genera el CSS con las variables de cada marca bajo [data-brand="..."]. La
// marca por defecto también se aplica a :root para que la página nunca quede
// sin colores aunque el atributo todavía no exista.
export function cssDeMarcas() {
  return LISTA_MARCAS.map((m) => {
    const decl = Object.entries(VARIABLES)
      .map(([k, v]) => `${v}:${m.colores[k]};${v}-rgb:${canales(m.colores[k])};`)
      .join("");
    const selector = m.id === MARCA_DEFAULT ? `:root,[data-brand="${m.id}"]` : `[data-brand="${m.id}"]`;
    return `${selector}{${decl}--stripe:${m.stripe};}`;
  }).join("\n");
}

// Manifest de la PWA para una marca. Lo sirven app/manifest.js (marca por
// defecto).
export function manifestDeMarca(id) {
  const m = obtenerMarca(id);
  return {
    name: m.nombre,
    short_name: m.nombre,
    description: `${m.textos.hero} Agenda en ${m.nombre} sin llamadas ni filas.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#13241d", // --tinta
    theme_color: m.colores.brand,
    lang: "es-CO",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: m.iconoApp, sizes: "1024x1024", type: "image/png", purpose: "any" },
      // Android recorta los íconos "maskable" (círculo, gota…): estos dejan el
      // logo dentro de la zona segura para que no se corte.
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

// Script mínimo que corre en <head> antes de pintar: aplica la marca.
export function scriptMarcaInicial() {
  return `(function(){try{document.documentElement.setAttribute("data-brand",${JSON.stringify(MARCA_DEFAULT)})}catch(e){}})();`;
}
