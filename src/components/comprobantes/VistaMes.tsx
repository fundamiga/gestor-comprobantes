"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  ChevronRight,
  FolderArchive,
  FolderOpen,
  Folder,
  AlertCircle,
  CheckCircle2,
  LayoutGrid,
  List,
} from "lucide-react";
import type { Lote, Periodo, ArchivoSubido } from "@/types";
import { MESES } from "@/lib/constantes";
import { motion } from "framer-motion";
import {
  calcularEstadoLote,
  colorEstado,
  analizarConsecutivos,
  agruparEnRangos,
} from "@/lib/utils";
import { EstadoBadge } from "./UIComunes";
import { ModalCrearLote } from "./ModalCrearLote";
import { VistaLote } from "./VistaLote";
import { TIPOS_DOCUMENTO } from "@/lib/constantes";

interface VistaMesProps {
  periodo: Periodo;
  loteInicialId?: string | null;
  tipoInicialId?: string | null;
  onCrearLote: (datos: Pick<Lote, "proveedor" | "referencia" | "tipoPago">) => void;
  onEliminarLote: (loteId: string) => void;
  onActualizarLote: (loteId: string, datos: Partial<Lote>) => void;
  onAgregarArchivo: (loteId: string, tipoId: string, archivo: ArchivoSubido) => void;
  onEliminarArchivo: (loteId: string, tipoId: string, archivoId: string) => void;
  onActualizarArchivosDoc: (loteId: string, tipoId: string, nuevosArchs: ArchivoSubido[]) => void;
  onVolver: () => void;
}

export function VistaMes({
  periodo,
  loteInicialId,
  tipoInicialId,
  onCrearLote,
  onEliminarLote,
  onActualizarLote,
  onAgregarArchivo,
  onEliminarArchivo,
  onActualizarArchivosDoc,
  onVolver,
}: VistaMesProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [loteAbierto, setLoteAbierto] = useState<string | null>(loteInicialId ?? null);
  const [modoVista, setModoVista] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (loteInicialId) {
      setLoteAbierto(loteInicialId);
    }
  }, [loteInicialId]);

  const mesLabel = `${MESES[periodo.mes]} ${periodo.anio}`;
  const requeridos = TIPOS_DOCUMENTO.filter((t) => t.requerido);

  // Si hay un lote abierto, mostrar VistaLote
  if (loteAbierto) {
    const lote = periodo.lotes.find((l) => l.id === loteAbierto);
    if (lote) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <VistaLote
            lote={lote}
            periodo={periodo}
            tipoInicialId={tipoInicialId}
            onAgregarArchivo={(tipoId, arch) =>
              onAgregarArchivo(loteAbierto, tipoId, arch)
            }
            onEliminarArchivo={(tipoId, archivoId) =>
              onEliminarArchivo(loteAbierto, tipoId, archivoId)
            }
            onActualizarArchivosDoc={(tipoId, nuevosArchs) =>
              onActualizarArchivosDoc(loteAbierto, tipoId, nuevosArchs)
            }
            onActualizarLote={(datos) => onActualizarLote(loteAbierto, datos)}
            onVolver={() => setLoteAbierto(null)}
          />
        </motion.div>
      );
    }
  }

  const completos = periodo.lotes.filter(
    (l) => calcularEstadoLote(l) === "completo"
  ).length;
  const incompletos = periodo.lotes.filter(
    (l) => calcularEstadoLote(l) === "incompleto"
  ).length;
  const vacios = periodo.lotes.filter(
    (l) => calcularEstadoLote(l) === "vacio"
  ).length;

  const alertasConsecutivos = analizarConsecutivos(periodo);
  const hayDatosConsecutivos = Object.keys(alertasConsecutivos).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {modalAbierto && (
        <ModalCrearLote
          mes={periodo.mes}
          anio={periodo.anio}
          onCrear={(datos) => {
            onCrearLote(datos);
            setModalAbierto(false);
          }}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

      {/* Header sticky */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid #f1f5f9",
          padding: "14px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Breadcrumb estilo Google Drive */}
        <div className="drive-breadcrumb" style={{ marginBottom: 12 }}>
          <button
            onClick={onVolver}
            className="drive-breadcrumb-item"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#1a73e8",
              fontFamily: "inherit",
              padding: "4px 8px",
            }}
          >
            <Folder size={16} style={{ color: "#1a73e8", fill: "#1a73e820" }} />
            <span>Mi unidad</span>
          </button>
          <ChevronRight size={14} style={{ color: "#747775" }} />
          <div
            className="drive-breadcrumb-item"
            style={{ cursor: "default", fontWeight: 800, color: "#1f1f1f" }}
          >
            <Calendar size={15} style={{ color: "#f59e0b" }} />
            <span>{mesLabel}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={20} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#0f172a",
                }}
              >
                {mesLabel}
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                {periodo.lotes.length} lote{periodo.lotes.length !== 1 ? "s" : ""} ·{" "}
                {completos} completo{completos !== 1 ? "s" : ""}
                {incompletos > 0
                  ? ` · ${incompletos} incompleto${incompletos !== 1 ? "s" : ""}`
                  : ""}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Switcher Cuadrícula / Lista */}
            <div
              style={{
                display: "flex",
                background: "#f1f3f4",
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}
            >
              <button
                onClick={() => setModoVista("grid")}
                title="Vista en cuadrícula"
                style={{
                  background: modoVista === "grid" ? "#ffffff" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 9px",
                  cursor: "pointer",
                  boxShadow: modoVista === "grid" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <LayoutGrid size={15} style={{ color: modoVista === "grid" ? "#1a73e8" : "#5f6368" }} />
              </button>
              <button
                onClick={() => setModoVista("list")}
                title="Vista en lista"
                style={{
                  background: modoVista === "list" ? "#ffffff" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  padding: "5px 9px",
                  cursor: "pointer",
                  boxShadow: modoVista === "list" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <List size={15} style={{ color: modoVista === "list" ? "#1a73e8" : "#5f6368" }} />
              </button>
            </div>

            {periodo.lotes.length > 0 && (
              <button
                onClick={async () => {
                  const { descargarPeriodoZip } = await import("@/lib/zipMerger");
                  descargarPeriodoZip(periodo);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#fff",
                  color: "#475569",
                  border: "1px solid #dadce0",
                  borderRadius: 24,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >
                <FolderArchive size={15} style={{ color: "#64748b" }} /> Descargar mes (ZIP)
              </button>
            )}
            <button
              onClick={() => setModalAbierto(true)}
              className="drive-pill-btn"
              style={{ background: "#ffffff", color: "#1f1f1f" }}
            >
              <Plus size={16} style={{ color: "#1a73e8" }} />
              <span>Nuevo Lote</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: "16px 24px", maxWidth: modoVista === "grid" ? 1100 : 720, margin: "0 auto", transition: "max-width 0.25s ease" }}>
        {/* Resumen del mes — chips compactos */}
        {periodo.lotes.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "Completos", valor: completos, color: "#1e8e3e", bg: "#e6f4ea", dot: "#1e8e3e" },
              { label: "Incompletos", valor: incompletos, color: "#b06000", bg: "#fef3c7", dot: "#f9ab00" },
              { label: "Sin docs", valor: vacios, color: "#5f6368", bg: "#f1f3f4", dot: "#9aa0a6" },
            ].map((item) => (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: 7,
                background: item.bg, borderRadius: 99,
                padding: "5px 14px 5px 10px", border: `1px solid ${item.dot}30`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, display: "inline-block" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.valor}</span>
                <span style={{ fontSize: 11, color: item.color, opacity: 0.8 }}>{item.label}</span>
              </div>
            ))}
          </div>
        )}


        {/* Lista vacía */}
        {periodo.lotes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                background: "#f1f5f9",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <FolderOpen size={32} style={{ color: "#cbd5e1" }} />
            </div>
            <p
              style={{
                fontWeight: 800,
                color: "#94a3b8",
                fontSize: 15,
                margin: "0 0 6px",
              }}
            >
              Sin lotes en este mes
            </p>
            <p
              style={{ color: "#cbd5e1", fontSize: 13, margin: "0 0 20px" }}
            >
              Crea un lote por cada proveedor o concepto de gasto
            </p>
            <button
              onClick={() => setModalAbierto(true)}
              style={{
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "10px 24px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
              }}
            >
              <Plus size={16} /> Crear primer lote
            </button>
          </div>
        ) : (
          /* Explorador de Lotes - Estilo Google Drive */
          <div>
            <p
              style={{
                fontWeight: 700,
                fontSize: 12,
                color: "#444746",
                margin: "0 0 12px 2px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Folder size={14} style={{ color: "#5f6368" }} /> Carpetas de Lotes
            </p>

            {modoVista === "grid" ? (
              /* VISTA CUADRÍCULA — carpetas con thumbnail estilo Drive */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 8 }}>
                {periodo.lotes.map((lote) => {
                  const estado = calcularEstadoLote(lote);
                  const cargados = requeridos.filter((t) => (lote.documentos[t.id] ?? []).length > 0).length;
                  const totalArchivos = Object.values(lote.documentos).flat().length;
                  const folderColor = estado === "completo" ? "#1e8e3e" : estado === "incompleto" ? "#f9ab00" : "#9aa0a6";

                  return (
                    <motion.div
                      key={lote.id}
                      className="drive-folder-card"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setLoteAbierto(lote.id)}
                      style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget.querySelector(".lote-del-btn") as HTMLElement | null;
                        if (btn) btn.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget.querySelector(".lote-del-btn") as HTMLElement | null;
                        if (btn) btn.style.opacity = "0";
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        height: 76,
                        background: `linear-gradient(150deg, ${folderColor}18, ${folderColor}06)`,
                        borderBottom: `1px solid ${folderColor}20`,
                        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                      }}>
                        <Folder size={38} style={{ color: folderColor, fill: `${folderColor}28` }} />
                        {estado === "completo" && (
                          <span style={{ position: "absolute", top: 6, right: 6, background: "#1e8e3e", color: "#fff", fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 99 }}>✓</span>
                        )}
                        {estado === "incompleto" && (
                          <span style={{ position: "absolute", top: 6, right: 6, background: "#f9ab00", color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 99 }}>!</span>
                        )}
                        <button
                          className="lote-del-btn"
                          onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar "${lote.proveedor}"? Se perderán todos sus archivos.`)) onEliminarLote(lote.id); }}
                          title="Eliminar lote"
                          style={{ position: "absolute", top: 5, left: 5, opacity: 0, width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.07)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s, background 0.12s", color: "#5f6368" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.07)"; e.currentTarget.style.color = "#5f6368"; }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {/* Info */}
                      <div style={{ padding: "9px 11px 10px" }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 12.5, color: "#202124", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {lote.proveedor}
                        </p>
                        {lote.referencia && (
                          <p style={{ margin: "1px 0 0", fontSize: 10.5, color: "#5f6368", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lote.referencia}</p>
                        )}
                        <p style={{ margin: "3px 0 0", fontSize: 10, color: "#9aa0a6" }}>
                          {cargados}/{requeridos.length} tipos · {totalArchivos} arch.
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* VISTA LISTA ESTILO DRIVE */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {periodo.lotes.map((lote) => {
                  const estado = calcularEstadoLote(lote);
                  const cargados = requeridos.filter(
                    (t) => (lote.documentos[t.id] ?? []).length > 0
                  ).length;
                  const totalArchivos = Object.values(lote.documentos).flat().length;

                  const folderColor =
                    estado === "completo"
                      ? "#1e8e3e"
                      : estado === "incompleto"
                      ? "#f9ab00"
                      : "#5f6368";

                  return (
                    <div
                      key={lote.id}
                      className="drive-folder-card"
                      onClick={() => setLoteAbierto(lote.id)}
                      style={{
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <Folder
                        size={24}
                        style={{
                          color: folderColor,
                          fill: `${folderColor}25`,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#1f1f1f" }}>
                            {lote.proveedor}
                          </span>
                          {lote.referencia && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#64748b",
                                background: "#f1f5f9",
                                padding: "1px 6px",
                                borderRadius: 4,
                              }}
                            >
                              Ref: {lote.referencia}
                            </span>
                          )}
                          <EstadoBadge estado={estado} size="sm" />
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#5f6368" }}>
                          {cargados}/{requeridos.length} requeridos · {totalArchivos} archivo{totalArchivos !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLoteAbierto(lote.id);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            background: "#f1f3f4",
                            border: "none",
                            borderRadius: 10,
                            padding: "6px 14px",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: 12,
                            color: "#1f1f1f",
                            fontFamily: "inherit",
                          }}
                        >
                          Abrir <ChevronRight size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `¿Eliminar el lote "${lote.proveedor}"? Se perderán todos sus archivos.`
                              )
                            ) {
                              onEliminarLote(lote.id);
                            }
                          }}
                          title="Eliminar lote"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            color: "#94a3b8",
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Alertas de consecutivos — al final */}
        {hayDatosConsecutivos && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={15} style={{ color: "#d97706" }} /> Control de Consecutivos del Mes
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(alertasConsecutivos).map(([tipoId, alerta]) => {
                const tipoDef = TIPOS_DOCUMENTO.find((t) => t.id === tipoId);
                const tieneProblemas = alerta.faltantes.length > 0 || alerta.repetidos.length > 0;
                
                return (
                  <div
                    key={tipoId}
                    style={{
                      background: tieneProblemas ? "#fffbeb" : "#f0fdf4",
                      border: `1px solid ${tieneProblemas ? "#fde68a" : "#bbf7d0"}`,
                      borderRadius: 12,
                      padding: "12px 16px",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                        <strong style={{ fontSize: 13, color: tieneProblemas ? "#92400e" : "#166534" }}>
                          {tipoDef?.label} ({tipoDef?.nombre})
                        </strong>
                        <span style={{ fontSize: 11, color: tieneProblemas ? "#b45309" : "#15803d", fontWeight: 700 }}>
                          Rango: del {Math.min(...alerta.presentes)} al {Math.max(...alerta.presentes)}
                        </span>
                      </div>
                      
                      {!tieneProblemas ? (
                        <p style={{ margin: 0, fontSize: 11, color: "#15803d", display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={13} />
                          Secuencia correcta y continua
                        </p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 3 }}>
                          {alerta.faltantes.length > 0 && (
                            <p style={{ margin: 0, fontSize: 11, color: "#b45309", lineHeight: 1.4 }}>
                              <strong style={{ color: "#92400e" }}>Faltan ({alerta.faltantes.length} doc{alerta.faltantes.length !== 1 ? "s" : ""}):</strong>{" "}
                              {agruparEnRangos(alerta.faltantes).slice(0, 8).join(", ")}
                              {agruparEnRangos(alerta.faltantes).length > 8 ? ` y ${agruparEnRangos(alerta.faltantes).length - 8} más...` : ""}
                            </p>
                          )}
                          {alerta.repetidos.length > 0 && (
                            <p style={{ margin: 0, fontSize: 11, color: "#b45309" }}>
                              <strong style={{ color: "#92400e" }}>Repetidos:</strong> {alerta.repetidos.join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
