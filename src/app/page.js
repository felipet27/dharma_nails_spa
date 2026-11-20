"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header, { IconoMarca } from "@/components/Header";
import { useBrand } from "@/components/BrandProvider";
import { capitalizar, CONTACTO } from "@/lib/brands";
import { linkWhatsApp } from "@/lib/whatsapp";
import BotonInstalarApp from "@/components/BotonInstalarApp";
import ContactoAdmin from "@/components/ContactoAdmin";

function HeroTitulo({ texto }) {
  const resaltado = "sin filas";
  const i = texto.indexOf(resaltado);
  if (i < 0) return texto;
  return (
    <>
      {texto.slice(0, i)}
      <span className="text-brand-on-dark">{resaltado}</span>
      {texto.slice(i + resaltado.length)}
    </>
  );
}

export default function HomeMarcaPage() {
  const { id: marcaId, marca, t, listo } = useBrand();
  const waSpa = linkWhatsApp(CONTACTO.whatsapp, `Hola ${marca.nombre}, quiero información sobre sus servicios.`);
  const [barberos, setBarberos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!listo) return;
    let vigente = true;
    setCargando(true);
    fetch(`/api/barberos?marca=${marcaId}`)
      .then((r) => r.json())
      .then((d) => { if (vigente) setBarberos(d.barberos || []); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [marcaId, listo]);

  return (
    <div className="min-h-screen">
      <Header>
        <Link href={`/mis-citas`} className="hover:text-brand-on-dark">Mis citas</Link>
        <Link href={`/especialista/login`} className="hover:text-brand-on-dark">Soy {t.profesional}</Link>
        <Link href={`/admin/login`} className="text-white/40 hover:text-white/70 hidden sm:inline-flex text-xs">Admin</Link>
      </Header>

      <section className="bg-tinta text-hueso bg-[radial-gradient(ellipse_at_35%_60%,rgb(255_255_255/0.06)_0%,transparent_70%)]">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="font-display text-lg sm:text-xl tracking-wide text-brand-on-dark">
              {t.emoji} {marca.nombre}
            </p>
            <h1 className="font-display text-4xl md:text-5xl leading-tight mt-1">
              <HeroTitulo texto={t.hero} />
            </h1>
            <p className="mt-4 text-white/80 text-base sm:text-lg">
              {t.descHero}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#especialistas" className="btn-accent w-full sm:w-auto justify-center">{t.cta}</a>
              <Link href={`/mis-citas`} className="btn-outline border-white text-white hover:bg-white hover:text-tinta w-full sm:w-auto justify-center">
                Ver mi cita
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={marca.logos.claro}
              alt={`Logo de ${marca.nombre}`}
              className="w-72 lg:w-80 rounded-3xl shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </div>
        <div className="h-1 sm:h-1.5 brand-stripe" />
      </section>

      <section id="especialistas" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-3xl flex items-center gap-2">
          <IconoMarca className="w-8 h-8" /> {t.escogeProfesional}
        </h2>
        <p className="text-pizarra mt-1">Estas son las {t.profesionales} de {marca.nombre}. {t.ctaEscoger}.</p>

        {cargando ? (
          <p className="mt-8 text-pizarra">Cargando {t.profesionales}…</p>
        ) : barberos.length === 0 ? (
          <div className="mt-8 card p-8 text-center text-pizarra">
            Todavía no hay {t.profesionales} por acá. ¡Vuelve pronto!
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {barberos.map((b, idx) => (
              <Link
                key={b.id}
                href={`/agendar/${b.id}`}
                className="relative rounded-2xl overflow-hidden aspect-[3/4] group animate-fade-up"
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                {b.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.foto}
                    alt={b.nombre}
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 brand-stripe" />
                )}
                {!b.foto && (
                  // Sin foto: en pantallas grandes la inicial va centrada; en
                  // celular va junto al nombre (abajo) para no cruzarse con él.
                  <div className="absolute inset-0 hidden sm:flex items-center justify-center">
                    <span className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white grid place-items-center font-display text-4xl">
                      {b.nombre?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-2 ring-inset ring-brand/60" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                  {!b.foto && (
                    <span className="sm:hidden mb-2 w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white grid place-items-center font-display text-xl">
                      {b.nombre?.[0]?.toUpperCase()}
                    </span>
                  )}
                  <h3 className="font-display text-white text-lg sm:text-xl leading-tight">{b.nombre}</h3>
                  <p className="text-white/50 text-xs mb-2 truncate">{capitalizar(t.profesional)} en {marca.nombre}</p>
                  <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                    {/* Con muchos servicios se muestran los 3 primeros y "+N". */}
                    {b.planes.slice(0, 3).map((p) => (
                      <span key={p.key} className="text-[10px] sm:text-xs font-semibold bg-white/15 text-white rounded-full px-2 py-0.5 backdrop-blur-sm">
                        {p.nombre}
                      </span>
                    ))}
                    {b.planes.length > 3 && (
                      <span className="text-[10px] sm:text-xs font-semibold bg-white/25 text-white rounded-full px-2 py-0.5 backdrop-blur-sm">
                        +{b.planes.length - 3}
                      </span>
                    )}
                  </div>
                  <span className="text-brand-on-dark font-bold text-sm group-hover:text-white transition-colors duration-200">
                    Agendar →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="bg-tinta text-white/70 text-sm">
        <div className="h-1 sm:h-1.5 brand-stripe" />
        <div className="mx-auto max-w-6xl px-4 py-5 sm:py-6 flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3 text-center sm:text-left">
          <span>{marca.nombre} · © {new Date().getFullYear()}</span>
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-x-4 gap-y-2">
            <BotonInstalarApp className="inline-flex items-center font-semibold text-white hover:text-brand-on-dark" />
            <a href={CONTACTO.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white py-1.5">Instagram</a>
            <a href={waSpa} target="_blank" rel="noopener noreferrer" className="hover:text-white py-1.5">WhatsApp</a>
            <Link href={`/especialista/login`} className="hover:text-white py-1.5">Soy {t.profesional}</Link>
            <Link href={`/admin/login`} className="hover:text-white py-1.5">Administrador</Link>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-3 text-center text-xs text-white/50">
            <ContactoAdmin className="hover:text-white inline-block py-1.5" />
          </div>
        </div>
      </footer>
    </div>
  );
}
