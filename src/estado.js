// ===\r\n// ESTADO: variables mutables compartidas por toda la aplicación\r\n// (mapa, marcadores, misión activa, progreso del jugador,\r\n// puntuación y vehículos desbloqueados). Al ser scripts clásicos\r\n// cargados en orden, estas variables quedan disponibles para\r\n// el resto de los archivos de src/.\r\n// ===

// Referencias a capas y marcadores que Leaflet actualiza durante la partida.
let mapa;
let marcadorJugador;
let marcadorMaquina;
let marcadorOrigen;
let marcadorDestino;
let marcadoresNitro = [];
let lineaRuta;
let lineaOptima;
// Identifica la consulta de calles vigente para ignorar respuestas antiguas.
let solicitudRuta = 0;
let geometriaRutaCalles;
// Evita que los vehículos se muevan antes de recibir la ruta de calles.
let rutaCallesLista = false;
// Índices independientes para avanzar por los puntos de la calle en cada competidor.
let indiceRutaJugador = 0;
let indiceCalleAutopiloto = 0;
let indiceCalleMaquina = 0;
// Variables que representan la misión, el jugador y su progreso actual.
let nombreJugador = '';
let modo = 'manual';
let origen;
let destino;
let actual;
let caminoOptimo = [];
let caminoJugador = [];
let inicioPartida = 0;
let idTemporizador;
let puntuacion = 0;
let mejorPuntuacion = Number(localStorage.getItem('bfs-record') || 0);
let temporizadorAutomatico;
let temporizadorMaquina;
let indiceMaquina = 0;
let posicionJugador;
let recorridoLibre = [];
let pasosJugador = 0;
let teclasPresionadas = new Set();
let temporizadorMovimiento;
let temporizadorCarrera;
let posicionMaquina;
let nitroDisponible = 0;
let nitroEnMapa = false;
let nitroActivo = false;
let temporizadorNitro;
let jugadorDetenidoHasta = 0;
let controlesInvertidosHasta = 0;
let temporizadorObstaculo;
let temporizadorAlertaObstaculo;
let temporizadorCuentaAviso;
let temporizadorCuentaRegresiva;
let carreraIniciada = false;
let vehiculoDetenido = false;
let pulsacionesReparacion = 0;

// Guarda en el navegador los vehículos que el jugador ya compró.
let vehiculosDesbloqueados = JSON.parse(
    localStorage.getItem('vehiculos-desbloqueados') || '["clasico"]'
);
let vehiculoSeleccionado = localStorage.getItem('vehiculo-seleccionado') || 'clasico';

// Indica si la vista 3D está abierta, para pausar los controles del mapa 2D.
let modo3DActivo = false;
