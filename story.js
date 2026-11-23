'use strict';

const speakers = {
  soul: {name:'Laiturin kaiku', channel:'ASEMAN KUULUTUS', color:'#90e4d9'},
  kajo: {name:'Kajo', channel:'VASTARINTA · 09', color:'#f4ba70'},
  saro: {name:'Särö', channel:'VASTARINTA · 09', color:'#bedb94'},
  combine: {name:'Combine', channel:'SIEPATTU LÄHETYS', color:'#ff9879'},
  gman: {name:'G-Man', channel:'TUNTEMATON TAAJUUS', color:'#adc4ed'}
};

const dialogue = {
  arrival: ['soul','Kuuletko kuulutuksen? Minä lähetin sen kaksikymmentä vuotta sitten. Kukaan muu ei enää vastaa.'],
  station: ['soul','Kun seitsemän tunnin sota päättyi, Combine vei asemalta kellot. Kaksi kennoa pitää vielä viimeistä junaa paikallaan.'],
  firstCell: ['soul','Kuuletko kiskot? Nyt muistan. Olin junanlähettäjä. Vaunuissa oli ihmisiä, kun mies salkkuineen astui laiturille.'],
  secondCell: ['soul','Ratapihan radio heräsi. Kajo ja Särö jäivät sinne odottamaan junaa. Etsi heidät portin takaa.'],
  greeting: ['kajo','Hei, tänne! Kuulitko sinäkin sen kuulutuksen? Meidän radio toisti tähän asti vain samaa sekuntia.'],
  weapon: ['saro','Ota tämä pulssikivääri. Kajo ja minä avaamme vaihteen. Pidä partio loitolla, kunnes valo vaihtuu.'],
  incoming: ['combine','Valvontakeskus yksiköille. Ratapihalla on luvaton lähetys. Katkaiskaa yhteys.'],
  drones: ['kajo','Kuuntele tuota sirinää. Manhackit tulevat nyt molempia raiteita pitkin!'],
  lastWave: ['saro','Sain vaihteen liikkeelle! Vielä yksi partio. Näen jo junan valot.'],
  clear: ['kajo','Vihreä valo! Me pidämme tämän pään auki. Vie kuulutus terminaalin toiselle puolelle.'],
  gate: ['soul','Laskin aina vaunut, kun juna lähti. Tänään pääsen viimein viimeiseen asti.'],
  boss: ['gman','Junan piti jäädä asemalle, herra Freeman. Kuka antoi teille luvan vaihtaa raidetta?'],
  fracture: ['gman','Kuulitteko? Aseman kello löi juuri saman lyönnin kahdesti.'],
  decoy: ['soul','Katselin häntä silloin laiturilla. Vain oikean miehen ympärillä valo oli kultainen.'],
  goodbye: ['soul','Viimeinen vaunu ohitti merkin. Kiitos, Freeman. Täällä junanlähettäjä. Kuittaan.']
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
  connect(ctx, output) {
    if(!ctx||!output)return;
    this.ctx=ctx;this.output=output;
    if(!this.loading){
      this.loading=fetch('assets/radio.mp3').then(r=>{
        if(!r.ok)throw Error('radio');
        return r.arrayBuffer();
      }).then(data=>ctx.decodeAudioData(data)).then(buffer=>{this.buffer=buffer;this.playClip()}).catch(()=>{this.fallback=true;this.playClip()});
    }
  }
  stopClip() {
    if(this.source){this.source.stop();this.source=null}
    if(this.utterance){window.speechSynthesis?.cancel();this.utterance=null}
  }
  playClip() {
    this.stopClip();
    if(!this.current||this.paused||!this.prefs.sound)return;
    const [offset,length]=radioClips[this.current];
    if(this.age>=length)return;
    if(this.buffer){
      const clip=this.ctx.createBufferSource();
      clip.buffer=this.buffer;clip.connect(this.output);
      // Start a newly downloaded first line from its beginning.
      if(!this.started)this.age=0;
      clip.start(0,offset+this.age,length-this.age);
      this.source=clip;this.started=true;
    }else if(this.fallback&&window.speechSynthesis){
      const u=new SpeechSynthesisUtterance(dialogue[this.current][1]);
      u.lang='fi-FI';u.volume=this.prefs.volume/100;window.speechSynthesis.speak(u);this.utterance=u;
    }
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
    if(!this.current||this.paused)return;
    this.age+=dt;
    if(this.age>radioClips[this.current][1]+.45)this.next();
  }
}
