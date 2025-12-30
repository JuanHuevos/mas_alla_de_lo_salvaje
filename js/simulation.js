/**
 * MÁS ALLÁ DE LO SALVAJE - Motor de Simulación por Turnos
 * Sistema de extracción de recursos, población y ciclo económico
 */

// =====================================================
// ESTADO DE SIMULACIÓN
// =====================================================
let estadoSimulacion = {
    turno: 0,
    // Cuotas de población: [{ id, rol, naturaleza, medidas, asignacion }]
    poblacion: [],
    // Almacén: { "Madera Útil": 0, ... }
    almacen: {},
    // Economía
    doblones: 0,
    alimentos: 0,
    // Inmigración latente (medidas acumuladas antes de formar cuotas)
    inmigracionPendiente: 0,
    // Recursos especiales (no ocupan almacén)
    recursosEspeciales: {
        ideas: 0,
        influencia: 0
    },
    // Estado de edificios: { nombreEdificio: { grado, cuotasAsignadas, recetaActual } }
    edificiosEstado: {},
    // Log del último turno
    logTurno: []
};

/**
 * Carga un estado de simulación existente
 */
function cargarEstadoSimulacion(estadoGuardado) {
    if (estadoGuardado) {
        estadoSimulacion = { ...estadoGuardado };
        // Asegurar que poblacion sea una copia profunda si es necesario, 
        // pero por ahora el shallow copy de nivel 1 basta si no mutamos arrays internos anidados de forma rara.
        // Mejor hacer copia de objetos internos clave:
        if (estadoGuardado.poblacion) {
            estadoSimulacion.poblacion = JSON.parse(JSON.stringify(estadoGuardado.poblacion));
        }
        if (estadoGuardado.almacen) {
            estadoSimulacion.almacen = { ...estadoGuardado.almacen };
        }
    }
}

// =====================================================
// INICIALIZACIÓN DE POBLACIÓN
// =====================================================

/**
 * Crea la población inicial del asentamiento
 * @param {Array} configuracion - [{rol: "Plebeyo", naturaleza: "Neutral", cantidad: 2}, ...]
 */
function inicializarPoblacion(configuracion) {
    estadoSimulacion.poblacion = [];
    let idCounter = 1;

    configuracion.forEach(config => {
        for (let i = 0; i < config.cantidad; i++) {
            estadoSimulacion.poblacion.push({
                id: idCounter++,
                rol: config.rol,
                naturaleza: config.naturaleza,
                medidas: CONVERSION.CUOTA_POBLACION, // 20 colonos por cuota
                asignacion: null // Recurso al que está asignado
            });
        }
    });

    return estadoSimulacion.poblacion;
}

/**
 * Obtiene el total de población en medidas
 */
function obtenerPoblacionTotal() {
    return estadoSimulacion.poblacion.reduce((sum, cuota) => sum + cuota.medidas, 0);
}

/**
 * Obtiene el total de cuotas de un rol específico
 */
function obtenerCuotasPorRol(rol) {
    return estadoSimulacion.poblacion.filter(c => c.rol === rol);
}

// =====================================================
// ASIGNACIÓN DE TRABAJO
// =====================================================

/**
 * Asigna una cuota de población a trabajar un recurso
 * @param {number} cuotaId - ID de la cuota
 * @param {string|null} recurso - Nombre del recurso o null para desasignar
 */
function asignarTrabajo(cuotaId, recurso) {
    const cuota = estadoSimulacion.poblacion.find(c => c.id === cuotaId);
    if (cuota) {
        cuota.asignacion = recurso;
        return true;
    }
    return false;
}

/**
 * Obtiene las cuotas asignadas a un recurso
 */
function obtenerTrabajadoresRecurso(recurso) {
    return estadoSimulacion.poblacion.filter(c => c.asignacion === recurso);
}

// =====================================================
// CÁLCULO DE EXTRACCIÓN
// =====================================================

/**
 * Calcula la producción pasiva de un recurso (sin trabajadores asignados)
 * Fórmula: (Mod_Abundancia + Mod_Propiedades) - 1
 * Si el resultado es < 0, la producción es 0.
 */
function calcularExtraccionPasiva(recurso, abundancia, modPropiedades) {
    // Obtener modificador de abundancia (-2, 0, +1, +2, etc)
    // Nota: Necesitamos acceder a obtenerModificadorAbundancia desde data.js
    // Si no está global, usamos el objeto directamente
    const modAbundancia = NIVELES_ABUNDANCIA[abundancia]?.modificador ?? 0;

    // Formula: (ModAbundancia + ModBioma) - 1
    const produccion = (modAbundancia + modPropiedades) - 1;

    return Math.max(0, produccion);
}

/**
 * Calcula la producción activa de un recurso (con trabajadores asignados)
 * Fórmula: Mod_Abundancia + Mod_Propiedades + NumTrabajadores + 2 + Calidad/5
 * (No se multiplica por 10, el resultado son Medidas directas)
 */
function calcularExtraccionActiva(recurso, abundancia, modPropiedades, calidad, numTrabajadores) {
    const modAbundancia = NIVELES_ABUNDANCIA[abundancia]?.modificador ?? 0;

    // (-1 de base pasiva se quita, en su lugar se suma +2 por ser activa)
    // +1 por cada cuota trabajando (numTrabajadores)
    // + Calidad / 5

    const base = modAbundancia + modPropiedades + numTrabajadores + 2 + (calidad / 5);

    const produccionTotal = Math.floor(base);

    return Math.max(0, produccionTotal);
}

/**
 * Calcula la producción total de todos los recursos
 * @param {object} recursos - { nombreRecurso: { abundancia, modPropiedades } }
 * @param {number} calidad - Calidad total del asentamiento
 */
function calcularProduccionTotal(recursos, calidad) {
    const produccion = {};

    Object.entries(recursos).forEach(([nombre, data]) => {
        const trabajadores = obtenerTrabajadoresRecurso(nombre);
        const numTrabajadores = trabajadores.length;

        if (numTrabajadores > 0) {
            produccion[nombre] = {
                tipo: "activa",
                medidas: calcularExtraccionActiva(nombre, data.abundancia, data.modPropiedades || 0, calidad, numTrabajadores),
                trabajadores: numTrabajadores
            };
        } else {
            produccion[nombre] = {
                tipo: "pasiva",
                medidas: calcularExtraccionPasiva(nombre, data.abundancia, data.modPropiedades || 0),
                trabajadores: 0
            };
        }
    });

    return produccion;
}

/**
 * Asigna una cuota de población a un recurso específico
 */
function asignarPoblacionARecurso(idCuota, nombreRecurso) {
    const cuota = estadoSimulacion.poblacion.find(c => c.id === parseInt(idCuota));
    if (cuota) {
        cuota.asignacion = nombreRecurso;
        return true;
    }
    return false;
}

// =====================================================
// CICLO DE TURNO
// =====================================================

/**
 * Ejecuta un turno completo (3 fases)
 */
function ejecutarTurno(asentamiento) {
    estadoSimulacion.logTurno = [];
    estadoSimulacion.turno++;

    logear(`═══ TURNO ${estadoSimulacion.turno} ═══`);

    // Fase 1: Sustento
    const resultadoSustento = faseAlimentacion();

    // Fase 2: Economía
    const resultadoEconomia = faseEconomia(asentamiento);

    // Fase 3: Crecimiento
    const resultadoCrecimiento = faseCrecimiento(asentamiento);

    return {
        turno: estadoSimulacion.turno,
        sustento: resultadoSustento,
        economia: resultadoEconomia,
        crecimiento: resultadoCrecimiento,
        log: estadoSimulacion.logTurno
    };
}

/**
 * Fase 1: Alimentación
 * Cada Cuota completa consume 1 medida de alimento
 */
function faseAlimentacion() {
    logear("📍 Fase 1: Sustento");

    // Calcular número de cuotas completas (cada cuota consume 1 medida)
    // Si tenemos una cuota parcial se redondea hacia abajo para consumo (o consumo proporcional, pero usuario pidió "1 Medida por Cuota")
    // Usaremos cuotas.length DIRECTAMENTE porque estadoSimulacion.poblacion es un array de Cuotas.
    // OJO: estadoSimulacion.poblacion son objetos cuota.

    const numCuotas = estadoSimulacion.poblacion.length;
    const alimentosNecesarios = numCuotas; // 1 medida por cuota

    // Sumar todos los recursos categorizados como "Alimento"
    let poolAlimentos = 0;
    const recursosAlmacen = Object.entries(estadoSimulacion.almacen || {});

    recursosAlmacen.forEach(([nombre, cantidad]) => {
        if (RECURSOS[nombre]?.categoria === "Alimento") {
            poolAlimentos += cantidad;
        }
    });

    let hambruna = false;
    let consumido = 0;

    if (poolAlimentos >= alimentosNecesarios) {
        // Consumir proporcionalmente o secuencialmente
        // Secuencial es más sencillo y predecible
        let restante = alimentosNecesarios;

        // Orden de preferencia: "Alimento" genérico primero, luego el resto
        const listaAlimentos = recursosAlmacen
            .filter(([n]) => RECURSOS[n]?.categoria === "Alimento")
            .sort((a, b) => (a[0] === "Alimento" ? -1 : 1));

        for (const [nombre, cantidad] of listaAlimentos) {
            if (restante <= 0) break;
            const aConsumir = Math.min(cantidad, restante);
            estadoSimulacion.almacen[nombre] -= aConsumir;
            restante -= aConsumir;
            consumido += aConsumir;
        }

        logear(`  ✓ Alimentados: ${numCuotas} cuotas (${consumido} medidas)`);
    } else {
        // Consumir todo lo que hay
        recursosAlmacen.forEach(([nombre, cantidad]) => {
            if (RECURSOS[nombre]?.categoria === "Alimento") {
                estadoSimulacion.almacen[nombre] = 0;
                consumido += cantidad;
            }
        });

        hambruna = true;
        logear(`  ⚠️ HAMBRUNA: Solo ${consumido}/${alimentosNecesarios} medidas disponibles`);

        // En hambruna: muertes aleatorias (1d4)
        const muertes = Math.floor(Math.random() * 4) + 1;
        aplicarMuertes(muertes);
        logear(`  💀 Muertes por hambruna: ${muertes}`);
    }

    return { hambruna, consumido, necesarios: alimentosNecesarios };
}

/**
 * Fase 2: Economía
 * Producción, tributos, mantenimiento
 */
function faseEconomia(asentamiento) {
    logear("📍 Fase 2: Economía");

    // Calcular calidad total
    const stats = calcularEstadisticasTotales(asentamiento);
    const calidad = stats.calidadTotal;

    // Producción de recursos
    const produccion = calcularProduccionTotal(asentamiento.recursos || {}, calidad);

    // Sumar al almacén
    let totalProducido = 0;
    Object.entries(produccion).forEach(([recurso, data]) => {
        if (data.medidas > 0) {
            estadoSimulacion.almacen[recurso] = (estadoSimulacion.almacen[recurso] || 0) + data.medidas;
            totalProducido += data.medidas;
        }
    });

    // Sumar producción de Edificios al almacén
    const produccionEdificios = calcularProduccionEdificios(asentamiento.edificios || [], stats);

    Object.entries(produccionEdificios).forEach(([recurso, data]) => {
        // Handle positive production
        if (data.total > 0) {
            estadoSimulacion.almacen[recurso] = (estadoSimulacion.almacen[recurso] || 0) + data.total;
            totalProducido += data.total;
        }
        // Handle consumption (negative total)
        else if (data.total < 0) {
            // Ensure we don't go below zero
            // (Strictly speaking, we should have checked availability BEFORE this phase, 
            // but for now we deduct what we can or go to zero?)
            // The simulation loop calculated consumption based on *potential*, we should deduct it.
            // If storage goes negative, we clamp to 0 (loss of efficiency was not simulated yet).
            estadoSimulacion.almacen[recurso] = (estadoSimulacion.almacen[recurso] || 0) + data.total;
            if (estadoSimulacion.almacen[recurso] < 0) {
                // Log shortage?
                logear(`  ⚠️ Escasez de insumos: ${recurso}`);
                estadoSimulacion.almacen[recurso] = 0;
            }
        }
    });

    logear(`  📦 Producción total: ${totalProducido} medidas`);

    // Tributos
    const cuotasPoblacion = estadoSimulacion.poblacion.length;
    const tributoData = TRIBUTOS[asentamiento.tributo] || TRIBUTOS["Sin Tributo"];
    const dobleonesTributo = cuotasPoblacion * tributoData.doblones;
    estadoSimulacion.doblones += dobleonesTributo;

    if (dobleonesTributo > 0) {
        logear(`  💰 Tributos recaudados: ${dobleonesTributo} doblones`);
    }

    // --- MANTENIMIENTO EDIFICIOS ---
    let mantDoblones = 0;
    let mantRecursos = {};
    const edificiosList = asentamiento.edificios || [];

    // Obtener modificador global de Mantenimiento desde las stats (Bioma/Propiedades)
    // Nota: "stats" ya se calculó arriba en línea 304
    const modMantenimientoGlobal = stats.bonificaciones["Mantenimiento"] || 0;

    edificiosList.forEach(item => {
        const nombre = (typeof item === 'string') ? item : item.nombre;
        const itemInstancia = (typeof item === 'object') ? item : null;

        // Obtener estado real (grado)
        let grado = 1;
        if (itemInstancia && itemInstancia.id && estadoSimulacion.edificiosEstado[itemInstancia.id]) {
            grado = estadoSimulacion.edificiosEstado[itemInstancia.id].grado || 1;
        }

        const edificio = EDIFICIOS[nombre];
        if (!edificio) return;

        // Mantenimiento Base (V6 uses edificio.mantenimiento.Doblones)
        let baseDoblones = 0;

        if (edificio.mantenimiento) {
            baseDoblones = edificio.mantenimiento.Doblones || 0;
            // Si hay otros recursos de mantenimiento, sumarlos a mantRecursos
            Object.entries(edificio.mantenimiento).forEach(([k, v]) => {
                if (k !== 'Doblones') mantRecursos[k] = (mantRecursos[k] || 0) + v;
            });
        }
        // Legacy support
        else if (edificio.maintenance) {
            baseDoblones = edificio.maintenance;
        }

        // Aplicar Modificador Global al Mantenimiento en Doblones de ESTE edificio
        // "Que el Mantenimiento en Stats_Invertidas se le sume al valor del Mantenimiento de cualquier edificio."
        let costeFinal = baseDoblones + modMantenimientoGlobal;

        // Evitar costes negativos (¿o permitimos descuentos que den dinero? Asumimos coste >= 0)
        if (costeFinal < 0) costeFinal = 0;

        mantDoblones += costeFinal;
    });

    if (mantDoblones > 0) {
        estadoSimulacion.doblones -= mantDoblones;
        logear(`  💸 Mantenimiento pagado: ${mantDoblones} Doblones`);
        // Handle Debt? Simple for now.
    }

    // Deduct Resource Maintenance
    Object.entries(mantRecursos).forEach(([k, v]) => {
        // Maintenance Logic
        if (estadoSimulacion.almacen[k] && estadoSimulacion.almacen[k] >= v) {
            estadoSimulacion.almacen[k] -= v;
            if (estadoSimulacion.almacen[k] <= 0) delete estadoSimulacion.almacen[k];
            logear(`  💸 Mantenimiento pagado: ${v} ${k}`);
        } else {
            // Not enough maintenance resources?
            logear(`  ⚠️ Falta mantenimiento: ${v} ${k}`);
        }
    });

    return { produccion, tributos: dobleonesTributo, mantenimiento: mantDoblones };
}

/**
 * Fase 3: Crecimiento poblacional
 */
function faseCrecimiento(asentamiento) {
    logear("📍 Fase 3: Crecimiento");

    const stats = calcularEstadisticasTotales(asentamiento);
    const calidad = stats.calidadTotal;
    const gradoData = GRADOS[asentamiento.grado];

    // Inmigración latente
    let inmigracion = gradoData.inmigracion + calidad;

    // Bono por monstruos
    estadoSimulacion.poblacion.forEach(cuota => {
        const naturaleza = NATURALEZAS_POBLACION[cuota.naturaleza];
        if (naturaleza) {
            inmigracion += naturaleza.bonoInmigracion;
        }
    });

    // Reproducción natural: +1 medida por cuota de Plebeyo
    const plebeyos = obtenerCuotasPorRol("Plebeyo");
    const reproduccion = plebeyos.length;

    const totalCrecimiento = Math.max(0, inmigracion) + reproduccion;
    estadoSimulacion.inmigracionPendiente += totalCrecimiento;

    logear(`  👥 Inmigración: +${inmigracion}, Reproducción: +${reproduccion}`);

    // Consolidar: cada 20 medidas = 1 nueva cuota de Plebeyo
    let nuevasCuotas = 0;
    while (estadoSimulacion.inmigracionPendiente >= CONVERSION.CUOTA_POBLACION) {
        estadoSimulacion.inmigracionPendiente -= CONVERSION.CUOTA_POBLACION;

        // Crear nueva cuota de Plebeyo Neutral
        const maxId = Math.max(...estadoSimulacion.poblacion.map(c => c.id), 0);
        estadoSimulacion.poblacion.push({
            id: maxId + 1,
            rol: "Plebeyo",
            naturaleza: "Neutral",
            medidas: CONVERSION.CUOTA_POBLACION,
            asignacion: null
        });
        nuevasCuotas++;
    }

    if (nuevasCuotas > 0) {
        logear(`  🎉 Nuevas cuotas formadas: ${nuevasCuotas}`);
    }

    logear(`  📊 Pendiente consolidación: ${estadoSimulacion.inmigracionPendiente}/${CONVERSION.CUOTA_POBLACION}`);

    return { inmigracion, reproduccion, nuevasCuotas };
}

// =====================================================
// HELPERS
// =====================================================

function logear(mensaje) {
    estadoSimulacion.logTurno.push(mensaje);
    console.log(mensaje);
}

function aplicarMuertes(cantidad) {
    // Quitar medidas de las cuotas existentes
    let restantes = cantidad;

    for (const cuota of estadoSimulacion.poblacion) {
        if (restantes <= 0) break;

        const quitar = Math.min(restantes, cuota.medidas);
        cuota.medidas -= quitar;
        restantes -= quitar;
    }

    // Eliminar cuotas vacías
    estadoSimulacion.poblacion = estadoSimulacion.poblacion.filter(c => c.medidas > 0);
}

/**
 * Obtiene un resumen del estado actual
 */
function obtenerResumenEstado() {
    return {
        turno: estadoSimulacion.turno,
        poblacionTotal: obtenerPoblacionTotal(),
        cuotas: estadoSimulacion.poblacion.length,
        doblones: estadoSimulacion.doblones,
        alimentos: estadoSimulacion.alimentos,
        almacen: { ...estadoSimulacion.almacen },
        inmigracionPendiente: estadoSimulacion.inmigracionPendiente
    };
}

/**
 * Resetea el estado de simulación
 */
function resetearSimulacion() {
    estadoSimulacion = {
        turno: 0,
        poblacion: [],
        almacen: {},
        doblones: 0,
        inmigracionPendiente: 0,
        recursosEspeciales: {
            ideas: 0,
            influencia: 0
        },
        edificiosEstado: {},
        logTurno: []
    };
}

// =====================================================
// FUNCIONES DE EDIFICIOS v4
// =====================================================

// =====================================================
// FUNCIONES DE EDIFICIOS v3 & SIMULACIÓN
// =====================================================

/**
 * Calcula la capacidad de cuotas asignables de un edificio
 * Prioriza propiedades V3 (reqCitizen), fallback a datos V4
 */
function calcularCapacidadEdificio(nombreEdificio, grado = 1) {
    const edificio = EDIFICIOS[nombreEdificio];
    if (!edificio) return 0;

    // Lógica V3
    if (edificio.reqCitizen !== undefined) {
        return edificio.reqCitizen;
    }
    if (edificio.citizenEffect && edificio.citizenEffect.capacidad) {
        // Si es un efecto global (e.g. Zona Residencial), ¿cuenta como capacidad DE TRABAJO para este edificio?
        // Zona Residencial aumenta el límite de población GLOBAL, no asigna trabajadores a sí misma (normalmente).
        // Pero si el usuario puede asignar gente a la Zona Residencial (ej. Mantenimiento?), entonces sí.
        // Asumiremos que si hay citizenEffect.capacidad, esa es la capacidad.
        return edificio.citizenEffect.capacidad;
    }

    // V6 Logic (New Data Structure)
    if (edificio.capacidad) {
        let cap = edificio.capacidad.base || 0;
        if (edificio.capacidad.porGrado) {
            cap += (grado - 1) * edificio.capacidad.porGrado;
        }
        return cap;
    }

    // Legacy V4 Fallback (datos array)
    if (edificio.datos) {
        const capBase = edificio.datos[8] || 0;
        const capInc = edificio.datos[9] || 0;
        return capBase + (grado - 1) * capInc;
    }

    return 0;
}

/**
 * Obtiene el recurso producido, considerando receta activa
 */
function obtenerRecursoEdificio(nombreEdificio, receta = null) {
    const edificio = EDIFICIOS[nombreEdificio];
    if (!edificio) return null;

    // Si tiene receta asignada, el output de la receta manda
    if (receta && receta.output && receta.output.Recurso) {
        return receta.output.Recurso; // E.g. "Suministros"
    } else if (receta && receta.output && typeof receta.output === 'object') {
        // Caso complejo
        return "Procesados";
    }

    // V6 Support
    if (edificio.produccionTrabajo) {
        if (edificio.produccionTrabajo.recurso) return edificio.produccionTrabajo.recurso;
        if (edificio.produccionTrabajo.tipo === 'Transformacion' && edificio.produccionTrabajo.output) return edificio.produccionTrabajo.output;
        if (edificio.produccionTrabajo.tipo === 'Procesado') return "Procesados";
    }

    // Producción Base V3
    if (edificio.produccionBase) {
        return Object.keys(edificio.produccionBase)[0];
    }

    // Fallback Etiqueta V4
    if (edificio.etiqueta) {
        const mapeo = {
            "Alimento": "Alimento", "Ideas": "Ideas", "Aceros": "Acero",
            "Herramientas": "Herramientas", "Metales/Sal": "Metales",
            "Pesca": "Pesca", "Soldados": "Soldados", "Guarnición": "Guarnición",
            "Devoción": "Devoción", "Magia/Arc": "Magia", "Artilugios": "Artilugios"
        };
        return mapeo[edificio.etiqueta] || null;
    }

    return null;
}

/**
 * Calcula la producción total de todos los edificios
 * Soporta Recetas V3, Producción Base y Modificadores (Agricola, Calidad)
 */
function calcularProduccionEdificios(edificiosConstruidos, stats = null) {
    const produccion = {};
    const bonificaciones = stats ? stats.bonificaciones : {};
    const calidad = stats ? stats.calidadTotal : 0;

    // Safety check: ensure edificiosEstado exists
    if (!estadoSimulacion.edificiosEstado) {
        estadoSimulacion.edificiosEstado = {};
    }

    // 1. Mapear asignaciones por TIPO de edificio (UI based) y por INSTANCIA
    const cuotasPorEdificio = {};
    const cuotasPorId = {};

    if (estadoSimulacion.poblacion) {
        estadoSimulacion.poblacion.forEach(c => {
            if (c.asignacion) {
                if (c.asignacion.startsWith('edificio:')) {
                    const nombreEdificio = c.asignacion.substring(9);
                    cuotasPorEdificio[nombreEdificio] = (cuotasPorEdificio[nombreEdificio] || 0) + 1;
                } else if (c.asignacion.startsWith('edificio_id:')) {
                    const id = c.asignacion.substring(12);
                    cuotasPorId[id] = (cuotasPorId[id] || 0) + 1;
                }
            }
        });
    }

    // 2. Calcular producción - Distribución Secuencial
    edificiosConstruidos.forEach(item => {
        const nombreEdificio = (typeof item === 'string') ? item : item.nombre;
        const instanciaId = (typeof item === 'object') ? item.id : null;
        const recetaInstancia = (typeof item === 'object') ? item.receta : null;

        const stateKey = instanciaId || nombreEdificio;

        // Inicializar estado
        if (!estadoSimulacion.edificiosEstado[stateKey]) {
            estadoSimulacion.edificiosEstado[stateKey] = { grado: 1 };
        }
        const estado = estadoSimulacion.edificiosEstado[stateKey];

        // Sincronizar receta
        if (recetaInstancia) {
            estado.recetaActual = recetaInstancia;
        }

        // Distribución de Trabajadores:
        // Prioridad 1: Asignados específicamente a esta ID
        // Prioridad 2: Asignados genéricamente al Tipo (rellenando huecos)
        const capacidad = calcularCapacidadEdificio(nombreEdificio, estado.grado || 1);

        let asignadosEspecificos = 0;
        if (instanciaId && cuotasPorId[instanciaId]) {
            asignadosEspecificos = cuotasPorId[instanciaId];
        }

        let asignadosGenericos = 0;
        if (cuotasPorEdificio[nombreEdificio]) {
            // Tomar del pool genérico lo que quepa
            const hueco = Math.max(0, capacidad - asignadosEspecificos);
            const tomar = Math.min(cuotasPorEdificio[nombreEdificio], hueco);
            asignadosGenericos = tomar;

            // Restar del pool global
            cuotasPorEdificio[nombreEdificio] -= tomar;
        }

        const cuotasEfectivas = Math.min(asignadosEspecificos + asignadosGenericos, capacidad);


        estado.cuotasAsignadas = cuotasEfectivas;

        if (cuotasEfectivas <= 0) return;

        const edificioDef = EDIFICIOS[nombreEdificio];
        let recurso = null;
        let cantidad = 0;
        let receta = null;

        // Modificadores específicos (Cultivo Agrícola)
        let modifier = 0;
        if (nombreEdificio === "Cultivo Agrícola") {
            const modAgricola = bonificaciones["Producción Agrícola"] || 0;
            const modCalidad = Math.floor(calidad / 5);
            modifier = modAgricola + modCalidad;
        }

        // Determinar Receta o Producción Base
        // Determinar Receta o Producción Base
        let recetaKey = recetaInstancia || estado.recetaActual;
        let opcionKey = null;

        if (recetaKey && recetaKey.includes(':')) {
            const parts = recetaKey.split(':');
            recetaKey = parts[0];
            opcionKey = parts[1];
        }

        if (recetaKey && typeof RECETAS_MANUFACTURA !== 'undefined') {
            for (const cat of Object.values(RECETAS_MANUFACTURA)) {
                if (cat[recetaKey]) {
                    receta = cat[recetaKey];
                    break;
                }
            }
        }

        if (receta) {
            // Handle complex recipes with options
            let inputData = receta.input;
            let outputData = receta.output;

            if (opcionKey && receta[opcionKey]) {
                const subReceta = receta[opcionKey];
                inputData = subReceta.input;
                outputData = subReceta.output;
            } else if (!inputData && !outputData && (receta.opcion_a || receta.opcion_b)) {
                // Default fallback
                const subReceta = receta.opcion_a;
                inputData = subReceta.input;
                outputData = subReceta.output;
            }

            // Producción por Receta (V6: Procesado or Legacy)
            const qtyPerQuota = (outputData?.Cantidad || 10);
            const outputQty = qtyPerQuota * cuotasEfectivas;
            recurso = outputData?.Recurso || "Procesados";
            cantidad = outputQty;

            // Registrar consumo de inputs
            if (inputData) {
                Object.entries(inputData).forEach(([inputRes, inputQty]) => {
                    const consumoTotal = inputQty * cuotasEfectivas;
                    produccion[inputRes] = produccion[inputRes] || { total: 0, fuentes: [] };
                    produccion[inputRes].total -= consumoTotal;
                    produccion[inputRes].fuentes.push({
                        edificio: `${nombreEdificio} (Insumo)`,
                        cuotas: cuotasEfectivas,
                        produccion: -consumoTotal
                    });
                });
            }
        }
        // V6 Logic: Producción Trabajo
        else if (edificioDef.produccionTrabajo) {
            const pt = edificioDef.produccionTrabajo;
            // Caso 1: Recurso Directo
            if (pt.recurso && pt.cantidad) {
                recurso = pt.recurso;
                // Check conditions
                if (pt.condicion === 'per_5_pop') {
                    const totalPop = estadoSimulacion.poblacion.length || 0;
                    const base = Math.floor(totalPop / 5);
                    cantidad = base * cuotasEfectivas;
                } else {
                    cantidad = pt.cantidad * cuotasEfectivas;
                }
            }
            // Caso 2: Transformacion (Soldados)
            else if (pt.tipo === 'Transformacion' && pt.output === 'Soldados') {
                recurso = "Soldados";
                cantidad = (pt.cantidad || 0) * cuotasEfectivas;
            }
            // Caso 3: Regional (Placeholder - needs selection logic, defaulting to first Biome resource if possible)
            else if (pt.tipo === 'Regional') {
                // Try to find first biome resource
                // This requires accessing biome data. Simplified fallback:
                recurso = "Material Regional";
                cantidad = (pt.cantidad || 1) * cuotasEfectivas;
            }
        }
        // Legacy V3
        else if (edificioDef.produccionBase) {
            const [resBase, cantBase] = Object.entries(edificioDef.produccionBase)[0];
            recurso = resBase;
            cantidad = cantBase * cuotasEfectivas;
        }

        if (recurso) {
            if (modifier !== 0 && recurso === "Alimento" && nombreEdificio === "Cultivo Agrícola") {
                // Apply modifier per effective quota? User said "Modify total produced value by quantity of Crops".
                // If Modifier is +3, and we have 2 crops.
                // If we apply +3 per crop -> Total +6. Matches user phrasing.
                // We apply it per building instance (which this loop is).
                // However, is it per building or per WORKER?
                // Usually buildings produce X per worker. If I add modifier to 'cantidad', assuming 'cantidad' is TOTAL for this building.
                // 'cantidad' calculated below is "base * cuotasEfectivas".
                // So we add "modifier * cuotasEfectivas"? Or just "modifier"?
                // "Modificador... modifique el valor producido total".
                // Usually +1 Production means +1 per building.
                // If I have 1 building with 3 workers, does it produce +1 or +3?
                // Standard 4X: +1 per building.
                // Let's assume +Modifier per Building Instance (if active).
                if (cuotasEfectivas > 0) {
                    cantidad += modifier;
                }
            }

            produccion[recurso] = produccion[recurso] || { total: 0, fuentes: [] };
            produccion[recurso].total += cantidad;
            produccion[recurso].fuentes.push({
                edificio: nombreEdificio,
                cuotas: cuotasEfectivas,
                produccion: cantidad
            });
        }
    });

    return produccion;
}

/**
 * Fase 3: Crecimiento poblacional
 * Modificado: Tasa de natalidad depende del Balance de Alimentos > 0
 */
function faseCrecimiento(asentamiento, balanceAlimentosLastTurn) {
    logear("📍 Fase 3: Crecimiento");

    const stats = calcularEstadisticasTotales(asentamiento);
    const calidad = stats.calidadTotal;
    const gradoData = GRADOS[asentamiento.grado];

    // Inmigración latente
    let inmigracion = gradoData.inmigracion + calidad;
    estadoSimulacion.poblacion.forEach(cuota => {
        const naturaleza = NATURALEZAS_POBLACION[cuota.naturaleza];
        if (naturaleza) inmigracion += naturaleza.bonoInmigracion;
    });

    // Reproducción natural
    // REGLA: "si Balance de Alimentos es mayor a 0, entonces tenemos Tasa de Natalidad. En caso contrario esta es 0."
    let reproduccion = 0;

    // Balance > 0 significa que sobró comida (Producción > Consumo)
    // O que NO hubo hambruna y se produjo excedente?
    // Usaremos el balance neto (Producido - Consumido) o el stock?
    // "Balance de Alimentos" suele ser producción neta por turno.
    if (balanceAlimentosLastTurn > 0) {
        const plebeyos = obtenerCuotasPorRol("Plebeyo");
        reproduccion = plebeyos.length; // 1 medida por cuota de Plebeyo
        logear(`  👶 Tasa de Natalidad activa (Balance Alimentos > 0).`);
    } else {
        logear(`  ⚠️ Sin crecimiento natural (Balance Alimentos <= 0).`);
    }

    const totalCrecimiento = Math.max(0, inmigracion) + reproduccion;
    estadoSimulacion.inmigracionPendiente += totalCrecimiento;

    logear(`  👥 Inmigración: +${inmigracion}, Reproducción: +${reproduccion}`);

    // Consolidar
    let nuevasCuotas = 0;
    while (estadoSimulacion.inmigracionPendiente >= CONVERSION.CUOTA_POBLACION) {
        estadoSimulacion.inmigracionPendiente -= CONVERSION.CUOTA_POBLACION;
        const maxId = Math.max(...estadoSimulacion.poblacion.map(c => c.id), 0);
        estadoSimulacion.poblacion.push({
            id: maxId + 1, rol: "Plebeyo", naturaleza: "Neutral",
            medidas: CONVERSION.CUOTA_POBLACION, asignacion: null
        });
        nuevasCuotas++;
    }

    // Log final
    if (nuevasCuotas > 0) logear(`  🎉 Nuevas cuotas formadas: ${nuevasCuotas}`);

    return { inmigracion, reproduccion, nuevasCuotas };
}

/**
 * Ejecuta un turno completo (3 fases)
 */
function ejecutarTurno(asentamiento) {
    estadoSimulacion.logTurno = [];
    estadoSimulacion.turno++;

    logear(`═══ TURNO ${estadoSimulacion.turno} ═══`);

    // Fase 1: Sustento (Consumo)
    const resultadoSustento = faseAlimentacion(); // Retorna { consumido }

    // Fase 2: Economía (Producción)
    const resultadoEconomia = faseEconomia(asentamiento); // Retorna { produccion, tributos }

    // Calcular Balance de Alimentos del turno
    // Producción de Alimento - Consumo Realizado
    const prodAlimentos = resultadoEconomia.produccion["Alimento"]?.medidas || 0;
    const consAlimentos = resultadoSustento.consumido || 0;
    const balanceAlimentos = prodAlimentos - consAlimentos;

    // Fase 3: Crecimiento
    const resultadoCrecimiento = faseCrecimiento(asentamiento, balanceAlimentos);

    return {
        turno: estadoSimulacion.turno,
        sustento: resultadoSustento,
        economia: resultadoEconomia,
        crecimiento: resultadoCrecimiento,
        log: estadoSimulacion.logTurno
    };
}

// Export for verification/tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        estadoSimulacion,
        resetearSimulacion,
        cargarEstadoSimulacion,
        inicializarPoblacion,
        ejecutarTurno,
        faseEconomia,
        faseAlimentacion,
        faseCrecimiento,
        calcularProduccionTotal,
        calcularProduccionEdificios,
        calcularEstadisticasTotales,
        asignarTrabajo
    };
}
