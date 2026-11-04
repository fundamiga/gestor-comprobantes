"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Search,
  X,
  PenTool,
  Hash,
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
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "completo" | "incompleto" | "vacio">("todos");

  useEffect(() => {
    if (loteInicialId) {
      setLoteAbierto(loteInicialId);
    }
  }, [loteInicialId]);

  const mesLabel = `${MESES[periodo.mes]} ${periodo.anio}`;
  const requeridos = TIPOS_DOCUMENTO.filter((t) => t.requerido);

  const lotesFiltrados = useMemo(() => {
    return periodo.lotes.filter((l) => {
      const est = calcularEstadoLote(l);
      if (filtroEstado !== "todos" && est !== filtroEstado) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const prov = l.proveedor.toLowerCase().includes(q);
        const ref = (l.referencia || "").toLowerCase().includes(q);
        const arch = Object.values(l.documentos)
          .flat()
          .some((a) => a.nombre.toLowerCase().includes(q));
        return prov || ref || arch;
      }
      return true;
    });
  }, [periodo.lotes, filtroEstado, busqueda]);

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

            <Link
              href="/generar-cuenta-cobro"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#eff6ff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                borderRadius: 24,
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
                fontFamily: "inherit",
                textDecoration: "none",
              }}
              title="Crear Cuentas de Cobro y Gestionar Firmas y Cédulas"
            >
              <PenTool size={14} /> Firmas / Cuentas
            </Link>

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
              style={{ background: "#1a73e8", color: "#ffffff", border: "none" }}
            >
              <Plus size={16} style={{ color: "#ffffff" }} />
              <span>Nuevo Lote</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: "16px 24px", maxWidth: modoVista === "grid" ? 1100 : 720, margin: "0 auto", transition: "max-width 0.25s ease" }}>

        {/* Barra de búsqueda y filtros estilo Google Drive */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div className="drive-search-bar" style={{ flex: 1, minWidth: 260 }}>
            <Search size={16} style={{ color: "#5f6368", flexShrink: 0 }} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en este mes (proveedor, referencia o archivo)..."
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#5f6368", padding: 2, display: "flex" }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setFiltroEstado("todos")}
              className={"drive-filter-chip" + (filtroEstado === "todos" ? " active" : "")}
            >
              Todos ({periodo.lotes.length})
            </button>
            <button
              onClick={() => setFiltroEstado("completo")}
              className={"drive-filter-chip" + (filtroEstado === "completo" ? " active" : "")}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1e8e3e" }} />
              Completos ({completos})
            </button>
            <button
              onClick={() => setFiltroEstado("incompleto")}
              className={"drive-filter-chip" + (filtroEstado === "incompleto" ? " active" : "")}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f9ab00" }} />
              Incompletos ({incompletos})
            </button>
            <button
              onClick={() => setFiltroEstado("vacio")}
              className={"drive-filter-chip" + (filtroEstado === "vacio" ? " active" : "")}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#9aa0a6" }} />
              Sin docs ({vacios})
            </button>
          </div>
        </div>
        {/* Barra rápida de Secuencia y Consecutivos del Mes */}
        {hayDatosConsecutivos && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "12px 16px",
              marginBottom: 18,
              boxShadow: "0 2px 8px rgba(15, 23, 42, 0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                <Hash size={14} style={{ color: "#1a73e8" }} /> Secuencia y Orden de Consecutivos del Mes
              </span>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                Auditoría automática por clasificación
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
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
                      padding: "8px 12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: tipoDef?.color || "#0f172a" }}>
                        {tipoDef?.label} · {tipoDef?.nombre}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "monospace",
                          fontWeight: 800,
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 6,
                          padding: "1px 6px",
                          color: "#334155",
                        }}
                      >
                        #{Math.min(...alerta.presentes)} – #{Math.max(...alerta.presentes)}
                      </span>
                    </div>
                    {!tieneProblemas ? (
                      <div style={{ fontSize: 10.5, color: "#15803d", fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle2 size={11} /> Secuencia continua ({alerta.presentes.length} docs)
                      </div>
                    ) : (
                      <div style={{ fontSize: 10.5, color: "#b45309", fontWeight: 700, marginTop: 4 }}>
                        {alerta.faltantes.length > 0 && (
                          <div>⚠ Faltan ({alerta.faltantes.length}): {agruparEnRangos(alerta.faltantes).slice(0, 4).join(", ")}{agruparEnRangos(alerta.faltantes).length > 4 ? "…" : ""}</div>
                        )}
                        {alerta.repetidos.length > 0 && (
                          <div>⚠ Repetidos: {alerta.repetidos.join(", ")}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
          /* Explorador de Lotes - Estilo Google Drive Pro */
          <div>
            <p
              style={{
                fontWeight: 800,
                fontSize: 12,
                color: "#334155",
                margin: "0 0 12px 2px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <Folder size={14} style={{ color: "#1a73e8" }} /> Carpetas de Lotes ({lotesFiltrados.length})
            </p>

            {modoVista === "grid" ? (
              /* VISTA CUADRÍCULA 3D — Carpetas realistas con hojas asomándose y clasificaciones */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))", gap: 18 }}>
                {lotesFiltrados.map((lote) => {
                  const estado = calcularEstadoLote(lote);
                  const cargados = requeridos.filter((t) => (lote.documentos[t.id] ?? []).length > 0).length;
                  const todosArchsLote = Object.values(lote.documentos).flat();
                  const totalArchivos = todosArchsLote.length;
                  const folderColor = estado === "completo" ? "#10b981" : estado === "incompleto" ? "#f59e0b" : "#64748b";
                  const porcentaje = requeridos.length > 0 ? Math.round((cargados / requeridos.length) * 100) : 0;
                  const opcionalesCargados = TIPOS_DOCUMENTO.filter(
                    (t) => !t.requerido && (lote.documentos[t.id] ?? []).length > 0
                  );

                  return (
                    <div
                      key={lote.id}
                      className="pro-folder-3d"
                      onClick={() => setLoteAbierto(lote.id)}
                      style={{ paddingTop: 18, position: "relative" }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget.querySelector(".lote-del-btn") as HTMLElement | null;
                        if (btn) btn.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget.querySelector(".lote-del-btn") as HTMLElement | null;
                        if (btn) btn.style.opacity = "0";
                      }}
                    >
                      {/* Pestaña física superior de la carpeta de Lote */}
                      <div
                        style={{
                          position: "absolute",
                          top: 2,
                          left: 14,
                          height: 22,
                          padding: "0 12px",
                          borderRadius: "10px 10px 0 0",
                          background: folderColor,
                          color: "#ffffff",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: "0.05em",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          zIndex: 1,
                        }}
                      >
                        <span>{lote.referencia ? `REF #${lote.referencia}` : "LOTE CONTABLE"}</span>
                      </div>

                      {/* Estado y botón eliminar arriba a la derecha */}
                      <div style={{ position: "absolute", top: 2, right: 10, zIndex: 5, display: "flex", alignItems: "center", gap: 6 }}>
                        <EstadoBadge estado={estado} size="sm" />
                        <button
                          className="lote-del-btn"
                          onClick={(e) => { e.stopPropagation(); if (confirm(`¿Eliminar "${lote.proveedor}"? Se perderán todos sus archivos.`)) onEliminarLote(lote.id); }}
                          title="Eliminar lote"
                          style={{ opacity: 0, width: 24, height: 24, borderRadius: "50%", border: "1px solid #fecaca", background: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s, background 0.12s", color: "#ef4444", boxShadow: "0 2px 5px rgba(0,0,0,0.12)" }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Cuerpo trasero + Hojas de documentos asomándose */}
                      <div
                        style={{
                          position: "relative",
                          borderRadius: "14px 14px 16px 16px",
                          background: `linear-gradient(145deg, ${folderColor}30 0%, ${folderColor}10 100%)`,
                          border: estado === "completo" ? "1.5px solid #6ee7b7" : estado === "incompleto" ? "1.5px solid #fcd34d" : "1.5px solid #cbd5e1",
                          paddingTop: 34,
                          overflow: "hidden",
                        }}
                      >
                        {totalArchivos > 0 ? (
                          <>
                            <div
                              className="pro-folder-sheet-1"
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 16,
                                right: 42,
                                height: 36,
                                background: "#ffffff",
                                borderRadius: "6px 6px 0 0",
                                border: "1px solid #cbd5e1",
                                padding: "5px 8px",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                zIndex: 1,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: folderColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 8.5, fontWeight: 700, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {todosArchsLote[0]?.nombre}
                              </span>
                            </div>
                            {totalArchivos > 1 && (
                              <div
                                className="pro-folder-sheet-2"
                                style={{
                                  position: "absolute",
                                  top: 12,
                                  left: 36,
                                  right: 14,
                                  height: 34,
                                  background: "#f8fafc",
                                  borderRadius: "6px 6px 0 0",
                                  border: "1px solid #cbd5e1",
                                  padding: "5px 8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  zIndex: 2,
                                }}
                              >
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
                                <span style={{ fontSize: 8.5, fontWeight: 700, color: "#334155", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {todosArchsLote[1]?.nombre}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div
                            style={{
                              position: "absolute",
                              top: 9,
                              left: 16,
                              right: 16,
                              height: 22,
                              border: "1px dashed #94a3b8",
                              borderRadius: "6px 6px 0 0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 8.5,
                              color: "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            Sin soportes cargados
                          </div>
                        )}

                        {/* Solapa frontal de la carpeta de Lote */}
                        <div
                          className="pro-folder-flap"
                          style={{
                            position: "relative",
                            zIndex: 3,
                            background: "#ffffff",
                            borderRadius: "12px 12px 14px 14px",
                            borderTop: `3px solid ${folderColor}`,
                            padding: "13px 14px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 9,
                            boxShadow: "0 -3px 10px rgba(15, 23, 42, 0.06)",
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, fontWeight: 900, fontSize: 14, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={lote.proveedor}>
                              {lote.proveedor}
                            </p>

                            {/* Chips de Clasificaciones Requeridas (CC-9, DS, CC-6, CC-10) + Opcionales */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                              {requeridos.map((req) => {
                                const count = (lote.documentos[req.id] ?? []).length;
                                const ok = count >= (req.minArchivos ?? 1);
                                return (
                                  <span
                                    key={req.id}
                                    title={`${req.label} (${req.nombre}): ${count} archivo(s)`}
                                    style={{
                                      fontSize: 9.5,
                                      fontWeight: 800,
                                      padding: "2px 6px",
                                      borderRadius: 6,
                                      background: ok ? `${req.color}18` : count > 0 ? "#fef3c7" : "#f1f5f9",
                                      color: ok ? req.color : count > 0 ? "#b45309" : "#94a3b8",
                                      border: `1px solid ${ok ? req.color + "45" : count > 0 ? "#fde68a" : "#e2e8f0"}`,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 3,
                                    }}
                                  >
                                    <span>{ok ? "✓" : count > 0 ? "!" : "○"}</span>
                                    <span>{req.label}</span>
                                  </span>
                                );
                              })}
                              {opcionalesCargados.slice(0, 2).map((opt) => (
                                <span
                                  key={opt.id}
                                  title={`${opt.label} (${opt.nombre})`}
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    background: `${opt.color}15`,
                                    color: opt.color,
                                    border: `1px solid ${opt.color}35`,
                                  }}
                                >
                                  +{opt.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Barra de progreso visual */}
                          <div>
                            <div style={{ height: 5, width: "100%", background: "#f1f5f9", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                              <div style={{ height: "100%", width: `${porcentaje}%`, background: folderColor, borderRadius: 99, transition: "width 0.3s ease" }} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: "#64748b", fontWeight: 700 }}>
                              <span>{cargados}/{requeridos.length} obligatorios · {totalArchivos} arch.</span>
                              <span style={{ color: "#1a73e8", fontWeight: 800 }}>Abrir →</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VISTA LISTA ESTILO DRIVE */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lotesFiltrados.map((lote) => {
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
