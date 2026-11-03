// Vista incremental: escribir no reconstruye el formulario ni cambia el foco.
const VistaGimnasio = (() => {
    const $ = id => document.getElementById(id);
    const G = GimnasioMiDia;
    const texto = (tag, contenido, clase) => {const el=document.createElement(tag); el.textContent=contenido; if(clase)el.className=clase; return el;};
    const boton = (contenido, accion) => {const b=texto('button',contenido);b.type='button';b.addEventListener('click',accion);return b;};
    let ultimoResumen=null;
    function guardar() {
        const ok=guardarDatosGimnasio();
        if(ok)$('mensaje-rutina-dia').textContent='Guardado en este dispositivo.';
        return ok;
    }
    function cambiar(accion, pintar=true) {
        try {accion();guardar();if(pintar)mostrar();} catch(error) {$('mensaje-rutina-dia').textContent=error.message;}
    }
    function campo(label, valor, tipo, cambio) {
        const l=texto('label',label.split(' · ')[0]), input=document.createElement('input');
        input.type=tipo;input.value=valor;input.inputMode=tipo==='number'?'decimal':'text';
        input.setAttribute('aria-label',label);l.append(input);
        input.addEventListener('input',()=>cambio(input.value));
        return {l,input};
    }
    function empezar(rutina) {
        cambiar(()=>{G.iniciar(datosGimnasio,claveFecha(fechaSeleccionada),claveFecha(new Date()),rutina);ultimoResumen=null;});
    }
    function mostrar() {
        const activo=datosGimnasio.activo;
        const fecha=claveFecha(fechaSeleccionada);
        $('gym-inicio').hidden=!!activo;
        $('gym-sesion').hidden=!activo;
        $('gym-resumen-final').hidden=!ultimoResumen || !!activo;
        selectorRutina.replaceChildren();
        const vacia=texto('option','Selecciona una rutina');vacia.value='';selectorRutina.append(vacia);
        for(const nombre of datosGimnasio.rutinas){const op=texto('option',nombre);op.value=nombre;selectorRutina.append(op);}
        selectorRutina.disabled=!datosGimnasio.rutinas.length;
        const historico=datosGimnasio.entrenamientos[fecha];
        $('gym-historial-dia').hidden=!historico;
        $('gym-historial-dia').replaceChildren();
        if(historico){
            $('gym-historial-dia').append(texto('h2','Registrado el '+fecha),texto('p',obtenerResumenGimnasio(fechaSeleccionada)));
            for(const e of historico.ejercicios){const realizadas=e.series.filter(G.completada);if(realizadas.length)$('gym-historial-dia').append(texto('p',e.nombre+(e.variante?' · '+e.variante:'')+': '+realizadas.map(s=>s.peso+' kg × '+s.repeticiones).join(' · ')));}
        }
        const lista=$('lista-ejercicios');lista.replaceChildren();
        if(!activo){actualizarReloj();return;}
        $('gym-sesion-nombre').textContent=activo.rutina+' · '+activo.fecha;
        $('gym-auto-descanso').checked=activo.autoDescanso;
        $('gym-sonido').checked=activo.sonido;
        $('gym-descanso-default').value=activo.descansoPredeterminado;
        $('gym-fecha-aviso').textContent=activo.fecha!==fecha ? 'Continúas la sesión abierta del '+activo.fecha+'. La fecha del calendario no cambia su registro.' : activo.inicio===null ? 'Registro de un día pasado: sin duración de entrenamiento.' : '';
        activo.ejercicios.forEach((e,ei)=>{
            const bloque=texto('article','', 'ejercicio-dia gym-ejercicio');
            bloque.append(texto('h3',e.nombre+(e.variante?' · '+e.variante:'')));
            const ref=G.anterior(datosGimnasio,e.nombre,e.variante,activo.fecha);
            const descanso=campo('Descanso (segundos) · '+e.nombre,e.descanso,'number',v=>{
                if(Number.isInteger(Number(v)) && Number(v)>=0 && Number(v)<=3600 && v!==''){e.descanso=Number(v);guardar();}
            });descanso.input.min='0';descanso.input.max='3600';descanso.input.step='1';
            descanso.input.addEventListener('change',()=>{if(descanso.input.value==='' || !Number.isInteger(Number(descanso.input.value)) || Number(descanso.input.value)<0 || Number(descanso.input.value)>3600){descanso.input.value=e.descanso;$('mensaje-rutina-dia').textContent='El descanso debe ser de 0 a 3600 segundos enteros.';}});
            bloque.append(descanso.l);
            e.series.forEach((s,si)=>{
                const fila=texto('div','', 'fila-serie gym-serie'+(G.completada(s)?' realizada':''));
                fila.append(texto('strong','Serie '+(si+1)));
                const anterior=ref?.series[si];
                fila.append(texto('small',anterior?'Anterior ('+ref.fecha+'): '+anterior.peso+' kg × '+anterior.repeticiones:'Sin referencia para esta serie.','gym-referencia'));
                const aviso=texto('p','','gym-error');aviso.hidden=true;aviso.setAttribute('role','status');
                let completar;
                const actualizar=()=>{completar.setAttribute('aria-label',(G.completada(s)?'Desmarcar':'Completar')+' serie '+(si+1)+' de '+e.nombre);completar.textContent=G.completada(s)?'✓ Completada':'○ Marcar completada';completar.setAttribute('aria-pressed',String(G.completada(s)));fila.className='fila-serie gym-serie'+(G.completada(s)?' realizada':'');};
                const peso=campo('Peso (kg) · '+e.nombre+' · serie '+(si+1),s.peso,'number',v=>{s.peso=v;s.completada=false;guardar();actualizar();});peso.input.min='0';peso.input.step='any';
                const reps=campo('Repeticiones · '+e.nombre+' · serie '+(si+1),s.repeticiones,'number',v=>{s.repeticiones=v;s.completada=false;guardar();actualizar();});reps.input.min='1';reps.input.step='1';reps.input.inputMode='numeric';
                completar=boton('',()=>{try{G.confirmar(activo,e,s,!G.completada(s));aviso.hidden=true;guardar();actualizar();actualizarReloj();}catch(error){aviso.textContent=error.message;aviso.hidden=false;$('mensaje-rutina-dia').textContent=error.message;}});
                completar.className='gym-completar';actualizar();
                const quitar=boton('Quitar serie',()=>{if((G.completada(s) || s.peso!=='' || s.repeticiones!=='') && !confirm('¿Eliminar esta serie y sus datos?'))return;cambiar(()=>e.series.splice(si,1));});quitar.className='boton-discreto';
                quitar.setAttribute('aria-label','Quitar serie '+(si+1)+' de '+e.nombre);
                fila.append(peso.l,reps.l,completar,quitar,aviso);bloque.append(fila);
            });
            bloque.append(boton('+ Añadir serie',()=>cambiar(()=>{const ultima=e.series.at(-1);e.series.push({peso:ultima?.peso ?? '',repeticiones:ultima?.repeticiones ?? '',completada:false});})));
            lista.append(bloque);
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
        const transcurrido=a.inicio===null ? 'Sin duración' : Math.floor(Math.max(0,Date.now()-a.inicio)/60000)+' min';
        $('gym-tiempo').textContent=transcurrido+' · '+conteo.completas+' completadas · '+conteo.pendientes+' pendientes'+(a.descanso ? ' · Descanso: '+Math.max(0,Math.ceil((a.descanso.fin-Date.now())/1000))+' s' : '');
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
    return {mostrar,actualizarReloj};
})();
