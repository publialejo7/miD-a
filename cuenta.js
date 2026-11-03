(() => {
    const $ = id => document.getElementById(id);
    const api = new NubeMiDia.API(globalThis.MI_DIA_NUBE);
    const claves = ['miDiaSesiones','miDiaProductividadV1','miDiaGimnasio','miDiaTareasV1'];
    let programada = null, ocupada = false, mensaje = '';
    const dialog = $('dialog-cuenta');
    function informar(texto, estado) {
        mensaje = texto;
        $('mensaje-cuenta').textContent = texto;
        if (estado) $('estado-sincronizacion').textContent = estado;
    }
    function editando() {
        return falloGuardadoGimnasio || !!document.activeElement?.matches('input, textarea, select, [contenteditable]') || punteroActivo !== null;
    }
    function refrescarDatos() {
        const docs = DatosMiDia.leer().datos;
        const productividad = JSON.parse(docs.miDiaProductividadV1 || '{"sesiones":[]}');
        sesiones = productividad.sesiones;
        const gimnasioCambio=!!docs.miDiaGimnasio && docs.miDiaGimnasio!==ultimoGimnasioGuardado;
        if (gimnasioCambio) {datosGimnasio = JSON.parse(docs.miDiaGimnasio);ultimoGimnasioGuardado = docs.miDiaGimnasio;falloGuardadoGimnasio = false;}
        const nuevaAgenda = new TareasMiDia.Agenda(DatosMiDia.almacenamiento);
        if (nuevaAgenda.errorLectura) throw new Error(nuevaAgenda.errorLectura);
        agendaMiDia._tareas = nuevaAgenda._tareas;
        mostrarCarrusel();
        if (!pantallaProductividad.hidden) mostrarSesiones();
        if (gimnasioCambio && !pantallaGimnasio.hidden) cargarRutinaDelDia();
        if (!pantallaRutinas.hidden) mostrarRutinas();
    }
    const motor = new SyncMiDia.Motor({
        leer() {
            const db=DatosMiDia.leer();
            return {base:db.sync?.base || SyncMiDia.vacio(), revision:db.sync?.revision || 0,
                conflictos:db.sync?.conflictos || [], remoto:db.sync?.remoto || null,local:SyncMiDia.desdeDocumentos(db.datos)};
        },
        guardar(estado) {
            if(editando())throw new Error('Termina de editar el campo para recibir los cambios de tu cuenta.');
            DatosMiDia.transaccion(db => {
                db.datos=SyncMiDia.aDocumentos(estado.local,db.datos);
                db.sync={base:estado.base,revision:estado.revision,conflictos:estado.conflictos,remoto:estado.remoto};
            });
            refrescarDatos();
        },
        descargar:() => api.descargar(),
        subir:(revision,data) => api.subir(revision,data)
    });
    function dibujarCuenta() {
        const conectada=!!DatosMiDia.cuenta;
        const pie=document.querySelector('.pie-app span');
        if(pie && conectada)pie.textContent='Copia offline en este navegador · Registros compartidos con tu cuenta.';
        $('acceso-nube').hidden=conectada;
        $('cuenta-conectada').hidden=!conectada;
        ['entrar-cuenta','registrar-cuenta','recuperar-cuenta'].forEach(id=>$(id).disabled=!api.configurada() || ocupada);
        if(!api.configurada())informar('La sincronización está preparada, pero falta conectar tu proyecto de Supabase. Mientras tanto, tus datos siguen en este navegador.');
        if(!conectada)return;
        const db=DatosMiDia.leer();
        $('etiqueta-cuenta').textContent='Mi cuenta';
        $('correo-conectado').textContent=api.sesion()?.user?.email || 'Cuenta conectada';
        $('importar-dispositivo').hidden=!!db.vinculada;
        $('sincronizar-ahora').disabled=!db.vinculada || ocupada;
        $('conflictos-nube').hidden=!db.sync?.conflictos?.length;
        const lista=$('lista-conflictos');lista.replaceChildren();
        for(const conflicto of db.sync?.conflictos || []) {
            const li=document.createElement('li');
            const describir=valor=>{
                if(!valor)return 'Eliminado';
                if(valor.titulo)return valor.titulo+' · '+valor.fecha+' · '+(valor.terminada?'Terminada':'Pendiente')+(valor.notas?' · '+valor.notas:'');
                if(valor.materia)return valor.materia+' · '+valor.fecha+' · '+Math.round(valor.duracion/1000)+' s'+(valor.objetivo?' · '+valor.objetivo:'');
                if(valor.nombre)return valor.nombre+' · '+valor.ejercicios.join(', ');
                return valor.rutina+' · '+(valor.entrenamiento?.ejercicios || []).map(e=>e.nombre+': '+e.series.map(s=>s.repeticiones+' × '+s.peso+' kg').join(', ')).join(' / ');
            };
            li.textContent='Dispositivo: '+describir(conflicto.local)+' / Nube: '+describir(conflicto.remoto);
            lista.append(li);
        }
    }
    function programar() {
        clearTimeout(programada);
        if(!DatosMiDia.cuenta)return;
        $('estado-sincronizacion').textContent='Cambios guardados en el dispositivo';
        programada=setTimeout(sincronizar,800);
    }
    async function sincronizar() {
        if(!DatosMiDia.cuenta || ocupada || !api.configurada())return;
        if(!DatosMiDia.leer().vinculada)return;
        if(!navigator.onLine) {informar('Sin conexión. Los cambios quedan guardados y se enviarán cuando vuelvas a tener internet.','Sin conexión · cambios locales');return;}
        if(editando()) {programar();return;}
        ocupada=true;dibujarCuenta();
        informar('Sincronizando tus registros…','Sincronizando…');
        try {
            const resultado=await motor.sincronizar();
            if(resultado?.conflictos)informar('Hay versiones distintas de algunos registros. Abre Mi cuenta y elige cuál conservar.','Revisar cambios');
            else informar('Tus registros están sincronizados.','Sincronizado');
        } catch(error) {
            informar(error.message || 'No se pudo sincronizar. Tus cambios permanecen guardados en este dispositivo.','Pendiente de sincronizar');
        } finally {ocupada=false;dibujarCuenta();}
    }
    $('abrir-cuenta').addEventListener('click',()=>{
        dibujarCuenta();dialog.showModal();
        if(DatosMiDia.cuenta && !DatosMiDia.leer().vinculada)informar('Elige si quieres añadir tus registros locales a esta cuenta.','Elige tus datos');
    });
    $('cerrar-cuenta').addEventListener('click',()=>dialog.close());
    function comprobarCambioCuenta() {
        if(sesionActiva)throw new Error('Termina tu sesión de estudio antes de entrar, registrarte o cerrar sesión.');
    }
    async function acceso(tipo) {
        try {
            comprobarCambioCuenta();
            const email=$('correo-cuenta').value.trim(), password=$('password-cuenta').value;
            if(!email || !$('correo-cuenta').checkValidity())throw new Error('Escribe un correo electrónico válido.');
            if(!password || (tipo==='registrar' && password.length<8))throw new Error('Escribe tu contraseña. Para crear una cuenta utiliza al menos 8 caracteres.');
            ocupada=true;dibujarCuenta();informar('Conectando…');
            const redirect=new URL('./',location.href).href;
            if(tipo==='registrar') {
                const entra=await api.registrar(email,password,redirect);
                if(!entra) {informar('Revisa tu correo para confirmar la cuenta y después entra con tu contraseña.');return;}
            } else await api.entrar(email,password);
            location.reload();
        } catch(error) {informar(error.message || 'No se pudo conectar. Comprueba internet y vuelve a intentarlo.');}
        finally {ocupada=false;$('password-cuenta').value='';dibujarCuenta();}
    }
    $('form-cuenta').addEventListener('submit',evento=>{evento.preventDefault();acceso('entrar');});
    $('registrar-cuenta').addEventListener('click',()=>acceso('registrar'));
    $('recuperar-cuenta').addEventListener('click',async()=>{
        try {
            const email=$('correo-cuenta').value.trim();
            if(!email || !$('correo-cuenta').checkValidity())throw new Error('Escribe tu correo antes de solicitar el enlace.');
            await api.recuperar(email,new URL('./',location.href).href);
            informar('Si el correo corresponde a una cuenta, recibirás un enlace para cambiar la contraseña.');
        } catch(error){informar(error.message);}
    });
    $('salir-cuenta').addEventListener('click',async()=>{
        try {comprobarCambioCuenta();await api.salir();location.reload();}catch(error){informar(error.message);}
    });
    function vincular(importar) {
        try {
            if(editando())document.activeElement.blur();
            DatosMiDia.transaccion(db=>{
                if(importar) {
                    const documentos=Object.fromEntries(claves.map(clave=>[clave,localStorage.getItem(clave)]).filter(([,valor])=>valor!==null));
                    const mezcla=SyncMiDia.combinar(SyncMiDia.vacio(),SyncMiDia.desdeDocumentos(db.datos),SyncMiDia.desdeDocumentos(documentos));
                    if(mezcla.conflictos.length)throw new Error('Hay datos distintos con el mismo identificador. No se ha importado nada.');
                    db.datos=SyncMiDia.aDocumentos(mezcla.datos,db.datos);
                }
                db.vinculada=true;
            });
            refrescarDatos();dibujarCuenta();sincronizar();
        }catch(error){informar(error.message);}
    }
    $('importar-local').addEventListener('click',()=>vincular(true));
    $('solo-nube').addEventListener('click',()=>vincular(false));
    $('sincronizar-ahora').addEventListener('click',sincronizar);
    for(const [boton,preferencia] of [['resolver-local','local'],['resolver-remoto','remoto']]) $(boton).addEventListener('click',()=>{
        try {
            DatosMiDia.transaccion(db=>{db.ultimaResolucion={fecha:Date.now(),conflictos:db.sync?.conflictos || []};});
            motor.resolver(preferencia);dibujarCuenta();sincronizar();
        }catch(error){informar(error.message);}
    });
    $('form-recuperacion').addEventListener('submit',async evento=>{
        evento.preventDefault();
        try {
            const password=$('nueva-password').value;
            if(password.length<8)throw new Error('Utiliza al menos 8 caracteres.');
            await api.cambiarPassword(password);sessionStorage.removeItem('miDiaRecuperacion');
            $('form-recuperacion').hidden=true;informar('Contraseña actualizada.');
        }catch(error){informar(error.message);}finally{$('nueva-password').value='';}
    });
    window.addEventListener('mi-dia:guardado',programar);
    window.addEventListener('online',sincronizar);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sincronizar();});
    window.addEventListener('storage',evento=>{
        if(evento.key!==DatosMiDia.AUTH)return;
        let siguiente=null;
        try {const session=JSON.parse(evento.newValue || 'null');if(session?.project===DatosMiDia.proyecto)siguiente=session.user?.id || null;}catch {}
        // Renovar un token en otra pestaña no debe interrumpir una edición.
        if(siguiente!==DatosMiDia.cuenta)location.reload();
    });
    setInterval(()=>{if(document.visibilityState==='visible')sincronizar();},20000);
    async function iniciar() {
        dibujarCuenta();
        const hash=location.hash;
        if(hash.includes('access_token=') || hash.includes('error_description=')) {
            history.replaceState(null,'',location.pathname+location.search);
            try {
                comprobarCambioCuenta();
                const tipo=await api.callback(hash);
                if(tipo==='recovery')sessionStorage.setItem('miDiaRecuperacion','1');
                if(tipo) {location.reload();return;}
                informar('El enlace de acceso no es válido o ha caducado. Solicita otro enlace.');dialog.showModal();
            }catch(error){informar(error.message);dialog.showModal();}
        }
        if(sessionStorage.getItem('miDiaRecuperacion') && DatosMiDia.cuenta) {$('form-recuperacion').hidden=false;dialog.showModal();}
        if(DatosMiDia.cuenta) {
            if(!DatosMiDia.leer().vinculada) informar('Abre Mi cuenta y elige cómo incorporar tus registros.','Elige tus datos');
            else await sincronizar();
        }
    }
    iniciar().catch(error=>informar(error.message,'Revisar cuenta'));
})();
