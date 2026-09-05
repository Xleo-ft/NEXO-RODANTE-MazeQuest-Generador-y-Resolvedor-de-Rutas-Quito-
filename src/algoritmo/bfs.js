// ===\r\n// ALGORITMO: búsqueda en anchuras (BFS) sobre el grafo de lugares.\r\n// ===

// Encuentra el camino más corto entre dos lugares usando el algoritmo BFS.
function buscarAnchura(inicio, fin) {
    const cola = [inicio];
    const anterior = { [inicio]: null };

    while (cola.length) {
        const nodo = cola.shift();

        if (nodo === fin) {
            break;
        }

        grafo[nodo].forEach((siguiente) => {
            if (!(siguiente in anterior)) {
                anterior[siguiente] = nodo;
                cola.push(siguiente);
            }
        });
    }

    const camino = [];
    let nodoActual = fin;

    while (nodoActual !== null && nodoActual !== undefined) {
        camino.unshift(nodoActual);
        nodoActual = anterior[nodoActual];
    }

    return camino;
}
