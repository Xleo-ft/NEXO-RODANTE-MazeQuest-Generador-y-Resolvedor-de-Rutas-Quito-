// ===\r\n// VEHÍCULO: tienda de vehículos (compra y equipamiento de skins).\r\n// ===

// Actualiza el saldo y el estado de cada vehículo disponible en la tienda.
function actualizarTienda() {
    obtenerElemento('shop-balance').textContent = String(puntuacion).padStart(4, '0');

    document.querySelectorAll('.skin-button').forEach((boton) => {
        const vehiculo = boton.dataset.skin;
        const desbloqueado = vehiculosDesbloqueados.includes(vehiculo);
        const costo = costosVehiculos[vehiculo];
        const textoEstado = boton.querySelector('small');

        boton.classList.toggle('active', vehiculo === vehiculoSeleccionado);
        boton.classList.toggle('locked', !desbloqueado);
        textoEstado.textContent = vehiculo === vehiculoSeleccionado
            ? 'EQUIPADO'
            : desbloqueado ? 'EQUIPAR' : `${costo} PUNTOS`;
    });
}

// Compra un vehículo o equipa uno que ya fue desbloqueado.
function comprarVehiculo(vehiculo) {
    const costo = costosVehiculos[vehiculo];

    if (vehiculosDesbloqueados.includes(vehiculo)) {
        vehiculoSeleccionado = vehiculo;
        localStorage.setItem('vehiculo-seleccionado', vehiculoSeleccionado);
        dibujarRuta();
        actualizarTienda();
        return;
    }

    if (puntuacion < costo) {
        mostrarAviso(`Necesitas ${costo} puntos para comprar este vehículo`);
        return;
    }

    puntuacion -= costo;
    vehiculosDesbloqueados.push(vehiculo);
    vehiculoSeleccionado = vehiculo;
    localStorage.setItem('vehiculos-desbloqueados', JSON.stringify(vehiculosDesbloqueados));
    localStorage.setItem('vehiculo-seleccionado', vehiculoSeleccionado);
    actualizarPanel();
    dibujarRuta();
    mostrarAviso('Vehículo comprado y equipado');
}
