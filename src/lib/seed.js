import Usuario from "@/models/Usuario";
import Barbero from "@/models/Barbero";
import Cliente from "@/models/Cliente";
import Cita from "@/models/Cita";
import { hashPassword } from "@/lib/auth";
import {
  ESTADO_BARBERO,
  ESTADO_CITA,
  ROLES,
  PLANES_DEFAULT,
} from "@/lib/constants";
import { minAHhmm, hhmmAMin } from "@/lib/disponibilidad";

function fechaMasDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function snapshot(plan) {
  return {
    key: plan.key,
    nombre: plan.nombre,
    servicios: plan.servicios,
    precio: plan.precio,
    duracion: plan.duracion,
    anticipo: plan.anticipo,
  };
}

// Crea datos de ejemplo si la base está vacía (sin usuarios) o si tiene datos viejos.
export async function seedIfEmpty() {
  const yaHay = await Usuario.countDocuments();
  if (yaHay > 0) return false;

  console.log("🌱 Sembrando datos de ejemplo…");

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@dharmanailsspa.com").toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || "Admin123*";

  // Admin
  await Usuario.create({
    role: ROLES.ADMIN,
    nombre: "Administrador",
    email: adminEmail,
    passwordHash: await hashPassword(adminPass),
  });

  const claveBarbero = await hashPassword("especialista123");
  const LOCAL = "Dharma Nails Spa";
  const CIUDAD = "Medellín, Antioquia";
  const DIRECCION = "Dirección de ejemplo";

  // Especialista 1 (datos ficticios)
  const b1 = await Barbero.create({
    nombre: "Laura Gómez",
    local: LOCAL,
    celular: "3000000001",
    ciudad: CIUDAD,
    direccion: DIRECCION,
    email: "laura@dharmanailsspa.com",
    estado: ESTADO_BARBERO.ACTIVO,
    suscripcionActiva: true,
    suscripcionVence: new Date(Date.now() + 30 * 864e5),
    horario: { horaInicio: "09:00", horaFin: "19:00", diasLaborales: [1, 2, 3, 4, 5, 6] },
    datosPago: { nequi: "300 000 0001" },
    redes: { instagram: "" },
    planes: PLANES_DEFAULT,
  });
  await Usuario.create({
    role: ROLES.BARBERO,
    nombre: b1.nombre,
    email: b1.email,
    passwordHash: claveBarbero,
    barbero: b1._id,
  });

  // Especialista 2 (datos ficticios)
  const b2 = await Barbero.create({
    nombre: "Valentina Ríos",
    local: LOCAL,
    celular: "3000000002",
    ciudad: CIUDAD,
    direccion: DIRECCION,
    email: "valentina@dharmanailsspa.com",
    estado: ESTADO_BARBERO.ACTIVO,
    suscripcionActiva: true,
    suscripcionVence: new Date(Date.now() + 30 * 864e5),
    horario: { horaInicio: "10:00", horaFin: "20:00", diasLaborales: [1, 2, 3, 4, 5, 6] },
    datosPago: { nequi: "300 000 0002" },
    redes: { instagram: "" },
    planes: PLANES_DEFAULT,
  });
  await Usuario.create({
    role: ROLES.BARBERO,
    nombre: b2.nombre,
    email: b2.email,
    passwordHash: claveBarbero,
    barbero: b2._id,
  });

  // Clientes
  const cli1 = await Cliente.create({ nombre: "Camila Pérez", celular: "573000000010" });
  await Cliente.create({ nombre: "María López", celular: "573109876543" });

  // Citas de ejemplo para la especialista 1
  const bronce = b1.planes.find((p) => p.key === "bronce");
  const plata = b1.planes.find((p) => p.key === "plata");
  const hoy = fechaMasDias(0);
  const manana = fechaMasDias(1);

  await Cita.create({
    barbero: b1._id,
    cliente: cli1._id,
    clienteNombre: cli1.nombre,
    clienteCelular: cli1.celular,
    plan: "bronce",
    planSnapshot: snapshot(bronce),
    fecha: hoy,
    horaInicio: "11:00",
    horaFin: minAHhmm(hhmmAMin("11:00") + bronce.duracion),
    metodoPago: "efectivo",
    estado: ESTADO_CITA.CONFIRMADA,
  });
  await Cita.create({
    barbero: b1._id,
    clienteNombre: "María López",
    clienteCelular: "573109876543",
    plan: "plata",
    planSnapshot: snapshot(plata),
    fecha: manana,
    horaInicio: "10:00",
    horaFin: minAHhmm(hhmmAMin("10:00") + plata.duracion),
    metodoPago: "nequi",
    pagoAnticipo: {
      requerido: true,
      monto: Math.round((plata.precio * plata.anticipo) / 100),
      estado: "pendiente",
      comprobante: "",
    },
    estado: ESTADO_CITA.SOLICITADA,
  });

  console.log("✅ Seed de desarrollo listo. Consulta .env.example para las credenciales locales.");
  return true;
}
