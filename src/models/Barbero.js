import mongoose from "mongoose";
import {
  ESTADO_BARBERO,
  HORARIO_DEFAULT,
  VENTANA_CANCELACION_HORAS_DEFAULT,
} from "@/lib/constants";
import { BRANDS, MARCA_DEFAULT } from "@/lib/brands";

const PlanSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // clave interna única del servicio
    nombre: String,
    servicios: [String],
    precio: Number,
    duracion: Number, // minutos
    anticipo: Number, // % (0 = sin anticipo)
    metodosPago: [String],
    activo: { type: Boolean, default: true },
  },
  { _id: false }
);

// Horario semanal: un día con sus tramos de trabajo. El hueco entre dos tramos
// es una pausa (ver semanaDeHorario en lib/disponibilidad).
const TramoSchema = new mongoose.Schema(
  { ini: String, fin: String }, // 'HH:mm'
  { _id: false }
);
const DiaHorarioSchema = new mongoose.Schema(
  {
    dia: { type: Number, min: 0, max: 6 }, // 0 = domingo
    activo: { type: Boolean, default: false },
    tramos: { type: [TramoSchema], default: [] },
  },
  { _id: false }
);

const FranjaBloqueadaSchema = new mongoose.Schema(
  {
    fecha: String, // 'YYYY-MM-DD'
    horaInicio: String, // 'HH:mm'
    horaFin: String, // 'HH:mm'
    motivo: String,
  },
  { _id: true }
);

const BarberoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    local: { type: String, required: true },
    celular: { type: String, required: true },
    ciudad: { type: String, default: "" }, // se hereda de la sede; puede estar vacía
    direccion: { type: String, default: "" },
    foto: { type: String, default: "" }, // URL pública o base64
    redes: {
      instagram: { type: String, default: "" },
      facebook: { type: String, default: "" },
      tiktok: { type: String, default: "" },
    },
    email: { type: String, required: true, lowercase: true },
    // Submarca del negocio (barber | pet | spa). Define colores, textos y la
    // firma de los mensajes. Los negocios antiguos sin el campo son "barber".
    marca: {
      type: String,
      enum: Object.keys(BRANDS),
      default: MARCA_DEFAULT,
    },
    estado: {
      type: String,
      enum: Object.values(ESTADO_BARBERO),
      default: ESTADO_BARBERO.PENDIENTE,
    },
    // Datos de pago que se muestran al cliente (número Nequi/Daviplata, cuenta, QR)
    datosPago: {
      nequi: String,
      daviplata: String,
      cuenta: String,
      qrImagen: String, // base64 opcional
    },
    horario: {
      horaInicio: { type: String, default: HORARIO_DEFAULT.horaInicio },
      horaFin: { type: String, default: HORARIO_DEFAULT.horaFin },
      diasLaborales: { type: [Number], default: HORARIO_DEFAULT.diasLaborales },
      // Horario por día con sus pausas. Vacío = se usa el formato anterior
      // (horaInicio/horaFin/diasLaborales/almuerzo), que se mantiene
      // sincronizado como resumen.
      semana: { type: [DiaHorarioSchema], default: [] },
      // Intervalo de inicio: cada cuántos minutos se ofrece una hora para
      // empezar una cita (el nombre se conserva por compatibilidad).
      duracionTurnoMin: {
        type: Number,
        default: HORARIO_DEFAULT.duracionTurnoMin || 30,
        min: 5,
        max: 120,
      },
      // Hora de almuerzo: se aplica a todos los días laborales y no queda
      // disponible para agendar citas.
      almuerzo: {
        activo: { type: Boolean, default: HORARIO_DEFAULT.almuerzo.activo },
        horaInicio: { type: String, default: HORARIO_DEFAULT.almuerzo.horaInicio },
        horaFin: { type: String, default: HORARIO_DEFAULT.almuerzo.horaFin },
      },
    },
    diasBloqueados: { type: [String], default: [] }, // ['YYYY-MM-DD']
    franjasBloqueadas: { type: [FranjaBloqueadaSchema], default: [] },
    ventanaCancelacionHoras: {
      type: Number,
      default: VENTANA_CANCELACION_HORAS_DEFAULT,
    },
    planes: { type: [PlanSchema], default: [] },
    // Suscripción SaaS
    suscripcionActiva: { type: Boolean, default: false },
    suscripcionVence: Date,
    fechaInicioSuscripcion: Date,
    tarifaMensual: { type: Number, default: 20000 }, // COP
  },
  { timestamps: true }
);

// En desarrollo, la recarga en caliente conserva el modelo viejo en memoria y
// los cambios de esquema no se aplican: se vuelve a registrar con el esquema actual.
if (process.env.NODE_ENV !== "production" && mongoose.models.Barbero) {
  mongoose.deleteModel("Barbero");
}

export default mongoose.models.Barbero || mongoose.model("Barbero", BarberoSchema);
