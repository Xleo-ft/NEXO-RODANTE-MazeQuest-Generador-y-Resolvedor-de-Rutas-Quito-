# RUTA//BFS

Juego educativo de búsqueda en anchura (BFS) ambientado en Quito y el Valle de los Chillos.

## Ejecutar

Abre `index.html` con un servidor local. En VS Code puedes usar **Live Server** o ejecutar:

```powershell
npx serve .
```

Luego entra a la URL indicada por el servidor.

## Modos

- **Piloto manual:** mueve el vehículo entre lugares usando las flechas.
- **Autopiloto BFS:** observa cómo la búsqueda en anchura resuelve la ruta mínima.
- **Humano vs BFS:** intenta completar la ruta con la menor cantidad de pasos.

El mapa utiliza Leaflet y teselas públicas de OpenStreetMap. Así el proyecto funciona sin una clave privada. La red educativa está compuesta por lugares reales de Quito y Valle de los Chillos; BFS calcula sobre las conexiones entre esos nodos.
