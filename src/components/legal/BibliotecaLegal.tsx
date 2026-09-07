"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, FileText, X, Upload, Trash2, Eye, Download,
  Plus, Search, Calendar, ChevronDown, ChevronUp, BookOpen,
  ArrowLeft, AlertCircle, CheckCircle,
} from "lucide-react";
import { subirACloudinary } from "@/lib/cloudinary";
import { uid, formatKb } from "@/lib/utils";
import { CATEGORIAS_LEGALES, useDocsLegales, type DocLegal } from "@/hooks/useDocsLegales";

// ── Visor de archivo ───────────────────────────────────────────────────────────
function VisorLegal({ doc, onClose }: { doc: DocLegal; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column",
    }} onClick={onClose}>
      <div style={{
        background: "#202124", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "12px 20px", flexShrink: 0,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileText size={18} color="#e8eaed" />
          <span style={{ color: "#e8eaed", fontSize: 14, fontWeight: 600 }}>{doc.nombre}</span>
          <span style={{ fontSize: 11, color: "#9aa0a6", background: "#3c4043", padding: "2px 8px", borderRadius: 99 }}>
            {formatKb(doc.tamanioKb)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={doc.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#1a73e8", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
            <Download size={14} /> Descargar
          </a>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9aa0a6", padding: 6, borderRadius: 6, display: "flex" }}>
            <X size={20} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        {doc.tipo === "application/pdf" ? (
          <iframe src={doc.url} style={{ width: "100%", height: "100%", border: "none" }} title={doc.nombre} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <img src={doc.url} alt={doc.nombre} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: 8 }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal para subir documento legal ──────────────────────────────────────────
function ModalSubirDoc({ onGuardar, onCerrar }: {
  onGuardar: (doc: DocLegal) => void;
  onCerrar: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_LEGALES[0].id);
  const [descripcion, setDescripcion] = useState("");
  const [fechaVigencia, setFechaVigencia] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleArchivo = (f: File) => {
    setArchivo(f);
    if (!nombre) setNombre(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSubir = async () => {
    if (!archivo || !nombre.trim()) { setError("Elige un archivo y ponle un nombre."); return; }
    setSubiendo(true);
    setError("");
    try {
      const url = await subirACloudinary(archivo);
      const doc: DocLegal = {
        id: uid(),
        nombre: nombre.trim(),
        categoria,
        url,
        tipo: archivo.type,
        tamanioKb: Math.round(archivo.size / 1024),
        descripcion: descripcion.trim() || undefined,
        fechaSubida: new Date().toISOString(),
        fechaVigencia: fechaVigencia || undefined,
      };
      onGuardar(doc);
    } catch {
      setError("Error al subir el archivo. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  const cat = CATEGORIAS_LEGALES.find((c) => c.id === categoria)!;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onCerrar}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, background: "#e8f0fe", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={18} color="#1a73e8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#202124" }}>Subir documento legal</h3>
              <p style={{ margin: 0, fontSize: 11, color: "#5f6368" }}>Se guardará en la carpeta {cat.emoji} {cat.label}</p>
            </div>
          </div>
          <button onClick={onCerrar} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#5f6368", borderRadius: 8, padding: 6, display: "flex" }}>
            <X size={18} />
          </button>
        </div>

        {/* Zona de drop */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleArchivo(f); }}
          style={{
            border: archivo ? "2px solid #1a73e8" : "2px dashed #dadce0",
            borderRadius: 12, padding: "18px 14px", textAlign: "center",
            cursor: "pointer", marginBottom: 18,
            background: archivo ? "#e8f0fe" : "#f8f9fa",
            transition: "all 0.15s",
          }}>
          <input ref={fileRef} type="file" style={{ display: "none" }}
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArchivo(f); }} />
          {archivo ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <FileText size={22} color="#1a73e8" />
              <div style={{ textAlign: "left" }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1a73e8" }}>{archivo.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#5f6368" }}>{formatKb(Math.round(archivo.size / 1024))}</p>
              </div>
            </div>
          ) : (
            <>
              <Upload size={24} color="#9aa0a6" style={{ margin: "0 auto 6px" }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#5f6368" }}>Arrastra aquí o haz clic</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9aa0a6" }}>PDF, Word, imagen</p>
            </>
          )}
        </div>

        {/* Campos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.04em" }}>Nombre del documento *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Resolución 123 de 2025"
              style={{ width: "100%", marginTop: 4, padding: "9px 12px", border: "1.5px solid #dadce0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.04em" }}>Categoría</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {CATEGORIAS_LEGALES.map((c) => (
                <button key={c.id} onClick={() => setCategoria(c.id)}
                  style={{
                    border: categoria === c.id ? `2px solid ${c.color}` : "1.5px solid #dadce0",
                    background: categoria === c.id ? `${c.color}15` : "#fff",
                    borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                    color: categoria === c.id ? c.color : "#5f6368", cursor: "pointer",
                    transition: "all 0.12s",
                  }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.04em" }}>Descripción (opcional)</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Breve descripción del contenido..."
              rows={2}
              style={{ width: "100%", marginTop: 4, padding: "9px 12px", border: "1.5px solid #dadce0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.04em" }}>Fecha de vigencia (opcional)</label>
            <input type="date" value={fechaVigencia} onChange={(e) => setFechaVigencia(e.target.value)}
              style={{ width: "100%", marginTop: 4, padding: "9px 12px", border: "1.5px solid #dadce0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", marginTop: 12, fontSize: 12, color: "#dc2626" }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onCerrar} style={{ padding: "9px 18px", border: "1.5px solid #dadce0", background: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancelar
          </button>
          <button onClick={handleSubir} disabled={subiendo || !archivo}
            style={{
              padding: "9px 20px", border: "none", background: subiendo || !archivo ? "#dadce0" : "#1a73e8",
              color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: subiendo || !archivo ? "not-allowed" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 8,
            }}>
            {subiendo ? <>⏳ Subiendo...</> : <><Upload size={14} /> Guardar documento</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export function BibliotecaLegal({ onVolver }: { onVolver: () => void }) {
  const { docs, cargado, agregarDoc, eliminarDoc } = useDocsLegales();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [visor, setVisor] = useState<DocLegal | null>(null);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null);

  const docsFiltrados = docs.filter((d) => {
    const matchCat = !categoriaActiva || d.categoria === categoriaActiva;
    const matchBusq = !busqueda || d.nombre.toLowerCase().includes(busqueda.toLowerCase()) || d.descripcion?.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchBusq;
  });

  const handleGuardar = useCallback(async (doc: DocLegal) => {
    await agregarDoc(doc);
    setModalAbierto(false);
  }, [agregarDoc]);

  // Función para verificar si un documento está vencido o próximo a vencer
  const estadoVigencia = (fechaVigencia?: string) => {
    if (!fechaVigencia) return null;
    const hoy = new Date();
    const vigencia = new Date(fechaVigencia);
    const diasRestantes = Math.ceil((vigencia.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes < 0) return { label: "Vencido", color: "#dc2626", bg: "#fef2f2" };
    if (diasRestantes <= 30) return { label: `Vence en ${diasRestantes}d`, color: "#d97706", bg: "#fffbeb" };
    return { label: `Vigente hasta ${new Date(fechaVigencia).toLocaleDateString("es-CO")}`, color: "#1e8e3e", bg: "#f0fdf4" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {visor && <VisorLegal doc={visor} onClose={() => setVisor(null)} />}
      {modalAbierto && <ModalSubirDoc onGuardar={handleGuardar} onCerrar={() => setModalAbierto(false)} />}

      {/* ── Header sticky ──────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e8eaed",
        padding: "14px 24px", position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 1px 3px rgba(60,64,67,0.12)",
      }}>
        {/* Breadcrumb */}
        <div className="drive-breadcrumb" style={{ marginBottom: 12 }}>
          <button onClick={onVolver} className="drive-breadcrumb-item"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#1a73e8", fontFamily: "inherit" }}>
            <BookOpen size={15} color="#1a73e8" />
            <span>Mi unidad</span>
          </button>
          <span style={{ color: "#9aa0a6", fontSize: 14 }}>›</span>
          <div className="drive-breadcrumb-item" style={{ cursor: "default", fontWeight: 700, color: "#202124" }}>
            <Scale size={15} color="#7c3aed" />
            <span>Documentos Legales</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#f0ebff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={22} color="#7c3aed" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#202124" }}>Documentos Legales</h2>
              <p style={{ margin: 0, fontSize: 11, color: "#5f6368" }}>
                {docs.length} documento{docs.length !== 1 ? "s" : ""} guardado{docs.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Búsqueda */}
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={14} color="#9aa0a6" style={{ position: "absolute", left: 10 }} />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar documentos..."
                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1.5px solid #dadce0", borderRadius: 24, fontSize: 12, fontFamily: "inherit", outline: "none", width: 200, background: "#f8f9fa" }}
              />
            </div>
            <button onClick={() => setModalAbierto(true)} className="drive-pill-btn"
              style={{ background: "#1a73e8", color: "#fff", border: "none" }}>
              <Plus size={15} /> Subir documento
            </button>
          </div>
        </div>
      </div>

      {/* ── Contenido ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px" }}>

        {/* Filtro por categoría */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <button
            onClick={() => setCategoriaActiva(null)}
            style={{
              padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
              border: !categoriaActiva ? "2px solid #7c3aed" : "1.5px solid #dadce0",
              background: !categoriaActiva ? "#f0ebff" : "#fff",
              color: !categoriaActiva ? "#7c3aed" : "#5f6368",
              cursor: "pointer",
            }}>
            📂 Todos ({docs.length})
          </button>
          {CATEGORIAS_LEGALES.map((cat) => {
            const count = docs.filter((d) => d.categoria === cat.id).length;
            return (
              <button key={cat.id} onClick={() => setCategoriaActiva(cat.id === categoriaActiva ? null : cat.id)}
                style={{
                  padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                  border: categoriaActiva === cat.id ? `2px solid ${cat.color}` : "1.5px solid #dadce0",
                  background: categoriaActiva === cat.id ? `${cat.color}15` : "#fff",
                  color: categoriaActiva === cat.id ? cat.color : "#5f6368",
                  cursor: "pointer", transition: "all 0.12s",
                }}>
                {cat.emoji} {cat.label} {count > 0 && <span style={{ fontWeight: 800 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Estado vacío */}
        {!cargado ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9aa0a6" }}>
            <p style={{ fontSize: 14 }}>Cargando documentos...</p>
          </div>
        ) : docsFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <div style={{ width: 68, height: 68, background: "#f0ebff", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Scale size={30} color="#7c3aed" style={{ opacity: 0.5 }} />
            </div>
            <p style={{ fontWeight: 700, color: "#5f6368", fontSize: 15, margin: "0 0 6px" }}>
              {busqueda || categoriaActiva ? "No se encontraron documentos" : "Sin documentos legales aún"}
            </p>
            <p style={{ color: "#9aa0a6", fontSize: 13, margin: "0 0 20px" }}>
              {busqueda || categoriaActiva ? "Intenta con otra búsqueda o categoría" : "Sube leyes, contratos, estatutos y más"}
            </p>
            {!busqueda && !categoriaActiva && (
              <button onClick={() => setModalAbierto(true)} style={{
                background: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
                padding: "10px 22px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "inherit",
              }}>
                <Upload size={15} /> Subir primer documento
              </button>
            )}
          </div>
        ) : (
          /* ── Grid de documentos por categoría ── */
          <div>
            {/* Agrupar por categoría si no hay filtro activo */}
            {!categoriaActiva ? (
              CATEGORIAS_LEGALES.map((cat) => {
                const docsCategoria = docsFiltrados.filter((d) => d.categoria === cat.id);
                if (docsCategoria.length === 0) return null;
                return (
                  <div key={cat.id} style={{ marginBottom: 28 }}>
                    <div className="drive-section-title" style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                      <span style={{ color: cat.color, fontWeight: 700 }}>{cat.label}</span>
                      <span style={{ color: "#9aa0a6", fontWeight: 400 }}>· {docsCategoria.length} doc{docsCategoria.length !== 1 ? "s" : ""}</span>
                    </div>
                    <DocGrid docs={docsCategoria} cat={cat} onVer={setVisor} onEliminar={(id) => setConfirmEliminar(id)} estadoVigencia={estadoVigencia} />
                  </div>
                );
              })
            ) : (
              <DocGrid docs={docsFiltrados} cat={CATEGORIAS_LEGALES.find(c => c.id === categoriaActiva)!} onVer={setVisor} onEliminar={(id) => setConfirmEliminar(id)} estadoVigencia={estadoVigencia} />
            )}
          </div>
        )}
      </div>

      {/* Modal confirmar eliminación */}
      <AnimatePresence>
        {confirmEliminar && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", maxWidth: 360, width: "90%", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#202124" }}>¿Eliminar documento?</h3>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#5f6368" }}>Esta acción no se puede deshacer.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmEliminar(null)} style={{ padding: "8px 16px", border: "1.5px solid #dadce0", background: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancelar
                </button>
                <button onClick={() => { eliminarDoc(confirmEliminar); setConfirmEliminar(null); }}
                  style={{ padding: "8px 16px", border: "none", background: "#dc2626", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-componente: grilla de documentos ──────────────────────────────────────
function DocGrid({ docs, cat, onVer, onEliminar, estadoVigencia }: {
  docs: DocLegal[];
  cat: typeof CATEGORIAS_LEGALES[number];
  onVer: (doc: DocLegal) => void;
  onEliminar: (id: string) => void;
  estadoVigencia: (fecha?: string) => { label: string; color: string; bg: string } | null;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
      {docs.map((doc) => {
        const vigencia = estadoVigencia(doc.fechaVigencia);
        return (
          <motion.div key={doc.id} whileHover={{ y: -2 }} className="drive-folder-card"
            style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}
            onMouseEnter={(e) => { const btns = e.currentTarget.querySelector(".doc-actions") as HTMLElement | null; if (btns) btns.style.opacity = "1"; }}
            onMouseLeave={(e) => { const btns = e.currentTarget.querySelector(".doc-actions") as HTMLElement | null; if (btns) btns.style.opacity = "0"; }}>

            {/* Thumbnail */}
            <div style={{
              height: 80, background: `linear-gradient(150deg, ${cat.color}18, ${cat.color}06)`,
              borderBottom: `1px solid ${cat.color}22`, display: "flex", alignItems: "center",
              justifyContent: "center", position: "relative", cursor: "pointer",
            }} onClick={() => onVer(doc)}>
              <span style={{ fontSize: 32 }}>
                {doc.tipo === "application/pdf" ? "📄" : doc.tipo.startsWith("image") ? "🖼️" : "📝"}
              </span>
              {/* Botones de acción al hover */}
              <div className="doc-actions" style={{
                position: "absolute", top: 4, right: 4, opacity: 0,
                display: "flex", gap: 4, transition: "opacity 0.15s",
              }}>
                <button onClick={(e) => { e.stopPropagation(); onVer(doc); }}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Eye size={13} color="#5f6368" />
                </button>
                <a href={doc.url} target="_blank" download onClick={(e) => e.stopPropagation()}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                  <Download size={13} color="#5f6368" />
                </a>
                <button onClick={(e) => { e.stopPropagation(); onEliminar(doc.id); }}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.9)"; }}>
                  <Trash2 size={13} color="#dc2626" />
                </button>
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: "9px 11px 10px", cursor: "pointer" }} onClick={() => onVer(doc)}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 12, color: "#202124", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.nombre}
              </p>
              {doc.descripcion && (
                <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#5f6368", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.descripcion}</p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9.5, color: "#9aa0a6" }}>{formatKb(doc.tamanioKb)}</span>
                {vigencia && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: vigencia.color, background: vigencia.bg, padding: "1px 5px", borderRadius: 99 }}>
                    {vigencia.label}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
