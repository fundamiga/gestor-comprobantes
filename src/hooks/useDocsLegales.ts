"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { uid } from "@/lib/utils";

// ── Categorías de documentos legales ──────────────────────────────────────────
export const CATEGORIAS_LEGALES = [
  { id: "legislacion",    label: "Legislación",         emoji: "📜", color: "#1a73e8", desc: "Leyes, decretos y normas aplicables" },
  { id: "contratos",      label: "Contratos",           emoji: "📋", color: "#0d9488", desc: "Contratos vigentes y firmados" },
  { id: "estatutos",      label: "Estatutos",           emoji: "🏛️", color: "#7c3aed", desc: "Estatutos y reglamentos internos" },
  { id: "resoluciones",   label: "Resoluciones",        emoji: "⚖️", color: "#dc2626", desc: "Resoluciones y actos administrativos" },
  { id: "certificados",   label: "Certificados",        emoji: "🎖️", color: "#d97706", desc: "Certificados de existencia, RUT, etc." },
  { id: "otros",          label: "Otros",               emoji: "📁", color: "#64748b", desc: "Otros documentos legales" },
];

export interface DocLegal {
  id: string;
  nombre: string;
  categoria: string;
  url: string;
  tipo: string;           // MIME type
  tamanioKb: number;
  descripcion?: string;
  fechaSubida: string;
  fechaVigencia?: string; // Fecha hasta la que es válido
}

export function useDocsLegales() {
  const [docs, setDocs] = useState<DocLegal[]>([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("docs_legales")
        .select("*")
        .order("fecha_subida", { ascending: false });
      if (!error && data) {
        setDocs(data.map((r) => ({
          id: r.id,
          nombre: r.nombre,
          categoria: r.categoria,
          url: r.url,
          tipo: r.tipo,
          tamanioKb: r.tamanio_kb,
          descripcion: r.descripcion,
          fechaSubida: r.fecha_subida,
          fechaVigencia: r.fecha_vigencia,
        })));
      }
      setCargado(true);
    }
    cargar();
  }, []);

  const agregarDoc = useCallback(async (doc: DocLegal) => {
    setDocs((prev) => [doc, ...prev]);
    await supabase.from("docs_legales").insert({
      id: doc.id,
      nombre: doc.nombre,
      categoria: doc.categoria,
      url: doc.url,
      tipo: doc.tipo,
      tamanio_kb: doc.tamanioKb,
      descripcion: doc.descripcion || null,
      fecha_subida: doc.fechaSubida,
      fecha_vigencia: doc.fechaVigencia || null,
    });
  }, []);

  const eliminarDoc = useCallback(async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("docs_legales").delete().eq("id", id);
  }, []);

  return { docs, cargado, agregarDoc, eliminarDoc };
}
