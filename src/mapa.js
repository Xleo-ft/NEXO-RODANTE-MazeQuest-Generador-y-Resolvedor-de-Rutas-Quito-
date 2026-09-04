// ===\r\n// MAPA: inicialización de Leaflet, dibujo de rutas/marcadores,\r\n// cálculo de trayectorias y consulta de calles reales (OSRM).\r\n// ===

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

// Busca el punto de calle más cercano a un vehículo para cambiar de ruta sin saltos.
function encontrarCalleMasCercana(trayectoria, posicion) {
    return trayectoria.reduce((indiceCercano, punto, indice) => (
        mapa.distance(posicion, punto) < mapa.distance(posicion, trayectoria[indiceCercano])
            ? indice
            : indiceCercano
    ), 0);
}

// Avanza por una trayectoria ordenada sin atravesar segmentos ni invertir la dirección.
function avanzarPorTrayectoria(posicion, trayectoria, indice, velocidad) {
    let indiceActual = indice;
    let posicionActual = posicion.slice();
    let distanciaDisponible = velocidad;

    while (indiceActual < trayectoria.length - 1 && distanciaDisponible > 0) {
        const siguientePunto = trayectoria[indiceActual + 1];
        const distancia = mapa.distance(posicionActual, siguientePunto);

        if (distancia <= distanciaDisponible) {
            posicionActual = siguientePunto.slice();
            distanciaDisponible -= distancia;
            indiceActual += 1;
        } else {
            posicionActual = avanzarHacia(posicionActual, siguientePunto, distanciaDisponible);
            distanciaDisponible = 0;
        }
    }

    return { posicion: posicionActual, indice: indiceActual };
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
        rutaCallesLista = true;
        indiceCalleAutopiloto = encontrarCalleMasCercana(geometriaRutaCalles, posicionJugador);
        indiceCalleMaquina = encontrarCalleMasCercana(geometriaRutaCalles, posicionMaquina);
        indiceRutaJugador = encontrarCalleMasCercana(geometriaRutaCalles, posicionJugador);
        lineaOptima.setLatLngs(geometriaRutaCalles);
        mapa.fitBounds(lineaOptima.getBounds(), { padding: [70, 70] });
        mostrarAviso('Ruta calculada por calles reales');
    } catch (error) {
        if (solicitudActual === solicitudRuta) {
            // Sin una respuesta real no se dibuja ni se recorre una línea falsa.
            rutaCallesLista = false;
            clearInterval(temporizadorAutomatico);
            clearInterval(temporizadorCarrera);
            clearInterval(temporizadorCuentaRegresiva);
            obtenerElemento('race-countdown').classList.add('hidden');
            mostrarAviso('No se pudo cargar la ruta por calles. Revisa la conexión e inténtalo de nuevo');
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

    // La ruta verde aparece cuando OSRM entrega la geometría real de las calles.
    lineaOptima = L.polyline(geometriaRutaCalles || [], {
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

