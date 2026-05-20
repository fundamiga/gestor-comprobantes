"use client";

import { useState } from "react";
import {
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  FileDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from "lucide-react";
import type { ArchivoSubido, TipoDocumento } from "@/types";
import { ZonaUpload } from "./ZonaUpload";

interface TipoDocCardProps {
  tipo: TipoDocumento;
  archivos: ArchivoSubido[];
  onAgregar: (archivo: ArchivoSubido) => void;
  onEliminar: (archivoId: string) => void;
  onActualizarArchivos: (nuevosArchivos: ArchivoSubido[]) => void;
  onVer: (archivo: ArchivoSubido) => void;
  nombreProveedor: string;
  alertaConsecutivo?: { faltantes: number[]; repetidos: number[]; presentes: number[] };
}

interface GrupoPareja {
  id: string;
  nombre: string;
  archivos: ArchivoSubido[];
}

export function TipoDocCard({
  tipo,
  archivos,
  onAgregar,
  onEliminar,
  onActualizarArchivos,
  onVer,
  nombreProveedor,
  alertaConsecutivo,
}: TipoDocCardProps) {
  const [abierto, setAbierto] = useState(false);
  const [gruposVacios, setGruposVacios] = useState<{ id: string; nombre: string }[]>([]);
  const [renombrandoId, setRenombrandoId] = useState<string | null>(null);
  const [nuevoNombreText, setNuevoNombreText] = useState("");
  const [extraUploadActivo, setExtraUploadActivo] = useState<{ [grupoId: string]: boolean }>({});

  const tiene = archivos.length > 0;

  // ── 1. AGRUPAR ARCHIVOS SI EL TIPO EXIGE PAREJAS (minArchivos === 2) ────────────────
  const esPorParejas = tipo.minArchivos === 2;

  // Agrupar archivos reales
  const gruposMap: { [grupoId: string]: ArchivoSubido[] } = {};
  const archivosSinGrupo: ArchivoSubido[] = [];

  archivos.forEach((a) => {
    if (a.grupoId) {
      if (!gruposMap[a.grupoId]) {
        gruposMap[a.grupoId] = [];
      }
      gruposMap[a.grupoId].push(a);
    } else {
      archivosSinGrupo.push(a);
    }
  });

  // Si hay archivos viejos sin grupo, los ponemos en "grupo_inicial"
  if (archivosSinGrupo.length > 0) {
    const idInicial = "grupo_inicial";
    if (!gruposMap[idInicial]) {
      gruposMap[idInicial] = [];
    }
    gruposMap[idInicial].push(...archivosSinGrupo);
  }

  // Mapear a formato de grupos
  const gruposReales: GrupoPareja[] = Object.entries(gruposMap).map(([id, files]) => {
    const nombre = files[0]?.grupoNombre || (id === "grupo_inicial" ? "Pareja 1" : "Pareja");
    return { id, nombre, archivos: files };
  });

  // Combinar con grupos vacíos creados por el usuario
  const todosGrupos: GrupoPareja[] = [...gruposReales];
  gruposVacios.forEach((v) => {
    if (!todosGrupos.some((g) => g.id === v.id)) {
      todosGrupos.push({ id: v.id, nombre: v.nombre, archivos: [] });
    }
  });

  // Asegurar que haya al menos 1 grupo inicial si es por parejas y no hay nada
  if (esPorParejas && todosGrupos.length === 0) {
    todosGrupos.push({
      id: "grupo_inicial",
      nombre: "Pareja 1",
      archivos: [],
    });
  }

  // ── 2. ALERTAS DEL HEADER CARD ────────────────────────────────────────────────────
  let faltaParejaCritico = false;
  let faltaParejaAdvertencia = false;

  if (esPorParejas) {
    // Es crítico si algún grupo tiene exactamente 1 archivo
    faltaParejaCritico = todosGrupos.some((g) => g.archivos.length === 1);
    // Es advertencia/caso especial si algún grupo tiene número impar >= 3
    faltaParejaAdvertencia =
      !faltaParejaCritico && todosGrupos.some((g) => g.archivos.length >= 3 && g.archivos.length % 2 !== 0);
  }

  // ── 3. ACCIONES DE GRUPOS ──────────────────────────────────────────────────────────
  const handleCrearGrupo = () => {
    const nuevoId = `grupo_${Date.now()}`;
    const nuevoNombre = `Pareja ${todosGrupos.length + 1}`;
    setGruposVacios((prev) => [...prev, { id: nuevoId, nombre: nuevoNombre }]);
  };

  const handleEliminarGrupo = (grupoId: string) => {
    if (confirm("¿Estás seguro de eliminar este grupo de parejas y todos sus archivos?")) {
      // Eliminar de los grupos vacíos locales si estuviera allí
      setGruposVacios((prev) => prev.filter((v) => v.id !== grupoId));
      // Eliminar archivos que correspondan a este grupo
      const nuevosArchs = archivos.filter((a) => {
        const idG = a.grupoId || "grupo_inicial";
        return idG !== grupoId;
      });
      onActualizarArchivos(nuevosArchs);
    }
  };

  const handleRenombrarGrupo = (grupoId: string, nombreActual: string) => {
    setRenombrandoId(grupoId);
    setNuevoNombreText(nombreActual);
  };

  const handleGuardarNombreGrupo = (grupoId: string) => {
    const textoFinal = nuevoNombreText.trim() || "Pareja";

    // Actualizar en grupos vacíos locales si estuviera allí
    setGruposVacios((prev) =>
      prev.map((v) => (v.id === grupoId ? { ...v, nombre: textoFinal } : v))
    );

    // Actualizar en los archivos de la base de datos
    const nuevosArchs = archivos.map((a) => {
      const idG = a.grupoId || "grupo_inicial";
      if (idG === grupoId) {
        return { ...a, grupoId, grupoNombre: textoFinal };
      }
      return a;
    });
    onActualizarArchivos(nuevosArchs);

    setRenombrandoId(null);
    setNuevoNombreText("");
  };

  const handleCombinarPdfGrupo = async (grupo: GrupoPareja) => {
    const { combinarYDescargarPdf } = await import("@/lib/pdfMerger");
    const labelProveedor = nombreProveedor.replace(/\s+/g, "_");
    const labelGrupo = grupo.nombre.replace(/\s+/g, "_");
    await combinarYDescargarPdf(
      grupo.archivos,
      `${labelProveedor}_${tipo.id}_${labelGrupo}`
    );
  };

  return (
    <div
      style={{
        border: `1.5px solid ${tiene ? tipo.color + "40" : "#e2e8f0"}`,
        borderRadius: 14,
        overflow: "hidden",
        background: tiene ? `${tipo.color}03` : "#fff",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {/* Header del card principal */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          cursor: "pointer",
          gap: 12,
          userSelect: "none",
        }}
        onClick={() => setAbierto(!abierto)}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            flexShrink: 0,
            background: tiene ? tipo.color : "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
          }}
        >
          {tiene ? (
            <CheckCircle size={17} style={{ color: "#fff" }} />
          ) : (
            <FileText size={17} style={{ color: "#94a3b8" }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: tipo.color,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {tipo.label}
            </span>
            {!tipo.requerido && (
              <span
                style={{
                  fontSize: 8,
                  background: "#f1f5f9",
                  color: "#94a3b8",
                  borderRadius: 4,
                  padding: "1px 5px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Opcional
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#1e293b", margin: "2px 0 0", fontWeight: 700 }}>
            {tipo.nombre}
          </p>
          <p style={{ fontSize: 10, color: "#64748b", margin: "1px 0 0" }}>
            {tipo.descripcion}
          </p>

          {/* Advertencias */}
          {faltaParejaCritico && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "#b45309",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 9,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              <AlertCircle size={10} style={{ color: "#d97706" }} /> Falta la pareja (soporte incompleto)
            </div>
          )}
          {faltaParejaAdvertencia && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "#0369a1",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 6,
                padding: "2px 8px",
                fontSize: 9,
                fontWeight: 800,
                marginTop: 5,
              }}
            >
              <AlertCircle size={10} style={{ color: "#0284c7" }} /> Caso especial (archivos impares)
            </div>
          )}
        </div>

        {/* Conteo global y chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {esPorParejas ? (
            tiene && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: tipo.color,
                  background: `${tipo.color}15`,
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {todosGrupos.filter((g) => g.archivos.length > 0).length} parejas ({archivos.length} arch.)
              </span>
            )
          ) : (
            tiene && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: tipo.color,
                  background: `${tipo.color}15`,
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {archivos.length} {archivos.length === 1 ? "archivo" : "archivos"}
              </span>
            )
          )}

          {abierto ? (
            <ChevronDown size={14} style={{ color: "#94a3b8" }} />
          ) : (
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          )}
        </div>
      </div>

      {/* ── PANEL EXPANDIDO ──────────────────────────────────────────────────────── */}
      {abierto && (
        <div style={{ padding: "16px", borderTop: "1.5px solid #f1f5f9", background: "#fff" }}>
          
          {esPorParejas ? (
            // ── RENDERING POR PAREJAS (GRUPOS) ──────────────────────────────────────
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {todosGrupos.map((grupo) => {
                  const esRenombrando = renombrandoId === grupo.id;
                  const count = grupo.archivos.length;
                  const gFaltaPareja = count === 1;
                  const gEsImparExtra = count >= 3 && count % 2 !== 0;
                  const uploadExtra = extraUploadActivo[grupo.id] ?? false;

                  // Extraer el número consecutivo de esta pareja
                  let numGrupo: number | null = null;
                  const posiblesTextos = [grupo.nombre, ...grupo.archivos.map(a => a.nombre)];
                  for (const rawTexto of posiblesTextos) {
                    const texto = rawTexto.replace(new RegExp(tipo.id, 'gi'), '');
                    if (texto.startsWith("Pareja ")) continue;
                    const match = texto.match(/\d+/);
                    if (match) {
                      numGrupo = parseInt(match[0], 10);
                      break;
                    }
                  }

                  const esRepetido = numGrupo !== null && alertaConsecutivo?.repetidos.includes(numGrupo);

                  // Verificar si faltan números antes de este grupo
                  let faltanAntes: number[] = [];
                  if (numGrupo !== null && alertaConsecutivo) {
                    const idx = alertaConsecutivo.presentes.indexOf(numGrupo);
                    if (idx > 0) {
                      const prevNum = alertaConsecutivo.presentes[idx - 1];
                      if (numGrupo > prevNum + 1) {
                        for (let i = prevNum + 1; i < numGrupo; i++) {
                          faltanAntes.push(i);
                        }
                      }
                    }
                  }

                  return (
                    <div
                      key={grupo.id}
                      style={{
                        background: "#f8fafc",
                        border: `1.5px solid ${gFaltaPareja ? "#fde68a" : "#e2e8f0"}`,
                        borderRadius: 12,
                        padding: "14px",
                        position: "relative",
                      }}
                    >
                      {/* Cabecera de la Pareja */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                          {esRenombrando ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", maxWidth: 300 }}>
                              <input
                                type="text"
                                value={nuevoNombreText}
                                onChange={(e) => setNuevoNombreText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleGuardarNombreGrupo(grupo.id);
                                  if (e.key === "Escape") setRenombrandoId(null);
                                }}
                                autoFocus
                                style={{
                                  padding: "4px 8px",
                                  border: "1.5px solid #3b82f6",
                                  borderRadius: 8,
                                  fontSize: 12,
                                  fontFamily: "inherit",
                                  width: "100%",
                                }}
                              />
                              <button
                                onClick={() => handleGuardarNombreGrupo(grupo.id)}
                                style={{
                                  background: "#10b981",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: 4,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setRenombrandoId(null)}
                                style={{
                                  background: "#64748b",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: 4,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <strong style={{ fontSize: 13, color: "#334155" }}>
                                {grupo.nombre}
                              </strong>
                              <button
                                onClick={() => handleRenombrarGrupo(grupo.id, grupo.nombre)}
                                title="Cambiar nombre de esta pareja"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#94a3b8",
                                  cursor: "pointer",
                                  padding: 2,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Edit2 size={11} />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Botones de acción del grupo */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {count >= 2 && (
                            <button
                              onClick={() => handleCombinarPdfGrupo(grupo)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                background: "#fff",
                                border: "1.5px solid #cbd5e1",
                                borderRadius: 8,
                                padding: "4px 8px",
                                fontSize: 10,
                                fontWeight: 800,
                                color: "#475569",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              <FileDown size={11} /> Combinar PDF
                            </button>
                          )}
                          <button
                            onClick={() => handleEliminarGrupo(grupo.id)}
                            title="Eliminar esta pareja"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: 4,
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Advertencia de salto de consecutivo */}
                      {faltanAntes.length > 0 && (
                        <div
                          style={{
                            background: "#fee2e2",
                            border: "1px solid #fecaca",
                            borderRadius: 8,
                            padding: "8px 12px",
                            marginBottom: 10,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 6,
                            fontSize: 10,
                            color: "#b91c1c",
                          }}
                        >
                          <AlertCircle size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <strong>Salto de secuencia:</strong> Faltan los consecutivos <strong>{faltanAntes.join(", ")}</strong> antes de este archivo.
                          </div>
                        </div>
                      )}

                      {/* Advertencia interna del grupo de Consecutivo Repetido */}
                      {esRepetido && (
                        <div
                          style={{
                            background: "#fee2e2",
                            border: "1px solid #fecaca",
                            borderRadius: 8,
                            padding: "8px 12px",
                            marginBottom: 10,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 6,
                            fontSize: 10,
                            color: "#b91c1c",
                          }}
                        >
                          <AlertCircle size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <strong>Consecutivo repetido:</strong> El número <strong>{numGrupo}</strong> ya está siendo usado por otra pareja u otro lote en este mes.
                          </div>
                        </div>
                      )}

                      {/* Advertencia interna del grupo */}
                      {gFaltaPareja && (
                        <div
                          style={{
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: 8,
                            padding: "8px 12px",
                            marginBottom: 10,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 6,
                            fontSize: 10,
                            color: "#b45309",
                          }}
                        >
                          <AlertCircle size={13} style={{ color: "#d97706", flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <strong>Falta un soporte:</strong> Se requiere subir el archivo complementario de: <strong>{tipo.ayudaPareja}</strong>.
                          </div>
                        </div>
                      )}
                      {gEsImparExtra && (
                        <div
                          style={{
                            background: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            borderRadius: 8,
                            padding: "8px 12px",
                            marginBottom: 10,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 6,
                            fontSize: 10,
                            color: "#0369a1",
                          }}
                        >
                          <AlertCircle size={13} style={{ color: "#0284c7", flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <strong>Nota sobre archivos impares:</strong> Tienes {count} archivos. Si es un caso especial con soportes adicionales, ignora este aviso.
                          </div>
                        </div>
                      )}

                      {/* Listado de archivos y dropzone de esta pareja */}
                      <div style={{ marginBottom: count > 0 ? 10 : 0 }}>
                        <ZonaUpload
                          tipoDoc={tipo}
                          archivos={grupo.archivos}
                          onAgregar={onAgregar}
                          onEliminar={onEliminar}
                          onVer={onVer}
                          grupoId={grupo.id}
                          grupoNombre={grupo.nombre}
                          ocultarDropzone={count >= 2 && !uploadExtra}
                        />
                      </div>

                      {/* Botón para forzar más archivos (Trio/Cuarteto) */}
                      {count >= 2 && (
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() =>
                              setExtraUploadActivo((prev) => ({ ...prev, [grupo.id]: !uploadExtra }))
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: tipo.color,
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: "pointer",
                              padding: "4px 0",
                              textDecoration: "underline",
                              fontFamily: "inherit",
                            }}
                          >
                            {uploadExtra ? "✕ Cerrar subida" : "+ Agregar soporte extra a esta pareja"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botón para iniciar una nueva pareja */}
              <button
                onClick={handleCrearGrupo}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: `${tipo.color}15`,
                  color: tipo.color,
                  border: `1.5px dashed ${tipo.color}35`,
                  borderRadius: 10,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 11,
                  fontFamily: "inherit",
                  marginTop: 14,
                  width: "100%",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                <Plus size={14} /> Iniciar Nueva Pareja de Documentos
              </button>
            </div>
          ) : (
            // ── RENDERING PLANO (FV, CC-1...) ───────────────────────────────────────
            <div>
              {archivos.length > 1 && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <button
                    onClick={async () => {
                      const { combinarYDescargarPdf } = await import("@/lib/pdfMerger");
                      combinarYDescargarPdf(archivos, `${nombreProveedor.replace(/\s+/g, "_")}_${tipo.id}`);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "#fff",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#475569",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <FileDown size={11} /> Combinar todos en un PDF
                  </button>
                </div>
              )}
              <ZonaUpload
                tipoDoc={tipo}
                archivos={archivos}
                onAgregar={onAgregar}
                onEliminar={onEliminar}
                onVer={onVer}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
