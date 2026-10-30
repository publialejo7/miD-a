(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext || !/^https?:$/.test(location.protocol)) return;
    const panel = document.getElementById('estado-pwa');
    const mensaje = document.getElementById('mensaje-pwa');
    const actualizar = document.getElementById('actualizar-pwa');
    let registro, recargar = false, buscando = false;

    function informar(texto, hayActualizacion = false) {
        if (mensaje.textContent !== texto) mensaje.textContent = texto;
        panel.hidden = !texto;
        actualizar.hidden = !hayActualizacion;
    }
    function mostrarEstado() {
        if (registro?.waiting) informar('Hay una nueva versión. Guarda tus cambios antes de actualizar.', true);
        else if (!navigator.onLine) informar('Sin conexión. Puedes seguir usando Mi día.');
        else informar('');
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        // La primera instalación no recarga. Una actualización solo recarga
        // esta pestaña cuando el usuario ha pulsado el botón.
        if (recargar) location.reload();
    });
    actualizar.addEventListener('click', () => {
        if (!registro?.waiting) return;
        recargar = true;
        actualizar.disabled = true;
        registro.waiting.postMessage({type: 'ACTIVATE_UPDATE'});
    });
    async function comprobarActualizacion() {
        if (!registro || !navigator.onLine || buscando) return;
        buscando = true;
        try {await registro.update();} catch (error) {console.info('No se pudo comprobar la actualización de Mi día.', error);}
        finally {buscando = false; mostrarEstado();}
    }
    window.addEventListener('online', () => {mostrarEstado(); comprobarActualizacion();});
    window.addEventListener('offline', mostrarEstado);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') comprobarActualizacion();
    });
    navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'}).then(reg => {
        registro = reg;
        registro.addEventListener('updatefound', () => {
            const instalando = registro.installing;
            instalando?.addEventListener('statechange', () => {
                if (instalando.state === 'installed' || instalando.state === 'redundant') mostrarEstado();
            });
        });
        mostrarEstado();
        comprobarActualizacion();
    }).catch(error => {
        console.error('No se pudo preparar Mi día para usarla sin conexión.', error);
        informar('No se pudo preparar el uso sin conexión. Vuelve a abrir la app con conexión.');
    });
})();
