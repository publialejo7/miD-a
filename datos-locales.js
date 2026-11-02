// El modo local conserva sus claves originales. Cada cuenta dispone de una
// copia offline independiente; una escritura de cuenta es un único setItem.
const DatosMiDia = (() => {
    const AUTH = 'miDiaAuthV1';
    let sesion = null;
    try {sesion = JSON.parse(localStorage.getItem(AUTH) || 'null');} catch {}
    const proyecto = (globalThis.MI_DIA_NUBE?.url || '').replace(/\/$/, '');
    const cuenta = sesion?.project === proyecto && typeof sesion?.user?.id === 'string' ? sesion.user.id : null;
    const clave = cuenta ? 'miDiaCuentaV1:' + proyecto + ':' + cuenta : null;
    function leer() {
        const raw = localStorage.getItem(clave);
        if (!raw) return {datos: {}};
        const datos = JSON.parse(raw);
        if (!datos || !datos.datos || typeof datos.datos !== 'object') throw new Error('No se pudo leer la copia de tu cuenta.');
        return datos;
    }
    function notificar() {
        window.dispatchEvent(new Event('mi-dia:guardado'));
    }
    const almacenamiento = {
        getItem(nombre) {return cuenta ? leer().datos[nombre] ?? null : localStorage.getItem(nombre);},
        setItem(nombre, valor) {
            if (cuenta) {
                const estado = leer(); estado.datos[nombre] = valor;
                localStorage.setItem(clave, JSON.stringify(estado));
            } else localStorage.setItem(nombre, valor);
            notificar();
        }
    };
    function transaccion(cambio) {
        if (!cuenta) throw new Error('Inicia sesión para sincronizar.');
        const estado = leer(); cambio(estado);
        localStorage.setItem(clave, JSON.stringify(estado));
    }
    return {AUTH, cuenta, proyecto, almacenamiento, leer, transaccion};
})();
