"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  ChevronRight,
  FolderArchive,
  FolderOpen,
  Folder,
} from "lucide-react";
import type { Lote, Periodo, ArchivoSubido } from "@/types";
import { MESES } from "@/lib/constantes";
import { motion } from "framer-motion";
import { calcularEstadoLote, colorEstado } from "@/lib/utils";
import { EstadoBadge } from "./UIComunes";
import { ModalCrearLote } from "./ModalCrearLote";
import { VistaLote } from "./VistaLote";
import { TIPOS_DOCUMENTO } from "@/lib/constantes";

interface VistaMesProps {
  periodo: Periodo;
  onCrearLote: (datos: Pick<Lote, "proveedor" | "referencia" | "tipoPago">) => void;
  onEliminarLote: (loteId: string) => void;
  onAgregarArchivo: (loteId: string, tipoId: string, archivo: ArchivoSubido) => void;
  onEliminarArchivo: (loteId: string, tipoId: string, archivoId: string) => void;
  onActualizarArchivosDoc: (loteId: string, tipoId: string, nuevosArchs: ArchivoSubido[]) => void;
  onVolver: () => void;
}

export function VistaMes({
  periodo,
  onCrearLote,
  onEliminarLote,
  onAgregarArchivo,
  onEliminarArchivo,
  onActualizarArchivosDoc,
  onVolver,
}: VistaMesProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [loteAbierto, setLoteAbierto] = useState<string | null>(null);

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
            onAgregarArchivo={(tipoId, arch) =>
              onAgregarArchivo(loteAbierto, tipoId, arch)
            }
            onEliminarArchivo={(tipoId, archivoId) =>
              onEliminarArchivo(loteAbierto, tipoId, archivoId)
            }
            onActualizarArchivosDoc={(tipoId, nuevosArchs) =>
              onActualizarArchivosDoc(loteAbierto, tipoId, nuevosArchs)
            }
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
        <button
          onClick={onVolver}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 10,
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          <ArrowLeft size={14} /> Todos los meses
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calendar size={22} style={{ color: "#f59e0b" }} />
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
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
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
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)",
              }}
            >
              <Plus size={16} /> Nuevo Lote
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: "20px 24px", maxWidth: 680, margin: "0 auto" }}>
        {/* Resumen del mes */}
        {periodo.lotes.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {[
              { label: "Completos", valor: completos, color: "#10b981", bg: "#d1fae5" },
              { label: "Incompletos", valor: incompletos, color: "#f59e0b", bg: "#fef3c7" },
              { label: "Sin docs", valor: vacios, color: "#94a3b8", bg: "#f1f5f9" },
            ].map((item) => (
              <div
                key={item.label}
                style={{ background: item.bg, borderRadius: 14, padding: "13px 16px" }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 24,
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
          /* Lista de lotes */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {periodo.lotes.map((lote) => {
              const estado = calcularEstadoLote(lote);
              const cargados = requeridos.filter(
                (t) => (lote.documentos[t.id] ?? []).length > 0
              ).length;
              const totalArchivos = Object.values(lote.documentos).flat().length;
              const progreso = (cargados / requeridos.length) * 100;

              return (
                <motion.div
                  key={lote.id}
                  whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.05)", borderColor: `${colorEstado(estado)}60` }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${colorEstado(estado)}30`,
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Ícono */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        flexShrink: 0,
                        background: `${colorEstado(estado)}18`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Folder size={20} style={{ color: colorEstado(estado) }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 14,
                            color: "#0f172a",
                          }}
                        >
                          {lote.proveedor}
                        </span>
                        <EstadoBadge estado={estado} />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginTop: 2,
                        }}
                      >
                        {lote.referencia && (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            Ref: {lote.referencia}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          {cargados}/{requeridos.length} req. · {totalArchivos} archivo
                          {totalArchivos !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {/* Barra de progreso */}
                      <div
                        style={{
                          marginTop: 7,
                          height: 4,
                          background: "#f1f5f9",
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: colorEstado(estado),
                            width: `${progreso}%`,
                            borderRadius: 99,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* Acciones */}
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexShrink: 0,
                        alignItems: "center",
                      }}
                    >
                      <button
                        onClick={() => setLoteAbierto(lote.id)}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: "7px 14px",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: 11,
                          color: "#475569",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontFamily: "inherit",
                        }}
                      >
                        <FolderOpen size={13} /> Abrir
                        <ChevronRight size={12} />
                      </button>
                      <button
                        onClick={() => {
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
                          background: "#fff0f0",
                          border: "1px solid #fecaca",
                          borderRadius: 10,
                          padding: "7px 10px",
                          cursor: "pointer",
                          color: "#ef4444",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
