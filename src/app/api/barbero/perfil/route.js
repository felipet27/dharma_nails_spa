import { dbConnect } from "@/lib/db";
import Barbero from "@/models/Barbero";
import Cita from "@/models/Cita";
import { ok, fail, handler } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { ROLES, ESTADO_CITA } from "@/lib/constants";
import {
  citasEnConflicto,
  citasFueraDeSemana,
  validarSemana,
  fechaLocalHoy,
} from "@/lib/disponibilidad";
import { serializarCita } from "@/lib/serializers";
import { MARCA_DEFAULT } from "@/lib/brands";

function requireBarbero() {
  const session = getSession();
  if (!session || session.role !== ROLES.BARBERO) {
    const e = new Error("No autorizado");
    e.status = 403;
    throw e;
  }
  return session;
}

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await dbConnect();
  const session = requireBarbero();
  const b = await Barbero.findById(session.barberoId).lean();
  if (!b) return fail("Profesional no encontrado", 404);
  return ok({
    barbero: {
      id: b._id.toString(),
      nombre: b.nombre,
      local: b.local,
      celular: b.celular,
      ciudad: b.ciudad,
      direccion: b.direccion || "",
      foto: b.foto || "",
      marca: b.marca || MARCA_DEFAULT,
      redes: b.redes || {},
      email: b.email,
      estado: b.estado,
      horario: b.horario,
      diasBloqueados: b.diasBloqueados || [],
      franjasBloqueadas: b.franjasBloqueadas || [],
      ventanaCancelacionHoras: b.ventanaCancelacionHoras,
      datosPago: b.datosPago || {},
      planes: b.planes || [],
    },
  });
});

// PUT -> actualiza configuración editable por el barbero
export const PUT = handler(async (req) => {
  await dbConnect();
  const session = requireBarbero();
  const body = await req.json();
  const b = await Barbero.findById(session.barberoId);
  if (!b) return fail("Profesional no encontrado", 404);

  // Horario semanal por día. Se valida y, antes de guardarlo, se revisa que no
  // deje por fuera citas ya agendadas (día que deja de trabajarse u horas que
  // salen del nuevo horario).
  if (body.horario && Array.isArray(body.horario.semana)) {
    const { semana, error } = validarSemana(body.horario.semana);
    if (error) return fail(error, 400);

    const citasFuturas = await Cita.find({
      barbero: b._id,
      fecha: { $gte: fechaLocalHoy() },
      estado: { $in: [ESTADO_CITA.SOLICITADA, ESTADO_CITA.CONFIRMADA] },
    }).lean();
    const conflictos = citasFueraDeSemana({ citas: citasFuturas, semana }).map(serializarCita);
    if (conflictos.length > 0) {
      return ok(
        {
          error:
            "Ese horario deja por fuera citas ya agendadas. Reagéndalas o cancélalas primero.",
          conflictos,
        },
        409
      );
    }

    b.horario.semana = semana;
    // Resumen en el formato anterior, para lo que todavía lo lee (chips de
    // fechas al agendar, panel del admin).
    const activos = semana.filter((d) => d.activo);
    b.horario.diasLaborales = activos.map((d) => d.dia);
    b.horario.horaInicio = activos.map((d) => d.tramos[0].ini).sort()[0];
    b.horario.horaFin = activos.map((d) => d.tramos[d.tramos.length - 1].fin).sort().reverse()[0];
    b.horario.almuerzo = { ...(b.horario.almuerzo || {}), activo: false };
  } else if (body.horario) {
    b.horario.horaInicio = body.horario.horaInicio ?? b.horario.horaInicio;
    b.horario.horaFin = body.horario.horaFin ?? b.horario.horaFin;
    if (Array.isArray(body.horario.diasLaborales))
      b.horario.diasLaborales = body.horario.diasLaborales;
    if (body.horario.duracionTurnoMin != null) {
      const dur = Number(body.horario.duracionTurnoMin);
      if (dur >= 5 && dur <= 120) b.horario.duracionTurnoMin = dur;
    }
    if (body.horario.almuerzo) {
      b.horario.almuerzo = {
        activo: !!body.horario.almuerzo.activo,
        horaInicio: body.horario.almuerzo.horaInicio ?? b.horario.almuerzo?.horaInicio,
        horaFin: body.horario.almuerzo.horaFin ?? b.horario.almuerzo?.horaFin,
      };
    }
  }
  // Antes de aplicar nuevas ausencias, verificar que no pisen citas ya agendadas.
  // Solo revisamos las ausencias AGREGADAS respecto a lo que ya estaba guardado:
  // así el barbero puede seguir guardando el resto de su perfil sin tropezar con
  // ausencias antiguas. Si una ausencia nueva choca con una cita activa, se
  // rechaza el bloqueo y se devuelven las citas para que contacte al cliente.
  if (Array.isArray(body.diasBloqueados) || Array.isArray(body.franjasBloqueadas)) {
    const prevDias = b.diasBloqueados || [];
    const prevFranjas = b.franjasBloqueadas || [];
    const nextDias = Array.isArray(body.diasBloqueados) ? body.diasBloqueados : prevDias;
    const nextFranjas = Array.isArray(body.franjasBloqueadas)
      ? body.franjasBloqueadas
      : prevFranjas;

    const diasAgregados = nextDias.filter((d) => !prevDias.includes(d));
    const franjasAgregadas = nextFranjas.filter(
      (f) =>
        !prevFranjas.some(
          (p) => p.fecha === f.fecha && p.horaInicio === f.horaInicio && p.horaFin === f.horaFin
        )
    );

    const fechasNuevas = [
      ...new Set([...diasAgregados, ...franjasAgregadas.map((f) => f.fecha)]),
    ];
    if (fechasNuevas.length > 0) {
      const citas = await Cita.find({
        barbero: b._id,
        fecha: { $in: fechasNuevas },
        estado: { $in: [ESTADO_CITA.SOLICITADA, ESTADO_CITA.CONFIRMADA] },
      }).lean();
      const conflictos = citasEnConflicto({
        citas,
        diasBloqueados: diasAgregados,
        franjasBloqueadas: franjasAgregadas,
      }).map(serializarCita);
      if (conflictos.length > 0) {
        return ok(
          {
            error:
              "No se puede bloquear ese tiempo: ya tienes citas agendadas. Contacta a la clienta para reagendar.",
            conflictos,
          },
          409
        );
      }
    }
  }

  if (body.horario?.duracionTurnoMin != null && Array.isArray(body.horario.semana)) {
    const dur = Number(body.horario.duracionTurnoMin);
    if (dur >= 5 && dur <= 120) b.horario.duracionTurnoMin = dur;
  }
  if (Array.isArray(body.diasBloqueados)) b.diasBloqueados = body.diasBloqueados;
  if (Array.isArray(body.franjasBloqueadas)) b.franjasBloqueadas = body.franjasBloqueadas;
  if (body.ventanaCancelacionHoras != null)
    b.ventanaCancelacionHoras = body.ventanaCancelacionHoras;
  if (body.datosPago) b.datosPago = { ...b.datosPago, ...body.datosPago };
  if (typeof body.foto === "string") b.foto = body.foto;
  if (body.redes) b.redes = { ...(b.redes || {}), ...body.redes };

  await b.save();

  return ok({ ok: true, conflictos: [] });
});
