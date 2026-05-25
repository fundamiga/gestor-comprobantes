"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Image as ImageIcon, Eye, Trash2, Download, FileSpreadsheet, Wand2 } from "lucide-react";
import type { ArchivoSubido, TipoDocumento } from "@/types";
import { uid, formatKb, obtenerUrlDescargaCloudinary } from "@/lib/utils";
import { subirACloudinary } from "@/lib/cloudinary";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ZonaUploadProps {
  tipoDoc: TipoDocumento;
  archivos: ArchivoSubido[];
  onAgregar: (archivo: ArchivoSubido) => void;
  onEliminar: (archivoId: string) => void;
  onVer: (archivo: ArchivoSubido) => void;
  grupoId?: string;
  grupoNombre?: string;
  ocultarDropzone?: boolean;
}

export function ZonaUpload({
  tipoDoc,
  archivos,
  onAgregar,
  onEliminar,
  onVer,
  grupoId,
  grupoNombre,
  ocultarDropzone = false,
}: ZonaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [cargando, setCargando] = useState(false);

  const procesarArchivos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCargando(true);
    const permitidos = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || 
             f.type === "application/pdf" || 
             f.type === "application/vnd.ms-excel" || 
             f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
             f.name.endsWith(".xls") || 
             f.name.endsWith(".xlsx")
    );
    for (const f of permitidos) {
      const toastId = toast.loading(`Subiendo "${f.name}"...`);
      try {
        const url = await subirACloudinary(f);
        const nuevo: ArchivoSubido = {
          id: uid(),
          nombre: f.name,
          tipo: f.type,
          url,
          fechaSubida: new Date().toLocaleDateString("es-CO"),
          tamanioKb: Math.round(f.size / 1024),
          grupoId,
          grupoNombre,
        };
        onAgregar(nuevo);
        toast.success(`"${f.name}" subido con éxito a la nube`, { id: toastId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        toast.error(`Error al subir "${f.name}": ${msg}`, { id: toastId });
      }
    }
    setCargando(false);
  };

  const generarCuentaCobro = async (arch: ArchivoSubido) => {
    const toastId = toast.loading("Generando Cuenta de Cobro...");
    try {
      // 1. Descargar el PDF desde Cloudinary
      const resPdf = await fetch(obtenerUrlDescargaCloudinary(arch.url));
      const blob = await resPdf.blob();
      
      // 2. Enviar al API
      const formData = new FormData();
      formData.append("file", blob, arch.nombre);
      
      const resApi = await fetch("/api/generar-cuenta-cobro", {
        method: "POST",
        body: formData,
      });

      if (!resApi.ok) {
        const err = await resApi.json();
        throw new Error(err.error || "Error en el servidor");
      }

      // 3. Descargar el Excel resultante
      const excelBlob = await resApi.blob();
      // Extraer el nombre del header Content-Disposition si es posible, o usar uno por defecto
      const disposition = resApi.headers.get("Content-Disposition");
      let filename = "Cuenta_Cobro.pdf";
      if (disposition && disposition.includes("filename=")) {
        filename = disposition.split("filename=")[1].replace(/"/g, "");
      }
      
      // 4. Convertir a File y subir a Cloudinary para adjuntar a la pareja
      toast.loading(`Adjuntando "${filename}" a la pareja...`, { id: toastId });
      const file = new File([excelBlob], filename, { type: "application/pdf" });
      const url = await subirACloudinary(file);
      
      const nuevo: ArchivoSubido = {
        id: uid(),
        nombre: filename,
        tipo: file.type,
        url,
        fechaSubida: new Date().toLocaleDateString("es-CO"),
        tamanioKb: Math.round(file.size / 1024),
        grupoId: arch.grupoId,
        grupoNombre: arch.grupoNombre,
      };
      
      onAgregar(nuevo);

      toast.success("Cuenta de Cobro generada y adjuntada a la pareja", { id: toastId });
    } catch (err: any) {
      toast.error(`Error generando cuenta de cobro: ${err.message}`, { id: toastId });
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {/* Lista de archivos subidos */}
      {archivos.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {archivos.map((arch) => (
            <div
              key={arch.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f8fafc",
                borderRadius: 10,
                padding: "7px 10px",
                border: "1px solid #e2e8f0",
              }}
            >
              {arch.tipo === "application/pdf" ? (
                <FileText
                  size={14}
                  style={{ color: "#ef4444", flexShrink: 0 }}
                />
              ) : arch.nombre.endsWith(".xls") || arch.nombre.endsWith(".xlsx") || arch.tipo.includes("excel") || arch.tipo.includes("spreadsheetml") ? (
                <FileSpreadsheet
                  size={14}
                  style={{ color: "#10b981", flexShrink: 0 }}
                />
              ) : (
                <ImageIcon
                  size={14}
                  style={{ color: "#3b82f6", flexShrink: 0 }}
                />
              )}
              <span
                style={{
                  fontSize: 11,
                  color: "#475569",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {arch.nombre}
              </span>
              <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>
                {formatKb(arch.tamanioKb)}
              </span>
              <button
                onClick={() => onVer(arch)}
                title="Ver archivo"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 2,
                  display: "flex",
                }}
              >
                <Eye size={14} />
              </button>
              <a
                href={obtenerUrlDescargaCloudinary(arch.url)}
                download={arch.nombre}
                target="_blank"
                rel="noopener noreferrer"
                title="Descargar archivo individual"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Download size={14} />
              </a>
              {tipoDoc.id === "DS" && arch.tipo === "application/pdf" && (
                <button
                  onClick={() => generarCuentaCobro(arch)}
                  title="Generar Cuenta de Cobro (PDF) y adjuntar a pareja"
                  style={{
                    background: "#10b981",
                    border: "none",
                    cursor: "pointer",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    marginLeft: 4,
                  }}
                >
                  <Wand2 size={12} /> Autocompletar
                </button>
              )}
              <button
                onClick={() => onEliminar(arch.id)}
                title="Eliminar"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ef4444",
                  padding: 2,
                  display: "flex",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Zona de drag & drop */}
      {!ocultarDropzone && (
        <motion.div
          whileHover={{ scale: 1.01, borderColor: tipoDoc.color }}
          whileTap={{ scale: 0.99 }}
          style={{
            border: `2px dashed ${drag ? tipoDoc.color : "#cbd5e1"}`,
            borderRadius: 12,
            padding: "16px 12px",
            background: drag ? `${tipoDoc.color}12` : "#fafbfc",
            cursor: cargando ? "wait" : "pointer",
            textAlign: "center",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            procesarArchivos(e.dataTransfer.files);
          }}
          onClick={() => !cargando && inputRef.current?.click()}
        >
          <Upload
            size={16}
            style={{ color: tipoDoc.color, margin: "0 auto 4px" }}
          />
          <p
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 600,
              margin: 0,
            }}
          >
            {cargando ? "Cargando..." : "Subir foto, PDF o Excel"}
          </p>
          <p style={{ fontSize: 10, color: "#94a3b8", margin: "2px 0 0" }}>
            Arrastra o haz clic · JPG, PNG, PDF, Excel
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.xls,.xlsx"
            style={{ display: "none" }}
            onChange={(e) => procesarArchivos(e.target.files)}
          />
        </motion.div>
      )}
    </div>
  );
}
