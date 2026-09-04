// ===\r\n// CONFIG: constantes de velocidad, tiempos y costos de la tienda.\r\n// No contiene lógica, solo valores fijos usados por el resto\r\n// de los módulos.\r\n// ===
// Valores de configuración; la velocidad base permite recorridos más ágiles.
const velocidadMovimiento = 0.00010;
const intervaloMovimiento = 80;
const duracionNitro = 5000;
const cantidadNitros = 4;
const velocidadNitro = 0.00013;
const metrosPorGrado = 111000;
const velocidadMaquina = velocidadMovimiento * metrosPorGrado;
const velocidadAutopiloto = 4.5;
const pulsacionesNecesarias = 5;
// Tiempo de espera del primer obstáculo y de los obstáculos siguientes.
const demoraPrimerObstaculo = 1500;
const intervaloObstaculos = 20000;
const servicioRutas = 'https://router.project-osrm.org/route/v1/driving';

// Costos usados por la tienda para desbloquear o equipar vehículos.
const costosVehiculos = {
    clasico: 0,
    turbo: 200,
    neon: 400,
    taxi: 600
};