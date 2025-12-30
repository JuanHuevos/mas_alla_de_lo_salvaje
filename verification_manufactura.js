const data = require('./js/data.js');
const sim = require('./js/simulation.js');

// Mock Globals for simulation.js (it assumes browser environment for data constants)
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

console.log("Starting Verification...");

// Setup State
sim.resetearSimulacion();
const estado = sim.estadoSimulacion;

// Add generic resources to storage
estado.almacen = {
    "Alimento": 100, // For input consumption
    "Madera": 50,
    "Metal": 50
};
console.log("Initial Storage:", JSON.stringify(estado.almacen));

// Mock Population
// 1 Quotas = 20 workers (implied)
estado.poblacion = [
    { id: 1, rol: "Plebeyo", medidas: 20, asignacion: "edificio:Manufactura" }
];

// Mock Settlement
// Note: simulation.js mostly uses 'asentamiento' passed to functions, AND 'estadoSimulacion.edificiosEstado'
const asentamientoMock = {
    grado: "Estamento",
    edificios: ["Manufactura"],
    recursos: {},
    tributo: "Sin Tributo"
};

// Initialize building state
sim.estadoSimulacion.edificiosEstado = {
    "Manufactura": {
        grado: 1,
        recetaActual: "suministros"
        // "suministros": { "edificio": "Manufactura", "input": { "Alimento": 20 }, "output": { "Recurso": "Suministros", "Cantidad": 10 }, "desc": "Sustento básico para expediciones." },
    }
};

console.log("Running Turn with Manufactura (Suministros recipe)...");

// Run Logic
// We specifically test faseEconomia or execution context
// But executeTurno calls faseEconomia.
const result = sim.ejecutarTurno(asentamientoMock);

console.log("\n--- Results ---");
console.log("Logs:", result.log);
console.log("\nFinal Storage:", JSON.stringify(estado.almacen));

// Verification Logic
// Input: 20 Alimento per quota. Quota=1 (20 measures implied? No, logic uses count).
// logic: "const cuotasEfectivas = Math.min(disponiblesParaTipo, capacidad);"
// Manufactura capacity: Base 4.
// Available workers: 1 quota.
// Effective: 1.
// Consumption: 20 Alimento * 1 = 20.
// Production: 10 Suministros * 1 = 10.
// Net Storage change: Alimento 100 -> 80 (-20). Suministros 0 -> 10.
// Wait, 'faseAlimentacion' ALSO consumes food!
// 1 Quota consumes 1 Food in faseAlimentacion.
// So final Alimento should be 100 - 20 (Manufactura) - 1 (Sustento) = 79.

const expectedAlimento = 79;
const expectedSuministros = 10;

const actualAlimento = estado.almacen["Alimento"];
const actualSuministros = estado.almacen["Suministros"];

console.log(`\nExpected Alimento: ~${expectedAlimento}, Actual: ${actualAlimento}`);
console.log(`Expected Suministros: ${expectedSuministros}, Actual: ${actualSuministros}`);

if (actualSuministros === expectedSuministros && actualAlimento === expectedAlimento) {
    console.log("SUCCESS: Manufactura logic verified.");
} else {
    console.error("FAILURE: Values do not match expectations.");
}
