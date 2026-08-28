
// Catálogo de lugares: guarda el nombre visible y la posición de cada destino.
const lugares = {
	ejido: { nombre: 'Parque El Ejido', latitud: -0.2015, longitud: -78.4974 },
	alameda: { nombre: 'Parque La Alameda', latitud: -0.2135, longitud: -78.5002 },
	plaza: { nombre: 'Plaza Grande', latitud: -0.2202, longitud: -78.5121 },
	mariscal: { nombre: 'La Mariscal', latitud: -0.1974, longitud: -78.4938 },
	carolina: { nombre: 'Parque La Carolina', latitud: -0.1807, longitud: -78.4797 },
	quicentro: { nombre: 'Quicentro Norte', latitud: -0.1766, longitud: -78.4806 },
	inaquito: { nombre: 'Iñaquito', latitud: -0.1737, longitud: -78.4851 },
	cumbaya: { nombre: 'Cumbayá', latitud: -0.2026, longitud: -78.4275 },
	sanrafael: { nombre: 'San Rafael', latitud: -0.2974, longitud: -78.4551 },
	conocoto: { nombre: 'Conocoto', latitud: -0.3151, longitud: -78.4771 },
	triangulo: { nombre: 'El Triángulo', latitud: -0.3007, longitud: -78.4579 },
	sangolqui: { nombre: 'Sangolquí', latitud: -0.3304, longitud: -78.4525 }
};

// Grafo educativo: conecta los destinos que BFS puede visitar durante el cálculo.
const grafo = {
	ejido: ['alameda', 'mariscal'],
	alameda: ['ejido', 'plaza', 'mariscal'],
	plaza: ['alameda'],
	mariscal: ['ejido', 'alameda', 'carolina'],
	carolina: ['mariscal', 'quicentro', 'inaquito', 'cumbaya'],
	quicentro: ['carolina', 'inaquito'],
	inaquito: ['carolina', 'quicentro'],
	cumbaya: ['carolina', 'sanrafael'],
	sanrafael: ['cumbaya', 'triangulo'],
	triangulo: ['sanrafael', 'conocoto', 'sangolqui'],
	conocoto: ['triangulo', 'sangolqui'],
	sangolqui: ['triangulo', 'conocoto']
};

// Obtiene un elemento de la interfaz a partir de su identificador HTML.
const obtenerElemento = (identificador) => document.getElementById(identificador);

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
let indiceCaminoMaquina = 0;
let nitroDisponible = 0;
let nitroEnMapa = false;
let nitroActivo = false;
let temporizadorNitro;
let jugadorDetenidoHasta = 0;
let controlesInvertidosHasta = 0;
let temporizadorObstaculo;
let temporizadorAlertaObstaculo;
let temporizadorCuentaRegresiva;
let carreraIniciada = false;
let vehiculoDetenido = false;
let pulsacionesReparacion = 0;

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
const servicioRutas = 'https://router.project-osrm.org/route/v1/driving';

// Costos usados por la tienda para desbloquear o equipar vehículos.
const costosVehiculos = {
	clasico: 0,
	turbo: 200,
	neon: 400,
	taxi: 600
};

// Guarda en el navegador los vehículos que el jugador ya compró.
let vehiculosDesbloqueados = JSON.parse(
	localStorage.getItem('vehiculos-desbloqueados') || '["clasico"]'
);
let vehiculoSeleccionado = localStorage.getItem('vehiculo-seleccionado') || 'clasico';

// Encuentra el camino más corto entre dos lugares usando el algoritmo BFS.
function buscarAnchura(inicio, fin) {
	const cola = [inicio];
	const anterior = { [inicio]: null };

	while (cola.length) {
		const nodo = cola.shift();

		if (nodo === fin) {
			break;
		}

		grafo[nodo].forEach((siguiente) => {
			if (!(siguiente in anterior)) {
				anterior[siguiente] = nodo;
				cola.push(siguiente);
			}
		});
	}

	const camino = [];
	let nodoActual = fin;

	while (nodoActual !== null && nodoActual !== undefined) {
		camino.unshift(nodoActual);
		nodoActual = anterior[nodoActual];
	}

	return camino;
}

// Reinicia el recorrido y prepara una partida con los puntos indicados.
function generarRuta(origenElegido, destinoElegido) {
	clearInterval(temporizadorAutomatico);
	clearInterval(temporizadorMaquina);
	clearInterval(temporizadorMovimiento);
	clearInterval(temporizadorCarrera);
	clearTimeout(temporizadorNitro);
	clearTimeout(temporizadorObstaculo);
	clearTimeout(temporizadorAlertaObstaculo);
	clearInterval(temporizadorCuentaRegresiva);
	teclasPresionadas.clear();
	const contadorCarrera = obtenerElemento('race-countdown');
	const alertaObstaculo = obtenerElemento('obstacle-alert');
	contadorCarrera.classList.add('hidden');
	contadorCarrera.textContent = '5';
	alertaObstaculo.classList.remove('active');
	alertaObstaculo.classList.add('hidden');
	temporizadorMovimiento = undefined;
	temporizadorCarrera = undefined;
	marcadoresNitro.forEach((marcador) => mapa.removeLayer(marcador));
	marcadoresNitro = [];
	temporizadorObstaculo = undefined;
	temporizadorAlertaObstaculo = undefined;
	temporizadorCuentaRegresiva = undefined;
	carreraIniciada = modo !== 'versus';
	vehiculoDetenido = false;
	pulsacionesReparacion = 0;
	nitroActivo = false;
	nitroDisponible = 0;
	nitroEnMapa = false;
	jugadorDetenidoHasta = 0;
	controlesInvertidosHasta = 0;

	origen = origenElegido;
	destino = destinoElegido;
	caminoOptimo = buscarAnchura(origen, destino);
	geometriaRutaCalles = undefined;
	actual = origen;
	caminoJugador = [origen];
	posicionJugador = obtenerPunto(origen);
	recorridoLibre = [posicionJugador.slice()];
	posicionMaquina = obtenerPunto(origen);
	indiceCaminoMaquina = 0;
	pasosJugador = 0;
	indiceMaquina = 0;
	inicioPartida = Date.now();

	clearInterval(idTemporizador);
	if (modo !== 'versus') {
		idTemporizador = setInterval(actualizarTiempo, 1000);
	}

	dibujarRuta();
	actualizarPanel();

	if (modo === 'auto') {
		ejecutarAutopiloto();
	} else if (modo === 'versus') {
		colocarNitro();
		iniciarCuentaRegresiva();
	}
}

// Permite elegir una ruta nueva desde la tarjeta de misión.
function calcularRutaSeleccionada() {
	const origenElegido = obtenerElemento('origin-select').value;
	const destinoElegido = obtenerElemento('destination-select').value;

	if (!origenElegido || !destinoElegido || origenElegido === destinoElegido) {
		mostrarAviso('Elige dos puntos diferentes para calcular la ruta');
		return;
	}

	generarRuta(origenElegido, destinoElegido);
}

// Crea una ruta aleatoria válida y la inicia en manual, automático o versus.
function generarRutaAutomatica() {
	const lugaresDisponibles = Object.keys(lugares);
	let origenAutomatico;
	let destinoAutomatico;

	do {
		origenAutomatico = lugaresDisponibles[Math.floor(Math.random() * lugaresDisponibles.length)];
		destinoAutomatico = lugaresDisponibles[Math.floor(Math.random() * lugaresDisponibles.length)];
	} while (origenAutomatico === destinoAutomatico);

	obtenerElemento('origin-select').value = origenAutomatico;
	obtenerElemento('destination-select').value = destinoAutomatico;
	generarRuta(origenAutomatico, destinoAutomatico);
}

// Avanza una posición hacia otra usando una distancia fija en metros.
function avanzarHacia(posicion, objetivo, velocidad) {
	const distancia = mapa.distance(posicion, objetivo);

	if (distancia === 0 || distancia <= velocidad) {
		return objetivo.slice();
	}

	const proporcion = velocidad / distancia;
	return [
		posicion[0] + (objetivo[0] - posicion[0]) * proporcion,
		posicion[1] + (objetivo[1] - posicion[1]) * proporcion
	];
}

// Crea el mapa de Leaflet, configura el zoom y carga sus mapas base.
function inicializarMapa() {
	mapa = L.map('map', { zoomControl: false, keyboard: false })
		.setView([-0.235, -78.475], 11);

	L.control.zoom({ position: 'bottomright' }).addTo(mapa);

	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '© OpenStreetMap contributors'
	}).addTo(mapa);
}

// Muestra el conteo de 5 a 0 antes de iniciar la carrera.
function iniciarCuentaRegresiva() {
	const contador = obtenerElemento('race-countdown');
	let numero = 5;

	contador.textContent = numero;
	contador.classList.remove('hidden');

	temporizadorCuentaRegresiva = setInterval(() => {
		numero -= 1;

		if (numero === 0) {
			contador.textContent = '¡YA!';
			carreraIniciada = true;
			inicioPartida = Date.now();
			idTemporizador = setInterval(actualizarTiempo, 1000);
			ejecutarMaquina();
			clearInterval(temporizadorCuentaRegresiva);
			setTimeout(() => contador.classList.add('hidden'), 700);
			return;
		}

		contador.textContent = numero;
	}, 1000);
}

// Coloca el poder nitro en un punto aleatorio de la ruta óptima.
function colocarNitro() {
	const iconoNitro = L.divIcon({
		className: 'nitro-marker',
		html: '<div class="nitro-avatar">N</div>',
		iconSize: [34, 34],
		iconAnchor: [17, 17]
	});

	const indicesNitro = [
		1,
		Math.min(2, caminoOptimo.length - 1),
		Math.floor(caminoOptimo.length * 0.45),
		Math.floor(caminoOptimo.length * 0.7)
	].slice(0, cantidadNitros);

	[...new Set(indicesNitro)].forEach((indice) => {
		const lugarNitro = caminoOptimo[indice];
		const marcador = L.marker(obtenerPunto(lugarNitro), {
			icon: iconoNitro
		}).addTo(mapa);
		marcadoresNitro.push(marcador);
	});
	nitroEnMapa = true;
}

// Crea el avatar visual que representa a un vehículo en el mapa.
function crearIconoVehiculo(claseVehiculo) {
	return L.divIcon({
		className: 'vehicle-marker',
		html: `<div class="vehicle-avatar ${claseVehiculo}" aria-label="Vehículo"><span class="carro-sombra"></span><span class="carro-cuerpo"></span><span class="carro-cabina"><i class="carro-ventana ventana-izquierda"></i><i class="carro-ventana ventana-derecha"></i></span><i class="carro-luz luz-trasera"></i><i class="carro-luz luz-delantera"></i><i class="carro-rueda rueda-izquierda"></i><i class="carro-rueda rueda-derecha"></i></div>`,
		iconSize: [82, 68],
		iconAnchor: [41, 34]
	});
}

// Convierte un lugar en coordenadas que Leaflet puede dibujar.
function obtenerPunto(identificador) {
	return [lugares[identificador].latitud, lugares[identificador].longitud];
}

// Pide a OSRM la geometría de las calles para evitar atravesar edificios o montañas.
async function cargarRutaPorCalles() {
	const solicitudActual = ++solicitudRuta;
	const puntoOrigen = obtenerPunto(origen);
	const puntoDestino = obtenerPunto(destino);
	const coordenadas = `${puntoOrigen[1]},${puntoOrigen[0]};${puntoDestino[1]},${puntoDestino[0]}`;

	try {
		const respuesta = await fetch(`${servicioRutas}/${coordenadas}?overview=full&geometries=geojson`);
		if (!respuesta.ok) throw new Error('No se pudo consultar el servicio de calles');

		const datos = await respuesta.json();
		if (solicitudActual !== solicitudRuta || !datos.routes?.length) return;

		geometriaRutaCalles = datos.routes[0].geometry.coordinates.map(([longitud, latitud]) => [latitud, longitud]);
		lineaOptima.setLatLngs(geometriaRutaCalles);
		mapa.fitBounds(lineaOptima.getBounds(), { padding: [70, 70] });
		mostrarAviso('Ruta calculada por calles reales');
	} catch (error) {
		if (solicitudActual === solicitudRuta) {
			mostrarAviso('No se pudo cargar la ruta por calles; se muestra la ruta BFS');
		}
	}
}

// Dibuja las rutas y actualiza los marcadores A, B y del vehículo.
function dibujarRuta() {
	if (lineaRuta) mapa.removeLayer(lineaRuta);
	if (lineaOptima) mapa.removeLayer(lineaOptima);
	if (marcadorJugador) mapa.removeLayer(marcadorJugador);
	if (marcadorOrigen) mapa.removeLayer(marcadorOrigen);
	if (marcadorDestino) mapa.removeLayer(marcadorDestino);
	if (marcadorMaquina) mapa.removeLayer(marcadorMaquina);

	lineaOptima = L.polyline(geometriaRutaCalles || caminoOptimo.map(obtenerPunto), {
		color: '#c7f36b',
		weight: 5,
		opacity: 0.9,
		dashArray: '8 8'
	}).addTo(mapa);

	if (modo === 'manual' || modo === 'versus') {
		lineaRuta = L.polyline(recorridoLibre, {
			color: '#d9463e',
			weight: 5,
			opacity: 0.95
		}).addTo(mapa);
	} else {
		lineaRuta = L.polyline(caminoJugador.map(obtenerPunto), {
			color: '#4f9eb0',
			weight: 7,
			opacity: 0.9
		}).addTo(mapa);
	}

	const iconoOrigen = L.divIcon({
		className: 'route-marker',
		html: '<div class="origin-avatar">A</div>',
		iconSize: [30, 30],
		iconAnchor: [15, 15]
	});

	const iconoDestino = L.divIcon({
		className: 'route-marker',
		html: '<div class="destination-avatar">B</div>',
		iconSize: [30, 30],
		iconAnchor: [15, 15]
	});

	marcadorOrigen = L.marker(obtenerPunto(origen), { icon: iconoOrigen }).addTo(mapa);
	marcadorDestino = L.marker(obtenerPunto(destino), {
		icon: iconoDestino
	}).addTo(mapa);
	marcadorJugador = L.marker(posicionJugador, {
		icon: crearIconoVehiculo(`skin-${vehiculoSeleccionado}`)
	}).addTo(mapa);

	if (modo === 'versus') {
		marcadorMaquina = L.marker(posicionMaquina, {
			icon: crearIconoVehiculo('vehiculo-maquina')
		}).addTo(mapa);
	}

	mapa.fitBounds(L.latLngBounds(caminoOptimo.map(obtenerPunto)), {
		padding: [70, 70]
	});
	cargarRutaPorCalles();
}

// Actualiza la información de la misión, posición, pasos y puntuación.
function actualizarPanel() {
	obtenerElemento('origin-label').textContent = lugares[origen].nombre;
	obtenerElemento('destination-label').textContent = lugares[destino].nombre;
	obtenerElemento('position-value').textContent = lugares[actual].nombre;
	obtenerElemento('steps-value').textContent = modo === 'manual'
		? pasosJugador
		: caminoJugador.length - 1;
	obtenerElemento('optimal-value').textContent = `${caminoOptimo.length - 1} pasos`;
	obtenerElemento('queue-value').textContent = caminoOptimo
		.slice(0, Math.min(5, caminoOptimo.length))
		.map((identificador) => lugares[identificador].nombre.split(' ')[0])
		.join(' → ');
	obtenerElemento('score-value').textContent = String(puntuacion).padStart(4, '0');
	obtenerElemento('record-value').textContent = String(mejorPuntuacion).padStart(4, '0');
	actualizarTienda();
}

// Actualiza el saldo y el estado de cada vehículo disponible en la tienda.
function actualizarTienda() {
	obtenerElemento('shop-balance').textContent = String(puntuacion).padStart(4, '0');

	document.querySelectorAll('.skin-button').forEach((boton) => {
		const vehiculo = boton.dataset.skin;
		const desbloqueado = vehiculosDesbloqueados.includes(vehiculo);
		const costo = costosVehiculos[vehiculo];
		const textoEstado = boton.querySelector('small');

		boton.classList.toggle('active', vehiculo === vehiculoSeleccionado);
		boton.classList.toggle('locked', !desbloqueado);
		textoEstado.textContent = vehiculo === vehiculoSeleccionado
			? 'EQUIPADO'
			: desbloqueado ? 'EQUIPAR' : `${costo} PUNTOS`;
	});
}

// Compra un vehículo o equipa uno que ya fue desbloqueado.
function comprarVehiculo(vehiculo) {
	const costo = costosVehiculos[vehiculo];

	if (vehiculosDesbloqueados.includes(vehiculo)) {
		vehiculoSeleccionado = vehiculo;
		localStorage.setItem('vehiculo-seleccionado', vehiculoSeleccionado);
		dibujarRuta();
		actualizarTienda();
		return;
	}

	if (puntuacion < costo) {
		mostrarAviso(`Necesitas ${costo} puntos para comprar este vehículo`);
		return;
	}

	puntuacion -= costo;
	vehiculosDesbloqueados.push(vehiculo);
	vehiculoSeleccionado = vehiculo;
	localStorage.setItem('vehiculos-desbloqueados', JSON.stringify(vehiculosDesbloqueados));
	localStorage.setItem('vehiculo-seleccionado', vehiculoSeleccionado);
	actualizarPanel();
	dibujarRuta();
	mostrarAviso('Vehículo comprado y equipado');
}

// Calcula y muestra el tiempo transcurrido desde el inicio de la partida.
function actualizarTiempo() {
	const tiempoTranscurrido = Math.floor((Date.now() - inicioPartida) / 1000);
	const minutos = String(Math.floor(tiempoTranscurrido / 60)).padStart(2, '0');
	const segundos = String(tiempoTranscurrido % 60).padStart(2, '0');

	obtenerElemento('time-value').textContent = `${minutos}:${segundos}`;
}

// Mueve el vehículo libremente por el mapa a una velocidad controlada.
function moverJugadorLibre() {
	if ((modo !== 'manual' && modo !== 'versus') || !posicionJugador) return;
	if (modo === 'versus' && !carreraIniciada) return;

	if (vehiculoDetenido || Date.now() < jugadorDetenidoHasta) return;

	if (!teclasPresionadas.size) return;

	const nuevaPosicion = [...posicionJugador];
	const velocidadActual = nitroActivo ? velocidadNitro : velocidadMovimiento;
	const invertirControles = Date.now() < controlesInvertidosHasta;
	const factorDireccion = invertirControles ? -1 : 1;

	if (teclasPresionadas.has('ArrowUp')) nuevaPosicion[0] += velocidadActual * factorDireccion;
	if (teclasPresionadas.has('ArrowDown')) nuevaPosicion[0] -= velocidadActual * factorDireccion;
	if (teclasPresionadas.has('ArrowLeft')) nuevaPosicion[1] -= velocidadActual * factorDireccion;
	if (teclasPresionadas.has('ArrowRight')) nuevaPosicion[1] += velocidadActual * factorDireccion;

	posicionJugador = nuevaPosicion;

	pasosJugador += 1;
	recorridoLibre.push(posicionJugador.slice());
	marcadorJugador.setLatLng(posicionJugador);
	lineaRuta.setLatLngs(recorridoLibre);
	actualizarPanel();
	comprobarNitro();

	const distanciaAlDestino = mapa.distance(
		posicionJugador,
		obtenerPunto(destino)
	);

	if (distanciaAlDestino < 35) {
		posicionJugador = obtenerPunto(destino);
		marcadorJugador.setLatLng(posicionJugador);
		actual = destino;
		actualizarPanel();
		finalizarPartida(true);
	}
}

// Comprueba si el vehículo del jugador recogió el poder nitro.
function comprobarNitro() {
	if (!nitroEnMapa || !marcadoresNitro.length) return;

	const indiceNitro = marcadoresNitro.findIndex((marcador) => (
		mapa.distance(posicionJugador, marcador.getLatLng()) < 45
	));

	if (indiceNitro !== -1) {
		mapa.removeLayer(marcadoresNitro[indiceNitro]);
		marcadoresNitro.splice(indiceNitro, 1);
		nitroDisponible += 1;
		nitroEnMapa = marcadoresNitro.length > 0;
		mostrarAviso(`Nitro recogido (${nitroDisponible} disponible${nitroDisponible === 1 ? '' : 's'}). Pulsa SHIFT`);
	}
}

// Activa el nitro durante tres segundos para adelantar a la máquina.
function activarNitro() {
	if (!nitroDisponible || nitroActivo || modo !== 'versus') return;

	nitroActivo = true;
	nitroDisponible -= 1;
	mostrarAviso('NITRO ACTIVADO: velocidad aumentada durante 5 segundos');
	clearTimeout(temporizadorNitro);
	temporizadorNitro = setTimeout(() => {
		nitroActivo = false;
		mostrarAviso('Nitro agotado. Velocidad normal restaurada');
	}, duracionNitro);
}

// Mueve la máquina por la ruta BFS respetando la misma velocidad base.
function moverMaquina() {
	if (modo !== 'versus' || !carreraIniciada || !posicionMaquina) return;

	const siguienteLugar = caminoOptimo[indiceCaminoMaquina + 1];
	if (!siguienteLugar) return;

	const objetivo = obtenerPunto(siguienteLugar);
	posicionMaquina = avanzarHacia(posicionMaquina, objetivo, velocidadMaquina);
	marcadorMaquina.setLatLng(posicionMaquina);

	if (mapa.distance(posicionMaquina, objetivo) < 1) {
		indiceCaminoMaquina += 1;
	}

	if (indiceCaminoMaquina >= caminoOptimo.length - 1) {
		clearInterval(temporizadorCarrera);
		finalizarPartida(false);
	}
}

// Aplica un obstáculo aleatorio que detiene o invierte temporalmente al jugador.
function activarObstaculo() {
	if (modo !== 'versus') return;

	const detener = Math.random() < 0.5;

	if (detener) {
		vehiculoDetenido = true;
		pulsacionesReparacion = 0;
		mostrarObstaculo('¡OBSTÁCULO! VEHÍCULO DETENIDO', 'Pulsa R cinco veces para continuar', 0);
	} else {
		controlesInvertidosHasta = Date.now() + 4000;
		mostrarObstaculo('¡OBSTÁCULO! TECLAS INVERTIDAS', 'Tus controles cambiarán durante 4 segundos', 4000);
	}

	programarObstaculo();
}

// Presenta en pantalla el tipo y la duración del obstáculo activo.
function mostrarObstaculo(titulo, detalle, duracion) {
	const alerta = obtenerElemento('obstacle-alert');

	alerta.querySelector('strong').textContent = titulo;
	alerta.querySelector('span').textContent = detalle;
	alerta.classList.remove('hidden');
	alerta.classList.add('active');
	clearTimeout(temporizadorAlertaObstaculo);
	if (duracion > 0) {
		temporizadorAlertaObstaculo = setTimeout(() => {
			alerta.classList.remove('active');
			alerta.classList.add('hidden');
		}, duracion);
	}
}

// Programa el siguiente obstáculo 20 segundos después del anterior.
function programarObstaculo() {
	clearTimeout(temporizadorObstaculo);
	temporizadorObstaculo = setTimeout(activarObstaculo, 20000);
}

// Registra una pulsación de R y libera el vehículo al completar la reparación.
function repararVehiculo() {
	if (!vehiculoDetenido || modo !== 'versus') return;

	pulsacionesReparacion += 1;
	const faltan = pulsacionesNecesarias - pulsacionesReparacion;

	if (faltan > 0) {
		mostrarObstaculo('REPARANDO VEHÍCULO', `Pulsaciones R: ${pulsacionesReparacion}/${pulsacionesNecesarias}`, 0);
		return;
	}

	vehiculoDetenido = false;
	pulsacionesReparacion = 0;
	const alerta = obtenerElemento('obstacle-alert');
	alerta.classList.remove('active');
	alerta.classList.add('hidden');
	mostrarAviso('Vehículo reparado. ¡Continúa la carrera!');
}

// Inicia el desplazamiento continuo mientras se mantiene una flecha pulsada.
function iniciarMovimientoLibre() {
	if (!temporizadorMovimiento) {
		temporizadorMovimiento = setInterval(
			moverJugadorLibre,
			intervaloMovimiento
		);
	}
}

// Detiene el temporizador cuando el jugador suelta todas las flechas.
function detenerMovimientoLibre() {
	if (!teclasPresionadas.size && temporizadorMovimiento) {
		clearInterval(temporizadorMovimiento);
		temporizadorMovimiento = undefined;
	}
}

// Calcula el resultado, guarda el récord y muestra el resumen de la partida.
function finalizarPartida(gano) {
	clearInterval(idTemporizador);
	clearInterval(temporizadorMovimiento);
	clearInterval(temporizadorCarrera);
	clearInterval(temporizadorCuentaRegresiva);
	clearTimeout(temporizadorObstaculo);
	clearTimeout(temporizadorAlertaObstaculo);
	teclasPresionadas.clear();
	temporizadorMovimiento = undefined;
	carreraIniciada = false;
	const alertaObstaculo = obtenerElemento('obstacle-alert');
	alertaObstaculo.classList.remove('active');
	alertaObstaculo.classList.add('hidden');

	const segundos = Math.floor((Date.now() - inicioPartida) / 1000);
	const pasos = modo === 'manual' ? pasosJugador : caminoJugador.length - 1;
	const rutaEficiente = pasos === caminoOptimo.length - 1;
	const puntos = gano ? 200 : 0;

	puntuacion += puntos;

	if (puntuacion > mejorPuntuacion) {
		mejorPuntuacion = puntuacion;
		localStorage.setItem('bfs-record', mejorPuntuacion);
	}

	actualizarPanel();
	obtenerElemento('result-title').textContent = gano ? 'RUTA CONCLUIDA' : 'TIEMPO AGOTADO';
	obtenerElemento('result-message').textContent = gano
		? `${nombreJugador}, llegaste a ${lugares[destino].nombre}. Recibiste 200 puntos. ${rutaEficiente
			? 'Encontraste la ruta óptima.'
			: 'Llegaste, pero BFS todavía puede enseñarte un camino más corto.'}`
		: 'La máquina encontró primero el destino. Analiza la cola BFS e inténtalo de nuevo.';
	obtenerElemento('result-time').textContent = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
	obtenerElemento('result-steps').textContent = pasos;
	obtenerElemento('result-optimal').textContent = caminoOptimo.length - 1;
	obtenerElemento('result-modal').classList.remove('hidden');
}

// Avanza suavemente por el camino óptimo con una velocidad lenta y constante.
function ejecutarAutopiloto() {
	let indiceCamino = 0;

	temporizadorAutomatico = setInterval(() => {
		if (indiceCamino >= caminoOptimo.length - 1) {
			clearInterval(temporizadorAutomatico);
			actual = destino;
			finalizarPartida(true);
			return;
		}

		const siguienteLugar = caminoOptimo[indiceCamino + 1];
		const objetivo = obtenerPunto(siguienteLugar);
		posicionJugador = avanzarHacia(posicionJugador, objetivo, velocidadAutopiloto);
		marcadorJugador.setLatLng(posicionJugador);

		if (mapa.distance(posicionJugador, objetivo) < 1) {
			indiceCamino += 1;
			actual = caminoOptimo[indiceCamino];
			caminoJugador.push(actual);
		}

		actualizarPanel();
	}, intervaloMovimiento);
}

// Simula el avance de la máquina y comunica el progreso de BFS.
function ejecutarMaquina() {
	carreraIniciada = true;
	posicionMaquina = obtenerPunto(origen);
	indiceCaminoMaquina = 0;
	marcadorMaquina.setLatLng(posicionMaquina);
	clearInterval(temporizadorCarrera);
	mostrarAviso(`BFS: ${caminoOptimo.length - 1} pasos calculados`);
	programarObstaculo();
	temporizadorCarrera = setInterval(moverMaquina, intervaloMovimiento);
}

// Muestra un aviso temporal en la parte inferior del mapa.
function mostrarAviso(mensaje) {
	obtenerElemento('toast').textContent = mensaje;
	obtenerElemento('toast').classList.add('show');

	setTimeout(() => {
		obtenerElemento('toast').classList.remove('show');
	}, 2800);
}

// Texto que se muestra en la barra superior según la modalidad activa.
const etiquetasModo = {
	manual: 'PILOTO MANUAL',
	auto: 'AUTOPILOTO BFS',
	versus: 'HUMANO VS BFS'
};

// Genera las opciones de los selectores usando el catálogo único de lugares.
const opcionesLugar = Object.entries(lugares)
	.map(([identificador, lugar]) => `<option value="${identificador}">${lugar.nombre}</option>`)
	.join('');
obtenerElemento('origin-select').innerHTML = opcionesLugar;
obtenerElemento('destination-select').innerHTML = opcionesLugar;
obtenerElemento('origin-select').value = 'ejido';
obtenerElemento('destination-select').value = 'carolina';


// Inicia la aplicación: oculta la bienvenida, prepara Leaflet y crea la primera ruta.
obtenerElemento('start-form').addEventListener('submit', (evento) => {
	evento.preventDefault();
	nombreJugador = obtenerElemento('player-name').value.trim();

	if (!nombreJugador) return;

	obtenerElemento('player-label').textContent = nombreJugador.toUpperCase();
	obtenerElemento('welcome-screen').classList.add('hidden');
	obtenerElemento('game-screen').classList.remove('hidden');

	if (!mapa) {
		inicializarMapa();
	}

	generarRutaAutomatica();
});

// Limpia la validación anterior cuando el usuario cambia los puntos A o B.
document.querySelectorAll('#origin-select, #destination-select').forEach((selector) => {
	selector.addEventListener('change', () => {
		obtenerElemento('destination-select').setCustomValidity('');
	});
});

// Conecta los controles principales con sus acciones de juego.
obtenerElemento('reset-button').addEventListener('click', () => location.reload());
obtenerElemento('calculate-route-button').addEventListener('click', calcularRutaSeleccionada);
obtenerElemento('new-route-button').addEventListener('click', generarRutaAutomatica);

obtenerElemento('continue-button').addEventListener('click', () => {
	obtenerElemento('result-modal').classList.add('hidden');
	generarRuta(origen, destino);
});

// Cambiar de modalidad reinicia el recorrido actual sin cambiar origen ni destino.
document.querySelectorAll('.mode-button').forEach((button) => {
	button.addEventListener('click', () => {
		document.querySelectorAll('.mode-button').forEach((item) => {
			item.classList.remove('active');
		});

		button.classList.add('active');
		modo = button.dataset.mode;
		obtenerElemento('mode-label').textContent = etiquetasModo[modo];
		generarRuta(origen, destino);
	});
});

// Cada vehículo de la tienda puede equiparse mediante su atributo data-skin.
document.querySelectorAll('.skin-button').forEach((boton) => {
	boton.addEventListener('click', () => comprarVehiculo(boton.dataset.skin));
});

// Controla flechas, SHIFT y R para mover, activar nitro o reparar el vehículo.
document.addEventListener('keydown', (evento) => {
	const teclasDeMovimiento = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

	if (evento.key === 'Shift') {
		activarNitro();
		return;
	}

	if (evento.key.toLowerCase() === 'r') {
		repararVehiculo();
		return;
	}

	if ((modo !== 'manual' && modo !== 'versus') || !teclasDeMovimiento.includes(evento.key)) return;

	evento.preventDefault();
	teclasPresionadas.add(evento.key);
	iniciarMovimientoLibre();
});

// Libera las flechas al soltarlas para detener el movimiento continuo.
document.addEventListener('keyup', (evento) => {
	const teclasDeMovimiento = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

	if (!teclasDeMovimiento.includes(evento.key)) return;

	teclasPresionadas.delete(evento.key);
	detenerMovimientoLibre();
});
