/**
 * MÁS ALLÁ DE LO SALVAJE - Controladores de Interfaz v2.0
 * Sistema de Gestión de Asentamientos con Herencia de Biomas
 */

// Estado temporal para el wizard de creación
let wizardState = {
  paso: 1,
  nombre: '',
  imagenPersonalizada: null, // URL o base64 de imagen personalizada
  // Sistema de biomas
  tiradaD12: null,
  esBiomaEspecial: false,
  biomaBase: null,
  biomaEspecial: null,
  subBioma: null,
  tiradaSubBioma: null,
  biomaFusionado: null,
  // Propiedades (automáticas del bioma + manuales)
  propiedades: [],
  peculiaridades: [],
  peculiaridadFija: null,
  // Recursos con niveles de abundancia
  recursos: {}, // { nombreRecurso: { abundancia: "Normal", tirada: 5, esGarantizado: false, esExotico: false } }
  influenciaMagica: "Baja",
  // Población inicial (4 cuotas = 80 colonos)
  poblacion: [
    { rol: "Plebeyo", naturaleza: "Neutral", cantidad: 4 }
  ]
};

let pestanaActiva = 'resumen';


// =====================================================
// FUNCIONES DE COLOR INTELIGENTE
// =====================================================

function obtenerClaseColor(statName, valor) {
  if (valor === 0) return 'neutro';
  const esInvertida = esStatInvertida(statName);
  if (esInvertida) {
    return valor > 0 ? 'negativo' : 'positivo';
  } else {
    return valor > 0 ? 'positivo' : 'negativo';
  }
}

function formatearValor(valor) {
  if (valor === 0) return '0';
  return valor > 0 ? `+${valor}` : `${valor}`;
}

function obtenerClaseAbundancia(nivel) {
  switch (nivel) {
    case "Inexistente": return "inexistente";
    case "Escaso": return "escaso";
    case "Normal": return "normal";
    case "Abundante": return "abundante";
    case "Exuberante": return "exuberante";
    default: return "normal";
  }
}

// =====================================================
// CONTROL DE TURNOS
// =====================================================

// CONTROL DE TURNOS
// =====================================================

function btnPasarTurno() {
  // Get current settlement
  const asentamientoActual = obtenerAsentamientoActual();
  if (!asentamientoActual) {
    mostrarNotificacion('No hay asentamiento seleccionado', 'error');
    return;
  }

  // Execute the turn
  const resultado = ejecutarTurno(asentamientoActual);

  // Update settlement simulation state
  asentamientoActual.simulacion = JSON.parse(JSON.stringify(estadoSimulacion));

  // Save expedition
  guardarExpedicion();

  // Show notification
  mostrarNotificacion(`Turno ${resultado.turno} completado`, 'success');

  // Re-render UI
  renderizarPantalla();
}

function btnDeshacerTurno() {
  if (deshacerTurno()) {
    // Update settlement simulation state
    const asentamientoActual = obtenerAsentamientoActual();
    if (asentamientoActual) {
      asentamientoActual.simulacion = JSON.parse(JSON.stringify(estadoSimulacion));
      guardarExpedicion();
    }

    mostrarNotificacion('Turno deshecho', 'info');
    renderizarPantalla();
  } else {
    mostrarNotificacion('No hay turnos para deshacer', 'warning');
  }
}

function obtenerAsentamientoActual() {
  if (!estadoApp.asentamientoActual || !estadoApp.expedicion || !estadoApp.expedicion.asentamientos) {
    return null;
  }

  // asentamientoActual can be either the object itself or just an ID
  const ref = estadoApp.asentamientoActual;

  // If it's already an object with an id, return it directly (or find it in the array)
  if (typeof ref === 'object' && ref.id !== undefined) {
    return estadoApp.expedicion.asentamientos.find(a => a.id === ref.id) || ref;
  }

  // If it's just an ID, find the matching settlement
  return estadoApp.expedicion.asentamientos.find(a => a.id === ref);
}

// RENDERIZADO DE PANTALLAS
// =====================================================

function renderizarPantalla() {
  const container = document.getElementById('app-container');

  switch (estadoApp.pantalla) {
    case 'inicio':
      renderizarInicio(container);
      break;
    case 'expedicion':
      renderizarNombreExpedicion(container);
      break;
    case 'lista':
      renderizarListaAsentamientos(container);
      break;
    case 'crear':
      renderizarCreador(container);
      break;
    case 'hud':
      renderizarHUD(container);
      break;
    default:
      renderizarInicio(container);
  }
}

function actualizarHUD() {
  // Wrapper to refresh the current screen, assuming it's the HUD
  renderizarPantalla();
}

/**
 * Pantalla de inicio - Bienvenida
 */
function renderizarInicio(container) {
  container.innerHTML = `
    <div class="pantalla-inicio">
      <div class="titulo-principal">
        <div class="logo-icono">⚔️</div>
        <h1>Más Allá de lo Salvaje</h1>
        <p class="subtitulo">Sistema de Gestión de Expediciones</p>
      </div>
      
      <div class="menu-principal">
        <button class="btn-principal" onclick="iniciarNuevaExpedicion()">
          <span class="btn-icono">🗺️</span>
          <span class="btn-texto">Nueva Expedición</span>
        </button>
        
        ${estadoApp.expedicion ? `
          <button class="btn-secundario" onclick="continuarExpedicion()">
            <span class="btn-icono">📜</span>
            <span class="btn-texto">Continuar: ${estadoApp.expedicion.nombre}</span>
          </button>
        ` : ''}
        
        <button class="btn-secundario" onclick="abrirImportarExpedicion()">
          <span class="btn-icono">📂</span>
          <span class="btn-texto">Cargar Expedición</span>
        </button>
      </div>
      
      <div class="footer-info">
        <p>Gestiona tu expedición y asentamientos</p>
      </div>
    </div>
  `;
}

/**
 * Pantalla para nombrar la expedición
 */
function renderizarNombreExpedicion(container) {
  container.innerHTML = `
    <div class="pantalla-inicio">
      <div class="titulo-principal">
        <div class="logo-icono">🗺️</div>
        <h1>Nueva Expedición</h1>
        <p class="subtitulo">Dale un nombre a tu aventura</p>
      </div>
      
      <div class="input-grupo expedicion-input">
        <input 
          type="text" 
          id="input-expedicion" 
          class="input-nombre" 
          placeholder="Nombre de la Expedición"
          autofocus
          onkeydown="if(event.key === 'Enter') confirmarExpedicion()"
        />
      </div>
      
      <div class="menu-principal">
        <button class="btn-principal" onclick="confirmarExpedicion()">
          <span class="btn-icono">✨</span>
          <span class="btn-texto">Comenzar Expedición</span>
        </button>
        
        <button class="btn-secundario" onclick="volverInicio()">
          <span class="btn-icono">←</span>
          <span class="btn-texto">Volver</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Pantalla de lista de asentamientos
 */
function renderizarListaAsentamientos(container) {
  const expedicion = estadoApp.expedicion;
  const asentamientos = expedicion?.asentamientos || [];
  const pestanaActiva = estadoApp.pestanaExpedicion || 'asentamientos';

  container.innerHTML = `
    <div class="pantalla-lista">
      <header class="lista-header">
        <div class="lista-titulo">
          <button class="btn-volver-mini" onclick="volverInicio()">←</button>
          <div>
            <h1>🗺️ ${expedicion?.nombre || 'Expedición'}</h1>
            <p class="lista-subtitulo">${asentamientos.length} asentamiento${asentamientos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div class="lista-acciones">
          <button class="btn-guardar-expedicion" onclick="guardarExpedicionUI()">
            💾 Guardar
          </button>
          <button class="btn-crear-asentamiento" onclick="iniciarCreacionAsentamiento()">
            ➕ Crear Asentamiento
          </button>
        </div>
      </header>
      
      <!-- Pestañas de Expedición -->
      <nav class="expedicion-tabs">
        <button class="expedicion-tab ${pestanaActiva === 'asentamientos' ? 'activa' : ''}" 
                onclick="cambiarPestanaExpedicion('asentamientos')">
          🏘️ Asentamientos
        </button>
        <button class="expedicion-tab ${pestanaActiva === 'conexiones' ? 'activa' : ''}" 
                onclick="cambiarPestanaExpedicion('conexiones')">
          🔗 Conexiones
        </button>
      </nav>
      
      <main class="lista-contenido">
        ${pestanaActiva === 'asentamientos' ? renderizarPestanaAsentamientos(asentamientos) : renderizarPestanaConexiones(asentamientos)}
      </main>
    </div>
  `;
}

function cambiarPestanaExpedicion(pestana) {
  estadoApp.pestanaExpedicion = pestana;
  renderizarPantalla();
}

function renderizarPestanaAsentamientos(asentamientos) {
  if (asentamientos.length === 0) {
    return `
      <div class="lista-vacia">
        <div class="lista-vacia-icono">🏕️</div>
        <h3>No hay asentamientos</h3>
        <p>Crea tu primer asentamiento para comenzar la expedición</p>
        <button class="btn-principal" onclick="iniciarCreacionAsentamiento()">
          <span class="btn-icono">➕</span>
          <span class="btn-texto">Crear Primer Asentamiento</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="asentamientos-grid">
      ${asentamientos.map(a => renderizarCardAsentamiento(a)).join('')}
    </div>
  `;
}

function renderizarPestanaConexiones(asentamientos) {
  if (asentamientos.length < 2) {
    return `
      <div class="lista-vacia">
        <div class="lista-vacia-icono">🔗</div>
        <h3>Necesitas más asentamientos</h3>
        <p>Crea al menos 2 asentamientos para poder conectarlos</p>
      </div>
    `;
  }

  // Obtener todas las conexiones existentes
  const conexionesExistentes = [];
  asentamientos.forEach(a => {
    const conexiones = a.conexiones || (a.conectadoA ? [a.conectadoA] : []);
    conexiones.forEach(destId => {
      // Evitar duplicados (A-B y B-A son la misma conexión)
      const yaExiste = conexionesExistentes.some(c =>
        (c.desde === a.id && c.hacia === destId) ||
        (c.desde === destId && c.hacia === a.id)
      );
      if (!yaExiste) {
        const destino = asentamientos.find(as => as.id === destId);
        if (destino) {
          conexionesExistentes.push({ desde: a.id, hacia: destId, nombreDesde: a.nombre, nombreHacia: destino.nombre });
        }
      }
    });
  });

  return `
    <div class="conexiones-panel">
      <div class="conexiones-formulario">
        <h4>➕ Crear Nueva Conexión</h4>
        <div class="form-conexion">
          <select id="conexion-desde" class="select-form">
            <option value="">Desde...</option>
            ${asentamientos.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('')}
          </select>
          <span class="conexion-flecha">↔️</span>
          <select id="conexion-hacia" class="select-form">
            <option value="">Hacia...</option>
            ${asentamientos.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('')}
          </select>
          <button class="btn-principal" onclick="crearConexionDesdeUI()">
            <span class="btn-icono">🔗</span>
            <span class="btn-texto">Conectar</span>
          </button>
        </div>
      </div>
      
      <hr class="separador-seccion">
      
      <h4>📋 Conexiones Existentes (${conexionesExistentes.length})</h4>
      ${conexionesExistentes.length === 0 ? `
        <div class="conexiones-vacio">
          <p>No hay conexiones entre asentamientos.</p>
        </div>
      ` : `
        <div class="conexiones-lista">
          ${conexionesExistentes.map(c => `
            <div class="conexion-item">
              <div class="conexion-info">
                <span class="conexion-nodo">${c.nombreDesde}</span>
                <span class="conexion-linea">↔️</span>
                <span class="conexion-nodo">${c.nombreHacia}</span>
              </div>
              <button class="btn-mini btn-eliminar" onclick="eliminarConexionDesdeUI(${c.desde}, ${c.hacia})" title="Eliminar conexión">
                ✕
              </button>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function crearConexionDesdeUI() {
  const desdeId = parseInt(document.getElementById('conexion-desde')?.value);
  const haciaId = parseInt(document.getElementById('conexion-hacia')?.value);

  if (!desdeId || !haciaId) {
    alert("Selecciona ambos asentamientos");
    return;
  }

  if (desdeId === haciaId) {
    alert("No puedes conectar un asentamiento consigo mismo");
    return;
  }

  const asentamientos = estadoApp.expedicion?.asentamientos || [];
  const desde = asentamientos.find(a => a.id === desdeId);
  const hacia = asentamientos.find(a => a.id === haciaId);

  if (!desde || !hacia) return;

  // Inicializar arrays de conexiones si no existen
  if (!desde.conexiones) desde.conexiones = [];
  if (!hacia.conexiones) hacia.conexiones = [];

  // Verificar si ya están conectados
  if (desde.conexiones.includes(haciaId)) {
    alert("Estos asentamientos ya están conectados");
    return;
  }

  // Crear conexión bidireccional
  desde.conexiones.push(haciaId);
  hacia.conexiones.push(desdeId);

  guardarExpedicion();
  renderizarPantalla();

  if (typeof mostrarNotificacion === 'function') {
    mostrarNotificacion(`🔗 Conexión creada: ${desde.nombre} ↔️ ${hacia.nombre}`, 'exito');
  }
}

function eliminarConexionDesdeUI(desdeId, haciaId) {
  const asentamientos = estadoApp.expedicion?.asentamientos || [];
  const desde = asentamientos.find(a => a.id === desdeId);
  const hacia = asentamientos.find(a => a.id === haciaId);

  if (!desde || !hacia) return;

  // Eliminar de ambos lados
  if (desde.conexiones) {
    desde.conexiones = desde.conexiones.filter(id => id !== haciaId);
  }
  if (hacia.conexiones) {
    hacia.conexiones = hacia.conexiones.filter(id => id !== desdeId);
  }

  guardarExpedicion();
  renderizarPantalla();

  if (typeof mostrarNotificacion === 'function') {
    mostrarNotificacion(`Conexión eliminada`, 'info');
  }
}

/**
 * Renderiza una card de asentamiento para la lista
 */
function renderizarCardAsentamiento(asentamiento) {
  const gradoData = GRADOS[asentamiento.grado];
  // Manejar conexiones (array)
  const conexionesDisplay = (asentamiento.conexiones || (asentamiento.conectadoA ? [asentamiento.conectadoA] : []))
    .map(id => {
      const a = estadoApp.expedicion?.asentamientos.find(as => as.id === id);
      return a ? a.nombre : '';
    })
    .filter(Boolean)
    .join(', ');
  const poblacionTotal = asentamiento.poblacion?.reduce((sum, p) => sum + (p.cantidad * 20), 0) || 0;

  return `
    <div class="asentamiento-card" onclick="seleccionarAsentamiento(${asentamiento.id})">
      <div class="card-header">
        ${asentamiento.imagenPersonalizada
      ? `<img src="${asentamiento.imagenPersonalizada}" class="card-imagen-custom" alt="Imagen del asentamiento">`
      : `<span class="card-icono">${gradoData?.icono || '🏕️'}</span>`
    }
        <div class="card-titulo">
          <h3>${asentamiento.nombre}</h3>
          <span class="card-grado">${asentamiento.grado}</span>
        </div>
        ${asentamiento.esPrimerAsentamiento ? '<span class="badge-primero">⭐ Principal</span>' : ''}
      </div>
      
      <div class="card-stats">
        <div class="card-stat">
          <span class="stat-label">Población</span>
          <span class="stat-value">${poblacionTotal}</span>
        </div>
        <div class="card-stat">
          <span class="stat-label">Doblones</span>
          <span class="stat-value">${asentamiento.doblones || 0}</span>
        </div>
      </div>
      
      ${conexionesDisplay ? `
        <div class="card-conexion">
          <span class="conexion-label">🔗 Conectado a:</span>
          <span class="conexion-valor">${conexionesDisplay}</span>
        </div>
      ` : ''}
      
      <div class="card-acciones">
        <button class="btn-gestionar" onclick="event.stopPropagation(); gestionarAsentamiento(${asentamiento.id})">
          Gestionar →
        </button>
        <button class="btn-eliminar-card" onclick="event.stopPropagation(); confirmarEliminarAsentamiento(${asentamiento.id})" title="Eliminar asentamiento">
          🗑️
        </button>
      </div>
    </div>
  `;
}

// =====================================================
// FUNCIONES DE NAVEGACIÓN EXPEDICIÓN
// =====================================================

function iniciarNuevaExpedicion() {
  estadoApp.pantalla = 'expedicion';
  renderizarPantalla();
}

function confirmarExpedicion() {
  const input = document.getElementById('input-expedicion');
  const nombre = input?.value?.trim();

  if (!nombre) {
    alert('Por favor, ingresa un nombre para la expedición');
    return;
  }

  // Crear nueva expedición
  estadoApp.expedicion = crearExpedicion(nombre);
  estadoApp.pantalla = 'lista';
  renderizarPantalla();
}

function continuarExpedicion() {
  estadoApp.pantalla = 'lista';
  renderizarPantalla();
}

function volverInicio() {
  estadoApp.pantalla = 'inicio';
  renderizarPantalla();
}

function volverALista() {
  estadoApp.pantalla = 'lista';
  renderizarPantalla();
}

function guardarExpedicionUI() {
  // Guardar en localStorage
  if (guardarExpedicion()) {
    mostrarNotificacion('✅ Expedición guardada correctamente');
    // También exportar a archivo
    exportarExpedicionAArchivo();
  } else {
    mostrarNotificacion('❌ Error al guardar la expedición', 'error');
  }
}

function seleccionarAsentamiento(id) {
  gestionarAsentamiento(id);
}

function gestionarAsentamiento(id) {
  const asentamiento = obtenerAsentamientoPorId(id);
  if (asentamiento) {
    estadoApp.asentamiento = asentamiento;
    estadoApp.asentamientoActual = asentamiento;
    estadoApp.pantalla = 'hud';
    renderizarPantalla();
  }
}

/**
 * Muestra notificación temporal
 */
function mostrarNotificacion(mensaje, tipo = 'success') {
  const resultadoDiv = document.getElementById('resultado-dado');
  if (!resultadoDiv) return;

  resultadoDiv.innerHTML = `
    <div class="notificacion ${tipo}">
      ${mensaje}
    </div>
  `;

  setTimeout(() => {
    resultadoDiv.innerHTML = '';
  }, 3000);
}

/**
 * Inicia creación de asentamiento - muestra modal si corresponde
 */
function iniciarCreacionAsentamiento() {
  const asentamientos = estadoApp.expedicion?.asentamientos || [];

  if (asentamientos.length === 0) {
    // Es el primer asentamiento, no preguntar
    iniciarCreacionConOpciones(true, null);
  } else {
    // Mostrar modal preguntando
    mostrarModalPrimerAsentamiento();
  }
}

/**
 * Muestra modal preguntando si es el primer asentamiento
 */
function mostrarModalPrimerAsentamiento() {
  const container = document.getElementById('app-container');

  // Crear overlay del modal
  const modalHTML = `
    <div class="modal-overlay" id="modal-primer-asentamiento">
      <div class="modal-content">
        <div class="modal-icono">🏕️</div>
        <h2>Nuevo Asentamiento</h2>
        <p>¿Es este tu <strong>primer asentamiento</strong> de la expedición?</p>
        
        <div class="modal-info">
          <div class="modal-opcion primero">
            <strong>Sí, es el primero</strong>
            <p>Recibirás 50 doblones y 4 cuotas de población (80 colonos)</p>
          </div>
          <div class="modal-opcion adicional">
            <strong>No, es adicional</strong>
            <p>Comenzarás con 0 doblones y 1 cuota de población (20 colonos)</p>
          </div>
        </div>
        
        <div class="modal-acciones">
          <button class="btn-principal" onclick="responderModalPrimero(true)">
            <span class="btn-icono">⭐</span>
            <span class="btn-texto">Sí, es el primero</span>
          </button>
          <button class="btn-secundario" onclick="responderModalPrimero(false)">
            <span class="btn-icono">➕</span>
            <span class="btn-texto">No, es adicional</span>
          </button>
        </div>
        
        <button class="btn-cerrar-modal" onclick="cerrarModal()">✕</button>
      </div>
    </div>
  `;

  // Agregar modal al DOM
  container.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Responde a la pregunta del modal
 */
function responderModalPrimero(esPrimero) {
  cerrarModal();
  if (esPrimero) {
    // Si es el primer asentamiento, iniciar creación directamente
    iniciarCreacionConOpciones(true, null);
  } else {
    // Si es adicional, mostrar modal para seleccionar conexión
    mostrarModalConexionV2();
  }
}

/**
 * Muestra modal para seleccionar a qué asentamiento conectarse
 */
/**
 * Muestra modal para seleccionar a qué asentamiento conectarse (Múltiple)
 */
function mostrarModalConexion() {
  const container = document.getElementById('app-container');
  const asentamientos = estadoApp.expedicion?.asentamientos || [];

  if (asentamientos.length === 0) {
    iniciarCreacionConOpciones(false, []);
    return;
  }

  const opcionesHTML = asentamientos.map(a =>
    `<div class="conexion-opcion">
       <input type="checkbox" id="conexion-${a.id}" value="${a.id}" class="check-conexion">
       <label for="conexion-${a.id}">${a.nombre} (${a.grado})</label>
     </div>`
  ).join('');

  const modalHTML = `
    <div class="modal-overlay" id="modal-conexion">
      <div class="modal-content">
        <div class="modal-icono">🔗</div>
        <h2>Conectar Asentamiento</h2>
        <p>Selecciona los asentamientos a los que estarás conectado (opcional):</p>
        
        <div class="modal-campo lista-conexiones">
          ${opcionesHTML}
        </div>
        
        <div class="modal-acciones">
          <button class="btn-principal" onclick="confirmarConexion()">
            <span class="btn-icono">✓</span>
            <span class="btn-texto">Continuar</span>
          </button>
          <button class="btn-secundario" onclick="cerrarModalConexion()">
            <span class="btn-texto">Cancelar</span>
          </button>
        </div>
        
        <button class="btn-cerrar-modal" onclick="cerrarModalConexion()">✕</button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Confirma la conexión y continúa con la creación
 */
function confirmarConexion() {
  const checkboxes = document.querySelectorAll('.check-conexion:checked');
  const conexiones = Array.from(checkboxes).map(cb => parseInt(cb.value));

  cerrarModalConexion();
  iniciarCreacionConOpciones(false, conexiones);
}

/**
 * Cierra el modal de conexión
 */
function cerrarModalConexion() {
  const modal = document.getElementById('modal-conexion');
  if (modal) modal.remove();
}

/**
 * Confirma la eliminación de un asentamiento
 */
function confirmarEliminarAsentamiento(id) {
  const asentamiento = obtenerAsentamientoPorId(id);
  if (!asentamiento) return;

  const confirmado = confirm(`¿Estás seguro de que deseas eliminar el asentamiento "${asentamiento.nombre}"?\n\nEsta acción no se puede deshacer.`);

  if (confirmado) {
    if (eliminarAsentamientoDeExpedicion(id)) {
      mostrarNotificacion('✅ Asentamiento eliminado');
      renderizarPantalla();
    } else {
      mostrarNotificacion('❌ Error al eliminar el asentamiento', 'error');
    }
  }
}

/**
 * Exporta expedición a archivo y guarda en localStorage
 */
function guardarYExportarExpedicion() {
  // Primero guardar en localStorage
  guardarExpedicion();

  // Luego exportar a archivo
  if (exportarExpedicionAArchivo()) {
    mostrarNotificacion('✅ Expedición guardada y exportada');
  }
}

/**
 * Cierra el modal activo
 */
function cerrarModal() {
  const modal = document.getElementById('modal-primer-asentamiento');
  if (modal) modal.remove();
}

/**
 * Inicia la creación del wizard con las opciones configuradas
 */
function iniciarCreacionConOpciones(esPrimerAsentamiento, conectadoA) {
  try {
    // Determinar población según si es primer asentamiento
    const poblacionInicial = esPrimerAsentamiento
      ? [{ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 4 }]
      : [{ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 1 }];

    wizardState = {
      paso: 1,
      nombre: '',
      tiradaD12: null,
      esBiomaEspecial: false,
      biomaBase: null,
      biomaEspecial: null,
      subBioma: null,
      tiradaSubBioma: null,
      biomaFusionado: null,
      propiedades: [],
      peculiaridades: [],
      peculiaridadFija: null,
      recursos: {},
      influenciaMagica: "Baja",
      poblacion: poblacionInicial,
      // Nuevos campos para expedición
      esPrimerAsentamiento: esPrimerAsentamiento,
      conexiones: conectadoA ? (Array.isArray(conectadoA) ? conectadoA : [conectadoA]) : [],
      // Para asentamientos secundarios, Zona Residencial es obligatoria
      edificios: esPrimerAsentamiento ? [] : ["Zona Residencial"]
    };
    estadoApp.pantalla = 'crear';
    renderizarPantalla();
  } catch (e) {
    console.error("Error en iniciarCreacionConOpciones:", e);
    alert("Error: " + e.message);
  }
}

// Mantener compatibilidad con función antigua
function iniciarCreacion() {
  iniciarCreacionAsentamiento();
}

function continuarAsentamiento() {
  estadoApp.pantalla = 'hud';
  renderizarPantalla();
}

function renderizarCreador(container) {
  const pasos = ['Nombre', 'Bioma', 'Propiedades', 'Recursos', 'Población', 'Construcciones', 'Confirmar'];

  container.innerHTML = `
    <div class="pantalla-crear">
      <div class="wizard-header">
        <button class="btn-volver" onclick="volverALista()">← Volver</button>
        <h2>Crear Asentamiento</h2>
        <div class="wizard-pasos">
          ${pasos.map((p, i) => `
            <div class="paso ${i + 1 === wizardState.paso ? 'activo' : ''} ${i + 1 < wizardState.paso ? 'completado' : ''}">
              <span class="paso-num">${i + 1}</span>
              <span class="paso-nombre">${p}</span>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="wizard-contenido">
        ${renderizarPasoActual()}
      </div>
      
      <div class="wizard-footer">
        ${wizardState.paso > 1 ? `<button class="btn-nav" onclick="pasoAnterior()">← Anterior</button>` : '<div></div>'}
      ${wizardState.paso < 7 ?
      `<button class="btn-nav btn-siguiente" onclick="pasoSiguiente()">Siguiente →</button>` :
      `<button class="btn-confirmar" onclick="confirmarCreacion()">✨ Crear Asentamiento</button>`
    }
      </div>
    </div>
  `;
}

function renderizarPasoActual() {
  switch (wizardState.paso) {
    case 1: return renderizarPasoNombre();
    case 2: return renderizarPasoBioma();
    case 3: return renderizarPasoPropiedades();
    case 4: return renderizarPasoRecursos();
    case 5: return renderizarPasoPoblacion();
    case 6: return renderizarPasoEdificios();
    case 7: return renderizarPasoConfirmacion();
    default: return '';
  }
}

// =====================================================
// PASO 1: NOMBRE
// =====================================================
function renderizarPasoNombre() {
  const tieneImagen = wizardState.imagenPersonalizada;

  return `
    <div class="paso-contenido paso-nombre">
      <div class="paso-icono">${tieneImagen ? `<img src="${wizardState.imagenPersonalizada}" class="imagen-preview-icono" alt="Imagen personalizada">` : '🏕️'}</div>
      <h3>Nombra tu Asentamiento</h3>
      <p>Elige un nombre memorable para tu nuevo hogar</p>
      
      <div class="input-grupo">
        <input 
          type="text" 
          id="input-nombre" 
          class="input-nombre" 
          placeholder="Ej: Valle del Crepúsculo"
          value="${wizardState.nombre}"
          onchange="actualizarNombre(this.value)"
          oninput="actualizarNombre(this.value)"
        />
      </div>
      
      <!-- Imagen Personalizada -->
      <div class="imagen-personalizada-grupo">
        <label class="imagen-label">🖼️ Imagen Personalizada (opcional)</label>
        <div class="imagen-opciones">
          ${tieneImagen ? `
            <div class="imagen-preview-container">
              <img src="${wizardState.imagenPersonalizada}" class="imagen-preview" alt="Preview">
              <button class="btn-eliminar-imagen" onclick="eliminarImagenPersonalizada()" title="Eliminar imagen">✕</button>
            </div>
          ` : `
            <div class="imagen-upload-zone" onclick="document.getElementById('input-imagen').click()">
              <span class="upload-icono">📷</span>
              <span class="upload-texto">Subir imagen</span>
            </div>
          `}
          <input 
            type="file" 
            id="input-imagen" 
            accept="image/*" 
            style="display:none"
            onchange="cargarImagenPersonalizada(this)"
          />
          <div class="imagen-url-input">
            <input 
              type="text" 
              id="input-imagen-url" 
              placeholder="...o pegar URL de imagen"
              onchange="cargarImagenDesdeURL(this.value)"
            />
          </div>
        </div>
        <small class="imagen-ayuda">La imagen aparecerá en el header del asentamiento</small>
      </div>
      
      <div class="grado-info">
        <div class="grado-badge">
          <span class="grado-icono">🏕️</span>
          <span>Comenzarás como <strong>Estamento</strong> (Grado 1)</span>
        </div>
        <div class="grado-stats">
          <div class="stat"><span>Calidad</span><strong>1</strong></div>
          <div class="stat"><span>Admin</span><strong>15</strong></div>
          <div class="stat"><span>Guarnición</span><strong>5</strong></div>
          <div class="stat"><span>Almacén</span><strong>20</strong></div>
        </div>
      </div>
    </div>
  `;
}

// =====================================================
// PASO 2: SELECCIÓN DE BIOMAS (MANUAL, MULTI-SELECCIÓN)
// =====================================================
function renderizarPasoBioma() {
  // Initialize if needed
  if (!wizardState.biomasSeleccionados) {
    wizardState.biomasSeleccionados = [];
  }

  const seleccionados = wizardState.biomasSeleccionados;

  // Aggregate properties from all selected biomes
  const propiedadesMerged = new Set();
  const recursosMerged = new Set();
  let influenciaMagica = null;

  seleccionados.forEach(nombre => {
    const bioma = BIOMAS_BASE[nombre] || BIOMAS_ESPECIALES[nombre];
    if (bioma) {
      (bioma.propiedadesBase || bioma.propiedades || []).forEach(p => propiedadesMerged.add(p));
      (bioma.recursos || []).forEach(r => recursosMerged.add(r));
      if (!influenciaMagica) influenciaMagica = bioma.influenciaMagica;
    }
  });

  return `
    <div class="paso-contenido paso-bioma">
      <h3>🌍 Seleccionar Biomas</h3>
      <p>Selecciona uno o más biomas para tu territorio. Las propiedades se combinarán.</p>
      
      <div class="bioma-seleccion-grid">
        <div class="bioma-botones">
          ${[...Object.entries(BIOMAS_BASE), ...Object.entries(BIOMAS_ESPECIALES)].map(([nombre, data]) => `
            <button class="btn-bioma-toggle ${seleccionados.includes(nombre) ? 'seleccionado' : ''}"
                    onclick="toggleBiomaSeleccion('${nombre}')">
              ${data.icono} ${nombre}
            </button>
          `).join('')}
        </div>
      </div>
      
      ${seleccionados.length > 0 ? `
        <div class="bioma-resumen" style="margin-top: 2rem;">
          <h4>📋 Resumen de Selección (${seleccionados.length} bioma${seleccionados.length > 1 ? 's' : ''})</h4>
          
          <div class="biomas-seleccionados-lista">
            ${seleccionados.map(n => {
    const b = BIOMAS_BASE[n] || BIOMAS_ESPECIALES[n];
    return `<span class="tag-mini">${b?.icono || '🌍'} ${n}</span>`;
  }).join('')}
          </div>
          
          <div class="resumen-seccion" style="margin-top: 1rem;">
            <h5>Propiedades Combinadas</h5>
            <div class="tags-mini">
              ${[...propiedadesMerged].map(p => `
                <span class="tag-mini">${PROPIEDADES[p]?.icono || '📍'} ${p}</span>
              `).join('')}
            </div>
          </div>
          
          ${influenciaMagica ? `
            <div class="resumen-seccion" style="margin-top: 0.5rem;">
              <h5>Influencia Mágica</h5>
              <span class="influencia-badge ${influenciaMagica.toLowerCase()}">${INFLUENCIA_MAGICA[influenciaMagica]?.icono} ${influenciaMagica}</span>
            </div>
          ` : ''}
        </div>
      ` : '<p class="sin-recursos" style="margin-top: 2rem;">Selecciona al menos un bioma</p>'}
    </div>
  `;
}

function toggleBiomaSeleccion(nombre) {
  if (!wizardState.biomasSeleccionados) {
    wizardState.biomasSeleccionados = [];
  }

  const idx = wizardState.biomasSeleccionados.indexOf(nombre);
  if (idx >= 0) {
    wizardState.biomasSeleccionados.splice(idx, 1);
  } else {
    wizardState.biomasSeleccionados.push(nombre);
  }

  // Rebuild Aggregations
  const propiedadesMerged = new Set();
  let influenciaMagica = null;

  wizardState.biomasSeleccionados.forEach(n => {
    const bioma = BIOMAS_BASE[n] || BIOMAS_ESPECIALES[n];
    if (bioma) {
      // Use propiedadesBase for base biomes, propiedadesCapa for special biomes
      const props = bioma.propiedadesBase || bioma.propiedadesCapa || [];
      props.forEach(p => propiedadesMerged.add(p));
      if (!influenciaMagica) influenciaMagica = bioma.influenciaMagica;
    }
  });

  wizardState.propiedades = [...propiedadesMerged];
  wizardState.influenciaMagica = influenciaMagica;

  // Set biomaBase for compatibility (first selected)
  if (wizardState.biomasSeleccionados.length > 0) {
    wizardState.biomaBase = wizardState.biomasSeleccionados[0];
  } else {
    wizardState.biomaBase = null;
  }

  renderizarPantalla();
}

function renderizarResumenBioma() {
  if (!wizardState.biomaBase && !wizardState.biomaFusionado) {
    return '<div class="bioma-resumen vacio"><p>Tira los dados para determinar tu bioma</p></div>';
  }

  let bioma, propiedades, recursos, influencia;

  if (wizardState.biomaFusionado) {
    bioma = wizardState.biomaFusionado;
    propiedades = bioma.propiedades;
    recursos = bioma.recursos;
    influencia = bioma.influenciaMagica;
  } else if (wizardState.biomaBase) {
    bioma = BIOMAS_BASE[wizardState.biomaBase];
    propiedades = bioma.propiedadesBase || [];
    recursos = bioma.recursos;
    influencia = bioma.influenciaMagica;
  }

  return `
    <div class="bioma-resumen">
      <div class="bioma-resumen-header">
        <span class="bioma-icono-grande">${wizardState.biomaFusionado?.icono || bioma?.icono || '🌍'}</span>
        <div>
          <h4>${wizardState.biomaFusionado?.nombre || wizardState.biomaBase}</h4>
          <span class="influencia-badge ${influencia?.toLowerCase()}">${INFLUENCIA_MAGICA[influencia]?.icono} ${influencia}</span>
        </div>
      </div>
      
      <div class="bioma-resumen-contenido">
        <div class="resumen-seccion">
          <h5>Propiedades del Terreno</h5>
          <div class="tags-mini">
            ${propiedades.map(p => `
              <span class="tag-mini">${PROPIEDADES[p]?.icono || '📍'} ${p}</span>
            `).join('')}
          </div>
        </div>
        
        ${wizardState.biomaFusionado?.recursosGarantizados?.length > 0 ? `
          <div class="resumen-seccion garantizados">
            <h5>✨ Recursos Garantizados</h5>
            <div class="tags-mini">
              ${wizardState.biomaFusionado.recursosGarantizados.map(r => `
                <span class="tag-mini garantizado">${RECURSOS[r]?.icono || '📦'} ${r}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${wizardState.biomaFusionado?.peculiaridadFija ? `
          <div class="resumen-seccion">
            <h5>⚠️ Peculiaridad Fija</h5>
            <span class="tag-mini peculiaridad">${PECULIARIDADES[wizardState.biomaFusionado.peculiaridadFija]?.icono} ${wizardState.biomaFusionado.peculiaridadFija}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function tirarD12Bioma() {
  const resultado = determinarTipoBioma();

  wizardState.tiradaD12 = resultado.tiradaD12;
  wizardState.esBiomaEspecial = resultado.esBiomaEspecial;
  wizardState.biomaBase = resultado.biomaBase;
  wizardState.biomaEspecial = resultado.biomaEspecial;

  // Resetear sub-bioma y fusión
  wizardState.subBioma = null;
  wizardState.tiradaSubBioma = null;
  wizardState.biomaFusionado = null;


  // Si es bioma base, cargar propiedades automáticamente
  if (!resultado.esBiomaEspecial && resultado.biomaBase) {
    const biomaData = BIOMAS_BASE[resultado.biomaBase];
    wizardState.propiedades = [...biomaData.propiedadesBase];
    wizardState.influenciaMagica = biomaData.influenciaMagica;
  }

  renderizarPantalla();
}

function tirarD6SubBioma() {
  const resultado = determinarSubBioma();

  wizardState.subBioma = resultado.subBioma;
  wizardState.tiradaSubBioma = resultado.tiradaD6;

  // Fusionar biomas
  if (wizardState.biomaEspecial && wizardState.subBioma) {
    wizardState.biomaFusionado = fusionarBiomas(wizardState.biomaEspecial, wizardState.subBioma);
    wizardState.propiedades = [...wizardState.biomaFusionado.propiedades];
    wizardState.influenciaMagica = wizardState.biomaFusionado.influenciaMagica;

    // Agregar peculiaridad fija si existe
    if (wizardState.biomaFusionado.peculiaridadFija) {
      wizardState.peculiaridadFija = wizardState.biomaFusionado.peculiaridadFija;
      if (!wizardState.peculiaridades.includes(wizardState.peculiaridadFija)) {
        wizardState.peculiaridades.push(wizardState.peculiaridadFija);
      }
    }
  }

  renderizarPantalla();
}

function seleccionarBiomaManual(tipo, nombre) {
  if (tipo === 'base') {
    wizardState.esBiomaEspecial = false;
    wizardState.biomaBase = nombre;
    wizardState.biomaEspecial = null;
    wizardState.subBioma = null;
    wizardState.biomaFusionado = null;
    wizardState.tiradaD12 = BIOMAS_BASE[nombre].id;

    const biomaData = BIOMAS_BASE[nombre];
    wizardState.propiedades = [...biomaData.propiedadesBase];
    wizardState.influenciaMagica = biomaData.influenciaMagica;
  } else {
    wizardState.esBiomaEspecial = true;
    wizardState.biomaEspecial = nombre;
    wizardState.biomaBase = null;
    wizardState.tiradaD12 = BIOMAS_ESPECIALES[nombre].idRango[0];
  }

  renderizarPantalla();
}

// =====================================================
// PASO 3: PROPIEDADES DEL TERRENO (SELECCIÓN MANUAL)
// =====================================================
function renderizarPasoPropiedades() {
  // Collect suggested properties from selected biomes
  const propiedadesSugeridas = new Set();
  (wizardState.biomasSeleccionados || []).forEach(nombre => {
    const bioma = BIOMAS_BASE[nombre] || BIOMAS_ESPECIALES[nombre];
    if (bioma) {
      // Use propiedadesBase for base biomes, propiedadesCapa for special biomes
      const props = bioma.propiedadesBase || bioma.propiedadesCapa || [];
      props.forEach(p => {
        if (p !== 'Bioma Secundario') propiedadesSugeridas.add(p);
      });
    }
  });

  // Current selected properties
  const propiedadesActivas = wizardState.propiedades || [];

  return `
    <div class="paso-contenido paso-seleccion">
      <h3>🌍 Propiedades del Terreno</h3>
      <p>Selecciona las propiedades de tu territorio. Las sugeridas por los biomas están resaltadas.</p>
      
      <div class="propiedades-grid">
        ${Object.entries(PROPIEDADES)
      .filter(([nombre]) => nombre !== 'Bioma Secundario')
      .map(([nombre, data]) => {
        const esSugerida = propiedadesSugeridas.has(nombre);
        const seleccionada = propiedadesActivas.includes(nombre);
        return `
              <button class="btn-propiedad-toggle ${seleccionada ? 'seleccionado' : ''} ${esSugerida ? 'sugerida' : ''}"
                      onclick="togglePropiedad('${nombre}')">
                <span class="prop-icono">${data.icono}</span>
                <span class="prop-nombre">${nombre}</span>
                ${esSugerida ? '<span class="badge-sugerida">✓ Bioma</span>' : ''}
              </button>
            `;
      }).join('')}
      </div>
      
      <div class="propiedades-resumen" style="margin-top: 2rem;">
        <h4>Propiedades Activas (${propiedadesActivas.length})</h4>
        <div class="tags-lista">
          ${propiedadesActivas.length > 0 ? propiedadesActivas.map(p => `
            <span class="tag activo">${PROPIEDADES[p]?.icono} ${p}</span>
          `).join('') : '<span class="sin-recursos">Ninguna seleccionada</span>'}
        </div>
      </div>
      
      <div class="seccion-peculiaridades" style="margin-top: 2rem;">
        <h4>✨ Peculiaridades del Territorio</h4>
        <p>Características especiales adicionales</p>
        
        ${wizardState.peculiaridadFija ? `
          <div class="peculiaridad-fija">
            <span class="tag fija">🔒 ${PECULIARIDADES[wizardState.peculiaridadFija]?.icono} ${wizardState.peculiaridadFija} (Obligatoria)</span>
          </div>
        ` : ''}
        
        <div class="seleccion-grid">
          ${Object.entries(PECULIARIDADES).map(([nombre, data]) => {
        const esFija = wizardState.peculiaridadFija === nombre;
        const seleccionada = wizardState.peculiaridades.includes(nombre);
        return `
              <div class="opcion-card ${seleccionada ? 'seleccionado' : ''} ${esFija ? 'fija' : ''}" 
                   onclick="${esFija ? '' : `togglePeculiaridad('${nombre}')`}">
                <div class="opcion-header">
                  <span class="opcion-icono">${data.icono}</span>
                  <span class="opcion-nombre">${nombre}</span>
                  ${esFija ? '<span class="badge-fija">🔒</span>' : ''}
                </div>
                <p class="opcion-desc">${data.descripcion}</p>
                <div class="opcion-efectos">
                  ${Object.entries(data.efectos).slice(0, 3).map(([stat, val]) => `
                    <span class="efecto ${obtenerClaseColor(stat, val)}">${formatearValor(val)} ${stat}</span>
                  `).join('')}
                </div>
              </div>
            `;
      }).join('')}
        </div>
      </div>
    </div>
  `;
}

function togglePropiedad(nombre) {
  if (!wizardState.propiedades) wizardState.propiedades = [];

  const idx = wizardState.propiedades.indexOf(nombre);
  if (idx >= 0) {
    wizardState.propiedades.splice(idx, 1);
  } else {
    wizardState.propiedades.push(nombre);
  }
  renderizarPantalla();
}

// =====================================================
// PASO 4: RECURSOS DEL TERRITORIO (SELECCIÓN MANUAL)
// =====================================================
function renderizarPasoRecursos() {
  // Collect suggested resources from selected biomes
  const recursosSugeridos = new Set();
  (wizardState.biomasSeleccionados || []).forEach(nombre => {
    const bioma = BIOMAS_BASE[nombre] || BIOMAS_ESPECIALES[nombre];
    if (bioma) {
      (bioma.recursos || []).forEach(r => recursosSugeridos.add(r));
      (bioma.exoticos || []).forEach(r => recursosSugeridos.add(r));
      (bioma.recursosGarantizados || []).forEach(r => recursosSugeridos.add(r));
    }
  });

  // Current selected resources
  const recursosActivos = Object.keys(wizardState.recursos || {});
  const modificadoresPropiedades = calcularModificadoresRecursos(wizardState.propiedades || []);

  return `
    <div class="paso-contenido paso-recursos">
      <h3>📦 Recursos del Territorio</h3>
      <p>Selecciona qué recursos existen en tu territorio. Los de tus biomas están resaltados.</p>
      
      <div class="recursos-seleccion-grid">
        ${Object.entries(RECURSOS).map(([nombre, data]) => {
    const esSugerido = recursosSugeridos.has(nombre);
    const seleccionado = recursosActivos.includes(nombre);
    return `
              <button class="btn-recurso-toggle ${seleccionado ? 'seleccionado' : ''} ${esSugerido ? 'sugerido' : ''}"
                      onclick="toggleRecursoSeleccion('${nombre}')">
                <span class="rec-icono">${data.icono}</span>
                <span class="rec-nombre">${nombre}</span>
                ${esSugerido ? '<span class="badge-sugerida">✓ Bioma</span>' : ''}
              </button>
            `;
  }).join('')}
      </div>
      
      ${recursosActivos.length > 0 ? `
        <div class="recursos-configuracion" style="margin-top: 2rem;">
          <h4>Configurar Abundancia (${recursosActivos.length} recursos)</h4>
          <div class="recursos-tabla">
            <div class="recursos-tabla-header">
              <span>Recurso</span>
              <span>Abundancia</span>
              <span>Mod.</span>
              <span></span>
            </div>
            ${recursosActivos.map(recurso => {
    const estado = wizardState.recursos[recurso] || { abundancia: "Normal" };
    const mod = modificadoresPropiedades[recurso] || 0;
    const modAbundancia = obtenerModificadorAbundancia(estado.abundancia);
    const modTotal = mod + modAbundancia;

    return `
                  <div class="recurso-row">
                    <span class="recurso-nombre">
                      ${RECURSOS[recurso]?.icono || '📦'} ${recurso}
                    </span>
                    <div class="recurso-abundancia">
                      <select onchange="cambiarAbundancia('${recurso}', this.value)" class="select-abundancia ${obtenerClaseAbundancia(estado.abundancia)}">
                        ${Object.keys(NIVELES_ABUNDANCIA).filter(n => n !== 'Inexistente').map(nivel => `
                          <option value="${nivel}" ${estado.abundancia === nivel ? 'selected' : ''}>${nivel}</option>
                        `).join('')}
                      </select>
                    </div>
                    <span class="recurso-mod ${modTotal > 0 ? 'positivo' : modTotal < 0 ? 'negativo' : 'neutro'}">
                      ${modTotal !== 0 ? formatearValor(modTotal) : '-'}
                    </span>
                    <button class="btn-eliminar-recurso" onclick="toggleRecursoSeleccion('${recurso}')">🗑️</button>
                  </div>
                `;
  }).join('')}
          </div>
        </div>
      ` : '<p class="sin-recursos" style="margin-top: 2rem;">Selecciona los recursos que existen en tu territorio</p>'}
    </div>
  `;
}

function toggleRecursoSeleccion(nombre) {
  if (!wizardState.recursos) wizardState.recursos = {};

  if (wizardState.recursos[nombre]) {
    // Remove
    delete wizardState.recursos[nombre];
  } else {
    // Add with default abundance
    wizardState.recursos[nombre] = { abundancia: "Normal" };
  }
  renderizarPantalla();
}

/**
 * Tirar dados para determinar abundancia de recursos del bioma
 * Lógica: 1 Abundante, 2 Escasos, resto Normal
 */
function tirarRecursoBioma() {
  const biomaActual = wizardState.biomaFusionado || BIOMAS_BASE[wizardState.biomaBase];
  if (!biomaActual) return;

  const recursos = biomaActual.recursos;
  const dado = biomaActual.dado;
  const maxDado = parseInt(dado.replace('d', ''), 10);

  // Realizar las tiradas según el dado del bioma
  const tiradas = [];
  for (let i = 0; i < maxDado; i++) {
    tiradas.push(lanzarDado(dado));
  }

  // Ordenar tiradas para determinar abundancia
  // El más bajo = Abundante (recurso más común)
  // Los 2 más altos = Escasos (recursos más raros)
  const tiradasOrdenadas = [...tiradas].sort((a, b) => a - b);
  const tiradaAbundante = tiradasOrdenadas[0]; // Más bajo = abundante
  const tiradasEscasas = [tiradasOrdenadas[tiradasOrdenadas.length - 1], tiradasOrdenadas[tiradasOrdenadas.length - 2]]; // 2 más altos = escasos

  // Reiniciar recursos del bioma
  recursos.forEach((recurso, idx) => {
    const numRecurso = idx + 1; // Los recursos están indexados 1-N
    let abundancia = "Normal";

    if (numRecurso === tiradaAbundante) {
      abundancia = "Abundante";
    } else if (tiradasEscasas.includes(numRecurso)) {
      abundancia = "Escaso";
    }

    wizardState.recursos[recurso] = {
      abundancia: abundancia,
      tirada: numRecurso,
      esGarantizado: false,
      esExotico: false
    };
  });

  // Mostrar resultado
  mostrarResultadoTiradaCompleta(recursos, tiradaAbundante, tiradasEscasas);
  renderizarPantalla();
}

/**
 * Tirar dado para descubrir UN recurso exótico
 * El recurso descubierto entra en nivel Normal
 */
function tirarRecursoExotico() {
  const biomaActual = wizardState.biomaFusionado || BIOMAS_BASE[wizardState.biomaBase];
  if (!biomaActual) return;

  const exoticos = biomaActual.exoticos;
  const dado = biomaActual.dadoExotico;
  const tirada = lanzarDado(dado);

  // Seleccionar el exótico según la tirada (índice 1-N)
  const indice = Math.min(tirada - 1, exoticos.length - 1);
  const recursoSeleccionado = exoticos[indice];

  // El exótico descubierto entra en Normal
  wizardState.recursos[recursoSeleccionado] = {
    abundancia: "Normal",
    tirada: tirada,
    esGarantizado: false,
    esExotico: true
  };

  mostrarResultadoDadoExotico(recursoSeleccionado, tirada);
  renderizarPantalla();
}

function mostrarResultadoTiradaCompleta(recursos, abundante, escasos) {
  const resultadoDiv = document.getElementById('resultado-dado');
  if (!resultadoDiv) return;

  const recursoAbundante = recursos[abundante - 1];
  const recursosEscasos = escasos.map(t => recursos[t - 1]).filter(Boolean);
  const recursosNormales = recursos.filter((r, i) =>
    (i + 1) !== abundante && !escasos.includes(i + 1)
  );

  resultadoDiv.innerHTML = `
    <div class="tirada-completa-resultado animado">
      <button class="btn-cerrar-resultado" onclick="cerrarResultadoDado()">×</button>
      <div class="tirada-header-grande">
        <span class="dado-grande">🎲</span>
        <h4>¡Recursos Determinados!</h4>
      </div>
      <div class="tirada-resumen">
        <div class="tirada-item abundante destacado">
          <span class="tirada-badge">+1</span>
          <span class="tirada-label">ABUNDANTE:</span>
          <span class="tirada-recurso">${RECURSOS[recursoAbundante]?.icono || '📦'} <strong>${recursoAbundante}</strong></span>
        </div>
        <div class="tirada-item escaso destacado">
          <span class="tirada-badge">-2</span>
          <span class="tirada-label">ESCASOS:</span>
          <span class="tirada-recurso">${recursosEscasos.map(r => `${RECURSOS[r]?.icono || '📦'} <strong>${r}</strong>`).join(' • ')}</span>
        </div>
        <div class="tirada-item normal">
          <span class="tirada-badge">0</span>
          <span class="tirada-label">NORMALES:</span>
          <span class="tirada-recurso">${recursosNormales.map(r => `${RECURSOS[r]?.icono || '📦'} ${r}`).join(', ')}</span>
        </div>
      </div>
    </div>
  `;
}

function cerrarResultadoDado() {
  const resultadoDiv = document.getElementById('resultado-dado');
  if (resultadoDiv) resultadoDiv.innerHTML = '';
}

function mostrarResultadoDadoExotico(recurso, tirada) {
  const resultadoDiv = document.getElementById('resultado-dado');
  if (!resultadoDiv) return;

  resultadoDiv.innerHTML = `
    <div class="tirada-completa-resultado animado exotico-resultado">
      <button class="btn-cerrar-resultado" onclick="cerrarResultadoDado()">×</button>
      <div class="tirada-header-grande">
        <span class="dado-grande exotico-dado">🎲 ${tirada}</span>
        <h4>¡Recurso Exótico Descubierto!</h4>
      </div>
      <div class="exotico-descubierto">
        <span class="exotico-icono-grande">${RECURSOS[recurso]?.icono || '💎'}</span>
        <span class="exotico-nombre-grande">${recurso}</span>
        <span class="exotico-estado">Ahora disponible (Nivel: Normal)</span>
      </div>
    </div>
  `;
}

function mostrarResultadoDado(resultado, esExotico) {
  const resultadoDiv = document.getElementById('resultado-dado');
  if (!resultadoDiv) return;

  resultadoDiv.innerHTML = `
    <div class="dado-resultado ${esExotico ? 'exotico' : ''} ${obtenerClaseAbundancia(resultado.abundancia)}">
      <span class="dado-valor">🎲 ${resultado.tirada}</span>
      <span class="dado-recurso">${RECURSOS[resultado.recurso]?.icono || '📦'} ${resultado.recurso}</span>
      <span class="dado-abundancia ${obtenerClaseAbundancia(resultado.abundancia)}">
        ${resultado.abundancia} (${formatearValor(obtenerModificadorAbundancia(resultado.abundancia))})
      </span>
    </div>
  `;

  // Remover después de 5 segundos
  setTimeout(() => {
    if (resultadoDiv) resultadoDiv.innerHTML = '';
  }, 5000);
}

function cambiarAbundancia(recurso, nivel) {
  wizardState.recursos[recurso] = {
    ...wizardState.recursos[recurso],
    abundancia: nivel
  };
  renderizarPantalla();
}

function agregarRecursoManual() {
  const select = document.getElementById('select-recurso-manual');
  const nombreRecurso = select.value;

  if (!nombreRecurso) return;

  // Agregar con abundancia Normal por defecto
  wizardState.recursos[nombreRecurso] = {
    abundancia: "Normal",
    tirada: null,
    esGarantizado: false,
    esExotico: false,
    esManual: true
  };

  renderizarPantalla();
}

function eliminarRecursoManual(recurso) {
  if (wizardState.recursos[recurso]) {
    delete wizardState.recursos[recurso];
    renderizarPantalla();
  }
}

// =====================================================
// PASO 5: POBLACIÓN INICIAL
// =====================================================
function renderizarPasoPoblacion() {
  // Determinar cuotas según tipo de asentamiento
  const esPrimero = wizardState.esPrimerAsentamiento ?? true;
  const totalCuotas = esPrimero ? 4 : 1; // 4 cuotas primer asentamiento, 1 para adicionales

  // Asegurar inicialización para evitar crashes
  if (!wizardState.poblacion) {
    wizardState.poblacion = esPrimero
      ? [{ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 4 }]
      : [{ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 1 }];
  }

  const cuotasUsadas = wizardState.poblacion.reduce((sum, p) => sum + p.cantidad, 0);
  const cuotasRestantes = totalCuotas - cuotasUsadas;

  const descripcionTipo = esPrimero
    ? `Este es el <strong>primer asentamiento</strong> de la expedición. Cuentas con <strong>${totalCuotas} Cuotas</strong> (${totalCuotas * CONVERSION.CUOTA_POBLACION} colonos).`
    : `Este es un <strong>asentamiento adicional</strong>. Solo cuentas con <strong>${totalCuotas} Cuota</strong> (${totalCuotas * CONVERSION.CUOTA_POBLACION} colonos).`;

  return `
    <div class="paso-contenido paso-poblacion">
      <h3>👥 Población Inicial</h3>
      <p>${descripcionTipo}</p>
      
      <div class="cuotas-contador">
        <span class="cuotas-usadas">${cuotasUsadas}/${totalCuotas}</span>
        <span class="cuotas-label">Cuotas asignadas</span>
      </div>
      
      <div class="poblacion-grid">
        ${wizardState.poblacion.map((config, idx) => `
          <div class="poblacion-card">
            <div class="poblacion-header">
              <span class="poblacion-num">#${idx + 1}</span>
              <button class="btn-eliminar-poblacion" onclick="eliminarConfigPoblacion(${idx})" ${wizardState.poblacion.length <= 1 ? 'disabled' : ''}>🗑️</button>
            </div>
            
            <div class="poblacion-campo">
              <label>Rol:</label>
              <select onchange="actualizarPoblacion(${idx}, 'rol', this.value)" class="select-poblacion">
                ${Object.entries(ROLES_POBLACION).map(([rol, data]) => `
                  <option value="${rol}" ${config.rol === rol ? 'selected' : ''}>${data.icono} ${rol}</option>
                `).join('')}
              </select>
              <small>${ROLES_POBLACION[config.rol]?.beneficio || ''}</small>
            </div>
            
            <div class="poblacion-campo">
              <label>Naturaleza:</label>
              <select onchange="actualizarPoblacion(${idx}, 'naturaleza', this.value)" class="select-poblacion">
                ${Object.entries(NATURALEZAS_POBLACION).map(([nat, data]) => `
                  <option value="${nat}" ${config.naturaleza === nat ? 'selected' : ''}>${data.icono} ${nat}</option>
                `).join('')}
              </select>
              <small>${NATURALEZAS_POBLACION[config.naturaleza]?.descripcion || ''}</small>
            </div>
            
            ${config.naturaleza === 'Artificial' ? `
              <div class="poblacion-campo">
                <label>Subtipo Artificial:</label>
                <select onchange="actualizarPoblacion(${idx}, 'subtipo', this.value)" class="select-poblacion">
                  ${["Neutral", "Positiva", "Negativa", "Monstruo"].map(s => `
                    <option value="${s}" ${(config.subtipo || 'Neutral') === s ? 'selected' : ''}>${NATURALEZAS_POBLACION[s]?.icono || '⚪'} ${s}</option>
                  `).join('')}
                </select>
                <small>Define el subtipo base de los Artificiales</small>
              </div>
            ` : ''}
            
            <div class="poblacion-campo">
              <label>Cuotas:</label>
              <div class="cantidad-control">
                <button onclick="ajustarCantidadPoblacion(${idx}, -1)" class="btn-cantidad" ${config.cantidad <= 1 ? 'disabled' : ''}>−</button>
                <span class="cantidad-valor">${config.cantidad}</span>
                <button onclick="ajustarCantidadPoblacion(${idx}, 1)" class="btn-cantidad" ${cuotasRestantes <= 0 ? 'disabled' : ''}>+</button>
              </div>
              <small>${config.cantidad * CONVERSION.CUOTA_POBLACION} colonos</small>
            </div>
          </div>
        `).join('')}
        
        ${cuotasRestantes > 0 ? `
          <div class="poblacion-card agregar" onclick="agregarConfigPoblacion()">
            <span class="agregar-icono">➕</span>
            <span>Agregar grupo</span>
          </div>
        ` : ''}
      </div>
      
      <div class="poblacion-resumen">
        <h4>Resumen de Población</h4>
        <div class="resumen-stats">
          <div class="stat-item">
            <span class="stat-label">Total colonos:</span>
            <span class="stat-valor">${cuotasUsadas * CONVERSION.CUOTA_POBLACION}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Mod. Calidad:</span>
            <span class="stat-valor ${calcularModCalidadPoblacion() >= 0 ? 'positivo' : 'negativo'}">
              ${formatearValor(calcularModCalidadPoblacion())}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Bono Inmigración:</span>
            <span class="stat-valor">${formatearValor(calcularBonoInmigracionPoblacion())}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function actualizarPoblacion(idx, campo, valor) {
  if (wizardState.poblacion[idx]) {
    wizardState.poblacion[idx][campo] = valor;
    renderizarPantalla();
  }
}

function ajustarCantidadPoblacion(idx, delta) {
  if (wizardState.poblacion[idx]) {
    const nuevaCantidad = wizardState.poblacion[idx].cantidad + delta;
    const totalActual = wizardState.poblacion.reduce((sum, p, i) => sum + (i === idx ? 0 : p.cantidad), 0);

    if (nuevaCantidad >= 1 && totalActual + nuevaCantidad <= 4) {
      wizardState.poblacion[idx].cantidad = nuevaCantidad;
      renderizarPantalla();
    }
  }
}

function agregarConfigPoblacion() {
  const cuotasUsadas = wizardState.poblacion.reduce((sum, p) => sum + p.cantidad, 0);
  if (cuotasUsadas < 4) {
    wizardState.poblacion.push({ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 1 });
    renderizarPantalla();
  }
}

function eliminarConfigPoblacion(idx) {
  if (wizardState.poblacion.length > 1) {
    wizardState.poblacion.splice(idx, 1);
    renderizarPantalla();
  }
}

function calcularModCalidadPoblacion() {
  return wizardState.poblacion.reduce((sum, config) => {
    const nat = NATURALEZAS_POBLACION[config.naturaleza];
    return sum + (nat?.modCalidad || 0) * config.cantidad;
  }, 0);
}

function calcularBonoInmigracionPoblacion() {
  return wizardState.poblacion.reduce((sum, config) => {
    const nat = NATURALEZAS_POBLACION[config.naturaleza];
    return sum + (nat?.bonoInmigracion || 0) * config.cantidad;
  }, 0);
}

// =====================================================
// PASO 6: EDIFICIOS
// =====================================================
function renderizarPasoEdificios() {
  const esPrimero = wizardState.esPrimerAsentamiento ?? true;

  // Asegurar inicialización
  if (!wizardState.edificios) {
    wizardState.edificios = [];
    if (!esPrimero) {
      // Si no es el primero, asignar Zona Residencial automáticamente
      wizardState.edificios = ["Zona Residencial"];
    }
  }

  const limiteEdificios = esPrimero ? 3 : 1;
  const seleccionados = wizardState.edificios.length;

  return `
    <div class="paso-contenido paso-edificios">
      <h3>🏗️ Construcciones Iniciales</h3>
      <p>
        ${esPrimero
      ? `Como primer asentamiento, puedes elegir <strong>3 edificios</strong> iniciales.`
      : `Los asentamientos adicionales comienzan solo con <strong>Zona Residencial</strong>.`}
      </p>

      <div class="edificios-grid">
        ${EDIFICIOS_INICIALES.map(edificio => {
        const esSeleccionado = wizardState.edificios.includes(edificio);
        const esBloqueado = !esPrimero && edificio === "Zona Residencial";
        const esDeshabilitado = !esSeleccionado && seleccionados >= limiteEdificios && esPrimero;

        return `
            <div class="opcion-card ${esSeleccionado ? 'seleccionado' : ''} ${esDeshabilitado ? 'deshabilitado' : ''}"
                 onclick="${!esBloqueado && (!esDeshabilitado || esSeleccionado) ? `toggleEdificio('${edificio}')` : ''}">
              <div class="opcion-header">
                <span class="opcion-icono">🏠</span>
                <span class="opcion-nombre">${edificio}</span>
              </div>
              <div class="opcion-check">
                ${esSeleccionado ? '✅' : '⬜'}
              </div>
            </div>
          `;
      }).join('')}
      </div>
      
      <div class="seleccion-resumen">
        ${seleccionados}/${limiteEdificios} edificios seleccionados
      </div>
    </div>
  `;
}

function toggleEdificio(nombre) {
  const esPrimero = wizardState.esPrimerAsentamiento ?? true;
  if (!esPrimero) return;

  const index = wizardState.edificios.indexOf(nombre);

  if (index >= 0) {
    wizardState.edificios.splice(index, 1);
  } else {
    if (wizardState.edificios.length < 3) {
      wizardState.edificios.push(nombre);
    }
  }
  renderizarPantalla();
}

// =====================================================
// PASO 7: CONFIRMACIÓN (EDITABLE)
// =====================================================
function renderizarPasoConfirmacion() {
  // Asegurar que las propiedades existan
  if (!wizardState.propiedades) wizardState.propiedades = [];
  if (!wizardState.peculiaridades) wizardState.peculiaridades = [];
  if (!wizardState.recursos) wizardState.recursos = {};

  const bonificaciones = calcularBonificaciones(wizardState.propiedades, wizardState.peculiaridades);
  const biomaActual = wizardState.biomaFusionado || BIOMAS_BASE[wizardState.biomaBase];

  const allProps = wizardState.propiedades.concat(wizardState.peculiaridades);
  const modificadoresPropiedades = calcularModificadoresRecursos(allProps);

  // Separar según lógica correcta
  const beneficios = [];
  const penalizaciones = [];

  Object.entries(bonificaciones).forEach(([stat, val]) => {
    if (val === 0) return;
    const esInvertida = esStatInvertida(stat);
    const esBueno = esInvertida ? (val < 0) : (val > 0);
    if (esBueno) beneficios.push([stat, val]);
    else penalizaciones.push([stat, val]);
  });

  const recursosActivos = Object.entries(wizardState.recursos)
    .filter(([, data]) => data.abundancia !== 'Inexistente');

  return `
    <div class="paso-contenido paso-confirmacion">
      <div class="confirmacion-header">
        <div class="confirmacion-icono">${biomaActual?.icono || '🏕️'}</div>
        <input type="text" class="input-nombre-confirmacion" value="${wizardState.nombre || ''}" 
               onchange="actualizarNombre(this.value)" placeholder="Nombre del asentamiento" />
        <div class="badges-confirmacion">
          <span class="badge-grado">Estamento (Grado 1)</span>
          <span class="badge-bioma">${wizardState.biomaFusionado?.nombre || wizardState.biomaBase}</span>
          <select class="select-magia-confirmacion ${wizardState.influenciaMagica.toLowerCase()}" 
                  onchange="cambiarInfluenciaMagica(this.value)">
            ${Object.keys(INFLUENCIA_MAGICA).map(nivel => `
              <option value="${nivel}" ${wizardState.influenciaMagica === nivel ? 'selected' : ''}>
                ${INFLUENCIA_MAGICA[nivel]?.icono} ${nivel}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <div class="confirmacion-seccion">
        <h4>🌍 Propiedades <small>(volver a paso 3 para editar)</small></h4>
        <div class="tags-lista">
          ${wizardState.propiedades.map(p => `
            <span class="tag">${PROPIEDADES[p]?.icono} ${p}</span>
          `).join('')}
        </div>
      </div>
      
      ${wizardState.peculiaridades.length > 0 ? `
        <div class="confirmacion-seccion">
          <h4>✨ Peculiaridades</h4>
          <div class="tags-lista">
            ${wizardState.peculiaridades.map(p => `
              <span class="tag ${wizardState.peculiaridadFija === p ? 'fija' : ''}">${PECULIARIDADES[p]?.icono} ${p}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="confirmacion-seccion recursos-seccion">
        <h4>📦 Recursos Disponibles <span class="editable-hint">(✏️ Editable)</span></h4>
        <div class="recursos-tabla-final">
          <div class="recursos-tabla-header-final">
            <span>Recurso</span>
            <span>Abundancia</span>
            <span>Mod. Abund.</span>
            <span>Mod. Prop.</span>
            <span>Mod. Total</span>
            <span>Pob. Asignada</span>
            <span>Prod./Turno</span>
          </div>
          ${recursosActivos.map(([nombre, data]) => {
    const modAbundancia = obtenerModificadorAbundancia(data.abundancia);
    const modPropiedades = modificadoresPropiedades[nombre] || 0;
    const modTotal = modAbundancia + modPropiedades;

    return `
              <div class="recurso-row-final ${obtenerClaseAbundancia(data.abundancia)}">
                <span class="recurso-nombre-final">
                  ${RECURSOS[nombre]?.icono || '📦'} ${nombre}
                </span>
                <div class="abundancia-cell-editable">
                  <select onchange="cambiarAbundanciaConfirmacion('${nombre}', this.value)" 
                          class="select-abundancia-mini ${obtenerClaseAbundancia(data.abundancia)}">
                    ${Object.keys(NIVELES_ABUNDANCIA).map(nivel => `
                      <option value="${nivel}" ${data.abundancia === nivel ? 'selected' : ''}>${nivel}</option>
                    `).join('')}
                  </select>
                </div>
                <span class="mod-cell ${modAbundancia > 0 ? 'positivo' : modAbundancia < 0 ? 'negativo' : 'neutro'}">
                  ${modAbundancia !== 0 ? formatearValor(modAbundancia) : '-'}
                </span>
                <span class="mod-cell ${modPropiedades > 0 ? 'positivo' : modPropiedades < 0 ? 'negativo' : 'neutro'}">
                  ${modPropiedades !== 0 ? formatearValor(modPropiedades) : '-'}
                </span>
                <span class="mod-total-cell ${modTotal > 0 ? 'positivo' : modTotal < 0 ? 'negativo' : 'neutro'}">
                  ${modTotal !== 0 ? formatearValor(modTotal) : '0'}
                </span>
                <span class="poblacion-cell">-</span>
                <span class="produccion-cell">-</span>
              </div>
            `;
  }).join('')}
        </div>
        
        ${recursosActivos.length === 0 ? `
          <p class="sin-recursos-nota">No hay recursos configurados. Vuelve al paso 4 para tirar los dados.</p>
        ` : ''}
      </div>
      
      <div class="confirmacion-seccion">
        <h4>📊 Modificadores Totales del Terreno</h4>
        <div class="bonificaciones-grid">
          <div class="bonificaciones-columna positivas">
            <h5>✅ Beneficios</h5>
            ${beneficios.length > 0 ? beneficios.map(([stat, val]) => `
              <div class="bonificacion-item positivo">
                <span class="stat-nombre">${stat}</span>
                <span class="stat-valor">${formatearValor(val)}</span>
              </div>
            `).join('') : '<p class="sin-bonificaciones">Ninguno</p>'}
          </div>
          <div class="bonificaciones-columna negativas">
            <h5>⚠️ Penalizaciones</h5>
            ${penalizaciones.length > 0 ? penalizaciones.map(([stat, val]) => `
              <div class="bonificacion-item negativo">
                <span class="stat-nombre">${stat}</span>
                <span class="stat-valor">${formatearValor(val)}</span>
              </div>
            `).join('') : '<p class="sin-bonificaciones">Ninguna</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function cambiarInfluenciaMagica(nuevoNivel) {
  if (INFLUENCIA_MAGICA[nuevoNivel]) {
    wizardState.influenciaMagica = nuevoNivel;
    renderizarPantalla();
  }
}

// Función para cambiar abundancia desde confirmación
function cambiarAbundanciaConfirmacion(recurso, nivel) {
  if (nivel === 'Inexistente') {
    delete wizardState.recursos[recurso];
  } else {
    wizardState.recursos[recurso] = {
      ...wizardState.recursos[recurso],
      abundancia: nivel
    };
  }
  renderizarPantalla();
}

// =====================================================
// MANEJADORES DE EVENTOS DEL WIZARD
// =====================================================

function actualizarNombre(valor) {
  wizardState.nombre = valor;
}

// Funciones para imagen personalizada
function cargarImagenPersonalizada(input) {
  const file = input.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    mostrarNotificacion('Por favor selecciona un archivo de imagen válido', 'error');
    return;
  }

  // Limitar tamaño a 2MB
  if (file.size > 2 * 1024 * 1024) {
    mostrarNotificacion('La imagen es muy grande. Máximo 2MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    wizardState.imagenPersonalizada = e.target.result;
    renderizarPantalla();
    mostrarNotificacion('Imagen cargada correctamente', 'success');
  };
  reader.readAsDataURL(file);
}

function cargarImagenDesdeURL(url) {
  if (!url || url.trim() === '') return;

  // Validar que parece una URL de imagen
  const urlLower = url.toLowerCase();
  if (urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) || urlLower.includes('data:image')) {
    wizardState.imagenPersonalizada = url.trim();
    renderizarPantalla();
    mostrarNotificacion('Imagen URL cargada', 'success');
  } else {
    // Intentar cargarla de todas formas
    wizardState.imagenPersonalizada = url.trim();
    renderizarPantalla();
    mostrarNotificacion('URL cargada (verificar validez)', 'warning');
  }
}

function eliminarImagenPersonalizada() {
  wizardState.imagenPersonalizada = null;
  renderizarPantalla();
  mostrarNotificacion('Imagen eliminada', 'info');
}

function togglePeculiaridad(nombre) {
  if (wizardState.peculiaridadFija === nombre) return; // No permitir quitar la fija

  const idx = wizardState.peculiaridades.indexOf(nombre);
  if (idx >= 0) {
    wizardState.peculiaridades.splice(idx, 1);
  } else {
    wizardState.peculiaridades.push(nombre);
  }
  renderizarPantalla();
}

function pasoAnterior() {
  if (wizardState.paso > 1) {
    wizardState.paso--;
    renderizarPantalla();
  }
}

function pasoSiguiente() {
  if (wizardState.paso === 1 && !wizardState.nombre.trim()) {
    mostrarError('Por favor, ingresa un nombre para tu asentamiento');
    return;
  }

  if (wizardState.paso === 2) {
    // Require at least 1 biome selected
    const seleccionados = wizardState.biomasSeleccionados || [];
    if (seleccionados.length === 0) {
      mostrarError('Por favor, selecciona al menos un bioma.');
      return;
    }
  }

  if (wizardState.paso === 5) {
    const esPrimero = wizardState.esPrimerAsentamiento ?? true;
    const totalCuotas = esPrimero ? 4 : 1;
    const cuotasUsadas = (wizardState.poblacion || []).reduce((sum, p) => sum + p.cantidad, 0);
    if (cuotasUsadas !== totalCuotas) {
      mostrarError(`Debes asignar exactamente ${totalCuotas} cuotas de población. Actualmente tienes ${cuotasUsadas}.`);
      return;
    }
  }

  if (wizardState.paso === 6) {
    const esPrimero = wizardState.esPrimerAsentamiento ?? true;
    const numEdificios = wizardState.edificios ? wizardState.edificios.length : 0;
    if (esPrimero && numEdificios < 3) {
      mostrarError('Debes seleccionar 3 construcciones iniciales para tu primer asentamiento.');
      return;
    }
  }

  if (wizardState.paso < 7) {
    // Al pasar al paso de recursos, inicializar garantizados
    if (wizardState.paso === 3) {
      inicializarRecursosGarantizados();
    }
    wizardState.paso++;
    renderizarPantalla();
  }
}

function inicializarRecursosGarantizados() {
  const biomaActual = wizardState.biomaFusionado || BIOMAS_BASE[wizardState.biomaBase];
  if (!biomaActual) return;

  // Recursos garantizados entran en Normal automáticamente
  const garantizados = biomaActual.recursosGarantizados || [];
  garantizados.forEach(recurso => {
    if (!wizardState.recursos[recurso]) {
      wizardState.recursos[recurso] = {
        abundancia: "Normal",
        tirada: null,
        esGarantizado: true,
        esExotico: false
      };
    }
  });

  // Exóticos garantizados también
  const exoticosGarantizados = biomaActual.exoticosGarantizados || [];
  exoticosGarantizados.forEach(recurso => {
    if (!wizardState.recursos[recurso]) {
      wizardState.recursos[recurso] = {
        abundancia: "Normal",
        tirada: null,
        esGarantizado: true,
        esExotico: true
      };
    }
  });
}

function volverInicio() {
  estadoApp.pantalla = 'inicio';
  renderizarPantalla();
}

function confirmarCreacion() {
  if (!wizardState.nombre.trim()) {
    mostrarError('El asentamiento necesita un nombre');
    return;
  }

  try {
    // Usar crearAsentamiento con los parámetros de expedición
    const esPrimero = wizardState.esPrimerAsentamiento ?? true;
    const conectadoA = wizardState.conectadoA ?? null;

    const nuevoAsentamiento = {
      id: Date.now(),
      nombre: wizardState.nombre,
      fechaCreacion: new Date().toISOString(),
      grado: "Estamento",
      propiedades: wizardState.propiedades,
      peculiaridades: wizardState.peculiaridades,
      tributo: "Sin Tributo",
      edificios: wizardState.edificios || [],
      poblacion: wizardState.poblacion,
      recursos: wizardState.recursos,
      // Campos de expedición
      esPrimerAsentamiento: esPrimero,
      conectadoA: conectadoA,
      doblones: esPrimero ? 50 : 0
    };

    nuevoAsentamiento.tiradaD12 = wizardState.tiradaD12;
    nuevoAsentamiento.esBiomaEspecial = wizardState.esBiomaEspecial;
    nuevoAsentamiento.biomaBase = wizardState.biomaBase;
    nuevoAsentamiento.biomaEspecial = wizardState.biomaEspecial;
    nuevoAsentamiento.subBioma = wizardState.subBioma;
    nuevoAsentamiento.biomaFusionado = wizardState.biomaFusionado;
    nuevoAsentamiento.influenciaMagica = wizardState.influenciaMagica;
    nuevoAsentamiento.peculiaridadFija = wizardState.peculiaridadFija;
    nuevoAsentamiento.imagenPersonalizada = wizardState.imagenPersonalizada;


    // Inicializar estado de simulación
    if (typeof resetearSimulacion === 'function') resetearSimulacion();

    // Establecer recursos iniciales basados en tipo de asentamiento
    if (typeof estadoSimulacion !== 'undefined') {
      estadoSimulacion.doblones = esPrimero ? 50 : 0;
      estadoSimulacion.almacen = esPrimero ? { "Alimento": 20 } : { "Alimento": 0 };

      // Inicializar estado de edificios
      if (wizardState.edificios && Array.isArray(wizardState.edificios)) {
        wizardState.edificios.forEach(nombreEdificio => {
          if (typeof nombreEdificio === 'string') {
            estadoSimulacion.edificiosEstado[nombreEdificio] = { grado: 1 };
          }
        });
      }
    }

    // Validar población antes de inicializar
    if (!wizardState.poblacion || !Array.isArray(wizardState.poblacion)) {
      console.warn("Población no válida en confirmarCreacion, usando defecto");
      wizardState.poblacion = esPrimero
        ? [{ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 4 }]
        : [{ rol: "Plebeyo", naturaleza: "Neutral", cantidad: 1 }];
    }

    if (typeof inicializarPoblacion === 'function') {
      inicializarPoblacion(wizardState.poblacion);
    } else {
      throw new Error("Función inicializarPoblacion no encontrada");
    }

    // Guardar estado inicial en el asentamiento (copia profunda básica)
    if (typeof estadoSimulacion !== 'undefined') {
      nuevoAsentamiento.simulacion = JSON.parse(JSON.stringify(estadoSimulacion));
    } else {
      throw new Error("estadoSimulacion no definido");
    }

    // Agregar a la expedición
    if (agregarAsentamientoExpedicion(nuevoAsentamiento)) {
      // Guardar expedición completa
      guardarExpedicion();
      mostrarNotificacion(`✅ Asentamiento "${nuevoAsentamiento.nombre}" creado`);

      // Volver a la lista de asentamientos
      estadoApp.pantalla = 'lista';
      renderizarPantalla();
    } else {
      // Fallback: guardar como asentamiento individual (sin expedición)
      estadoApp.asentamiento = nuevoAsentamiento;
      guardarAsentamiento(nuevoAsentamiento);
      estadoApp.pantalla = 'hud';
      renderizarPantalla();
    }
  } catch (err) {
    console.error("Error en confirmarCreacion:", err);
    alert("Error al crear asentamiento: " + err.message);
  }
}

// =====================================================
// HUD PRINCIPAL
// =====================================================

function renderizarHUD(container) {
  const a = estadoApp.asentamiento;
  const stats = calcularEstadisticasTotales(a);
  const biomaActual = a.biomaFusionado || BIOMAS_BASE[a.biomaBase];
  const modificadoresPropiedades = calcularModificadoresRecursos(a.propiedades);

  // Quick stats calculations
  const poblacionTotal = estadoSimulacion?.poblacion?.length || 0;
  const doblones = estadoSimulacion?.doblones || 0;
  const alimentosEnAlmacen = estadoSimulacion?.almacen?.["Alimento"] || 0;
  const calidad = stats.calidadTotal;

  container.innerHTML = `
    <div class="hud-container">
      <!-- HEADER PRINCIPAL -->
      <header class="hud-header">
        <div class="hud-header-left">
          ${a.imagenPersonalizada
      ? `<img src="${a.imagenPersonalizada}" class="hud-imagen-personalizada" alt="${a.nombre}">`
      : `<span class="hud-icono-grande">${biomaActual?.icono || GRADOS[a.grado]?.icono || '🏕️'}</span>`
    }
          <div class="hud-info-asentamiento">
            <h1 class="hud-nombre">${a.nombre}</h1>
            <div class="hud-meta">
              <span class="hud-grado">${a.grado}</span>
              <span class="hud-bioma">${a.biomaFusionado?.nombre || a.biomaBase}</span>
              <span class="hud-magia ${a.influenciaMagica?.toLowerCase()}">${INFLUENCIA_MAGICA[a.influenciaMagica]?.icono} ${a.influenciaMagica}</span>
            </div>
          </div>
        </div>
        
        <div class="hud-header-center">
          <div class="hud-quick-stats">
            <div class="quick-stat" title="Cuotas de Población">
              <span class="qs-icon">👥</span>
              <span class="qs-value">${poblacionTotal}</span>
              <span class="qs-label">Población</span>
            </div>
            <div class="quick-stat" title="Doblones disponibles">
              <span class="qs-icon">💰</span>
              <span class="qs-value ${doblones < 0 ? 'negativo' : ''}">${doblones}</span>
              <span class="qs-label">Doblones</span>
            </div>
            <div class="quick-stat" title="Influencia política">
              <span class="qs-icon">🏛️</span>
              <span class="qs-value">${estadoSimulacion?.recursosEspeciales?.influencia || 0}</span>
              <span class="qs-label">Influencia</span>
            </div>
            <div class="quick-stat" title="Alimento en almacén">
              <span class="qs-icon">🌾</span>
              <span class="qs-value ${alimentosEnAlmacen < poblacionTotal ? 'warning' : ''}">${alimentosEnAlmacen}</span>
              <span class="qs-label">Alimento</span>
            </div>
            <div class="quick-stat" title="Calidad Total del Asentamiento">
              <span class="qs-icon">⭐</span>
              <span class="qs-value ${calidad >= 0 ? 'positivo' : 'negativo'}">${calidad >= 0 ? '+' : ''}${calidad}</span>
              <span class="qs-label">Calidad</span>
            </div>
          </div>
        </div>
        
        <div class="hud-header-right">
          <button class="btn-header" onclick="volverALista()" title="Ver Expedición">📋</button>
          <button class="btn-header" onclick="mostrarOpciones()" title="Opciones">⚙️</button>
        </div>
      </header>
      
      <!-- PANEL DE TRIBUTO -->
      ${renderizarPanelTributo(a, stats)}
      
      ${estadoSimulacion && estadoSimulacion.esHambruna ? `
        <div class="alerta-hambruna">
            ☠️ ¡HAMBRUNA! Sin alimentos: Calidad -8, Crecimiento detenido
        </div>
      ` : ''}

      ${renderizarNavegacionHUD()}
      
      <div class="hud-contenido-dinamico">
        ${renderizarContenidoPestana(a, stats)}
      </div>
    </div>
  `;
}

// Estado de navegación del HUD

// Panel de Tributo desplegable
function renderizarPanelTributo(a, stats) {
  const tributoActual = a.tributo || "Sin Tributo";
  const tributoData = TRIBUTOS[tributoActual] || TRIBUTOS["Sin Tributo"];
  const poblacionTotal = estadoSimulacion?.poblacion?.length || 0;
  const limiteAdmin = stats.grado.admin || 10;
  const poblacionTributable = Math.min(poblacionTotal, limiteAdmin);
  const ingresosEstimados = poblacionTributable * tributoData.doblones;

  return `
    <details class="panel-tributo">
      <summary class="tributo-resumen">
        <span class="tributo-icono">${tributoData.icono}</span>
        <span class="tributo-titulo">Tributo: <strong>${tributoActual}</strong></span>
        <span class="tributo-preview">
          +${ingresosEstimados} 💰/turno | ${tributoData.calidad >= 0 ? '+' : ''}${tributoData.calidad} ⭐
        </span>
      </summary>
      <div class="tributo-contenido">
        <div class="tributo-info">
          <p>
            <strong>Límite Administrativo:</strong> ${limiteAdmin} cuotas 
            (Población actual: ${poblacionTotal})
          </p>
          <p class="tributo-nota">
            ⚠️ Solo puedes cobrar tributo a un máximo de <strong>${limiteAdmin}</strong> cuotas de población.
          </p>
        </div>
        
        <div class="tributo-opciones">
          ${Object.entries(TRIBUTOS).map(([nombre, data]) => {
    const esActual = nombre === tributoActual;
    const ingresosPrev = poblacionTributable * data.doblones;
    return `
              <div class="tributo-opcion ${esActual ? 'activa' : ''}" onclick="cambiarTributo('${nombre}')">
                <div class="tributo-opcion-header">
                  <span class="tributo-opcion-icono">${data.icono}</span>
                  <span class="tributo-opcion-nombre">${nombre}</span>
                  ${esActual ? '<span class="badge-actual">✓ Actual</span>' : ''}
                </div>
                <div class="tributo-opcion-stats">
                  <span class="stat-doblones">+${data.doblones} 💰/cuota</span>
                  <span class="stat-calidad ${data.calidad >= 0 ? 'positivo' : 'negativo'}">
                    ${data.calidad >= 0 ? '+' : ''}${data.calidad} ⭐ Calidad
                  </span>
                </div>
                <div class="tributo-opcion-preview">
                  Estimado: <strong>+${ingresosPrev}</strong> Doblones/turno
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>
    </details>
  `;
}

function cambiarTributo(nuevoTributo) {
  if (!TRIBUTOS[nuevoTributo]) return;

  // Actualizar en el asentamiento
  if (estadoApp.asentamiento) {
    estadoApp.asentamiento.tributo = nuevoTributo;

    // Guardar cambios
    if (typeof guardarExpedicion === 'function') {
      guardarExpedicion();
    }

    renderizarPantalla();

    if (typeof mostrarNotificacion === 'function') {
      const data = TRIBUTOS[nuevoTributo];
      mostrarNotificacion(`${data.icono} Tributo cambiado a: ${nuevoTributo}`, 'info');
    }
  }
}


function cambiarPestana(nombre) {
  pestanaActiva = nombre;
  renderizarPantalla();
}

function renderizarNavegacionHUD() {
  const pestanas = [
    { id: 'bioma', icono: '🌿', label: 'Bioma' },
    { id: 'poblacion', icono: '👥', label: 'Población' },
    { id: 'edificios', icono: '🏛️', label: 'Edificios' },
    { id: 'almacenamiento', icono: '📦', label: 'Almacén' },
    { id: 'comercio', icono: '⚖️', label: 'Comercio' },
    { id: 'militar', icono: '⚔️', label: 'Militar' },
    { id: 'diplomacia', icono: '🤝', label: 'Diplomacia' },
    { id: 'devocion', icono: '🙏', label: 'Devoción' }
  ];

  const turnoActual = estadoSimulacion?.turno || 0;
  const puedeDeshacer = estadoSimulacion?.historialTurnos?.length > 0;

  return `
    <nav class="hud-nav">
      <div class="nav-turno">
        <span class="turno-badge">
          <span class="turno-icono">📅</span>
          <span class="turno-numero">${turnoActual}</span>
        </span>
      </div>
      
      <div class="nav-tabs-container">
        ${pestanas.map(p => `
          <button class="nav-tab ${pestanaActiva === p.id ? 'activa' : ''}" 
                  onclick="cambiarPestana('${p.id}')"
                  title="${p.label}">
            <span class="tab-icono">${p.icono}</span>
            <span class="tab-label">${p.label}</span>
          </button>
        `).join('')}
      </div>
      
      <div class="nav-acciones">
        <button class="btn-turno btn-deshacer ${!puedeDeshacer ? 'disabled' : ''}" 
                onclick="btnDeshacerTurno()" 
                ${!puedeDeshacer ? 'disabled' : ''}
                title="Deshacer último turno">
          ⏪
        </button>
        <button class="btn-turno btn-avanzar" onclick="btnPasarTurno()" title="Pasar al siguiente turno">
          Turno ⏩
        </button>
      </div>
    </nav>
  `;
}

function renderizarContenidoPestana(a, stats) {
  switch (pestanaActiva) {
    case 'militar': return renderizarPestanaMilitar(a, stats);
    case 'diplomacia': return renderizarPestanaDiplomacia(a, stats);
    case 'devocion': return renderizarPestanaDevocion(a, stats);
    case 'poblacion': return renderizarPestanaPoblacion(a, stats);
    case 'bioma': return renderizarPestanaBioma(a, stats);
    case 'edificios': return renderizarPestanaEdificios(a, stats);
    case 'almacenamiento': return renderizarPestanaAlmacenamiento(a, stats);
    case 'comercio': return renderizarPestanaComercio(a, stats);
    default: return renderizarPestanaBioma(a, stats);
  }
}

function renderizarPestanaResumen(a, stats) {
  const modificadoresPropiedades = calcularModificadoresRecursos(a.propiedades);
  return `
      <div class="hud-stats-principales">
        <div class="stat-card">
          <span class="stat-icono">⭐</span>
          <div class="stat-info">
            <span class="stat-label">Calidad</span>
            <span class="stat-value">${stats.calidadTotal}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icono">📋</span>
          <div class="stat-info">
            <span class="stat-label">Admin</span>
            <span class="stat-value">${stats.grado.admin}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icono">⚔️</span>
          <div class="stat-info">
            <span class="stat-label">Guarnición</span>
            <span class="stat-value">${stats.grado.guarnicion}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icono">⚔️</span>
          <div class="stat-info">
            <span class="stat-label">Guarnición</span>
            <span class="stat-value">${stats.grado.guarnicion}</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icono">📦</span>
          <div class="stat-info">
            <span class="stat-label">Almacén</span>
            <span class="stat-value">${stats.grado.almacenamiento}</span>
          </div>
        </div>
        
        <!-- Crecimiento Stat Calculated with Famine Logic -->
        ${(() => {
      // Recalculate Logic locally for display
      const recursos = a.recursos || {};
      const produccionBioma = calcularProduccionTotal(recursos, stats.calidadTotal);
      const produccionEdificios = calcularProduccionEdificios(a.edificios || [], stats);
      const prodAlimento = (produccionBioma["Alimento"]?.medidas || 0) + (produccionEdificios["Alimento"]?.total || 0);
      const consum = (estadoSimulacion?.poblacion?.length || 0) * 1;
      const balance = prodAlimento - consum;

      // Base Immigration
      const gradoData = GRADOS[a.grado];
      let inmigracion = gradoData.inmigracion + stats.calidadTotal;
      if (estadoSimulacion?.poblacion) {
        estadoSimulacion.poblacion.forEach(c => {
          if (NATURALEZAS_POBLACION[c.naturaleza]) inmigracion += NATURALEZAS_POBLACION[c.naturaleza].bonoInmigracion;
        });
      }
      // Natural Reproduction
      const plebeyos = estadoSimulacion ? estadoSimulacion.poblacion.filter(c => c.rol === 'Plebeyo').length : 0;
      let reproduccion = plebeyos;
      let esDeficit = false;

      if (balance < 0) {
        reproduccion = 0;
        esDeficit = true;
      }

      const total = Math.max(0, inmigracion) + reproduccion;

      return `
            <div class="stat-card ${esDeficit ? 'alerta-borde' : ''}">
              <span class="stat-icono">🌱</span>
              <div class="stat-info">
                <span class="stat-label">Crecimiento</span>
                <span class="stat-value ${esDeficit ? 'texto-error' : ''}">
                    ${esDeficit ? '⚠️' : '+'} ${total}
                </span>
                ${esDeficit ? '<span style="font-size:0.6rem; color:#ef4444;">Falta comida</span>' : ''}
              </div>
            </div>`;
    })()}
      </div>
      
      <div class="hud-paneles">
          
          <div class="panel panel-poblacion">
            <h3>👥 Gestión de Población</h3>
             <div class="panel-contenido">
                <div class="poblacion-resumen-hud">
                    <div class="stat-mini">
                        <span>Total:</span> <strong>${stats.poblacionTotal || obtenerPoblacionTotalHelper()}</strong>
                    </div>
                    <div class="stat-mini">
                         <span>Ociosos:</span> <strong class="texto-ocioso">${obtenerPoblacionOciosaHelper()}</strong>
                    </div>
                </div>

                <div class="lista-cuotas-hud">
                    ${renderizarListaCuotasPoblacion()}
                </div>
            </div>
          </div>

          <div class="panel panel-bioma">
            <h3>🌍 Bioma y Propiedades</h3>

          <div class="panel-contenido">
            <div class="bioma-seccion">
              <h4>Propiedades</h4>
              <div class="tags-mini">
                ${a.propiedades.map(p => `<span class="tag-mini">${PROPIEDADES[p]?.icono} ${p}</span>`).join('')}
              </div>
            </div>
            ${a.peculiaridades?.length > 0 ? `
              <div class="bioma-seccion">
                <h4>Peculiaridades</h4>
                <div class="tags-mini">
                  ${a.peculiaridades.map(p => `<span class="tag-mini ${a.peculiaridadFija === p ? 'fija' : ''}">${PECULIARIDADES[p]?.icono} ${p}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="panel panel-recursos">
          <h3>📦 Recursos del Territorio</h3>
          <div class="panel-contenido">
            ${renderizarRecursosHUD(a.recursos, modificadoresPropiedades)}
          </div>
        </div>
        
        <div class="panel panel-bonificaciones">
          <h3>📊 Modificadores</h3>
          <div class="panel-contenido bonificaciones-lista">
            ${renderizarListaBonificaciones(stats.bonificaciones)}
          </div>
        </div>
      </div>
      
      <div class="hud-footer">
        <p>Sistema de Control Personal</p>
      </div>
    </div>
  `;
}

function renderizarRecursosHUD(recursos, modificadoresPropiedades) {
  const recursosActivos = Object.entries(recursos || {})
    .filter(([, data]) => data.abundancia !== 'Inexistente');

  if (recursosActivos.length === 0) {
    return '<p class="sin-recursos">No hay recursos activos</p>';
  }

  return `
    <div class="recursos-hud-lista">
      ${recursosActivos.map(([nombre, data]) => {
    const modProp = modificadoresPropiedades[nombre] || 0;
    const modAbund = obtenerModificadorAbundancia(data.abundancia);
    const modTotal = modProp + modAbund;

    return `
          <div class="recurso-hud ${obtenerClaseAbundancia(data.abundancia)} ${data.esGarantizado ? 'garantizado' : ''}">
            <span class="recurso-icono">${RECURSOS[nombre]?.icono || '📦'}</span>
            <span class="recurso-nombre">${nombre}</span>
            <span class="recurso-abundancia">${data.abundancia}</span>
            <span class="recurso-mod ${modTotal > 0 ? 'positivo' : modTotal < 0 ? 'negativo' : 'neutro'}">${formatearValor(modTotal)}</span>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

function renderizarListaBonificaciones(bonificaciones) {
  const entries = Object.entries(bonificaciones);
  if (entries.length === 0) {
    return '<p class="sin-bonificaciones">Sin modificadores activos</p>';
  }

  return entries.map(([stat, val]) => `
    <div class="bonificacion-row ${obtenerClaseColor(stat, val)}">
      <span class="bonificacion-stat">${stat}</span>
      <span class="bonificacion-valor">${formatearValor(val)}</span>
    </div>
  `).join('');
}

function mostrarOpciones() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-contenido">
      <h3>⚙️ Opciones</h3>
      <div class="modal-opciones">
        <button class="btn-opcion" onclick="this.closest('.modal-overlay').remove()">
          ← Volver al HUD
        </button>
        <button class="btn-opcion btn-peligro" onclick="confirmarReinicio()">
          🗑️ Eliminar Asentamiento
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function confirmarReinicio() {
  if (confirm('¿Estás seguro de que quieres eliminar tu asentamiento? Esta acción no se puede deshacer.')) {
    eliminarAsentamiento();
    estadoApp.asentamiento = null;
    estadoApp.pantalla = 'inicio';
    document.querySelector('.modal-overlay')?.remove();
    renderizarPantalla();
  }
}

function mostrarError(mensaje) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('visible'), 10);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function renderizarListaBonificaciones(bonificaciones) {
  if (!bonificaciones || Object.keys(bonificaciones).length === 0) {
    return '<p class="sin-bonificaciones">Sin modificadores activos</p>';
  }

  return Object.entries(bonificaciones).map(([stat, valor]) => {
    if (valor === 0) return '';
    const claseColor = obtenerClaseColor(stat, valor);
    return `
            <div class="bonificacion-item ${claseColor}">
                <span class="bono-nombre">${stat}</span>
                <span class="bono-valor">${formatearValor(valor)}</span>
            </div>
        `;
  }).join('');
}


function renderizarPestanaMilitar(a, stats) {
  return `<div class="panel panel-full"><h3>⚔️ Militar</h3><div class="panel-contenido"><p>En construcción...</p></div></div>`;
}

function renderizarPestanaDiplomacia(a, stats) {
  return `<div class="panel panel-full"><h3>🤝 Diplomacia</h3><div class="panel-contenido"><p>En construcción...</p></div></div>`;
}

function renderizarPestanaDevocion(a, stats) {
  return `<div class="panel panel-full"><h3>🙏 Devoción</h3><div class="panel-contenido"><p>En construcción...</p></div></div>`;
}

function renderizarPestanaPoblacion(a, stats) {
  const tiposPoblacion = ["Neutral", "Positiva", "Negativa", "Monstruo", "Artificial"];
  const iconosTipo = { Neutral: "⚪", Positiva: "🌟", Negativa: "🌑", Monstruo: "👹", Artificial: "🤖" };

  // Conteo por tipo
  const counts = { Neutral: 0, Positiva: 0, Negativa: 0, Monstruo: 0, Artificial: 0 };
  let total = 0;

  if (estadoSimulacion.poblacion) {
    total = estadoSimulacion.poblacion.length;
    estadoSimulacion.poblacion.forEach(p => {
      const k = p.naturaleza || "Neutral";
      counts[k] = (counts[k] || 0) + 1;
    });
  }

  // Cálculos de inmigración
  const gradoData = GRADOS[a.grado];
  const baseInmigracion = gradoData.inmigracion;
  const modCalidad = stats.calidadTotal;
  let bonoMonstruos = 0;

  if (estadoSimulacion?.poblacion) {
    estadoSimulacion.poblacion.forEach(c => {
      const nat = typeof NATURALEZAS_POBLACION !== 'undefined' ? NATURALEZAS_POBLACION[c.naturaleza] : null;
      if (nat) bonoMonstruos += nat.bonoInmigracion;
    });
  }

  const totalInmigracion = Math.max(0, baseInmigracion + modCalidad + bonoMonstruos);
  const tipoInmigracionActual = estadoSimulacion.tipoInmigracion || "Neutral";

  // Balance alimentos (solo poblaciones que consumen)
  const recursos = a.recursos || {};
  const produccionBioma = calcularProduccionTotal(recursos, stats.calidadTotal);
  const produccionEdificios = calcularProduccionEdificios(a.edificios || [], stats);
  const prodAlimento = (produccionBioma["Alimento"]?.medidas || 0) + (produccionEdificios["Alimento"]?.total || 0);

  // Solo cuentan las poblaciones que consumen alimentos
  const cuotasQueConsumen = estadoSimulacion.poblacion?.filter(c => {
    const nat = NATURALEZAS_POBLACION?.[c.naturaleza];
    return nat?.consumeAlimento !== false;
  }).length || 0;

  const consumo = cuotasQueConsumen;
  const balanceAlimentos = prodAlimento - consumo;
  const puedeReproducir = balanceAlimentos >= 0;

  // Pendientes por tipo
  const pendientes = estadoSimulacion.inmigracionPendientePorTipo || {};
  const metaConsolidacion = CONVERSION.CUOTA_POBLACION;

  // Reproducción por tipo (estimación para UI, respetando puedeReproducir de cada naturaleza)
  const reproduccionPorTipo = {};
  if (puedeReproducir && estadoSimulacion.poblacion) {
    estadoSimulacion.poblacion.forEach(c => {
      if (c.rol === "Plebeyo") {
        const t = c.naturaleza || "Neutral";
        const nat = NATURALEZAS_POBLACION?.[t];
        // Solo reproduce si la naturaleza lo permite
        if (nat?.puedeReproducir !== false) {
          reproduccionPorTipo[t] = (reproduccionPorTipo[t] || 0) + 1;
        }
      }
    });
  }

  return `
    <div class="panel panel-full" style="margin-bottom:1rem;">
        <h3>👥 Población del Asentamiento</h3>
        <div class="panel-contenido">
            
            <!-- Resumen Total -->
            <div style="display:flex; align-items:center; gap:20px; margin-bottom:1rem; padding:1rem; background:rgba(255,255,255,0.08); border-radius:8px;">
                <div style="text-align:center;">
                    <span style="font-size:2rem; font-weight:bold;">${total}</span>
                    <br><small>Cuotas Totales</small>
                </div>
                <div style="flex:1; display:flex; flex-wrap:wrap; gap:8px;">
                    ${tiposPoblacion.map(tipo => {
    const c = counts[tipo] || 0;
    if (c === 0) return '';
    const esDominante = c === Math.max(...Object.values(counts));
    return `
                            <div style="background:${esDominante ? 'rgba(100,200,100,0.2)' : 'rgba(255,255,255,0.05)'}; padding:0.4rem 0.8rem; border-radius:4px; display:flex; align-items:center; gap:6px; ${esDominante ? 'border:1px solid rgba(100,200,100,0.5);' : ''}">
                                <span>${iconosTipo[tipo]}</span>
                                <strong>${c}</strong>
                                <small style="opacity:0.7;">${tipo}</small>
                                ${esDominante ? '<span title="Dominante" style="font-size:0.7rem;">👑</span>' : ''}
                            </div>
                        `;
  }).join('')}
                </div>
            </div>
            
            <!-- Desglose Individual de Población -->
            <details style="margin-bottom:1rem;">
                <summary style="cursor:pointer; padding:0.5rem; background:rgba(255,255,255,0.05); border-radius:4px;">📋 Ver desglose individual (${total} cuotas)</summary>
                <div style="max-height:200px; overflow-y:auto; margin-top:0.5rem; padding:0.5rem; background:rgba(0,0,0,0.2); border-radius:4px;">
                    ${estadoSimulacion.poblacion?.map((p, idx) => {
    const icon = iconosTipo[p.naturaleza] || '⚪';
    const subtipo = p.naturaleza === 'Artificial' && p.subtipo ? ` (${iconosTipo[p.subtipo] || '⚪'} ${p.subtipo})` : '';
    return `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.3rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                                <span>${icon} <strong>#${p.id}</strong> ${p.naturaleza}${subtipo}</span>
                                <span style="opacity:0.7;">${p.rol} ${p.asignacion ? '🔧 ' + p.asignacion : '⏸️ Ocioso'}</span>
                            </div>
                        `;
  }).join('') || '<p>No hay población.</p>'}
                </div>
            </details>

            <!-- Selector de Tipo de Inmigración -->
            <div style="margin-bottom:1rem; padding:1rem; background:rgba(0,100,200,0.1); border-radius:8px; border-left:3px solid #4a9eff;">
                <label style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <span>🌍 Tipo de Inmigración:</span>
                    <select onchange="cambiarTipoInmigracion(this.value)" style="padding:0.4rem; border-radius:4px; background:#333; color:#fff; border:1px solid #555;">
                        ${tiposPoblacion.map(t => `
                            <option value="${t}" ${tipoInmigracionActual === t ? 'selected' : ''}>${iconosTipo[t]} ${t}</option>
                        `).join('')}
                    </select>
                    <small style="opacity:0.7;">(+${totalInmigracion} medidas/turno)</small>
                </label>
                
                ${tipoInmigracionActual === 'Artificial' ? `
                    <div style="margin-top:0.8rem; padding-top:0.8rem; border-top:1px solid rgba(255,255,255,0.1);">
                        <label style="display:flex; align-items:center; gap:10px;">
                            <span>🤖 Subtipo Artificial:</span>
                            <select onchange="cambiarSubtipoArtificial(this.value)" style="padding:0.4rem; border-radius:4px; background:#333; color:#fff; border:1px solid #555;">
                                ${["Neutral", "Positiva", "Negativa", "Monstruo"].map(s => `
                                    <option value="${s}" ${(estadoSimulacion.subtipoInmigracionArtificial || 'Neutral') === s ? 'selected' : ''}>${iconosTipo[s]} ${s}</option>
                                `).join('')}
                            </select>
                            <small style="opacity:0.7;">(define el subtipo de nuevas cuotas Artificiales)</small>
                        </label>
                        <p style="margin:0.5rem 0 0 0; font-size:0.85rem; opacity:0.7;">
                            ℹ️ Los Artificiales no comen, no crecen, cuestan 1 Doblón/turno y pueden tener un subtipo base.
                        </p>
                    </div>
                ` : ''}
            </div>

            ${!puedeReproducir ? `
                <div style="padding:0.8rem; background:rgba(255,0,0,0.15); border-radius:6px; margin-bottom:1rem; border-left:3px solid #ff4444;">
                    ⚠️ <strong>Hambruna:</strong> El crecimiento natural está detenido por falta de alimentos.
                </div>
            ` : ''}

            <!-- Barras de Progreso por Tipo -->
            <h4 style="margin-top:1rem; margin-bottom:0.5rem;">📈 Progreso de Crecimiento por Tipo</h4>
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${tiposPoblacion.map(tipo => {
    const pendiente = pendientes[tipo] || 0;
    const reprod = reproduccionPorTipo[tipo] || 0;
    const inmig = tipoInmigracionActual === tipo ? totalInmigracion : 0;
    const crecimientoTurno = reprod + inmig;
    const porcentaje = Math.min(100, (pendiente / metaConsolidacion) * 100);
    const activo = counts[tipo] > 0 || pendiente > 0 || inmig > 0;

    if (!activo) return '';

    return `
                        <div style="background:rgba(255,255,255,0.05); padding:0.8rem; border-radius:6px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
                                <span>${iconosTipo[tipo]} <strong>${tipo}</strong> <small style="opacity:0.6;">(${counts[tipo]} cuotas)</small></span>
                                <span style="font-size:0.85rem;">
                                    ${reprod > 0 ? `<span style="color:#8f8;">+${reprod} reprod</span>` : ''}
                                    ${inmig > 0 ? `<span style="color:#88f;">+${inmig} inmig</span>` : ''}
                                </span>
                            </div>
                            <div class="barra-progreso-container" style="margin:0;">
                                <div class="barra-track" style="height:12px;">
                                    <div class="barra-fill" style="width:${porcentaje}%; background:${porcentaje >= 100 ? '#4f4' : '#4a9eff'};"></div>
                                </div>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; opacity:0.7; margin-top:0.2rem;">
                                <span>${pendiente} / ${metaConsolidacion}</span>
                                ${pendiente >= metaConsolidacion ? '<span style="color:#4f4;">✨ ¡Nueva cuota lista!</span>' : ''}
                            </div>
                        </div>
                    `;
  }).join('')}
            </div>

        </div>
    </div>
  `;
}


function renderizarPestanaBioma(a, stats) {
  const recursos = a.recursos || {};
  const produccionBioma = calcularProduccionTotal(recursos, stats.calidadTotal, stats.bonificaciones || {});
  const produccionEdificios = calcularProduccionEdificios(a.edificios || [], stats);

  // Biome Info
  const biomaDef = a.biomaFusionado || BIOMAS_BASE[a.biomaBase] || {};
  const nombreBioma = biomaDef.nombre || a.biomaBase;
  const descripcion = biomaDef.descripcion || '';

  // Peculiaridades - handle both array and legacy singular
  const peculiaridades = a.peculiaridades || (a.peculiaridad ? [a.peculiaridad] : []);
  const peculiarText = peculiaridades.length > 0
    ? peculiaridades.map(pec => {
      const pecData = PECULIARIDADES && PECULIARIDADES[pec];
      return `${pecData?.icono || ''} ${pec}`;
    }).join(', ')
    : 'Ninguna';

  const bonusesHTML = Object.entries(stats.bonificaciones || {}).map(([k, v]) => {
    if (v === 0) return '';
    return `<li>${k}: <strong>${v > 0 ? '+' : ''}${v}</strong></li>`;
  }).join('');

  // Tables Logic (Simplified Reuse)
  // ... Copied mostly from original PestanaProduccion ...
  const totalCuotas = estadoSimulacion.poblacion ? estadoSimulacion.poblacion.length : 0;
  const consumoAlimentos = totalCuotas;
  const pBioma = produccionBioma["Alimento"]?.medidas || 0;
  const pEdif = produccionEdificios["Alimento"]?.total || 0;
  const bal = (pBioma + pEdif) - consumoAlimentos;

  return `
    <div class="panel panel-full">
         <h3>🌿 Bioma: ${nombreBioma}</h3>
         <div class="bioma-info" style="margin-bottom:1rem; padding:1rem; background:rgba(255,255,255,0.05); border-radius:6px;">
             <p><strong>Peculiaridades:</strong> ${peculiarText}</p>
             <p>${descripcion}</p>
             ${Object.keys(stats.bonificaciones).length > 0 ?
      `<div style="margin-top:0.5rem; background:rgba(0,0,0,0.2); padding:0.5rem; border-radius:4px;">
                  <strong>Bonificadores Totales:</strong>
                  <ul style="padding-left:1.2rem; margin:0.5rem 0; font-size:0.9rem;">${bonusesHTML}</ul>
                </div>` : ''}
         </div>
         
         <hr class="separador-seccion">

         <h3>⚒️ Explotación de Recursos</h3>
         <div class="panel-contenido">
            
             <!-- Tabla Recursos Bioma -->
             <div class="seccion-produccion">
                <h4>🌍 Recursos Naturales</h4>
                ${Object.keys(recursos).length === 0 ? '<p style="opacity:0.7;">No hay recursos definidos en este bioma.</p>' : `
                <table class="tabla-produccion">
                    <thead><tr><th>Recurso</th><th>Abundancia</th><th>Trabajadores</th><th>Producción</th></tr></thead>
                    <tbody>
                        ${Object.entries(recursos).map(([nombre, data]) => {
        const prodData = produccionBioma[nombre];
        const esActiva = prodData && prodData.tipo === 'activa';
        const almacenado = estadoSimulacion?.almacen?.[nombre] || 0;
        const asignados = (estadoSimulacion.poblacion || []).filter(p => p.asignacion === nombre).length;
        const abundancia = data.abundancia || 'Normal';
        const claseAbundancia = abundancia === 'Abundante' ? 'positivo' : (abundancia === 'Escaso' ? 'negativo' : '');

        return `<tr class="${esActiva ? 'fila-activa' : 'fila-pasiva'}">
                                <td>
                                    <span class="recurso-icono">${RECURSOS[nombre]?.icono || '📦'}</span> 
                                    <strong>${nombre}</strong> 
                                    <small>(${almacenado} en almacén)</small>
                                </td>
                                <td class="${claseAbundancia}">${abundancia}</td>
                                <td>
                                    <div class="asignacion-control">
                                        <span>${asignados}</span>
                                        <div class="btn-group-sm">
                                            <button onclick="event.stopPropagation(); asignarPoblacionRecurso('${nombre}', -1)" ${asignados <= 0 ? 'disabled' : ''}>-</button>
                                            <button onclick="event.stopPropagation(); asignarPoblacionRecurso('${nombre}', 1)">+</button>
                                        </div>
                                    </div>
                                </td>
                                <td><strong>${prodData?.medidas || 0}</strong> ${asignados > 0 ? '(activa)' : '(pasiva)'}</td>
                            </tr>`;
      }).join('')}
                    </tbody>
                </table>
                `}
             </div>
         </div>
    </div>
  `;
}


// Helper para modificar cantidad directamente desde la tabla
function modificarCantidadRecurso(recurso, delta) {
  if (!estadoSimulacion || !estadoSimulacion.almacen) return;

  if (!estadoSimulacion.almacen[recurso]) estadoSimulacion.almacen[recurso] = 0;
  estadoSimulacion.almacen[recurso] += delta;

  if (estadoSimulacion.almacen[recurso] <= 0) {
    delete estadoSimulacion.almacen[recurso];
  }
  renderizarPantalla();
}

// Helper para determinar si es manufactura
function esManufactura(nombreRecurso) {
  if (typeof RECETAS_MANUFACTURA === 'undefined') return false;
  // Check if name appears as output in any recipe
  return Object.values(RECETAS_MANUFACTURA).some(cat =>
    Object.values(cat).some(rec => {
      if (rec.output && rec.output.Recurso === nombreRecurso) return true;
      if (rec.opcion_a && rec.opcion_a.output && rec.opcion_a.output.Recurso === nombreRecurso) return true;
      if (rec.opcion_b && rec.opcion_b.output && rec.opcion_b.output.Recurso === nombreRecurso) return true;
      return false;
    })
  );
}

function renderizarPestanaAlmacenamiento(a, stats) {
  const almacen = estadoSimulacion?.almacen || {};
  const subPestanaAlmacen = estadoApp.subPestanaAlmacen || 'inventario';

  // Stats Barra
  const capacidadMaxCuotas = stats.grado.almacenamiento;
  const capacidadMaxMedidas = capacidadMaxCuotas * 10;
  const ocupado = Object.values(almacen).reduce((sum, val) => sum + val, 0);
  const porcentaje = Math.min(100, (ocupado / capacidadMaxMedidas) * 100);
  const estadoBarra = porcentaje >= 100 ? 'critico' : porcentaje >= 80 ? 'alerta' : 'normal';

  return `
    <div class="panel panel-full panel-almacenamiento">
        <div class="almacen-header">
             <div class="stat-card stat-doblones">
                <span class="stat-icono">💰</span>
                <div class="stat-info">
                    <span class="stat-label">Tesoro</span>
                    <span class="stat-value">${estadoSimulacion?.doblones || 0} Doblones</span>
                </div>
            </div>

            <div class="almacen-capacidad">
                <div class="barra-info">
                    <span>${ocupado} / ${capacidadMaxMedidas} Medidas</span>
                    <span>${Math.round(porcentaje)}%</span>
                </div>
                <div class="barra-track">
                    <div class="barra-fill ${estadoBarra}" style="width: ${porcentaje}%"></div>
                </div>
            </div>
        </div>

        <!-- Sub-pestañas de Almacenamiento -->
        <nav class="almacen-subtabs">
            <button class="almacen-subtab ${subPestanaAlmacen === 'inventario' ? 'activa' : ''}" 
                    onclick="cambiarSubPestanaAlmacen('inventario')">
                📦 Inventario
            </button>
            <button class="almacen-subtab ${subPestanaAlmacen === 'balance' ? 'activa' : ''}" 
                    onclick="cambiarSubPestanaAlmacen('balance')">
                📊 Balance de Recursos
            </button>
        </nav>

        ${subPestanaAlmacen === 'inventario'
      ? renderizarSubPestanaInventario(almacen, stats)
      : renderizarSubPestanaBalance(a, stats)}
    </div>
    `;
}

function cambiarSubPestanaAlmacen(subPestana) {
  estadoApp.subPestanaAlmacen = subPestana;
  renderizarPantalla();
}

function renderizarSubPestanaInventario(almacen, stats) {
  // Separar y Ordenar
  const itemsManufactura = [];
  const itemsBioma = [];

  Object.entries(almacen).forEach(([nombre, cantidad]) => {
    if (esManufactura(nombre)) {
      itemsManufactura.push({ nombre, cantidad });
    } else {
      itemsBioma.push({ nombre, cantidad });
    }
  });

  // Sort Descending by Quantity
  itemsManufactura.sort((a, b) => b.cantidad - a.cantidad);
  itemsBioma.sort((a, b) => b.cantidad - a.cantidad);

  const renderTable = (items, title, icon) => {
    if (items.length === 0) return `
        <div class="almacen-seccion">
            <h3>${icon} ${title}</h3>
            <p class="sin-recursos">Vacío</p>
        </div>`;

    return `
        <div class="almacen-seccion">
            <h3>${icon} ${title}</h3>
            <table class="tabla-almacen">
                <thead>
                    <tr>
                        <th width="50%">Recurso</th>
                        <th width="20%">Cantidad</th>
                        <th width="30%">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                <span class="item-icono">${RECURSOS[item.nombre]?.icono || '📦'}</span>
                                ${item.nombre}
                            </td>
                            <td><strong>${item.cantidad}</strong></td>
                            <td>
                                <div class="acciones-fila">
                                    <button class="btn-mini" onclick="modificarCantidadRecurso('${item.nombre}', -10)">-10</button>
                                    <button class="btn-mini" onclick="modificarCantidadRecurso('${item.nombre}', -1)">-1</button>
                                    <button class="btn-mini" onclick="modificarCantidadRecurso('${item.nombre}', 1)">+1</button>
                                    <button class="btn-mini" onclick="modificarCantidadRecurso('${item.nombre}', 10)">+10</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
      `;
  };

  return `
    <div class="almacen-secciones-grid">
        ${renderTable(itemsManufactura, "Manufacturas", "🏭")}
        ${renderTable(itemsBioma, "Bioma / Natural", "🌍")}
    </div>

    <div class="form-tipificacion" style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
        <h4>➕ Tipificar Nuevo Recurso</h4>
        <div class="form-row" style="display: flex; gap: 10px; margin-top: 10px;">
            <select id="select-recurso-nuevo" class="select-form" style="flex: 2; background: #2a2a4a; color: white; border: 1px solid #444; padding: 5px;">
                <option value="">Seleccionar recurso...</option>
                ${Object.keys(RECURSOS)
      .sort()
      .map(r => `<option value="${r}">${RECURSOS[r].icono} ${r}</option>`).join('')}
            </select>
            <input type="number" id="input-cantidad-nueva" class="input-form" placeholder="Cant." min="0" value="0" style="flex: 1; background: #2a2a4a; color: white; border: 1px solid #444; padding: 5px;">
            <button class="btn-principal" style="padding: 5px 15px;" onclick="agregarRecursoDesdeUI()">Agregar</button>
        </div>
        <small style="color:#aaa; display:block; margin-top:5px;">Ahora puedes agregar recursos existentes para incrementar su stock.</small>
    </div>
  `;
}

function renderizarSubPestanaBalance(a, stats) {
  const recursos = a.recursos || {};
  const produccionBioma = calcularProduccionTotal(recursos, stats.calidadTotal, stats.bonificaciones || {});
  const produccionEdificios = calcularProduccionEdificios(a.edificios || [], stats);

  const totalCuotas = estadoSimulacion.poblacion ? estadoSimulacion.poblacion.length : 0;
  const consumoAlimentos = totalCuotas;

  // Calcular produccion total de alimentos (sumando todos los tipos)
  let produccionAlimentosTotal = 0;
  const desgloseAlimentos = {};

  // Helper para sumar si es alimento
  const procesarRecursoAlimento = (nombre, cantidad) => {
    if (cantidad <= 0) return;
    const def = RECURSOS[nombre];
    // Check if it's food (by name "Alimento", category "Alimento" or tag "Alimento")
    const esAlimento = nombre === "Alimento" ||
      (def && (def.categoria === "Alimento" || (def.tags && def.tags.includes("Alimento"))));

    if (esAlimento) {
      produccionAlimentosTotal += cantidad;
      desgloseAlimentos[nombre] = (desgloseAlimentos[nombre] || 0) + cantidad;
    }
  };

  // Sumar del Bioma
  Object.entries(produccionBioma).forEach(([nombre, data]) => {
    procesarRecursoAlimento(nombre, data.medidas || 0);
  });

  // Sumar de Edificios
  Object.entries(produccionEdificios).forEach(([nombre, data]) => {
    procesarRecursoAlimento(nombre, data.total || 0);
  });

  const balanceAlimento = produccionAlimentosTotal - consumoAlimentos;

  // Generar HTML del desglose
  const desgloseHTML = Object.entries(desgloseAlimentos)
    .map(([nombre, cant]) => `<div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#aaa;"><span>+ ${nombre}:</span> <span>${cant}</span></div>`)
    .join('');

  // === MANUFACTURA: Calcular input/output ===
  const manufacturaInputs = {};  // Recursos consumidos
  const manufacturaOutputs = {}; // Recursos producidos

  // Leer desde edificios del asentamiento (donde se guarda la receta)
  const edificiosAsentamiento = a.edificios || [];
  edificiosAsentamiento.forEach(instancia => {
    if (typeof instancia === 'string') return; // Skip legacy string format

    const edificioDef = typeof EDIFICIOS !== 'undefined' ? EDIFICIOS[instancia.nombre] : null;
    if (!edificioDef?.permiteManufactura || !instancia.receta) return;

    // Buscar trabajadores asignados
    const trabajadores = (estadoSimulacion?.poblacion || []).filter(p => p.asignacion === instancia.id).length;
    if (trabajadores <= 0) return;

    // Buscar la receta (manejar formato "key" o "key:opcion_a")
    if (typeof RECETAS_MANUFACTURA === 'undefined') return;

    const [recetaKey, opcion] = instancia.receta.includes(':')
      ? instancia.receta.split(':')
      : [instancia.receta, null];

    for (const categoria of Object.values(RECETAS_MANUFACTURA)) {
      const recetaBase = categoria[recetaKey];
      if (!recetaBase) continue;

      // Obtener la receta correcta (base u opción)
      let receta = recetaBase;
      if (opcion && recetaBase[opcion]) {
        receta = recetaBase[opcion];
      }

      // Inputs (consumo)
      const inputData = receta.input;
      if (inputData) {
        for (const [recurso, cantidad] of Object.entries(inputData)) {
          manufacturaInputs[recurso] = (manufacturaInputs[recurso] || 0) + (cantidad * trabajadores);
        }
      }

      // Outputs (producción)
      const outputData = receta.output;
      if (outputData && outputData.Recurso) {
        const recursoProd = outputData.Recurso;
        const cantidadProd = outputData.Cantidad || 1;
        manufacturaOutputs[recursoProd] = (manufacturaOutputs[recursoProd] || 0) + (cantidadProd * trabajadores);
      }
      break;
    }
  });

  // === BALANCE DOBLONES ===
  const tributoActual = a.tributo || "Sin Tributo";
  const tributoData = typeof TRIBUTOS !== 'undefined' ? (TRIBUTOS[tributoActual] || TRIBUTOS["Sin Tributo"]) : { doblones: 0, calidad: 0 };
  const limiteAdmin = stats.grado?.admin || 10;
  const poblacionTributable = Math.min(totalCuotas, limiteAdmin);
  const ingresosTributo = poblacionTributable * tributoData.doblones;

  // Mantenimiento - usar el valor precalculado que aplica modificadores correctamente
  const gastoMantenimiento = stats.mantenimientoEdificios || 0;

  const balanceDoblones = ingresosTributo - gastoMantenimiento;

  // Recopilar todos los recursos con producción
  const recursosConProduccion = new Set();
  Object.keys(produccionBioma).forEach(r => recursosConProduccion.add(r));
  Object.keys(produccionEdificios).forEach(r => recursosConProduccion.add(r));
  Object.keys(manufacturaInputs).forEach(r => recursosConProduccion.add(r));
  Object.keys(manufacturaOutputs).forEach(r => recursosConProduccion.add(r));

  // Calcular balance para cada recurso
  const balances = [];
  recursosConProduccion.forEach(recurso => {
    const prodBioma = produccionBioma[recurso]?.medidas || 0;
    const prodEdif = produccionEdificios[recurso]?.total || 0;
    const manufInput = manufacturaInputs[recurso] || 0;
    const manufOutput = manufacturaOutputs[recurso] || 0;
    let consumo = manufInput;

    // Consumo especial para Alimento
    if (recurso === "Alimento") {
      consumo += consumoAlimentos;
    }

    const neto = (prodBioma + prodEdif + manufOutput) - consumo;

    if (prodBioma !== 0 || prodEdif !== 0 || consumo !== 0 || manufOutput !== 0) {
      balances.push({
        recurso,
        prodBioma,
        prodEdif,
        manufOutput,
        consumo,
        neto,
        icono: RECURSOS[recurso]?.icono || '📦'
      });
    }
  });

  // Ordenar: Alimento primero, luego por nombre
  balances.sort((a, b) => {
    if (a.recurso === "Alimento") return -1;
    if (b.recurso === "Alimento") return 1;
    return a.recurso.localeCompare(b.recurso);
  });

  return `
    <div class="balance-recursos">
        <h4>📊 Balance de Recursos por Turno</h4>
        <p style="opacity:0.7; margin-bottom:1rem;">Este panel muestra cómo cambian tus recursos cada turno.</p>
        
        <!-- Balance Doblones destacado -->
        <div class="balance-destacado ${balanceDoblones >= 0 ? 'positivo' : 'negativo'}">
            <div class="balance-destacado-icono">💰</div>
            <div class="balance-destacado-info">
                <h5>Balance de Doblones</h5>
                <div class="balance-desglose">
                    <span>Tributos: <strong>+${ingresosTributo}</strong></span>
                    <span>Mantenimiento: <strong>-${gastoMantenimiento}</strong></span>
                </div>
            </div>
            <div class="balance-destacado-neto">
                <span class="neto-label">Neto</span>
                <span class="neto-value ${balanceDoblones >= 0 ? 'positivo' : 'negativo'}">
                    ${balanceDoblones >= 0 ? '+' : ''}${balanceDoblones}
                </span>
            </div>
        </div>

        <!-- Balance Alimentos destacado -->
        <div class="balance-destacado ${balanceAlimento >= 0 ? 'positivo' : 'negativo'}">
            <div class="balance-destacado-icono">🌾</div>
            <div class="balance-destacado-info">
                <h5>Balance de Alimentos</h5>
                <div class="balance-desglose" style="display:block;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Producción Total: <strong>+${produccionAlimentosTotal}</strong></span></div>
                    ${desgloseHTML ? `<div style="margin-left:5px; border-left:2px solid rgba(255,255,255,0.1); padding-left:8px; margin-bottom:8px;">${desgloseHTML}</div>` : ''}
                    <div style="display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px;"><span>Consumo: <strong>-${consumoAlimentos}</strong></span></div>
                </div>
            </div>
            <div class="balance-destacado-neto">
                <span class="neto-label">Neto</span>
                <span class="neto-value ${balanceAlimento >= 0 ? 'positivo' : 'negativo'}">
                    ${balanceAlimento >= 0 ? '+' : ''}${balanceAlimento}
                </span>
            </div>
        </div>

        <hr class="separador-seccion">

        <!-- Tabla de todos los recursos -->
        <h4>📦 Balance de Recursos</h4>
        ${balances.length > 0 ? `
        <table class="tabla-balance">
            <thead>
                <tr>
                    <th>Recurso</th>
                    <th>Bioma</th>
                    <th>Edificios</th>
                    <th>Manufact.</th>
                    <th>Consumo</th>
                    <th>Neto</th>
                </tr>
            </thead>
            <tbody>
                ${balances.map(b => `
                    <tr class="${b.neto > 0 ? 'fila-positiva' : b.neto < 0 ? 'fila-negativa' : ''}">
                        <td>
                            <span class="recurso-icono">${b.icono}</span>
                            ${b.recurso}
                        </td>
                        <td>${b.prodBioma > 0 ? '+' + b.prodBioma : (b.prodBioma || '-')}</td>
                        <td>${b.prodEdif > 0 ? '+' + b.prodEdif : (b.prodEdif || '-')}</td>
                        <td class="positivo">${b.manufOutput > 0 ? '+' + b.manufOutput : '-'}</td>
                        <td class="negativo">${b.consumo > 0 ? '-' + b.consumo : '-'}</td>
                        <td class="${b.neto >= 0 ? 'positivo' : 'negativo'}">
                            <strong>${b.neto >= 0 ? '+' : ''}${b.neto}</strong>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p style="opacity:0.6;">No hay producción de recursos activa.</p>'}
    </div>
  `;
}

function renderizarPestanaComercio(a, stats) {
  const historial = estadoSimulacion?.historialComercio || [];
  const turnoActual = estadoSimulacion?.turno || 0;

  // Ordenar historial por turno descendente (más recientes primero)
  const historialOrdenado = [...historial].sort((a, b) => b.turno - a.turno);

  const renderFormulario = () => `
    <div class="comercio-form">
        <h4>➕ Registrar Transacción</h4>
        <div class="form-grid-comercio">
            <div class="form-group">
                <label>Tipo</label>
                <select id="comercio-tipo" class="select-form">
                    <option value="entrada">📥 Entrada</option>
                    <option value="salida">📤 Salida</option>
                </select>
            </div>
            <div class="form-group">
                <label>Recurso</label>
                <select id="comercio-recurso" class="select-form">
                    <option value="">Seleccionar...</option>
                    <option value="Doblones">💰 Doblones</option>
                    ${Object.keys(RECURSOS)
      .sort()
      .map(r => `<option value="${r}">${RECURSOS[r].icono} ${r}</option>`)
      .join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Cantidad</label>
                <input type="number" id="comercio-cantidad" class="input-form" min="1" value="1" placeholder="Cantidad">
            </div>
            <div class="form-group">
                <label>Turno</label>
                <input type="number" id="comercio-turno" class="input-form" min="0" value="${turnoActual}" placeholder="Turno">
            </div>
            <div class="form-group">
                <label>Comerciante</label>
                <input type="text" id="comercio-comerciante" class="input-form" placeholder="Nombre del comerciante">
            </div>
            <div class="form-group form-action">
                <button class="btn-principal" onclick="agregarComercioDesdeUI()">
                    <span class="btn-icono">✓</span>
                    <span class="btn-texto">Registrar</span>
                </button>
            </div>
        </div>
        <small style="color:#aaa; display:block; margin-top:8px;">
            📌 Turno actual de la simulación: <strong>${turnoActual}</strong>
        </small>
    </div>
  `;

  const renderHistorial = () => {
    if (historialOrdenado.length === 0) {
      return `
        <div class="comercio-vacio">
            <div class="icono-vacio">📜</div>
            <p>No hay transacciones registradas.</p>
        </div>
      `;
    }

    return `
      <table class="tabla-comercio">
          <thead>
              <tr>
                  <th>Turno</th>
                  <th>Tipo</th>
                  <th>Recurso</th>
                  <th>Cantidad</th>
                  <th>Comerciante</th>
              </tr>
          </thead>
          <tbody>
              ${historialOrdenado.map(entry => `
                  <tr class="${entry.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-salida'}">
                      <td><strong>${entry.turno}</strong></td>
                      <td>
                          <span class="badge-tipo ${entry.tipo}">
                              ${entry.tipo === 'entrada' ? '📥 Entrada' : '📤 Salida'}
                          </span>
                      </td>
                      <td>
                          <span class="recurso-icono">${RECURSOS[entry.recurso]?.icono || '📦'}</span>
                          ${entry.recurso}
                      </td>
                      <td class="${entry.tipo === 'entrada' ? 'positivo' : 'negativo'}">
                          ${entry.tipo === 'entrada' ? '+' : '-'}${entry.cantidad}
                      </td>
                      <td>${entry.comerciante || '-'}</td>
                  </tr>
              `).join('')}
          </tbody>
      </table>
    `;
  };

  // Calcular resumen
  const resumen = historial.reduce((acc, entry) => {
    if (entry.tipo === 'entrada') {
      acc.entradas += entry.cantidad;
      acc.transaccionesEntrada++;
    } else {
      acc.salidas += entry.cantidad;
      acc.transaccionesSalida++;
    }
    return acc;
  }, { entradas: 0, salidas: 0, transaccionesEntrada: 0, transaccionesSalida: 0 });

  return `
    <div class="panel panel-full panel-comercio">
        <h3>⚖️ Centro de Comercio</h3>
        
        <div class="comercio-resumen">
            <div class="stat-comercio entrada">
                <span class="stat-icono">📥</span>
                <div class="stat-info">
                    <span class="stat-label">Entradas</span>
                    <span class="stat-value">${resumen.entradas} medidas</span>
                    <small>${resumen.transaccionesEntrada} transacciones</small>
                </div>
            </div>
            <div class="stat-comercio salida">
                <span class="stat-icono">📤</span>
                <div class="stat-info">
                    <span class="stat-label">Salidas</span>
                    <span class="stat-value">${resumen.salidas} medidas</span>
                    <small>${resumen.transaccionesSalida} transacciones</small>
                </div>
            </div>
            <div class="stat-comercio balance">
                <span class="stat-icono">📊</span>
                <div class="stat-info">
                    <span class="stat-label">Balance</span>
                    <span class="stat-value ${resumen.entradas - resumen.salidas >= 0 ? 'positivo' : 'negativo'}">
                        ${resumen.entradas - resumen.salidas >= 0 ? '+' : ''}${resumen.entradas - resumen.salidas}
                    </span>
                </div>
            </div>
        </div>

        ${renderFormulario()}
        
        <hr class="separador-seccion">
        
        <h4>📜 Historial de Transacciones</h4>
        ${renderHistorial()}
    </div>
    `;
}

function agregarRecursoDesdeUI() {
  const selector = document.getElementById('select-recurso-nuevo');
  const input = document.getElementById('input-cantidad-nueva');
  const recurso = selector.value;
  const cantidad = parseInt(input.value) || 0;

  if (!recurso) {
    alert("Selecciona un recurso");
    return;
  }

  if (estadoSimulacion) {
    if (!estadoSimulacion.almacen) estadoSimulacion.almacen = {};
    estadoSimulacion.almacen[recurso] = (estadoSimulacion.almacen[recurso] || 0) + cantidad;
    renderizarPantalla();
  }
}

function agregarComercioDesdeUI() {
  const tipo = document.getElementById('comercio-tipo')?.value;
  const recurso = document.getElementById('comercio-recurso')?.value;
  const cantidad = parseInt(document.getElementById('comercio-cantidad')?.value) || 0;
  const turno = parseInt(document.getElementById('comercio-turno')?.value) || 0;
  const comerciante = document.getElementById('comercio-comerciante')?.value || '';

  if (!recurso) {
    alert("Selecciona un recurso");
    return;
  }

  if (cantidad <= 0) {
    alert("La cantidad debe ser mayor a 0");
    return;
  }

  if (!estadoSimulacion) return;

  // Inicializar almacen si no existe
  if (!estadoSimulacion.almacen) estadoSimulacion.almacen = {};

  // Aplicar efecto en almacenamiento (Doblones se manejan por separado)
  if (recurso === 'Doblones') {
    // Doblones: usar estadoSimulacion.doblones
    if (tipo === 'entrada') {
      estadoSimulacion.doblones = (estadoSimulacion.doblones || 0) + cantidad;
    } else if (tipo === 'salida') {
      const actual = estadoSimulacion.doblones || 0;
      if (actual < cantidad) {
        alert(`No hay suficientes Doblones (${actual} disponibles)`);
        return;
      }
      estadoSimulacion.doblones = actual - cantidad;
    }
  } else {
    // Recursos normales: usar almacen
    if (tipo === 'entrada') {
      estadoSimulacion.almacen[recurso] = (estadoSimulacion.almacen[recurso] || 0) + cantidad;
    } else if (tipo === 'salida') {
      const actual = estadoSimulacion.almacen[recurso] || 0;
      if (actual < cantidad) {
        alert(`No hay suficiente ${recurso} en el almacén (${actual} disponibles)`);
        return;
      }
      estadoSimulacion.almacen[recurso] = actual - cantidad;
      if (estadoSimulacion.almacen[recurso] <= 0) {
        delete estadoSimulacion.almacen[recurso];
      }
    }
  }

  // Registrar en historial con turno manual
  if (typeof registrarComercio === 'function') {
    registrarComercio(recurso, cantidad, tipo, comerciante, turno);
  }

  // Mostrar notificación
  if (typeof mostrarNotificacion === 'function') {
    const icono = tipo === 'entrada' ? '📥' : '📤';
    mostrarNotificacion(`${icono} ${tipo === 'entrada' ? 'Entrada' : 'Salida'}: ${cantidad} ${recurso}`, 'exito');
  }

  // Actualizar pantalla
  renderizarPantalla();
}

// =====================================================
// HELPERS UI POBLACIÓN
// =====================================================

function obtenerPoblacionTotalHelper() {
  if (typeof obtenerPoblacionTotal === 'function') {
    return obtenerPoblacionTotal();
  }
  return 0;
}

function obtenerPoblacionOciosaHelper() {
  if (estadoSimulacion && estadoSimulacion.poblacion) {
    return estadoSimulacion.poblacion.filter(c => !c.asignacion).reduce((sum, c) => sum + c.medidas, 0);
  }
  return 0;
}

function renderizarListaCuotasPoblacion() {
  if (!estadoSimulacion || !estadoSimulacion.poblacion) return '<p>No hay población</p>';

  const cuotas = estadoSimulacion.poblacion;
  const recursosDisponibles = Object.keys(estadoApp.asentamiento.recursos || {});

  // Agrupar visualmente si es posible, o mostrar lista plana
  return cuotas.map(cuota => {
    const rolData = ROLES_POBLACION[cuota.rol];
    const natData = NATURALEZAS_POBLACION[cuota.naturaleza];
    const asignado = cuota.asignacion;

    return `
        <div class="cuota-card-hud ${asignado ? 'asignado' : 'ocioso'}">
            <div class="cuota-info">
                <span class="cuota-icono">${rolData?.icono || '👤'}</span>
                <div>
                   <div class="cuota-rol">${cuota.rol} <small>(${cuota.naturaleza})</small></div>
                   <div class="cuota-medidas">20 Colonos ${asignado ? '🔨 Trabajando' : '💤 Ociosos'}</div>
                </div>
            </div>
            <div class="cuota-accion">
                <select class="select-trabajo" onchange="asignarTrabajoDesdeUI(${cuota.id}, this.value)">
                    <option value="" ${!asignado ? 'selected' : ''}>-- Ocioso --</option>
                    ${recursosDisponibles.map(r => `
                        <option value="${r}" ${asignado === r ? 'selected' : ''}>⛏️ ${r}</option>
                    `).join('')}
                </select>
            </div>
        </div>
    `;
  }).join('');
}

function asignarTrabajoDesdeUI(idCuota, recurso) {
  // Check Capacity if resource is building
  if (recurso && recurso.startsWith('edificio')) {
    let capacidadTotal = 0;
    let asignados = 0;
    let nombreUI = "";

    const cuotas = estadoSimulacion.poblacion || [];

    // CASE 1: Specific Instance Assignment (New)
    if (recurso.startsWith('edificio_id:')) {
      const instanciaId = recurso.replace('edificio_id:', '');
      const inst = (estadoApp.asentamiento.edificios || []).find(e => typeof e === 'object' && e.id === instanciaId);

      if (inst) {
        nombreUI = inst.nombre;
        // Get Grade from simulation state for accuracy, fallback to object state
        let grado = inst.grado || 1;
        if (estadoSimulacion.edificiosEstado && estadoSimulacion.edificiosEstado[inst.id]) {
          grado = estadoSimulacion.edificiosEstado[inst.id].grado || 1;
        }
        capacidadTotal = calcularCapacidadEdificio(inst.nombre, grado);
        asignados = cuotas.filter(c => c.asignacion === recurso).length;
      }
    }
    // CASE 2: Generic Type Assignment (Legacy)
    else if (recurso.startsWith('edificio:')) {
      const nombreEdificio = recurso.replace('edificio:', '');
      nombreUI = nombreEdificio;

      // Count generic assignments
      asignados = cuotas.filter(c => c.asignacion === recurso).length;

      // Calculate Total Capacity
      const instancias = (estadoApp.asentamiento.edificios || []).filter(e =>
        (typeof e === 'string' ? e : e.nombre) === nombreEdificio
      );

      instancias.forEach(inst => {
        let grado = 1;
        if (typeof inst === 'object') {
          if (inst.id && estadoSimulacion.edificiosEstado && estadoSimulacion.edificiosEstado[inst.id]) {
            grado = estadoSimulacion.edificiosEstado[inst.id].grado || 1;
          } else {
            grado = inst.grado || 1;
          }
        }
        capacidadTotal += calcularCapacidadEdificio(nombreEdificio, grado);
      });
    }

    if (capacidadTotal > 0 && asignados >= capacidadTotal) {
      alert(`¡No hay más cupo en ${nombreUI}! (${asignados}/${capacidadTotal})`);
      renderizarPantalla(); // Reset UI to revert selection
      return;
    }
  }

  // Si recurso es string vacío, pasar null
  const recursoFinal = recurso === "" ? null : recurso;
  const exito = asignarPoblacionARecurso(idCuota, recursoFinal);
  if (exito) {
    actualizarHUD(); // Optimized update
  } else {
    console.error("Error al asignar trabajo");
  }
}

/**
 * Muestra modal para seleccionar a qu� asentamiento conectarse (M�ltiple) - V2
 */
function mostrarModalConexionV2() {
  const container = document.getElementById('app-container');
  const asentamientos = estadoApp.expedicion?.asentamientos || [];

  if (asentamientos.length === 0) {
    iniciarCreacionConOpciones(false, []);
    return;
  }

  const opcionesHTML = asentamientos.map(a =>
    '<div class="conexion-opcion">' +
    '<input type="checkbox" id="conexion-' + a.id + '" value="' + a.id + '" class="check-conexion">' +
    '<label for="conexion-' + a.id + '">' + a.nombre + ' (' + a.grado + ')</label>' +
    '</div>'
  ).join('');

  const modalHTML =
    '<div class="modal-overlay" id="modal-conexion">' +
    '<div class="modal-content">' +
    '<div class="modal-icono">🔗</div>' +
    '<h2>Conectar Asentamiento</h2>' +
    '<p>Selecciona los asentamientos a los que estar�s conectado (opcional):</p>' +

    '<div class="modal-campo lista-conexiones">' +
    opcionesHTML +
    '</div>' +

    '<div class="modal-acciones">' +
    '<button class="btn-principal" onclick="confirmarConexionV2()">' +
    '<span class="btn-icono">✓</span>' +
    '<span class="btn-texto">Continuar</span>' +
    '</button>' +
    '<button class="btn-secundario" onclick="cerrarModalConexion()">' +
    '<span class="btn-texto">Cancelar</span>' +
    '</button>' +
    '</div>' +

    '<button class="btn-cerrar-modal" onclick="cerrarModalConexion()">✕</button>' +
    '</div>' +
    '</div>';

  container.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Confirma la conexi�n y contin�a con la creaci�n - V2
 */
function confirmarConexionV2() {
  const checkboxes = document.querySelectorAll('.check-conexion:checked');
  const conexiones = Array.from(checkboxes).map(cb => parseInt(cb.value));

  cerrarModalConexion();
  iniciarCreacionConOpciones(false, conexiones);
}




// =====================================================
// HELPERS DE RECURSOS (TAGS)
// =====================================================

function calcularRecursosPorTag(tag) {
  let total = 0;
  const almacen = estadoSimulacion?.almacen || {};
  Object.entries(almacen).forEach(([res, cant]) => {
    const def = RECURSOS[res];
    if (def && def.tags && def.tags.includes(tag)) {
      total += cant;
    }
  });
  return total;
}

function consumirRecursosPorTag(tag, cantidadRequerida) {
  const almacen = estadoSimulacion?.almacen || {};
  let porConsumir = cantidadRequerida;

  // Encontrar candidatos
  const candidatos = [];
  Object.entries(almacen).forEach(([res, cant]) => {
    const def = RECURSOS[res];
    if (def && def.tags && def.tags.includes(tag)) {
      candidatos.push({ nombre: res, cantidad: cant, exotico: def.tags.includes('Exotico') });
    }
  });

  // Ordenar: Priorizar NO Exóticos (Normales) primero
  candidatos.sort((a, b) => {
    if (a.exotico === b.exotico) return 0;
    return a.exotico ? 1 : -1; // Normal goes first (false < true ?) false=0, true=1.
  });

  for (const item of candidatos) {
    if (porConsumir <= 0) break;
    const tomar = Math.min(item.cantidad, porConsumir);
    almacen[item.nombre] -= tomar;
    porConsumir -= tomar;
    if (almacen[item.nombre] <= 0) delete almacen[item.nombre];
  }
}

// =====================================================
// HELPERS DE COSTES (checkCostAffordability, consumeCostBlock)
// =====================================================

/**
 * Verifica si un bloque de costos es pagable.
 * @param {Object} costBlock - Objeto con recursos y cantidades { "Recurso": X, ... }
 * @param {number} multiplier - Multiplicador de costos (ej: 10)
 * @returns {Array} - Lista de recursos faltantes, vacía si es pagable
 */
function checkCostAffordability(costBlock, multiplier = 10) {
  const missing = [];
  if (!costBlock || typeof costBlock !== 'object') return missing;

  Object.entries(costBlock).forEach(([recurso, cantidad]) => {
    const cantidadReal = cantidad * multiplier;
    let disponible = 0;

    if (recurso === 'Doblones') {
      disponible = estadoSimulacion.doblones || 0;
    } else if (recurso.startsWith('Cualquier ')) {
      const tag = recurso.replace('Cualquier ', '');
      disponible = calcularRecursosPorTag(tag);
    } else {
      disponible = (estadoSimulacion.almacen && estadoSimulacion.almacen[recurso]) || 0;
    }

    if (disponible < cantidadReal) {
      missing.push(`${recurso} (${cantidadReal - disponible} faltan)`);
    }
  });

  return missing;
}

/**
 * Consume recursos de un bloque de costos.
 * @param {Object} costBlock - Objeto con recursos y cantidades
 * @param {number} multiplier - Multiplicador de costos
 */
function consumeCostBlock(costBlock, multiplier = 10) {
  if (!costBlock || typeof costBlock !== 'object') return;

  Object.entries(costBlock).forEach(([recurso, cantidad]) => {
    const cantidadReal = cantidad * multiplier;

    if (recurso === 'Doblones') {
      estadoSimulacion.doblones = (estadoSimulacion.doblones || 0) - cantidadReal;
    } else if (recurso.startsWith('Cualquier ')) {
      const tag = recurso.replace('Cualquier ', '');
      consumirRecursosPorTag(tag, cantidadReal);
    } else {
      // Recurso específico
      if (estadoSimulacion.almacen[recurso]) {
        estadoSimulacion.almacen[recurso] -= cantidadReal;
        if (estadoSimulacion.almacen[recurso] <= 0) {
          delete estadoSimulacion.almacen[recurso];
        }
      }
    }
  });
}

// =====================================================
// PESTAÑA DE EDIFICIOS
// =====================================================


function controlarPoblacionConstruccion(id, delta) {
  if (typeof asignarPoblacionConstruccion === 'function') {
    const constr = estadoSimulacion.construccionesEnProgreso.find(c => c.id === id);
    if (constr) {
      const current = constr.poblacionAsignada || 0;
      const newValue = Math.max(0, current + delta);
      // Optional: Check idle before adding?
      // For now allowing override, logic will be handled
      asignarPoblacionConstruccion(id, newValue);
      actualizarHUD();
    }
  } else {
    console.error('asignarPoblacionConstruccion no está definida');
  }
}

// === HELPERS DE ASIGNACIÓN (NUEVO SISTEMA) ===

function asignarPoblacionRecurso(recurso, delta) {
  if (!estadoSimulacion.poblacion) return;

  if (delta > 0) {
    // Assign: Find one unassigned
    const p = estadoSimulacion.poblacion.find(x => !x.asignacion);
    if (p) {
      p.asignacion = recurso;
      actualizarHUD();
    } else {
      console.log("No hay población ociosa");
      mostrarNotificacion("No hay población ociosa", "error");
    }
  } else {
    // Unassign: Find one assigned to this resource
    const p = estadoSimulacion.poblacion.find(x => x.asignacion === recurso);
    if (p) {
      p.asignacion = null;
      actualizarHUD();
    }
  }
}

function asignarPoblacionEdificio(edificioId, delta, rolRequerido) {
  if (!estadoSimulacion.poblacion) return;

  let token = `edificio_id:${edificioId}`;
  if (edificioId.includes('_legacy_')) {
    const name = edificioId.split('_legacy_')[0];
    token = `edificio:${name}`;
  }

  if (delta > 0) {
    // Find idle worker matching role
    const p = estadoSimulacion.poblacion.find(x =>
      !x.asignacion &&
      (!rolRequerido || rolRequerido === 'Cualquiera' || x.rol === rolRequerido)
    );
    if (p) {
      p.asignacion = token;
      actualizarHUD();
    } else {
      mostrarNotificacion("No hay población ociosa (o con rol adecuado)", "error");
    }
  } else {
    // Find worker assigned to this token
    const p = estadoSimulacion.poblacion.find(x => x.asignacion === token);
    if (p) {
      p.asignacion = null;
      actualizarHUD();
    }
  }
}

// Cambiar tipo de inmigración del asentamiento
function cambiarTipoInmigracion(tipo) {
  if (!estadoSimulacion) return;
  estadoSimulacion.tipoInmigracion = tipo;
  actualizarHUD();
}

// Cambiar subtipo para inmigración de Artificiales
function cambiarSubtipoArtificial(subtipo) {
  if (!estadoSimulacion) return;
  estadoSimulacion.subtipoInmigracionArtificial = subtipo;
  actualizarHUD();
}

function renderizarPestanaEdificios(a, stats) {
  const gradoActual = GRADOS[a.grado]?.nivel || 1;

  // === SECCIÓN 0: CONSTRUCCIONES EN PROGRESO ===
  let htmlProgreso = '';
  if (estadoSimulacion.construccionesEnProgreso && estadoSimulacion.construccionesEnProgreso.length > 0) {
    htmlProgreso += `<div class="seccion-progreso"><h3>🚧 Construcciones en Progreso</h3><div class="edificios-grid">`;
    estadoSimulacion.construccionesEnProgreso.forEach(c => {
      const edificio = EDIFICIOS[c.nombre];
      const esMejora = c.esMejora;
      const nombreDisplay = esMejora ? `Mejorando: ${c.nombre}` : `Construyendo: ${c.nombre}`;

      htmlProgreso += `
          <div class="edificio-card en-progreso">
             <div class="edificio-header">
                 <span class="icono">${edificio?.icono || '🔨'}</span>
                 <span class="nombre">${nombreDisplay}</span>
             </div>
             <div class="edificio-body">
                 <div class="barra-progreso-container">
                    <p class="progreso-texto">Puntos restantes: ${Math.max(0, c.turnosRestantes)} / ${c.turnosTotales}</p>
                 </div>
                 <div class="asignacion-poblacion">
                    <span class="label-trabajadores">👷 Trabajadores: ${c.poblacionAsignada}</span>
                    <div class="botones-asignacion">
                        <button onclick="controlarPoblacionConstruccion('${c.id}', -1)" class="btn-mini" ${c.poblacionAsignada <= 0 ? 'disabled' : ''}>-</button>
                        <button onclick="controlarPoblacionConstruccion('${c.id}', 1)" class="btn-mini">+</button>
                    </div>
                 </div>
                 <small style="color:#aaa; font-style:italic; display:block; margin-top:5px; font-size: 0.75rem;">
                    Cada trabajador avanza 1 punto por turno.
                 </small>
             </div>
          </div>
         `;
    });
    htmlProgreso += `</div></div><hr class="separador-seccion">`;
  }

  // === SECCIÓN 1: EDIFICIOS CONSTRUIDOS (INSTANCIAS) ===
  // Migración On-the-fly de strings a objetos (legacy support)
  const edificiosInstancias = (estadoApp.asentamiento.edificios || []).map((e, idx) => {
    if (typeof e === 'string') return { id: `${e}_legacy_${idx}`, nombre: e, receta: null };
    return e;
  });

  let htmlConstruidos = htmlProgreso; // Start with progress section

  if (edificiosInstancias.length > 0) {
    htmlConstruidos += `<div class="seccion-construidos"><h3>🏗️ Edificios Activos</h3><div class="edificios-grid">`;

    edificiosInstancias.forEach(instancia => {
      const edificio = EDIFICIOS[instancia.nombre];
      if (!edificio) return;

      // Control de Trabajadores
      let htmlTrabajadores = '';
      if (edificio.capacidad) {
        let token = `edificio_id:${instancia.id}`;
        if (instancia.id.includes('_legacy_')) token = `edificio:${instancia.nombre}`;

        const count = (estadoSimulacion.poblacion || []).filter(p => p.asignacion === token).length;

        let max = (edificio.capacidad.base || 0);
        if (edificio.capacidad.porGrado) {
          max += ((instancia.grado || 1) - 1) * edificio.capacidad.porGrado;
        }
        const rol = edificio.capacidad.rol || 'Cualquiera';

        htmlTrabajadores = `
            <div class="asignacion-poblacion" style="margin-top:0.5rem; padding: 0.5rem; background:rgba(0,0,0,0.2); border-radius:4px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="label-trabajadores" title="Rol: ${rol}" style="font-size:0.9rem;">👷 ${count} / ${max}</span>
                    <div class="botones-asignacion btn-group-sm">
                        <button onclick="event.stopPropagation(); asignarPoblacionEdificio('${instancia.id}', -1, '${rol}')" class="btn-mini" ${count <= 0 ? 'disabled' : ''}>-</button>
                        <button onclick="event.stopPropagation(); asignarPoblacionEdificio('${instancia.id}', 1, '${rol}')" class="btn-mini" ${count >= max ? 'disabled' : ''}>+</button>
                    </div>
                </div>
            </div>
          `;
      }

      // Receta Selector
      let htmlReceta = '';
      if (edificio.permiteManufactura) {
        const recetaActual = instancia.receta || '';
        // Buscar recetas
        const recetasDisponibles = [];
        // Check Global RECETAS_MANUFACTURA
        if (typeof RECETAS_MANUFACTURA !== 'undefined') {
          Object.values(RECETAS_MANUFACTURA).forEach(cat => {
            Object.entries(cat).forEach(([key, rec]) => {
              // Check compatibility: generic or specific
              if (!rec.edificio || rec.edificio === instancia.nombre || (rec.edificio === 'Manufactura' && instancia.nombre === 'Taller')) {
                if (rec.opcion_a && rec.opcion_b) {
                  recetasDisponibles.push({
                    k: `${key}:opcion_a`,
                    label: `${rec.opcion_a.output?.Recurso || 'Prod'} (Opción A)`,
                    output: rec.opcion_a.output
                  });
                  recetasDisponibles.push({
                    k: `${key}:opcion_b`,
                    label: `${rec.opcion_b.output?.Recurso || 'Prod'} (Opción B)`,
                    output: rec.opcion_b.output
                  });
                } else {
                  recetasDisponibles.push({ k: key, label: rec.output?.Recurso || 'Prod', ...rec });
                }
              }
            });
          });
        }

        // Selector HTML
        htmlReceta = `<div class="selector-receta">
                    <label>Producción:</label>
                    <select onchange="cambiarReceta('${instancia.id}', this.value)" class="input-receta">
                        <option value="">-- Detenido --</option>
                        ${recetasDisponibles.map(r => `<option value="${r.k}" ${recetaActual === r.k ? 'selected' : ''}>${r.label} (x${r.output?.Cantidad || 10})</option>`).join('')}
                    </select>
                </div>`;
      }

      // Mantenimiento INFO
      let htmlMant = '';
      if (edificio.maintenance || edificio.costoMantenimiento) {
        const mantCost = edificio.costoMantenimiento ? Object.entries(edificio.costoMantenimiento).map(([k, v]) => `${v} ${k}`).join(', ') : `${edificio.maintenance || 0} Doblones`;
        htmlMant = `<div class="info-mantenimiento">💸 Mant: ${mantCost}/turno</div>`;
      }

      htmlConstruidos += `
                <div class="edificio-card construido">
                    <div class="edificio-header">
                        <span class="icono">${edificio.icono}</span>
                        <span class="nombre">${instancia.nombre}</span>
                    </div>
                    ${htmlMant}
                    <div class="edificio-body">
                        ${edificio.descripcion}
                        ${htmlTrabajadores}
                        ${htmlReceta}
                        ${(instancia.grado || 1) < (edificio.maxGrado || 1) && edificio.costesMejora ?
          `<div class="accion-mejora" style="margin-top:0.5rem; border-top:1px dashed #555; padding-top:0.5rem;">
                                <small style="color:#aaa;">Grado ${instancia.grado || 1} / ${edificio.maxGrado}</small><br>
                                <button class="btn-construir" style="font-size:0.8rem; padding:0.4rem;" onclick="mostrarPopupMejora('${instancia.id}')">🔼 Mejorar</button>
                             </div>`
          : ''}
                    </div>
                </div>
            `;
    });
    htmlConstruidos += `</div></div><hr class="separador-seccion">`;
  }

  // === SECCIÓN 2: MENÚ DE CONSTRUCCIÓN (BLUEPRINTS) ===
  const categorias = {};
  Object.entries(EDIFICIOS).forEach(([nombre, data]) => {
    // Filtrar UNIQUE ya construidos (no multiplicity in v5, check if already built)
    const existingCount = edificiosInstancias.filter(e => e.nombre === nombre).length;
    // Skip if building is already built and can't have multiples (maxGrado <= 1 or not upgradeable)

    const cat = data.tipo || 'Otros';
    if (!categorias[cat]) categorias[cat] = [];
    categorias[cat].push({ nombre, ...data });
  });

  // Ordenar por Tier
  Object.keys(categorias).forEach(k => {
    categorias[k].sort((a, b) => (a.tier || 1) - (b.tier || 1));
  });

  // Función local para renderizar un Bloque de Costos (sea Options o Single)
  const renderCostBlock = (costBlock) => {
    return Object.entries(costBlock).map(([k, v]) => {
      const cantidadReal = v * 10; // Multiplicador 10 visual
      let disponible = 0;
      let label = k;

      if (k === 'Doblones') {
        disponible = estadoSimulacion.doblones || 0;
      } else if (k.startsWith('Cualquier ')) {
        const tag = k.replace('Cualquier ', '');
        disponible = calcularRecursosPorTag(tag);
      } else {
        disponible = (estadoSimulacion.almacen && estadoSimulacion.almacen[k]) || 0;
      }
      return `<span class="tag-coste ${disponible >= cantidadReal ? 'ok' : 'falta'}">${cantidadReal} ${label}</span>`;
    }).join('<span class="separador-mas">+</span>');
  };

  return `
    <div class="panel-edificios">
      <div class="edificios-header">
        <h3>🏗️ Gestión de Edificios</h3>
        <div class="edificios-stats">
          <span class="stat-badge">📊 Grado: ${a.grado}</span>
          <span class="stat-badge">🏠 Total: ${edificiosInstancias.length}</span>
        </div>
      </div>

      ${htmlConstruidos}
      
      <h3>📜 Proyectos Disponibles</h3>
      ${Object.entries(categorias).map(([cat, lista]) => `
          <div class="edificios-tier">
            <h4>${cat}</h4>
            <div class="edificios-grid">
              ${lista.map(edificio => {
    const costesRaw = edificio.costesG1 || [];

    let costesHtml = '';
    let isAffordable = false;

    // costesG1 is always an array of options
    if (Array.isArray(costesRaw) && costesRaw.length > 0) {
      costesHtml = costesRaw.map(opt => `<div class="coste-opcion">${renderCostBlock(opt)}</div>`).join('<div class="separador-opcion">-- Ó --</div>');
      isAffordable = costesRaw.some(opt => checkCostAffordability(opt, 10).length === 0);
    } else {
      costesHtml = '<span class="sin-coste">Sin coste</span>';
      isAffordable = true; // Free to build
    }

    // Verificar Requisitos (requisitos array en v5)
    let requisitosCumplidos = true;
    let mensajeRequisito = '';

    const requisitosArray = edificio.requisitos || [];
    for (const req of requisitosArray) {
      // "Ser un Poblado" / "Ser una Urbe"
      if (req === 'Ser un Poblado' && gradoActual < 2) {
        requisitosCumplidos = false;
        mensajeRequisito = '🔒 Requiere: Ser un Poblado';
        break;
      }
      if (req === 'Ser una Urbe' && gradoActual < 3) {
        requisitosCumplidos = false;
        mensajeRequisito = '🔒 Requiere: Ser una Urbe';
        break;
      }
      // "300 Col." / "600 Col." etc - citizen requirements
      if (req.endsWith(' Col.')) {
        const reqPop = parseInt(req.replace(' Col.', ''));
        const totalPop = estadoSimulacion.poblacion?.reduce((sum, c) => sum + (c.cantidad || 0), 0) || 0;
        if (totalPop < reqPop) {
          requisitosCumplidos = false;
          mensajeRequisito = `🔒 Requiere: ${reqPop} colonos`;
          break;
        }
      }
      // "No tener X"
      if (req.startsWith('No tener ')) {
        const noTener = req.replace('No tener ', '');
        if (edificiosInstancias.some(e => e.nombre === noTener)) {
          requisitosCumplidos = false;
          mensajeRequisito = `🔒 Requiere: ${req}`;
          break;
        }
      }
      // "Mina en Región"
      if (req === 'Mina en Región') {
        const tieneMineria = Object.keys(estadoApp.asentamiento.recursos || {}).some(r =>
          ['Metales', 'Sal', 'Carbón'].includes(r)
        );
        if (!tieneMineria) {
          requisitosCumplidos = false;
          mensajeRequisito = '🔒 Requiere: Mina en Región';
          break;
        }
      }
      // "Costa"
      if (req === 'Costa') {
        const tieneCosta = estadoApp.asentamiento.propiedades?.includes('Costa') ||
          estadoApp.asentamiento.peculiaridades?.includes('Acceso Marítimo');
        if (!tieneCosta) {
          requisitosCumplidos = false;
          mensajeRequisito = '🔒 Requiere: Costa';
          break;
        }
      }
    }

    const canBuild = isAffordable && requisitosCumplidos;

    return `
                    <div class="edificio-card disponible ${!canBuild ? 'bloqueado' : ''}">
                        <div class="edificio-header">
                            <span class="icono">${edificio.icono}</span>
                            <span class="nombre">${edificio.nombre}</span>
                        </div>
                        <div class="edificio-costes-container">
                            <strong>Coste:</strong>
                            <div class="lista-costes">
                                ${costesHtml}
                            </div>
                        </div>
                        <div class="edificio-body">
                           <p>${edificio.descripcion}</p>
                           <p class="efecto">✨ ${edificio.effect || ''}</p>
                           ${!requisitosCumplidos ? `<p class="requisito-faltante">${mensajeRequisito}</p>` : ''}
                           <button class="btn-construir" onclick="mostrarPopupConstruccion('${edificio.nombre}')" ${!requisitosCumplidos ? 'disabled' : ''}>
                               Construir
                           </button>
                        </div>
                    </div>
                  `;
  }).join('')}
            </div>
          </div>
      `).join('')}
    </div>
  `;
}

// =====================================================
// POPUP DE CONSTRUCCIÓN - Selección de Opciones de Coste
// =====================================================

let popupConstruccionActivo = null; // Building name being constructed

function mostrarPopupConstruccion(nombreEdificio) {
  const edificio = EDIFICIOS[nombreEdificio];
  if (!edificio) {
    console.error('Edificio no encontrado:', nombreEdificio);
    return;
  }

  popupConstruccionActivo = nombreEdificio;
  const costesG1 = edificio.costesG1 || [];
  const MULTIPLICADOR = 10;

  // Check affordability for each option
  const opcionesConEstado = costesG1.map((coste, idx) => {
    const asequible = checkCostAffordability(coste, MULTIPLICADOR).length === 0;
    return { coste, idx, asequible };
  });

  // Render cost option for display
  const renderOpcionCoste = (coste, idx, asequible) => {
    const costesHtml = Object.entries(coste).map(([recurso, cantidad]) => {
      const real = cantidad * MULTIPLICADOR;
      let disponible = 0;
      if (recurso === 'Doblones') {
        disponible = estadoSimulacion.doblones || 0;
      } else if (recurso.startsWith('Cualquier ')) {
        const tag = recurso.replace('Cualquier ', '');
        disponible = calcularRecursosPorTag(tag);
      } else {
        disponible = (estadoSimulacion.almacen && estadoSimulacion.almacen[recurso]) || 0;
      }
      const suficiente = disponible >= real;
      return `<span class="recurso-coste ${suficiente ? 'ok' : 'falta'}">${real} ${recurso} (${disponible})</span>`;
    }).join(' <span class="plus">+</span> ');

    return `
      <div class="opcion-coste-popup ${asequible ? '' : 'no-asequible'}">
        <label class="opcion-radio">
          <input type="radio" name="opcionCoste" value="${idx}" ${!asequible ? 'disabled' : ''}>
          <span class="opcion-label">Opción ${idx + 1}</span>
        </label>
        <div class="costes-detalle">${costesHtml}</div>
      </div>
    `;
  };

  const opcionesHtml = opcionesConEstado.length > 0
    ? opcionesConEstado.map(o => renderOpcionCoste(o.coste, o.idx, o.asequible)).join('')
    : '<p class="sin-opciones">Sin coste - construcción gratuita</p>';

  const algunaAsequible = opcionesConEstado.some(o => o.asequible) || opcionesConEstado.length === 0;

  const popupHtml = `
    <div class="modal-overlay" id="modal-construccion" onclick="cerrarPopupConstruccion(event)">
      <div class="modal-popup" onclick="event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-icono">${edificio.icono}</span>
          <h3>Construir ${nombreEdificio}</h3>
          <button class="btn-cerrar" onclick="cerrarPopupConstruccion()">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">${edificio.descripcion}</p>
          <p class="modal-efecto">✨ ${edificio.effect || ''}</p>
          <p class="modal-turnos">⏱️ Turnos de construcción: ${edificio.turnos || 1}</p>
          <hr>
          <h4>Elige una opción de coste:</h4>
          <div class="opciones-coste-lista">
            ${opcionesHtml}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" onclick="cerrarPopupConstruccion()">Cancelar</button>
          <button class="btn-confirmar" onclick="confirmarConstruccion()" ${!algunaAsequible ? 'disabled' : ''}>
            Confirmar Construcción
          </button>
        </div>
      </div>
    </div>
  `;

  // Insert modal into DOM
  document.body.insertAdjacentHTML('beforeend', popupHtml);
}

function cerrarPopupConstruccion(event) {
  if (event && event.target.id !== 'modal-construccion') return;
  const modal = document.getElementById('modal-construccion');
  if (modal) modal.remove();
  popupConstruccionActivo = null;
}

function confirmarConstruccion() {
  if (!popupConstruccionActivo) return;

  const edificio = EDIFICIOS[popupConstruccionActivo];
  if (!edificio) return;

  const costesG1 = edificio.costesG1 || [];
  const MULTIPLICADOR = 10;

  // Get selected option
  const selectedRadio = document.querySelector('input[name="opcionCoste"]:checked');
  let opcionElegida = null;

  if (costesG1.length === 0) {
    // Free building
    opcionElegida = {};
  } else if (selectedRadio) {
    const idx = parseInt(selectedRadio.value);
    opcionElegida = costesG1[idx];
  } else {
    // No option selected - try to find first affordable
    for (const coste of costesG1) {
      if (checkCostAffordability(coste, MULTIPLICADOR).length === 0) {
        opcionElegida = coste;
        break;
      }
    }
  }

  if (!opcionElegida && costesG1.length > 0) {
    alert('❌ Selecciona una opción de coste asequible.');
    return;
  }

  // Consume resources
  if (Object.keys(opcionElegida).length > 0) {
    consumeCostBlock(opcionElegida, MULTIPLICADOR);
  }

  // Iniciar Construcción (simulada)
  const turnos = edificio.turnos || 1;
  if (typeof iniciarConstruccion === 'function') {
    iniciarConstruccion(popupConstruccionActivo, opcionElegida, turnos, false, null);
  } else {
    console.error('iniciarConstruccion no está definida');
  }

  cerrarPopupConstruccion();
  actualizarHUD();
  console.log(`🏗️ Construcción iniciada: ${popupConstruccionActivo}`);
  mostrarNotificacion(`🏗️ Construcción iniciada: ${popupConstruccionActivo}`);
}

function renderizarListaCuotasPoblacion() {
  if (!estadoSimulacion || !estadoSimulacion.poblacion) return '<p>No hay población</p>';

  const cuotas = estadoSimulacion.poblacion;
  const recursosDisponibles = Object.keys(EDIFICIOS).length > 0 ? Object.keys(estadoApp.asentamiento.recursos || {}) : [];

  const edificiosConstruidos = estadoApp.asentamiento.edificios || [];

  // Prepare list of assignable targets
  const assignableTargets = [];
  const genericBuildingsHandled = new Set();

  edificiosConstruidos.forEach((ed, idx) => {
    // Handle string/legacy format on the fly
    const nombre = typeof ed === 'string' ? ed : ed.nombre;
    const item = typeof ed === 'string' ? { id: `${ed}_legacy_${idx}`, nombre: ed, receta: null } : ed;

    // Safety check
    if (!EDIFICIOS[nombre]) return;
    const def = EDIFICIOS[nombre];

    // Check if it has capacity (job slots)
    // We check base capacity here. Simulation checks actual capacity with grade.
    if (def.capacidad || (def.produccionTrabajo && !def.produccionTrabajo.condicion)) {
      if (def.permiteManufactura) {
        // Instance-specific assignment
        const recetaKey = item.receta;
        let recetaLabel = 'Sin receta';

        // Try to resolve recipe label
        if (recetaKey && typeof RECETAS_MANUFACTURA !== 'undefined') {
          // Determine raw key and option if compound
          let rawKey = recetaKey;
          let option = null;
          if (recetaKey.includes(':')) {
            [rawKey, option] = recetaKey.split(':');
          }

          // Search for label
          for (const cat of Object.values(RECETAS_MANUFACTURA)) {
            if (cat[rawKey]) {
              const rec = cat[rawKey];
              if (option && rec[option]) {
                recetaLabel = rec[option].output?.Recurso || 'Produciendo';
              } else {
                recetaLabel = rec.output?.Recurso || 'Produciendo';
              }
              break;
            }
          }
        }

        assignableTargets.push({
          label: `🏭 ${nombre} #${idx + 1} (${recetaLabel})`,
          value: `edificio_id:${item.id}`
        });
      } else {
        // Generic assignment (group by type)
        if (!genericBuildingsHandled.has(nombre)) {
          assignableTargets.push({
            label: `🏭 ${nombre}`,
            value: `edificio:${nombre}`
          });
          genericBuildingsHandled.add(nombre);
        }
      }
    }
  });

  return cuotas.map(cuota => {
    const rolData = ROLES_POBLACION[cuota.rol];
    const asignado = cuota.asignacion;

    // Resolve Display Label for Assignment
    let asignadoDisplay = '';
    if (asignado) {
      if (asignado.startsWith('edificio_id:')) {
        const id = asignado.replace('edificio_id:', '');
        // Find specific instance
        const edificiosConstruidos = estadoApp.asentamiento.edificios || [];
        const inst = edificiosConstruidos.find(e => typeof e === 'object' && e.id === id);
        if (inst) {
          let recipeLabel = '';
          // Resolve Recipe Name
          if (inst.receta && typeof RECETAS_MANUFACTURA !== 'undefined') {
            let rawKey = inst.receta;
            let option = null;
            if (rawKey.includes(':')) { [rawKey, option] = rawKey.split(':'); }

            for (const cat of Object.values(RECETAS_MANUFACTURA)) {
              if (cat[rawKey]) {
                const rec = cat[rawKey];
                if (option && rec[option]) {
                  recipeLabel = rec[option].output?.Recurso;
                } else {
                  recipeLabel = rec.output?.Recurso;
                }
                break;
              }
            }
          }
          const detail = recipeLabel ? `(${recipeLabel})` : `#${id.substr(-3)}`;
          asignadoDisplay = `🏭 ${inst.nombre} ${detail}`;
        } else {
          asignadoDisplay = `🏭 Manufactura (ID:${id})`; // Fallback
        }
      } else if (asignado.startsWith('edificio:')) {
        asignadoDisplay = `🏭 ${asignado.replace('edificio:', '')}`;
      } else {
        asignadoDisplay = `⛏️ ${asignado}`;
      }
    }

    // Select HTML
    let selectHTML = `<select class="select-trabajo" onchange="asignarTrabajoDesdeUI(${cuota.id}, this.value)">`;
    selectHTML += `<option value="" ${!asignado ? 'selected' : ''}>-- Ocioso --</option>`;

    // Resources
    selectHTML += `<optgroup label="Bioma">`;
    recursosDisponibles.forEach(r => {
      selectHTML += `<option value="${r}" ${asignado === r ? 'selected' : ''}>⛏️ ${r}</option>`;
    });
    selectHTML += `</optgroup>`;

    // Buildings
    if (assignableTargets.length > 0) {
      selectHTML += `<optgroup label="Edificios">`;
      assignableTargets.forEach(target => {
        selectHTML += `<option value="${target.value}" ${asignado === target.value ? 'selected' : ''}>${target.label}</option>`;
      });
      selectHTML += `</optgroup>`;
    }

    selectHTML += `</select>`;

    return `
        <div class="cuota-card-hud ${asignado ? 'asignado' : 'ocioso'}">
            <div class="cuota-info">
                <span class="cuota-icono">${rolData?.icono || '👤'}</span>
                <div>
                   <div class="cuota-rol">${cuota.rol} <small>(${cuota.naturaleza})</small></div>
                   <div class="cuota-medidas">20 Colonos ${asignado ? `Trabajando en <br><strong>${asignadoDisplay}</strong>` : 'Ociosos'}</div>
                </div>
            </div>
            <div class="cuota-accion">
                ${selectHTML}
            </div>
        </div>
    `;
  }).join('');
}

function calcularBonificadoresEdificios(edificiosConstruidos) {
  const bonificadores = {};
  // Handle strings (v1) and objects (v2)
  edificiosConstruidos.forEach(item => {
    const nombre = (typeof item === 'string') ? item : item.nombre;
    const edificio = EDIFICIOS[nombre];
    if (edificio && edificio.efectos) {
      Object.entries(edificio.efectos).forEach(([stat, valor]) => {
        if (typeof valor === 'number') {
          bonificadores[stat] = (bonificadores[stat] || 0) + valor;
        }
      });
    }
  });
  return bonificadores;
}

function construirEdificio(nombre) {
  const edificio = EDIFICIOS[nombre];
  if (!edificio) { mostrarError('Edificio no encontrado'); return; }

  const costesRaw = edificio.costes || {};
  const MULTIPLICADOR_COSTES = 10;

  // Determinar qué opción de coste usar
  let opcionElegida = null;

  if (Array.isArray(costesRaw)) {
    // Buscar primera opción asequible
    for (const opt of costesRaw) {
      const missing = checkCostAffordability(opt, MULTIPLICADOR_COSTES);
      if (missing.length === 0) {
        opcionElegida = opt;
        break;
      }
    }
    if (!opcionElegida) {
      // Mostrar error de la primera opción como referencia
      const missing = checkCostAffordability(costesRaw[0], MULTIPLICADOR_COSTES);
      mostrarError(`Faltan recursos (Opción 1): ${missing.join(', ')}`);
      return;
    }
  } else {
    const missing = checkCostAffordability(costesRaw, MULTIPLICADOR_COSTES);
    if (missing.length > 0) {
      mostrarError(`Faltan recursos: ${missing.join(', ')}`);
      return;
    }
    opcionElegida = costesRaw;
  }

  // Ejecutar Consumo
  consumeCostBlock(opcionElegida, MULTIPLICADOR_COSTES);

  // Crear Instancia (Objeto)
  if (!estadoApp.asentamiento.edificios) { estadoApp.asentamiento.edificios = []; }

  const nuevaInstancia = {
    id: `${nombre}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    nombre: nombre,
    receta: null
  };

  estadoApp.asentamiento.edificios.push(nuevaInstancia);

  guardarExpedicion();
  mostrarNotificacion(`✅ ${nombre} construido`);
  renderizarPantalla();
}

function cambiarReceta(instanceId, nuevaReceta) {
  console.log('cambiarReceta called:', instanceId, nuevaReceta);

  const list = estadoApp.asentamiento?.edificios || [];
  let inst = list.find(e => (typeof e === 'string' ? false : e.id === instanceId));

  // Handle legacy format: "NombreEdificio_legacy_INDEX"
  if (!inst && instanceId.includes('_legacy_')) {
    const parts = instanceId.split('_legacy_');
    const nombre = parts[0];
    const idx = parseInt(parts[1]);

    // Check if the item at that index is a string matching the name
    if (list[idx] === nombre) {
      // Convert legacy string to object
      inst = {
        id: `${nombre}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        nombre: nombre,
        grado: 1,
        receta: null
      };

      // Replace the string with the object in the list
      list[idx] = inst;

      console.log('Converted legacy building to object:', inst);
    }
  }

  console.log('Instance found:', inst);

  if (inst) {
    inst.receta = nuevaReceta || null;  // Ensure null if empty string

    // Sincronizar con el estado de simulación explícitamente
    if (!estadoSimulacion.edificiosEstado) {
      estadoSimulacion.edificiosEstado = {};
    }

    estadoSimulacion.edificiosEstado[inst.id] = {
      grado: inst.grado || 1,
      recetaActual: nuevaReceta || null,
      activo: !!nuevaReceta
    };

    guardarExpedicion();
    renderizarPantalla();

    if (nuevaReceta) {
      mostrarNotificacion(`🏭 Receta seleccionada`, 'info');
    }
  } else {
    console.error('Instance not found for id:', instanceId);
    mostrarNotificacion('⚠️ Error: No se encontró el edificio', 'error');
  }
}

// =====================================================
// POPUP DE MEJORA - Selección de Opciones de Coste
// =====================================================

let popupMejoraActivo = null;

function mostrarPopupMejora(instanciaId) {
  let instancia = (estadoApp.asentamiento.edificios || []).find(e => (typeof e !== 'string' && e.id === instanciaId));

  // Handle Legacy Strings Conversion
  if (!instancia && instanciaId.includes('_legacy_')) {
    const parts = instanciaId.split('_legacy_');
    const name = parts[0];
    const idx = parseInt(parts[1]);

    if (estadoApp.asentamiento.edificios && estadoApp.asentamiento.edificios[idx] === name) {
      // Convert to object in place
      instancia = {
        id: `${name}_${Date.now()}_converted`,
        nombre: name,
        grado: 1,
        receta: null
      };
      estadoApp.asentamiento.edificios[idx] = instancia;

      // Initialize state
      if (!estadoSimulacion.edificiosEstado) estadoSimulacion.edificiosEstado = {};
      estadoSimulacion.edificiosEstado[instancia.id] = { grado: 1, activo: true };

      guardarExpedicion();
      // We don't re-render immediately to avoid disrupting the flow, 
      // but next render will show the object correctly.
    }
  }

  if (!instancia) {
    console.error('Instancia no encontrada:', instanciaId);
    return;
  }

  const edificio = EDIFICIOS[instancia.nombre];
  if (!edificio) return;

  popupMejoraActivo = instancia.id;
  const costesMejora = edificio.costesMejora || [];
  const MULTIPLICADOR = 10;

  const opcionesConEstado = costesMejora.map((coste, idx) => {
    const asequible = checkCostAffordability(coste, MULTIPLICADOR).length === 0;
    return { coste, idx, asequible };
  });

  const renderOpcionCoste = (coste, idx, asequible) => {
    const costesHtml = Object.entries(coste).map(([recurso, cantidad]) => {
      const real = cantidad * MULTIPLICADOR;
      let disponible = 0;
      if (recurso === 'Doblones') {
        disponible = estadoSimulacion.doblones || 0;
      } else if (recurso.startsWith('Cualquier ')) {
        const tag = recurso.replace('Cualquier ', '');
        disponible = calcularRecursosPorTag(tag);
      } else {
        disponible = (estadoSimulacion.almacen && estadoSimulacion.almacen[recurso]) || 0;
      }
      const suficiente = disponible >= real;
      return `<span class="recurso-coste ${suficiente ? 'ok' : 'falta'}">${real} ${recurso} (${disponible})</span>`;
    }).join(' <span class="plus">+</span> ');

    return `
      <div class="opcion-coste-popup ${asequible ? '' : 'no-asequible'}">
        <label class="opcion-radio">
          <input type="radio" name="opcionCosteMejora" value="${idx}" ${!asequible ? 'disabled' : ''}>
          <span class="opcion-label">Opción ${idx + 1}</span>
        </label>
        <div class="costes-detalle">${costesHtml}</div>
      </div>
    `;
  };

  const opcionesHtml = opcionesConEstado.length > 0
    ? opcionesConEstado.map(o => renderOpcionCoste(o.coste, o.idx, o.asequible)).join('')
    : '<p class="sin-opciones">Sin coste de mejora</p>';

  const algunaAsequible = opcionesConEstado.some(o => o.asequible) || opcionesConEstado.length === 0;

  const modalId = 'modal-mejora';
  if (document.getElementById(modalId)) document.getElementById(modalId).remove();

  const popupHtml = `
    <div class="modal-overlay" id="${modalId}" onclick="cerrarPopupMejora(event)">
      <div class="modal-popup" onclick="event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-icono">${edificio.icono}</span>
          <h3>Mejorar ${instancia.nombre} (Grado ${instancia.grado || 1} ➔ ${(instancia.grado || 1) + 1})</h3>
          <button class="btn-cerrar" onclick="cerrarPopupMejora()">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">Mejora este edificio para aumentar sus beneficios.</p>
          <hr>
          <h4>Coste de Mejora:</h4>
          <div class="opciones-coste-lista">
            ${opcionesHtml}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" onclick="cerrarPopupMejora()">Cancelar</button>
          <button class="btn-confirmar" onclick="confirmarMejora()" ${!algunaAsequible ? 'disabled' : ''}>
            Confirmar Mejora
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', popupHtml);
}

function cerrarPopupMejora(event) {
  if (event && event.target.id !== 'modal-mejora') return;
  const modal = document.getElementById('modal-mejora');
  if (modal) modal.remove();
  popupMejoraActivo = null;
}

function confirmarMejora() {
  if (!popupMejoraActivo) return;

  const instancia = (estadoApp.asentamiento.edificios || []).find(e => e.id === popupMejoraActivo);
  if (!instancia) return;

  const edificio = EDIFICIOS[instancia.nombre];
  if (!edificio) return;

  const costesMejora = edificio.costesMejora || [];
  const MULTIPLICADOR = 10;

  const selectedRadio = document.querySelector('input[name="opcionCosteMejora"]:checked');
  let opcionElegida = null;

  if (costesMejora.length === 0) {
    opcionElegida = {};
  } else if (selectedRadio) {
    const idx = parseInt(selectedRadio.value);
    opcionElegida = costesMejora[idx];
  } else {
    // Auto-select first affordable
    for (const coste of costesMejora) {
      if (checkCostAffordability(coste, MULTIPLICADOR).length === 0) {
        opcionElegida = coste;
        break;
      }
    }
  }

  if (!opcionElegida && costesMejora.length > 0) {
    alert('❌ Selecciona una opción de coste.');
    return;
  }

  if (Object.keys(opcionElegida).length > 0) {
    consumeCostBlock(opcionElegida, MULTIPLICADOR);
  }

  // Iniciar Mejora (simulada)
  const turnos = edificio.turnos || 1;
  if (typeof iniciarConstruccion === 'function') {
    iniciarConstruccion(instancia.nombre, opcionElegida, turnos, true, popupMejoraActivo);
  }

  cerrarPopupMejora();
  actualizarHUD();
  mostrarNotificacion(`🏗️ Mejora iniciada para ${instancia.nombre}`);
}
