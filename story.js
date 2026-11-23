'use strict';

const speakers = {
  soul: {name:'Junanlähettäjä', channel:'ASEMAN RADIO', color:'#90e4d9'},
  kajo: {name:'Kajo', channel:'VASTARINTA · 09', color:'#f4ba70'},
  saro: {name:'Särö', channel:'VASTARINTA · 09', color:'#bedb94'},
  combine: {name:'Combine', channel:'SIEPATTU LÄHETYS', color:'#ff9879'},
  gman: {name:'G-Man', channel:'TUNTEMATON TAAJUUS', color:'#adc4ed'}
};

const dialogue = {
  arrival: ['soul','Tarkastusjuna saapuu raiteelle kolme. Matkustajat pysyvät vaunuissa.'],
  station: ['soul','Vaihde on lukossa. Kaksi virtakennoa puuttuu. Etsi ne ja tuo releelle.'],
  firstCell: ['soul','Olin täällä töissä ennen sotaa. Sitten Combine vei asemalta ihmiset ja kellot.'],
  secondCell: ['soul','Ratapihalta kuuluu vastarinnan radio. Kajo ja Särö ovat yhä siellä. Mene huolto-ovesta.'],
  greeting: ['kajo','Siinä sinä olet. Särö, anna kivääri. Me pidämme vaihteen auki.'],
  weapon: ['saro','Lipas on täynnä. Tähtää rauhassa. Ne tulevat kolmessa aallossa.'],
  incoming: ['combine','Yksiköt, aseistettu tunkeilija ratapihalla. Sulkekaa alue.'],
  drones: ['kajo','Manhackit! Pidä ne kaukana. Ne eivät pysy maassa sekuntiakaan.'],
  lastWave: ['saro','Viimeinen partio. Kun se kaatuu, portti aukeaa.'],
  clear: ['kajo','Siinä se. Vaihde on vapaa. Mene terminaaliin. Me hoidamme loput.'],
  gate: ['soul','Juna on valmis. Vielä yksi pysäkki, sitten pääsen kotiin.'],
  boss: ['gman','Aina yhtä kiireinen, herra Freeman. Tämä rata ei kuulu teille.'],
  fracture: ['gman','Aika tekee teille tepposet. Se ei kuitenkaan odota ketään.'],
  decoy: ['soul','Älä seuraa kaikua. Etsi se, jonka varjo on oikea.'],
  goodbye: ['soul','Raide vapaa. Hyvää matkaa, herra Freeman. Kuittaan.']
};

class CampaignRadio {
  constructor(box, prefs) {
    this.box=box;
    this.name=box.querySelector('b');
    this.channel=box.querySelector('small');
    this.words=box.querySelector('p');
    this.prefs=prefs;
    this.queue=[];
    this.current=null;
    this.paused=true;
    try {
      const saved=JSON.parse(localStorage.getItem('lambda.radioLog')||'[]');
      this.history=Array.isArray(saved)?saved.filter(item=>item&&typeof item.name==='string'&&typeof item.channel==='string'&&typeof item.line==='string').slice(-40):[];
    } catch { this.history=[]; }
  }
  connect() {
    if(!window.speechSynthesis||this.voiceListener)return;
    this.voiceListener=()=>{
      if(this.current&&!this.paused&&!this.utterance&&this.prefs.voiceMode!=='off')this.playClip();
    };
    window.speechSynthesis.addEventListener?.('voiceschanged',this.voiceListener);
  }
  stopClip() {
    if(this.source){this.source.stop();this.source=null}
    if(this.utterance){window.speechSynthesis?.cancel();this.utterance=null}
  }
  finnishVoice() {
    if(!window.speechSynthesis)return null;
    return window.speechSynthesis.getVoices()
      .filter(v=>/^fi([-_]|$)/i.test(v.lang||''))
      .sort((a,b)=>Number(b.localService)-Number(a.localService))[0]||null;
  }
  playClip() {
    this.stopClip();
    if(!this.current||this.paused||!this.prefs.sound)return;
    const line=dialogue[this.current][1];
    this.age=0;this.silentDuration=Math.max(2.4,line.length/14);
    if(this.prefs.voiceMode==='off'||!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined')return;
    const voice=this.finnishVoice();
    if(!voice)return; // Keep the subtitle; never play an old recording that says different words.
    const u=new SpeechSynthesisUtterance(line);
    u.voice=voice;u.lang=voice.lang;u.rate=.94;u.pitch=.96;u.volume=this.prefs.volume/100;
    u.onend=()=>{if(this.utterance===u){this.utterance=null;if(!this.paused)this.next()}};
    u.onerror=()=>{if(this.utterance===u){this.utterance=null;this.age=0}};
    this.utterance=u;window.speechSynthesis.speak(u);
  }
  clear() {this.stopClip();this.queue=[];this.current=null;this.box.hidden=true}
  pause() {this.paused=true;this.stopClip()}
  resume() {this.paused=false;this.playClip()}
  say(...ids) {
    this.queue.push(...ids);
    if(!this.current)this.next();
  }
  next() {
    this.stopClip();this.current=this.queue.shift();
    if(!this.current){this.box.hidden=true;return}
    const [who,line]=dialogue[this.current],person=speakers[who];
    this.started=false;this.age=0;
    this.box.style.setProperty('--voice',person.color);
    this.box.dataset.person=who;this.channel.textContent=person.channel;
    this.name.textContent=person.name;this.words.textContent=line;this.box.hidden=false;
    this.history.push({name:person.name,channel:person.channel,line});
    if(this.history.length>40)this.history.shift();
    try{localStorage.setItem('lambda.radioLog',JSON.stringify(this.history))}catch{}
    this.playClip();
  }
  update(dt) {
    if(!this.current||this.paused||this.utterance)return;
    this.age+=dt;
    if(this.age>(this.silentDuration||3.2))this.next();
  }
}
