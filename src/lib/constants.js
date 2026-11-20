// Constantes de negocio de Dharma Nails Spa

import { EMOJI } from "./emojis";

export const ROLES = {
  ADMIN: "admin",
  BARBERO: "barbero",
};

export const ESTADO_BARBERO = {
  PENDIENTE: "pendiente",
  ACTIVO: "activo",
  RECHAZADO: "rechazado",
  INACTIVO: "inactivo", // suscripción vencida
};

export const ESTADO_CITA = {
  SOLICITADA: "solicitada",
  CONFIRMADA: "confirmada",
  RECHAZADA: "rechazada",
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
  NO_ASISTIO: "no_asistio",
};

export const METODOS_PAGO = {
  NEQUI: "nequi",
  DAVIPLATA: "daviplata",
  QR: "qr",
  CUENTA: "cuenta",
  EFECTIVO: "efectivo",
};

export const METODOS_PAGO_LABEL = {
  nequi: "Nequi",
  daviplata: "Daviplata",
  qr: "Código QR",
  cuenta: "Cuenta bancaria",
  efectivo: "Efectivo",
};

// Cada servicio tiene una clave interna (`key`) que se guarda en las citas. Los
// 3 servicios iniciales usan bronce/plata/oro por herencia; los que agrega el
// admin reciben una clave generada. El nombre visible es el campo `nombre`.
export const MAX_SERVICIOS = 30;

// Servicios de Dharma Nails Spa (tomados del Instagram @dharma.nails.spa).
// PRECIOS Y DURACIONES PROVISIONALES: ajustarlos en "Configurar planes".
// Emojis del módulo centralizado (ver ./emojis).

const PLANES_SPA = [
  {
    key: "bronce",
    nombre: "Semipermanente",
    servicios: [`${EMOJI.UNAS} Esmaltado semipermanente`],
    precio: 45000,
    duracion: 60,
    anticipo: 0,
    metodosPago: ["nequi", "daviplata", "qr", "cuenta", "efectivo"],
    activo: true,
  },
  {
    key: "plata",
    nombre: "Press on",
    servicios: [`${EMOJI.BRILLO} Uñas press on`],
    precio: 60000,
    duracion: 90,
    anticipo: 50,
    metodosPago: ["nequi", "daviplata", "qr", "cuenta"],
    activo: true,
  },
  {
    key: "oro",
    nombre: "Acrigel",
    servicios: [`${EMOJI.FLOR} Uñas en acrigel`],
    precio: 80000,
    duracion: 120,
    anticipo: 50,
    metodosPago: ["nequi", "daviplata", "qr", "cuenta"],
    activo: true,
  },
];

export function planesDefaultPorMarca(marcaId) {
  // Dharma Nails Spa usa siempre las plantillas de spa (editables por el admin).
  return PLANES_SPA.map((p) => ({ ...p }));
}

// Planes base para especialistas nuevas
export const PLANES_DEFAULT = PLANES_SPA;

export const DIAS_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

// Horario laboral por defecto de una especialista nueva
export const HORARIO_DEFAULT = {
  horaInicio: "10:00",
  horaFin: "19:00",
  // 1=lunes ... 6=sábado (0=domingo). Por defecto lunes a sábado.
  diasLaborales: [1, 2, 3, 4, 5, 6],
  // Cada cuántos minutos se ofrece una hora de inicio
  duracionTurnoMin: 30,
  // Hora de almuerzo (se aplica a los días laborales). Desactivada por defecto.
  almuerzo: {
    activo: false,
    horaInicio: "13:00",
    horaFin: "14:00",
  },
};

// Opciones de "cada cuánto se ofrecen horas de inicio" (horario.duracionTurnoMin).
export const INTERVALOS_INICIO_OPCIONES = [15, 20, 30, 45, 60];

// Datos por defecto de la sede principal
export const BARBERIA_SEDE_DEFAULT = {
  local: "Dharma Nails Spa",
  ciudad: "Caldas, Antioquia",
  direccion: "",
};

export const VENTANA_CANCELACION_HORAS_DEFAULT = 24;

export function formatoCOP(valor) {
  if (valor == null || isNaN(valor)) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
