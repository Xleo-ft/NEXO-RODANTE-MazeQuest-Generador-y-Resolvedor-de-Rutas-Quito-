// ===\r\n// OBSTÁCULOS: eventos aleatorios del modo versus (avería y\r\n// controles invertidos) y su reparación.\r\n// ===

// Aplica un obstáculo aleatorio que detiene o invierte temporalmente al jugador.
function activarObstaculo() {
    if (modo !== 'versus' || !carreraIniciada) return;

    const detener = Math.random() < 0.5;

    if (detener) {
        vehiculoDetenido = true;
        pulsacionesReparacion = 0;
        mostrarObstaculoDetenido();
    } else {
        controlesInvertidosHasta = Date.now() + 4000;
        mostrarObstaculoInvertido(4000);
    }

    programarObstaculo();
}

// Presenta el recuadro visual de vehículo detenido y el progreso de reparación con R.
function mostrarObstaculoDetenido() {
    clearInterval(temporizadorCuentaAviso);
    clearTimeout(temporizadorAlertaObstaculo);

    const alerta = obtenerElemento('obstacle-alert');
    alerta.classList.remove('alert-inverted');
    alerta.classList.add('alert-stopped');

    const icono = alerta.querySelector('.obstacle-icon');
    const titulo = alerta.querySelector('#obstacle-title') || alerta.querySelector('strong');
    const mensaje = alerta.querySelector('#obstacle-message') || alerta.querySelector('p');
    const accion = alerta.querySelector('#obstacle-action') || alerta.querySelector('.obstacle-action-row');

    if (icono) icono.textContent = '⚠️';
    if (titulo) titulo.textContent = '¡AVISO! VEHÍCULO DETENIDO';
    if (mensaje) mensaje.textContent = 'Tu vehículo sufrió una falla mecánica. ¡Presiona la tecla R para repararlo!';
    if (accion) {
        accion.innerHTML = `
			<div class="key-pill pulse"><kbd>R</kbd> <span>PULSA R</span></div>
			<div class="obstacle-progress-bar">
				<div id="obstacle-progress-fill" class="obstacle-progress-fill" style="width: 0%"></div>
			</div>
			<span id="obstacle-counter" class="obstacle-counter">0 / ${pulsacionesNecesarias}</span>
		`;
    }

    alerta.classList.remove('hidden');
    alerta.classList.add('active');
    mostrarAviso('¡Vehículo averiado! Presiona la tecla R cinco veces');
}

// Presenta el recuadro visual de teclas invertidas con su contador regresivo.
function mostrarObstaculoInvertido(duracionMs = 4000) {
    clearInterval(temporizadorCuentaAviso);
    clearTimeout(temporizadorAlertaObstaculo);

    const alerta = obtenerElemento('obstacle-alert');
    alerta.classList.remove('alert-stopped');
    alerta.classList.add('alert-inverted');

    const icono = alerta.querySelector('.obstacle-icon');
    const titulo = alerta.querySelector('#obstacle-title') || alerta.querySelector('strong');
    const mensaje = alerta.querySelector('#obstacle-message') || alerta.querySelector('p');
    const accion = alerta.querySelector('#obstacle-action') || alerta.querySelector('.obstacle-action-row');

    if (icono) icono.textContent = '🔄';
    if (titulo) titulo.textContent = '¡AVISO! TECLAS INVERTIDAS';
    if (mensaje) mensaje.textContent = '¡Tus controles han sido saboteados! Usa las flechas opuestas para avanzar:';
    if (accion) {
        accion.innerHTML = `
			<div class="key-pill"><kbd>↓</kbd> <kbd>←</kbd> <span>AVANZAR</span></div>
			<span id="obstacle-timer" class="obstacle-timer">⏳ ${Math.ceil(duracionMs / 1000)}s</span>
		`;
    }

    alerta.classList.remove('hidden');
    alerta.classList.add('active');
    mostrarAviso('¡Controles invertidos! Usa flecha abajo o izquierda');

    let segundosRestantes = Math.ceil(duracionMs / 1000);
    temporizadorCuentaAviso = setInterval(() => {
        segundosRestantes -= 1;
        const elTimer = obtenerElemento('obstacle-timer');
        if (elTimer && segundosRestantes > 0) {
            elTimer.textContent = `⏳ ${segundosRestantes}s`;
        }
        if (segundosRestantes <= 0) {
            clearInterval(temporizadorCuentaAviso);
        }
    }, 1000);

    temporizadorAlertaObstaculo = setTimeout(() => {
        ocultarObstaculo();
        mostrarAviso('¡Controles normalizados!');
    }, duracionMs);
}

// Oculta el recuadro del obstáculo y limpia sus temporizadores.
function ocultarObstaculo() {
    clearInterval(temporizadorCuentaAviso);
    clearTimeout(temporizadorAlertaObstaculo);
    const alerta = obtenerElemento('obstacle-alert');
    if (alerta) {
        alerta.classList.remove('active');
        alerta.classList.add('hidden');
    }
}

// Presenta en pantalla el tipo y la duración del obstáculo activo (función de compatibilidad).
function mostrarObstaculo(titulo, detalle, duracion) {
    if (duracion === 0) {
        mostrarObstaculoDetenido();
    } else {
        mostrarObstaculoInvertido(duracion || 4000);
    }
}

// Programa el siguiente obstáculo usando una espera corta para el primero.
function programarObstaculo(demora = intervaloObstaculos) {
    clearTimeout(temporizadorObstaculo);
    temporizadorObstaculo = setTimeout(activarObstaculo, demora);
}

// Registra una pulsación de R y libera el vehículo al completar la reparación.
function repararVehiculo() {
    if (!vehiculoDetenido || modo !== 'versus') return;

    pulsacionesReparacion += 1;
    const porcentaje = Math.min(100, Math.round((pulsacionesReparacion / pulsacionesNecesarias) * 100));
    const progressFill = obtenerElemento('obstacle-progress-fill');
    const counter = obtenerElemento('obstacle-counter');

    if (progressFill) progressFill.style.width = `${porcentaje}%`;
    if (counter) counter.textContent = `${pulsacionesReparacion} / ${pulsacionesNecesarias}`;

    const faltan = pulsacionesNecesarias - pulsacionesReparacion;

    if (faltan > 0) {
        return;
    }

    vehiculoDetenido = false;
    pulsacionesReparacion = 0;
    ocultarObstaculo();
    mostrarAviso('¡Vehículo reparado! Continúa la carrera');
}
