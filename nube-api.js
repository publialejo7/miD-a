const NubeMiDia = (() => {
    class API {
        constructor(config, storage = localStorage, peticion = fetch) {
            this.config=config;this.storage=storage;this.peticion=peticion;this.refreshPromise=null;
            this.url=(config.url || '').replace(/\/$/,'');
        }
        configurada() {return !!this.url && !!this.config.publicKey;}
        verificarConfig() {
            if(!this.configurada()) throw new Error('La sincronización aún no está conectada. Hay que configurar el proyecto de Supabase.');
            if(new URL(this.url).protocol !== 'https:') throw new Error('La conexión a tu cuenta debe usar HTTPS.');
            const key=this.config.publicKey;
            if(key.startsWith('sb_secret_'))throw new Error('Utiliza la clave pública publishable, nunca una clave secreta.');
            if(key.startsWith('ey')) {
                try {if(JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='service_role')throw new Error('Clave secreta');}
                catch(error){if(error.message==='Clave secreta')throw new Error('Nunca publiques la clave service_role. Utiliza la clave pública.');}
            }
        }
        sesion() {
            try {const session=JSON.parse(this.storage.getItem('miDiaAuthV1') || 'null');return session?.project===this.url ? session : null;}catch{return null;}
        }
        guardarSesion(datos) {
            if(!datos.access_token || !datos.refresh_token || !datos.user?.id)throw new Error('Respuesta de acceso incompleta.');
            const session={project:this.url,access_token:datos.access_token,refresh_token:datos.refresh_token,
                expires_at:datos.expires_at || Math.floor(Date.now()/1000)+(datos.expires_in || 3600),user:{id:datos.user.id,email:datos.user.email}};
            this.storage.setItem('miDiaAuthV1',JSON.stringify(session));
            return session;
        }
        async request(ruta,{method='GET',body,token}={}) {
            this.verificarConfig();
            const response=await this.peticion(this.url+ruta,{method,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000),
                headers:{apikey:this.config.publicKey,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
                ...(body?{body:JSON.stringify(body)}:{})});
            const raw=await response.text();let data;
            try {data=raw?JSON.parse(raw):null;}catch {throw new Error('El servidor devolvió una respuesta no válida.');}
            if(!response.ok) {
                if(response.status===429)throw new Error('Demasiados intentos. Espera unos minutos y vuelve a intentarlo.');
                if(response.status===401 || response.status===403)throw new Error('No se pudo autorizar el acceso. Comprueba tu correo y contraseña o vuelve a iniciar sesión.');
                if(ruta.includes('/auth/') && response.status===400)throw new Error('No se pudo completar el acceso. Revisa tus datos, la confirmación del correo o solicita otro enlace.');
                throw new Error('No se pudo completar la petición. Comprueba la conexión y la configuración del proyecto.');
            }
            return data;
        }
        async entrar(email,password) {
            const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
            return this.guardarSesion(data);
        }
        async registrar(email,password,redirect) {
            const data=await this.request('/auth/v1/signup?redirect_to='+encodeURIComponent(redirect),{method:'POST',body:{email,password}});
            if(data.access_token)this.guardarSesion(data);
            return !!data.access_token;
        }
        async token() {
            const refresh=async()=>{
                const session=this.sesion();
                if(!session)throw new Error('Inicia sesión para sincronizar.');
                if(session.expires_at>Date.now()/1000+60)return session.access_token;
                const data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
                return this.guardarSesion(data).access_token;
            };
            if(!this.refreshPromise) {
                const locks=globalThis.navigator?.locks;
                this.refreshPromise=(locks?locks.request('mi-dia-auth-refresh',refresh):refresh()).finally(()=>this.refreshPromise=null);
            }
            return this.refreshPromise;
        }
        async recuperar(email,redirect) {
            await this.request('/auth/v1/recover?redirect_to='+encodeURIComponent(redirect),{method:'POST',body:{email}});
        }
        async cambiarPassword(password) {await this.request('/auth/v1/user',{method:'PUT',token:await this.token(),body:{password}});}
        async salir() {
            try {const s=this.sesion();if(s)await this.request('/auth/v1/logout?scope=local',{method:'POST',token:await this.token()});}catch {}
            this.storage.removeItem('miDiaAuthV1');
        }
        async callback(hash) {
            const params=new URLSearchParams(hash.replace(/^#/,''));
            if(!params.has('access_token'))return null;
            const token=params.get('access_token');
            const user=await this.request('/auth/v1/user',{token});
            this.guardarSesion({access_token:token,refresh_token:params.get('refresh_token'),expires_in:Number(params.get('expires_in')) || 3600,user});
            return params.get('type');
        }
        async descargar() {
            const token=await this.token(), session=this.sesion();
            const rows=await this.request('/rest/v1/mi_dia_states?select=data,revision&user_id=eq.'+encodeURIComponent(session.user.id),{token});
            if(!Array.isArray(rows))throw new Error('Respuesta de sincronización no válida.');
            return rows[0] || {revision:0,data:SyncMiDia.vacio()};
        }
        async subir(revision,data) {
            return this.request('/rest/v1/rpc/save_mi_dia',{method:'POST',token:await this.token(),body:{p_expected_revision:revision,p_data:data}});
        }
    }
    return {API};
})();
if(typeof module!=='undefined')module.exports=NubeMiDia;
