"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  X,
  MessageSquare,
  Folder,
  Hash,
  Sparkles,
  MapPin,
  CheckCircle2,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useAsistenteContext } from "@/lib/asistente-context";
import { TIPOS_DOCUMENTO } from "@/lib/constantes";

const DURACION_SEGUNDOS = 14;

export function VentanaAlertaLateral() {
  const { highlightInfo, setHighlight, periodos } = useAsistenteContext();
  const [progreso, setProgreso] = useState(100);
  const [pausado, setPausado] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const tiempoInicioRef = useRef<number>(Date.now());
  const tiempoRestanteRef = useRef<number>(DURACION_SEGUNDOS * 1000);

  // Reiniciar contador cada vez que cambia el highlight
  useEffect(() => {
    if (!highlightInfo) {
      setProgreso(100);
      setMinimizado(false);
      return;
    }

    tiempoInicioRef.current = Date.now();
    tiempoRestanteRef.current = DURACION_SEGUNDOS * 1000;
    setProgreso(100);
    setMinimizado(false);

    let ultimoTick = Date.now();

    const tick = () => {
      const ahora = Date.now();
      const delta = ahora - ultimoTick;
      ultimoTick = ahora;

      if (!pausado) {
        tiempoRestanteRef.current -= delta;
        const p = Math.max(0, (tiempoRestanteRef.current / (DURACION_SEGUNDOS * 1000)) * 100);
        setProgreso(p);

        if (tiempoRestanteRef.current <= 0) {
          setHighlight(null);
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [highlightInfo, pausado, setHighlight]);

  if (!highlightInfo) return null;

  const tipoDef = highlightInfo.tipoId
    ? TIPOS_DOCUMENTO.find((t) => t.id === highlightInfo.tipoId)
    : null;

  // Buscar nombre del lote/proveedor
  const loteTarget = highlightInfo.loteId
    ? periodos.flatMap((p) => p.lotes).find((l) => l.id === highlightInfo.loteId)
    : null;

  const proveedorNombre = highlightInfo.grupoNombre || loteTarget?.proveedor;

  const esPareja = highlightInfo.tipo === "pareja_incompleta";
  const esConsecutivo = highlightInfo.tipo === "consecutivo";
  const esTipoFaltante = highlightInfo.tipo === "tipo_faltante";

  const tituloAlerta = esPareja
    ? "Pareja Incompleta"
    : esConsecutivo
    ? "Salto de Consecutivo"
    : esTipoFaltante
    ? "Carpeta Requerida Vacía"
    : "Inconveniente Detectado";

  const colorTema = esPareja
    ? "#ea580c"
    : esConsecutivo
    ? "#d97706"
    : esTipoFaltante
    ? "#e11d48"
    : "#f97316";

  const handleEnfocar = () => {
    if (highlightInfo.tipoId) {
      const el = document.getElementById(`tipo-${highlightInfo.tipoId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    if (highlightInfo.loteId) {
      const elLote = document.getElementById(`lote-${highlightInfo.loteId}`);
      elLote?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleAbrirChat = () => {
    window.dispatchEvent(new CustomEvent("abrir-chat-asistente"));
  };

  return (
    <AnimatePresence>
      <motion.aside
        key="ventana-lateral-alerta"
        initial={{ x: 120, opacity: 0, scale: 0.96 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 140, opacity: 0, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        role="alert"
        aria-live="assertive"
        style={{
          position: "fixed",
          top: 86,
          right: 20,
          zIndex: 1100,
          width: "min(390px, calc(100vw - 32px))",
          background: "#ffffff",
          borderRadius: 18,
          border: `1.5px solid ${colorTema}55`,
          boxShadow: "0 14px 40px -4px rgba(234, 88, 12, 0.25), 0 6px 18px rgba(0,0,0,0.08)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "inherit",
          userSelect: "none",
        }}
      >
        {/* Barra superior de progreso con gradiente */}
        <div
          style={{
            height: 4,
            width: "100%",
            background: "#fed7aa",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progreso}%`,
              background: `linear-gradient(90deg, ${colorTema}, #f97316)`,
              transition: pausado ? "none" : "width 0.1s linear",
            }}
          />
        </div>

        {/* Contenido principal */}
        <div style={{ padding: "14px 16px 14px 16px", position: "relative" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${colorTema}18`,
                  border: `1px solid ${colorTema}35`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {esPareja ? (
                  <Folder size={18} style={{ color: colorTema }} />
                ) : esConsecutivo ? (
                  <Hash size={18} style={{ color: colorTema }} />
                ) : (
                  <AlertTriangle size={18} style={{ color: colorTema }} />
                )}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: colorTema,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {tituloAlerta}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      background: "#ffedd5",
                      color: "#c2410c",
                      borderRadius: 99,
                      padding: "1px 6px",
                    }}
                  >
                    Amiga IA
                  </span>
                </div>
                <h4
                  style={{
                    margin: "1px 0 0",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#1c1917",
                    lineHeight: 1.2,
                  }}
                >
                  Inconveniente localizado
                </h4>
              </div>
            </div>

            {/* Botones cerrar y minimizar */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => setMinimizado(!minimizado)}
                title={minimizado ? "Expandir" : "Minimizar"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#78716c",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f4")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {minimizado ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button
                onClick={() => setHighlight(null)}
                title="Cerrar alerta"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#78716c",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fee2e2";
                  e.currentTarget.style.color = "#dc2626";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#78716c";
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Vista minimizada (si aplica) */}
          {minimizado ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 2px 0",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "#57534e",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 240,
                }}
              >
                {highlightInfo.mensaje}
              </span>
              <button
                onClick={() => setMinimizado(false)}
                style={{
                  background: "#fff7ed",
                  color: colorTema,
                  border: `1px solid ${colorTema}40`,
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Ver detalle
              </button>
            </div>
          ) : (
            <>
              {/* Caja con el mensaje descriptivo del problema */}
              <div
                style={{
                  background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                  border: "1px solid #fed7aa",
                  borderRadius: 12,
                  padding: "10px 12px",
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: "#7c2d12",
                    fontWeight: 600,
                  }}
                >
                  {highlightInfo.mensaje}
                </p>
              </div>

              {/* Badges de contexto: Tipo doc + Proveedor */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                {tipoDef && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: `${tipoDef.color}15`,
                      border: `1px solid ${tipoDef.color}35`,
                      color: tipoDef.color,
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: 99,
                      padding: "2px 9px",
                    }}
                  >
                    <span>📁</span>
                    <span>{tipoDef.label}</span>
                  </div>
                )}

                {proveedorNombre && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "#f5f5f4",
                      border: "1px solid #e7e5e4",
                      color: "#44403c",
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: 99,
                      padding: "2px 9px",
                      maxWidth: 180,
                    }}
                  >
                    <MapPin size={11} color="#78716c" />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {proveedorNombre}
                    </span>
                  </div>
                )}
              </div>

              {/* Tip contable si es pareja incompleta */}
              {esPareja && tipoDef?.ayudaPareja && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 8,
                    padding: "7px 10px",
                    marginBottom: 12,
                    fontSize: 11,
                    color: "#166534",
                    lineHeight: 1.4,
                  }}
                >
                  <Sparkles size={13} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong style={{ fontWeight: 700 }}>Recordatorio contable:</strong> Esta pareja debe
                    contener <em>{tipoDef.ayudaPareja}</em>.
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  paddingTop: 4,
                  borderTop: "1px solid #f5f5f4",
                }}
              >
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={handleEnfocar}
                    title="Hacer scroll al elemento resaltado"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "#ffffff",
                      border: "1.5px solid #d6d3d1",
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#44403c",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colorTema;
                      e.currentTarget.style.color = colorTema;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#d6d3d1";
                      e.currentTarget.style.color = "#44403c";
                    }}
                  >
                    <span>🎯</span> Centrar
                  </button>

                  <button
                    onClick={handleAbrirChat}
                    title="Preguntar a Amiga IA para solucionarlo"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: `${colorTema}15`,
                      border: `1px solid ${colorTema}40`,
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: colorTema,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `${colorTema}25`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = `${colorTema}15`)}
                  >
                    <MessageSquare size={12} /> Preguntar a IA
                  </button>
                </div>

                <button
                  onClick={() => setHighlight(null)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: "transparent",
                    border: "none",
                    color: "#78716c",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "5px 6px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1c1917")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#78716c")}
                >
                  <CheckCircle2 size={12} /> Entendido
                </button>
              </div>
            </>
          )}

          {/* Indicador sutil de pausa al pasar el mouse */}
          {pausado && !minimizado && (
            <div
              style={{
                position: "absolute",
                bottom: 2,
                right: 14,
                fontSize: 8.5,
                color: "#a8a29e",
                fontStyle: "italic",
              }}
            >
              Pausado mientras lees
            </div>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
