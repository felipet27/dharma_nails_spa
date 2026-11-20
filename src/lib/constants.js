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

// Duración de cada plan en minutos (incluye 5 min de buffer entre citas)
// Bronce: 30 - 5 = 25 ; Plata/Oro: 60 - 5 = 55
export const PLANES_KEYS = ["bronce", "plata", "oro"];

// Plantillas de planes por marca. Precios de ejemplo, editables por el admin.
// Emojis del módulo centralizado (ver ./emojis).

const PLANES_SPA = [
  {
    key: "bronce",
    nombre: "Bronce",
    servicios: [`${EMOJI.UNAS} Manicure básico`],
    precio: 25000,
    duracion: 30,
    anticipo: 0,
    metodosPago: ["nequi", "daviplata", "qr", "cuenta", "efectivo"],
    activo: true,
  },
  {
    key: "plata",
    nombre: "Plata",
    servicios: [
      `${EMOJI.UNAS} Manicure semipermanente`,
      `${EMOJI.BRILLO} Pedicure`,
    ],
    precio: 55000,
    duracion: 60,
    anticipo: 50,
    metodosPago: ["nequi", "daviplata", "qr", "cuenta"],
    activo: true,
  },
  {
    key: "oro",
    nombre: "Oro",
    servicios: [
      `${EMOJI.UNAS} Manicure semipermanente`,
      `${EMOJI.BRILLO} Pedicure`,
      `${EMOJI.MASAJE} Hidratación de manos`,
      `${EMOJI.FLOR} Diseño y decoración`,
    ],
    precio: 85000,
    duracion: 90,
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

// Horario laboral por defecto de un barbero nuevo
export const HORARIO_DEFAULT = {
  horaInicio: "10:00",
  horaFin: "19:00",
  // 1=lunes ... 6=sábado (0=domingo). Por defecto lunes a sábado.
  diasLaborales: [1, 2, 3, 4, 5, 6],
  // Duración estándar por corte / turno en minutos
  duracionTurnoMin: 30,
  // Hora de almuerzo (se aplica a los días laborales). Desactivada por defecto.
  almuerzo: {
    activo: false,
    horaInicio: "13:00",
    horaFin: "14:00",
  },
};

export const DURACIONES_CORTE_OPCIONES = [20, 25, 30, 35, 40, 45, 50, 60];

// Datos por defecto de la sede/barbería principal
export const BARBERIA_SEDE_DEFAULT = {
  local: "Dharma Nails Spa",
  ciudad: "",
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
