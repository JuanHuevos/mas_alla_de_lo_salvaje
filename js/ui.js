/**
 * MÁS ALLÁ DE LO SALVAJE - Controladores de Interfaz v2.0
 * Sistema de Gestión de Asentamientos con Herencia de Biomas
 */

// Estado temporal para el wizard de creación
let wizardState = {
  paso: 1,
  nombre: '',
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
// NAVEGACIÓN HUD
// =====================================================

function renderizarNavegacionHUD() {
  const pestanas = [
    { id: 'resumen', icono: '📊', label: 'Resumen' },
    { id: 'produccion', icono: '⚒️', label: 'Producción' },
    { id: 'crecimiento', icono: '📈', label: 'Crecimiento' },
    { id: 'edificios', icono: '🏛️', label: 'Edificios' }
  ];

  return `
    <nav class="hud-nav">
      ${pestanas.map(p => `
        <button 
          class="nav-item ${pestanaActiva === p.id ? 'activo' : ''}" 
          onclick="cambiarPestana('${p.id}')">
          <span class="nav-icono">${p.icono}</span>
          <span class="nav-label">${p.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

function cambiarPestana(pestana) {
  pestanaActiva = pestana;
  renderizarPantalla();
}

// =====================================================
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
      
      <main class="lista-contenido">
        ${asentamientos.length === 0 ? `
          <div class="lista-vacia">
            <div class="lista-vacia-icono">🏕️</div>
            <h3>No hay asentamientos</h3>
            <p>Crea tu primer asentamiento para comenzar la expedición</p>
            <button class="btn-principal" onclick="iniciarCreacionAsentamiento()">
              <span class="btn-icono">➕</span>
              <span class="btn-texto">Crear Primer Asentamiento</span>
            </button>
          </div>
        ` : `
          <div class="asentamientos-grid">
            ${asentamientos.map(a => renderizarCardAsentamiento(a)).join('')}
          </div>
        `}
      </main>
    </div>
  `;
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
        <span class="card-icono">${gradoData?.icono || '🏕️'}</span>
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
      edificios: []
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
  return `
    <div class="paso-contenido paso-nombre">
      <div class="paso-icono">🏕️</div>
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
// PASO 2: DETERMINACIÓN DE BIOMA (d12 + d6)
// =====================================================
function renderizarPasoBioma() {
  return `
    <div class="paso-contenido paso-bioma">
      <h3>🎲 Determinar Bioma</h3>
      <p>Lanza el d12 para determinar el tipo de bioma de tu territorio</p>
      
      <div class="bioma-tirada-panel">
        <div class="tirada-seccion">
          <h4>Paso 1: Tirar d12</h4>
          <p class="tirada-info">1-6: Bioma Base | 7-11: Bioma Especial | 12: Repetir</p>
          <button class="btn-tirar-dado grande" onclick="tirarD12Bioma()">
            🎲 Tirar d12
          </button>
          
          ${wizardState.tiradaD12 !== null ? `
            <div class="resultado-tirada ${wizardState.esBiomaEspecial ? 'especial' : 'base'}">
              <span class="tirada-numero">${wizardState.tiradaD12}</span>
              <span class="tirada-resultado">
                ${wizardState.esBiomaEspecial
        ? `🌟 ${wizardState.biomaEspecial}`
        : `🌍 ${wizardState.biomaBase}`
      }
              </span>
            </div>
          ` : ''}
        </div>
        
        ${wizardState.esBiomaEspecial && wizardState.biomaEspecial ? `
          <div class="tirada-seccion sub-bioma">
            <h4>Paso 2: Tirar d6 (Sub-Bioma)</h4>
            <p class="tirada-info">El bioma especial se superpone sobre un bioma base</p>
            <button class="btn-tirar-dado" onclick="tirarD6SubBioma()">
              🎲 Tirar d6
            </button>
            
            ${wizardState.subBioma ? `
              <div class="resultado-tirada sub">
                <span class="tirada-numero">${wizardState.tiradaSubBioma}</span>
                <span class="tirada-resultado">
                  ${BIOMAS_BASE[wizardState.subBioma]?.icono} ${wizardState.subBioma}
                </span>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
      
      ${renderizarResumenBioma()}
      
      <div class="bioma-manual">
        <details>
          <summary>📝 Seleccionar manualmente</summary>
          <div class="seleccion-manual-grid">
            <div class="manual-columna">
              <h5>Biomas Base</h5>
              ${Object.entries(BIOMAS_BASE).map(([nombre, data]) => `
                <button class="btn-bioma-manual ${wizardState.biomaBase === nombre && !wizardState.esBiomaEspecial ? 'seleccionado' : ''}"
                        onclick="seleccionarBiomaManual('base', '${nombre}')">
                  ${data.icono} ${nombre}
                </button>
              `).join('')}
            </div>
            <div class="manual-columna">
              <h5>Biomas Especiales</h5>
              ${Object.entries(BIOMAS_ESPECIALES).map(([nombre, data]) => `
                <button class="btn-bioma-manual ${wizardState.biomaEspecial === nombre ? 'seleccionado' : ''}"
                        onclick="seleccionarBiomaManual('especial', '${nombre}')">
                  ${data.icono} ${nombre}
                </button>
              `).join('')}
            </div>
          </div>
        </details>
      </div>
    </div>
  `;
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
// PASO 3: PROPIEDADES Y PECULIARIDADES
// =====================================================
function renderizarPasoPropiedades() {
  // Propiedades ya vienen del bioma
  const propiedadesBioma = wizardState.propiedades;

  return `
    <div class="paso-contenido paso-seleccion">
      <h3>🌍 Propiedades del Terreno</h3>
      <p>Las propiedades base vienen del bioma. Puedes agregar o quitar propiedades adicionales.</p>
      
      <div class="propiedades-actuales">
        <h4>Propiedades Activas (del Bioma)</h4>
        <div class="tags-lista">
          ${propiedadesBioma.map(p => `
            <span class="tag activo">${PROPIEDADES[p]?.icono} ${p}</span>
          `).join('')}
        </div>
      </div>
      
      <div class="seccion-peculiaridades">
        <h4>✨ Peculiaridades del Territorio</h4>
        <p>Selecciona características especiales adicionales</p>
        
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

// =====================================================
// PASO 4: RECURSOS Y ABUNDANCIA
// =====================================================
function renderizarPasoRecursos() {
  const biomaActual = wizardState.biomaFusionado || (wizardState.biomaBase ? BIOMAS_BASE[wizardState.biomaBase] : null);

  if (!biomaActual) {
    return `
      <div class="paso-contenido">
        <h3>⚠️ Selecciona un bioma primero</h3>
        <p>Vuelve al paso 2 para determinar el bioma de tu asentamiento.</p>
      </div>
    `;
  }

  const recursos = biomaActual.recursos || [];
  const recursosGarantizados = biomaActual.recursosGarantizados || [];
  const exoticos = biomaActual.exoticos || [];
  const modificadoresPropiedades = calcularModificadoresRecursos(wizardState.propiedades);

  // Identificar recursos adicionales (agregados manualmente)
  const recursosAdicionales = Object.keys(wizardState.recursos).filter(r =>
    !recursos.includes(r) && !exoticos.includes(r) && !recursosGarantizados.includes(r)
  );

  return `
    <div class="paso-contenido paso-recursos">
      <h3>📦 Recursos del Territorio</h3>
      <p>Configura la abundancia de cada recurso. Los dados REEMPLAZAN el resultado anterior.</p>
      
      ${recursosGarantizados.length > 0 ? `
        <div class="recursos-fijos-panel">
          <h4>✨ Recursos Garantizados (Nivel Normal automático)</h4>
          <div class="recursos-fijos-lista">
            ${recursosGarantizados.map(r => {
    const mod = modificadoresPropiedades[r] || 0;
    return `
                <span class="recurso-fijo">
                  ${RECURSOS[r]?.icono || '📦'} ${r}
                  ${mod !== 0 ? `<span class="mod ${mod > 0 ? 'positivo' : 'negativo'}">${formatearValor(mod)}</span>` : ''}
                </span>
              `;
  }).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="recursos-panel">
        <div class="recursos-header">
          <h4>🎲 Recursos del Bioma (${biomaActual.dado || 'd6'})</h4>
          <button class="btn-tirar-dado" onclick="tirarRecursoBioma()">
            🎲 Tirar (1 Abundante, 2 Escasos)
          </button>
        </div>
        
        <div class="recursos-tabla">
          <div class="recursos-tabla-header">
            <span>#</span>
            <span>Recurso</span>
            <span>Abundancia</span>
            <span>Mod. Prop.</span>
          </div>
          ${recursos.map((recurso, idx) => {
    const estado = wizardState.recursos[recurso] || { abundancia: "Inexistente", tirada: null };
    const mod = modificadoresPropiedades[recurso] || 0;
    const modAbundancia = obtenerModificadorAbundancia(estado.abundancia);
    const modTotal = mod + modAbundancia;

    return `
              <div class="recurso-row">
                <span class="recurso-numero">${idx + 1}</span>
                <span class="recurso-nombre">
                  ${RECURSOS[recurso]?.icono || '📦'} ${recurso}
                </span>
                <div class="recurso-abundancia">
                  <select onchange="cambiarAbundancia('${recurso}', this.value)" class="select-abundancia ${obtenerClaseAbundancia(estado.abundancia)}">
                    ${Object.keys(NIVELES_ABUNDANCIA).map(nivel => `
                      <option value="${nivel}" ${estado.abundancia === nivel ? 'selected' : ''}>${nivel}</option>
                    `).join('')}
                  </select>
                </div>
                <span class="recurso-mod ${modTotal > 0 ? 'positivo' : modTotal < 0 ? 'negativo' : 'neutro'}">
                  ${modTotal !== 0 ? formatearValor(modTotal) : '-'}
                </span>
              </div>
            `;
  }).join('')}
        </div>
      </div>
      
      <div class="recursos-panel exoticos">
        <div class="recursos-header">
          <h4>💎 Recursos Exóticos (${biomaActual.dadoExotico || 'd4'})</h4>
          <button class="btn-tirar-dado exotico" onclick="tirarRecursoExotico()">
            🎲 Descubrir 1 Exótico
          </button>
        </div>
        <p class="exoticos-nota">Los exóticos son "Inexistentes" hasta ser descubiertos mediante exploración</p>
        
        <div class="recursos-tabla">
          ${exoticos.map((recurso, idx) => {
    const estado = wizardState.recursos[recurso] || { abundancia: "Inexistente", tirada: null };
    const mod = modificadoresPropiedades[recurso] || 0;

    return `
              <div class="recurso-row exotico ${estado.abundancia !== 'Inexistente' ? 'descubierto' : ''}">
                <span class="recurso-numero">${idx + 1}</span>
                <span class="recurso-nombre">
                  ${RECURSOS[recurso]?.icono || '💎'} ${recurso}
                </span>
                <div class="recurso-abundancia">
                  <select onchange="cambiarAbundancia('${recurso}', this.value)" class="select-abundancia ${obtenerClaseAbundancia(estado.abundancia)}">
                    ${Object.keys(NIVELES_ABUNDANCIA).map(nivel => `
                      <option value="${nivel}" ${estado.abundancia === nivel ? 'selected' : ''}>${nivel}</option>
                    `).join('')}
                  </select>
                </div>
                <span class="recurso-mod ${mod > 0 ? 'positivo' : mod < 0 ? 'negativo' : 'neutro'}">
                  ${mod !== 0 ? formatearValor(mod) : '-'}
                </span>
              </div>
            `;
  }).join('')}
        </div>
      </div>

      ${recursosAdicionales.length > 0 ? `
        <div class="recursos-panel adicionales">
          <div class="recursos-header">
            <h4>➕ Recursos Adicionales</h4>
          </div>
          <div class="recursos-tabla">
            ${recursosAdicionales.map((recurso, idx) => {
    const estado = wizardState.recursos[recurso];
    const mod = modificadoresPropiedades[recurso] || 0;
    const modAbundancia = obtenerModificadorAbundancia(estado.abundancia);
    const modTotal = mod + modAbundancia;

    return `
                <div class="recurso-row adicional">
                  <span class="recurso-numero">+</span>
                  <span class="recurso-nombre">
                    ${RECURSOS[recurso]?.icono || '📦'} ${recurso}
                  </span>
                  <div class="recurso-abundancia">
                    <select onchange="cambiarAbundancia('${recurso}', this.value)" class="select-abundancia ${obtenerClaseAbundancia(estado.abundancia)}">
                       ${Object.keys(NIVELES_ABUNDANCIA).map(nivel => `
                        <option value="${nivel}" ${estado.abundancia === nivel ? 'selected' : ''}>${nivel}</option>
                      `).join('')}
                    </select>
                  </div>
                  <span class="recurso-mod ${modTotal > 0 ? 'positivo' : modTotal < 0 ? 'negativo' : 'neutro'}">
                     ${modTotal !== 0 ? formatearValor(modTotal) : '-'}
                  </span>
                  <button class="btn-eliminar-recurso" onclick="eliminarRecursoManual('${recurso}')">🗑️</button>
                </div>
              `;
  }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="bioma-manual" style="margin-top: 1.5rem;">
        <details>
          <summary>📝 Agregar recurso manualmente</summary>
          <div class="agregar-recurso-container" style="display: flex; gap: 0.5rem; margin-top: 1rem; align-items: center;">
            <select id="select-recurso-manual" class="input-nombre" style="flex: 1; text-align: left; max-width: 300px;">
              <option value="">-- Seleccionar Recurso --</option>
              ${Object.keys(RECURSOS).sort().map(r => `<option value="${r}">${RECURSOS[r].icono} ${r}</option>`).join('')}
            </select>
            <button class="btn-principal" style="width: auto; padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="agregarRecursoManual()">Agregar</button>
          </div>
        </details>
      </div>
      

    </div>
  `;
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
      wizardState.edificios = ["Zona Residencial (1)"];
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
        const esBloqueado = !esPrimero && edificio === "Zona Residencial (1)";
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
          <span class="badge-magia ${wizardState.influenciaMagica.toLowerCase()}">${INFLUENCIA_MAGICA[wizardState.influenciaMagica]?.icono} ${wizardState.influenciaMagica}</span>
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

  if (wizardState.paso === 2 && !wizardState.biomaBase && !wizardState.biomaFusionado) {
    mostrarError('Por favor, determina el bioma de tu territorio');
    return;
  }

  if (wizardState.paso === 2 && wizardState.esBiomaEspecial && !wizardState.subBioma) {
    mostrarError('Debes tirar el d6 para determinar el sub-bioma');
    return;
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

  container.innerHTML = `
    <div class="hud-container">
      <header class="hud-header">
        <div class="hud-titulo">
          <span class="hud-icono">${biomaActual?.icono || GRADOS[a.grado]?.icono || '🏕️'}</span>
          <div>
            <h1>${a.nombre}</h1>
            <div class="hud-subtitulo">
                <span class="hud-grado">${a.grado} • ${a.biomaFusionado?.nombre || a.biomaBase}</span>
                <span class="separador">•</span>
                <span class="capacidad-magica ${a.influenciaMagica?.toLowerCase()}" title="Influencia Mágica">
                    ${INFLUENCIA_MAGICA[a.influenciaMagica]?.icono} Magia ${a.influenciaMagica}
                </span>
            </div>
          </div>
        </div>
        <div class="hud-acciones">
          <button class="btn-accion btn-expedicion" onclick="volverALista()" title="Ver Expedición">📋</button>
          <button class="btn-accion" onclick="mostrarOpciones()">⚙️</button>
        </div>
      </header>

      ${renderizarNavegacionHUD()}
      
      <div class="hud-contenido-dinamico">
        ${renderizarContenidoPestana(a, stats)}
      </div>
    </div>
  `;
}

// Estado de navegación del HUD


function cambiarPestana(nombre) {
  pestanaActiva = nombre;
  renderizarPantalla();
}

function renderizarNavegacionHUD() {
  const pestanas = [
    { id: 'resumen', icono: '📊', label: 'Resumen' },
    { id: 'produccion', icono: '⚒️', label: 'Producción' },
    { id: 'almacenamiento', icono: '📦', label: 'Almacén' },
    { id: 'comercio', icono: '⚖️', label: 'Comercio' },
    { id: 'crecimiento', icono: '🌱', label: 'Crecimiento' },
    { id: 'edificios', icono: '🏛️', label: 'Edificios' }
  ];

  return `
    <nav class="hud-nav">
        ${pestanas.map(p => `
            <button class="nav-tab ${pestanaActiva === p.id ? 'activa' : ''}" 
                    onclick="cambiarPestana('${p.id}')">
                <span class="tab-icono">${p.icono}</span>
                <span class="tab-label">${p.label}</span>
            </button>
        `).join('')}
    </nav>
    `;
}

function renderizarContenidoPestana(a, stats) {
  switch (pestanaActiva) {
    case 'resumen': return renderizarPestanaResumen(a, stats);
    case 'produccion': return renderizarPestanaProduccion(a, stats);
    case 'almacenamiento': return renderizarPestanaAlmacenamiento(a, stats);
    case 'comercio': return renderizarPestanaComercio(a, stats);
    case 'crecimiento': return renderizarPestanaCrecimiento(a, stats);
    case 'edificios': return renderizarPestanaEdificios(a, stats);
    default: return renderizarPestanaResumen(a, stats);
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
          <span class="stat-icono">📦</span>
          <div class="stat-info">
            <span class="stat-label">Almacén</span>
            <span class="stat-value">${stats.grado.almacenamiento}</span>
          </div>
        </div>
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

function renderizarPestanaProduccion(a, stats) {
  const recursos = a.recursos || {};
  const modificadores = calcularModificadoresRecursos(a.propiedades);
  const produccionBioma = calcularProduccionTotal(recursos, stats.calidadTotal);
  const produccionEdificios = calcularProduccionEdificios(a.edificios || [], stats);

  // Cálculos de Flujo de Comida
  const totalCuotas = estadoSimulacion.poblacion ? estadoSimulacion.poblacion.length : 0;
  const consumoAlimentos = totalCuotas * 1; // 1 Medida por Cuota
  const produccionAlimentoBioma = produccionBioma["Alimento"]?.medidas || 0;
  const produccionAlimentoEdificios = produccionEdificios["Alimento"]?.total || 0;
  const produccionTotalAlimentos = produccionAlimentoBioma + produccionAlimentoEdificios;
  const balanceAlimentos = produccionTotalAlimentos - consumoAlimentos;

  return `
    <div class="panel panel-full">
        <h3>⚒️ Producción Detallada</h3>
        <div class="panel-contenido">
        
            <!-- Flujo de Alimentos -->
            <div class="seccion-produccion seccion-alimentos">
                <h4>🌾 Flujo de Alimentos</h4>
                <div class="economia-grid">
                    <div class="economia-ingresos">
                        <h5>🥣 Producción</h5>
                        <div class="economia-item positivo">
                            <span>Bioma</span>
                            <span>+${produccionAlimentoBioma}</span>
                        </div>
                        <div class="economia-item positivo">
                            <span>Edificios</span>
                            <span>+${produccionAlimentoEdificios}</span>
                        </div>
                        <div class="economia-item total positivo">
                            <span><strong>Total</strong></span>
                            <span><strong>+${produccionTotalAlimentos}</strong></span>
                        </div>
                    </div>
                    <div class="economia-gastos">
                        <h5>👥 Consumo</h5>
                        <div class="economia-item negativo">
                            <span>Población (${totalCuotas})</span>
                            <span>-${consumoAlimentos}</span>
                        </div>
                        <div class="economia-item total negativo">
                            <span><strong>Total</strong></span>
                            <span><strong>-${consumoAlimentos}</strong></span>
                        </div>
                    </div>
                </div>
                <div class="economia-balance ${balanceAlimentos >= 0 ? 'positivo' : 'negativo'}">
                    <span>⚖️ Balance de Alimentos</span>
                    <span class="balance-valor">${balanceAlimentos >= 0 ? '+' : ''}${balanceAlimentos}</span>
                </div>
            </div>

            <!-- Producción desde Bioma -->
            <div class="seccion-produccion">
                <h4>🌍 Recursos del Bioma</h4>
                <table class="tabla-produccion">
                    <thead>
                        <tr>
                            <th>Recurso</th>
                            <th>Fuente</th>
                            <th>Trabajadores</th>
                            <th>Producción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(recursos).map(([nombre, data]) => {
    const prodData = produccionBioma[nombre];
    const esActiva = prodData && prodData.tipo === 'activa';
    const almacenado = estadoSimulacion?.almacen?.[nombre] || 0;

    // Mantener visible si tiene valor > 0 o está en recursos
    if (almacenado === 0 && (!prodData || prodData.medidas === 0)) return '';

    return `
                            <tr class="${esActiva ? 'fila-activa' : 'fila-pasiva'}">
                                <td>
                                    <span class="recurso-icono">${RECURSOS[nombre]?.icono || '📦'}</span>
                                    <strong>${nombre}</strong>
                                    <span class="almacen-mini">(${almacenado})</span>
                                </td>
                                <td>
                                    <span class="fuente-badge bioma">🌍 Bioma</span>
                                </td>
                                <td>
                                    <span class="dato-numerico">${prodData?.trabajadores || 0}</span>
                                </td>
                                <td>
                                    <strong class="dato-produccion">${prodData?.medidas || 0}</strong>
                                </td>
                            </tr>
                        `;
  }).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Producción desde Edificios -->
            ${Object.keys(produccionEdificios).length > 0 ? `
                <div class="seccion-produccion">
                    <h4>🏭 Recursos de Edificios</h4>
                    <table class="tabla-produccion">
                        <thead>
                            <tr>
                                <th>Recurso</th>
                                <th>Fuente</th>
                                <th>Cuotas</th>
                                <th>Producción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(produccionEdificios).map(([recurso, data]) =>
    data.fuentes.map(f => {
      // Verificar Capacidad
      const estadoEdif = estadoSimulacion.edificiosEstado?.[f.edificio] || { grado: 1 };
      const capacidad = calcularCapacidadEdificio(f.edificio, estadoEdif.grado);
      const sobrecarga = f.cuotas > capacidad;

      return `
                                    <tr class="fila-edificio ${sobrecarga ? 'error-capacidad' : ''}">
                                        <td>
                                            <span class="recurso-icono">${RECURSOS[recurso]?.icono || RECURSOS_ESPECIALES[recurso]?.icono || '📦'}</span>
                                            <strong>${recurso}</strong>
                                        </td>
                                        <td>
                                            <span class="fuente-badge edificio">🏭 ${f.edificio}</span>
                                        </td>
                                        <td>
                                            <span class="dato-numerico ${sobrecarga ? 'texto-error' : ''}">
                                                ${f.cuotas} / ${capacidad}
                                                ${sobrecarga ? '⚠️' : ''}
                                            </span>
                                        </td>
                                        <td>
                                            <strong class="dato-produccion">+${f.produccion}</strong>
                                        </td>
                                    </tr>
                                    ${sobrecarga ? `
                                        <tr class="fila-error">
                                            <td colspan="4" class="mensaje-error">
                                                ⚠️ Error: Asignadas ${f.cuotas} cuotas, capacidad máxima ${capacidad}. El exceso no produce.
                                            </td>
                                        </tr>
                                    ` : ''}
                                `;
    }).join('')
  ).join('')}
                        </tbody>
                </table>
                </div>
            ` : ''}
            
            <!-- Economía de Doblones -->
            <div class="seccion-produccion seccion-doblones">
                <h4>💰 Economía de Doblones</h4>
                <div class="economia-grid">
                    <div class="economia-ingresos">
                        <h5>📈 Ingresos</h5>
                        <div class="economia-item positivo">
                            <span>Tributos</span>
                            <span>+${(TRIBUTOS[a.tributo]?.doblones || 0) * (estadoSimulacion?.poblacion?.length || 0)}</span>
                        </div>
                        ${stats.ingresosDoblones > 0 ? `
                            <div class="economia-item positivo">
                                <span>Edificios</span>
                                <span>+${stats.ingresosDoblones}</span>
                            </div>
                        ` : ''}
                        <div class="economia-item total positivo">
                            <span><strong>Total Ingresos</strong></span>
                            <span><strong>+${((TRIBUTOS[a.tributo]?.doblones || 0) * (estadoSimulacion?.poblacion?.length || 0)) + stats.ingresosDoblones}</strong></span>
                        </div>
                    </div>
                    <div class="economia-gastos">
                        <h5>📉 Gastos</h5>
                        <div class="economia-item negativo">
                            <span>Mantenimiento Edificios</span>
                            <span>-${stats.mantenimientoEdificios || 0}</span>
                        </div>
                        <div class="economia-item total negativo">
                            <span><strong>Total Gastos</strong></span>
                            <span><strong>-${stats.mantenimientoEdificios || 0}</strong></span>
                        </div>
                    </div>
                </div>
                <div class="economia-balance ${(((TRIBUTOS[a.tributo]?.doblones || 0) * (estadoSimulacion?.poblacion?.length || 0)) + stats.ingresosDoblones - (stats.mantenimientoEdificios || 0)) >= 0 ? 'positivo' : 'negativo'}">
                    <span>⚖️ Balance Neto por Turno</span>
                    <span class="balance-valor">${(((TRIBUTOS[a.tributo]?.doblones || 0) * (estadoSimulacion?.poblacion?.length || 0)) + stats.ingresosDoblones - (stats.mantenimientoEdificios || 0)) >= 0 ? '+' : ''}${((TRIBUTOS[a.tributo]?.doblones || 0) * (estadoSimulacion?.poblacion?.length || 0)) + stats.ingresosDoblones - (stats.mantenimientoEdificios || 0)}</span>
                </div>
            </div>

            <div class="produccion-footer">
                <div class="alerta-produccion info">
                ℹ️ <strong>Nota:</strong> Los recursos del Bioma requieren trabajadores. Los edificios requieren cuotas asignadas.
                </div>
            </div>
        </div>
    </div>
  `;
}


function renderizarPestanaCrecimiento(a, stats) {
  // Calcular datos de crecimiento
  const gradoData = GRADOS[a.grado];
  const baseInmigracion = gradoData.inmigracion;
  const modCalidad = stats.calidadTotal;

  // Calcular bonos de monstruos
  let bonoMonstruos = 0;
  if (estadoSimulacion && estadoSimulacion.poblacion) {
    estadoSimulacion.poblacion.forEach(c => {
      const nat = NATURALEZAS_POBLACION[c.naturaleza];
      if (nat) bonoMonstruos += nat.bonoInmigracion;
    });
  }

  const totalInmigracion = Math.max(0, baseInmigracion + modCalidad + bonoMonstruos);

  // Crecimiento natural
  const cuotasPlebeyos = estadoSimulacion ? estadoSimulacion.poblacion.filter(c => c.rol === 'Plebeyo').length : 0;
  const totalNacimientos = cuotasPlebeyos; // 1 por cuota

  // Consolidación
  const pendiente = estadoSimulacion ? estadoSimulacion.inmigracionPendiente : 0;
  const metaConsolidacion = CONVERSION.CUOTA_POBLACION; // 20
  const porcentajeConsolidacion = Math.min(100, (pendiente / metaConsolidacion) * 100);

  return `
  < div class="grid-crecimiento" >
        <div class="panel panel-crecimiento">
            <h3>🌍 Inmigración (Externa)</h3>
            <div class="panel-contenido">
                <div class="desglose-lista">
                    <div class="desglose-item">
                        <span>Base del Grado (${a.grado})</span>
                        <span>${formatearValor(baseInmigracion)}</span>
                    </div>
                    <div class="desglose-item">
                        <span>Calidad del Asentamiento</span>
                        <span class="${obtenerClaseColor('Calidad', modCalidad)}">${formatearValor(modCalidad)}</span>
                    </div>
                    ${bonoMonstruos !== 0 ? `
                    <div class="desglose-item">
                        <span>Bono Naturaleza/Monstruos</span>
                        <span class="positivo">+${bonoMonstruos}</span>
                    </div>
                    ` : ''}
                    <div class="desglose-total">
                        <span>Total Inmigración</span>
                        <strong>+${totalInmigracion} medidas/turno</strong>
                    </div>
                </div>
            </div>
        </div>

        <div class="panel panel-crecimiento">
            <h3>👶 Crecimiento Natural (Interno)</h3>
            <div class="panel-contenido">
                <div class="desglose-lista">
                    <div class="desglose-item">
                        <span>Cuotas de Plebeyos Activas</span>
                        <span>${cuotasPlebeyos}</span>
                    </div>
                    <div class="desglose-item">
                        <span>Tasa de Natalidad</span>
                        <span>x1</span>
                    </div>
                    <div class="desglose-total">
                        <span>Total Nacimientos</span>
                        <strong>+${totalNacimientos} medidas/turno</strong>
                    </div>
                </div>
            </div>
        </div>

        <div class="panel panel-full panel-consolidacion">
            <h3>📈 Consolidación de Población</h3>
            <div class="panel-contenido">
                <p class="descripcion-consolidacion">Las medidas de población (inmigrantes + nacimientos) se acumulan hasta formar una nueva Cuota completa.</p>
                
                <div class="barra-progreso-container">
                    <div class="barra-info">
                        <span>Progreso Actual</span>
                        <span><strong>${pendiente}</strong> / ${metaConsolidacion} medidas</span>
                    </div>
                    <div class="barra-track">
                        <div class="barra-fill" style="width: ${porcentajeConsolidacion}%"></div>
                    </div>
                </div>
                
                ${pendiente >= metaConsolidacion ? `
                    <div class="alerta-consolidacion positivo">
                        ✨ ¡Nueva Cuota lista para formarse el próximo turno!
                    </div>
                ` : ''}
            </div>
        </div>
    </div >
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

  // Stats Barra
  const capacidadMaxCuotas = stats.grado.almacenamiento;
  const capacidadMaxMedidas = capacidadMaxCuotas * 10;
  const ocupado = Object.values(almacen).reduce((sum, val) => sum + val, 0);
  const porcentaje = Math.min(100, (ocupado / capacidadMaxMedidas) * 100);
  const estadoBarra = porcentaje >= 100 ? 'critico' : porcentaje >= 80 ? 'alerta' : 'normal';

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
    </div>
    `;
}

function renderizarPestanaComercio(a, stats) {
  return `
    <div class="panel panel-full">
        <h3>⚖️ Centro de Comercio</h3>
        <div class="panel-contenido">
            <div class="panel-vacio" style="text-align: center; padding: 3rem;">
                <div class="icono-vacio" style="font-size: 3rem; margin-bottom: 1rem;">🚢</div>
                <p>El mercado está tranquilo de momento.</p>
                <small style="color: #aaa;">Aquí podrás intercambiar recursos por doblones u otros bienes, lo que afectará directamente a tu Almacenamiento.</small>
            </div>
        </div>
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

function renderizarPestanaEdificios(a, stats) {
  const gradoActual = GRADOS[a.grado]?.nivel || 1;

  // === SECCIÓN 1: EDIFICIOS CONSTRUIDOS (INSTANCIAS) ===
  // Migración On-the-fly de strings a objetos (legacy support)
  const edificiosInstancias = (estadoApp.asentamiento.edificios || []).map((e, idx) => {
    if (typeof e === 'string') return { id: `${e}_legacy_${idx}`, nombre: e, receta: null };
    return e;
  });

  let htmlConstruidos = '';
  if (edificiosInstancias.length > 0) {
    htmlConstruidos += `<div class="seccion-construidos"><h3>🏗️ Edificios Activos</h3><div class="edificios-grid">`;

    edificiosInstancias.forEach(instancia => {
      const edificio = EDIFICIOS[instancia.nombre];
      if (!edificio) return;

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

  // Add building instance
  const newId = `${popupConstruccionActivo}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const nuevaInstancia = {
    id: newId,
    nombre: popupConstruccionActivo,
    grado: 1,
    receta: null
  };

  if (!estadoApp.asentamiento.edificios) {
    estadoApp.asentamiento.edificios = [];
  }
  estadoApp.asentamiento.edificios.push(nuevaInstancia);

  // Initialize building state in simulation
  if (!estadoSimulacion.edificiosEstado) {
    estadoSimulacion.edificiosEstado = {};
  }
  estadoSimulacion.edificiosEstado[newId] = { grado: 1, activo: true };

  cerrarPopupConstruccion();
  actualizarHUD();
  console.log(`✅ Edificio construido: ${popupConstruccionActivo}`);
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
  const list = estadoApp.asentamiento.edificios || [];
  const inst = list.find(e => (typeof e === 'string' ? false : e.id === instanceId));

  if (inst) {
    inst.receta = nuevaReceta;

    // Sincronizar con el estado de simulación explícitamente
    if (estadoSimulacion.edificiosEstado && estadoSimulacion.edificiosEstado[instanceId]) {
      estadoSimulacion.edificiosEstado[instanceId].recetaActual = nuevaReceta;
      estadoSimulacion.edificiosEstado[instanceId].activo = !!nuevaReceta;
    }

    guardarExpedicion();
    renderizarPantalla();
  }
}

// =====================================================
// POPUP DE MEJORA - Selección de Opciones de Coste
// =====================================================

let popupMejoraActivo = null;

function mostrarPopupMejora(instanciaId) {
  const instancia = (estadoApp.asentamiento.edificios || []).find(e => (typeof e !== 'string' && e.id === instanciaId));
  if (!instancia) {
    console.error('Instancia no encontrada:', instanciaId);
    return;
  }

  const edificio = EDIFICIOS[instancia.nombre];
  if (!edificio) return;

  popupMejoraActivo = instanciaId;
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

  instancia.grado = (instancia.grado || 1) + 1;

  if (estadoSimulacion.edificiosEstado && estadoSimulacion.edificiosEstado[instancia.id]) {
    estadoSimulacion.edificiosEstado[instancia.id].grado = instancia.grado;
  }

  cerrarPopupMejora();
  actualizarHUD();
  mostrarNotificacion(`✅ ${instancia.nombre} mejorado a Grado ${instancia.grado}`);
}
