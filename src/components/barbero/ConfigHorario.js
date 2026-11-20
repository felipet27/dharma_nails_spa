"use client";

import { useState } from "react";
import { DIAS_SEMANA, INTERVALOS_INICIO_OPCIONES } from "@/lib/constants";
import {
  fechaLocalHoy,
  esFechaPasada,
  formatearHora12,
  hhmmAMin,
  minAHhmm,
  semanaDeHorario,
  MAX_TRAMOS_DIA,
} from "@/lib/disponibilidad";
import { linkWhatsApp } from "@/lib/whatsapp";
import { esMovil } from "@/lib/dispositivo";
import { obtenerMarca } from "@/lib/brands";

export default function ConfigHorario({ perfil, onGuardado, onIrACita }) {
  // Horario por día: 7 entradas (índice = día, 0 = domingo) con sus tramos.
  const [semana, setSemana] = useState(() => semanaDeHorario(perfil.horario));
  const [copiarDesde, setCopiarDesde] = useState(1);
  const [duracionTurnoMin, setDuracionTurnoMin] = useState(perfil.horario?.duracionTurnoMin || 30);
  const [ventana, setVentana] = useState(perfil.ventanaCancelacionHoras ?? 24);
  const [diasBloqueados, setDiasBloqueados] = useState(perfil.diasBloqueados || []);
  const [franjas, setFranjas] = useState(perfil.franjasBloqueadas || []);
  const [nuevoBloqueo, setNuevoBloqueo] = useState(fechaLocalHoy());
  const [modoBloqueo, setModoBloqueo] = useState("dia"); // "dia" | "horas"
  const [franjaIni, setFranjaIni] = useState("12:00");
  const [franjaFin, setFranjaFin] = useState("13:00");
  const [franjaMotivo, setFranjaMotivo] = useState("");
  const [datosPago, setDatosPago] = useState(perfil.datosPago || {});
  const [foto, setFoto] = useState(perfil.foto || "");
  const [redes, setRedes] = useState(perfil.redes || {});
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [conflictos, setConflictos] = useState([]);
  const [ausenciaMsg, setAusenciaMsg] = useState("");

  const diasActivos = ORDEN_DIAS.filter((d) => semana[d].activo);
  const minutosSemana = diasActivos.reduce((acc, d) => acc + minutosDia(semana[d]), 0);
  const ejemploInicio = (() => {
    const d = diasActivos.find((x) => !errorDia(semana[x]));
    if (d == null) return null;
    const t = semana[d].tramos[0];
    const horas = [];
    for (let m = hhmmAMin(t.ini); m < hhmmAMin(t.fin) && horas.length < 4; m += duracionTurnoMin) horas.push(minAHhmm(m));
    return { dia: d, horas };
  })();

  function setDia(dia, cambios) {
    setSemana((prev) => prev.map((d) => (d.dia === dia ? { ...d, ...cambios } : d)));
  }
  function toggleActivo(dia) {
    const d = semana[dia];
    if (d.activo) { setDia(dia, { activo: false }); return; }
    // Al activar un día sin horario, se toma el de otro día activo como base.
    const base = diasActivos.length ? semana[diasActivos[0]].tramos : [{ ini: "09:00", fin: "18:00" }];
    setDia(dia, { activo: true, tramos: d.tramos.length ? d.tramos : base.map((t) => ({ ...t })) });
  }
  function setTramo(dia, i, campo, valor) {
    setDia(dia, { tramos: semana[dia].tramos.map((t, k) => (k === i ? { ...t, [campo]: valor } : t)) });
  }
  // Parte el tramo más largo del día en dos, con una pausa de 1 hora en medio
  // (o de 30 min si el tramo es corto). Luego la especialista ajusta las horas.
  function agregarPausa(dia) {
    const tramos = semana[dia].tramos;
    let idx = 0;
    tramos.forEach((t, i) => {
      if (hhmmAMin(t.fin) - hhmmAMin(t.ini) > hhmmAMin(tramos[idx].fin) - hhmmAMin(tramos[idx].ini)) idx = i;
    });
    const ini = hhmmAMin(tramos[idx].ini);
    const fin = hhmmAMin(tramos[idx].fin);
    const largo = fin - ini;
    const pausa = largo >= 180 ? 60 : 30;
    if (largo < pausa + 60) { setMsg(`El ${DIAS_SEMANA[dia]} es muy corto para agregar una pausa.`); return; }
    let pIni = ini + Math.floor((largo - pausa) / 2 / 30) * 30;
    if (pIni <= ini) pIni = ini + 30;
    const nuevos = [
      ...tramos.slice(0, idx),
      { ini: tramos[idx].ini, fin: minAHhmm(pIni) },
      { ini: minAHhmm(pIni + pausa), fin: tramos[idx].fin },
      ...tramos.slice(idx + 1),
    ];
    setMsg("");
    setDia(dia, { tramos: nuevos });
  }
  // Quitar la pausa i une el tramo anterior con el siguiente.
  function quitarPausa(dia, i) {
    const t = semana[dia].tramos;
    const unido = { ini: t[i - 1].ini, fin: t[i].fin };
    setDia(dia, { tramos: [...t.slice(0, i - 1), unido, ...t.slice(i + 1)] });
  }
  function copiarATodos(origen) {
    const tramos = semana[origen].tramos;
    setSemana((prev) => prev.map((d) => (d.activo ? { ...d, tramos: tramos.map((t) => ({ ...t })) } : d)));
    setMsg(`Horario del ${DIAS_SEMANA[origen]} copiado. Recuerda guardar los cambios.`);
  }
  function elegirFechaBloqueo(valor) {
    if (esFechaPasada(valor)) { setAusenciaMsg("No puedes bloquear una fecha que ya pasó."); return; }
    setAusenciaMsg(""); setNuevoBloqueo(valor);
  }
  // Las ausencias se guardan al instante (no dependen del botón "Guardar cambios"):
  // así un día/hora bloqueado queda aplicado de inmediato para los clientes.
  // `prev` guarda el estado anterior para poder revertir si el servidor rechaza
  // el bloqueo (p. ej. porque pisa una cita ya agendada).
  async function persistirAusencias(nextDias, nextFranjas, prev) {
    setAusenciaMsg("Guardando…");
    try {
      const res = await fetch("/api/barbero/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diasBloqueados: nextDias, franjasBloqueadas: nextFranjas }),
      });
      const data = await res.json().catch(() => ({}));
      // 409: el bloqueo choca con una o más citas agendadas. No se aplicó nada:
      // revertimos el estado local y mostramos las citas para reagendar.
      if (res.status === 409 && (data.conflictos || []).length) {
        if (prev) { setDiasBloqueados(prev.dias); setFranjas(prev.franjas); }
        setConflictos(data.conflictos);
        setAusenciaMsg("🚫 No se pudo bloquear: hay citas agendadas en ese tiempo.");
        return;
      }
      if (!res.ok) throw new Error();
      setConflictos([]);
      setAusenciaMsg("Ausencias guardadas ✔");
      onGuardado?.();
    } catch {
      if (prev) { setDiasBloqueados(prev.dias); setFranjas(prev.franjas); }
      setAusenciaMsg("⚠️ No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
    }
  }
  function agregarBloqueo() {
    if (esFechaPasada(nuevoBloqueo)) { setAusenciaMsg("No puedes bloquear una fecha que ya pasó."); return; }
    if (diasBloqueados.includes(nuevoBloqueo)) return;
    const prev = { dias: diasBloqueados, franjas };
    const next = [...diasBloqueados, nuevoBloqueo].sort();
    setDiasBloqueados(next);
    persistirAusencias(next, franjas, prev);
  }
  function quitarBloqueo(f) {
    const prev = { dias: diasBloqueados, franjas };
    const next = diasBloqueados.filter((x) => x !== f);
    setDiasBloqueados(next);
    persistirAusencias(next, franjas, prev);
  }
  function agregarFranja() {
    if (!nuevoBloqueo) return;
    if (esFechaPasada(nuevoBloqueo)) { setAusenciaMsg("No puedes bloquear una fecha que ya pasó."); return; }
    if (franjaIni >= franjaFin) { setAusenciaMsg("La hora de fin debe ser mayor que la de inicio."); return; }
    const nueva = { fecha: nuevoBloqueo, horaInicio: franjaIni, horaFin: franjaFin, motivo: franjaMotivo.trim() };
    const existe = franjas.some((f) => f.fecha === nueva.fecha && f.horaInicio === nueva.horaInicio && f.horaFin === nueva.horaFin);
    if (existe) return;
    const prev = { dias: diasBloqueados, franjas };
    const next = [...franjas, nueva].sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));
    setFranjas(next);
    setFranjaMotivo("");
    persistirAusencias(diasBloqueados, next, prev);
  }
  function quitarFranja(idx) {
    const prev = { dias: diasBloqueados, franjas };
    const next = franjas.filter((_, i) => i !== idx);
    setFranjas(next);
    persistirAusencias(diasBloqueados, next, prev);
  }
  function onQR(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDatosPago((d) => ({ ...d, qrImagen: reader.result }));
    reader.readAsDataURL(file);
  }
  function onFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setMsg("La foto no debe pasar de 3 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result);
    reader.readAsDataURL(file);
  }

  async function guardar() {
    if (diasActivos.length === 0) { setMsg("Activa al menos un día de trabajo."); return; }
    const conError = diasActivos.find((d) => errorDia(semana[d]));
    if (conError != null) { setMsg(`Revisa el horario del ${DIAS_SEMANA[conError]}.`); return; }
    setGuardando(true); setMsg("");
    const res = await fetch("/api/barbero/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        horario: {
          semana,
          duracionTurnoMin: Number(duracionTurnoMin),
        },
        ventanaCancelacionHoras: Number(ventana),
        diasBloqueados,
        franjasBloqueadas: franjas,
        datosPago,
        foto,
        redes,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    if (res.status === 409 && (data.conflictos || []).length) {
      setConflictos(data.conflictos);
      setMsg("");
      setAusenciaMsg("");
      setMsg(data.error || "No se pudo guardar: hay citas agendadas en ese tiempo.");
      return;
    }
    if (res.ok) {
      setMsg("Cambios guardados ✔");
      setConflictos([]);
      onGuardado?.();
    } else {
      setMsg(data.error || "Error al guardar");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="card p-6 space-y-4">
        <h2 className="font-display text-xl">Tu foto y redes</h2>
        <div className="flex items-center gap-4">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="Tu foto" className="w-20 h-20 rounded-full object-cover border border-black/10" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-tinta text-white grid place-items-center font-display text-3xl">
              {perfil.nombre?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <label className="btn-outline text-sm py-1.5 cursor-pointer">
              Subir foto
              <input type="file" accept="image/*" onChange={onFoto} className="hidden" />
            </label>
            {foto && (
              <button type="button" onClick={() => setFoto("")} className="ml-2 text-sm text-red-600 font-semibold">Quitar</button>
            )}
            <p className="text-xs text-pizarra mt-1">Esta es la foto que ven tus clientas.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">📸 Instagram</label>
            <input className="input" value={redes.instagram || ""} onChange={(e) => setRedes({ ...redes, instagram: e.target.value })} placeholder="@usuario o link" />
          </div>
          <div>
            <label className="label">📘 Facebook</label>
            <input className="input" value={redes.facebook || ""} onChange={(e) => setRedes({ ...redes, facebook: e.target.value })} placeholder="Link o usuario" />
          </div>
          <div>
            <label className="label">🎵 TikTok</label>
            <input className="input" value={redes.tiktok || ""} onChange={(e) => setRedes({ ...redes, tiktok: e.target.value })} placeholder="@usuario o link" />
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-5">
        <h2 className="font-display text-xl">Horario de atención</h2>

        {/* Resumen visual */}
        <div className="rounded-xl bg-crema border border-black/10 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🕐</span>
          <div className="text-sm leading-snug">
            <p>
              {diasActivos.length === 0
                ? "⚠️ Ningún día activo"
                : <>Atiendes <b className="text-brand-deep">{diasActivos.length} día{diasActivos.length !== 1 ? "s" : ""}</b> a la semana · <b className="text-brand-deep">{formatoHoras(minutosSemana)}</b> en total</>}
            </p>
            <p className="text-pizarra mt-0.5">Cada día puede tener su propio horario y sus pausas.</p>
          </div>
        </div>

        {/* Horario por día */}
        <div className="space-y-2">
          {ORDEN_DIAS.map((dia) => {
            const d = semana[dia];
            const error = d.activo ? errorDia(d) : "";
            return (
              <div
                key={dia}
                className={`rounded-xl border p-2.5 sm:p-3 transition ${d.activo ? "border-brand/30 bg-white" : "border-linea bg-gray-50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none py-1 flex-1">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-brand-deep"
                      checked={d.activo}
                      onChange={() => toggleActivo(dia)}
                    />
                    <span className={`font-semibold capitalize ${d.activo ? "text-tinta" : "text-pizarra"}`}>{DIAS_SEMANA[dia]}</span>
                  </label>
                  <span className="text-xs text-pizarra">
                    {d.activo ? (error ? "" : formatoHoras(minutosDia(d))) : "Descanso"}
                  </span>
                </div>

                {d.activo && (
                  <div className="mt-2.5 space-y-2 sm:pl-7">
                    {d.tramos.map((t, i) => (
                      <div key={i} className="space-y-2">
                        {i > 0 && (
                          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-900">
                            <span>☕ Pausa</span>
                            <b className="flex-1">
                              {d.tramos[i - 1].fin < t.ini
                                ? `${hora12simple(d.tramos[i - 1].fin)} – ${hora12simple(t.ini)}`
                                : "—"}
                            </b>
                            <button
                              type="button"
                              onClick={() => quitarPausa(dia, i)}
                              className="text-red-500 hover:text-red-700 font-bold text-base leading-none"
                              aria-label="Quitar pausa"
                              title="Quitar pausa"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        {/* Desde 360 px: "entrada a salida" en una fila. En
                            pantallas más angostas (iPhone SE) van una debajo de
                            la otra para que la hora completa siempre se vea. */}
                        <div className="grid grid-cols-1 min-[360px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 sm:gap-2">
                          <input
                            type="time"
                            className="input py-2 px-2 sm:px-3 min-w-0 w-full"
                            value={t.ini}
                            onChange={(e) => setTramo(dia, i, "ini", e.target.value)}
                            aria-label={`${DIAS_SEMANA[dia]}: ${i === 0 ? "entrada" : "regreso de la pausa"}`}
                          />
                          <span className="text-pizarra text-sm shrink-0 hidden min-[360px]:block">a</span>
                          <input
                            type="time"
                            className="input py-2 px-2 sm:px-3 min-w-0 w-full"
                            value={t.fin}
                            onChange={(e) => setTramo(dia, i, "fin", e.target.value)}
                            aria-label={`${DIAS_SEMANA[dia]}: ${i === d.tramos.length - 1 ? "salida" : "inicio de la pausa"}`}
                          />
                        </div>
                      </div>
                    ))}
                    {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
                    {d.tramos.length < MAX_TRAMOS_DIA && (
                      <button
                        type="button"
                        onClick={() => agregarPausa(dia)}
                        className="text-xs font-semibold text-brand-deep hover:underline py-2"
                      >
                        + Agregar pausa (almuerzo, descanso…)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Copiar horario */}
        {diasActivos.length > 1 && (
          <div className="rounded-xl border border-black/10 p-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-pizarra">Copiar el horario del</span>
            <select
              className="input py-1.5 w-auto"
              value={diasActivos.includes(copiarDesde) ? copiarDesde : diasActivos[0]}
              onChange={(e) => setCopiarDesde(Number(e.target.value))}
            >
              {ORDEN_DIAS.filter((d) => semana[d].activo).map((d) => (
                <option key={d} value={d}>{DIAS_SEMANA[d]}</option>
              ))}
            </select>
            <span className="text-pizarra">a los demás días que trabajas</span>
            <button
              type="button"
              className="btn-outline text-sm py-1.5"
              onClick={() => copiarATodos(diasActivos.includes(copiarDesde) ? copiarDesde : diasActivos[0])}
            >
              Copiar
            </button>
          </div>
        )}

        {/* Intervalo de horas de inicio */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">⏱️ Horas de inicio cada…</label>
            <span className="text-xs font-bold text-brand-deep bg-brand-soft px-2 py-0.5 rounded border border-brand/20">
              cada {duracionTurnoMin} min
            </span>
          </div>
          <p className="text-xs text-pizarra mb-2">
            Cada cuánto les ofrecemos a tus clientas una hora para empezar. Cada servicio ocupa su propia duración
            (la que está configurada en el servicio) y, al terminar una cita, la siguiente hora queda libre.
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {INTERVALOS_INICIO_OPCIONES.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setDuracionTurnoMin(min)}
                className={`rounded-lg py-2 text-xs font-bold border transition ${
                  duracionTurnoMin === min
                    ? "bg-tinta text-white border-tinta shadow-sm"
                    : "border-gray-200 text-pizarra hover:border-tinta hover:text-tinta bg-white"
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
          {ejemploInicio && (
            <p className="text-xs text-pizarra mt-2 bg-crema/70 p-2.5 rounded-lg border border-black/5">
              📌 Ejemplo: el {DIAS_SEMANA[ejemploInicio.dia]} tus clientas verán{" "}
              <b>{ejemploInicio.horas.map(hora12simple).join(", ")}…</b>
            </p>
          )}
        </div>

        {/* Cancelación — explicado en lenguaje claro */}
        <div>
          <label className="label">¿Hasta cuándo pueden cancelar tus clientas?</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              className="input max-w-[90px] text-center font-bold text-lg"
              value={ventana}
              onChange={(e) => setVentana(e.target.value)}
              min={0}
            />
            <span className="text-sm text-pizarra">horas antes de la cita</span>
          </div>
          {Number(ventana) === 0 ? (
            <p className="text-xs text-amber-600 mt-1.5">⚠️ Con 0 horas, tus clientas pueden cancelar en cualquier momento, incluso el mismo día.</p>
          ) : (
            <p className="text-xs text-pizarra mt-1.5">
              Ej: si tiene cita a las 3:00 p.m., puede cancelar hasta las{" "}
              <b>{cancelacionEjemplo(ventana)}</b>.
            </p>
          )}
        </div>
      </section>

      <section className="card p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Ausencias</h2>
          <p className="text-sm text-pizarra mt-0.5">Bloquea fechas puntuales (días completos o unas horas) en las que no vas a atender. Se guardan al instante y tus clientas no podrán agendar en ese tiempo.</p>
          {ausenciaMsg && (
            <p className={`text-sm font-semibold mt-2 ${ausenciaMsg.startsWith("⚠️") || ausenciaMsg.startsWith("No ") || ausenciaMsg.startsWith("La ") ? "text-red-600" : "text-green-700"}`}>
              {ausenciaMsg}
            </p>
          )}
        </div>

        {/* Selector de modo */}
        <div className="grid grid-cols-2 gap-1.5 bg-gray-100 rounded-xl p-1">
          {[
            { key: "dia", label: "Día completo" },
            { key: "horas", label: "Solo unas horas" },
          ].map((op) => (
            <button
              key={op.key}
              type="button"
              onClick={() => setModoBloqueo(op.key)}
              className={`rounded-lg py-2 text-sm font-bold transition ${
                modoBloqueo === op.key ? "bg-white text-tinta shadow-sm" : "text-pizarra"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {/* Formulario según modo */}
        {modoBloqueo === "dia" ? (
          <div className="flex flex-wrap gap-2">
            <input type="date" className="input flex-1 min-w-[150px]" min={fechaLocalHoy()} value={nuevoBloqueo} onChange={(e) => elegirFechaBloqueo(e.target.value)} />
            <button type="button" className="btn-outline text-sm whitespace-nowrap shrink-0" onClick={agregarBloqueo}>+ Bloquear</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <label className="label text-xs">Fecha</label>
                <input type="date" className="input" min={fechaLocalHoy()} value={nuevoBloqueo} onChange={(e) => elegirFechaBloqueo(e.target.value)} />
              </div>
              <div className="min-w-0">
                <label className="label text-xs">Desde</label>
                <input type="time" className="input" value={franjaIni} onChange={(e) => setFranjaIni(e.target.value)} />
              </div>
              <div className="min-w-0">
                <label className="label text-xs">Hasta</label>
                <input type="time" className="input" value={franjaFin} onChange={(e) => setFranjaFin(e.target.value)} />
              </div>
            </div>
            <input
              className="input"
              value={franjaMotivo}
              onChange={(e) => setFranjaMotivo(e.target.value)}
              placeholder="Motivo (opcional): cita médica, diligencia…"
              maxLength={60}
            />
            <button type="button" className="btn-outline text-sm w-full sm:w-auto" onClick={agregarFranja}>+ Bloquear horas</button>
          </div>
        )}

        {/* Lista de días completos bloqueados */}
        <div>
          <p className="label text-xs mb-1.5">Días completos bloqueados</p>
          <div className="flex flex-wrap gap-2">
            {diasBloqueados.length === 0
              ? <span className="text-sm text-pizarra">Ninguno.</span>
              : diasBloqueados.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 text-sm font-medium">
                    📅 {formatFechaBloq(f)}
                    <button onClick={() => quitarBloqueo(f)} className="text-red-500 hover:text-red-700 font-bold leading-none" aria-label="Quitar">×</button>
                  </span>
                ))
            }
          </div>
        </div>

        {/* Lista de franjas de horas bloqueadas */}
        <div>
          <p className="label text-xs mb-1.5">Horas bloqueadas</p>
          <div className="flex flex-wrap gap-2">
            {franjas.length === 0
              ? <span className="text-sm text-pizarra">Ninguna.</span>
              : franjas.map((f, i) => (
                  <span key={`${f.fecha}-${f.horaInicio}-${i}`} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-sm font-medium">
                    🕐 {formatFechaBloq(f.fecha)} · {hora12simple(f.horaInicio)}–{hora12simple(f.horaFin)}
                    {f.motivo ? <span className="text-pizarra font-normal">({f.motivo})</span> : null}
                    <button onClick={() => quitarFranja(i)} className="text-red-500 hover:text-red-700 font-bold leading-none" aria-label="Quitar">×</button>
                  </span>
                ))
            }
          </div>
        </div>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="font-display text-xl">Datos de pago (para tus clientas)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="min-w-0"><label className="label">Nequi</label><input className="input" value={datosPago.nequi || ""} onChange={(e) => setDatosPago({ ...datosPago, nequi: e.target.value })} placeholder="Número Nequi" /></div>
          <div className="min-w-0"><label className="label">Daviplata</label><input className="input" value={datosPago.daviplata || ""} onChange={(e) => setDatosPago({ ...datosPago, daviplata: e.target.value })} placeholder="Número Daviplata" /></div>
          <div className="min-w-0 sm:col-span-2"><label className="label">Cuenta bancaria</label><input className="input" value={datosPago.cuenta || ""} onChange={(e) => setDatosPago({ ...datosPago, cuenta: e.target.value })} placeholder="Banco y número de cuenta" /></div>
          <div className="min-w-0 sm:col-span-2">
            <label className="label">Código QR (imagen)</label>
            <input type="file" accept="image/*" onChange={onQR} className="block w-full max-w-full text-sm text-pizarra" />
            {datosPago.qrImagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={datosPago.qrImagen} alt="QR" className="mt-2 w-32 h-32 object-contain border rounded" />
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
        {msg && <span className={`text-sm font-semibold ${msg.includes("✔") || msg.includes("copiado") ? "text-green-700" : "text-red-600"}`}>{msg}</span>}
      </div>

      {conflictos.length > 0 && (
        <section className="card p-6 space-y-3 border-2 border-red-300 bg-red-50">
          <div className="flex items-start gap-2">
            <span className="text-2xl">🚫</span>
            <div>
              <h2 className="font-display text-xl">No se pudo guardar: tienes {conflictos.length} cita{conflictos.length !== 1 ? "s" : ""} agendada{conflictos.length !== 1 ? "s" : ""} en ese tiempo</h2>
              <p className="text-sm text-pizarra mt-0.5">
                No se puede dejar sin atención un horario con citas ya agendadas. Primero <b>comunícate con la clienta</b> para reagendar y cancela la cita desde el calendario; luego podrás guardar el cambio.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {conflictos.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{c.clienteNombre}</p>
                  <p className="text-xs text-pizarra">
                    📅 {formatFechaBloq(c.fecha)} · {hora12simple(c.horaInicio)}–{hora12simple(c.horaFin)}
                    {c.planSnapshot?.nombre ? ` · ${c.planSnapshot.nombre}` : ""} · {c.estado}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    className="btn-outline text-sm py-1.5"
                    onClick={() => onIrACita?.(c.fecha)}
                  >
                    Ver la cita
                  </button>
                  {c.clienteCelular && (
                    <a
                      className="btn-wa text-sm py-1.5"
                      href={linkWhatsApp(c.clienteCelular, mensajeReagendar(c, perfil), { plano: !esMovil() })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-pizarra">
            Para reagendar, escríbele a la clienta por WhatsApp y luego cancela la cita en la pestaña <b>Calendario</b>.
          </p>
        </section>
      )}
    </div>
  );
}

const hora12simple = formatearHora12;

// Lunes primero, domingo al final.
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

// Mismo criterio que validarSemana en el servidor, para avisar mientras edita.
function errorDia(d) {
  if (!d.tramos.length) return "Agrega un horario.";
  for (let i = 0; i < d.tramos.length; i++) {
    const t = d.tramos[i];
    if (!t.ini || !t.fin) return "Completa las horas.";
    if (t.fin <= t.ini) return "La hora final debe ser mayor que la inicial.";
    if (i > 0 && t.ini <= d.tramos[i - 1].fin) return "La hora de regreso de la pausa debe ser mayor que la de salida.";
  }
  return "";
}

function minutosDia(d) {
  return d.tramos.reduce((acc, t) => acc + Math.max(0, hhmmAMin(t.fin) - hhmmAMin(t.ini)), 0);
}

function formatoHoras(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function cancelacionEjemplo(horas) {
  const h = Number(horas);
  if (!h) return "";
  // Usamos día 2 para que restar horas no pise el día 1 y se calcule bien
  const base = new Date(2000, 0, 2, 15, 0);
  base.setMinutes(base.getMinutes() - h * 60);
  const hh = String(base.getHours()).padStart(2, "0");
  const mm = String(base.getMinutes()).padStart(2, "0");
  const hora = formatearHora12(`${hh}:${mm}`);
  if (h >= 24) return `${hora} del día anterior`;
  if (h >= 12) return `${hora} (mismo día)`;
  return hora;
}

function formatFechaBloq(fechaISO) {
  if (!fechaISO) return fechaISO;
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

// Mensaje de WhatsApp para pedirle a la clienta reagendar la cita que impide la ausencia.
function mensajeReagendar(cita, perfil) {
  const local = perfil?.local || `el ${obtenerMarca(perfil?.marca).textos.negocio}`;
  const fecha = formatFechaBloq(cita.fecha);
  const hora = hora12simple(cita.horaInicio);
  return (
    `Hola ${cita.clienteNombre}, soy de *${local}*.\n\n` +
    `Necesito reagendar tu cita del ${fecha} a las ${hora}, ya que no voy a poder atender en ese horario.\n\n` +
    `¿Qué día y hora te quedarían bien? Disculpa las molestias.`
  );
}
