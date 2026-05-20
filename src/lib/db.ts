import Dexie, { type EntityTable } from 'dexie';
import type { Periodo } from '@/types';

// La interfaz ArchivoContenido guarda solo el base64 pesado para no saturar los Periodos
export interface ArchivoContenido {
  id: string; // El mismo id que el ArchivoSubido
  dataUrl: string;
}

const db = new Dexie('FundamigaDB') as Dexie & {
  periodos: EntityTable<Periodo, 'id'>;
  archivos_contenido: EntityTable<ArchivoContenido, 'id'>;
};

// Declaramos las tablas. 
// Para periodos, 'id' es la primary key, e indexamos mes y anio.
// Para archivos_contenido, 'id' es la primary key.
db.version(1).stores({
  periodos: 'id, mes, anio',
  archivos_contenido: 'id'
});

export { db };
