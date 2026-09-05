// ===\r\n// CONTROLES: movimiento del jugador, nitro y escucha de teclado\r\n// (flechas, SHIFT y R).\r\n// ===

// Mueve el vehículo manual por la ruta de calles, siempre en el sentido A hacia B.
function moverJugadorLibre() {
    if ((modo !== 'manual' && modo !== 'versus') || !posicionJugador) return;
    if (modo === 'versus' && !carreraIniciada) return;
    if (!rutaCallesLista) return;

    if (vehiculoDetenido || Date.now() < jugadorDetenidoHasta) return;

    if (!teclasPresionadas.size) return;

    // Invertir controles si está activa la desventaja en versus
    const controlesInvertidos = modo === 'versus' && Date.now() < controlesInvertidosHasta;
    let debeAvanzar = false;

    if (!controlesInvertidos) {
        debeAvanzar = teclasPresionadas.has('ArrowUp') || teclasPresionadas.has('ArrowRight') || teclasPresionadas.has('ArrowLeft') || teclasPresionadas.has('ArrowDown');
    } else {
        // Controles invertidos: solo las teclas contrarias (Abajo o Izquierda) mueven el vehículo
        debeAvanzar = teclasPresionadas.has('ArrowDown') || teclasPresionadas.has('ArrowLeft');
    }

    if (!debeAvanzar) return;

    // Convierte la velocidad expresada en grados a metros, unidad usada por Leaflet.
    const velocidadActual = (nitroActivo ? velocidadNitro : velocidadMovimiento) * metrosPorGrado;
    const trayectoria = geometriaRutaCalles;
    if (!trayectoria?.length) return;
    const avance = avanzarPorTrayectoria(
        posicionJugador,
        trayectoria,
        indiceRutaJugador,
        velocidadActual
    );
    indiceRutaJugador = avance.indice;
    posicionJugador = avance.posicion;

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

// Controla flechas, SHIFT y R para mover, activar nitro o reparar el vehículo.
document.addEventListener('keydown', (evento) => {
    if (modo3DActivo) return;

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
    if (modo3DActivo) return;

    const teclasDeMovimiento = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    if (!teclasDeMovimiento.includes(evento.key)) return;

    teclasPresionadas.delete(evento.key);
    detenerMovimientoLibre();
});
