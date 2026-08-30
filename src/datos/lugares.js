// ===\r\n// DATOS: catálogo de lugares (nodos) y grafo de conexiones\r\n// usado por el algoritmo BFS para calcular rutas en Quito.\r\n// ===


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
