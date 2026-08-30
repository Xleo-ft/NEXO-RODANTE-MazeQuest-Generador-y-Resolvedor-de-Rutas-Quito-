// ===\r\n// INTERFAZ: actualización de paneles, tiempo, avisos y\r\n// etiquetas de la barra superior.\r\n// ===

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

// Calcula y muestra el tiempo transcurrido desde el inicio de la partida.
function actualizarTiempo() {
    const tiempoTranscurrido = Math.floor((Date.now() - inicioPartida) / 1000);
    const minutos = String(Math.floor(tiempoTranscurrido / 60)).padStart(2, '0');
    const segundos = String(tiempoTranscurrido % 60).padStart(2, '0');

    obtenerElemento('time-value').textContent = `${minutos}:${segundos}`;
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
