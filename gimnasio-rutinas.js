const RutinasGimnasio = (() => {
    const $=id=>document.getElementById(id),U=EditorGimnasio,G=GimnasioMiDia;
    function guardar(){const ok=guardarDatosGimnasio();$('mensaje-ejercicios').textContent=ok?'Cambios guardados.':'No se ha podido guardar. Mantén esta página abierta.';return ok;}
    function tarjetas(destino){
        destino.replaceChildren();
        for(const nombre of datosGimnasio.rutinas){
            const ejercicios=datosGimnasio.ejerciciosPorRutina['rutina:'+nombre] || [];
            const card=U.el('li','','gym-rutina-card'),cabecera=U.el('div','','gym-rutina-titulo');
            cabecera.append(U.el('h3',nombre),U.boton('Editar',()=>{if(pantallaRutinas.hidden)$('gestionar-rutinas-gimnasio').click();selectorRutinaEditar.value=nombre;editor();$('rutina-editor').scrollIntoView({block:'start',behavior:'smooth'});},'boton-discreto'));
            card.append(cabecera,U.el('p',ejercicios.length?ejercicios.map(e=>typeof e==='string'?e:e.nombre+(e.variante?' · '+e.variante:'')).join(' / '):'Añade ejercicios y prepara tus series.','gym-rutina-descripcion'));
            const series=ejercicios.reduce((n,e)=>n+(typeof e==='string'?0:e.series.length),0);
            card.append(U.el('small',ejercicios.length+' ejercicios'+(series?' · '+series+' series previstas':'')),U.boton(datosGimnasio.activo?'Continuar entrenamiento':'Empezar rutina',()=>{
                const fecha=!document.getElementById('pantalla-resumen-gimnasio').hidden ? new Date() : fechaSeleccionada || new Date();document.querySelectorAll('body > section').forEach(p=>p.hidden=true);abrirDia(fecha);$('abrir-gimnasio').click();VistaGimnasio.empezar(nombre);
            },'gym-empezar-card'));
            destino.append(card);
        }
        if(!datosGimnasio.rutinas.length)destino.append(U.el('li','Tu próxima rutina empieza aquí. Crea una y elige sus ejercicios.','gym-vacio-rutinas'));
    }
    function mostrar(){tarjetas($('lista-rutinas'));}
    function editor(){
        const nombre=selectorRutinaEditar.value;
        $('rutina-editor').hidden=!nombre;
        $('lista-rutinas').hidden=!!nombre;$('rutina-nueva').hidden=!!nombre;$('mensaje-rutinas').hidden=!!nombre;
        campoNuevoEjercicio.disabled=!nombre;botonGuardarEjercicio.disabled=!nombre;$('rutina-catalogo').disabled=!nombre;
        $('rutina-editor-nombre').textContent=nombre;
        listaEjerciciosRutina.replaceChildren();
        if(!nombre)return;
        const clave='rutina:'+nombre,lista=datosGimnasio.ejerciciosPorRutina[clave] || [];
        const repintar=()=>{editor();mostrar();};
        lista.forEach((entrada,i)=>{
            const e=G.plantilla(entrada);
            const persistir=()=>{(datosGimnasio.ejerciciosPorRutina[clave] ||= [])[i]=e;return guardar();};
            listaEjerciciosRutina.append(U.ejercicio(e,{indice:i,total:lista.length,guardar:persistir,repintar,
                reemplazar:()=>U.abrirCatalogo(nuevo=>{lista[i]=nuevo;guardar();repintar();}),
                mover:paso=>{G.mover(lista,i,paso);guardar();repintar();},
                quitar:()=>{if(!confirm('¿Quitar '+e.nombre+' de esta rutina? Los entrenamientos anteriores se conservan.'))return;lista.splice(i,1);guardar();repintar();}
            }));
        });
    }
    $('rutina-catalogo').addEventListener('click',()=>{
        const nombre=selectorRutinaEditar.value;if(!nombre)return;
        U.abrirCatalogo(e=>{(datosGimnasio.ejerciciosPorRutina['rutina:'+nombre] ||= []).push(e);guardar();editor();mostrar();});
    });
    $('rutina-guardar-cambios').addEventListener('click',()=>{
        try{for(const e of datosGimnasio.ejerciciosPorRutina['rutina:'+selectorRutinaEditar.value] || [])G.validarPlan(e);
            if(guardar()){selectorRutinaEditar.value='';editor();mostrar();$('mensaje-rutinas').textContent='Rutina preparada. Ya puedes empezar a entrenar.';}
        }catch(error){$('mensaje-ejercicios').textContent=error.message;}
    });
    return {mostrar,editor,tarjetas};
})();
