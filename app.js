        // Esta fecha indica qué día está en el centro del carrusel.
        let fechaCentral = new Date();

        // Esta otra indica qué día hemos abierto.
        let fechaSeleccionada = null;

        // Elementos de la pantalla principal.
        const carrusel = document.getElementById("carrusel");
        const botonAnterior = document.getElementById("anterior");
        const botonSiguiente = document.getElementById("siguiente");
        const botonHoy = document.getElementById("ir-hoy");

        // Elementos del menú interior.
        const pantallaSemana = document.getElementById("pantalla-semana");
        const pantallaDia = document.getElementById("pantalla-dia");
        const tituloDia = document.getElementById("titulo-dia");
        const botonVolver = document.getElementById("volver");

        function mostrarCarrusel() {
            carrusel.replaceChildren();

            const hoy = new Date();

            // -1 es el día anterior, 0 el central y 1 el siguiente.
            for (let desplazamiento = -2; desplazamiento <= 2; desplazamiento++) {
                const fecha = new Date(fechaCentral);
                fecha.setDate(fechaCentral.getDate() + desplazamiento);

                const tarjeta = document.createElement("button");
                tarjeta.classList.add("tarjeta-dia");

                tarjeta.dataset.desplazamiento = desplazamiento;

                if (desplazamiento === -1) {
                    tarjeta.classList.add("izquierda");
                } else if (desplazamiento === 0) {
                    tarjeta.classList.add("centro");
                } else {
                    tarjeta.classList.add("derecha");
                }

                const diaSemana = document.createElement("span");
                diaSemana.classList.add("dia-semana");
                diaSemana.textContent = fecha.toLocaleDateString(
                    "es-ES",
                    { weekday: "long" }
                );

                const numero = document.createElement("strong");
                numero.classList.add("numero-dia");
                numero.textContent = fecha.getDate();

                const mes = document.createElement("span");
                mes.classList.add("mes-dia");
                mes.textContent = fecha.toLocaleDateString(
                    "es-ES",
                    { month: "long", year: "numeric" }
                );

                const etiqueta = document.createElement("span");
                etiqueta.classList.add("etiqueta-dia");

                if (fecha.toDateString() === hoy.toDateString()) {
                    etiqueta.textContent = "Hoy";
                } else {
                    etiqueta.textContent = "";
                }

                tarjeta.appendChild(diaSemana);
                tarjeta.appendChild(numero);
                tarjeta.appendChild(mes);
                tarjeta.appendChild(etiqueta);

                const resumen = document.createElement("span");
                resumen.classList.add("resumen-dia");

                const textoGimnasio = obtenerResumenGimnasio(fecha);
                const tiempoEstudiado = obtenerTiempoDelDia(fecha);
                const minutosTotales = Math.floor(tiempoEstudiado / 60000);

                if (tiempoEstudiado === 0) {
                    resumen.textContent = textoGimnasio ? "" : "Sin actividad registrada";
                } else if (minutosTotales === 0) {
                    resumen.textContent = "Estudio: menos de 1 min";
                } else {
                    resumen.textContent = "Estudio: " + minutosTotales + " min";
                }

                tarjeta.appendChild(resumen);

                const pendientes = agendaMiDia.resumen(claveFecha(fecha)).pendientes;
                if (pendientes > 0) {
                    tarjeta.dataset.conTareas = 'true';
                    const tareas = document.createElement('span');
                    tareas.classList.add('resumen-tareas');
                    tareas.textContent = pendientes + (pendientes === 1 ? ' pendiente' : ' pendientes');
                    tarjeta.appendChild(tareas);
                    const detalle = document.createElement('span');
                    detalle.classList.add('detalle-tareas-carrusel');
                    const nombres = agendaMiDia.listar({fecha: claveFecha(fecha), estado: 'pendientes'}).map(tarea => (tarea.tipo === 'examen' ? 'Examen: ' : '') + tarea.titulo);
                    detalle.textContent = nombres.slice(0, 2).join(' · ') + (nombres.length > 2 ? ' · +' + (nombres.length - 2) + ' más' : '');
                    detalle.title = nombres.join(' · ');
                    tarjeta.appendChild(detalle);
                }

                if (textoGimnasio !== "") {
                    const resumenGimnasio = document.createElement("span");
                    resumenGimnasio.classList.add("resumen-gimnasio");
                    resumenGimnasio.textContent = textoGimnasio;

                    tarjeta.appendChild(resumenGimnasio);
                }

                tarjeta.addEventListener("click", function () {
                    if (animandoCarrusel) {
                        return;
                    }

                    if (desplazamiento === 0) {
                        abrirDia(fecha);
                    } else {
                        cambiarDia(desplazamiento);
                    }
                });

                carrusel.appendChild(tarjeta);
            }

            actualizarPosiciones(0);
        }

        function cambiarDia(cantidad) {
            if (animandoCarrusel || punteroActivo !== null) {
                return;
            }

            animarHasta(cantidad);
        }

        function abrirDia(fecha) {
            fechaSeleccionada = new Date(fecha);

            tituloDia.textContent = fechaSeleccionada.toLocaleDateString(
                "es-ES",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

            pantallaSemana.hidden = true;
            pantallaDia.hidden = false;
        }

        botonAnterior.addEventListener("click", function () {
            cambiarDia(-1);
        });

        botonSiguiente.addEventListener("click", function () {
            cambiarDia(1);
        });

        botonHoy.addEventListener("click", function () {
            if (animandoCarrusel || punteroActivo !== null) {
                return;
            }

            fechaCentral = new Date();
            mostrarCarrusel();
        });

        botonVolver.addEventListener("click", function () {
            mostrarCarrusel();

            pantallaDia.hidden = true;
            pantallaSemana.hidden = false;
        });

        let inicioX = 0;
        let inicioY = 0;
        let punteroActivo = null;
        let bloquearClic = false;
        let arrastreHorizontal = false;
        let fechaInicioArrastre = null;
        let diasArrastrados = 0;
        let espacioArrastre = 1;

        let avanceCarrusel = 0;
        let animandoCarrusel = false;

        // Coloca cada tarjeta según el avance del gesto.
        function actualizarPosiciones(avance) {
            avanceCarrusel = avance;

            const tarjetas = carrusel.querySelectorAll(".tarjeta-dia");

            tarjetas.forEach(function (tarjeta) {
                const posicionOriginal =
                    Number(tarjeta.dataset.desplazamiento);

                const posicion = posicionOriginal - avance;
                const distanciaAlCentro = Math.abs(posicion);

                const protagonismo = Math.max(
                    0,
                    1 - distanciaAlCentro
                );

                const visibilidad =
                    Math.max(0, Math.min(1, 2 - distanciaAlCentro)) *
                    (0.65 + protagonismo * 0.35);

                const detalle = Math.max(
                    0,
                    (protagonismo - 0.5) * 2
                );

                tarjeta.style.setProperty("--posicion", posicion);
                tarjeta.style.setProperty("--protagonismo", protagonismo);
                tarjeta.style.setProperty("--visibilidad", visibilidad);
                tarjeta.style.setProperty("--detalle", detalle);

                tarjeta.style.setProperty(
                    "--capa",
                    Math.round(100 - distanciaAlCentro * 20)
                );

                tarjeta.style.pointerEvents =
                    visibilidad === 0 ? "none" : "auto";
            });
        }

        // Completa el movimiento al soltar o pulsar una flecha.
        function animarHasta(destino) {
            if (animandoCarrusel) {
                return;
            }

            animandoCarrusel = true;

            const desde = avanceCarrusel;
            const inicio = performance.now();

            const reducirMovimiento = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            const duracion = reducirMovimiento ? 0 : 220;

            function paso(ahora) {
                const progreso = duracion === 0
                    ? 1
                    : Math.min((ahora - inicio) / duracion, 1);

                // Hace que la animación frene suavemente al terminar.
                const suavizado = 1 - Math.pow(1 - progreso, 3);

                actualizarPosiciones(
                    desde + (destino - desde) * suavizado
                );

                if (progreso < 1) {
                    requestAnimationFrame(paso);
                } else {
                    if (destino !== 0) {
                        fechaCentral.setDate(
                            fechaCentral.getDate() + destino
                        );

                        mostrarCarrusel();
                    }

                    animandoCarrusel = false;
                }
            }

            requestAnimationFrame(paso);
        }

        carrusel.addEventListener("pointerdown", function (evento) {
            if (
                !evento.isPrimary ||
                evento.button !== 0 ||
                punteroActivo !== null ||
                animandoCarrusel
            ) {
                return;
            }

            inicioX = evento.clientX;
            inicioY = evento.clientY;
            punteroActivo = evento.pointerId;
            fechaInicioArrastre = new Date(fechaCentral);
            diasArrastrados = 0;
            espacioArrastre = Math.max(1, carrusel.clientWidth * 0.32);

            bloquearClic = false;
            arrastreHorizontal = false;

            carrusel.classList.add("arrastrando");
        });

        function moverCarruselArrastrado(clientX) {
            const avanceTotal = -(clientX - inicioX) / espacioArrastre;
            const dias = Math.trunc(avanceTotal);
            // Renueva las tarjetas al cruzar cada día, conservando la fracción
            // del movimiento: el carrusel no se agota en las cinco visibles.
            if (dias !== diasArrastrados) {
                diasArrastrados = dias;
                fechaCentral = new Date(fechaInicioArrastre);
                fechaCentral.setDate(fechaCentral.getDate() + dias);
                mostrarCarrusel();
            }
            actualizarPosiciones(avanceTotal - dias);
        }

        window.addEventListener("pointermove", function (evento) {
            if (evento.pointerId !== punteroActivo) {
                return;
            }

            const distanciaX = evento.clientX - inicioX;
            const distanciaY = evento.clientY - inicioY;

            if (
                !arrastreHorizontal &&
                Math.abs(distanciaX) > 6 &&
                Math.abs(distanciaX) > Math.abs(distanciaY)
            ) {
                arrastreHorizontal = true;
            }

            if (arrastreHorizontal) {
                bloquearClic = true;
                // Captura en el contenedor estable antes de renovar tarjetas.
                if (!carrusel.hasPointerCapture?.(evento.pointerId)) carrusel.setPointerCapture?.(evento.pointerId);
                moverCarruselArrastrado(evento.clientX);
            }
        });

        window.addEventListener("pointerup", function (evento) {
            if (evento.pointerId !== punteroActivo) {
                return;
            }

            const distanciaX = evento.clientX - inicioX;
            const distanciaY = evento.clientY - inicioY;

            bloquearClic =
                bloquearClic ||
                Math.abs(distanciaX) > 10 ||
                Math.abs(distanciaY) > 10;

            let destino = 0;

            if (arrastreHorizontal) moverCarruselArrastrado(evento.clientX);

            if (
                arrastreHorizontal &&
                Math.abs(avanceCarrusel) >= 0.25
            ) {
                destino = avanceCarrusel > 0 ? 1 : -1;
            }

            punteroActivo = null;
            arrastreHorizontal = false;
            carrusel.classList.remove("arrastrando");

            if (avanceCarrusel !== 0) {
                animarHasta(destino);
            }
        });

        function cancelarArrastre() {
            if (punteroActivo === null) {
                return;
            }

            punteroActivo = null;
            arrastreHorizontal = false;
            bloquearClic = true;

            carrusel.classList.remove("arrastrando");
            animarHasta(0);
        }

        window.addEventListener("pointercancel", function (evento) {
            if (evento.pointerId === punteroActivo) {
                cancelarArrastre();
            }
        });

        window.addEventListener("blur", cancelarArrastre);

        carrusel.addEventListener("click", function (evento) {
            if (bloquearClic && evento.detail > 0) {
                evento.preventDefault();
                evento.stopPropagation();
                bloquearClic = false;
            }
        }, true);

        const pantallaProductividad =
            document.getElementById("pantalla-productividad");

        const botonProductividad =
            document.getElementById("abrir-productividad");

        const botonVolverAlDia =
            document.getElementById("volver-al-dia");

        const fechaProductividad =
            document.getElementById("fecha-productividad");

        botonProductividad.addEventListener("click", function () {
            fechaProductividad.textContent =
                fechaSeleccionada.toLocaleDateString(
                    "es-ES",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );

            pantallaDia.hidden = true;
            pantallaProductividad.hidden = false;
            mostrarSesiones();
        });

        botonVolverAlDia.addEventListener("click", function () {
            pantallaProductividad.hidden = true;
            pantallaDia.hidden = false;
        });

        // Un solo documento guarda historial y temporizador de forma atómica.
        const $estudio = id => document.getElementById(id);
        const almacenamientoApp = typeof DatosMiDia !== 'undefined' ? DatosMiDia.almacenamiento : localStorage;
        const campoMateria = $estudio('materia');
        const campoObjetivo = $estudio('objetivo');
        const modoEstudio = $estudio('modo-estudio');
        const botonEmpezar = $estudio('empezar-estudio');
        const botonPausar = $estudio('pausar-estudio');
        const botonTerminar = $estudio('terminar-estudio');
        const camposTiempo = ['min-estudio', 'min-corto', 'min-largo'].map($estudio);
        const claveProductividad = 'miDiaProductividadV1';
        let sesiones = [];
        let sesionActiva = null;
        let configuracion = [25, 5, 15];
        let almacenamientoDisponible = true;
        try {
            const guardado = almacenamientoApp.getItem(claveProductividad);
            if (guardado !== null) {
                const datos = JSON.parse(guardado);
                if (datos.version !== 1 || !Array.isArray(datos.sesiones)) throw new Error('Formato desconocido');
                const tiemposValidos = tiempos => Array.isArray(tiempos) && tiempos.length === 3 && tiempos.every(n => Number.isInteger(n) && n >= 1 && n <= 180);
                if (!tiemposValidos(datos.configuracion)) throw new Error('Configuración no válida');
                const activa = datos.activa;
                if (activa !== null && (!activa || !['libre', 'pomodoro'].includes(activa.modo) ||
                    !['estudio', 'corto', 'largo'].includes(activa.fase) || !tiemposValidos(activa.tiempos) ||
                    !Number.isFinite(activa.acumulado) || activa.acumulado < 0 ||
                    !Number.isFinite(activa.duracion) || activa.duracion <= 0 ||
                    !(activa.inicio === null || Number.isFinite(activa.inicio)) ||
                    !Number.isInteger(activa.bloque) || activa.bloque < 1 ||
                    !Number.isInteger(activa.completos) || activa.completos < 0 ||
                    typeof activa.pendiente !== 'boolean' || typeof activa.id !== 'string' ||
                    typeof activa.fecha !== 'string' || typeof activa.materia !== 'string')) throw new Error('Sesión activa no válida');
                sesiones = datos.sesiones;
                sesionActiva = datos.activa;
                configuracion = datos.configuracion;
            } else {
                const anteriores = JSON.parse(almacenamientoApp.getItem('miDiaSesiones') || '[]');
                if (!Array.isArray(anteriores)) throw new Error('Historial no válido');
                sesiones = anteriores;
            }
        } catch (error) {
            almacenamientoDisponible = false;
            $estudio('aviso-estudio').textContent = 'No se pudieron leer los datos. No se sobrescribirán. Revisa el almacenamiento del navegador antes de comenzar.';
            console.error(error);
        }
        camposTiempo.forEach((campo, i) => campo.value = configuracion[i]);
        if (sesionActiva) {
            modoEstudio.value = sesionActiva.modo;
            campoMateria.value = sesionActiva.materia;
            campoObjetivo.value = sesionActiva.objetivo;
        }
        function claveFecha(fecha) {
            return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
        }
        function guardarSesiones() {
            if (!almacenamientoDisponible) return false;
            try {
                almacenamientoApp.setItem(claveProductividad, JSON.stringify({version: 1, sesiones, activa: sesionActiva, configuracion}));
                return true;
            } catch (error) {
                $estudio('aviso-estudio').textContent = 'No se pudo guardar. Mantén esta página abierta y libera espacio o permite el almacenamiento. Vuelve a pulsar el control para reintentar.';
                console.error(error);
                return false;
            }
        }
        // Si una escritura falla, el estado anterior sigue disponible para reintentar.
        function cambiarEstudio(cambio) {
            const anterior = JSON.stringify({sesiones, sesionActiva, configuracion});
            cambio();
            if (!guardarSesiones()) {
                const datos = JSON.parse(anterior);
                sesiones = datos.sesiones;
                sesionActiva = datos.sesionActiva;
                configuracion = datos.configuracion;
                return false;
            }
            if (fechaSeleccionada) mostrarSesiones();
            return true;
        }
        function tiempoFase(ahora = Date.now()) {
            const s = sesionActiva;
            if (!s) return 0;
            const tiempo = s.acumulado + (s.inicio === null ? 0 : Math.max(0, ahora - s.inicio));
            return s.modo === 'pomodoro' ? Math.min(s.duracion, tiempo) : tiempo;
        }
        function registrarTramo(duracion, completo) {
            const s = sesionActiva;
            if (duracion <= 0 || (s.modo === 'pomodoro' && s.fase !== 'estudio')) return;
            const id = s.id + ':' + s.bloque;
            if (sesiones.some(sesion => sesion.id === id)) return;
            sesiones.push({id, fecha: s.fecha, materia: s.materia, objetivo: s.objetivo,
                duracion, modo: s.modo, bloque: s.bloque, completo});
        }
        function comprobarVencimiento() {
            const s = sesionActiva;
            if (!s || s.modo !== 'pomodoro' || s.pendiente || tiempoFase() < s.duracion) return;
            if (cambiarEstudio(() => {
                registrarTramo(s.duracion, true);
                if (s.fase === 'estudio') s.completos++;
                s.acumulado = s.duracion;
                s.inicio = null;
                s.pendiente = true;
            })) {
                $estudio('aviso-estudio').textContent = s.fase === 'estudio'
                    ? 'Bloque completo y registrado. Puedes comenzar tu descanso.'
                    : 'Descanso terminado. Comienza el siguiente bloque cuando estés listo.';
            }
        }
        function formatoTiempo(ms) {
            const t = Math.ceil(ms / 1000);
            return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map(n => String(n).padStart(2, '0')).join(':');
        }
        function descansoLargo(s) { return s.completos > 0 && s.completos % 4 === 0; }
        function crearIdSesion() {
            // randomUUID no está disponible en HTTP desde la red local del móvil.
            if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
            return 'sesion-' + Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');
        }
        let pomodoroMinimizado = false;
        let idVistaPomodoro = null;
        function actualizarVistaPomodoro() {
            const s = sesionActiva;
            const activo = !!s && s.modo === 'pomodoro';
            if (activo && idVistaPomodoro !== s.id) {
                idVistaPomodoro = s.id;
                pomodoroMinimizado = false;
            }
            const foco = activo && !$estudio('pantalla-productividad').hidden && !pomodoroMinimizado;
            $estudio('app').dataset.foco = String(foco);
            const restante = activo ? Math.max(0, 1 - tiempoFase() / s.duracion) : 0;
            $estudio('nivel-pomodoro').style.setProperty('--nivel', String(restante));
            $estudio('nivel-pomodoro').style.setProperty('--tono', String(activo && s.fase !== 'estudio' ? 150 + 40 * restante : 25 + 240 * restante));
            $estudio('panel-temporizador').dataset.tiempoLargo = String(activo && s.duracion >= 3600000);
            const alternar = $estudio('alternar-foco-pomodoro');
            alternar.hidden = !activo;
            alternar.textContent = foco ? '↙' : 'Volver a concentración ↗';
            alternar.setAttribute('aria-label', foco ? 'Minimizar la vista sin pausar el Pomodoro' : 'Abrir la vista de concentración');
            alternar.setAttribute('aria-pressed', String(foco));
            return foco;
        }
        $estudio('alternar-foco-pomodoro').addEventListener('click', () => {
            pomodoroMinimizado = !pomodoroMinimizado;
            actualizarCronometro();
            $estudio('estado-temporizador').focus();
        });
        function actualizarCronometro() {
            comprobarVencimiento();
            const s = sesionActiva;
            const pomodoro = modoEstudio.value === 'pomodoro';
            $estudio('config-pomodoro').hidden = !pomodoro;
            [campoMateria, campoObjetivo, modoEstudio, ...camposTiempo].forEach(campo => campo.disabled = !!s);
            ['libre', 'pomodoro'].forEach(modo => {
                const boton = $estudio('modo-' + modo);
                boton.disabled = !!s;
                boton.setAttribute('aria-pressed', String(modoEstudio.value === modo));
            });
            const etiqueta = !s ? (pomodoro ? 'Pomodoro' : 'Cronómetro libre')
                : s.modo === 'libre' ? 'Cronómetro libre'
                : s.fase === 'estudio' ? 'Estudio · Bloque ' + s.bloque
                : (s.fase === 'largo' ? 'Descanso largo' : 'Descanso corto');
            const estadoVisible = etiqueta + ' · ' + (!s ? 'Listo' : s.pendiente ? 'Finalizado · Esperando tu siguiente paso' : s.inicio === null ? 'En pausa' : 'En curso');
            if ($estudio('estado-temporizador').textContent !== estadoVisible) $estudio('estado-temporizador').textContent = estadoVisible;
            $estudio('panel-temporizador').dataset.fase = !s ? 'libre' : s.inicio === null && !s.pendiente ? 'pausa' : s.fase;
            const foco = actualizarVistaPomodoro();
            const tiempoVisible = formatoTiempo(!s ? (pomodoro ? Number(camposTiempo[0].value || 25) * 60000 : 0) : s.modo === 'pomodoro' ? s.duracion - tiempoFase() : tiempoFase());
            $estudio('cronometro').textContent = foco ? tiempoVisible.replace(/^00:/, '') : tiempoVisible;
            $estudio('sesion-activa').textContent = s ? s.materia + ' · Día de la sesión: ' + s.fecha : '';
            $estudio('progreso-pomodoro').textContent = s && pomodoro ? s.completos + ' bloques completos · Solo se registra el estudio' : '';
            botonEmpezar.disabled = !almacenamientoDisponible || !!(s && s.inicio !== null);
            botonEmpezar.textContent = !s ? 'Empezar a estudiar' : !s.pendiente ? 'Reanudar' : s.fase === 'estudio' ? 'Comenzar descanso ' + (descansoLargo(s) ? 'largo' : 'corto') : 'Comenzar bloque ' + (s.bloque + 1);
            botonPausar.disabled = !s || s.inicio === null;
            botonTerminar.disabled = !s;
            botonEmpezar.hidden = !!(s && s.inicio !== null);
            botonPausar.hidden = !s || s.inicio === null;
            botonTerminar.hidden = !s;
            const avance = $estudio('avance-pomodoro');
            avance.hidden = !s || !pomodoro;
            avance.value = s && pomodoro ? tiempoFase() / s.duracion : 0;
        }
        botonEmpezar.addEventListener('click', () => {
            comprobarVencimiento();
            if (sesionActiva && sesionActiva.inicio !== null) return;
            if (!sesionActiva) {
                if (!campoMateria.value.trim()) {
                    $estudio('aviso-estudio').textContent = 'Escribe la materia antes de empezar.';
                    campoMateria.focus(); return;
                }
                if (modoEstudio.value === 'pomodoro' && camposTiempo.some(c => !c.checkValidity() || !c.value)) {
                    $estudio('aviso-estudio').textContent = 'Utiliza minutos enteros entre 1 y 180 para cada fase.';
                    camposTiempo.find(c => !c.checkValidity() || !c.value).reportValidity(); return;
                }
            }
            if (cambiarEstudio(() => {
                if (!sesionActiva) {
                    if (modoEstudio.value === 'pomodoro') configuracion = camposTiempo.map(c => Number(c.value));
                    sesionActiva = {id: crearIdSesion(), fecha: claveFecha(fechaSeleccionada || new Date()),
                        materia: campoMateria.value.trim(), objetivo: campoObjetivo.value.trim(), modo: modoEstudio.value,
                        fase: 'estudio', bloque: 1, completos: 0, tiempos: [...configuracion],
                        duracion: configuracion[0] * 60000, acumulado: 0, inicio: null, pendiente: false};
                }
                const s = sesionActiva;
                if (s.pendiente) {
                    if (s.fase === 'estudio') s.fase = descansoLargo(s) ? 'largo' : 'corto';
                    else { s.fase = 'estudio'; s.bloque++; }
                    s.duracion = s.tiempos[s.fase === 'estudio' ? 0 : s.fase === 'corto' ? 1 : 2] * 60000;
                    s.acumulado = 0;
                    s.pendiente = false;
                }
                s.inicio = Date.now();
            })) $estudio('aviso-estudio').textContent = '';
            actualizarCronometro();
        });
        botonPausar.addEventListener('click', () => {
            comprobarVencimiento();
            if (sesionActiva && sesionActiva.inicio !== null) cambiarEstudio(() => {
                sesionActiva.acumulado = tiempoFase(); sesionActiva.inicio = null;
            });
            actualizarCronometro();
        });
        botonTerminar.addEventListener('click', () => {
            comprobarVencimiento();
            if (!sesionActiva) return;
            if (cambiarEstudio(() => {
                if (!sesionActiva.pendiente) registrarTramo(tiempoFase(), false);
                sesionActiva = null;
            })) $estudio('aviso-estudio').textContent = 'Sesión finalizada. El tiempo de estudio está guardado en su día de inicio.';
            actualizarCronometro();
        });
        modoEstudio.addEventListener('change', actualizarCronometro);
        ['libre', 'pomodoro'].forEach(modo => {
            $estudio('modo-' + modo).addEventListener('click', () => {
                if (sesionActiva) return;
                modoEstudio.value = modo;
                actualizarCronometro();
            });
        });
        camposTiempo.forEach(c => c.addEventListener('input', actualizarCronometro));
        function mostrarSesiones() {
            if (!fechaSeleccionada) return;
            const lista = $estudio('lista-sesiones');
            lista.replaceChildren();
            const materias = $estudio('materias-recientes');
            materias.replaceChildren();
            [...new Set(sesiones.slice().reverse().map(s => s.materia).filter(Boolean))].slice(0, 12).forEach(materia => {
                const opcion = document.createElement('option');
                opcion.value = materia;
                materias.append(opcion);
            });
            sesiones.map((sesion, indice) => ({sesion, indice})).reverse().forEach(({sesion, indice}) => {
                if (sesion.fecha !== claveFecha(fechaSeleccionada)) return;
                const li = document.createElement('li');
                const texto = document.createElement('span');
                texto.textContent = sesion.materia + ' · ' + formatoTiempo(sesion.duracion) + ' · ' +
                    (sesion.modo === 'pomodoro' ? 'Pomodoro · Bloque ' + sesion.bloque + (sesion.completo ? ' completo' : ' parcial') : 'Cronómetro libre') +
                    (sesion.objetivo ? ' · ' + sesion.objetivo : '');
                const borrar = document.createElement('button');
                borrar.textContent = 'Borrar';
                borrar.setAttribute('aria-label', 'Borrar sesión de ' + sesion.materia);
                borrar.addEventListener('click', () => {
                    if (confirm('¿Quieres borrar esta sesión de ' + sesion.materia + '?')) cambiarEstudio(() => sesiones.splice(indice, 1));
                });
                const repetir = document.createElement('button');
                repetir.textContent = 'Repetir';
                repetir.disabled = !!sesionActiva;
                repetir.setAttribute('aria-label', 'Preparar otra sesión de ' + sesion.materia);
                repetir.addEventListener('click', () => {
                    if (sesionActiva) return;
                    campoMateria.value = sesion.materia;
                    campoObjetivo.value = sesion.objetivo || '';
                    modoEstudio.value = sesion.modo === 'pomodoro' ? 'pomodoro' : 'libre';
                    actualizarCronometro();
                    $estudio('aviso-estudio').textContent = 'Sesión preparada. Revisa el objetivo y pulsa Empezar cuando quieras.';
                    campoObjetivo.focus();
                });
                const acciones = document.createElement('div');
                acciones.className = 'acciones-sesion';
                borrar.className = 'accion-borrar';
                acciones.append(repetir, borrar);
                li.append(texto, acciones); lista.append(li);
            });
            if (!lista.children.length) {
                const li = document.createElement('li'); li.textContent = 'Todavía no hay sesiones registradas.'; lista.append(li);
            }
            $estudio('total-estudio').textContent = 'Total de estudio: ' + formatoTiempo(obtenerTiempoDelDia(fechaSeleccionada));
        }
        function obtenerTiempoDelDia(fecha) {
            return sesiones.filter(s => s.fecha === claveFecha(fecha)).reduce((total, s) => total + s.duracion, 0);
        }
        setInterval(actualizarCronometro, 250);
        document.addEventListener('visibilitychange', actualizarCronometro);
        window.addEventListener('pageshow', actualizarCronometro);
        actualizarCronometro();

        const pantallaGimnasio =
            document.getElementById("pantalla-gimnasio");

        const botonGimnasio =
            document.getElementById("abrir-gimnasio");

        const botonVolverDelGimnasio =
            document.getElementById("volver-del-gimnasio");

        const fechaGimnasio =
            document.getElementById("fecha-gimnasio");

        botonGimnasio.addEventListener("click", function () {
            fechaGimnasio.textContent =
                fechaSeleccionada.toLocaleDateString(
                    "es-ES",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }
                );

            pantallaDia.hidden = true;
            pantallaGimnasio.hidden = false;

            cargarRutinaDelDia();
        });

        botonVolverDelGimnasio.addEventListener("click", function () {
            pantallaGimnasio.hidden = true;
            pantallaDia.hidden = false;
        });

        const pantallaRutinas = document.getElementById("pantalla-rutinas");
        const botonAbrirRutinas = document.getElementById("abrir-rutinas");
        const botonVolverDeRutinas = document.getElementById("volver-de-rutinas");
        const campoNuevaRutina = document.getElementById("nueva-rutina");
        const botonGuardarRutina = document.getElementById("guardar-rutina");
        const listaRutinas = document.getElementById("lista-rutinas");
        const selectorRutina = document.getElementById("rutina-del-dia");
        const mensajeRutinas = document.getElementById("mensaje-rutinas");
        const mensajeRutinaDia = document.getElementById("mensaje-rutina-dia");

        // Rutinas disponibles y elección de cada día.
        let datosGimnasio = {
            rutinas: [],
            porDia: {}
        };

        // Recuperamos los datos al abrir la página.
        try {
            const guardado = almacenamientoApp.getItem("miDiaGimnasio");

            if (guardado !== null) {
                const datos = JSON.parse(guardado);

                if (
                    datos !== null &&
                    Array.isArray(datos.rutinas) &&
                    datos.rutinas.every(function (nombre) {
                        return typeof nombre === "string";
                    }) &&
                    datos.porDia !== null &&
                    typeof datos.porDia === "object" &&
                    !Array.isArray(datos.porDia)
                ) {
                    datosGimnasio = datos;
                }
            }
        } catch (error) {
            console.error("No se pudieron recuperar las rutinas:", error);
        }

        if (
            datosGimnasio.ejerciciosPorRutina === undefined ||
            datosGimnasio.ejerciciosPorRutina === null ||
            typeof datosGimnasio.ejerciciosPorRutina !== "object" ||
            Array.isArray(datosGimnasio.ejerciciosPorRutina)
        ) {
            datosGimnasio.ejerciciosPorRutina = {};
        }        

        if (
            datosGimnasio.entrenamientos === undefined ||
            datosGimnasio.entrenamientos === null ||
            typeof datosGimnasio.entrenamientos !== "object" ||
            Array.isArray(datosGimnasio.entrenamientos)
        ) {
            datosGimnasio.entrenamientos = {};
        }

        let ultimoGimnasioGuardado = almacenamientoApp.getItem('miDiaGimnasio');
        let falloGuardadoGimnasio = false;
        window.addEventListener('beforeunload', evento => {
            if (falloGuardadoGimnasio) {evento.preventDefault();evento.returnValue='';}
        });
        function guardarDatosGimnasio() {
            try {
                if (almacenamientoApp.getItem('miDiaGimnasio') !== ultimoGimnasioGuardado) {
                    throw new Error('Otra pestaña ha cambiado el gimnasio. Conserva esta página abierta y revisa la otra pestaña antes de continuar.');
                }
                const nuevo = JSON.stringify(datosGimnasio);
                almacenamientoApp.setItem('miDiaGimnasio', nuevo);
                ultimoGimnasioGuardado = nuevo;
                falloGuardadoGimnasio = false;
                document.getElementById('gym-reintentar').hidden = true;

                return true;
            } catch (error) {
                console.error("No se pudo guardar:", error);

                falloGuardadoGimnasio = true;
                document.getElementById('gym-reintentar').hidden = false;
                mensajeRutinaDia.textContent = error.message + ' Los cambios siguen en esta página; no la cierres.';
                return false;
            }
        }

        function mostrarRutinas() { RutinasGimnasio.mostrar(); cargarRutinasParaEditar(); }

        botonAbrirRutinas.addEventListener("click", function () {
            mostrarRutinas();
            mensajeRutinas.textContent = "";

            pantallaSemana.hidden = true;
            pantallaRutinas.hidden = false;
        });

        botonVolverDeRutinas.addEventListener("click", function () {
            pantallaRutinas.hidden = true;
            pantallaSemana.hidden = false;
        });

        botonGuardarRutina.addEventListener("click", function () {
            const nombre = campoNuevaRutina.value.trim();

            if (nombre === "") {
                mensajeRutinas.textContent = "Escribe un nombre para la rutina.";
                campoNuevaRutina.focus();
                return;
            }

            const existe = datosGimnasio.rutinas.some(function (rutina) {
                return rutina.toLowerCase() === nombre.toLowerCase();
            });

            if (existe) {
                mensajeRutinas.textContent = "Ya tienes una rutina con ese nombre.";
                return;
            }

            datosGimnasio.rutinas.push(nombre);

            const guardado = guardarDatosGimnasio();

            campoNuevaRutina.value = "";
            mostrarRutinas();
            selectorRutinaEditar.value = nombre;
            mostrarEjerciciosDeRutina();
            document.getElementById('rutina-catalogo').focus();

            mensajeRutinas.textContent = guardado
                ? "Rutina guardada."
                : "Rutina añadida solo en esta página.";
        });

        function cargarRutinaDelDia() { VistaGimnasio.mostrar(); }

        const selectorRutinaEditar =
            document.getElementById("rutina-a-editar");

        const campoNuevoEjercicio =
            document.getElementById("nuevo-ejercicio");

        const botonGuardarEjercicio =
            document.getElementById("guardar-ejercicio");

        const listaEjerciciosRutina =
            document.getElementById("ejercicios-rutina");

        const mensajeEjercicios =
            document.getElementById("mensaje-ejercicios");

        // Actualiza las opciones del desplegable.
        function cargarRutinasParaEditar() {
            const seleccionAnterior = selectorRutinaEditar.value;

            selectorRutinaEditar.replaceChildren();

            const opcionVacia = document.createElement("option");
            opcionVacia.value = "";
            opcionVacia.textContent = "Selecciona una rutina";
            selectorRutinaEditar.appendChild(opcionVacia);

            for (const nombre of datosGimnasio.rutinas) {
                const opcion = document.createElement("option");
                opcion.value = nombre;
                opcion.textContent = nombre;
                selectorRutinaEditar.appendChild(opcion);
            }

            if (datosGimnasio.rutinas.includes(seleccionAnterior)) {
                selectorRutinaEditar.value = seleccionAnterior;
            }

            mostrarEjerciciosDeRutina();
        }

        // Muestra los ejercicios de la rutina seleccionada.
        function mostrarEjerciciosDeRutina() { RutinasGimnasio.editor(); }

        selectorRutinaEditar.addEventListener("change", function () {
            campoNuevoEjercicio.value = "";
            mostrarEjerciciosDeRutina();
            campoNuevoEjercicio.focus();
        });

        botonGuardarEjercicio.addEventListener("click", function () {
            const rutina = selectorRutinaEditar.value;
            const nombre = campoNuevoEjercicio.value.trim();

            if (rutina === "") {
                return;
            }

            if (nombre === "") {
                mensajeEjercicios.textContent =
                    "Escribe el nombre del ejercicio.";
                campoNuevoEjercicio.focus();
                return;
            }

            const clave = "rutina:" + rutina;

            if (!datosGimnasio.ejerciciosPorRutina[clave]) {
                datosGimnasio.ejerciciosPorRutina[clave] = [];
            }

            const ejercicios = datosGimnasio.ejerciciosPorRutina[clave];

            const existe = ejercicios.some(function (ejercicio) {
                return (typeof ejercicio === 'string' ? ejercicio : ejercicio.nombre).toLowerCase() === nombre.toLowerCase();
            });

            if (existe) {
                mensajeEjercicios.textContent =
                    "Ese ejercicio ya está en esta rutina.";
                return;
            }

            ejercicios.push(nombre);

            const guardado = guardarDatosGimnasio();

            campoNuevoEjercicio.value = "";
            mostrarEjerciciosDeRutina();

            mensajeEjercicios.textContent = guardado
                ? "Ejercicio guardado."
                : "Ejercicio añadido solo en esta página.";
        });

        function obtenerResumenGimnasio(fecha) {
            const entrenamiento = datosGimnasio.entrenamientos[claveFecha(fecha)];
            if (!entrenamiento) return '';
            const total = entrenamiento.ejercicios.reduce((n,e) => n + e.series.filter(GimnasioMiDia.completada).length,0);
            return total ? entrenamiento.rutina + ' · ' + total + (total === 1 ? ' serie' : ' series') : '';
        }

        mostrarCarrusel();
