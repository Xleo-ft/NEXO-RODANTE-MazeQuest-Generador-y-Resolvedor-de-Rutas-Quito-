// ===
// GEOCODIFICACIÓN: permite buscar cualquier dirección o lugar real
// (por ejemplo "mi casa" con su dirección exacta, u otro punto de
// Quito o de cualquier ciudad) y usarlo como origen o destino,
// además de los lugares predeterminados del catálogo educativo.
// ===

// Guarda la última ubicación real del jugador (si la compartió) para priorizar
// las sugerencias de búsqueda cerca de donde se encuentra de verdad.
let ubicacionUsuario = null;

// Pide permiso al navegador para usar el GPS/ubicación real del dispositivo.
function obtenerUbicacionActual() {
    return new Promise((resolver, rechazar) => {
        if (!navigator.geolocation) {
            rechazar(new Error('Este navegador no permite compartir ubicación'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (posicion) => {
                ubicacionUsuario = {
                    latitud: posicion.coords.latitude,
                    longitud: posicion.coords.longitude
                };
                resolver(ubicacionUsuario);
            },
            () => rechazar(new Error('No se pudo obtener tu ubicación. Revisa los permisos del navegador')),
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });
}

// Convierte una coordenada en un nombre legible (geocodificación inversa),
// usando el mismo servicio Nominatim que ya usa la búsqueda por texto.
async function obtenerNombreDeCoordenada(latitud, longitud) {
    const parametros = new URLSearchParams({
        format: 'json',
        lat: String(latitud),
        lon: String(longitud),
        addressdetails: '1'
    });

    const respuesta = await fetch(`https://nominatim.openstreetmap.org/reverse?${parametros.toString()}`, {
        headers: { Accept: 'application/json' }
    });

    if (!respuesta.ok) throw new Error('No se pudo identificar esa ubicación');

    const resultado = await respuesta.json();
    return resultado.display_name ? resultado.display_name.split(',').slice(0, 3).join(',') : 'Mi ubicación actual';
}

// Distancia aproximada en metros entre dos coordenadas (fórmula de Haversine).
// Se usa aquí en vez de mapa.distance para no depender de que Leaflet ya exista.
function distanciaHaversine(lat1, lon1, lat2, lon2) {
    const radioTierra = 6371000;
    const radianes = Math.PI / 180;
    const deltaLat = (lat2 - lat1) * radianes;
    const deltaLon = (lon2 - lon1) * radianes;
    const a = Math.sin(deltaLat / 2) ** 2
        + Math.cos(lat1 * radianes) * Math.cos(lat2 * radianes) * Math.sin(deltaLon / 2) ** 2;

    return 2 * radioTierra * Math.asin(Math.sqrt(a));
}

// Recuerda a qué lugar del catálogo educativo se conectó cada punto personalizado,
// para poder quitar esa conexión antes de recalcularla y no dejar bordes sueltos.
const vecinoPersonalizadoPrevio = {};

// Busca el lugar del catálogo original (no personalizado) más cercano a una coordenada,
// que es donde se "engancha" el punto libre dentro del grafo educativo de BFS.
function encontrarLugarMasCercano(latitud, longitud) {
    let idCercano;
    let distanciaMinima = Infinity;

    Object.entries(lugares).forEach(([identificador, lugar]) => {
        if (identificador.startsWith('personalizado-')) return;

        const distancia = distanciaHaversine(latitud, longitud, lugar.latitud, lugar.longitud);
        if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            idCercano = identificador;
        }
    });

    return idCercano;
}

// Agrega (o refresca si ya existía) la opción del lugar personalizado en ambos selectores.
function agregarOpcionSelector(id, nombre) {
    ['origin-select', 'destination-select'].forEach((idSelector) => {
        const selector = obtenerElemento(idSelector);
        let opcion = selector.querySelector(`option[value="${id}"]`);

        if (!opcion) {
            opcion = document.createElement('option');
            opcion.value = id;
            selector.appendChild(opcion);
        }

        opcion.textContent = `📍 ${nombre}`;
    });
}

// Da de alta (o actualiza) un lugar personalizado y lo conecta al nodo más
// cercano del grafo educativo para que BFS pueda seguir calculando una ruta.
function registrarLugarPersonalizado(id, nombre, latitud, longitud) {
    const vecinoAnterior = vecinoPersonalizadoPrevio[id];
    if (vecinoAnterior && grafo[vecinoAnterior]) {
        grafo[vecinoAnterior] = grafo[vecinoAnterior].filter((vecino) => vecino !== id);
    }

    const vecinoCercano = encontrarLugarMasCercano(latitud, longitud);

    lugares[id] = { nombre, latitud, longitud };
    grafo[id] = [vecinoCercano];
    grafo[vecinoCercano] = [...(grafo[vecinoCercano] || []), id];
    vecinoPersonalizadoPrevio[id] = vecinoCercano;

    agregarOpcionSelector(id, nombre);
}

// Consulta Nominatim (el mismo ecosistema de OpenStreetMap que ya usa OSRM en este
// proyecto) para convertir un texto libre —una dirección, "mi casa", un lugar
// conocido— en una lista de sugerencias reales, priorizando resultados cerca de Quito.
async function buscarSugerencias(texto, limite = 5) {
    // Si el jugador ya compartió su ubicación real, se prioriza el área cercana a
    // él; si no, se usa por defecto el Distrito Metropolitano de Quito.
    const caja = ubicacionUsuario
        ? [
            ubicacionUsuario.longitud - 0.12, ubicacionUsuario.latitud + 0.12,
            ubicacionUsuario.longitud + 0.12, ubicacionUsuario.latitud - 0.12
        ]
        : [-78.62, -0.05, -78.35, -0.45];

    const parametros = new URLSearchParams({
        format: 'json',
        q: texto,
        limit: String(limite),
        addressdetails: '1',
        viewbox: caja.join(','),
        bounded: '0'
    });

    const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros.toString()}`, {
        headers: { Accept: 'application/json' }
    });

    if (!respuesta.ok) throw new Error('No se pudo consultar el servicio de direcciones');

    const resultados = await respuesta.json();

    return resultados.map((resultado) => ({
        nombre: resultado.display_name.split(',').slice(0, 3).join(','),
        latitud: Number(resultado.lat),
        longitud: Number(resultado.lon)
    }));
}
