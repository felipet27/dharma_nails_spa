"use client";

import { useState } from "react";
import { PLANES_DEFAULT, METODOS_PAGO_LABEL, MAX_SERVICIOS, formatoCOP } from "@/lib/constants";
import { useDialog } from "@/components/DialogProvider";

const METODOS = ["nequi", "daviplata", "qr", "cuenta", "efectivo"];

// Id solo para React (los servicios nuevos aún no tienen clave: el servidor
// les asigna una al guardar).
let contadorUid = 0;
const nuevoUid = () => `u${++contadorUid}`;

export default function EditorPlanes({ barbero, onClose, onGuardado }) {
  const { confirmar } = useDialog();
  const inicial = (barbero.planes && barbero.planes.length > 0 ? barbero.planes : PLANES_DEFAULT).map(
    (p) => ({
      ...p,
      uid: nuevoUid(),
      servicios: Array.isArray(p.servicios)
        ? [...p.servicios]
        : String(p.servicios || "").split(",").map((s) => s.trim()).filter(Boolean),
    })
  );
  const [planes, setPlanes] = useState(inicial);
  const [abierto, setAbierto] = useState(null); // uid del servicio que se está editando
  const [nuevoServicio, setNuevoServicio] = useState({});
  const [datosPago, setDatosPago] = useState(barbero.datosPago || {});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function setPlan(i, campo, valor) {
    setPlanes((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
  }
  function moverPlan(i, dir) {
    setPlanes((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }
  function agregarPlan() {
    const base = planes[planes.length - 1];
    const uid = nuevoUid();
    setPlanes((prev) => [
      ...prev,
      {
        uid,
        key: undefined,
        nombre: "",
        servicios: [],
        precio: 0,
        duracion: 60,
        anticipo: 0,
        metodosPago: base?.metodosPago?.length ? [...base.metodosPago] : ["nequi", "daviplata", "efectivo"],
        activo: true,
      },
    ]);
    setAbierto(uid);
  }
  async function eliminarPlan(i) {
    const p = planes[i];
    if (planes.length <= 1) { setError("Debe quedar al menos un servicio."); return; }
    const ok = await confirmar({
      titulo: "Eliminar servicio",
      mensaje: `¿Eliminar "${p.nombre || "este servicio"}"? Las citas ya agendadas con él se conservan. Si solo quieres ocultarlo por un tiempo, desmarca "Activo".`,
      confirmarLabel: "Eliminar",
      peligro: true,
    });
    if (!ok) return;
    setPlanes((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addServicio(i) {
    const texto = (nuevoServicio[i] || "").trim();
    if (!texto) return;
    setPlanes((prev) => prev.map((p, idx) => (idx === i ? { ...p, servicios: [...p.servicios, texto] } : p)));
    setNuevoServicio((prev) => ({ ...prev, [i]: "" }));
  }
  function removeServicio(i, j) {
    setPlanes((prev) => prev.map((p, idx) => (idx === i ? { ...p, servicios: p.servicios.filter((_, k) => k !== j) } : p)));
  }
  function moverServicio(i, j, dir) {
    setPlanes((prev) =>
      prev.map((p, idx) => {
        if (idx !== i) return p;
        const k = j + dir;
        if (k < 0 || k >= p.servicios.length) return p;
        const arr = [...p.servicios];
        [arr[j], arr[k]] = [arr[k], arr[j]];
        return { ...p, servicios: arr };
      })
    );
  }
  function toggleMetodo(i, m) {
    setPlanes((prev) =>
      prev.map((p, idx) => {
        if (idx !== i) return p;
        const set = new Set(p.metodosPago || []);
        set.has(m) ? set.delete(m) : set.add(m);
        return { ...p, metodosPago: [...set] };
      })
    );
  }

  async function guardar() {
    const sinNombre = planes.findIndex((p) => !String(p.nombre || "").trim());
    if (sinNombre >= 0) { setError("Ponle nombre a todos los servicios."); setAbierto(planes[sinNombre].uid); return; }
    setGuardando(true); setError("");
    const res = await fetch(`/api/admin/barberos/${barbero.id}/planes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planes: planes.map(({ uid, ...p }) => p), datosPago }),
    });
    setGuardando(false);
    if (res.ok) onGuardado?.();
    else { const d = await res.json(); setError(d.error || "Error"); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50 overflow-y-auto">
      <div className="card p-4 sm:p-6 w-full max-w-3xl my-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-display text-2xl">Servicios de {barbero.nombre}</h2>
            <p className="text-sm text-pizarra">{planes.length} servicio{planes.length !== 1 ? "s" : ""} · {planes.filter((p) => p.activo !== false).length} activo{planes.filter((p) => p.activo !== false).length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="text-3xl leading-none px-2 -mr-2" aria-label="Cerrar">×</button>
        </div>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        <div className="space-y-3">
          {planes.map((p, i) => (
            <div key={p.uid} className={`border rounded-xl p-4 ${p.activo === false ? "bg-gray-50" : ""}`}>
              {/* En celular los controles bajan a una segunda línea para que no se corten. */}
              <div className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-1 ${abierto === p.uid ? "mb-3" : ""}`}>
                <button
                  type="button"
                  onClick={() => setAbierto(abierto === p.uid ? null : p.uid)}
                  className="flex items-center gap-2 text-left min-w-0 flex-1 basis-56 py-1"
                  aria-expanded={abierto === p.uid}
                >
                  <span className="text-sm text-pizarra font-semibold w-5 shrink-0">{i + 1}.</span>
                  <span className="min-w-0">
                    <span className={`font-display text-lg block truncate ${p.activo === false ? "text-pizarra" : ""}`}>
                      {p.nombre || "Servicio nuevo"}
                    </span>
                    <span className="text-xs text-pizarra">
                      {formatoCOP(Number(p.precio) || 0)} · {p.duracion || 0} min
                      {Number(p.anticipo) > 0 ? ` · anticipo ${p.anticipo}%` : ""}
                      {p.activo === false ? " · oculto" : ""}
                    </span>
                  </span>
                  <span className="ml-auto text-pizarra text-sm shrink-0">{abierto === p.uid ? "▲" : "Editar ▼"}</span>
                </button>
                <div className="flex items-center gap-3 shrink-0 ml-auto">
                  <div className="flex flex-col leading-none">
                    <button type="button" onClick={() => moverPlan(i, -1)} disabled={i === 0}
                      title="Subir" aria-label="Subir servicio"
                      className="text-lg px-2 disabled:opacity-30 hover:text-brand">▲</button>
                    <button type="button" onClick={() => moverPlan(i, 1)} disabled={i === planes.length - 1}
                      title="Bajar" aria-label="Bajar servicio"
                      className="text-lg px-2 disabled:opacity-30 hover:text-brand">▼</button>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="w-5 h-5" checked={p.activo !== false} onChange={(e) => setPlan(i, "activo", e.target.checked)} />
                    Activo
                  </label>
                </div>
              </div>
              {abierto === p.uid && (<>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label">Nombre</label><input className="input" value={p.nombre || ""} onChange={(e) => setPlan(i, "nombre", e.target.value)} placeholder="Ej: Pedicure spa" autoFocus={!p.key} /></div>
                <div><label className="label">Precio (COP)</label><input type="number" className="input" value={p.precio} onChange={(e) => setPlan(i, "precio", e.target.value)} /></div>
                <div><label className="label">Duración (min)</label><input type="number" className="input" value={p.duracion} onChange={(e) => setPlan(i, "duracion", e.target.value)} /></div>
                <div><label className="label">Anticipo (%)</label><input type="number" className="input" value={p.anticipo} onChange={(e) => setPlan(i, "anticipo", e.target.value)} /></div>
              </div>
              <div className="mt-3">
                <label className="label">Qué incluye (opcional)</label>
                <ul className="space-y-2 mb-2">
                  {p.servicios.length === 0 && (
                    <li className="text-sm text-pizarra italic">Nada agregado todavía.</li>
                  )}
                  {p.servicios.map((s, j) => (
                    <li key={j} className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-1.5">
                      <div className="flex flex-col leading-none">
                        <button type="button" onClick={() => moverServicio(i, j, -1)} disabled={j === 0}
                          title="Subir" aria-label="Subir detalle"
                          className="text-xs disabled:opacity-30 hover:text-brand">▲</button>
                        <button type="button" onClick={() => moverServicio(i, j, 1)} disabled={j === p.servicios.length - 1}
                          title="Bajar" aria-label="Bajar detalle"
                          className="text-xs disabled:opacity-30 hover:text-brand">▼</button>
                      </div>
                      <span className="flex-1 text-sm">{s}</span>
                      <button type="button" onClick={() => removeServicio(i, j)}
                        title="Quitar" aria-label="Quitar detalle"
                        className="text-xl leading-none text-pizarra hover:text-brand px-2 py-1 -mr-2">×</button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder="Ej: Exfoliación"
                    value={nuevoServicio[i] || ""}
                    onChange={(e) => setNuevoServicio((prev) => ({ ...prev, [i]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addServicio(i); } }} />
                  <button type="button" className="btn-outline whitespace-nowrap" onClick={() => addServicio(i)}>Añadir</button>
                </div>
              </div>
              <div className="mt-3">
                <label className="label">Métodos de pago</label>
                <div className="flex flex-wrap gap-2">
                  {METODOS.map((m) => (
                    <button key={m} type="button" onClick={() => toggleMetodo(i, m)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${(p.metodosPago || []).includes(m) ? "bg-brand text-white border-brand" : "border-gray-300"}`}>
                      {METODOS_PAGO_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t flex justify-end">
                <button type="button" onClick={() => eliminarPlan(i)} className="text-sm font-semibold text-red-600 hover:text-red-800">
                  Eliminar servicio
                </button>
              </div>
              </>)}
            </div>
          ))}

          {planes.length < MAX_SERVICIOS && (
            <button
              type="button"
              onClick={agregarPlan}
              className="w-full border-2 border-dashed border-brand/40 rounded-xl py-3 font-semibold text-brand-deep hover:bg-brand-soft transition"
            >
              + Agregar servicio
            </button>
          )}

          <div className="border rounded-xl p-4">
            <h3 className="font-display text-lg mb-3">Datos de pago</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Nequi</label><input className="input" value={datosPago.nequi || ""} onChange={(e) => setDatosPago({ ...datosPago, nequi: e.target.value })} /></div>
              <div><label className="label">Daviplata</label><input className="input" value={datosPago.daviplata || ""} onChange={(e) => setDatosPago({ ...datosPago, daviplata: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="label">Cuenta bancaria</label><input className="input" value={datosPago.cuenta || ""} onChange={(e) => setDatosPago({ ...datosPago, cuenta: e.target.value })} /></div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3 justify-end">
          <button className="btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar servicios"}</button>
        </div>
      </div>
    </div>
  );
}

