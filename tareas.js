const TareasMiDia = (() => {
    const CLAVE = 'miDiaTareasV1';
    function fechaValida(valor) {
        if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
        const [anio, mes, dia] = valor.split('-').map(Number);
        const fecha = new Date(anio, mes - 1, dia, 12);
        return anio >= 1000 && fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
    }
    function campos(datos) {
        const titulo = typeof datos.titulo === 'string' ? datos.titulo.trim() : '';
        const notas = typeof datos.notas === 'string' ? datos.notas.trim() : '';
        if (!titulo || titulo.length > 160) throw new Error('Escribe un título de entre 1 y 160 caracteres.');
        if (!['tarea', 'examen', 'recordatorio'].includes(datos.tipo)) throw new Error('Selecciona un tipo válido.');
        if (!fechaValida(datos.fecha)) throw new Error('Elige una fecha válida.');
        if (notas.length > 600) throw new Error('Los detalles pueden tener hasta 600 caracteres.');
        return {titulo, tipo: datos.tipo, fecha: datos.fecha, notas};
    }
    function crearId() {
        if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
        return 'tarea-' + Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');
    }
    class Agenda {
        constructor(almacenamiento) {
            this.almacenamiento = almacenamiento;
            this.errorLectura = '';
            this._tareas = [];
            try {
                const guardado = almacenamiento.getItem(CLAVE);
                if (guardado !== null) {
                    const datos = JSON.parse(guardado);
                    if (datos.version !== 1 || !Array.isArray(datos.tareas)) throw new Error('Formato de agenda desconocido');
                    const ids = new Set();
                    const tareas = datos.tareas.map(tarea => {
                        if (!tarea || typeof tarea.id !== 'string' || !tarea.id || ids.has(tarea.id) || typeof tarea.terminada !== 'boolean' || !Number.isFinite(tarea.creada)) throw new Error('Registro no válido');
                        ids.add(tarea.id);
                        return {...tarea, ...campos(tarea)};
                    });
                    this._tareas = tareas;
                }
            } catch (error) {
                this.errorLectura = 'No se pudo leer la agenda. Tus datos no se sobrescribirán. Revisa el almacenamiento del navegador antes de continuar.';
            }
        }
        listar({fecha = '', estado = 'todas'} = {}) {
            return this._tareas.filter(tarea => (!fecha || tarea.fecha === fecha) &&
                (estado === 'todas' || tarea.terminada === (estado === 'terminadas')))
                .map(tarea => ({...tarea})).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creada - b.creada || a.id.localeCompare(b.id));
        }
        resumen(fecha) {
            const tareas = this.listar({fecha});
            return {pendientes: tareas.filter(tarea => !tarea.terminada).length, terminadas: tareas.filter(tarea => tarea.terminada).length};
        }
        _cambiar(cambio) {
            if (this.errorLectura) throw new Error(this.errorLectura);
            const nuevas = this._tareas.map(tarea => ({...tarea}));
            const resultado = cambio(nuevas);
            try { this.almacenamiento.setItem(CLAVE, JSON.stringify({version: 1, tareas: nuevas})); }
            catch (error) { throw new Error('No se pudo guardar. El cambio no se ha aplicado. Libera espacio o permite el almacenamiento y vuelve a intentarlo.'); }
            this._tareas = nuevas;
            return resultado;
        }
        crear(datos) {
            const tarea = {...campos(datos), id: crearId(), terminada: false, creada: Date.now(), completada: null};
            return this._cambiar(tareas => {tareas.push(tarea); return tarea.id;});
        }
        editar(id, datos) {
            const cambios = campos(datos);
            this._cambiar(tareas => Object.assign(this._buscar(tareas, id), cambios));
        }
        terminar(id, terminada) {
            if (typeof terminada !== 'boolean') throw new Error('Estado no válido.');
            this._cambiar(tareas => Object.assign(this._buscar(tareas, id), {terminada, completada: terminada ? Date.now() : null}));
        }
        borrar(id) {
            this._cambiar(tareas => {this._buscar(tareas, id); tareas.splice(tareas.findIndex(tarea => tarea.id === id), 1);});
        }
        _buscar(tareas, id) {
            const tarea = tareas.find(tarea => tarea.id === id);
            if (!tarea) throw new Error('Esta tarea ya no existe.');
            return tarea;
        }
    }
    return {Agenda, fechaValida, CLAVE};
})();
const agendaMiDia = (() => {
    try { return typeof localStorage !== 'undefined' ? new TareasMiDia.Agenda(localStorage) : null; }
    catch (error) {
        return new TareasMiDia.Agenda({getItem() {throw error;}});
    }
})();
if (typeof module !== 'undefined') module.exports = TareasMiDia;
