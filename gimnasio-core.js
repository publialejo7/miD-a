// Modelo de gimnasio: las plantillas y el historial nunca son el borrador activo.
const GimnasioMiDia = (() => {
    const copia = x => JSON.parse(JSON.stringify(x));
    const id = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'gym-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    function valida(s) {
        return String(s.peso ?? '').trim() !== '' && String(s.repeticiones ?? '').trim() !== '' &&
            Number.isFinite(Number(s.peso)) && Number(s.peso) >= 0 &&
            Number.isInteger(Number(s.repeticiones)) && Number(s.repeticiones) > 0;
    }
    // Las series antiguas con valores válidos conservan su significado de realizadas.
    const completada = s => s.completada !== false && valida(s);
    function anterior(datos, nombre, variante, fecha) {
        for (const dia of Object.keys(datos.entrenamientos).sort().reverse()) {
            if (dia >= fecha) continue;
            const ejercicios = datos.entrenamientos[dia].ejercicios || [];
            const ejercicio = [...ejercicios].reverse().find(e => e.nombre === nombre && (e.variante || '') === (variante || '') && e.series.some(completada));
            // Mantener las posiciones: una serie sin referencia no se rellena con otra.
            if (ejercicio) return {fecha:dia, series:ejercicio.series.map(s => completada(s) ? copia(s) : null)};
        }
        return null;
    }
    function ejercicio(datos, nombre, variante, fecha, descanso) {
        const ref = anterior(datos,nombre,variante,fecha);
        return {id:id(),nombre,variante:variante || '',descanso,series:ref ? ref.series.map(s => ({peso:s?.peso ?? '',repeticiones:s?.repeticiones ?? '',completada:false})) : [{peso:'',repeticiones:'',completada:false}]};
    }
    function iniciar(datos, fecha, hoy, rutina, ahora = Date.now()) {
        if (datos.activo) return datos.activo;
        if (fecha > hoy) throw new Error('Elige hoy o una fecha anterior para registrar un entrenamiento.');
        const nombres = datos.ejerciciosPorRutina['rutina:' + rutina] || [];
        datos.activo = {id:id(),fecha,rutina:rutina || 'Entrenamiento libre',origen:rutina || null,
            inicio:fecha === hoy ? ahora : null,autoDescanso:true,descansoPredeterminado:90,sonido:false,descanso:null,
            ejercicios:nombres.map(n => ejercicio(datos,n,'',fecha,90))};
        return datos.activo;
    }
    function confirmar(activo, ejercicio, serie, valor, ahora = Date.now()) {
        if (valor && !valida(serie)) throw new Error('Introduce un peso de 0 kg o más y repeticiones enteras mayores que 0.');
        serie.completada = valor;
        // Una nueva confirmación sustituye el descanso anterior; nunca se superponen.
        if (valor && activo.autoDescanso) activo.descanso = {fin:ahora + ejercicio.descanso * 1000,avisado:false};
    }
    function conteo(activo) {
        const series = activo.ejercicios.flatMap(e => e.series);
        const completas = series.filter(completada).length;
        return {completas,pendientes:series.length-completas};
    }
    function finalizar(datos, ahora = Date.now()) {
        const a = datos.activo;
        if (!a) return null;
        if (!conteo(a).completas) throw new Error('No hay series completadas. Puedes continuar o descartar la sesión.');
        const dia = datos.entrenamientos[a.fecha];
        if (dia?.sesiones?.some(s => s.id === a.id)) {delete datos.activo; return dia;}
        const ejercicios = a.ejercicios.map(e => ({...copia(e),series:e.series.map(s => ({...copia(s),completada:completada(s)}))}));
        const resumen = {id:a.id,fecha:a.fecha,nombre:a.rutina,inicio:a.inicio,fin:ahora,
            duracion:a.inicio === null ? null : Math.max(0,ahora-a.inicio),ejercicios};
        // Un día puede contener varias sesiones. El formato agregado mantiene los resúmenes antiguos.
        datos.entrenamientos[a.fecha] = {rutina:dia && dia.rutina !== a.rutina ? 'Varias sesiones' : a.rutina,
            ejercicios:[...(dia?.ejercicios || []),...ejercicios],sesiones:[...(dia?.sesiones || []),resumen]};
        datos.porDia[a.fecha] = datos.entrenamientos[a.fecha].rutina;
        delete datos.activo;
        return resumen;
    }
    return {copia,valida,completada,anterior,ejercicio,iniciar,confirmar,conteo,finalizar};
})();
if (typeof module !== 'undefined') module.exports = GimnasioMiDia;
