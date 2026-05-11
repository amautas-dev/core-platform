import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { firstValueFrom } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import {
  ListaPrecio,
  ProductoListaPrecio,
  ZonaListaPrecio,
} from '../../domain/models/lista-precio.interface';
import { Zona } from '../../domain/models/zona.interface';
import { ProductoResumen } from '../../domain/models/producto.interface';

@Injectable({ providedIn: 'root' })
export class AdminListasPreciosService extends BaseDataService<ListaPrecio> {
  protected entityName = 'ListaPrecio';
  protected override db = inject(DbService);

  /**
   * Obtiene todas las listas de precios ordenadas por nombre.
   */
  getListas() {
    return this.getAll({
      orderBy: [{ field: 'nombreLista', dir: 'asc' }],
    });
  }

  /**
   * Obtiene todas las zonas (usa ZonaDataService sería mejor, pero mantenemos compatibilidad).
   */
  getZonas() {
    return this.db.list<Zona>('Zona');
  }

  /**
   * Obtiene todos los productos con sus relaciones (Marca, Categoria).
   */
  getProductos() {
    return this.db.listFull<any>('Producto', {
      joins: ['Marca', 'Categoria', 'SubCategoria'],
      orderBy: [{ field: 'nombreProducto', dir: 'asc' }],
    });
  }

  /**
   * Obtiene los precios de productos por lista.
   */
  getPreciosPorLista(idListaPrecio: number) {
    return this.db.list<ProductoListaPrecio>('ProductoListaPrecio', {
      filters: [{ field: 'idListaPrecio', op: 'eq', value: idListaPrecio }],
    });
  }

  /**
   * Crea una nueva lista de precios.
   */
  createLista() {
    return this.createEntity({
      nombreLista: 'Nueva lista',
      esActivo: 1,
    });
  }

  /**
   * Crea una nueva lista de precios con el nombre especificado.
   */
  createListaConNombre(nombreLista: string) {
    return this.createEntity({
      nombreLista: nombreLista,
      esActivo: 1,
    });
  }

  /**
   * Activa una lista de precios.
   */
  activateLista(id: number) {
    return this.updateEntity(id, { esActivo: 1 });
  }

  /**
   * Desactiva una lista de precios.
   */
  deactivateLista(id: number) {
    return this.updateEntity(id, { esActivo: 0 });
  }

  /**
   * Actualiza el nombre de una lista de precios.
   */
  updateNombreLista(id: number, nombreLista: string) {
    return this.updateEntity(id, { nombreLista });
  }

  /**
   * Obtiene las zonas asociadas a una lista de precios.
   */
  getZonasPorLista(idListaPrecio: number) {
    return this.db.list<ZonaListaPrecio>('ZonaListaPrecio', {
      filters: [{ field: 'idListaPrecio', op: 'eq', value: idListaPrecio }],
    });
  }

  /**
   * Obtiene la lista de precios activa para una zona.
   * Verifica que tanto la relación ZonaListaPrecio como la ListaPrecio estén activas.
   * Retorna undefined si la zona no tiene ninguna lista activa.
   */
  async getListaActivaPorZona(idZona: number): Promise<{ idListaPrecio: number; nombreLista: string } | undefined> {
    console.log('🔍 [getListaActivaPorZona] Buscando lista activa para zona:', idZona);
    
    // Primero verificar si hay alguna relación (activa o inactiva) para diagnóstico
    const todasLasRelaciones = await firstValueFrom(
      this.db.listFull<ZonaListaPrecio>('ZonaListaPrecio', {
        filters: [
          { field: 'idZona', op: 'eq', value: idZona },
        ],
      })
    );
    console.log('📋 [getListaActivaPorZona] Todas las relaciones (activas e inactivas):', todasLasRelaciones.length, todasLasRelaciones);
    
    // Buscar relaciones activas
    const relaciones = await firstValueFrom(
      this.db.list<ZonaListaPrecio>('ZonaListaPrecio', {
        filters: [
          { field: 'idZona', op: 'eq', value: idZona },
          { field: 'esActivo', op: 'eq', value: 1 },
        ],
      })
    );

    console.log('📋 [getListaActivaPorZona] Relaciones encontradas (activas):', relaciones.length, relaciones);

    if (relaciones.length === 0) {
      console.log('❌ [getListaActivaPorZona] No se encontraron relaciones activas');
      if (todasLasRelaciones.length > 0) {
        console.log('⚠️ [getListaActivaPorZona] PERO hay relaciones inactivas:', todasLasRelaciones.map(r => ({ 
          id: r.idZonaListaPrecio, 
          idListaPrecio: r.idListaPrecio, 
          esActivo: r.esActivo,
          tipo: typeof r.esActivo
        })));
        // Si hay relaciones pero están inactivas, verificar si la lista está activa
        // Si la lista está activa pero la relación no, podríamos considerar activarla automáticamente
        // o al menos dar un mensaje más específico
        const relacionInactiva = todasLasRelaciones[0];
        console.log('🔎 [getListaActivaPorZona] Intentando obtener lista desde relación inactiva:', relacionInactiva.idListaPrecio);
        const listasInactivas = await firstValueFrom(
          this.db.listFull<ListaPrecio>('ListaPrecio', {
            filters: [
              { field: 'idListaPrecio', op: 'eq', value: relacionInactiva.idListaPrecio },
            ],
          })
        );
        if (listasInactivas.length > 0) {
          const listaEncontrada = listasInactivas[0];
          const esActivoLista = typeof listaEncontrada.esActivo === 'string' ? parseInt(listaEncontrada.esActivo) : listaEncontrada.esActivo;
          console.log('📦 [getListaActivaPorZona] Lista encontrada desde relación inactiva:', {
            nombreLista: listaEncontrada.nombreLista,
            esActivo: listaEncontrada.esActivo,
            esActivoLista: esActivoLista,
            relacionEsActivo: relacionInactiva.esActivo
          });
          
          // Si la lista está activa pero la relación no, la relación es el problema
          if (esActivoLista === 1) {
            console.log('⚠️ [getListaActivaPorZona] La lista está activa pero la relación ZonaListaPrecio está inactiva');
          }
        }
      }
      return undefined;
    }

    // Obtener la lista de precios usando listFull para asegurar que obtenemos el registro aunque esté inactivo
    // Luego verificaremos manualmente si está activa
    console.log('🔎 [getListaActivaPorZona] Obteniendo lista con id:', relaciones[0].idListaPrecio);
    const listas = await firstValueFrom(
      this.db.listFull<ListaPrecio>('ListaPrecio', {
        filters: [
          { field: 'idListaPrecio', op: 'eq', value: relaciones[0].idListaPrecio },
        ],
      })
    );

    console.log('📦 [getListaActivaPorZona] Listas obtenidas:', listas.length, listas);
    if (listas.length > 0) {
      console.log('📦 [getListaActivaPorZona] Detalles de la lista:', {
        idListaPrecio: listas[0].idListaPrecio,
        nombreLista: listas[0].nombreLista,
        esActivo: listas[0].esActivo,
        tipo: typeof listas[0].esActivo
      });
    }

    if (listas.length === 0) {
      console.log('❌ [getListaActivaPorZona] No se encontró la lista');
      return undefined;
    }

    const lista = listas[0];

    // Verificar que la lista de precios esté activa
    // Manejar tanto número como string (por si viene como string desde la BD)
    const esActivo = typeof lista.esActivo === 'string' ? parseInt(lista.esActivo) : lista.esActivo;
    if (esActivo === 0) {
      console.log('❌ [getListaActivaPorZona] La lista de precios no está activa:', lista.nombreLista, 'esActivo:', lista.esActivo, 'tipo:', typeof lista.esActivo);
      return undefined;
    }

    const resultado = {
      idListaPrecio: lista.idListaPrecio,
      nombreLista: lista.nombreLista,
    };
    console.log('✅ [getListaActivaPorZona] Retornando:', resultado);
    return resultado;
  }

  /**
   * Obtiene cualquier lista de precios asignada a una zona (activa o inactiva).
   * Retorna undefined si la zona no tiene ninguna lista asignada.
   */
  async getListaPorZona(idZona: number): Promise<{ idListaPrecio: number; nombreLista: string; esActivo: 0 | 1 } | undefined> {
    console.log('🔍 [getListaPorZona] Buscando cualquier lista (activa o inactiva) para zona:', idZona);
    
    const relaciones = await firstValueFrom(
      this.db.list<ZonaListaPrecio>('ZonaListaPrecio', {
        filters: [
          { field: 'idZona', op: 'eq', value: idZona },
        ],
        includeInactive: true,
      })
    );

    console.log('📋 [getListaPorZona] Relaciones encontradas (todas):', relaciones.length, relaciones);

    if (relaciones.length === 0) {
      console.log('❌ [getListaPorZona] No se encontraron relaciones');
      return undefined;
    }

    // Obtener la lista de precios
    console.log('🔎 [getListaPorZona] Obteniendo lista con id:', relaciones[0].idListaPrecio);
    const lista = await firstValueFrom(
      this.getById(relaciones[0].idListaPrecio)
    );

    console.log('📦 [getListaPorZona] Lista obtenida:', lista);

    if (!lista) {
      console.log('❌ [getListaPorZona] No se encontró la lista');
      return undefined;
    }

    const resultado = {
      idListaPrecio: lista.idListaPrecio,
      nombreLista: lista.nombreLista,
      esActivo: relaciones[0].esActivo,
    };
    console.log('✅ [getListaPorZona] Retornando:', resultado);
    return resultado;
  }

  /**
   * Desactiva la relación entre una zona y una lista de precios.
   */
  async desactivarListaDeZona(idZona: number, idListaPrecio: number): Promise<void> {
    const relaciones = await firstValueFrom(
      this.db.list<ZonaListaPrecio>('ZonaListaPrecio', {
        filters: [
          { field: 'idZona', op: 'eq', value: idZona },
          { field: 'idListaPrecio', op: 'eq', value: idListaPrecio },
        ],
        includeInactive: true,
      })
    );

    if (relaciones.length > 0) {
      const relacion = relaciones[0];
      await firstValueFrom(
        this.db.update('ZonaListaPrecio', relacion.idZonaListaPrecio, { esActivo: 0 }, false)
      );
    }
  }

  async syncZonas(idLista: number, zonas: number[]) {
    const nuevos = zonas.map((idZona) => ({
      idZona,
      idListaPrecio: idLista,
      esActivo: 1, // Asegurar que las relaciones se creen como activas
    }));

    return firstValueFrom(
      this.db.syncSmart(
        'ZonaListaPrecio', // tabla relacionada
        'idListaPrecio', // campo FK padre
        idLista, // valor del padre
        nuevos, // registros nuevos
        'idZona' // campo único por fila
      )
    );
  }

  async saveProductoListaPrecio(data: {
    idProductoListaPrecio?: number;
    idListaPrecio: number;
    idProducto: number;
    precio: number | null;
    precioPromo: number | null;
    stockPromo: number;
  }): Promise<number> {
    // Si viene el ID, actualizar directamente
    if (data.idProductoListaPrecio) {
      const updatePayload = {
        precio: data.precio ?? null,
        precioPromo: data.precioPromo ?? null,
        stockPromo: data.stockPromo ?? 0,
      };
      
      await firstValueFrom(this.db.update('ProductoListaPrecio', data.idProductoListaPrecio, updatePayload, false));
      return data.idProductoListaPrecio;
    }

    // Si no viene ID, buscar si existe un registro
    const existing = await firstValueFrom(
      this.db.list<any>('ProductoListaPrecio', {
        filters: [
          { field: 'idListaPrecio', op: 'eq', value: data.idListaPrecio },
          { field: 'idProducto', op: 'eq', value: data.idProducto },
          { field: 'esActivo', op: 'eq', value: 1 },
        ],
      })
    );

    if (existing.length > 0) {
      const id = existing[0].idProductoListaPrecio;
      
      // UPDATE: solo campos modificables
      const updatePayload = {
        precio: data.precio ?? null,
        precioPromo: data.precioPromo ?? null,
        stockPromo: data.stockPromo ?? 0,
      };
      
      await firstValueFrom(this.db.update('ProductoListaPrecio', id, updatePayload, false));
      return id;
    }

    // CREATE: incluir todos los campos necesarios
    const createPayload = {
      idListaPrecio: data.idListaPrecio,
      idProducto: data.idProducto,
      precio: data.precio ?? null,
      precioPromo: data.precioPromo ?? null,
      stockPromo: data.stockPromo ?? 0,
    };
    
    const created = await firstValueFrom(this.db.create('ProductoListaPrecio', createPayload));
    return (created as any)?.idProductoListaPrecio || (created as any)?.id || 0;
  }

  /**
   * Genera el nombre para una lista duplicada según la lógica:
   * - "Lista A" -> "Lista A duplicado1"
   * - "Lista A" (otra vez) -> "Lista A duplicado2"
   * - "Lista A duplicado1" -> "Lista A duplicado1 duplicado1"
   */
  private generarNombreDuplicado(nombreOriginal: string, todasLasListas: ListaPrecio[]): string {
    // Si el nombre ya termina con " duplicado" seguido de un número, agregar " duplicado1" al final
    const regexDuplicado = /^(.+?)(\s+duplicado\d+)+$/;
    const match = nombreOriginal.match(regexDuplicado);
    
    if (match) {
      // Ya tiene "duplicado" al final, agregar " duplicado1" al final
      return `${nombreOriginal} duplicado1`;
    }

    // Si no tiene "duplicado", buscar el siguiente número disponible
    // Buscar todas las listas que empiecen con el nombre original + " duplicado"
    const baseNombre = nombreOriginal;
    let numero = 1;
    let nombreCandidato = `${baseNombre} duplicado${numero}`;
    
    // Verificar si ya existe una lista con ese nombre
    while (todasLasListas.some(l => l.nombreLista === nombreCandidato)) {
      numero++;
      nombreCandidato = `${baseNombre} duplicado${numero}`;
    }
    
    return nombreCandidato;
  }

  /**
   * Duplica una lista de precios
   * @param idListaOriginal ID de la lista a duplicar
   * @param incluirPrecios Si true, también copia los precios de productos (solo activos)
   * @returns Observable con la nueva lista creada
   */
  async duplicarLista(idListaOriginal: number, incluirPrecios: boolean = false): Promise<ListaPrecio> {
    // Obtener todas las listas para generar el nombre
    const todasLasListas = await firstValueFrom(this.getListas());
    
    // Obtener la lista original
    const listaOriginal = await firstValueFrom(this.getById(idListaOriginal));
    
    if (!listaOriginal) {
      throw new Error('Lista de precios no encontrada');
    }

    // Generar nombre duplicado
    const nuevoNombre = this.generarNombreDuplicado(listaOriginal.nombreLista, todasLasListas);

    // Crear la nueva lista
    const resultado = await firstValueFrom(
      this.createEntity({
        nombreLista: nuevoNombre,
        esActivo: 1,
        esDefault: 0,
        fechaInicio: null,
        fechaFin: null,
      })
    );

    // createEntity puede devolver el ID (number) o el objeto completo (ListaPrecio)
    let nuevaLista: ListaPrecio;
    if (typeof resultado === 'number') {
      // Si devuelve solo el ID, construir el objeto con el nombre que ya tenemos
      nuevaLista = {
        idListaPrecio: resultado,
        nombreLista: nuevoNombre,
        esActivo: 1,
        esDefault: 0,
        fechaInicio: null,
        fechaFin: null,
      };
    } else {
      // Si devuelve el objeto completo, asegurarse de que tenga el nombre correcto
      nuevaLista = {
        ...resultado,
        nombreLista: nuevoNombre, // Asegurar que el nombre sea el correcto
      };
    }

    if (!nuevaLista || !nuevaLista.idListaPrecio) {
      throw new Error('No se pudo crear la lista duplicada');
    }

    // Si se deben incluir precios, copiar los ProductoListaPrecio activos
    if (incluirPrecios && nuevaLista.idListaPrecio) {
      const preciosOriginales = await firstValueFrom(
        this.db.list<ProductoListaPrecio>('ProductoListaPrecio', {
          filters: [
            { field: 'idListaPrecio', op: 'eq', value: idListaOriginal },
            { field: 'esActivo', op: 'eq', value: 1 },
          ],
        })
      );

      // Crear los precios duplicados
      for (const precio of preciosOriginales) {
        await firstValueFrom(
          this.db.create('ProductoListaPrecio', {
            idListaPrecio: nuevaLista.idListaPrecio,
            idProducto: precio.idProducto,
            precio: precio.precio ?? null,
            precioPromo: precio.precioPromo ?? null,
            stockPromo: precio.stockPromo ?? null,
            fechaPromoDesde: precio.fechaPromoDesde ?? null,
            fechaActualizaPrecio: null, // Nueva fecha de actualización
            esActivo: 1,
          })
        );
      }
    }

    return nuevaLista;
  }
}
