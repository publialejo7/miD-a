// Catálogo propio y local. Los dibujos son esquemas originales, no fotografías ni guías técnicas.
const CatalogoGimnasio = (() => {
    const grupos = [
        ['press-banca','Press banca','Pecho','Banco y barra','press',['Barra · agarre medio','Barra · agarre cerrado','Mancuernas · agarre neutro','Mancuernas · agarre prono']],
        ['press-inclinado','Press inclinado','Pecho','Banco y mancuernas','press',['Mancuernas','Barra']],
        ['aperturas','Aperturas','Pecho','Polea','apertura',['Poleas altas','Poleas a media altura','Mancuernas en banco']],
        ['flexiones','Flexiones','Pecho','Peso corporal','flexion',['Apoyo estándar','Apoyo estrecho','Con rodillas apoyadas']],
        ['jalon','Jalón al pecho','Espalda','Polea','jalon',['Agarre prono ancho','Agarre neutro cerrado','Agarre supino']],
        ['remo-polea','Remo sentado','Espalda','Polea','remo',['Agarre neutro cerrado','Agarre prono ancho','Unilateral']],
        ['remo-mancuerna','Remo con mancuerna','Espalda','Mancuernas','remo',['Unilateral con apoyo','Bilateral inclinado']],
        ['dominadas','Dominadas','Espalda','Barra fija','jalon',['Agarre prono','Agarre supino','Agarre neutro','Máquina asistida']],
        ['sentadilla','Sentadilla','Piernas','Barra','sentadilla',['Barra alta','Barra frontal','Goblet con mancuerna','Peso corporal']],
        ['prensa','Prensa de piernas','Piernas','Máquina','prensa',['Prensa inclinada','Prensa horizontal','Unilateral']],
        ['extension','Extensión de piernas','Piernas','Máquina','extension',['Bilateral','Unilateral']],
        ['curl-piernas','Curl de piernas','Piernas','Máquina','curlpierna',['Sentado','Tumbado','Unilateral']],
        ['peso-muerto','Peso muerto','Piernas','Barra','bisagra',['Convencional','Rumano con barra','Rumano con mancuernas','Sumo']],
        ['hip-thrust','Hip thrust','Glúteos','Banco y barra','puente',['Barra','Máquina','Peso corporal']],
        ['zancada','Zancadas','Piernas','Mancuernas','zancada',['Estáticas','Caminando','Hacia atrás']],
        ['gemelos','Elevación de talones','Piernas','Máquina','gemelos',['De pie','Sentado','Peso corporal']],
        ['press-hombro','Press de hombros','Hombros','Mancuernas','hombro',['Mancuernas · sentado','Barra · de pie','Máquina · agarre neutro']],
        ['laterales','Elevaciones laterales','Hombros','Mancuernas','apertura',['Mancuernas','Polea unilateral','Máquina']],
        ['face-pull','Face pull','Hombros','Polea','remo',['Cuerda · agarre neutro']],
        ['curl-biceps','Curl de bíceps','Bíceps','Mancuernas','curl',['Mancuernas · supino','Mancuernas · martillo','Barra recta','Barra EZ','Polea']],
        ['triceps','Extensión de tríceps','Tríceps','Polea','triceps',['Cuerda','Barra recta','Unilateral','Sobre la cabeza con cuerda']],
        ['fondos','Fondos','Tríceps','Paralelas','fondos',['Peso corporal','Máquina asistida']],
        ['elevacion-piernas','Elevación de piernas','Abdomen','Peso corporal','crunch',['En suelo','En paralelas','En barra fija']],
        ['crunch','Crunch','Abdomen','Peso corporal','crunch',['En suelo','En polea','En máquina']]
    ];
    const lista=grupos.map(([id,nombre,musculo,equipo,dibujo,variantes])=>({id,nombre,musculo,equipo,dibujo,variantes}));
    // Dibujos hechos con trazos SVG: cuerpo, aparato y dirección del movimiento.
    const poses={
        press:'M23 69H76M29 69V84M70 69V84M45 62L64 62L76 78M47 61L41 41L67 41M34 35H75M34 30V40M75 30V40',
        apertura:'M50 42V67M50 49L28 39L18 49M50 49L72 39L82 49M50 67L37 88M50 67L63 88M12 25V82M88 25V82M12 27L28 39M88 27L72 39',
        jalon:'M50 43V67M50 48L32 34L25 23M50 48L68 34L75 23M50 67L37 85M50 67L63 85M18 18H82M18 18V88M82 18V88M25 23H75',
        remo:'M49 43L43 64L61 70L74 68M48 48L65 47L78 49M26 70H52M29 70V85M78 49L88 35M88 22V83',
        sentadilla:'M50 38L44 57L65 66L53 84M44 57L28 68L37 85M48 43L29 37M48 43L68 37M23 32H77M23 27V37M77 27V37',
        prensa:'M28 45L38 64L60 63L70 44M38 64L65 72L79 52M19 39L31 75M31 75H58M68 32L87 52M25 84H86',
        extension:'M37 40V63H59L79 48M37 63L59 72L81 72M24 66H54M26 66V85M52 66V85M74 44L86 57',
        curlpierna:'M39 40V63L63 64L66 84M39 63L58 71L49 86M25 64H59M28 64V86M57 64V84M61 81H76',
        bisagra:'M53 40L35 57L48 69L41 87M35 57L25 73L33 87M49 44L59 70M52 72H79M52 67V77M79 67V77',
        puente:'M26 55L48 53L68 64L73 83M48 53L58 78L75 83M16 64H36M19 64V83M41 49H60',
        zancada:'M50 38V59L29 62L25 85M50 59L64 77L83 78M48 45L35 62M52 45L62 62M29 64H41M57 64H69',
        gemelos:'M50 38V65L44 83L56 83M50 65L62 80L73 80M43 88H79M38 44L30 67M61 44L70 67',
        hombro:'M50 42V64M50 47L31 47V28M50 47L69 47V28M50 64L34 86M50 64L66 86M25 25H37M63 25H75',
        curl:'M50 40V66M50 47L31 62L27 43M50 47L69 62L73 43M50 66L37 88M50 66L63 88M21 40H33M67 40H79',
        triceps:'M48 39V65M48 45L63 51L65 70M48 65L34 86M48 65L62 86M60 73H75M68 20V50M68 20H87',
        fondos:'M50 37L47 59L57 73L49 85M48 43L31 56L30 66M48 43L66 56L70 66M21 66H38M62 66H79M24 66V89M76 66V89',
        flexion:'M27 59L64 66L83 76M35 61L27 82M59 65L68 82M18 86H88',
        crunch:'M28 64L46 59L62 75L81 74M46 59L52 43L67 49M24 83H87'
    };
    function imagen(e) {
        const tipo=lista.find(x=>x.id===e.catalogoId)?.dibujo || e.dibujo || 'hombro';
        const cabeza={press:[38,61],remo:[52,34],prensa:[26,36],extension:[37,30],curlpierna:[39,30],bisagra:[60,35],puente:[18,57],fondos:[51,27],flexion:[20,55],crunch:[20,66]}[tipo] || [50,28];
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#eaf1fd"/><path d="M12 91H88" stroke="#b8cee9"/><g fill="none" stroke="#31629c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="${cabeza[0]}" cy="${cabeza[1]}" r="7"/><path d="${poses[tipo] || poses.hombro}"/></g></svg>`;
        return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    }
    function filtrar(busqueda='',musculo='',equipo='') {
        const normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        return lista.filter(e=>(!musculo || e.musculo===musculo) && (!equipo || normal([e.equipo,...e.variantes].join(' ')).includes(normal(equipo))) && normal([e.nombre,e.musculo,e.equipo,...e.variantes].join(' ')).includes(normal(busqueda)));
    }
    return {lista,imagen,filtrar};
})();
if(typeof module!=='undefined')module.exports=CatalogoGimnasio;
