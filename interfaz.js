// Atajos y presentación. Los registros y el temporizador siguen en app.js.
(() => {
    const porId = id => document.getElementById(id);
    const pantallas = [...document.querySelectorAll('body > section')];
    let volverAlGimnasio = false;
    let origenEstudio = 'dia';
    let origenEntrenamiento = 'dia';
    let rutinasDesdeResumen = false;
    let abriendoActividad = false;
    const periodos = {
        gym: {tipo: 'semana', referencia: new Date()},
        prod: {tipo: 'semana', referencia: new Date()},
        agenda: {tipo: 'semana', referencia: new Date()}
    };
    const ultimoDibujo = {};
    let ultimoDestino;
    let origenAgenda = 'inicio';
    let estadoTareas = 'pendientes';
    let idEdicionTarea = null;
    const firmasTareas = {};

    function texto(id, valor) {
        const elemento = porId(id);
        if (elemento.textContent !== valor) elemento.textContent = valor;
    }

    function tiempoLegible(ms) {
        if (ms === 0) return 'Sin registrar';
        if (ms < 60000) return 'Menos de 1 min';
        const minutos = Math.floor(ms / 60000);
        return minutos >= 60
            ? Math.floor(minutos / 60) + ' h' + (minutos % 60 ? ' ' + minutos % 60 + ' min' : '')
            : minutos + ' min';
    }

    function actualizarResumen() {
        const hoy = new Date();
        texto('fecha-hoy', hoy.toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'}));
        texto('estudio-hoy', tiempoLegible(obtenerTiempoDelDia(hoy)));
        const entrenamientoHoy=datosGimnasio.entrenamientos[claveFecha(hoy)];
        const seriesHoy=(entrenamientoHoy?.ejercicios || []).reduce((n,e)=>n+e.series.filter(GimnasioMiDia.completada).length,0);
        texto('gimnasio-hoy',seriesHoy ? seriesHoy+(seriesHoy===1?' serie':' series') : 'Sin registrar');
        if (fechaSeleccionada) {
            texto('estudio-dia', tiempoLegible(obtenerTiempoDelDia(fechaSeleccionada)));
            texto('gimnasio-dia', obtenerResumenGimnasio(fechaSeleccionada) || 'Sin registrar');
        }
        if (!porId('pantalla-resumen-gimnasio').hidden) pintarResumen('gym');
        if (!porId('pantalla-resumen-productividad').hidden) pintarResumen('prod');
        if (!porId('pantalla-resumen-agenda').hidden) pintarResumen('agenda');
        actualizarAgenda();
    }

    function mostrarSolo(pantalla) {
        pantallas.forEach(elemento => elemento.hidden = elemento !== pantalla);
        actualizarCronometro();
    }

    function irAlCalendario() {
        volverAlGimnasio = false;
        rutinasDesdeResumen = false;
        mostrarCarrusel();
        mostrarSolo(porId('pantalla-semana'));
        actualizarResumen();
    }

    function abrirActividad(fecha, actividad, origen = 'dia') {
        volverAlGimnasio = false;
        rutinasDesdeResumen = false;
        if (actividad === 'abrir-productividad') origenEstudio = origen;
        else origenEntrenamiento = origen;
        abriendoActividad = true;
        mostrarSolo(porId('pantalla-dia'));
        abrirDia(fecha);
        porId(actividad).click();
        abriendoActividad = false;
        actualizarBotonesVolver();
    }

    function actualizarBotonesVolver() {
        texto('volver-al-dia', origenEstudio === 'resumen' ? '‹ Volver a Productividad' : origenEstudio === 'pomodoro' ? '‹ Volver al inicio' : '‹ Volver al día');
        texto('volver-del-gimnasio', origenEntrenamiento === 'resumen' ? '‹ Volver a Gimnasio' : '‹ Volver al día');
    }

    function abrirResumen(tipo) {
        volverAlGimnasio = false;
        rutinasDesdeResumen = false;
        mostrarSolo(porId({gym: 'pantalla-resumen-gimnasio', prod: 'pantalla-resumen-productividad', agenda: 'pantalla-resumen-agenda'}[tipo]));
        pintarResumen(tipo);
    }

    function abrirEstudio(modo, origen) {
        if (sesionActiva) {
            const [anio, mes, dia] = sesionActiva.fecha.split('-').map(Number);
            abrirActividad(new Date(anio, mes - 1, dia, 12), 'abrir-productividad', origen);
            if (sesionActiva.modo !== modo) texto('aviso-estudio', 'Ya tienes una sesión de ' + (sesionActiva.modo === 'libre' ? 'cronómetro' : 'Pomodoro') + '. Termínala antes de cambiar de modo.');
            enfocarTemporizador();
        } else {
            modoEstudio.value = modo;
            actualizarCronometro();
            abrirActividad(new Date(), 'abrir-productividad', origen);
        }
        actualizarBarra();
    }

    function actualizarBarra() {
        let destino = 'inicio';
        if (!porId('pantalla-resumen-gimnasio').hidden || !porId('pantalla-gimnasio').hidden ||
            (!porId('pantalla-rutinas').hidden && (volverAlGimnasio || rutinasDesdeResumen))) destino = 'gimnasio';
        if (!porId('pantalla-resumen-productividad').hidden) destino = 'productividad';
        if (!porId('pantalla-productividad').hidden) destino = modoEstudio.value === 'pomodoro' ? 'pomodoro' : 'productividad';
        if (!porId('pantalla-agenda').hidden || !porId('pantalla-resumen-agenda').hidden) destino = 'agenda';
        if (ultimoDestino === destino) return;
        ultimoDestino = destino;
        ['inicio', 'agenda', 'gimnasio', 'productividad', 'pomodoro'].forEach(nombre => {
            const boton = porId('nav-' + nombre);
            if (nombre === destino) boton.setAttribute('aria-current', 'page');
            else boton.removeAttribute('aria-current');
        });
    }

    porId('nav-inicio').addEventListener('click', irAlCalendario);
    porId('nav-gimnasio').addEventListener('click', () => abrirResumen('gym'));
    porId('panorama-agenda').addEventListener('click',()=>{periodos.agenda.referencia=new Date();abrirResumen('agenda');});
    porId('nav-agenda').addEventListener('click', () => abrirResumen('agenda'));
    porId('nav-productividad').addEventListener('click', () => abrirResumen('prod'));
    porId('nav-pomodoro').addEventListener('click', () => abrirEstudio('pomodoro', 'pomodoro'));

    // Solo tacto en dispositivos con puntero principal táctil. El ratón no navega.
    const barra = porId('barra-inferior');
    const ordenBarra = ['gimnasio', 'agenda', 'inicio', 'productividad', 'pomodoro'];
    let gestoBarra = null;
    let bloquearClicBarraHasta = 0;

    function limpiarVistaGesto() {
        ordenBarra.forEach(nombre => porId('nav-' + nombre).removeAttribute('data-deslizamiento'));
        barra.removeAttribute('data-deslizando');
    }
    function cancelarGestoBarra() {
        gestoBarra = null;
        limpiarVistaGesto();
    }
    window.addEventListener('pointerdown', evento => {
        bloquearClicBarraHasta = 0;
        if (!evento.isPrimary) { cancelarGestoBarra(); return; }
        if (evento.pointerType !== 'touch' || !window.matchMedia('(pointer: coarse)').matches) return;
        if (evento.button !== 0 || gestoBarra) return;
        if (porId('app').dataset.foco === 'true') return;
        const objetivo = evento.target;
        if (!objetivo?.closest || !objetivo.closest('#barra-inferior')) return;
        if (document.activeElement?.matches('input, textarea, select, [contenteditable]')) return;
        // Deja libres los bordes para los gestos propios del navegador y del sistema.
        if (evento.clientX < 24 || evento.clientX > window.innerWidth - 24) return;
        gestoBarra = {id: evento.pointerId, x: evento.clientX, y: evento.clientY, origen: ultimoDestino, vertical: false,
            paso: Math.max(1, barra.clientWidth / ordenBarra.length)};
    }, true);
    function posicionGestoBarra(gesto, dx) {
        return Math.max(0, Math.min(ordenBarra.length - 1, ordenBarra.indexOf(gesto.origen) + dx / gesto.paso));
    }
    window.addEventListener('pointermove', evento => {
        if (!gestoBarra || evento.pointerId !== gestoBarra.id) return;
        const dx = evento.clientX - gestoBarra.x;
        const dy = evento.clientY - gestoBarra.y;
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) gestoBarra.vertical = true;
        limpiarVistaGesto();
        if (gestoBarra.vertical || Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        const posicion = posicionGestoBarra(gestoBarra, dx);
        const destino = Math.round(posicion);
        barra.style.setProperty('--posicion-gesto', String(posicion));
        barra.setAttribute('data-deslizando', 'true');
        if (destino >= 0 && destino < ordenBarra.length) porId('nav-' + ordenBarra[destino]).setAttribute('data-deslizamiento', 'true');
    });
    window.addEventListener('pointerup', evento => {
        if (!gestoBarra || evento.pointerId !== gestoBarra.id) return;
        const gesto = gestoBarra;
        const dx = evento.clientX - gesto.x;
        const dy = evento.clientY - gesto.y;
        cancelarGestoBarra();
        // Evita que el clic generado al soltar abra el botón que quedó bajo el dedo.
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) bloquearClicBarraHasta = Date.now() + 500;
        const umbral = Math.min(80, Math.max(44, window.innerWidth * 0.12));
        if (gesto.vertical || gesto.origen !== ultimoDestino || Math.abs(dx) < umbral || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        const destino = Math.round(posicionGestoBarra(gesto, dx));
        if (ordenBarra[destino] !== gesto.origen) porId('nav-' + ordenBarra[destino]).click();
    });
    window.addEventListener('pointercancel', evento => {
        if (gestoBarra && evento.pointerId === gestoBarra.id) cancelarGestoBarra();
    });
    window.addEventListener('blur', cancelarGestoBarra);
    window.addEventListener('click', evento => {
        if (evento.detail > 0 && Date.now() < bloquearClicBarraHasta) {
            bloquearClicBarraHasta = 0;
            evento.preventDefault();
            evento.stopImmediatePropagation();
        }
    }, true);
    porId('gym-continuar-resumen').addEventListener('click',()=>porId('gym-continuar').click());
    porId('registrar-gimnasio').addEventListener('click', () => abrirActividad(new Date(), 'abrir-gimnasio', 'resumen'));
    porId('registrar-productividad').addEventListener('click', () => abrirEstudio('libre', 'resumen'));
    porId('pomodoro-resumen').addEventListener('click', () => abrirEstudio('pomodoro', 'resumen'));
    porId('rutinas-resumen').addEventListener('click', () => {
        fechaSeleccionada = new Date();
        volverAlGimnasio = false;
        rutinasDesdeResumen = true;
        mostrarRutinas();
        mostrarSolo(porId('pantalla-rutinas'));
        texto('volver-de-rutinas', '‹ Volver a Gimnasio');
    });
    porId('abrir-productividad').addEventListener('click', () => {
        if (!abriendoActividad) origenEstudio = 'dia';
        actualizarBotonesVolver();
    });
    porId('abrir-gimnasio').addEventListener('click', () => {
        if (!abriendoActividad) origenEntrenamiento = 'dia';
        actualizarBotonesVolver();
    });
    porId('volver-al-dia').addEventListener('click', () => {
        if (origenEstudio === 'resumen') abrirResumen('prod');
        else if (origenEstudio === 'pomodoro') irAlCalendario();
    });
    porId('volver-del-gimnasio').addEventListener('click', () => {
        if (origenEntrenamiento === 'resumen') abrirResumen('gym');
    });
    ['modo-libre', 'modo-pomodoro'].forEach(id => porId(id).addEventListener('click', actualizarBarra));

    function abrirAgenda(origen, fecha = '') {
        origenAgenda = origen;
        porId('filtro-fecha-tarea').value = fecha;
        if (!idEdicionTarea) porId('fecha-tarea').value = fecha || claveFecha(new Date());
        texto('volver-agenda', origen === 'dia' ? '‹ Volver al día' : origen === 'productividad' ? '‹ Volver a Productividad' : origen === 'resumen' ? '‹ Volver a Agenda' : '‹ Volver al inicio');
        mostrarSolo(porId('pantalla-agenda'));
        actualizarAgenda();
    }

    porId('abrir-agenda').addEventListener('click', () => abrirResumen('agenda'));
    porId('nueva-tarea-resumen').addEventListener('click', () => {
        cancelarEdicionTarea();
        estadoTareas = 'pendientes';
        abrirAgenda('resumen');
        porId('titulo-tarea').focus();
    });
    porId('todas-tareas-resumen').addEventListener('click', () => {
        estadoTareas = 'todas'; abrirAgenda('resumen');
    });
    porId('agenda-productividad').addEventListener('click', () => abrirAgenda('productividad'));
    porId('tarea-del-dia').addEventListener('click', () => {
        cancelarEdicionTarea();
        estadoTareas = 'pendientes';
        abrirAgenda('dia', claveFecha(fechaSeleccionada));
        porId('titulo-tarea').focus();
    });
    porId('volver-agenda').addEventListener('click', () => {
        if (origenAgenda === 'productividad') abrirResumen('prod');
        else if (origenAgenda === 'resumen') abrirResumen('agenda');
        else if (origenAgenda === 'dia') mostrarSolo(porId('pantalla-dia'));
        else irAlCalendario();
    });

    function cancelarEdicionTarea() {
        idEdicionTarea = null;
        porId('titulo-tarea').value = '';
        porId('notas-tarea').value = '';
        texto('titulo-formulario-tarea', 'Añadir a tu agenda');
        texto('guardar-tarea', 'Añadir');
        porId('cancelar-edicion-tarea').hidden = true;
    }
    porId('cancelar-edicion-tarea').addEventListener('click', cancelarEdicionTarea);

    function ejecutarAgenda(accion, mensaje) {
        try {
            accion();
            ['mensaje-agenda', 'mensaje-tareas-inicio', 'mensaje-tareas-dia', 'mensaje-tareas-resumen'].forEach(id => texto(id, mensaje));
            actualizarAgenda();
            mostrarCarrusel();
            return true;
        } catch (error) {
            ['mensaje-agenda', 'mensaje-tareas-inicio', 'mensaje-tareas-dia', 'mensaje-tareas-resumen'].forEach(id => texto(id, error.message));
            return false;
        }
    }

    porId('formulario-tarea').addEventListener('submit', evento => {
        evento.preventDefault();
        const datos = {titulo: porId('titulo-tarea').value, tipo: porId('tipo-tarea').value,
            fecha: porId('fecha-tarea').value, notas: porId('notas-tarea').value};
        let idGuardado = idEdicionTarea;
        if (ejecutarAgenda(() => idEdicionTarea ? agendaMiDia.editar(idEdicionTarea, datos) : idGuardado = agendaMiDia.crear(datos), idEdicionTarea ? 'Cambios guardados.' : 'Añadido a tu agenda.')) {
            const guardada = agendaMiDia.listar().find(tarea => tarea.id === idGuardado);
            estadoTareas = guardada.terminada ? 'terminadas' : 'pendientes';
            if (porId('filtro-fecha-tarea').value && porId('filtro-fecha-tarea').value !== guardada.fecha) porId('filtro-fecha-tarea').value = '';
            cancelarEdicionTarea();
            actualizarAgenda();
            porId('titulo-tarea').focus();
        } else {
            if (!datos.titulo.trim()) porId('titulo-tarea').focus();
            else if (!TareasMiDia.fechaValida(datos.fecha)) porId('fecha-tarea').focus();
        }
    });
    ['pendientes', 'terminadas', 'todas'].forEach(estado => porId('tareas-' + estado).addEventListener('click', () => {
        estadoTareas = estado;
        actualizarAgenda();
    }));
    porId('filtro-fecha-tarea').addEventListener('change', actualizarAgenda);
    porId('todas-fechas-tareas').addEventListener('click', () => {
        porId('filtro-fecha-tarea').value = ''; actualizarAgenda();
    });

    function editarTarea(tarea) {
        const origen = !porId('pantalla-dia').hidden ? 'dia' : !porId('pantalla-resumen-agenda').hidden ? 'resumen' : !porId('pantalla-agenda').hidden ? origenAgenda : 'inicio';
        abrirAgenda(origen);
        idEdicionTarea = tarea.id;
        porId('titulo-tarea').value = tarea.titulo;
        porId('tipo-tarea').value = tarea.tipo;
        porId('fecha-tarea').value = tarea.fecha;
        porId('notas-tarea').value = tarea.notas;
        texto('titulo-formulario-tarea', 'Editar en tu agenda');
        texto('guardar-tarea', 'Guardar cambios');
        porId('cancelar-edicion-tarea').hidden = false;
        porId('titulo-tarea').focus();
    }

    function pintarTareas(idLista, tareas, completa = false) {
        const hoy = claveFecha(new Date());
        const firma = JSON.stringify([tareas, hoy]);
        if (firmasTareas[idLista] === firma) return;
        firmasTareas[idLista] = firma;
        const lista = porId(idLista);
        lista.replaceChildren();
        tareas.forEach(tarea => {
            const fila = document.createElement('li');
            fila.className = 'fila-tarea';
            fila.dataset.terminada = String(tarea.terminada);
            const check = document.createElement('input');
            check.type = 'checkbox'; check.checked = tarea.terminada;
            check.setAttribute('aria-label', (tarea.terminada ? 'Marcar como pendiente: ' : 'Marcar como terminada: ') + tarea.titulo);
            check.addEventListener('change', () => {
                if (ejecutarAgenda(() => agendaMiDia.terminar(tarea.id, check.checked), check.checked ? 'Marcado como terminado.' : 'Marcado como pendiente.')) {
                    const siguiente = lista.querySelector('input');
                    (siguiente || porId(idLista === 'lista-tareas' ? 'tareas-' + estadoTareas : idLista === 'agenda-periodo-tareas' ? 'nueva-tarea-resumen' : idLista === 'tareas-dia' ? 'tarea-del-dia' : 'abrir-agenda')).focus();
                } else check.checked = tarea.terminada;
            });
            const contenido = document.createElement('div');
            const titulo = document.createElement('strong'); titulo.className = 'titulo-tarea'; titulo.textContent = tarea.titulo;
            const meta = document.createElement('p'); meta.className = 'meta-tarea';
            const tipo = {tarea: 'Tarea', examen: 'Examen', recordatorio: 'Recordatorio'}[tarea.tipo];
            meta.textContent = tipo + ' · ' + fechaLocal(tarea.fecha).toLocaleDateString('es-ES', {day: 'numeric', month: 'short', year: 'numeric'}) +
                (tarea.terminada ? ' · Terminada' : tarea.fecha < hoy ? ' · Fecha pasada' : tarea.fecha === hoy ? ' · Hoy' : '');
            meta.dataset.vencida = String(!tarea.terminada && tarea.fecha < hoy);
            contenido.append(titulo, meta);
            if (tarea.notas) {
                const notas = document.createElement('p'); notas.className = 'notas-tarea'; notas.textContent = tarea.notas; contenido.append(notas);
            }
            const acciones = document.createElement('div'); acciones.className = 'acciones-tarea';
            const editar = document.createElement('button'); editar.textContent = 'Editar';
            editar.setAttribute('aria-label', 'Editar: ' + tarea.titulo);
            editar.addEventListener('click', () => editarTarea(tarea)); acciones.append(editar);
            if (completa) {
                const borrar = document.createElement('button'); borrar.textContent = 'Eliminar'; borrar.className = 'accion-borrar';
                borrar.setAttribute('aria-label', 'Eliminar: ' + tarea.titulo);
                borrar.addEventListener('click', () => {
                    if (confirm('¿Eliminar «' + tarea.titulo + '» de tu agenda?')) {
                        if (ejecutarAgenda(() => agendaMiDia.borrar(tarea.id), 'Eliminado de tu agenda.') && idEdicionTarea === tarea.id) cancelarEdicionTarea();
                    }
                });
                acciones.append(borrar);
            }
            const marcar = document.createElement('label'); marcar.className = 'marcar-tarea'; marcar.append(check);
            contenido.append(acciones); fila.append(marcar, contenido); lista.append(fila);
        });
        if (!tareas.length) {
            const vacio = document.createElement('li'); vacio.className = 'vacio-resumen';
            vacio.textContent = idLista === 'proximas-tareas' ? 'Nada pendiente por ahora. Puedes estudiar, entrenar o planear tu próxima tarea.' : idLista === 'tareas-dia' ? 'Nada apuntado para este día.' : idLista === 'agenda-periodo-tareas' ? 'Este periodo está libre. Añade una tarea o un examen cuando lo necesites.' : 'No hay elementos con estos filtros.';
            lista.append(vacio);
        }
    }

    function actualizarAgenda() {
        if (agendaMiDia.errorLectura) ['mensaje-agenda', 'mensaje-tareas-inicio', 'mensaje-tareas-dia', 'mensaje-tareas-resumen'].forEach(id => texto(id, agendaMiDia.errorLectura));
        porId('guardar-tarea').disabled = !!agendaMiDia.errorLectura;
        const pendientes = agendaMiDia.listar({estado: 'pendientes'});
        const hoy = claveFecha(new Date());
        const pasadas = pendientes.filter(tarea => tarea.fecha < hoy).length;
        const deHoy = pendientes.filter(tarea => tarea.fecha === hoy).length;
        texto('agenda-hoy', deHoy ? deHoy+(deHoy===1?' pendiente':' pendientes') : 'Sin pendientes');
        texto('resumen-agenda-inicio', deHoy + ' para hoy' + (pasadas ? ' · ' + pasadas + ' con fecha pasada' : '') + ' · ' + pendientes.length + ' pendientes en total');
        const prioridad = tarea => tarea.fecha === hoy ? 0 : tarea.fecha < hoy ? 1 : 2;
        pintarTareas('proximas-tareas', pendientes.slice().sort((a, b) => prioridad(a) - prioridad(b) || a.fecha.localeCompare(b.fecha)).slice(0, 3));
        if (fechaSeleccionada) pintarTareas('tareas-dia', agendaMiDia.listar({fecha: claveFecha(fechaSeleccionada)}));
        ['pendientes', 'terminadas', 'todas'].forEach(estado => porId('tareas-' + estado).setAttribute('aria-pressed', String(estado === estadoTareas)));
        const tareas = agendaMiDia.listar({fecha: porId('filtro-fecha-tarea').value, estado: estadoTareas});
        texto('contador-tareas', tareas.length + (tareas.length === 1 ? ' elemento' : ' elementos'));
        pintarTareas('lista-tareas', tareas, true);
        if (!porId('pantalla-resumen-agenda').hidden) pintarResumen('agenda');
    }

    porId('fecha-tarea').value = claveFecha(new Date());

    function fechaLocal(clave) {
        const [anio, mes, dia] = clave.split('-').map(Number);
        return new Date(anio, mes - 1, dia, 12);
    }

    function pintarResumen(prefijo) {
        if(prefijo === 'gym') {
            const firmaRutinas=JSON.stringify([datosGimnasio.rutinas,datosGimnasio.ejerciciosPorRutina,datosGimnasio.activo?.id]);
            if(ultimoDibujo.rutinas!==firmaRutinas){RutinasGimnasio.tarjetas(porId('gym-rutinas-resumen'));ultimoDibujo.rutinas=firmaRutinas;}
            porId('gym-continuar-resumen').hidden=!datosGimnasio.activo;
        }
        const seleccion = periodos[prefijo];
        const rango = ResumenesMiDia.periodo(seleccion.tipo, seleccion.referencia);
        const esEstudio = prefijo === 'prod';
        const esAgenda = prefijo === 'agenda';
        const datos = esAgenda ? ResumenesMiDia.agenda(agendaMiDia.listar(), rango) : esEstudio ? ResumenesMiDia.estudio(sesiones, rango) : ResumenesMiDia.gimnasio(datosGimnasio.entrenamientos, rango);
        const actual = ResumenesMiDia.periodo(seleccion.tipo, new Date());
        const firma = JSON.stringify([seleccion.tipo, rango.inicio, datos, actual.inicio]);
        if (ultimoDibujo[prefijo] === firma) return;
        ultimoDibujo[prefijo] = firma;
        const fecha = fechaLocal(rango.inicio);
        const fin = fechaLocal(rango.fin);
        fin.setDate(fin.getDate() - 1);
        const etiqueta = seleccion.tipo === 'mes' ? fecha.toLocaleDateString('es-ES', {month: 'long', year: 'numeric'})
            : fecha.toLocaleDateString('es-ES', {day: 'numeric', month: 'short', year: 'numeric'}) + ' – ' + fin.toLocaleDateString('es-ES', {day: 'numeric', month: 'short', year: 'numeric'});
        texto(prefijo + '-periodo', etiqueta);
        porId(prefijo + '-siguiente').disabled = !esAgenda && rango.inicio >= actual.inicio;
        porId(prefijo + '-actual').hidden = rango.inicio === actual.inicio;
        ['semana', 'mes'].forEach(tipo => porId(prefijo + '-' + tipo).setAttribute('aria-pressed', String(seleccion.tipo === tipo)));
        const metricas = porId(prefijo + '-metricas');
        metricas.replaceChildren();
        const valores = esAgenda ? [[datos.total, 'En tu agenda'], [datos.pendientes, 'Pendientes'], [datos.terminadas, 'Terminadas']] : esEstudio ? [[datos.total ? tiempoLegible(datos.total) : '0 min', 'Estudio registrado'], [datos.diasActivos, 'Días de estudio'], [datos.registros, 'Registros']]
            : [[datos.diasActivos, 'Días entrenados'], [datos.series, 'Series completas'], [datos.ejercicios, 'Ejercicios distintos']];
        valores.forEach(([valor, etiqueta]) => {
            const tarjeta = document.createElement('div');
            const numero = document.createElement('strong'); numero.textContent = String(valor);
            const label = document.createElement('span'); label.textContent = etiqueta;
            tarjeta.append(numero, label); metricas.append(tarjeta);
        });
        if (esEstudio) texto('prod-modos', 'Cronómetro: ' + (datos.libre ? tiempoLegible(datos.libre) : '0 min') + ' · Pomodoro: ' + (datos.pomodoro ? tiempoLegible(datos.pomodoro) : '0 min') + ' · ' + datos.bloques + ' bloques completos');
        const calendario = porId(prefijo + '-calendario');
        calendario.replaceChildren();
        if (seleccion.tipo === 'mes') {
            for (let i = 0; i < rango.desplazamiento; i++) {
                const hueco = document.createElement('span'); hueco.setAttribute('aria-hidden', 'true'); calendario.append(hueco);
            }
        }
        const maximo = Math.max(1, ...datos.dias.map(dia => dia.valor));
        datos.dias.forEach(dia => {
            const boton = document.createElement('button');
            const descripcion = !dia.valor ? 'Sin registros' : esAgenda ? dia.pendientes + ' pendientes y ' + dia.terminadas + ' terminadas' : esEstudio ? tiempoLegible(dia.valor) : dia.valor + (dia.valor === 1 ? ' serie' : ' series');
            boton.dataset.intensidad = dia.valor === 0 ? '0' : String(Math.ceil(dia.valor / maximo * 3));
            boton.dataset.hoy = String(dia.fecha === claveFecha(new Date()));
            if (esAgenda) boton.dataset.completas = String(dia.valor > 0 && dia.pendientes === 0);
            const numero = document.createElement('span'); numero.textContent = String(dia.numero);
            const cantidad = document.createElement('small');
            cantidad.textContent = !dia.valor ? '—' : esAgenda ? dia.valor + (dia.pendientes === 0 ? ' ✓' : ' ·') : esEstudio ? (dia.valor < 60000 ? '<1m' : dia.valor < 3600000 ? Math.floor(dia.valor / 60000) + 'm' : (dia.valor / 3600000).toLocaleString('es-ES', {maximumFractionDigits: 1}) + 'h') : dia.valor + ' ser.';
            boton.append(numero, cantidad);
            boton.setAttribute('aria-label', fechaLocal(dia.fecha).toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) + '. ' + descripcion + '. Abrir día.');
            boton.title = descripcion;
            boton.addEventListener('click', () => {
                if (esAgenda) {estadoTareas = 'todas'; abrirAgenda('resumen', dia.fecha);}
                else abrirActividad(fechaLocal(dia.fecha), esEstudio ? 'abrir-productividad' : 'abrir-gimnasio', 'resumen');
            });
            calendario.append(boton);
        });
        if (esAgenda) {
            texto('agenda-examenes', datos.examenes + (datos.examenes === 1 ? ' examen' : ' exámenes') + ' en este periodo · Las tareas se agrupan por su fecha, no por cuándo se completaron.');
            pintarTareas('agenda-periodo-tareas', datos.elementos, true);
            return;
        }
        texto(prefijo + '-vacio', datos.diasActivos ? '' : esEstudio ? 'Aún no hay estudio registrado en este periodo. Puedes empezar con unos minutos.' : 'Aún no hay entrenamientos registrados en este periodo. Las series completas aparecerán aquí.');
        const lista = porId(prefijo + '-detalle');
        lista.replaceChildren();
        datos.detalle.forEach(item => {
            const fila = document.createElement('li');
            const nombre = document.createElement('span'); nombre.textContent = item.nombre;
            const valor = document.createElement('strong'); valor.textContent = esEstudio ? tiempoLegible(item.valor) : item.valor + (item.valor === 1 ? ' día' : ' días');
            fila.append(nombre, valor); lista.append(fila);
        });
        if (!datos.detalle.length) {
            const vacio = document.createElement('li'); vacio.textContent = esEstudio ? 'Tus materias aparecerán al registrar estudio.' : 'Tus rutinas aparecerán al completar series.'; lista.append(vacio);
        }
    }

    ['gym', 'prod', 'agenda'].forEach(prefijo => {
        ['semana', 'mes'].forEach(tipo => porId(prefijo + '-' + tipo).addEventListener('click', () => {
            periodos[prefijo].tipo = tipo;
            periodos[prefijo].referencia = new Date();
            pintarResumen(prefijo);
        }));
        [-1, 1].forEach(direccion => porId(prefijo + (direccion < 0 ? '-anterior' : '-siguiente')).addEventListener('click', () => {
            const seleccion = periodos[prefijo];
            const inicio = fechaLocal(ResumenesMiDia.periodo(seleccion.tipo, seleccion.referencia).inicio);
            if (seleccion.tipo === 'mes') inicio.setMonth(inicio.getMonth() + direccion);
            else inicio.setDate(inicio.getDate() + 7 * direccion);
            seleccion.referencia = inicio;
            pintarResumen(prefijo);
        }));
        porId(prefijo + '-actual').addEventListener('click', () => {
            periodos[prefijo].referencia = new Date(); pintarResumen(prefijo);
        });
    });

    function enfocarTemporizador() {
        requestAnimationFrame(() => {
            porId('estado-temporizador').focus({preventScroll: true});
            porId('panel-temporizador').scrollIntoView({
                block: 'start',
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
            });
        });
    }

    porId('inicio-app').addEventListener('click', irAlCalendario);
    porId('estudiar-hoy').addEventListener('click', () => {
        // Una sesión recuperada debe abrirse en su fecha original.
        if (sesionActiva) porId('volver-a-sesion').click();
        else abrirActividad(new Date(), 'abrir-productividad');
    });
    porId('entrenar-hoy').addEventListener('click', () => abrirActividad(new Date(), 'abrir-gimnasio'));
    porId('volver-a-sesion').addEventListener('click', () => {
        if (!sesionActiva) return;
        const [anio, mes, dia] = sesionActiva.fecha.split('-').map(Number);
        abrirActividad(new Date(anio, mes - 1, dia, 12), 'abrir-productividad');
        enfocarTemporizador();
    });
    porId('estado-temporizador').tabIndex = -1;
    porId('empezar-estudio').addEventListener('click', () => {
        if (sesionActiva) enfocarTemporizador();
    });
    porId('terminar-estudio').addEventListener('click', () => {
        if (!sesionActiva && modoEstudio.value === 'pomodoro') {
            campoMateria.focus({preventScroll: true});
            window.scrollTo({top: 0, behavior: 'instant'});
        }
    });

    porId('gestionar-rutinas-gimnasio').addEventListener('click', () => {
        volverAlGimnasio = true;
        mostrarRutinas();
        mostrarSolo(porId('pantalla-rutinas'));
        porId('volver-de-rutinas').textContent = '‹ Volver al entrenamiento';
    });
    porId('abrir-rutinas').addEventListener('click', () => {
        fechaSeleccionada = new Date();
        volverAlGimnasio = false;
        rutinasDesdeResumen = false;
        porId('volver-de-rutinas').textContent = '‹ Volver al calendario';
    });
    porId('volver-de-rutinas').addEventListener('click', () => {
        if (rutinasDesdeResumen) { abrirResumen('gym'); return; }
        if (!volverAlGimnasio) return;
        const origen = origenEntrenamiento;
        volverAlGimnasio = false;
        abrirActividad(fechaSeleccionada, 'abrir-gimnasio', origen);
    });

    // Enter facilita añadir varios ejercicios seguidos sin volver al botón.
    [['nueva-rutina', 'guardar-rutina'], ['nuevo-ejercicio', 'guardar-ejercicio']].forEach(([campo, boton]) => {
        porId(campo).addEventListener('keydown', evento => {
            if (evento.key === 'Enter' && !evento.isComposing) {
                evento.preventDefault();
                porId(boton).click();
            }
        });
    });
    porId('materia').addEventListener('keydown', evento => {
        if (evento.key === 'Enter' && !evento.isComposing) {
            evento.preventDefault();
            porId('objetivo').focus();
        }
    });

    let pantallaAnterior = pantallas.find(pantalla => !pantalla.hidden);
    const observarPantallas = new MutationObserver(() => {
        const pantalla = pantallas.find(elemento => !elemento.hidden);
        if (!pantalla || pantalla === pantallaAnterior) return;
        pantallaAnterior = pantalla;
        actualizarCronometro();
        actualizarBarra();
        actualizarResumen();
        const titulo = porId('app').dataset.foco === 'true' ? porId('estado-temporizador') : pantalla.querySelector('h1') || pantalla.querySelector('h2') || pantalla;
        titulo.tabIndex = -1;
        titulo.focus({preventScroll: true});
        window.scrollTo({top: 0, behavior: 'instant'});
    });
    pantallas.forEach(pantalla => observarPantallas.observe(pantalla, {attributes: true, attributeFilter: ['hidden']}));

    function actualizarAccesoSesion() {
        const s = sesionActiva;
        texto('estudio-accion-hoy', s ? 'Continuar ↗' : 'Estudiar ↗');
        const visible = !!s && porId('pantalla-productividad').hidden;
        if (porId('acceso-sesion').hidden === visible) porId('acceso-sesion').hidden = !visible;
        if (s) {
            texto('acceso-sesion-materia', s.materia);
            const fase = s.modo === 'libre' ? 'Cronómetro libre' : s.fase === 'estudio' ? 'Estudio' : 'Descanso';
            const estado = s.pendiente ? 'Esperando tu siguiente paso' : s.inicio === null ? 'En pausa' : formatoTiempo(s.modo === 'pomodoro' ? s.duracion - tiempoFase() : tiempoFase());
            texto('acceso-sesion-tiempo', fase + ' · ' + estado);
        }
        actualizarResumen();
        actualizarBarra();
    }
    pantallas.forEach(pantalla => {
        new MutationObserver(actualizarAccesoSesion).observe(pantalla, {attributes: true, attributeFilter: ['hidden']});
    });
    setInterval(actualizarAccesoSesion, 1000);
    document.addEventListener('visibilitychange', actualizarAccesoSesion);
    actualizarAccesoSesion();
})();
