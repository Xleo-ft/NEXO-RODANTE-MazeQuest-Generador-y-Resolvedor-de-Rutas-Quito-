let m3dCarro;
let m3dAnimacionId;
let m3dReloj;
let m3dTeclas = new Set();
let m3dPuntosRuta = [];
let m3dPosicionMeta;
let m3dLlegoAlDestino = false;


let m3dAuto = { x: 0, z: 0, angulo: 0, velocidad: 0 };

const M3D_ACELERACION = 16;
const M3D_FRENADO = 26;
const M3D_VELOCIDAD_MAXIMA = 24;
const M3D_VELOCIDAD_MAXIMA_REVERSA = -9;
const M3D_FRICCION = 11;
const M3D_GIRO_MAXIMO = 2.0;
const M3D_ANCHO_CARRETERA = 9;

const M3D_COLORES_VEHICULO = {
    clasico: { cuerpo: 0xff7043, cabina: 0xcbe8e2 },
    turbo: { cuerpo: 0xf4c542, cabina: 0xffffff },
    neon: { cuerpo: 0xd85cff, cabina: 0xb9f7ff },
    taxi: { cuerpo: 0xf5f0dc, cabina: 0x244b55 }
};


function m3dProyectarRuta(geometria) {
    const [latOrigen, lngOrigen] = geometria[0];
    const metrosPorGradoLongitud = metrosPorGrado * Math.cos(latOrigen * Math.PI / 180);

    return geometria.map(([lat, lng]) => ({
        x: (lng - lngOrigen) * metrosPorGradoLongitud,
        z: (latOrigen - lat) * metrosPorGrado
    }));
}

function m3dConstruirCarretera(puntos) {
    const grupo = new THREE.Group();
    const vertices = [];
    const indices = [];

    puntos.forEach((punto, indice) => {
        const anterior = puntos[Math.max(indice - 1, 0)];
        const siguiente = puntos[Math.min(indice + 1, puntos.length - 1)];
        const direccion = new THREE.Vector2(siguiente.x - anterior.x, siguiente.z - anterior.z);
        if (direccion.lengthSq() === 0) direccion.set(0, 1);
        direccion.normalize();
        const normal = new THREE.Vector2(-direccion.y, direccion.x);
        const mitadAncho = M3D_ANCHO_CARRETERA / 2;

        vertices.push(
            punto.x + normal.x * mitadAncho, 0, punto.z + normal.y * mitadAncho,
            punto.x - normal.x * mitadAncho, 0, punto.z - normal.y * mitadAncho
        );

        if (indice > 0) {
            const base = (indice - 1) * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }
    });

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometria.setIndex(indices);
    geometria.computeVertexNormals();

    const asfalto = new THREE.Mesh(
        geometria,
        new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.95 })
    );
    asfalto.receiveShadow = true;
    grupo.add(asfalto);

    const materialLinea = new THREE.MeshBasicMaterial({ color: 0xf3e9c8 });
    for (let indice = 0; indice < puntos.length - 1; indice += 3) {
        const p1 = puntos[indice];
        const p2 = puntos[indice + 1];
        const largo = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        if (largo < 0.4) continue;

        const franja = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, largo * 0.55), materialLinea);
        franja.position.set((p1.x + p2.x) / 2, 0.03, (p1.z + p2.z) / 2);
        franja.rotation.y = Math.atan2(p2.x - p1.x, p2.z - p1.z);
        grupo.add(franja);
    }

    return grupo;
}


// Genera una textura de ventanas iluminadas (algunas encendidas al azar) usando
// un canvas 2D, en vez de una sola malla plana: da mucha más sensación de detalle
// a los edificios sin costar más geometría.
let m3dTexturaVentanas;
function m3dObtenerTexturaVentanas() {
    if (m3dTexturaVentanas) return m3dTexturaVentanas;

    const lienzo = document.createElement('canvas');
    lienzo.width = 128;
    lienzo.height = 256;
    const contexto = lienzo.getContext('2d');

    contexto.fillStyle = '#20262c';
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);

    const columnas = 6;
    const filas = 12;
    const anchoVentana = lienzo.width / columnas;
    const altoVentana = lienzo.height / filas;

    for (let fila = 0; fila < filas; fila += 1) {
        for (let columna = 0; columna < columnas; columna += 1) {
            const encendida = Math.random() < 0.35;
            contexto.fillStyle = encendida ? '#f6e6a8' : '#12181c';
            contexto.fillRect(
                columna * anchoVentana + anchoVentana * 0.18,
                fila * altoVentana + altoVentana * 0.22,
                anchoVentana * 0.64,
                altoVentana * 0.56
            );
        }
    }

    const textura = new THREE.CanvasTexture(lienzo);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    m3dTexturaVentanas = textura;
    return textura;
}

function m3dConstruirEdificios(puntos) {
    const grupo = new THREE.Group();
    const paleta = [0x8a97a3, 0x5f7a8a, 0xb98a5e, 0x7a8f6a, 0x9c7f9e, 0x6d6d7a, 0xa3876a];
    const separacionMinima = 34;
    let acumulado = separacionMinima;
    const texturaVentanas = m3dObtenerTexturaVentanas();

    for (let indice = 1; indice < puntos.length; indice += 1) {
        const anterior = puntos[indice - 1];
        const punto = puntos[indice];
        acumulado += Math.hypot(punto.x - anterior.x, punto.z - anterior.z);
        if (acumulado < separacionMinima) continue;
        acumulado = 0;

        const direccion = new THREE.Vector2(punto.x - anterior.x, punto.z - anterior.z);
        if (direccion.lengthSq() === 0) continue;
        direccion.normalize();
        const normal = new THREE.Vector2(-direccion.y, direccion.x);

        [-1, 1].forEach((lado) => {
            if (Math.random() < 0.4) return;

            const distanciaLateral = M3D_ANCHO_CARRETERA / 2 + 10 + Math.random() * 24;
            const ancho = 6 + Math.random() * 11;
            const profundidad = 6 + Math.random() * 11;
            const altura = 6 + Math.random() * 32;
            const color = paleta[Math.floor(Math.random() * paleta.length)];

            // Copia la textura de ventanas para poder repetirla distinto en cada fachada
            // según la altura del edificio, sin regenerar el canvas cada vez.
            const texturaFachada = texturaVentanas.clone();
            texturaFachada.needsUpdate = true;
            texturaFachada.repeat.set(Math.max(1, Math.round(ancho / 4)), Math.max(1, Math.round(altura / 5)));

            const materialFachada = new THREE.MeshStandardMaterial({
                color,
                map: texturaFachada,
                roughness: 0.8,
                metalness: 0.05
            });
            const materialTecho = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });

            const edificio = new THREE.Mesh(
                new THREE.BoxGeometry(ancho, altura, profundidad),
                [materialFachada, materialFachada, materialTecho, materialTecho, materialFachada, materialFachada]
            );
            edificio.position.set(
                punto.x + normal.x * distanciaLateral * lado,
                altura / 2,
                punto.z + normal.y * distanciaLateral * lado
            );
            edificio.rotation.y = Math.random() * Math.PI;
            edificio.castShadow = true;
            edificio.receiveShadow = true;
            grupo.add(edificio);
        });
    }

    return grupo;
}

// Árboles low-poly (tronco + copa) intercalados junto a la carretera para dar
// más profundidad y vida a la escena, sin afectar el rendimiento.
function m3dConstruirArboles(puntos) {
    const grupo = new THREE.Group();
    const materialTronco = new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.95 });
    const paletaCopas = [0x4c7a3f, 0x3f6b3a, 0x5a8a49];
    const separacionMinima = 16;
    let acumulado = 0;

    for (let indice = 1; indice < puntos.length; indice += 1) {
        const anterior = puntos[indice - 1];
        const punto = puntos[indice];
        acumulado += Math.hypot(punto.x - anterior.x, punto.z - anterior.z);
        if (acumulado < separacionMinima) continue;
        acumulado = 0;

        const direccion = new THREE.Vector2(punto.x - anterior.x, punto.z - anterior.z);
        if (direccion.lengthSq() === 0) continue;
        direccion.normalize();
        const normal = new THREE.Vector2(-direccion.y, direccion.x);

        [-1, 1].forEach((lado) => {
            if (Math.random() < 0.55) return;

            const distanciaLateral = M3D_ANCHO_CARRETERA / 2 + 3 + Math.random() * 6;
            const alturaTronco = 1.6 + Math.random() * 0.8;
            const radioCopa = 1.4 + Math.random() * 1.3;
            const x = punto.x + normal.x * distanciaLateral * lado;
            const z = punto.z + normal.y * distanciaLateral * lado;

            const arbol = new THREE.Group();

            const tronco = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18, 0.24, alturaTronco, 6),
                materialTronco
            );
            tronco.position.y = alturaTronco / 2;
            tronco.castShadow = true;
            arbol.add(tronco);

            const copa = new THREE.Mesh(
                new THREE.ConeGeometry(radioCopa, radioCopa * 1.9, 7),
                new THREE.MeshStandardMaterial({
                    color: paletaCopas[Math.floor(Math.random() * paletaCopas.length)],
                    roughness: 0.9
                })
            );
            copa.position.y = alturaTronco + radioCopa * 0.85;
            copa.castShadow = true;
            arbol.add(copa);

            arbol.position.set(x, 0, z);
            grupo.add(arbol);
        });
    }

    return grupo;
}

// Suelo amplio que cubre el área alrededor de toda la ruta.
function m3dConstruirSuelo(puntos) {
    const xs = puntos.map((p) => p.x);
    const zs = puntos.map((p) => p.z);
    const ancho = Math.max(...xs) - Math.min(...xs) + 500;
    const largo = Math.max(...zs) - Math.min(...zs) + 500;
    const centroX = (Math.max(...xs) + Math.min(...xs)) / 2;
    const centroZ = (Math.max(...zs) + Math.min(...zs)) / 2;
    const lado = Math.max(ancho, largo);

    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(lado, lado),
        new THREE.MeshStandardMaterial({ color: 0x37472f, roughness: 1 })
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.set(centroX, -0.05, centroZ);
    suelo.receiveShadow = true;
    return suelo;
}

// Arma el modelo del carro en piezas simples (cuerpo, cabina, ruedas, faros)
// usando la paleta del vehículo equipado en la tienda 2D.
function m3dCrearCarro() {
    const colores = M3D_COLORES_VEHICULO[vehiculoSeleccionado] || M3D_COLORES_VEHICULO.clasico;
    const grupo = new THREE.Group();

    const cuerpo = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.9, 4.2),
        new THREE.MeshPhysicalMaterial({
            color: colores.cuerpo,
            roughness: 0.32,
            metalness: 0.4,
            clearcoat: 0.6,
            clearcoatRoughness: 0.25
        })
    );
    cuerpo.position.y = 0.65;
    cuerpo.castShadow = true;
    grupo.add(cuerpo);

    const cabina = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.65, 2),
        new THREE.MeshPhysicalMaterial({
            color: colores.cabina,
            roughness: 0.15,
            metalness: 0.1,
            transparent: true,
            opacity: 0.88
        })
    );
    cabina.position.set(0, 1.28, -0.25);
    cabina.castShadow = true;
    grupo.add(cabina);

    // Espejos laterales simples: aportan silueta sin agregar peso a la escena.
    const materialEspejo = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.4, metalness: 0.6 });
    [-1, 1].forEach((lado) => {
        const espejo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.32), materialEspejo);
        espejo.position.set(lado * 1.05, 0.95, 0.65);
        grupo.add(espejo);
    });

    const posicionesRuedas = [
        [-0.95, 0.4, 1.35], [0.95, 0.4, 1.35],
        [-0.95, 0.4, -1.35], [0.95, 0.4, -1.35]
    ];
    posicionesRuedas.forEach(([x, y, z]) => {
        const rueda = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
        );
        rueda.rotation.z = Math.PI / 2;
        rueda.position.set(x, y, z);
        rueda.castShadow = true;
        grupo.add(rueda);
    });

    const faroDelantero = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.18, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xfff4a8 })
    );
    faroDelantero.position.set(0, 0.55, 2.08);
    grupo.add(faroDelantero);

    const luzTrasera = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.18, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xdf3c3c })
    );
    luzTrasera.position.set(0, 0.55, -2.08);
    grupo.add(luzTrasera);

    return grupo;
}

// Marca un punto de la ruta (origen o destino) con un poste y una bandera de color.
function m3dCrearMarcador(punto, color) {
    const grupo = new THREE.Group();

    const poste = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    poste.position.set(punto.x, 3, punto.z);
    grupo.add(poste);

    const bandera = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    bandera.position.set(punto.x + 0.85, 5.4, punto.z);
    grupo.add(bandera);

    return grupo;
}

// Genera una textura de cielo con degradado (horizonte claro a cenit azul)
// usando un canvas: se ve mucho más natural que un color plano de fondo.
function m3dCrearTexturaCielo() {
    const lienzo = document.createElement('canvas');
    lienzo.width = 2;
    lienzo.height = 256;
    const contexto = lienzo.getContext('2d');

    const degradado = contexto.createLinearGradient(0, 0, 0, lienzo.height);
    degradado.addColorStop(0, '#4f8fd6');
    degradado.addColorStop(0.55, '#8fc7e8');
    degradado.addColorStop(1, '#dff1e6');
    contexto.fillStyle = degradado;
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);

    const textura = new THREE.CanvasTexture(lienzo);
    textura.colorSpace = THREE.SRGBColorSpace;
    return textura;
}

// Prepara escena, cámara, luces y todos los elementos del mundo a partir
// de la ruta de calles activa (la misma que ya se ve en el mapa 2D).
function m3dInicializarEscena() {
    m3dPuntosRuta = m3dProyectarRuta(geometriaRutaCalles);
    m3dLlegoAlDestino = false;

    m3dEscena = new THREE.Scene();
    m3dEscena.background = m3dCrearTexturaCielo();
    m3dEscena.fog = new THREE.Fog(0xbfdcec, 100, 420);

    const ancho = m3dContenedor.clientWidth;
    const alto = m3dContenedor.clientHeight;
    m3dCamara = new THREE.PerspectiveCamera(65, ancho / alto, 0.1, 2000);

    m3dRenderizador = new THREE.WebGLRenderer({ antialias: true });
    m3dRenderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    m3dRenderizador.setSize(ancho, alto);
    m3dRenderizador.shadowMap.enabled = true;
    m3dRenderizador.shadowMap.type = THREE.PCFSoftShadowMap;
    m3dRenderizador.toneMapping = THREE.ACESFilmicToneMapping;
    m3dRenderizador.toneMappingExposure = 1.05;
    m3dRenderizador.outputColorSpace = THREE.SRGBColorSpace;
    m3dContenedor.innerHTML = '';
    m3dContenedor.appendChild(m3dRenderizador.domElement);

    // La luz de hemisferio simula el rebote de luz entre cielo y suelo:
    // da un ambiente mucho más natural que solo una luz ambiental plana.
    const luzHemisferio = new THREE.HemisphereLight(0xbfe0ff, 0x3a4a35, 0.6);
    m3dEscena.add(luzHemisferio);

    const luzSol = new THREE.DirectionalLight(0xfff3d6, 1.15);
    luzSol.position.set(120, 180, 80);
    luzSol.castShadow = true;
    luzSol.shadow.mapSize.set(2048, 2048);
    luzSol.shadow.bias = -0.0004;
    luzSol.shadow.camera.left = -200;
    luzSol.shadow.camera.right = 200;
    luzSol.shadow.camera.top = 200;
    luzSol.shadow.camera.bottom = -200;
    m3dEscena.add(luzSol);

    m3dEscena.add(m3dConstruirSuelo(m3dPuntosRuta));
    m3dEscena.add(m3dConstruirCarretera(m3dPuntosRuta));
    m3dEscena.add(m3dConstruirEdificios(m3dPuntosRuta));
    m3dEscena.add(m3dConstruirArboles(m3dPuntosRuta));
    m3dEscena.add(m3dCrearMarcador(m3dPuntosRuta[0], 0x4f9eb0));
    m3dPosicionMeta = m3dPuntosRuta[m3dPuntosRuta.length - 1];
    m3dEscena.add(m3dCrearMarcador(m3dPosicionMeta, 0xd9463e));

    m3dCarro = m3dCrearCarro();
    m3dEscena.add(m3dCarro);

    // El auto arranca en el origen, apuntando hacia el segundo punto de la ruta.
    const inicio = m3dPuntosRuta[0];
    const siguiente = m3dPuntosRuta[Math.min(1, m3dPuntosRuta.length - 1)];
    m3dAuto.x = inicio.x;
    m3dAuto.z = inicio.z;
    m3dAuto.angulo = Math.atan2(siguiente.x - inicio.x, siguiente.z - inicio.z) || 0;
    m3dAuto.velocidad = 0;

    obtenerElemento('modo3d-origen').textContent = lugares[origen]?.nombre || '--';
    obtenerElemento('modo3d-destino').textContent = lugares[destino]?.nombre || '--';
    obtenerElemento('modo3d-llegada').classList.add('hidden');
}

// Aplica la física arcade: acelerar/frenar con arriba/abajo y girar con
// izquierda/derecha (el giro se reduce a baja velocidad, como en un carro real).
function m3dActualizarFisica(delta) {
    const acelerando = m3dTeclas.has('ArrowUp');
    const frenando = m3dTeclas.has('ArrowDown');

    if (acelerando) {
        m3dAuto.velocidad += M3D_ACELERACION * delta;
    } else if (frenando) {
        m3dAuto.velocidad -= M3D_FRENADO * delta;
    } else if (m3dAuto.velocidad > 0) {
        m3dAuto.velocidad = Math.max(0, m3dAuto.velocidad - M3D_FRICCION * delta);
    } else if (m3dAuto.velocidad < 0) {
        m3dAuto.velocidad = Math.min(0, m3dAuto.velocidad + M3D_FRICCION * delta);
    }

    m3dAuto.velocidad = Math.max(
        M3D_VELOCIDAD_MAXIMA_REVERSA,
        Math.min(M3D_VELOCIDAD_MAXIMA, m3dAuto.velocidad)
    );

    const factorGiro = Math.min(Math.abs(m3dAuto.velocidad) / 6, 1);
    if (m3dTeclas.has('ArrowLeft')) {
        m3dAuto.angulo -= M3D_GIRO_MAXIMO * factorGiro * delta * Math.sign(m3dAuto.velocidad || 1);
    }
    if (m3dTeclas.has('ArrowRight')) {
        m3dAuto.angulo += M3D_GIRO_MAXIMO * factorGiro * delta * Math.sign(m3dAuto.velocidad || 1);
    }

    m3dAuto.x += Math.sin(m3dAuto.angulo) * m3dAuto.velocidad * delta;
    m3dAuto.z += Math.cos(m3dAuto.angulo) * m3dAuto.velocidad * delta;

    m3dCarro.position.set(m3dAuto.x, 0, m3dAuto.z);
    m3dCarro.rotation.y = m3dAuto.angulo;

    const distanciaCamara = 8.5;
    const alturaCamara = 4.2;
    const posicionCamaraDeseada = new THREE.Vector3(
        m3dAuto.x - Math.sin(m3dAuto.angulo) * distanciaCamara,
        alturaCamara,
        m3dAuto.z - Math.cos(m3dAuto.angulo) * distanciaCamara
    );
    m3dCamara.position.lerp(posicionCamaraDeseada, 1 - Math.pow(0.001, delta));
    m3dCamara.lookAt(m3dAuto.x, 1.1, m3dAuto.z);

    const distanciaMeta = Math.hypot(m3dAuto.x - m3dPosicionMeta.x, m3dAuto.z - m3dPosicionMeta.z);
    obtenerElemento('modo3d-velocidad').textContent = `${Math.round(Math.abs(m3dAuto.velocidad) * 3.6)} km/h`;
    obtenerElemento('modo3d-distancia').textContent = `${Math.max(0, Math.round(distanciaMeta))} m`;

    if (!m3dLlegoAlDestino && distanciaMeta < 14) {
        m3dLlegoAlDestino = true;
        obtenerElemento('modo3d-llegada').classList.remove('hidden');
    }
}

function m3dAnimar() {
    m3dAnimacionId = requestAnimationFrame(m3dAnimar);
    const delta = Math.min(m3dReloj.getDelta(), 0.1);
    m3dActualizarFisica(delta);
    m3dRenderizador.render(m3dEscena, m3dCamara);
}

function m3dAjustarTamano() {
    if (!modo3DActivo || !m3dCamara || !m3dRenderizador) return;
    const ancho = m3dContenedor.clientWidth;
    const alto = m3dContenedor.clientHeight;
    m3dCamara.aspect = ancho / alto;
    m3dCamara.updateProjectionMatrix();
    m3dRenderizador.setSize(ancho, alto);
}

function abrirModo3D() {
    if (!rutaCallesLista || !geometriaRutaCalles?.length) {
        mostrarAviso('Calcula o espera una ruta antes de entrar al modo 3D');
        return;
    }

    modo3DActivo = true;
    m3dTeclas.clear();
    m3dContenedor = obtenerElemento('modo3d-canvas');
    obtenerElemento('modo3d-screen').classList.remove('hidden');
    obtenerElemento('modo3d-cargando').classList.remove('hidden');
    document.body.classList.add('sin-scroll');

    requestAnimationFrame(() => {
        m3dInicializarEscena();
        m3dReloj = new THREE.Clock();
        m3dAnimar();
        obtenerElemento('modo3d-cargando').classList.add('hidden');
    });
}

function cerrarModo3D() {
    if (!modo3DActivo) return;

    modo3DActivo = false;
    cancelAnimationFrame(m3dAnimacionId);
    m3dTeclas.clear();
    document.body.classList.remove('sin-scroll');

    if (m3dRenderizador) {
        m3dRenderizador.dispose();
    }
    if (m3dContenedor) {
        m3dContenedor.innerHTML = '';
    }

    obtenerElemento('modo3d-screen').classList.add('hidden');
}

obtenerElemento('open-3d-button').addEventListener('click', abrirModo3D);
obtenerElemento('close-3d-button').addEventListener('click', cerrarModo3D);

// Teclado exclusivo del modo 3D: flechas para manejar, ESC para salir.
document.addEventListener('keydown', (evento) => {
    if (!modo3DActivo) return;

    if (evento.key === 'Escape') {
        cerrarModo3D();
        return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(evento.key)) {
        evento.preventDefault();
        m3dTeclas.add(evento.key);
    }
});

document.addEventListener('keyup', (evento) => {
    m3dTeclas.delete(evento.key);
});

window.addEventListener('resize', m3dAjustarTamano);
