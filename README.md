# RUTA//BFS

Juego educativo de búsqueda en anchura (BFS) ambientado en Quito y el Valle de los Chillos.

## Ejecutar

Abre `proyectofinalbfs.html` con un servidor local. En VS Code puedes usar **Live Server** o ejecutar:

```powershell
npx serve .
```

Luego entra a la URL indicada por el servidor.

## Modos

- **Piloto manual:** mueve el vehículo entre lugares usando las flechas.
- **Autopiloto BFS:** observa cómo la búsqueda en anchura resuelve la ruta mínima.
- **Humano vs BFS:** intenta completar la ruta con la menor cantidad de pasos.

La misión inicial se genera automáticamente. Dentro del programa puedes elegir un punto A y un punto B para calcular otra ruta; el trazado principal consulta calles reales mediante OSRM y OpenStreetMap, mientras BFS conserva la explicación de la red educativa.
