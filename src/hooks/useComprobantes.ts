"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Periodo, Lote, ArchivoSubido } from "@/types";
import { uid } from "@/lib/utils";

export function useComprobantes() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [cargado, setCargado] = useState(false);

  // ── Cargar períodos al montar ──────────────────────────────────────────────
  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("periodos")
        .select("*")
        .order("anio", { ascending: false })
        .order("mes", { ascending: false });

      if (!error && data) {
        // Supabase devuelve lotes como JSONB, puede venir como string o arreglo
        const parsed: Periodo[] = data.map((row) => ({
          ...row,
          lotes: Array.isArray(row.lotes) ? row.lotes : JSON.parse(row.lotes || "[]"),
        }));
        setPeriodos(parsed);
      }
      setCargado(true);
    }
    cargar();
  }, []);

  // ── Helper para sincronizar un período completo en Supabase ───────────────
  const syncPeriodo = useCallback(async (periodo: Periodo) => {
    const { error } = await supabase
      .from("periodos")
      .upsert({ id: periodo.id, mes: periodo.mes, anio: periodo.anio, lotes: periodo.lotes });
    if (error) console.error("Error guardando período:", error.message);
  }, []);

  // ── Períodos ──────────────────────────────────────────────────────────────
  const crearPeriodo = useCallback(
    async (mes: number, anio: number): Promise<Periodo> => {
      const existente = periodos.find((p) => p.mes === mes && p.anio === anio);
      if (existente) return existente;

      const nuevo: Periodo = { id: uid(), mes, anio, lotes: [] };
      await syncPeriodo(nuevo);
      setPeriodos((prev) =>
        [...prev, nuevo].sort((a, b) => b.anio - a.anio || b.mes - a.mes)
      );
      return nuevo;
    },
    [periodos, syncPeriodo]
  );

  const eliminarPeriodo = useCallback(
    async (periodoId: string) => {
      await supabase.from("periodos").delete().eq("id", periodoId);
      setPeriodos((prev) => prev.filter((p) => p.id !== periodoId));
    },
    []
  );

  // ── Lotes ─────────────────────────────────────────────────────────────────
  const crearLote = useCallback(
    async (
      periodoId: string,
      datos: Pick<Lote, "proveedor" | "referencia" | "tipoPago">
    ) => {
      const nuevo: Lote = {
        id: uid(),
        ...datos,
        fechaCreacion: new Date().toLocaleDateString("es-CO"),
        documentos: {},
      };

      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          const actualizado = { ...p, lotes: [...p.lotes, nuevo] };
          syncPeriodo(actualizado);
          return actualizado;
        });
        return next;
      });

      return nuevo;
    },
    [syncPeriodo]
  );

  const eliminarLote = useCallback(
    async (periodoId: string, loteId: string) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          const actualizado = { ...p, lotes: p.lotes.filter((l) => l.id !== loteId) };
          syncPeriodo(actualizado);
          return actualizado;
        });
        return next;
      });
    },
    [syncPeriodo]
  );

  // ── Archivos ──────────────────────────────────────────────────────────────
  const agregarArchivo = useCallback(
    async (periodoId: string, loteId: string, tipoId: string, archivo: ArchivoSubido) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          const lotes = p.lotes.map((l) => {
            if (l.id !== loteId) return l;
            const prevArchivos = l.documentos[tipoId] ?? [];
            return {
              ...l,
              documentos: { ...l.documentos, [tipoId]: [...prevArchivos, archivo] },
            };
          });
          const actualizado = { ...p, lotes };
          syncPeriodo(actualizado);
          return actualizado;
        });
        return next;
      });
    },
    [syncPeriodo]
  );

  const eliminarArchivo = useCallback(
    async (periodoId: string, loteId: string, tipoId: string, archivoId: string) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          const lotes = p.lotes.map((l) => {
            if (l.id !== loteId) return l;
            return {
              ...l,
              documentos: {
                ...l.documentos,
                [tipoId]: (l.documentos[tipoId] ?? []).filter((a) => a.id !== archivoId),
              },
            };
          });
          const actualizado = { ...p, lotes };
          syncPeriodo(actualizado);
          return actualizado;
        });
        return next;
      });
    },
    [syncPeriodo]
  );

  const actualizarArchivosDoc = useCallback(
    async (periodoId: string, loteId: string, tipoId: string, nuevosArchivos: ArchivoSubido[]) => {
      setPeriodos((prev) => {
        const next = prev.map((p) => {
          if (p.id !== periodoId) return p;
          const lotes = p.lotes.map((l) => {
            if (l.id !== loteId) return l;
            return {
              ...l,
              documentos: {
                ...l.documentos,
                [tipoId]: nuevosArchivos,
              },
            };
          });
          const actualizado = { ...p, lotes };
          syncPeriodo(actualizado);
          return actualizado;
        });
        return next;
      });
    },
    [syncPeriodo]
  );

  return {
    periodos,
    cargado,
    crearPeriodo,
    eliminarPeriodo,
    crearLote,
    eliminarLote,
    agregarArchivo,
    eliminarArchivo,
    actualizarArchivosDoc,
  };
}
