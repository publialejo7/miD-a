// Cálculos de solo lectura. Las fechas se agrupan por el día local del registro.
const ResumenesMiDia = (() => {
    function clave(fecha) {
        return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
    }
    function periodo(tipo, referencia) {
        const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), 12);
        if (tipo === 'mes') inicio.setDate(1);
        else inicio.setDate(inicio.getDate() - (inicio.getDay() + 6) % 7);
        const fin = new Date(inicio);
        if (tipo === 'mes') fin.setMonth(fin.getMonth() + 1);
        else fin.setDate(fin.getDate() + 7);
        const dias = [];
        for (const fecha = new Date(inicio); fecha < fin; fecha.setDate(fecha.getDate() + 1)) {
            dias.push({fecha: clave(fecha), numero: fecha.getDate(), valor: 0});
        }
        return {inicio: clave(inicio), fin: clave(fin), desplazamiento: (inicio.getDay() + 6) % 7, dias};
    }
    function estudio(sesiones, rango) {
        const dias = rango.dias.map(dia => ({...dia}));
        const porDia = new Map(dias.map(dia => [dia.fecha, dia]));
        const materias = new Map();
        let total = 0, registros = 0, bloques = 0, pomodoro = 0;
        for (const sesion of sesiones) {
            const dia = porDia.get(sesion.fecha);
            if (!dia || !Number.isFinite(sesion.duracion) || sesion.duracion <= 0) continue;
            dia.valor += sesion.duracion;
            total += sesion.duracion;
            registros++;
            if (sesion.modo === 'pomodoro') {
                pomodoro += sesion.duracion;
                if (sesion.completo === true) bloques++;
            }
            const materia = sesion.materia || 'Sin materia';
            materias.set(materia, (materias.get(materia) || 0) + sesion.duracion);
        }
        return {dias, total, registros, bloques, pomodoro, libre: total - pomodoro,
            diasActivos: dias.filter(dia => dia.valor > 0).length,
            detalle: [...materias].map(([nombre, valor]) => ({nombre, valor})).sort((a, b) => b.valor - a.valor)};
    }
    function gimnasio(entrenamientos, rango) {
        const dias = rango.dias.map(dia => ({...dia}));
        const porDia = new Map(dias.map(dia => [dia.fecha, dia]));
        const rutinas = new Map(), ejercicios = new Set();
        let series = 0;
        for (const [fecha, entrenamiento] of Object.entries(entrenamientos)) {
            const dia = porDia.get(fecha);
            if (!dia) continue;
            let completas = 0;
            for (const ejercicio of entrenamiento.ejercicios || []) {
                const validas = (ejercicio.series || []).filter(serie =>
                    serie.completada !== false &&
                    String(serie.repeticiones ?? '').trim() !== '' && String(serie.peso ?? '').trim() !== '' &&
                    Number.isInteger(Number(serie.repeticiones)) && Number(serie.repeticiones) > 0 &&
                    Number.isFinite(Number(serie.peso)) && Number(serie.peso) >= 0);
                completas += validas.length;
                if (validas.length) ejercicios.add(ejercicio.nombre.trim().toLowerCase());
            }
            dia.valor = completas;
            series += completas;
            if (completas) {
                const rutina = entrenamiento.rutina || 'Sin rutina';
                rutinas.set(rutina, (rutinas.get(rutina) || 0) + 1);
            }
        }
        return {dias, series, ejercicios: ejercicios.size, diasActivos: dias.filter(dia => dia.valor > 0).length,
            detalle: [...rutinas].map(([nombre, valor]) => ({nombre, valor})).sort((a, b) => b.valor - a.valor)};
    }
    function agenda(tareas, rango) {
        const dias = rango.dias.map(dia => ({...dia, pendientes: 0, terminadas: 0}));
        const porDia = new Map(dias.map(dia => [dia.fecha, dia]));
        const elementos = [];
        for (const tarea of tareas) {
            const dia = porDia.get(tarea.fecha);
            if (!dia) continue;
            dia.valor++;
            if (tarea.terminada) dia.terminadas++;
            else dia.pendientes++;
            elementos.push({...tarea});
        }
        elementos.sort((a, b) => Number(a.terminada) - Number(b.terminada) || a.fecha.localeCompare(b.fecha) || a.creada - b.creada);
        return {dias, elementos, total: elementos.length, pendientes: elementos.filter(tarea => !tarea.terminada).length,
            terminadas: elementos.filter(tarea => tarea.terminada).length, examenes: elementos.filter(tarea => tarea.tipo === 'examen').length};
    }
    return {clave, periodo, estudio, gimnasio, agenda};
})();
if (typeof module !== 'undefined') module.exports = ResumenesMiDia;
