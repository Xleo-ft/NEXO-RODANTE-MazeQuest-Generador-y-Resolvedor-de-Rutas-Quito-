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

// Guarda el lugar elegido de la lista de sugerencias para asignarlo como A o B.
let resultadoLugarPersonalizado = null;
// Controla el pequeño retraso (debounce) para no golpear el servicio en cada tecla.
let temporizadorSugerencias;

// Pinta la lista de sugerencias encontradas; cada una se puede elegir con un clic.
function mostrarListaSugerencias(sugerencias) {
    const lista = obtenerElemento('custom-place-suggestions');
    lista.innerHTML = '';

    if (!sugerencias.length) {
        lista.classList.add('hidden');
        return;
    }

    sugerencias.forEach((sugerencia) => {
        const item = document.createElement('li');
        item.className = 'custom-place-suggestion';
        item.textContent = sugerencia.nombre;
        item.addEventListener('click', () => seleccionarSugerencia(sugerencia));
        lista.appendChild(item);
    });

    lista.classList.remove('hidden');
}

// Guarda el lugar elegido y muestra los botones para usarlo como origen o destino.
function seleccionarSugerencia(sugerencia) {
    resultadoLugarPersonalizado = sugerencia;
    obtenerElemento('custom-place-input').value = sugerencia.nombre;
    obtenerElemento('custom-place-suggestions').classList.add('hidden');
    obtenerElemento('custom-place-name').textContent = sugerencia.nombre;
    obtenerElemento('custom-place-result').classList.remove('hidden');
    obtenerElemento('custom-place-status').textContent = '';
}

// Consulta el servicio de direcciones y actualiza la lista de sugerencias.
async function buscarYMostrarSugerencias(texto) {
    const estado = obtenerElemento('custom-place-status');

    if (!texto || texto.trim().length < 3) {
        obtenerElemento('custom-place-suggestions').classList.add('hidden');
        return;
    }

    estado.textContent = 'Buscando...';

    try {
        const sugerencias = await buscarSugerencias(texto.trim());
        estado.textContent = sugerencias.length
            ? ''
            : 'No se encontró ese lugar. Intenta con más detalle (calle, barrio, ciudad)';
        mostrarListaSugerencias(sugerencias);
    } catch (error) {
        estado.textContent = 'No se pudo buscar la dirección. Revisa tu conexión e inténtalo de nuevo';
        mostrarListaSugerencias([]);
    }
}

// Mientras escribes, espera una pausa breve antes de pedir sugerencias.
obtenerElemento('custom-place-input').addEventListener('input', (evento) => {
    resultadoLugarPersonalizado = null;
    obtenerElemento('custom-place-result').classList.add('hidden');
    clearTimeout(temporizadorSugerencias);
    temporizadorSugerencias = setTimeout(() => {
        buscarYMostrarSugerencias(evento.target.value);
    }, 450);
});

// El botón BUSCAR y la tecla Enter piden sugerencias de inmediato, sin esperar la pausa.
obtenerElemento('custom-place-search').addEventListener('click', () => {
    clearTimeout(temporizadorSugerencias);
    buscarYMostrarSugerencias(obtenerElemento('custom-place-input').value);
});
obtenerElemento('custom-place-input').addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        clearTimeout(temporizadorSugerencias);
        buscarYMostrarSugerencias(evento.target.value);
    }
});

// Cierra la lista de sugerencias si el jugador hace clic fuera del buscador.
document.addEventListener('click', (evento) => {
    const contenedor = obtenerElemento('custom-place-input').closest('.custom-place');
    if (contenedor && !contenedor.contains(evento.target)) {
        obtenerElemento('custom-place-suggestions').classList.add('hidden');
    }
});

// Pide la ubicación real del navegador y la deja lista para usar como A o B.
obtenerElemento('custom-place-locate').addEventListener('click', async () => {
    const estado = obtenerElemento('custom-place-status');
    estado.textContent = 'Obteniendo tu ubicación...';
    obtenerElemento('custom-place-suggestions').classList.add('hidden');

    try {
        const { latitud, longitud } = await obtenerUbicacionActual();
        const nombre = await obtenerNombreDeCoordenada(latitud, longitud);
        seleccionarSugerencia({ nombre: `📍 ${nombre}`, latitud, longitud });
    } catch (error) {
        estado.textContent = error.message;
    }
});

// Asigna el lugar encontrado como punto A (origen) y lo deja listo para calcular ruta.
obtenerElemento('custom-place-use-origin').addEventListener('click', () => {
    if (!resultadoLugarPersonalizado) return;

    const { nombre, latitud, longitud } = resultadoLugarPersonalizado;
    registrarLugarPersonalizado('personalizado-origen', nombre, latitud, longitud);
    obtenerElemento('origin-select').value = 'personalizado-origen';
    mostrarAviso('Origen personalizado listo. Pulsa CALCULAR RUTA');
});

// Asigna el lugar encontrado como punto B (destino) y lo deja listo para calcular ruta.
obtenerElemento('custom-place-use-destination').addEventListener('click', () => {
    if (!resultadoLugarPersonalizado) return;

    const { nombre, latitud, longitud } = resultadoLugarPersonalizado;
    registrarLugarPersonalizado('personalizado-destino', nombre, latitud, longitud);
    obtenerElemento('destination-select').value = 'personalizado-destino';
    mostrarAviso('Destino personalizado listo. Pulsa CALCULAR RUTA');
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

