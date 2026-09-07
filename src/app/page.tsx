"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  FolderOpen,
  Folder,
  Calendar,
  ChevronRight,
  X,
  FileText,
  FileSignature,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useComprobantes } from "@/hooks/useComprobantes";
import { MESES, TIPOS_DOCUMENTO } from "@/lib/constantes";
import { motion } from "framer-motion";
import { calcularEstadoLote, colorEstado } from "@/lib/utils";
import { EstadoBadge } from "@/components/comprobantes/UIComunes";
import { VistaMes } from "@/components/comprobantes/VistaMes";
import type { EstadoLote } from "@/types";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// ── Modal seleccionar período ─────────────────────────────────────────────────
function ModalPeriodo({
  onConfirmar,
  onCerrar,
}: {
  onConfirmar: (mes: number, anio: number) => void;
  onCerrar: () => void;
}) {
  const [mes, setMes] = useState(new Date().getMonth());
  const [anio, setAnio] = useState(CURRENT_YEAR);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onCerrar}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: 28,
          width: "100%",
          maxWidth: 360,
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                background: "#fef3c7",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={18} style={{ color: "#f59e0b" }} />
            </div>
            <h3
              style={{ margin: 0, fontWeight: 900, fontSize: 15, color: "#0f172a" }}
            >
              Abrir Período
            </h3>
          </div>
          <button
            onClick={onCerrar}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <select
            value={mes}
            onChange={(e) => setMes(+e.target.value)}
            style={{
              flex: 2,
              padding: "10px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(+e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCerrar}
            style={{
              flex: 1,
              padding: "10px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 12,
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              color: "#64748b",
              fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(mes, anio)}
            style={{
              flex: 2,
              padding: "10px",
              border: "none",
              borderRadius: 12,
              background: "#10b981",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 13,
              color: "#fff",
              fontFamily: "inherit",
            }}
          >
            Abrir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    periodos,
    cargado,
    crearPeriodo,
    eliminarPeriodo,
    crearLote,
    eliminarLote,
    actualizarLote,
    agregarArchivo,
    eliminarArchivo,
    actualizarArchivosDoc,
  } = useComprobantes();

  const [periodoAbierto, setPeriodoAbierto] = useState<string | null>(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [modoVista, setModoVista] = useState<"grid" | "list">("grid");

  // Abrir o crear período
  const handleAbrirPeriodo = async (mes: number, anio: number) => {
    const existente = periodos.find((p) => p.mes === mes && p.anio === anio);
    if (existente) {
      setPeriodoAbierto(existente.id);
    } else {
      const nuevo = await crearPeriodo(mes, anio);
      setPeriodoAbierto(nuevo.id);
    }
    setModalPeriodo(false);
  };

  // Período abierto → VistaMes
  if (periodoAbierto) {
    const periodo = periodos.find((p) => p.id === periodoAbierto);
    if (periodo) {
      return (
        <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
          <Navbar onNuevoPeriodo={() => setModalPeriodo(true)} />
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <VistaMes
              periodo={periodo}
              onCrearLote={(datos) => crearLote(periodo.id, datos)}
              onEliminarLote={(loteId) => eliminarLote(periodo.id, loteId)}
              onActualizarLote={(loteId, datos) => actualizarLote(periodo.id, loteId, datos)}
              onAgregarArchivo={(loteId, tipoId, arch) =>
                agregarArchivo(periodo.id, loteId, tipoId, arch)
              }
              onEliminarArchivo={(loteId, tipoId, archId) =>
                eliminarArchivo(periodo.id, loteId, tipoId, archId)
              }
              onActualizarArchivosDoc={(loteId, tipoId, nuevosArchs) =>
                actualizarArchivosDoc(periodo.id, loteId, tipoId, nuevosArchs)
              }
              onVolver={() => setPeriodoAbierto(null)}
            />
          </motion.div>
        </div>
      );
    }
  }

  // Totales globales
  const todosLotes = periodos.flatMap((p) => p.lotes);
  const totalLotes = todosLotes.length;
  const totalCompletos = todosLotes.filter(
    (l) => calcularEstadoLote(l) === "completo"
  ).length;
  const totalIncompletos = todosLotes.filter(
    (l) => calcularEstadoLote(l) === "incompleto"
  ).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {modalPeriodo && (
        <ModalPeriodo
          onConfirmar={handleAbrirPeriodo}
          onCerrar={() => setModalPeriodo(false)}
        />
      )}

      <Navbar onNuevoPeriodo={() => setModalPeriodo(true)} />

      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          maxWidth: modoVista === "grid" ? 920 : 680,
          margin: "0 auto",
          padding: "28px 16px 60px",
          transition: "max-width 0.25s ease",
        }}
      >
        {/* Resumen global */}
        {totalLotes > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 28,
            }}
          >
            {[
              { label: "Total Lotes", valor: totalLotes, color: "#475569", bg: "#f1f5f9" },
              { label: "Completos", valor: totalCompletos, color: "#10b981", bg: "#d1fae5" },
              { label: "Incompletos", valor: totalIncompletos, color: "#f59e0b", bg: "#fef3c7" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: item.bg,
                  borderRadius: 16,
                  padding: "16px 18px",
                  border: "1px solid rgba(226, 232, 240, 0.4)",
                  boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.02)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 900,
                    color: item.color,
                  }}
                >
                  {item.valor}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 10,
                    color: item.color,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Sin períodos */}
        {!cargado || periodos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div
              style={{
                width: 80,
                height: 80,
                background: "#f1f5f9",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <FolderOpen size={38} style={{ color: "#cbd5e1" }} />
            </div>
            <h2
              style={{
                fontWeight: 900,
                color: "#94a3b8",
                fontSize: 18,
                margin: "0 0 8px",
              }}
            >
              {cargado ? "Sin períodos aún" : "Cargando..."}
            </h2>
            {cargado && (
              <>
                <p
                  style={{
                    color: "#cbd5e1",
                    fontSize: 13,
                    margin: "0 0 24px",
                    lineHeight: 1.5,
                  }}
                >
                  Crea un período mensual para organizar tus comprobantes por
                  proveedor
                </p>
                <button
                  onClick={() => setModalPeriodo(true)}
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    padding: "12px 28px",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 14,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "inherit",
                  }}
                >
                  <Plus size={18} /> Crear primer período
                </button>
              </>
            )}
          </div>
        ) : (
          /* Explorador de Períodos - Estilo Google Drive */
          <div>
            {/* Barra superior estilo Google Drive: Breadcrumb + Switcher + Botón Nuevo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div className="drive-breadcrumb">
                <div className="drive-breadcrumb-item">
                  <Folder size={18} style={{ color: "#1a73e8", fill: "#1a73e820" }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#1f1f1f" }}>
                    Mi unidad
                  </span>
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

                {/* Botón "+ Nuevo Período" estilo Google Drive */}
                <button
                  onClick={() => setModalPeriodo(true)}
                  className="drive-pill-btn"
                >
                  <Plus size={16} style={{ color: "#1a73e8" }} />
                  <span>Nuevo Período</span>
                </button>
              </div>
            </div>

            {/* Subtítulo de Carpetas */}
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
              <Folder size={14} style={{ color: "#5f6368" }} /> Carpetas de Períodos
            </p>

            {/* VISTA CUADRÍCULA (GRID) ESTILO GOOGLE DRIVE */}
            {modoVista === "grid" ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {periodos.map((periodo) => {
                  const completos = periodo.lotes.filter(
                    (l) => calcularEstadoLote(l) === "completo"
                  ).length;
                  const incompletos = periodo.lotes.filter(
                    (l) => calcularEstadoLote(l) === "incompleto"
                  ).length;
                  const sinDocs = periodo.lotes.filter(
                    (l) => calcularEstadoLote(l) === "vacio"
                  ).length;
                  const estadoGeneral: EstadoLote =
                    periodo.lotes.length === 0
                      ? "vacio"
                      : incompletos > 0 || sinDocs > 0
                      ? "incompleto"
                      : "completo";

                  const folderColor =
                    estadoGeneral === "completo"
                      ? "#1e8e3e"
                      : estadoGeneral === "incompleto"
                      ? "#f9ab00"
                      : "#5f6368";

                  return (
                    <motion.div
                      key={periodo.id}
                      className="drive-folder-card"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setPeriodoAbierto(periodo.id)}
                      style={{
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <Folder
                          size={32}
                          style={{
                            color: folderColor,
                            fill: `${folderColor}24`,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p
                            style={{
                              margin: 0,
                              fontWeight: 700,
                              fontSize: 14,
                              color: "#1f1f1f",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {MESES[periodo.mes]} {periodo.anio}
                          </p>
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: 11,
                              color: "#5f6368",
                            }}
                          >
                            {periodo.lotes.length} lote{periodo.lotes.length !== 1 ? "s" : ""}
                            {completos > 0 ? ` · ${completos} compl.` : ""}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        <EstadoBadge estado={estadoGeneral} size="sm" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `¿Eliminar el período ${MESES[periodo.mes]} ${periodo.anio}? Se perderán todos sus lotes y archivos.`
                              )
                            ) {
                              eliminarPeriodo(periodo.id);
                            }
                          }}
                          title="Eliminar período"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "6px",
                            color: "#94a3b8",
                            borderRadius: 6,
                            display: "flex",
                            alignItems: "center",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#ef4444";
                            e.currentTarget.style.background = "#fee2e2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#94a3b8";
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* VISTA LISTA ESTILO DRIVE */
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {periodos.map((periodo) => {
                  const completos = periodo.lotes.filter(
                    (l) => calcularEstadoLote(l) === "completo"
                  ).length;
                  const incompletos = periodo.lotes.filter(
                    (l) => calcularEstadoLote(l) === "incompleto"
                  ).length;
                  const sinDocs = periodo.lotes.filter(
                    (l) => calcularEstadoLote(l) === "vacio"
                  ).length;
                  const estadoGeneral: EstadoLote =
                    periodo.lotes.length === 0
                      ? "vacio"
                      : incompletos > 0 || sinDocs > 0
                      ? "incompleto"
                      : "completo";

                  const folderColor =
                    estadoGeneral === "completo"
                      ? "#1e8e3e"
                      : estadoGeneral === "incompleto"
                      ? "#f9ab00"
                      : "#5f6368";

                  return (
                    <div
                      key={periodo.id}
                      className="drive-folder-card"
                      onClick={() => setPeriodoAbierto(periodo.id)}
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
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#1f1f1f" }}>
                            {MESES[periodo.mes]} {periodo.anio}
                          </span>
                          <EstadoBadge estado={estadoGeneral} size="sm" />
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#5f6368" }}>
                          {periodo.lotes.length} lote{periodo.lotes.length !== 1 ? "s" : ""}
                          {completos > 0 ? ` · ${completos} completos` : ""}
                          {incompletos > 0 ? ` · ${incompletos} incompletos` : ""}
                          {sinDocs > 0 ? ` · ${sinDocs} vacíos` : ""}
                        </p>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPeriodoAbierto(periodo.id);
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
                                `¿Eliminar el período ${MESES[periodo.mes]} ${periodo.anio}? Se perderán todos sus lotes y archivos.`
                              )
                            ) {
                              eliminarPeriodo(periodo.id);
                            }
                          }}
                          title="Eliminar período"
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

        {/* Leyenda de tipos de documento */}
        <div
          style={{
            marginTop: 32,
            background: "#fff",
            border: "1px solid #f1f5f9",
            borderRadius: 18,
            padding: "18px 20px",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontWeight: 800,
              fontSize: 11,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Documentos requeridos por lote
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TIPOS_DOCUMENTO.map((t) => (
              <div
                key={t.id}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <span
                  style={{
                    width: 38,
                    textAlign: "center",
                    fontSize: 10,
                    fontWeight: 900,
                    color: t.color,
                    background: `${t.color}18`,
                    borderRadius: 6,
                    padding: "2px 0",
                    flexShrink: 0,
                  }}
                >
                  {t.label}
                </span>
                <span style={{ fontSize: 12, color: "#475569", flex: 1 }}>
                  {t.nombre}
                  {" — "}
                  <span style={{ color: "#94a3b8" }}>{t.descripcion}</span>
                </span>
                {!t.requerido && (
                  <span
                    style={{
                      fontSize: 9,
                      color: "#94a3b8",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      flexShrink: 0,
                    }}
                  >
                    Opcional
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.main>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onNuevoPeriodo }: { onNuevoPeriodo: () => void }) {
  return (
    <nav
      style={{
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(241, 245, 249, 0.8)",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 20,
        boxShadow: "0 4px 20px -10px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: "#10b981",
            borderRadius: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ClipboardList size={20} style={{ color: "#fff" }} />
        </div>
        <div>
          <span
            style={{
              fontWeight: 900,
              fontSize: 15,
              color: "#0f172a",
              display: "block",
              lineHeight: 1.2,
            }}
          >
            Fundamiga
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#10b981",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Gestor de Comprobantes
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Link
          href="/generar-cuenta-cobro"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#fff",
            color: "#3b82f6",
            border: "1.5px solid #bfdbfe",
            borderRadius: 12,
            padding: "9px 18px",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 12,
            fontFamily: "inherit",
            textDecoration: "none",
          }}
        >
          <FileText size={16} /> Crear Cuenta Cobro
        </Link>
        <Link
          href="/crear-contrato"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#fff",
            color: "#8b5cf6",
            border: "1.5px solid #ddd6fe",
            borderRadius: 12,
            padding: "9px 18px",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 12,
            fontFamily: "inherit",
            textDecoration: "none",
          }}
        >
          <FileSignature size={16} /> Crear Contrato
        </Link>
        <button
          onClick={onNuevoPeriodo}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "9px 18px",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 12,
            fontFamily: "inherit",
          }}
        >
          <Plus size={16} /> Nuevo Período
        </button>
      </div>
    </nav>
  );
}
