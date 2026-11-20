// Motor de disponibilidad: calcula slots libres según horario laboral,
// días/franjas bloqueadas, citas existentes y la duración exacta del plan.

// Paso único de tiempo, compartido por el agendamiento (posibles horas de inicio)
// y por la rejilla del Calendario del barbero, para que ambos coincidan.
export const PASO_MIN = 30;
const ZONA_HORARIA = "America/Bogota"; // Colombia (UTC-5, sin horario de verano)

export function hhmmAMin(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

export function minAHhmm(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// fecha: 'YYYY-MM-DD'. Devuelve día de la semana 0..6 (0=domingo) en zona local del string.
export function diaSemanaDeFecha(fechaStr) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function seSolapa(inicioA, finA, inicioB, finB) {
  return inicioA < finB && inicioB < finA;
}

/**
 * Dadas unas citas y la configuración de ausencias del barbero, devuelve las
 * citas que quedan dentro de un día completo bloqueado o de una franja de horas
 * bloqueada (solape). Sirve para avisar al barbero al configurar ausencias.
 * @param {Object} params
 * @param {Array}  params.citas             citas activas [{fecha, horaInicio, horaFin, ...}]
 * @param {string[]} params.diasBloqueados  ['YYYY-MM-DD']
 * @param {Array}  params.franjasBloqueadas [{fecha, horaInicio, horaFin}]
 * @returns {Array} subconjunto de `citas` en conflicto
 */
export function citasEnConflicto({ citas = [], diasBloqueados = [], franjasBloqueadas = [] }) {
  return citas.filter((c) => {
    if (diasBloqueados.includes(c.fecha)) return true;
    const ini = hhmmAMin(c.horaInicio);
    const fin = hhmmAMin(c.horaFin);
    return franjasBloqueadas.some(
      (f) => f.fecha === c.fecha && seSolapa(ini, fin, hhmmAMin(f.horaInicio), hhmmAMin(f.horaFin))
    );
  });
}

// ---------------------------------------------------------------------------
// Horario semanal por día
//
// Cada día tiene `activo` y una lista de tramos de trabajo [{ini, fin}]. El
// hueco entre dos tramos es una pausa (almuerzo, descanso), así cada día puede
// tener su propio horario y sus propias pausas:
//   { dia: 1, activo: true, tramos: [{ini:"09:00", fin:"13:00"}, {ini:"14:00", fin:"19:00"}] }
//
// Las especialistas que todavía no tienen `horario.semana` guardado usan el
// formato anterior (apertura/cierre, días laborales y almuerzo global), que se
// convierte aquí sin tocar la base de datos.
// ---------------------------------------------------------------------------

export const MAX_TRAMOS_DIA = 3;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function semanaLegada(horario = {}) {
  const ini = horario.horaInicio || "10:00";
  const fin = horario.horaFin || "19:00";
  const dias = horario.diasLaborales || [1, 2, 3, 4, 5, 6];
  const alm = horario.almuerzo;
  let tramos = [{ ini, fin }];
  if (alm && alm.activo && alm.horaInicio && alm.horaFin) {
    const a = hhmmAMin(alm.horaInicio);
    const b = hhmmAMin(alm.horaFin);
    if (b > a && a > hhmmAMin(ini) && b < hhmmAMin(fin)) {
      tramos = [{ ini, fin: alm.horaInicio }, { ini: alm.horaFin, fin }];
    }
  }
  return [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
    dia,
    activo: dias.includes(dia),
    tramos: tramos.map((t) => ({ ...t })),
  }));
}

/**
 * Devuelve siempre 7 días (índice = día de la semana, 0 = domingo) con
 * `{ dia, activo, tramos: [{ini, fin}] }`, ordenados y listos para usar.
 */
export function semanaDeHorario(horario = {}) {
  const guardada = Array.isArray(horario?.semana) ? horario.semana : [];
  if (guardada.length !== 7) return semanaLegada(horario || {});
  const porDia = {};
  for (const d of guardada) porDia[d.dia] = d;
  return [0, 1, 2, 3, 4, 5, 6].map((dia) => {
    const d = porDia[dia] || { activo: false, tramos: [] };
    const tramos = (d.tramos || [])
      .map((t) => ({ ini: t.ini, fin: t.fin }))
      .sort((a, b) => a.ini.localeCompare(b.ini));
    return { dia, activo: !!d.activo && tramos.length > 0, tramos };
  });
}

/**
 * Valida y normaliza la semana que envía el panel. Devuelve
 * `{ semana }` o `{ error }` con un mensaje para la especialista.
 */
export function validarSemana(entrada) {
  if (!Array.isArray(entrada)) return { error: "Horario inválido." };
  const porDia = {};
  for (const d of entrada) {
    const dia = Number(d?.dia);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) return { error: "Horario inválido." };
    porDia[dia] = d;
  }
  const semana = [];
  for (let dia = 0; dia < 7; dia++) {
    const d = porDia[dia] || {};
    const activo = !!d.activo;
    const tramos = (Array.isArray(d.tramos) ? d.tramos : [])
      .map((t) => ({ ini: String(t?.ini || ""), fin: String(t?.fin || "") }))
      .sort((a, b) => a.ini.localeCompare(b.ini));
    if (activo) {
      const nombre = NOMBRES_DIA[dia];
      if (tramos.length === 0) return { error: `El ${nombre} no tiene horario.` };
      if (tramos.length > MAX_TRAMOS_DIA) return { error: `El ${nombre} tiene demasiadas pausas.` };
      for (let i = 0; i < tramos.length; i++) {
        const t = tramos[i];
        if (!HHMM.test(t.ini) || !HHMM.test(t.fin)) return { error: `Revisa las horas del ${nombre}.` };
        if (t.fin <= t.ini) return { error: `El ${nombre}: la hora final debe ser mayor que la inicial.` };
        if (i > 0 && t.ini <= tramos[i - 1].fin) {
          return { error: `El ${nombre}: después de una pausa, la hora de regreso debe ser mayor que la de salida.` };
        }
      }
    }
    semana.push({ dia, activo, tramos: activo ? tramos : tramos.filter((t) => HHMM.test(t.ini) && HHMM.test(t.fin)) });
  }
  if (!semana.some((d) => d.activo)) return { error: "Activa al menos un día de trabajo." };
  return { semana };
}

const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Citas que quedarían por fuera de un nuevo horario semanal (en un día que ya
 * no se trabaja, o fuera de los tramos de ese día). Sirve para no dejar citas
 * agendadas huérfanas al cambiar el horario.
 */
export function citasFueraDeSemana({ citas = [], semana }) {
  return citas.filter((c) => {
    const d = semana[diaSemanaDeFecha(c.fecha)];
    if (!d || !d.activo) return true;
    const ini = hhmmAMin(c.horaInicio);
    const fin = hhmmAMin(c.horaFin);
    return !d.tramos.some((t) => ini >= hhmmAMin(t.ini) && fin <= hhmmAMin(t.fin));
  });
}

/**
 * Núcleo de disponibilidad y única fuente de verdad de la jornada de un barbero
 * en una fecha. La usan tanto `calcularSlots` (agendamiento manual y público)
 * como la rejilla del Calendario del barbero, para que ambos coincidan siempre.
 *
 * @param {Object} params
 * @param {Object} params.barbero  documento del barbero (horario, diasBloqueados, franjasBloqueadas)
 * @param {string} params.fecha    'YYYY-MM-DD'
 * @param {Array}  params.citas    citas ocupadas ese día [{horaInicio, horaFin, ...}]
 * @returns {Object} { tipo: 'noLaboral' | 'bloqueado' | 'laboral', ... }
 *   Para 'laboral' incluye: inicioMin, finMin, tramos[], ocupados[], minPermitido.
 *   Cada ocupado: { tipo: 'cita'|'ausencia'|'pausa', ini, fin, cita?, franja? }.
 */
export function jornadaDelDia({ barbero, fecha, citas = [] }) {
  const horario = barbero.horario || {};
  const dia = diaSemanaDeFecha(fecha);

  // Horario de ese día de la semana (tramos de trabajo).
  const cfg = semanaDeHorario(horario)[dia];
  const tramos = (cfg.activo ? cfg.tramos : [])
    .map((t) => ({ ini: hhmmAMin(t.ini), fin: hhmmAMin(t.fin) }))
    .filter((t) => t.fin > t.ini);
  if (tramos.length === 0) return { tipo: "noLaboral" };

  // ¿Día completo bloqueado?
  if ((barbero.diasBloqueados || []).includes(fecha)) return { tipo: "bloqueado" };

  const inicioMin = tramos[0].ini;
  const finMin = tramos[tramos.length - 1].fin;

  // Intervalos ocupados, en orden de prioridad: primero las citas (que ganan al
  // pintar el calendario si solapan), luego franjas bloqueadas y las pausas.
  const ocupados = [];
  for (const c of citas) {
    ocupados.push({ tipo: "cita", ini: hhmmAMin(c.horaInicio), fin: hhmmAMin(c.horaFin), cita: c });
  }
  for (const f of barbero.franjasBloqueadas || []) {
    if (f.fecha === fecha) {
      ocupados.push({ tipo: "ausencia", ini: hhmmAMin(f.horaInicio), fin: hhmmAMin(f.horaFin), franja: f });
    }
  }

  // Pausas del día: el hueco entre un tramo y el siguiente.
  for (let i = 1; i < tramos.length; i++) {
    const ini = tramos[i - 1].fin;
    const fin = tramos[i].ini;
    if (fin > ini) {
      ocupados.push({
        tipo: "pausa",
        ini,
        fin,
        franja: { horaInicio: minAHhmm(ini), horaFin: minAHhmm(fin), motivo: "Pausa" },
      });
    }
  }

  // No permitir horas en el pasado si la fecha es hoy (según hora de Colombia,
  // no la del servidor, que en producción corre en UTC).
  const hoyStr = fechaLocalHoy();
  let minPermitido = inicioMin;
  if (fecha === hoyStr) {
    minPermitido = Math.max(inicioMin, minutosActualesColombia());
  }

  return { tipo: "laboral", inicioMin, finMin, tramos, ocupados, minPermitido };
}

/**
 * Calcula los slots disponibles para un barbero en una fecha y duración dadas.
 * @param {Object} params
 * @param {Object} params.barbero  documento del barbero (horario, diasBloqueados, franjasBloqueadas)
 * @param {string} params.fecha    'YYYY-MM-DD'
 * @param {number} params.duracion minutos que ocupa la cita (según plan)
 * @param {Array}  params.citas    citas ocupadas ese día [{horaInicio, horaFin}]
 * @returns {string[]} lista de horas de inicio 'HH:mm' disponibles
 */
// Cada cuánto se ofrece una hora de inicio (se guarda en horario.duracionTurnoMin
// por compatibilidad con los datos existentes).
export function intervaloInicio(barbero) {
  const v = Number(barbero?.horario?.duracionTurnoMin);
  return v >= 5 && v <= 120 ? v : PASO_MIN;
}

export function calcularSlots({ barbero, fecha, duracion, citas = [] }) {
  const jornada = jornadaDelDia({ barbero, fecha, citas });
  if (jornada.tipo !== "laboral") return [];

  const { tramos, ocupados, minPermitido } = jornada;
  const dur = Number(duracion) || barbero?.planes?.[0]?.duracion || PASO_MIN;
  // Intervalo de inicio: cada cuánto se ofrece una hora para empezar (15, 30…
  // min). Es independiente de la duración del servicio: un servicio de 90 min
  // puede empezar a las 9:00 o a las 9:30, y el siguiente hueco libre queda
  // disponible justo cuando termina la cita anterior.
  const paso = intervaloInicio(barbero);

  const slots = [];
  // Se recorre cada tramo por separado: un servicio nunca cruza una pausa ni
  // empieza desalineado al regresar de ella.
  for (const tramo of tramos) {
    for (let t = tramo.ini; t + dur <= tramo.fin; t += paso) {
      if (t < minPermitido) continue;
      const fin = t + dur;
      const chocaConOcupado = ocupados.some((o) => seSolapa(t, fin, o.ini, o.fin));
      if (!chocaConOcupado) {
        slots.push(minAHhmm(t));
      }
    }
  }
  return slots;
}

// Fecha 'YYYY-MM-DD' de hoy en zona horaria de Colombia, sin depender de la
// zona del servidor (UTC en Vercel) ni del navegador del cliente.
export function fechaLocalHoy() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// true si la fecha 'YYYY-MM-DD' es anterior a hoy (zona Colombia). La comparación
// lexicográfica de strings 'YYYY-MM-DD' equivale a comparar fechas.
export function esFechaPasada(fecha) {
  return !!fecha && fecha < fechaLocalHoy();
}

// Minutos transcurridos del día (0..1439) ahora mismo en Colombia.
export function minutosActualesColombia() {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_HORARIA,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const h = Number(partes.find((p) => p.type === "hour").value);
  const m = Number(partes.find((p) => p.type === "minute").value);
  return h * 60 + m;
}

/**
 * Convierte una hora en formato 'HH:mm' (24h) a formato legible de 12 horas con 'a.m.' o 'p.m.'.
 * Ejemplos:
 *   '10:00' -> '10:00 a.m.'
 *   '12:00' -> '12:00 p.m.'
 *   '14:30' -> '2:30 p.m.'
 *   '00:00' -> '12:00 a.m.'
 *
 * @param {string} hhmm  Hora militar 'HH:mm'
 * @returns {string}     Hora en formato 12h con 'a.m.' o 'p.m.'
 */
export function formatearHora12(hhmm) {
  if (!hhmm) return "";
  const partes = String(hhmm).split(":");
  if (partes.length < 2) return String(hhmm);
  const h = Number(partes[0]);
  const m = Number(partes[1]);
  if (isNaN(h) || isNaN(m)) return String(hhmm);
  const ampm = h < 12 ? "a.m." : "p.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Formatea un rango de dos horas en formato de 12 horas.
 * Ejemplo: ('14:00', '14:30') -> '2:00 p.m. - 2:30 p.m.'
 */
export function formatearRango12(inicio, fin) {
  if (!inicio && !fin) return "";
  if (!fin) return formatearHora12(inicio);
  if (!inicio) return formatearHora12(fin);
  return `${formatearHora12(inicio)} - ${formatearHora12(fin)}`;
}
