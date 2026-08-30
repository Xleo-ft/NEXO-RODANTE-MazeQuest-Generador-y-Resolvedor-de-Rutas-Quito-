// ===\r\n// PRINCIPAL: punto de entrada. Llena los selectores de lugares\r\n// y conecta los botones/formularios con la lógica del juego.\r\n// Debe cargarse al final, después de todos los demás módulos.\r\n// ===

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
