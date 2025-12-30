const data = require('./js/data.js');
const sim = require('./js/simulation.js');

// Mock Globals
global.CONVERSION = { CUOTA_POBLACION: 20 };
global.NATURALEZAS_POBLACION = {};
global.GRADOS = data.GRADOS;
global.TRIBUTOS = data.TRIBUTOS;
global.RECURSOS = data.RECURSOS;
global.EDIFICIOS = data.EDIFICIOS;
global.RECETAS_MANUFACTURA = data.RECETAS_MANUFACTURA;
global.PROPIEDADES = data.PROPIEDADES;
global.PECULIARIDADES = data.PECULIARIDADES;
global.NIVELES_ABUNDANCIA = data.NIVELES_ABUNDANCIA;

sim.resetearSimulacion();
const estado = sim.estadoSimulacion;

// Resources
estado.almacen = { "Alimento": 100, "Carbon": 100, "Madera": 100, "Roca": 100 };

// Buildings: 2 Manufacturas
const manuf1 = { id: "manuf_1", nombre: "Manufactura", receta: "suministros" }; // Requires Alimento -> Suministros
const manuf2 = { id: "manuf_2", nombre: "Manufactura", receta: "herramientas" }; // Requires Roca -> Herramientas

// Population: 2 Quotas
// Quota 1: Generic (should fill first available slot) -> Manuf 1
// Quota 2: Specific to Manuf 2 -> Manuf 2
estado.poblacion = [
    { id: 1, rol: "Plebeyo", medidas: 20, asignacion: "edificio:Manufactura" }, // Generic
    { id: 2, rol: "Plebeyo", medidas: 20, asignacion: "edificio_id:manuf_2" } // Specific
];

const asentamientoMock = {
    grado: "Estamento",
    edificios: [manuf1, manuf2],
    recursos: {},
    tributo: "Sin Tributo"
};

sim.estadoSimulacion.edificiosEstado = {
    "manuf_1": { grado: 1, recetaActual: "suministros" },
    "manuf_2": { grado: 1, recetaActual: "herramientas" }
};

console.log("Running Turn...");
const result = sim.ejecutarTurno(asentamientoMock);

// Verification:
// Manuf 1 (Generic worker): Consumes Alimento, Produces Suministros
// Manuf 2 (Specific worker): Consumes Roca, Produces Herramientas

const prodSuministros = estado.almacen["Suministros"] || 0;
const prodHerramientas = estado.almacen["Herramientas"] || 0;

console.log("Suministros:", prodSuministros, "(Expected 10)");
console.log("Herramientas:", prodHerramientas, "(Expected 10)");

if (prodSuministros === 10 && prodHerramientas === 10) {
    console.log("SUCCESS: Mixed generic and specific assignment verified.");
} else {
    console.error("FAILURE: Production mismatch.");
}
