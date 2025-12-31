/**
 * MÁS ALLÁ DE LO SALVAJE - Lógica Principal
 * Sistema de Gestión de Expediciones y Asentamientos v2.0
 */

// Estado global de la aplicación
let estadoApp = {
    expedicion: null,           // { id, nombre, asentamientos[], fechaCreacion }
    asentamientoActual: null,   // Asentamiento activo para edición/vista
    asentamiento: null,         // Alias para compatibilidad con código existente
    pantalla: 'inicio'          // 'inicio' | 'expedicion' | 'lista' | 'crear' | 'hud'
};

// =====================================================
// GESTIÓN DE ASENTAMIENTOS
// =====================================================


/**
 * Crea un nuevo asentamiento con los datos proporcionados
 * @param {string} nombre - Nombre del asentamiento
 * @param {array} propiedades - Lista de propiedades del terreno
 * @param {array} peculiaridades - Lista de peculiaridades
 * @param {boolean} esPrimerAsentamiento - Si es el primer asentamiento de la expedición
 * @param {array} conexiones - Lista de IDs de asentamientos conectados
 * @param {array} edificios - Lista de edificios iniciales
 */
function crearAsentamiento(nombre, propiedades, peculiaridades, esPrimerAsentamiento = true, conexiones = [], edificios = []) {
    // Lógica diferenciada según si es primer asentamiento
    const doblones = esPrimerAsentamiento ? 50 : 0;
    const poblacionInicial = esPrimerAsentamiento
        ? [{ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 4 }]  // 4 cuotas = 80 colonos
        : [{ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 1 }]; // 1 cuota = 20 colonos

    const asentamiento = {
        id: Date.now(),
        nombre: nombre,
        grado: "Estamento",
        propiedades: propiedades || [],
        peculiaridades: peculiaridades || [],
        tributo: "Sin Tributo",
        edificios: edificios.length > 0 ? edificios : ["Manufactura"],
        poblacion: poblacionInicial,
        doblones: doblones,
        esPrimerAsentamiento: esPrimerAsentamiento,
        conexiones: conexiones || [], // Array de IDs
        fechaCreacion: new Date().toISOString()
    };

    return asentamiento;
}

// ... (keep existing buffer lines)

/**
 * Elimina un asentamiento de la expedición por ID
 */
function eliminarAsentamientoDeExpedicion(id) {
    if (!estadoApp.expedicion) {
        console.error('No hay expedición activa');
        return false;
    }

    // Convertir ID a número y filtrar de forma segura
    const idNum = Number(id);
    const inicialLength = estadoApp.expedicion.asentamientos.length;

    estadoApp.expedicion.asentamientos = estadoApp.expedicion.asentamientos.filter(a => a.id !== idNum);

    if (estadoApp.expedicion.asentamientos.length === inicialLength) {
        console.error('Asentamiento no encontrado para eliminar:', id);
        return false;
    }

    // Si era el asentamiento actual, limpiar
    if (estadoApp.asentamientoActual && estadoApp.asentamientoActual.id === idNum) {
        estadoApp.asentamientoActual = estadoApp.expedicion.asentamientos[0] || null;
        estadoApp.asentamiento = estadoApp.asentamientoActual;
    }

    // Guardar cambios
    guardarExpedicion();
    return true;
}

/**
 * Importa una expedición desde un objeto JSON
 */
function importarExpedicion(data) {
    try {
        if (!data || !data.expedicion || !Array.isArray(data.expedicion.asentamientos)) {
            throw new Error("Formato de archivo inválido");
        }

        estadoApp.expedicion = data.expedicion;

        // Restaurar estado
        if (estadoApp.expedicion.asentamientos.length > 0) {
            estadoApp.asentamientoActual = estadoApp.expedicion.asentamientos[0];
            estadoApp.asentamiento = estadoApp.asentamientoActual;
        } else {
            estadoApp.asentamientoActual = null;
            estadoApp.asentamiento = null;
        }

        guardarExpedicion();
        return true;
    } catch (e) {
        console.error("Error al importar:", e);
        return false;
    }
}

/**
 * Calcula todas las bonificaciones del bioma
 */
function calcularBonificaciones(propiedades, peculiaridades) {
    const bonificaciones = {};

    // Sumar efectos de propiedades
    propiedades.forEach(prop => {
        const data = PROPIEDADES[prop];
        if (data && data.efectos) {
            Object.entries(data.efectos).forEach(([stat, valor]) => {
                bonificaciones[stat] = (bonificaciones[stat] || 0) + valor;
            });
        }
    });

    // Sumar efectos de peculiaridades
    peculiaridades.forEach(pec => {
        const data = PECULIARIDADES[pec];
        if (data && data.efectos) {
            Object.entries(data.efectos).forEach(([stat, valor]) => {
                bonificaciones[stat] = (bonificaciones[stat] || 0) + valor;
            });
        }
    });

    return bonificaciones;
}


/**
 * Obtiene las estadísticas base del grado actual
 */
function obtenerEstadisticasGrado(grado) {
    return GRADOS[grado] || GRADOS["Estamento"];
}

/**
 * Calcula las estadísticas totales del asentamiento
 */
function calcularEstadisticasTotales(asentamiento) {
    const gradoStats = obtenerEstadisticasGrado(asentamiento.grado);
    const bonificaciones = calcularBonificaciones(
        asentamiento.propiedades,
        asentamiento.peculiaridades
    );
    const tributoData = TRIBUTOS[asentamiento.tributo];

    // Calcular efectos de edificios (Calidad, Almacenamiento, etc.)
    const efectosEdificios = calcularEfectosEdificios(asentamiento.edificios || []);

    // Calcular mantenimiento total de edificios (Pasando modificador de mantenimiento)
    const modMantenimiento = bonificaciones["Mantenimiento"] || 0;
    const mantenimientoTotal = calcularMantenimientoEdificios(asentamiento.edificios || [], modMantenimiento);

    return {
        grado: gradoStats,
        bonificaciones: bonificaciones,
        tributo: tributoData,
        efectosEdificios: efectosEdificios,
        mantenimientoEdificios: mantenimientoTotal,
        calidadTotal: gradoStats.calidad + (bonificaciones["Calidad"] || 0) + tributoData.calidad + (efectosEdificios.calidad || 0),
        almacenamientoBonus: efectosEdificios.almacenamiento || 0,
        ingresosDoblones: efectosEdificios.ingresos || 0
    };
}

/**
 * Calcula los efectos de todos los edificios construidos
 */
/**
 * Calcula los efectos de todos los edificios construidos
 */
function calcularEfectosEdificios(edificiosConstruidos) {
    const efectos = {
        calidad: 0,
        almacenamiento: 0,
        ingresos: 0,
        admin: 0
    };

    edificiosConstruidos.forEach(item => {
        const nombreEdificio = (typeof item === 'string') ? item : item.nombre;
        const edificio = EDIFICIOS[nombreEdificio];
        if (!edificio) return;

        // Determinar grado
        let grado = 1;
        if (typeof item === 'object' && item.grado) {
            grado = item.grado;
        } else if (estadoSimulacion?.edificiosEstado) {
            // Fallback para legacy strings o si estadoSimulacion tiene la info actualizada
            const id = (typeof item === 'string') ? item : item.id;
            const estado = estadoSimulacion.edificiosEstado[id] || estadoSimulacion.edificiosEstado[nombreEdificio];
            if (estado) grado = estado.grado;
        }

        // --- CALIDAD ---
        if (edificio.efectos && (edificio.efectos.Calidad || edificio.efectos.CalidadPorGrado)) {
            const base = edificio.efectos.Calidad || 0;
            const perGrado = edificio.efectos.CalidadPorGrado || 0;
            efectos.calidad += base + (perGrado * (grado - 1));
        } else if (edificio.datos) {
            // Legacy data
            const calidadBase = edificio.datos[3] || 0;
            const calidadInc = edificio.datos[4] || 0;
            if (nombreEdificio === "Ala Festiva") {
                efectos.calidad += calidadInc * grado;
            } else {
                efectos.calidad += calidadBase + (calidadInc * (grado - 1));
            }
        } else if (edificio.efectos && edificio.efectos.Calidad) {
            // Caso simple solo base
            efectos.calidad += edificio.efectos.Calidad;
        }

        // --- ALMACENAMIENTO ---
        if (edificio.almacenamiento) {
            // Si tiene propiedad directa
            efectos.almacenamiento += edificio.almacenamiento * grado; // Asumiendo lineal por grado si no se especifica
        } else if (edificio.datos) {
            const almBase = edificio.datos[1] || 0;
            const almInc = edificio.datos[2] || 0;
            efectos.almacenamiento += almBase + (grado * almInc);
        } else if (edificio.efectos && edificio.efectos.Almacenamiento) {
            efectos.almacenamiento += edificio.efectos.Almacenamiento; // Fixed value if simple effect
        }

        // --- INGRESOS ---
        if (edificio.datos) {
            const ingresoBase = edificio.datos[5] || 0;
            efectos.ingresos += ingresoBase;
        }

        // --- OTROS EFECTOS ---
        if (edificio.efectos) {
            if (edificio.efectos.CapacidadAdmin) efectos.admin += edificio.efectos.CapacidadAdmin;
        }
    });

    return efectos;
}

/**
 * Calcula el mantenimiento total de edificios
 */
function calcularMantenimientoEdificios(edificiosConstruidos, globalMaintenanceMod = 0) {
    let total = 0;

    edificiosConstruidos.forEach(item => {
        const nombre = (typeof item === 'string') ? item : item.nombre;
        const edificio = EDIFICIOS[nombre];
        if (!edificio) return;

        let base = 0;
        // V6 Data
        if (edificio.mantenimiento) {
            base = edificio.mantenimiento.Doblones || 0;
        }
        // Legacy
        else if (edificio.datos) {
            base = edificio.datos[0] || 0;
        } else if (edificio.maintenance) {
            base = edificio.maintenance;
        }

        let costo = base + globalMaintenanceMod;
        if (costo < 0) costo = 0;
        total += costo;
    });

    return total;
}

// =====================================================
// PERSISTENCIA (LocalStorage)
// =====================================================

const STORAGE_KEY = 'mas_alla_salvaje_data';
const EXPEDICION_KEY = 'mas_alla_salvaje_expedicion';

/**
 * Crea una nueva expedición
 */
function crearExpedicion(nombre) {
    const expedicion = {
        id: Date.now(),
        nombre: nombre,
        asentamientos: [],
        fechaCreacion: new Date().toISOString()
    };
    return expedicion;
}

/**
 * Agrega un asentamiento a la expedición actual
 */
function agregarAsentamientoExpedicion(asentamiento) {
    if (!estadoApp.expedicion) {
        console.error('No hay expedición activa');
        return false;
    }
    estadoApp.expedicion.asentamientos.push(asentamiento);
    // Actualizar alias para compatibilidad
    estadoApp.asentamiento = asentamiento;
    estadoApp.asentamientoActual = asentamiento;
    return true;
}

/**
 * Obtiene un asentamiento por ID
 */
function obtenerAsentamientoPorId(id) {
    if (!estadoApp.expedicion) return null;
    return estadoApp.expedicion.asentamientos.find(a => a.id === id);
}

/**
 * Obtiene el nombre del asentamiento conectado
 */
function obtenerNombreConexion(id) {
    if (!id) return null;
    const asentamiento = obtenerAsentamientoPorId(id);
    return asentamiento?.nombre || null;
}

/**
 * Guarda la expedición en localStorage
 */
function guardarExpedicion() {
    try {
        if (estadoApp.expedicion) {
            localStorage.setItem(EXPEDICION_KEY, JSON.stringify(estadoApp.expedicion));
            // También mantener compatibilidad con asentamiento individual
            if (estadoApp.asentamientoActual) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(estadoApp.asentamientoActual));
            }
        }
        return true;
    } catch (e) {
        console.error('Error al guardar expedición:', e);
        return false;
    }
}

/**
 * Carga la expedición desde localStorage
 */
function cargarExpedicion() {
    try {
        const data = localStorage.getItem(EXPEDICION_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error al cargar expedición:', e);
        return null;
    }
}

/**
 * Guarda el asentamiento en localStorage (compatibilidad)
 */
function guardarAsentamiento(asentamiento) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(asentamiento));
        return true;
    } catch (e) {
        console.error('Error al guardar:', e);
        return false;
    }
}

/**
 * Carga el asentamiento desde localStorage
 */
function cargarAsentamiento() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error al cargar:', e);
        return null;
    }
}

/**
 * Elimina la expedición guardada
 */
function eliminarExpedicion() {
    try {
        localStorage.removeItem(EXPEDICION_KEY);
        localStorage.removeItem(STORAGE_KEY);
        estadoApp.expedicion = null;
        estadoApp.asentamiento = null;
        estadoApp.asentamientoActual = null;
        return true;
    } catch (e) {
        console.error('Error al eliminar:', e);
        return false;
    }
}

/**
 * Elimina el asentamiento guardado (compatibilidad)
 */
function eliminarAsentamiento() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (e) {
        console.error('Error al eliminar:', e);
        return false;
    }
}

/**
 * Elimina un asentamiento de la expedición por ID
 */
function eliminarAsentamientoDeExpedicion(id) {
    if (!estadoApp.expedicion) {
        console.error('No hay expedición activa');
        return false;
    }

    const index = estadoApp.expedicion.asentamientos.findIndex(a => a.id === id || a.id === parseInt(id));
    if (index === -1) {
        console.error('Asentamiento no encontrado:', id);
        return false;
    }

    // Eliminar del array
    estadoApp.expedicion.asentamientos.splice(index, 1);

    // Si era el asentamiento actual, limpiar
    if (estadoApp.asentamientoActual && (estadoApp.asentamientoActual.id === id || estadoApp.asentamientoActual.id === parseInt(id))) {
        estadoApp.asentamientoActual = estadoApp.expedicion.asentamientos[0] || null;
        estadoApp.asentamiento = estadoApp.asentamientoActual;
    }

    // Guardar cambios
    guardarExpedicion();
    return true;
}

/**
 * Exporta la expedición a un archivo JSON descargable
 */
function exportarExpedicionAArchivo() {
    if (!estadoApp.expedicion) {
        alert('No hay expedición para guardar');
        return false;
    }

    try {
        // Crear objeto de exportación
        const exportData = {
            version: "2.0",
            exportDate: new Date().toISOString(),
            expedicion: estadoApp.expedicion
        };

        // Convertir a JSON formateado
        const jsonStr = JSON.stringify(exportData, null, 2);

        // Crear blob
        const blob = new Blob([jsonStr], { type: 'application/json' });

        // Crear nombre de archivo seguro
        const nombreArchivo = `expedicion_${estadoApp.expedicion.nombre.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/g, '_')}.json`;

        // Crear enlace de descarga
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;

        // Disparar descarga
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL
        URL.revokeObjectURL(url);

        return true;
    } catch (e) {
        console.error('Error al exportar:', e);
        alert('Error al exportar: ' + e.message);
        return false;
    }
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

/**
 * Oculta la pantalla de carga
 */
function ocultarPantallaCarga() {
    const loading = document.getElementById('loading-screen');
    if (loading) loading.remove();
}

/**
 * Inicializa la aplicación
 */
function inicializarApp() {
    // Intentar cargar expedición existente
    const expedicionGuardada = cargarExpedicion();

    if (expedicionGuardada) {
        estadoApp.expedicion = expedicionGuardada;

        // Si hay asentamientos, cargar el primero como actual
        if (expedicionGuardada.asentamientos && expedicionGuardada.asentamientos.length > 0) {
            estadoApp.asentamiento = expedicionGuardada.asentamientos[0];
            estadoApp.asentamientoActual = expedicionGuardada.asentamientos[0];

            // Cargar simulación si existe
            if (estadoApp.asentamientoActual.simulacion) {
                cargarEstadoSimulacion(estadoApp.asentamientoActual.simulacion);
            }
        }

        // Ir a lista de asentamientos
        estadoApp.pantalla = 'lista';
    } else {
        // Fallback: intentar cargar asentamiento individual (migración)
        const asentamientoGuardado = cargarAsentamiento();

        if (asentamientoGuardado) {
            // Migrar asentamiento individual a expedición
            const expedicion = crearExpedicion("Mi Expedición");
            expedicion.asentamientos.push(asentamientoGuardado);
            estadoApp.expedicion = expedicion;
            estadoApp.asentamiento = asentamientoGuardado;
            estadoApp.asentamientoActual = asentamientoGuardado;

            if (asentamientoGuardado.simulacion) {
                cargarEstadoSimulacion(asentamientoGuardado.simulacion);
            }

            // Guardar como expedición
            guardarExpedicion();
            estadoApp.pantalla = 'lista';
        } else {
            estadoApp.pantalla = 'inicio';
        }
    }

    // Renderizar pantalla inicial
    renderizarPantalla();
    ocultarPantallaCarga();
}

// Inicializar input de archivo oculto
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'input-importar';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', manejarImportacionArchivo);
    document.body.appendChild(fileInput);

    // Inicializar app
    inicializarApp();
});

// ... (keep existing renderizarInicio)

/**
 * Maneja la selección de archivo para importar
 */
function manejarImportacionArchivo(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (importarExpedicion(data)) {
                mostrarNotificacion('✅ Expedición cargada correctamente');
                estadoApp.pantalla = 'lista';
                renderizarPantalla();
            } else {
                mostrarNotificacion('❌ El archivo no es válido', 'error');
            }
        } catch (error) {
            console.error('Error parseando JSON:', error);
            mostrarNotificacion('❌ Error al leer el archivo', 'error');
        }
        // Limpiar input para permitir recargar mismo archivo
        event.target.value = '';
    };
    reader.readAsText(file);
}

/**
 * Abre el selector de archivos
 */
function abrirImportarExpedicion() {
    document.getElementById('input-importar')?.click();
}
