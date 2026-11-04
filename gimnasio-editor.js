// Componentes compartidos por la plantilla y la sesión. Solo se repinta al cambiar la estructura.
const EditorGimnasio = (() => {
    const G=GimnasioMiDia,C=CatalogoGimnasio,$=id=>document.getElementById(id);
    const el=(tag,t='',clase='')=>{const e=document.createElement(tag);e.textContent=t;if(clase)e.className=clase;return e;};
    const boton=(t,fn,clase='')=>{const b=el('button',t,clase);b.type='button';b.addEventListener('click',fn);return b;};
    const imagen=e=>{const i=document.createElement('img');i.src=C.imagen(e);i.alt='Esquema de '+e.nombre;i.width=58;i.height=58;return i;};
    let elegir=null,retorno=null;
    function abrirCatalogo(callback) {
        elegir=callback;retorno=document.activeElement;
        $('catalogo-buscar').value='';$('catalogo-musculo').value='';$('catalogo-equipo').value='';
        pintarCatalogo();$('gym-catalogo').showModal();$('catalogo-buscar').focus();
    }
    function cerrar(){ $('gym-catalogo').close();retorno?.focus();elegir=null; }
    function seleccionar(e,variante) {
        const nuevo={id:G.id(),catalogoId:e.id || null,nombre:e.nombre,variante,descanso:90,
            series:Array.from({length:3},()=>({tipo:'normal',peso:'',repeticiones:''}))};
        const fn=elegir;cerrar();fn?.(nuevo);
    }
    function pintarCatalogo(){
        const lista=$('catalogo-resultados');lista.replaceChildren();
        const resultados=C.filtrar($('catalogo-buscar').value,$('catalogo-musculo').value,$('catalogo-equipo').value);
        $('catalogo-cantidad').textContent=resultados.length+' ejercicios · esquemas orientativos';
        for(const e of resultados){
            const card=el('article','','catalogo-ejercicio'),info=el('div');
            info.append(el('h3',e.nombre),el('small',e.musculo+' · '+e.equipo));
            const variante=document.createElement('select');variante.setAttribute('aria-label','Variante de '+e.nombre);
            for(const v of e.variantes){const o=el('option',v);o.value=v;variante.append(o);}
            info.append(variante);card.append(imagen(e),info,boton('Añadir',()=>seleccionar(e,variante.value || e.variantes[0]),'catalogo-elegir'));lista.append(card);
        }
        if(!resultados.length)lista.append(el('p','No hay coincidencias. Prueba otro nombre o crea tu propio ejercicio.'));
    }
    const opcionesTipo=[['normal','Trabajo'],['calentamiento','Calentamiento'],['fallo','Al fallo'],['descendente','Descendente']];
    function ejercicio(e,{activo=null,fecha=null,indice=0,total=1,guardar,repintar,reemplazar,mover,quitar}) {
        const sesion=!!activo;
        const bloque=el('article','','ejercicio-dia gym-ejercicio gym-editor-ejercicio');
        const cabecera=el('div','','gym-ejercicio-titulo'),nombre=el('div');
        nombre.append(el('h3',e.nombre),el('small',e.variante || 'Personalizado'));
        const menu=el('details','','gym-menu'),summary=el('summary','⋯');summary.setAttribute('aria-label','Opciones de '+e.nombre);
        const acciones=el('div','','gym-menu-acciones');
        const subir=boton('↑ Mover arriba',()=>mover(-1)),bajar=boton('↓ Mover abajo',()=>mover(1));subir.disabled=indice===0;bajar.disabled=indice===total-1;
        acciones.append(subir,bajar,boton('Reemplazar ejercicio',reemplazar),boton('Quitar ejercicio',quitar));menu.append(summary,acciones);
        cabecera.append(imagen(e),nombre,menu);bloque.append(cabecera);
        const ajustes=el('div','','gym-ejercicio-ajustes'),descanso=el('label','Descanso · s'),inputD=document.createElement('input');inputD.type='number';inputD.min='0';inputD.max='3600';inputD.step='1';inputD.value=e.descanso;inputD.inputMode='numeric';inputD.setAttribute('aria-label','Descanso en segundos de '+e.nombre);
        const aviso=el('p','','gym-error');aviso.hidden=true;aviso.setAttribute('role','status');
        inputD.addEventListener('input',()=>{const n=Number(inputD.value);if(inputD.value!=='' && Number.isInteger(n) && n>=0 && n<=3600){e.descanso=n;guardar();aviso.hidden=true;}else{aviso.textContent='El descanso debe estar entre 0 y 3600 segundos enteros.';aviso.hidden=false;}});
        descanso.append(inputD);ajustes.append(descanso);bloque.append(ajustes);
        const tabla=el('div','','gym-tabla');
        const titulos=el('div','','gym-tabla-titulos');['Serie',...(sesion?['Anterior']:[]),'kg','Reps',sesion?'Hecha':''].forEach(t=>titulos.append(el('span',t)));tabla.append(titulos);
        const ref=sesion?G.anterior(datosGimnasio,e.nombre,e.variante,fecha):null;
        e.series.forEach((s,i)=>{
            const fila=el('div','','fila-serie gym-serie gym-fila-compacta');
            let completar;
            const actualizar=()=>{
                const hecha=sesion && G.completada(s);
                fila.className='fila-serie gym-serie gym-fila-compacta'+(hecha?' realizada':'')+(s.sugerida && !hecha?' propuesta':'');
                if(completar){completar.textContent=hecha?'✓':'○';completar.setAttribute('aria-pressed',String(hecha));completar.setAttribute('aria-label',(hecha?'Desmarcar':'Completar')+' serie '+(i+1)+' de '+e.nombre);}
            };
            const tipo=document.createElement('select');tipo.className='gym-tipo-serie';tipo.setAttribute('aria-label','Tipo de serie '+(i+1)+' de '+e.nombre);
            for(const [v,label] of opcionesTipo){const op=el('option',v==='normal'?String(i+1):({calentamiento:'C',fallo:'F',descendente:'D'}[v]));op.value=v;op.textContent+=' · '+label;tipo.append(op);}tipo.value=s.tipo || 'normal';
            const tipoControl=el('span','','gym-tipo-control'),codigo=el('span',s.tipo && s.tipo!=='normal'?({calentamiento:'C',fallo:'F',descendente:'D'}[s.tipo]):String(i+1));tipoControl.append(codigo,tipo);tipoControl.setAttribute('title',opcionesTipo.find(([v])=>v===(s.tipo || 'normal'))[1]);
            tipo.addEventListener('change',()=>{s.tipo=tipo.value;codigo.textContent=s.tipo==='normal'?String(i+1):({calentamiento:'C',fallo:'F',descendente:'D'}[s.tipo]);tipoControl.setAttribute('title',opcionesTipo.find(([v])=>v===s.tipo)[1]);guardar();});fila.append(tipoControl);
            if(sesion){const anterior=ref?.series[i];const t=el('small',anterior?anterior.peso+' × '+anterior.repeticiones:'—','gym-anterior');t.setAttribute('title',anterior?'Anterior · '+ref.fecha:'Sin referencia anterior');fila.append(t);}
            function numero(key,label,min,step){const input=document.createElement('input');input.type='number';input.min=min;input.step=step;input.inputMode=key==='peso'?'decimal':'numeric';input.value=s[key];input.placeholder='—';input.setAttribute('aria-label',label+' · '+e.nombre+' · serie '+(i+1));input.addEventListener('input',()=>{s[key]=input.value;if(sesion){s.completada=false;s.sugerida=false;}aviso.hidden=true;guardar();actualizar();});return input;}
            fila.append(numero('peso','Peso en kg','0','any'),numero('repeticiones','Repeticiones','1','1'));
            if(sesion){completar=boton('',()=>{try{G.confirmar(activo,e,s,!G.completada(s));aviso.hidden=true;guardar();actualizar();VistaGimnasio.actualizarReloj();}catch(error){aviso.textContent=error.message;aviso.hidden=false;$('mensaje-rutina-dia').textContent=error.message;}} ,'gym-completar');fila.append(completar);}
            else {const quitarSerie=boton('×',()=>{e.series.splice(i,1);guardar();repintar();},'gym-quitar-serie');quitarSerie.setAttribute('aria-label','Quitar serie '+(i+1)+' de '+e.nombre);fila.append(quitarSerie);}
            actualizar();tabla.append(fila);
        });
        bloque.append(tabla,aviso);
        const controles=el('div','','gym-series-acciones');
        controles.append(boton('+ Añadir serie',()=>{const s=e.series.at(-1);e.series.push({tipo:s?.tipo || 'normal',peso:s?.peso ?? '',repeticiones:s?.repeticiones ?? '',...(sesion?{completada:false,sugerida:true}:{})});guardar();repintar();}));
        if(sesion && e.series.length)controles.append(boton('Quitar última',()=>{const s=e.series.at(-1);if((G.completada(s)||s.peso!==''||s.repeticiones!=='')&&!confirm('¿Eliminar la última serie y sus datos?'))return;e.series.pop();guardar();repintar();},'boton-discreto'));
        bloque.append(controles);return bloque;
    }
    for(const [id,campo,vacio] of [['catalogo-musculo','musculo','Todos los grupos'],['catalogo-equipo','equipo','Todo el material']]){
        const select=$(id),op=el('option',vacio);op.value='';select.append(op);
        for(const valor of (campo==='equipo'?['Barra','Mancuernas','Polea','Máquina','Peso corporal','Banco','Barra fija','Paralelas']:[...new Set(C.lista.map(e=>e[campo]))])){const o=el('option',valor);o.value=valor;select.append(o);}
        select.addEventListener('change',pintarCatalogo);
    }
    $('catalogo-buscar').addEventListener('input',pintarCatalogo);
    $('catalogo-cerrar').addEventListener('click',cerrar);
    $('gym-catalogo').addEventListener('cancel',()=>{elegir=null;});
    $('catalogo-personalizado').addEventListener('click',()=>{const nombre=$('catalogo-nombre-propio').value.trim(),variante=$('catalogo-variante-propia').value.trim();if(!nombre){$('catalogo-estado').textContent='Escribe el nombre de tu ejercicio.';return;}seleccionar({nombre},variante);$('catalogo-nombre-propio').value='';$('catalogo-variante-propia').value='';});
    return {el,boton,imagen,abrirCatalogo,ejercicio};
})();
