// ===\r\n// PARTIDA: orquestación del juego (generar ruta, cuenta\r\n// regresiva, autopiloto, máquina y fin de partida).\r\n// ===

// Reinicia el recorrido y prepara una partida con los puntos indicados.
function generarRuta(origenElegido, destinoElegido) {
    clearInterval(temporizadorAutomatico);
    clearInterval(temporizadorMaquina);
    clearInterval(temporizadorMovimiento);
    clearInterval(temporizadorCarrera);
    clearTimeout(temporizadorNitro);
    clearTimeout(temporizadorObstaculo);
    clearTimeout(temporizadorAlertaObstaculo);
    clearInterval(temporizadorCuentaAviso);
    clearInterval(temporizadorCuentaRegresiva);
    teclasPresionadas.clear();
    const contadorCarrera = obtenerElemento('race-countdown');
    contadorCarrera.classList.add('hidden');
    contadorCarrera.textContent = '5';
    ocultarObstaculo();
    temporizadorMovimiento = undefined;
    temporizadorCarrera = undefined;
    marcadoresNitro.forEach((marcador) => mapa.removeLayer(marcador));
    marcadoresNitro = [];
    temporizadorObstaculo = undefined;
    temporizadorAlertaObstaculo = undefined;
    temporizadorCuentaAviso = undefined;
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
    rutaCallesLista = false;
    indiceRutaJugador = 0;
    indiceCalleAutopiloto = 0;
    indiceCalleMaquina = 0;
    actual = origen;
    caminoJugador = [origen];
    posicionJugador = obtenerPunto(origen);
    recorridoLibre = [posicionJugador.slice()];
    posicionMaquina = obtenerPunto(origen);
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

// Mueve la máquina exclusivamente por la ruta real de calles.
function moverMaquina() {
    if (modo !== 'versus' || !carreraIniciada || !posicionMaquina) return;
    if (!rutaCallesLista) return;

    // La máquina solo puede avanzar sobre la geometría real de calles.
    const trayectoria = geometriaRutaCalles;
    if (!trayectoria?.length) return;
    const avance = avanzarPorTrayectoria(
        posicionMaquina,
        trayectoria,
        indiceCalleMaquina,
        velocidadMaquina
    );
    posicionMaquina = avance.posicion;
    indiceCalleMaquina = avance.indice;
    marcadorMaquina.setLatLng(posicionMaquina);

    if (avance.indice >= trayectoria.length - 1) {
        clearInterval(temporizadorCarrera);
        finalizarPartida(false);
    }
}

// Calcula el resultado, guarda el récord y muestra el resumen de la partida.
function finalizarPartida(gano) {
    clearInterval(idTemporizador);
    clearInterval(temporizadorMovimiento);
    clearInterval(temporizadorCarrera);
    clearInterval(temporizadorCuentaRegresiva);
    clearInterval(temporizadorCuentaAviso);
    clearTimeout(temporizadorObstaculo);
    clearTimeout(temporizadorAlertaObstaculo);
    teclasPresionadas.clear();
    temporizadorMovimiento = undefined;
    carreraIniciada = false;
    ocultarObstaculo();

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

// Avanza suavemente por las calles calculadas hasta alcanzar el destino.
function ejecutarAutopiloto() {
    temporizadorAutomatico = setInterval(() => {
        if (!rutaCallesLista) return;
        // El autopiloto recorre la geometría de calles, no una línea entre nodos.
        const trayectoria = geometriaRutaCalles;
        if (!trayectoria?.length) return;
        const avance = avanzarPorTrayectoria(
            posicionJugador,
            trayectoria,
            indiceCalleAutopiloto,
            velocidadAutopiloto
        );
        posicionJugador = avance.posicion;
        indiceCalleAutopiloto = avance.indice;
        marcadorJugador.setLatLng(posicionJugador);

        if (avance.indice >= trayectoria.length - 1) {
            clearInterval(temporizadorAutomatico);
            actual = destino;
            finalizarPartida(true);
            return;
        }

        actualizarPanel();
    }, intervaloMovimiento);
}

// Simula el avance de la máquina y comunica el progreso de BFS.
function ejecutarMaquina() {
    carreraIniciada = true;
    posicionMaquina = obtenerPunto(origen);
    marcadorMaquina.setLatLng(posicionMaquina);
    clearInterval(temporizadorCarrera);
    mostrarAviso(`BFS: ${caminoOptimo.length - 1} pasos calculados`);
    programarObstaculo(demoraPrimerObstaculo);
    temporizadorCarrera = setInterval(moverMaquina, intervaloMovimiento);
}
