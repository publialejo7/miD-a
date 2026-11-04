// Vista incremental: escribir no reconstruye el formulario ni cambia el foco.
const VistaGimnasio = (() => {
    const $ = id => document.getElementById(id);
    const G = GimnasioMiDia;
    const texto = (tag, contenido, clase) => {const el=document.createElement(tag); el.textContent=contenido; if(clase)el.className=clase; return el;};
    let ultimoResumen=null;
    function guardar() {
        const ok=guardarDatosGimnasio();
        if(ok)$('mensaje-rutina-dia').textContent='Guardado en este dispositivo.';
        return ok;
    }
    function cambiar(accion, pintar=true) {
        try {accion();guardar();if(pintar)mostrar();} catch(error) {$('mensaje-rutina-dia').textContent=error.message;}
    }
    function empezar(rutina) {
        cambiar(()=>{G.iniciar(datosGimnasio,claveFecha(fechaSeleccionada),claveFecha(new Date()),rutina);ultimoResumen=null;});
    }
    function mostrar() {
        const activo=datosGimnasio.activo;
        const fecha=claveFecha(fechaSeleccionada);
        $('gym-inicio').hidden=!!activo;
        $('gestionar-rutinas-gimnasio').hidden=!!activo;
        $('gym-titulo').textContent=activo?'Entrenamiento':'Gimnasio';
        $('gym-sesion').hidden=!activo;
        $('gym-resumen-final').hidden=!ultimoResumen || !!activo;
        selectorRutina.replaceChildren();
        const vacia=texto('option','Selecciona una rutina');vacia.value='';selectorRutina.append(vacia);
        for(const nombre of datosGimnasio.rutinas){const op=texto('option',nombre);op.value=nombre;selectorRutina.append(op);}
        selectorRutina.disabled=!datosGimnasio.rutinas.length;
        RutinasGimnasio.tarjetas($('gym-rutinas'));
        const historico=datosGimnasio.entrenamientos[fecha];
        $('gym-historial-dia').hidden=!historico;
        $('gym-historial-dia').replaceChildren();
        if(historico){
            $('gym-historial-dia').append(texto('h2','Registrado el '+fecha),texto('p',obtenerResumenGimnasio(fechaSeleccionada)));
            for(const e of historico.ejercicios){const realizadas=e.series.filter(G.completada);if(realizadas.length)$('gym-historial-dia').append(texto('p',e.nombre+(e.variante?' · '+e.variante:'')+': '+realizadas.map(s=>s.peso+' kg × '+s.repeticiones).join(' · ')));}
        }
        const lista=$('lista-ejercicios');lista.replaceChildren();
        if(!activo){actualizarReloj();return;}
        $('gym-sesion-nombre').textContent=activo.rutina;
        $('gym-auto-descanso').checked=activo.autoDescanso;
        $('gym-sonido').checked=activo.sonido;
        $('gym-descanso-default').value=activo.descansoPredeterminado;
        $('gym-fecha-aviso').textContent=activo.fecha!==fecha ? 'Continúas la sesión abierta del '+activo.fecha+'. La fecha del calendario no cambia su registro.' : activo.inicio===null ? 'Registro de un día pasado: sin duración de entrenamiento.' : '';
        activo.ejercicios.forEach((e,i)=>{
            const U=EditorGimnasio;
            const proteger=accion=>{if(e.series.some(G.completada) && !confirm('Este ejercicio tiene series completadas. ¿Reemplazarlo o quitarlo y eliminar sus datos de esta sesión?'))return;accion();};
            lista.append(U.ejercicio(e,{activo,fecha:activo.fecha,indice:i,total:activo.ejercicios.length,guardar,repintar:mostrar,
                mover:paso=>cambiar(()=>G.mover(activo.ejercicios,i,paso)),
                reemplazar:()=>proteger(()=>U.abrirCatalogo(nuevo=>cambiar(()=>{activo.ejercicios[i]=G.desdePlantilla(datosGimnasio,nuevo,activo.fecha);}))),
                quitar:()=>proteger(()=>cambiar(()=>activo.ejercicios.splice(i,1)))
            }));
        });
        actualizarReloj();
    }
    function actualizarReloj() {
        const a=datosGimnasio.activo;
        const acceso=$('gym-continuar');
        acceso.hidden=!a;
        if(a)acceso.textContent='Continuar entrenamiento · '+a.rutina+' ('+a.fecha+') →';
        $('gym-descanso-panel').hidden=!a?.descanso;
        if(!a){$('gym-tiempo').textContent='';return;}
        const conteo=G.conteo(a);
        const transcurrido=a.inicio===null ? 'Sin duración' : Math.floor(Math.max(0,Date.now()-a.inicio)/60000)+':'+String(Math.floor(Math.max(0,Date.now()-a.inicio)/1000)%60).padStart(2,'0');
        $('gym-reloj-total').textContent=transcurrido;
        $('gym-tiempo').textContent=conteo.completas+' hechas · '+conteo.pendientes+' pendientes'+(a.descanso ? ' · Descanso: '+Math.max(0,Math.ceil((a.descanso.fin-Date.now())/1000))+' s' : '');
        if(a.descanso){
            const restante=Math.max(0,Math.ceil((a.descanso.fin-Date.now())/1000));
            $('gym-descanso-tiempo').textContent=restante ? Math.floor(restante/60)+':'+String(restante%60).padStart(2,'0') : '✓ Descanso terminado';
            if(!restante && !a.descanso.avisado){
                a.descanso.avisado=true;
                // Persistir antes de emitir: volver a abrir no repite avisos anteriores.
                if(guardar() && a.sonido && !document.hidden){
                    try{const C=globalThis.AudioContext || globalThis.webkitAudioContext;if(C){const c=new C(),o=c.createOscillator(),g=c.createGain();g.gain.value=0.07;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.2);o.onended=()=>c.close();}}catch{}
                }
            }
        }
    }
    $('gym-abrir-catalogo').addEventListener('click',()=>EditorGimnasio.abrirCatalogo(e=>cambiar(()=>{const a=datosGimnasio.activo;if(a)a.ejercicios.push(G.desdePlantilla(datosGimnasio,e,a.fecha));})));
    $('gym-empezar').addEventListener('click',()=>{if(!selectorRutina.value){$('mensaje-rutina-dia').textContent='Selecciona una rutina o empieza un entrenamiento vacío.';return;}empezar(selectorRutina.value);});
    $('gym-entrenamiento-vacio').addEventListener('click',()=>empezar(''));
    $('gym-reintentar').addEventListener('click',guardar);
    $('gym-continuar').addEventListener('click',()=>{if(!datosGimnasio.activo)return;const [y,m,d]=datosGimnasio.activo.fecha.split('-').map(Number);abrirDia(new Date(y,m-1,d));$('abrir-gimnasio').click();});
    $('gym-auto-descanso').addEventListener('change',()=>cambiar(()=>{datosGimnasio.activo.autoDescanso=$('gym-auto-descanso').checked;},false));
    $('gym-sonido').addEventListener('change',()=>cambiar(()=>{datosGimnasio.activo.sonido=$('gym-sonido').checked;},false));
    $('gym-descanso-default').addEventListener('change',()=>{const v=$('gym-descanso-default').value;if(v==='' || !Number.isInteger(Number(v)) || Number(v)<0 || Number(v)>3600){$('mensaje-rutina-dia').textContent='El descanso debe ser de 0 a 3600 segundos enteros.';return;}cambiar(()=>{datosGimnasio.activo.descansoPredeterminado=Number(v);},false);});
    $('gym-anadir-ejercicio').addEventListener('click',()=>{const nombre=$('gym-nombre-ejercicio').value.trim(),variante=$('gym-variante').value.trim();if(!nombre){$('mensaje-rutina-dia').textContent='Escribe el nombre del ejercicio.';return;}cambiar(()=>{const a=datosGimnasio.activo;a.ejercicios.push(G.ejercicio(datosGimnasio,nombre,variante,a.fecha,a.descansoPredeterminado));$('gym-nombre-ejercicio').value='';$('gym-variante').value='';});});
    $('gym-mas-descanso').addEventListener('click',()=>cambiar(()=>{const d=datosGimnasio.activo.descanso;if(d){d.fin=Math.max(Date.now(),d.fin)+30000;d.avisado=false;}},false));
    $('gym-saltar-descanso').addEventListener('click',()=>cambiar(()=>{datosGimnasio.activo.descanso=null;},false));
    $('gym-descartar').addEventListener('click',()=>{if(confirm('¿Descartar el entrenamiento abierto? Se eliminarán sus series, sin cambiar el historial.'))cambiar(()=>delete datosGimnasio.activo);});
    $('gym-terminar').addEventListener('click',()=>{
        const a=datosGimnasio.activo;if(!a)return;
        const c=G.conteo(a);
        if(!c.completas){$('mensaje-rutina-dia').textContent='No hay series completadas. Continúa el entrenamiento o pulsa Descartar sesión.';return;}
        if(!confirm('Terminar '+a.rutina+': '+c.completas+' series completadas y '+c.pendientes+' pendientes. Las pendientes no contarán.'))return;
        const antes=G.copia(datosGimnasio);
        ultimoResumen=G.finalizar(datosGimnasio);
        if(!guardar()){datosGimnasio=antes;ultimoResumen=null;mostrar();return;}
        const r=ultimoResumen;
        $('gym-resumen-final').textContent='Entrenamiento guardado · '+r.fecha+' · '+r.nombre+' · '+(r.duracion===null?'Sin duración':Math.floor(r.duracion/60000)+' min')+' · '+r.ejercicios.filter(e=>e.series.some(G.completada)).length+' ejercicios · '+c.completas+' series completadas.';
        mostrar();mostrarCarrusel();
    });
    // La sincronización vuelve a invocar mostrar cuando incorpora cambios remotos.
    setInterval(actualizarReloj,1000);
    return {mostrar,actualizarReloj,empezar};
})();
