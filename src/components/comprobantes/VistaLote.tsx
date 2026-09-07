"use client";

import { useState } from "react";
import { ArrowLeft, Building2, AlertCircle, CheckCircle, CheckCircle2, Info, FileDown, Edit2, Check, X, Folder, FolderOpen, LayoutGrid, List, HardDrive, ChevronRight } from "lucide-react";
import type { Lote, Periodo, ArchivoSubido } from "@/types";
import { TIPOS_DOCUMENTO, MESES } from "@/lib/constantes";
import { calcularEstadoLote, analizarConsecutivos } from "@/lib/utils";
import { EstadoBadge, VisorArchivo } from "./UIComunes";
import { TipoDocCard } from "./TipoDocCard";
import { CarpetaIcono } from "./CarpetaIcono";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface VistaLoteProps {
  lote: Lote;
  periodo: Periodo;
  onAgregarArchivo: (tipoId: string, archivo: ArchivoSubido) => void;
  onEliminarArchivo: (tipoId: string, archivoId: string) => void;
  onActualizarArchivosDoc: (tipoId: string, nuevosArchivos: ArchivoSubido[]) => void;
  onActualizarLote: (datos: Partial<Lote>) => void;
  onVolver: () => void;
}

export function VistaLote({
  lote,
  periodo,
  onAgregarArchivo,
  onEliminarArchivo,
  onActualizarArchivosDoc,
  onActualizarLote,
  onVolver,
}: VistaLoteProps) {
  const [visorArchivo, setVisorArchivo] = useState<ArchivoSubido | null>(null);
  const [editando, setEditando] = useState(false);
  const [provEdit, setProvEdit] = useState(lote.proveedor);
  const [refEdit, setRefEdit] = useState(lote.referencia || "");
  const [vistaModo, setVistaModo] = useState<"list" | "grid">("grid");
  const [carpetaAbierta, setCarpetaAbierta] = useState<string | null>(null);

  const handleGuardarEdicion = () => {
    if (!provEdit.trim()) return;
    onActualizarLote({ proveedor: provEdit.trim(), referencia: refEdit.trim() });
    setEditando(false);
  };
  const estado = calcularEstadoLote(lote);
  const requeridos = TIPOS_DOCUMENTO.filter((t) => t.requerido);
  const faltantes = requeridos.filter(
    (t) => !(lote.documentos[t.id] ?? []).length
  );

  const mesLabel = `${MESES[periodo.mes]} ${periodo.anio}`;

  const alertasConsecutivos = analizarConsecutivos(periodo);
  const hayDatosConsecutivos = Object.keys(alertasConsecutivos).length > 0;

  const handleDescargarLote = async () => {
    const todosArchivos = TIPOS_DOCUMENTO.flatMap(
      (tipo) => lote.documentos[tipo.id] ?? []
    );
    if (todosArchivos.length === 0) {
      alert("No hay archivos subidos en este lote para descargar.");
      return;
    }
    const { combinarYDescargarPdf } = await import("@/lib/pdfMerger");
    await combinarYDescargarPdf(
      todosArchivos,
      `${lote.proveedor.replace(/\s+/g, "_")}_Lote_Completo`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {visorArchivo && (
        <VisorArchivo
          archivo={visorArchivo}
          onClose={() => setVisorArchivo(null)}
        />
      )}

      {/* Header sticky - Estilo Explorador de Windows */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "2px solid #e2e8f0",
          padding: "14px 24px",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        {/* Barra de dirección estilo Explorador de Windows */}
        <div className="win-address-bar" style={{ marginBottom: 12 }}>
          <button
            onClick={() => {
              if (carpetaAbierta) {
                setCarpetaAbierta(null);
              } else {
                onVolver();
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 800,
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            <ArrowLeft size={13} /> Volver
          </button>
          <span style={{ color: "#cbd5e1" }}>|</span>
          <HardDrive size={13} style={{ color: "#64748b" }} />
          <span style={{ color: "#64748b" }}>Este Equipo</span>
          <ChevronRight size={12} style={{ color: "#94a3b8" }} />
          <FolderOpen size={13} style={{ color: "#f59e0b" }} />
          <span style={{ color: "#64748b" }}>{mesLabel}</span>
          <ChevronRight size={12} style={{ color: "#94a3b8" }} />
          <Folder size={13} style={{ color: "#10b981" }} />
          {carpetaAbierta ? (
            <>
              <button
                onClick={() => setCarpetaAbierta(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 12, fontWeight: 700, padding: 0, fontFamily: "inherit" }}
              >
                {lote.proveedor}
              </button>
              <ChevronRight size={12} style={{ color: "#94a3b8" }} />
              <Folder size={13} style={{ color: TIPOS_DOCUMENTO.find(t => t.id === carpetaAbierta)?.color ?? "#64748b" }} />
              <strong style={{ color: "#0f172a" }}>
                {TIPOS_DOCUMENTO.find(t => t.id === carpetaAbierta)?.label ?? carpetaAbierta}
              </strong>
            </>
          ) : (
            <strong style={{ color: "#0f172a" }}>{lote.proveedor}</strong>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Building2 size={22} style={{ color: "#10b981" }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              {editando ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    value={provEdit}
                    onChange={(e) => setProvEdit(e.target.value)}
                    placeholder="Nombre del Lote"
                    style={{
                      padding: "6px 10px",
                      border: "1.5px solid #10b981",
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 900,
                      outline: "none",
                      width: "100%",
                      maxWidth: 300,
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: "#475569", fontWeight: 700 }}>Ref:</span>
                    <input
                      value={refEdit}
                      onChange={(e) => setRefEdit(e.target.value)}
                      placeholder="Número..."
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: 6,
                        fontSize: 12,
                        outline: "none",
                        width: 100,
                      }}
                    />
                    <button
                      onClick={handleGuardarEdicion}
                      style={{
                        background: "#10b981",
                        border: "none",
                        borderRadius: 6,
                        color: "#fff",
                        padding: "4px 8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setProvEdit(lote.proveedor);
                        setRefEdit(lote.referencia || "");
                        setEditando(false);
                      }}
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: 6,
                        color: "#ef4444",
                        padding: "4px 8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontWeight: 900,
                        fontSize: 18,
                        color: "#0f172a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lote.proveedor}
                    </h2>
                    <button
                      onClick={() => setEditando(true)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94a3b8",
                        display: "flex",
                        padding: 4,
                      }}
                      title="Editar nombre y número de lote"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 3,
                      flexWrap: "wrap",
                    }}
                  >
                    {lote.referencia && (
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        Ref: {lote.referencia}
                      </span>
                    )}
                    <EstadoBadge estado={estado} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Selector de modo de vista */}
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, border: "1px solid #cbd5e1" }}>
              <button
                onClick={() => setVistaModo("list")}
                title="Vista Lista Detallada"
                style={{
                  background: vistaModo === "list" ? "#fff" : "transparent",
                  color: vistaModo === "list" ? "#0f172a" : "#64748b",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  boxShadow: vistaModo === "list" ? "0 2px 5px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <List size={13} /> Lista
              </button>
              <button
                onClick={() => setVistaModo("grid")}
                title="Vista Cuadrícula de Carpetas"
                style={{
                  background: vistaModo === "grid" ? "#fff" : "transparent",
                  color: vistaModo === "grid" ? "#0f172a" : "#64748b",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 800,
                  boxShadow: vistaModo === "grid" ? "0 2px 5px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <LayoutGrid size={13} /> Carpetas
              </button>
            </div>
            {/* Botón Descargar Lote */}
            <button
              onClick={handleDescargarLote}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "9px 18px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
                fontFamily: "inherit",
              }}
            >
              <FileDown size={15} /> PDF
            </button>

            {/* Botón Guardar - Fijo y accesible */}
            <button
               onClick={() => {
                 toast.success("Todos los cambios sincronizados");
               }}
               style={{
                 display: "inline-flex",
                 alignItems: "center",
                 gap: 8,
                 background: "#10b981",
                 color: "#fff",
                 border: "none",
                 borderRadius: 12,
                 padding: "9px 22px",
                 cursor: "pointer",
                 fontWeight: 800,
                 fontSize: 12,
                 fontFamily: "inherit",
                 boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
               }}
            >
              <CheckCircle size={15} /> GUARDAR
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: "20px 24px", maxWidth: vistaModo === "grid" ? 1080 : 720, margin: "0 auto", transition: "max-width 0.3s ease" }}>
        
        {/* BOTÓN ORIGINAL DE GUARDAR (Reinsertado) */}
        <div style={{ marginBottom: 20 }}>
           <button
             onClick={() => {
               toast.success("¡Sincronización manual completada!");
             }}
             style={{
               width: "100%",
               display: "inline-flex",
               alignItems: "center",
               justifyContent: "center",
               gap: 10,
               padding: "14px 24px",
               background: "#10b981",
               color: "#fff",
               borderRadius: 14,
               fontSize: 14,
               fontWeight: 900,
               cursor: "pointer",
               boxShadow: "0 6px 16px rgba(16, 185, 129, 0.25)",
               border: "none"
             }}
           >
             <CheckCircle2 size={20} /> GUARDAR CAMBIOS DE ESTE LOTE
           </button>
        </div>
        {faltantes.length > 0 && (
          <div
            style={{
              background: "#fef3c7",
              border: "1.5px solid #fde68a",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 18,
              display: "flex",
              gap: 12,
            }}
          >
            <AlertCircle
              size={18}
              style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#92400e",
                }}
              >
                Faltan {faltantes.length} documento
                {faltantes.length > 1 ? "s" : ""} requerido
                {faltantes.length > 1 ? "s" : ""}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                {faltantes.map((t) => (
                  <span
                    key={t.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #fde68a",
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#92400e",
                    }}
                  >
                    {t.label} — {t.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Éxito */}
        {estado === "completo" && (
          <div
            style={{
              background: "#d1fae5",
              border: "1.5px solid #6ee7b7",
              borderRadius: 14,
              padding: "14px 18px",
              marginBottom: 18,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <CheckCircle size={18} style={{ color: "#10b981" }} />
            <p
              style={{
                margin: 0,
                fontWeight: 800,
                fontSize: 13,
                color: "#065f46",
              }}
            >
              ¡Todos los documentos requeridos están cargados!
            </p>
          </div>
        )}

        {/* Nota informativa */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "11px 15px",
            marginBottom: 18,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <Info size={14} style={{ color: "#64748b", marginTop: 1, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
            Los documentos <strong>CC-9, DS, CC-6 y CC-10</strong> son obligatorios.
            <strong> FV</strong> y <strong>CC-1</strong> son opcionales según el tipo de gasto.
          </p>
        </div>

        {/* === VISTA GRID: EXPLORADOR DE CARPETAS === */}
        {vistaModo === "grid" && (
          carpetaAbierta === null ? (
            /* Nivel 1 — cuadrícula de carpetas */
            <motion.div
              key="folder-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex", flexDirection: "column", gap: 32 }}
            >
              {/* Sección: Comprobantes */}
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 900, color: "#475569", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
                  <Folder size={14} style={{ color: "#f59e0b" }} /> Comprobantes Contables
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
                  {TIPOS_DOCUMENTO.filter(t => t.categoria === "comprobantes").map(tipo => (
                    <CarpetaIcono
                      key={tipo.id}
                      tipo={tipo}
                      numArchivos={(lote.documentos[tipo.id] ?? []).length}
                      onClick={() => setCarpetaAbierta(tipo.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Sección: Bancos */}
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 900, color: "#0d9488", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
                  <Folder size={14} style={{ color: "#0d9488" }} /> Conciliaciones — Bancos
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
                  {TIPOS_DOCUMENTO.filter(t => t.categoria === "bancos").map(tipo => (
                    <CarpetaIcono
                      key={tipo.id}
                      tipo={tipo}
                      numArchivos={(lote.documentos[tipo.id] ?? []).length}
                      onClick={() => setCarpetaAbierta(tipo.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Sección: Caja */}
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 900, color: "#65a30d", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
                  <Folder size={14} style={{ color: "#65a30d" }} /> Conciliaciones — Caja
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
                  {TIPOS_DOCUMENTO.filter(t => t.categoria === "caja").map(tipo => (
                    <CarpetaIcono
                      key={tipo.id}
                      tipo={tipo}
                      numArchivos={(lote.documentos[tipo.id] ?? []).length}
                      onClick={() => setCarpetaAbierta(tipo.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Sección: Otros */}
              {TIPOS_DOCUMENTO.some(t => t.categoria === "otros") && (
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 900, color: "#64748b", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
                    <Folder size={14} style={{ color: "#64748b" }} /> Otros Documentos
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
                    {TIPOS_DOCUMENTO.filter(t => t.categoria === "otros").map(tipo => (
                      <CarpetaIcono
                        key={tipo.id}
                        tipo={tipo}
                        numArchivos={(lote.documentos[tipo.id] ?? []).length}
                        onClick={() => setCarpetaAbierta(tipo.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Nivel 2 — dentro de una carpeta */
            <motion.div
              key={`carpeta-${carpetaAbierta}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
            >
              {/* Botón volver a carpetas */}
              <button
                onClick={() => setCarpetaAbierta(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#f1f5f9",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 12,
                  color: "#475569",
                  fontFamily: "inherit",
                  marginBottom: 20,
                }}
              >
                <ArrowLeft size={14} /> Volver a carpetas
              </button>

              {/* TipoDocCard de la carpeta seleccionada, forzado abierto */}
              {TIPOS_DOCUMENTO.filter(t => t.id === carpetaAbierta).map(tipo => (
                <TipoDocCard
                  key={tipo.id}
                  tipo={tipo}
                  archivos={lote.documentos[tipo.id] ?? []}
                  onAgregar={(arch) => onAgregarArchivo(tipo.id, arch)}
                  onEliminar={(id) => onEliminarArchivo(tipo.id, id)}
                  onActualizarArchivos={(nuevosArchs) => onActualizarArchivosDoc(tipo.id, nuevosArchs)}
                  onVer={setVisorArchivo}
                  nombreProveedor={lote.proveedor}
                  alertaConsecutivo={alertasConsecutivos[tipo.id]}
                  defaultOpen={true}
                />
              ))}
            </motion.div>
          )
        )}

        {/* === VISTA LISTA (modo clásico con desplegables) === */}
        {vistaModo === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* SECCIÓN COMPROBANTES */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 900, color: "#475569", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                 <Folder size={15} style={{ color: "#f59e0b" }} /> Comprobantes Contables
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {TIPOS_DOCUMENTO.filter(t => t.categoria === "comprobantes").map((tipo) => (
                  <TipoDocCard
                    key={tipo.id}
                    tipo={tipo}
                    archivos={lote.documentos[tipo.id] ?? []}
                    onAgregar={(arch) => onAgregarArchivo(tipo.id, arch)}
                    onEliminar={(id) => onEliminarArchivo(tipo.id, id)}
                    onActualizarArchivos={(nuevosArchs) => onActualizarArchivosDoc(tipo.id, nuevosArchs)}
                    onVer={setVisorArchivo}
                    nombreProveedor={lote.proveedor}
                    alertaConsecutivo={alertasConsecutivos[tipo.id]}
                  />
                ))}
              </div>
            </div>

            {/* SECCIÓN CONCILIACIONES */}
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: 20, border: "2px solid #e2e8f0" }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                 <CheckCircle2 size={18} style={{ color: "#0d9488" }} /> CONCILIACIONES
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 900, color: "#0d9488", marginBottom: 8, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#0d9488" }} /> BANCOS
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {TIPOS_DOCUMENTO.filter(t => t.categoria === "bancos").map((tipo) => (
                      <TipoDocCard
                        key={tipo.id}
                        tipo={tipo}
                        archivos={lote.documentos[tipo.id] ?? []}
                        onAgregar={(arch) => onAgregarArchivo(tipo.id, arch)}
                        onEliminar={(id) => onEliminarArchivo(tipo.id, id)}
                        onActualizarArchivos={(nuevosArchs) => onActualizarArchivosDoc(tipo.id, nuevosArchs)}
                        onVer={setVisorArchivo}
                        nombreProveedor={lote.proveedor}
                        alertaConsecutivo={alertasConsecutivos[tipo.id]}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 900, color: "#65a30d", marginBottom: 8, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#65a30d" }} /> CAJA
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {TIPOS_DOCUMENTO.filter(t => t.categoria === "caja").map((tipo) => (
                      <TipoDocCard
                        key={tipo.id}
                        tipo={tipo}
                        archivos={lote.documentos[tipo.id] ?? []}
                        onAgregar={(arch) => onAgregarArchivo(tipo.id, arch)}
                        onEliminar={(id) => onEliminarArchivo(tipo.id, id)}
                        onActualizarArchivos={(nuevosArchs) => onActualizarArchivosDoc(tipo.id, nuevosArchs)}
                        onVer={setVisorArchivo}
                        nombreProveedor={lote.proveedor}
                        alertaConsecutivo={alertasConsecutivos[tipo.id]}
                      />
                    ))}
                  </div>
                </div>
                {TIPOS_DOCUMENTO.some(t => t.categoria === "conciliaciones") && (
                  <div>
                    <h4 style={{ fontSize: 11, fontWeight: 900, color: "#4f46e5", marginBottom: 8, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4f46e5" }} /> GENERALES
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {TIPOS_DOCUMENTO.filter(t => t.categoria === "conciliaciones").map((tipo) => (
                        <TipoDocCard
                          key={tipo.id}
                          tipo={tipo}
                          archivos={lote.documentos[tipo.id] ?? []}
                          onAgregar={(arch) => onAgregarArchivo(tipo.id, arch)}
                          onEliminar={(id) => onEliminarArchivo(tipo.id, id)}
                          onActualizarArchivos={(nuevosArchs) => onActualizarArchivosDoc(tipo.id, nuevosArchs)}
                          onVer={setVisorArchivo}
                          nombreProveedor={lote.proveedor}
                          alertaConsecutivo={alertasConsecutivos[tipo.id]}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECCIÓN OTROS */}
            {TIPOS_DOCUMENTO.some(t => t.categoria === "otros") && (
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 900, color: "#64748b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                   <Folder size={15} style={{ color: "#64748b" }} /> Otros Documentos
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {TIPOS_DOCUMENTO.filter(t => t.categoria === "otros").map((tipo) => (
                    <TipoDocCard
                      key={tipo.id}
                      tipo={tipo}
                      archivos={lote.documentos[tipo.id] ?? []}
                      onAgregar={(arch) => onAgregarArchivo(tipo.id, arch)}
                      onEliminar={(id) => onEliminarArchivo(tipo.id, id)}
                      onActualizarArchivos={(nuevosArchs) => onActualizarArchivosDoc(tipo.id, nuevosArchs)}
                      onVer={setVisorArchivo}
                      nombreProveedor={lote.proveedor}
                      alertaConsecutivo={alertasConsecutivos[tipo.id]}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
}
