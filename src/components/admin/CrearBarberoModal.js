"use client";

import { useState } from "react";
import { OjoAbierto, OjoCerrado, WhatsAppIcon } from "@/components/Icons";
import { BARBERIA_SEDE_DEFAULT, INTERVALOS_INICIO_OPCIONES } from "@/lib/constants";
import { MARCA_DEFAULT, obtenerMarca, capitalizar } from "@/lib/brands";
import { linkWhatsApp } from "@/lib/whatsapp";
import { esMovil } from "@/lib/dispositivo";

export default function CrearBarberoModal({ onClose, onCreado, defaultBarberia }) {
  const sede = defaultBarberia || BARBERIA_SEDE_DEFAULT;
  const marcaId = MARCA_DEFAULT;
  const marca = obtenerMarca(marcaId);
  const t = marca.textos;
  const [form, setForm] = useState({
    nombre: "",
    celular: "",
    emailAlias: "",
  });

  const [duracionTurnoMin, setDuracionTurnoMin] = useState(30);
  const [password, setPassword] = useState(`${marca.nicho}123*`);
  const [verPassword, setVerPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Estado de éxito
  const [resultado, setResultado] = useState(null); // { barbero, credenciales }
  const [copiado, setCopiado] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function generarPasswordAleatoria() {
    const num = Math.floor(1000 + Math.random() * 9000);
    setPassword(`${marca.nicho}#${num}`);
  }

  // Si el usuario pega un correo completo en emailAlias, limpiamos o extraemos
  const dominioMarca = `@${marca.slug}.com`;

  function handleEmailChange(val) {
    const limpio = val.trim().toLowerCase().replace(new RegExp(`@${marca.slug}\\.com$`), "");
    set("emailAlias", limpio);
  }

  const emailFinal = form.emailAlias
    ? form.emailAlias.includes("@")
      ? form.emailAlias.trim().toLowerCase()
      : `${form.emailAlias.trim().toLowerCase()}${dominioMarca}`
    : "";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.celular.trim() || !form.emailAlias.trim()) {
      setError("Nombre, celular y correo son obligatorios.");
      return;
    }

    if (password.trim().length < 6) {
      setError("La contraseña temporal debe tener al menos 6 caracteres.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      const res = await fetch("/api/admin/barberos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // La sede (local, ciudad, dirección) la asigna el servidor a partir del
          // local actual: no se le pide al admin.
          nombre: form.nombre.trim(),
          celular: form.celular.trim(),
          email: emailFinal,
          password: password.trim(),
          duracionTurnoMin: Number(duracionTurnoMin),
          marca: marcaId,
        }),
      });

      const data = await res.json();
      setGuardando(false);

      if (!res.ok) {
        setError(data.error || `Ocurrió un error al crear la ${t.profesional}.`);
        return;
      }

      setResultado(data);
    } catch (err) {
      setGuardando(false);
      setError("Error de conexión. Inténtalo de nuevo.");
    }
  }

  async function copiarCredenciales() {
    if (!resultado) return;
    const texto = `${t.emoji} *Bienvenida a ${marca.nombre}*\n\nTus datos de acceso como ${t.profesional}:\n📧 *Correo:* ${resultado.credenciales.email}\n🔑 *Contraseña temporal:* ${resultado.credenciales.password}\n🌐 *Acceso:* ${window.location.origin}/especialista/panel\n\n_Al ingresar por primera vez, el sistema te solicitará cambiar tu contraseña._`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert("No se pudo copiar automáticamente. Por favor copia manualmente los datos.");
    }
  }

  function obtenerEnlaceWhatsApp() {
    if (!resultado) return "#";
    const mensaje = (
      `${t.emoji} ¡Hola ${resultado.barbero.nombre}! Ya hemos configurado tu cuenta en ${marca.nombre}.\n\n` +
      `Tus datos de acceso son:\n` +
      `📧 Correo: ${resultado.credenciales.email}\n` +
      `🔑 Contraseña temporal: ${resultado.credenciales.password}\n` +
      `🌐 Ingresa aquí: ${window.location.origin}/especialista/panel\n\n` +
      `Al entrar por primera vez el sistema te solicitará definir tu nueva contraseña personal.`
    );
    return linkWhatsApp(resultado.barbero.celular, mensaje, { plano: !esMovil() });
  }

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center p-4 z-50 overflow-y-auto">
      <div className="card p-6 w-full max-w-lg my-8 space-y-6 animate-fade-up">

        {resultado ? (
          /* Pantalla de Éxito */
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h2 className="font-display text-2xl">¡{capitalizar(t.profesional)} creada exitosamente!</h2>
              <p className="text-sm text-pizarra">
                La cuenta para <b>{resultado.barbero.nombre}</b> quedó <b>activa</b> y lista para usarse.
              </p>
            </div>

            {/* Tarjeta de credenciales */}
            <div className="rounded-xl bg-crema border border-black/10 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase text-pizarra tracking-wider">
                Credenciales de acceso
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-pizarra">Usuario / Correo:</span>{" "}
                  <b className="font-mono text-tinta select-all">{resultado.credenciales.email}</b>
                </p>
                <p>
                  <span className="text-pizarra">Contraseña temporal:</span>{" "}
                  <b className="font-mono text-tinta select-all">{resultado.credenciales.password}</b>
                </p>
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                🔒 La {t.profesional} deberá cambiar esta contraseña obligatoriamente en su primer inicio de sesión.
              </p>
            </div>

            {/* Acciones para compartir */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copiarCredenciales}
                  className="btn-outline flex-1 py-2 text-sm flex items-center justify-center gap-2"
                >
                  {copiado ? "✓ ¡Copiado!" : "📋 Copiar credenciales"}
                </button>
                <a
                  href={obtenerEnlaceWhatsApp()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-wa flex-1 py-2 text-sm flex items-center justify-center gap-2"
                >
                  <WhatsAppIcon className="w-4 h-4" /> Enviar por WhatsApp
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  onCreado?.(resultado.barbero, true); // true = abrir planes
                }}
                className="btn-dark w-full py-2.5 text-sm"
              >
                Configurar o validar planes de esta {t.profesional} →
              </button>

              <button
                type="button"
                onClick={() => {
                  onCreado?.(resultado.barbero, false);
                }}
                className="btn-outline border-transparent text-pizarra hover:bg-black/5 hover:text-black w-full py-2 text-sm"
              >
                Volver a la lista de especialistas
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Registro Manual */
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-display text-2xl">Crear nueva {t.profesional}</h2>
                <p className="text-xs text-pizarra">Registro manual directo desde el panel de administración.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-2xl leading-none text-pizarra hover:text-tinta"
                disabled={guardando}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre de la {t.profesional} *</label>
                  <input
                    className="input"
                    value={form.nombre}
                    onChange={(e) => set("nombre", e.target.value)}
                    placeholder="Ej. Laura Gómez"
                    required
                  />
                </div>
                <div>
                  <label className="label">Celular / WhatsApp *</label>
                  <input
                    className="input"
                    type="tel"
                    value={form.celular}
                    onChange={(e) => set("celular", e.target.value)}
                    placeholder="Ej. 3001234567"
                    required
                  />
                </div>
              </div>

              {/* Sede: se asigna automáticamente al local actual (solo informativo) */}
              <div className="rounded-xl bg-crema/70 border border-linea px-3.5 py-2.5 text-xs text-pizarra">
                <span className="font-bold uppercase tracking-wider">
                  {t.emoji} Sede / {capitalizar(t.negocio)}:
                </span>{" "}
                <span className="text-tinta font-semibold">{sede.local || marca.nombre}</span>
                {[sede.direccion, sede.ciudad].filter(Boolean).length > 0 && (
                  <> · {[sede.direccion, sede.ciudad].filter(Boolean).join(", ")}</>
                )}
              </div>

              {/* Correo con el dominio de la marca por defecto */}
              <div>
                <label className="label">Correo electrónico institucional *</label>
                <div className="flex rounded-lg border border-linea focus-within:border-brand-deep focus-within:ring-1 focus-within:ring-brand-deep overflow-hidden bg-white">
                  <input
                    className="flex-1 px-3 py-2.5 outline-none text-base text-right sm:text-left"
                    type="text"
                    value={form.emailAlias}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder={`nombre.${t.profesional}`}
                    required
                  />
                  <span className="inline-flex items-center px-3 bg-gray-100 text-pizarra font-medium text-sm select-none border-l border-gray-200">
                    {form.emailAlias.includes("@") ? "" : dominioMarca}
                  </span>
                </div>
                <p className="text-xs text-pizarra mt-1">
                  Dirección final: <span className="font-medium text-tinta">{emailFinal || "(escribe el usuario)"}</span>
                </p>
              </div>

              {/* Intervalo de horas de inicio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">⏱️ Horas de inicio cada…</label>
                  <span className="text-xs font-bold text-brand-deep bg-brand-soft px-2 py-0.5 rounded border border-brand/20">
                    cada {duracionTurnoMin} min
                  </span>
                </div>
                <p className="text-xs text-pizarra mb-1.5">
                  Cada cuánto se ofrece una hora para empezar una cita. Cada servicio ocupa su propia duración:
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {INTERVALOS_INICIO_OPCIONES.map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setDuracionTurnoMin(min)}
                      className={`rounded-lg py-1.5 text-xs font-bold border transition ${
                        duracionTurnoMin === min
                          ? "bg-tinta text-white border-tinta shadow-sm"
                          : "border-gray-200 text-pizarra hover:border-tinta hover:text-tinta bg-white"
                      }`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Contraseña temporal */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="label mb-0">Contraseña temporal *</label>
                  <button
                    type="button"
                    onClick={generarPasswordAleatoria}
                    className="text-xs text-brand-deep hover:underline font-semibold"
                  >
                    Generar aleatoria
                  </button>
                </div>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={verPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(!verPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-pizarra hover:text-tinta"
                    tabIndex={-1}
                    aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {verPassword ? <OjoCerrado className="w-5 h-5" /> : <OjoAbierto className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-pizarra mt-1">
                  La {t.profesional} deberá cambiar esta clave obligatoriamente en su primer ingreso.
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 leading-relaxed">
                ℹ️ La cuenta se creará en estado <b>Activo</b> con 30 días de suscripción y los planes base cargados. Luego podrás ajustar o validar sus servicios y precios.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline flex-1"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={guardando}
                >
                  {guardando ? "Creando…" : `Crear ${t.profesional}`}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
