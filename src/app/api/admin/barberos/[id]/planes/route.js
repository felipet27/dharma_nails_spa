import { dbConnect } from "@/lib/db";
import Barbero from "@/models/Barbero";
import { ok, fail, handler } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { ROLES, METODOS_PAGO, MAX_SERVICIOS } from "@/lib/constants";

const METODOS_VALIDOS = Object.values(METODOS_PAGO);
const CLAVE = /^[a-z0-9_-]{1,40}$/;

// Clave interna nueva para un servicio. Las citas guardan esta clave y una
// copia del servicio (planSnapshot), así que nunca se reutiliza una clave.
function claveNueva(usadas) {
  let k;
  do k = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  while (usadas.has(k));
  return k;
}

// PUT /api/admin/barberos/:id/planes  body: { planes:[...], datosPago:{...} }
// `planes` es la lista completa de servicios de la especialista: se pueden
// agregar, quitar y reordenar.
export const PUT = handler(async (req, { params }) => {
  await dbConnect();
  const session = getSession();
  if (!session || session.role !== ROLES.ADMIN) return fail("No autorizado", 403);

  const { planes, datosPago } = await req.json();
  const b = await Barbero.findById(params.id);
  if (!b) return fail("Especialista no encontrada", 404);

  if (Array.isArray(planes)) {
    if (planes.length === 0) return fail("Debe quedar al menos un servicio.", 400);
    if (planes.length > MAX_SERVICIOS) return fail(`Máximo ${MAX_SERVICIOS} servicios.`, 400);

    const usadas = new Set();
    const nuevos = [];
    for (const p of planes) {
      const nombre = String(p.nombre || "").trim();
      if (!nombre) return fail("Todos los servicios necesitan un nombre.", 400);
      const duracion = Number(p.duracion);
      if (!Number.isFinite(duracion) || duracion < 5 || duracion > 600) {
        return fail(`"${nombre}": la duración debe estar entre 5 y 600 minutos.`, 400);
      }
      const anticipo = Number(p.anticipo) || 0;
      if (anticipo < 0 || anticipo > 100) return fail(`"${nombre}": el anticipo va de 0 a 100 %.`, 400);

      let key = typeof p.key === "string" && CLAVE.test(p.key) && !usadas.has(p.key) ? p.key : null;
      if (!key) key = claveNueva(usadas);
      usadas.add(key);

      nuevos.push({
        key,
        nombre,
        servicios: (Array.isArray(p.servicios) ? p.servicios : String(p.servicios || "").split(","))
          .map((s) => String(s).trim())
          .filter(Boolean),
        precio: Math.max(0, Number(p.precio) || 0),
        duracion: Math.round(duracion),
        anticipo,
        metodosPago: (p.metodosPago || []).filter((m) => METODOS_VALIDOS.includes(m)),
        activo: p.activo !== false,
      });
    }
    if (!nuevos.some((p) => p.activo)) return fail("Deja al menos un servicio activo.", 400);
    b.planes = nuevos;
  }
  if (datosPago) b.datosPago = { ...b.datosPago, ...datosPago };

  await b.save();
  return ok({ ok: true, planes: b.planes });
});
