// Sin dependencias y sin red. Comparación de tres versiones por registro.
const SyncMiDia = (() => {
    const grupos = ['study', 'tasks', 'routines', 'workouts'];
    const vacio = () => ({version: 1, study: {}, tasks: {}, routines: {}, workouts: {}});
    function canon(valor) {
        if (Array.isArray(valor)) return '[' + valor.map(canon).join(',') + ']';
        if (valor && typeof valor === 'object') return '{' + Object.keys(valor).sort().map(k => JSON.stringify(k) + ':' + canon(valor[k])).join(',') + '}';
        return JSON.stringify(valor);
    }
    const igual = (a, b) => canon(a) === canon(b);
    const copiar = dato => JSON.parse(JSON.stringify(dato));
    function fechaValida(valor) {
        if(typeof valor!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor))return false;
        const [anio,mes,dia]=valor.split('-').map(Number), fecha=new Date(anio,mes-1,dia,12);
        return anio>=1000 && fecha.getFullYear()===anio && fecha.getMonth()===mes-1 && fecha.getDate()===dia;
    }
    function validar(datos) {
        if (!datos || datos.version !== 1) throw new Error('Versión de datos de la nube no compatible.');
        for (const grupo of grupos) {
            if (!datos[grupo] || typeof datos[grupo] !== 'object' || Array.isArray(datos[grupo])) throw new Error('Datos de la nube no válidos.');
            for (const [id,valor] of Object.entries(datos[grupo])) {
                if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Registro de la nube no válido.');
                if (grupo === 'study' && (!fechaValida(valor.fecha) || typeof valor.materia !== 'string' || !Number.isFinite(valor.duracion) || valor.duracion < 0 || (valor.id && valor.id!==id))) throw new Error('Sesión de estudio no válida.');
                if (grupo === 'tasks' && (valor.id!==id || typeof valor.titulo !== 'string' || !valor.titulo.trim() || valor.titulo.length>160 || !fechaValida(valor.fecha) || !['tarea','examen','recordatorio'].includes(valor.tipo) || typeof valor.terminada !== 'boolean' || !Number.isFinite(valor.creada) || typeof valor.notas!=='string' || valor.notas.length>600)) throw new Error('Tarea de la nube no válida.');
                if (grupo === 'routines' && (valor.nombre!==id || !valor.nombre || !Array.isArray(valor.ejercicios) || !valor.ejercicios.every(e => typeof e === 'string'))) throw new Error('Rutina de la nube no válida.');
                if (grupo === 'workouts' && id === '@active') {
                    const a=valor.entrenamiento;
                    const segundos=v=>Number.isInteger(v) && v>=0 && v<=3600;
                    if (!a || typeof a.id!=='string' || !a.id || !fechaValida(a.fecha) ||
                        !(a.inicio===null || (Number.isFinite(a.inicio) && a.inicio>=0)) ||
                        typeof a.autoDescanso!=='boolean' || typeof a.sonido!=='boolean' || !segundos(a.descansoPredeterminado) ||
                        !(a.descanso===null || (a.descanso && Number.isFinite(a.descanso.fin) && typeof a.descanso.avisado==='boolean')) ||
                        !Array.isArray(a.ejercicios) || !a.ejercicios.every(e=>typeof e.nombre==='string' && typeof e.variante==='string' && segundos(e.descanso) && Array.isArray(e.series) && e.series.every(s=>typeof s.completada==='boolean')))
                        throw new Error('El entrenamiento abierto de la nube no es válido.');
                }
                if (grupo === 'workouts' && ((id !== '@active' && !fechaValida(id)) || (id === '@active' && (!valor.entrenamiento || !fechaValida(valor.entrenamiento.fecha) || typeof valor.entrenamiento.id !== 'string')) || typeof valor.rutina !== 'string' || (valor.entrenamiento !== null && (!valor.entrenamiento || typeof valor.entrenamiento.rutina!=='string' || !Array.isArray(valor.entrenamiento.ejercicios) || !valor.entrenamiento.ejercicios.every(e => typeof e.nombre === 'string' && Array.isArray(e.series) && e.series.every(s => s && ['string','number'].includes(typeof s.repeticiones) && ['string','number'].includes(typeof s.peso))))))) throw new Error('Entrenamiento de la nube no válido.');
            }
        }
        return datos;
    }
    function combinar(base, local, remoto) {
        [base, local, remoto].forEach(validar);
        const resultado = vacio(), conflictos = [];
        for (const grupo of grupos) {
            const entradas = [];
            for (const id of new Set([...Object.keys(base[grupo]), ...Object.keys(local[grupo]), ...Object.keys(remoto[grupo])])) {
                const propio = obj => Object.prototype.hasOwnProperty.call(obj,id) ? obj[id] : undefined;
                const b = propio(base[grupo]), l = propio(local[grupo]), r = propio(remoto[grupo]);
                let valor;
                if (igual(l, b)) valor = r;
                else if (igual(r, b) || igual(l, r)) valor = l;
                else {valor = l; conflictos.push({grupo, id, local: l ?? null, remoto: r ?? null});}
                if (valor !== undefined) entradas.push([id, valor]);
            }
            resultado[grupo] = Object.fromEntries(entradas);
        }
        return {datos: copiar(resultado), conflictos};
    }
    function desdeDocumentos(documentos) {
        const leer = (clave, defecto) => documentos[clave] ? JSON.parse(documentos[clave]) : defecto;
        const estudio = leer('miDiaProductividadV1', null);
        const sesiones = estudio?.sesiones || leer('miDiaSesiones', []);
        const gym = leer('miDiaGimnasio', {rutinas: [], ejerciciosPorRutina: {}, porDia: {}, entrenamientos: {}});
        const agenda = leer('miDiaTareasV1', {tareas: []});
        const resultado = vacio(), repeticiones = new Map();
        resultado.study = Object.fromEntries(sesiones.map(sesion => {
            const clave = canon(sesion), n = repeticiones.get(clave) || 0;
            repeticiones.set(clave, n + 1);
            return [sesion.id || 'legacy:' + clave + ':' + n, sesion];
        }));
        resultado.tasks = Object.fromEntries(agenda.tareas.map(tarea => [tarea.id, tarea]));
        const nombres = new Set([...(gym.rutinas || []), ...Object.keys(gym.ejerciciosPorRutina || {}).filter(k => k.startsWith('rutina:')).map(k => k.slice(7))]);
        resultado.routines = Object.fromEntries([...nombres].map(nombre => [nombre, {nombre, ejercicios: gym.ejerciciosPorRutina?.['rutina:' + nombre] || []}]));
        const fechas = new Set([...Object.keys(gym.porDia || {}), ...Object.keys(gym.entrenamientos || {})]);
        resultado.workouts = Object.fromEntries([...fechas].map(fecha => [fecha, {rutina: gym.porDia?.[fecha] || gym.entrenamientos?.[fecha]?.rutina || '', entrenamiento: gym.entrenamientos?.[fecha] || null}]));
        if (gym.activo) resultado.workouts['@active'] = {rutina:gym.activo.rutina,entrenamiento:gym.activo};
        return validar(resultado);
    }
    function aDocumentos(datos, anteriores) {
        validar(datos);
        const estudio = anteriores.miDiaProductividadV1 ? JSON.parse(anteriores.miDiaProductividadV1) : {version:1, activa:null, configuracion:[25,5,15]};
        estudio.sesiones = Object.values(datos.study);
        const rutinas = Object.values(datos.routines);
        return {...anteriores,
            miDiaProductividadV1: JSON.stringify(estudio),
            miDiaTareasV1: JSON.stringify({version:1, tareas:Object.values(datos.tasks)}),
            miDiaGimnasio: JSON.stringify({...(datos.workouts['@active'] ? {activo:datos.workouts['@active'].entrenamiento} : {}),rutinas:rutinas.map(r => r.nombre), ejerciciosPorRutina:Object.fromEntries(rutinas.map(r => ['rutina:' + r.nombre, r.ejercicios])),
                porDia:Object.fromEntries(Object.entries(datos.workouts).filter(([fecha]) => fecha !== '@active').map(([fecha, w]) => [fecha, w.rutina])),
                entrenamientos:Object.fromEntries(Object.entries(datos.workouts).filter(([fecha,w]) => fecha !== '@active' && w.entrenamiento).map(([fecha,w]) => [fecha,w.entrenamiento]))})
        };
    }
    class Motor {
        constructor({leer, guardar, descargar, subir}) {Object.assign(this, {leer, guardar, descargar, subir});this.enCurso=false;}
        async sincronizar() {
            if (this.enCurso) return;
            this.enCurso=true;
            try {
                for (let intento=0; intento<4; intento++) {
                    const remoto=await this.descargar(); validar(remoto.data);
                    const estado=this.leer();
                    const mezcla=combinar(estado.base || vacio(),estado.local,remoto.data);
                    if (mezcla.conflictos.length) {
                        this.guardar({...estado, conflictos:mezcla.conflictos, remoto});
                        return {conflictos:mezcla.conflictos};
                    }
                    if (igual(mezcla.datos,remoto.data)) {
                        this.guardar({base:remoto.data,local:mezcla.datos,revision:remoto.revision,conflictos:[],remoto:null});
                        return {sincronizado:true};
                    }
                    const enviado=copiar(mezcla.datos);
                    const respuesta=await this.subir(remoto.revision,enviado);
                    if (!respuesta.ok) continue;
                    // Conserva también las ediciones hechas durante la petición.
                    const reciente=this.leer();
                    const final=combinar(estado.local,reciente.local,enviado);
                    if(final.conflictos.length) throw new Error('Hay cambios simultáneos en este dispositivo. Vuelve a sincronizar.');
                    this.guardar({base:enviado,local:final.datos,revision:respuesta.revision,conflictos:[],remoto:null});
                    if(igual(final.datos,enviado)) return {sincronizado:true};
                }
                throw new Error('Hay cambios nuevos en otro dispositivo. Vuelve a sincronizar en unos segundos.');
            } finally {this.enCurso=false;}
        }
        resolver(preferencia) {
            if (!['local','remoto'].includes(preferencia)) throw new Error('Selecciona una versión.');
            const estado=this.leer();
            if (!estado.remoto) return;
            const mezcla=combinar(estado.base || vacio(),estado.local,estado.remoto.data);
            for (const conflicto of mezcla.conflictos) {
                const valor=conflicto[preferencia];
                if(valor===null)delete mezcla.datos[conflicto.grupo][conflicto.id];
                else mezcla.datos[conflicto.grupo]={...mezcla.datos[conflicto.grupo],[conflicto.id]:valor};
            }
            this.guardar({base:estado.remoto.data,local:mezcla.datos,revision:estado.remoto.revision,conflictos:[],remoto:null});
        }
    }
    return {vacio, canon, igual, validar, combinar, desdeDocumentos, aDocumentos, Motor};
})();
if (typeof module !== 'undefined') module.exports = SyncMiDia;
