'use strict';
class CityGame {
  constructor(canvas, ui) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d',{alpha:false}); this.ui=ui;
    this.map=[
      '1111111111111111111111',
      '1222221111333333222221',
      '1222221111333333222221',
      '1222220000000000000221',
      '1222220000000000000221',
      '1000000000000000000001',
      '1000000000000011100001',
      '1000000000000011100001',
      '1000000000000000000001',
      '1000000000000000000001',
      '1000000333000000000001',
      '1222000333000000000001',
      '1222000333000022200331',
      '1222000000000022200331',
      '1222222220000022200331',
      '1111111111111111111111'
    ];
    this.streetMap=this.map;
    this.station={x:12.6,y:6.2,type:'station'}; this.exit={x:17.6,y:3.28,type:'exit'};
    this.textures=[null,...[0,1,2].map(n=>this.makeWall(n))];this.floor=this.makeFloor();this.sky=this.makeSky();
    this.sprites={};for(const type of ['cell','station','exit','exitOpen'])this.sprites[type]=this.makeSprite(type);
    this.keys=new Set();this.joy={x:0,y:0};this.running=false;this.frameId=0;
    this.held=-1;this.beam=0;this.bob=0;this.messageEnd=0;this.cameraPitch=0;
    this.vx=0;this.vy=0;this.verticalVelocity=0;this.jumpHeight=0;this.grounded=true;
    this.pixelBudget=460000;this.frameSample=0;this.sampleFrames=0;
    this.reset();
    gameArt(this);railArt(this);
  }
  reset() {
    this.map=this.streetMap;this.encounter=null;this.yard=null;this.storyStarted=false;this.ui.radio.clear();this.dashTime=0;this.dashCooldown=0;
    this.dashX=0;this.dashY=0;this.walkForward=0;this.walkSide=0;this.footstep=0;
    this.vx=0;this.vy=0;this.verticalVelocity=0;this.jumpHeight=0;this.grounded=true;
    this.x=3.3;this.y=8.5;this.angle=-.08;this.cameraPitch=0;this.held=-1;this.done=0;this.elapsed=0;
    this.cells=[{x:6.6,y:8.1,type:'cell',inPlace:false},{x:16.8,y:10.3,type:'cell',inPlace:false}];
    this.completed=false;this.beam=0;this.bob=0;
  }
  value(x,y){return Number(this.map[Math.floor(y)]?.[Math.floor(x)]??1)}
  clear(x,y,r=.19){return !this.value(x-r,y-r)&&!this.value(x+r,y-r)&&!this.value(x-r,y+r)&&!this.value(x+r,y+r)}
  get spirit(){
    const pos=[{x:6.62,y:7.65},{x:11.7,y:7.15},{x:16.8,y:4.5}][this.done];
    return {...pos,type:'soul',height:1.88,aspect:.427,z:.06+.055*Math.sin(this.elapsed*2.6),alpha:.92};
  }
  get nearSpirit(){return this.distance(this.spirit)<3.8&&this.visible(this.spirit)&&Math.cos(Math.atan2(this.spirit.y-this.y,this.spirit.x-this.x)-this.angle)>.82}
  openYard(checkpoint={}){
    this.ui.notice.textContent='';this.encounter=null;this.yard=new RailYard(this,checkpoint);
    this.beam=0;this.dashTime=0;this.dashCooldown=0;this.vx=0;this.vy=0;this.verticalVelocity=0;this.jumpHeight=0;this.grounded=true;this.ui.radio.clear();
    if(this.yard.clear)this.ui.radio.say('clear','gate');
    else if(!this.yard.armed)this.ui.radio.say('greeting');
    this.updateUI();this.ui.save();
  }
  openTerminal(checkpoint=0){
    this.yard=null;this.ui.radio.clear();
    this.ui.radio.say(checkpoint===4?'decoy':checkpoint===2?'fracture':'boss');
    this.vx=0;this.vy=0;this.verticalVelocity=0;this.jumpHeight=0;this.grounded=true;
    this.encounter=new GManEncounter(this,checkpoint);this.dashTime=0;this.dashCooldown=0;
    this.beam=0;this.ui.tone(95);this.updateUI();
    this.tell('Sieppaa sininen pallo painovoima-aseella.');this.ui.save();
  }
  dash(){
    if(!this.running||this.dashCooldown>0||this.encounter?.result)return;
    let dx=this.vx,dy=this.vy,length=Math.hypot(dx,dy);
    if(length<.65){
      let forward=this.walkForward,side=this.walkSide;
      if(Math.hypot(forward,side)<.1)forward=1;
      const inputLength=Math.hypot(forward,side),co=Math.cos(this.angle),si=Math.sin(this.angle);
      dx=(co*forward-si*side)/inputLength;dy=(si*forward+co*side)/inputLength;
    }else{dx/=length;dy/=length}
    this.vx+=dx*4.4;this.vy+=dy*4.4;
    this.dashTime=.18;this.dashCooldown=1.35;this.ui.tone(135);
  }
  serialize(){
    if(this.encounter)return {stage:'terminal',checkpoint:this.encounter.checkpoint,elapsed:this.elapsed};
    if(this.yard)return this.yard.checkpoint();
    return {stage:'station',x:this.x,y:this.y,angle:this.angle,held:this.held,cells:this.cells,elapsed:this.elapsed}}
  restore(s) {
    if(s?.stage==='yard'&&typeof s.armed==='boolean'&&Number.isInteger(s.wave)&&s.wave>=0&&s.wave<=3&&(s.armed||s.wave===0)&&Number.isFinite(s.elapsed)&&s.elapsed>=0){
      this.reset();this.elapsed=s.elapsed;this.openYard(s);return true;
    }
    if(s?.stage==='terminal'&&[0,2,4].includes(s.checkpoint)&&Number.isFinite(s.elapsed)&&s.elapsed>=0){
      this.reset();this.elapsed=s.elapsed;this.openTerminal(s.checkpoint);return true;
    }
    if(!s||!Number.isFinite(s.x)||!Number.isFinite(s.y)||!Number.isFinite(s.angle)||!this.clear(s.x,s.y)||!Array.isArray(s.cells)||s.cells.length!==2||![-1,0,1].includes(s.held)||!Number.isFinite(s.elapsed)||s.elapsed<0)return false;
    if(!s.cells.every(c=>c&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&!this.value(c.x,c.y)&&typeof c.inPlace==='boolean')||(s.held>=0&&s.cells[s.held].inPlace))return false;
    this.reset();this.x=s.x;this.y=s.y;this.angle=s.angle;this.held=s.held;this.elapsed=s.elapsed;this.cells=s.cells.map(c=>({...c,type:'cell'}));this.done=this.cells.filter(c=>c.inPlace).length;return true;
  }
  makeCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
  random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
  makeWall(style) {
    const c=this.makeCanvas(128,384),g=c.getContext('2d'),rand=this.random(91+style);
    const colors=[[109,109,101],[128,116,99],[108,103,90]][style];
    const buf=g.createImageData(128,384);
    for(let y=0;y<384;y++)for(let x=0;x<128;x++){
      const block=(Math.floor((x+(Math.floor(y/10)%2)*8)/17)*113+Math.floor(y/10)*73)%7;
      const stain=Math.sin(x*.09)*Math.sin(y*.012)*5+(rand()-.5)*17+block;
      const seam=y%10===0||((x+Math.floor(y/10)%2*8)%17===0)?9:0;
      const i=(y*128+x)*4;for(let k=0;k<3;k++)buf.data[i+k]=colors[k]+stain-seam;buf.data[i+3]=255;
    }
    g.putImageData(buf,0,0);
    for(let y=12;y<325;y+=63){
      g.fillStyle='#3b3c37';g.fillRect(0,y-4,128,3);g.fillStyle='#aaa190';g.fillRect(0,y,128,4);
      for(let x=11;x<128;x+=63){
        g.fillStyle='#5c594d';g.fillRect(x-4,y+7,47,46);g.fillStyle='#9b9383';g.fillRect(x-2,y+5,43,47);
        const grad=g.createLinearGradient(x,y+6,x+36,y+48);grad.addColorStop(0,rand()>.8?'#b29564':'#536061');grad.addColorStop(.53,'#353e40');grad.addColorStop(1,'#202929');g.fillStyle=grad;g.fillRect(x+1,y+9,37,39);
        g.fillStyle='#66675e';g.fillRect(x+17,y+8,3,40);g.fillRect(x,y+24,38,3);
        g.fillStyle='#4c4940';g.fillRect(x-4,y+51,47,4);g.fillStyle='#b1a994';g.fillRect(x-4,y+49,47,3);
      }
    }
    g.fillStyle='#5e615a';g.fillRect(0,333,128,51);g.fillStyle='#969185';g.fillRect(0,330,128,7);g.fillStyle='#373d3a';g.fillRect(18,342,34,42);g.fillStyle='#52574f';g.fillRect(21,345,28,39);g.fillStyle='#939084';g.fillRect(43,361,3,2);
    for(let x=64;x<128;x+=5){g.fillStyle=x%2?'#515950':'#70756a';g.fillRect(x,347,3,21)}
    g.fillStyle='#474c48';g.fillRect(0,0,128,6);g.fillStyle='#a39e90';g.fillRect(0,6,128,3);
    return g.getImageData(0,0,128,384).data;
  }
  makeFloor(){
    const a=new Uint8ClampedArray(128*128*3),r=this.random(199);
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      const row=Math.floor(y/8),col=Math.floor((x+(row%2)*8)/16),edge=y%8===0||(x+(row%2)*8)%16===0;
      const n=78+((row*11+col*17)%12)+(r()-.5)*17-(edge?24:0);
      const i=(y*128+x)*3;a[i]=n;a[i+1]=n+2;a[i+2]=n;
    }return a;
  }
  makeSky(){
    const c=this.makeCanvas(2048,350),g=c.getContext('2d'),r=this.random(48);
    const grad=g.createLinearGradient(0,0,0,350);grad.addColorStop(0,'#273744');grad.addColorStop(.43,'#5a6b73');grad.addColorStop(.76,'#89918e');grad.addColorStop(1,'#a5a391');g.fillStyle=grad;g.fillRect(0,0,2048,350);
    const haze=g.createRadialGradient(1020,245,10,1020,245,430);haze.addColorStop(0,'#d0b99435');haze.addColorStop(1,'#c7c1ae00');g.fillStyle=haze;g.fillRect(480,0,1080,350);
    for(let i=0;i<210;i++){const x=r()*2048,y=r()*180,rad=24+r()*105;const cloud=g.createRadialGradient(x,y,0,x,y,rad);cloud.addColorStop(0,'#c2c8c11c');cloud.addColorStop(1,'#c2c8c100');g.fillStyle=cloud;g.fillRect(x-rad,y-rad,rad*2,rad*2)}
    // Far industrial blocks, pipes and water towers.
    for(let i=0;i<118;i++){
      const x=r()*2048,w=12+r()*42,h=28+r()*94,base=286+r()*20,shade=42+Math.floor(r()*28);
      g.fillStyle='rgb('+shade+','+(shade+9)+','+(shade+11)+')';g.fillRect(x,base-h,w,h+80);
      g.fillStyle='#9a9a8950';g.fillRect(x+2,base-h+4,2,h-4);
      if(i%3===0){g.fillStyle='#303e43';g.fillRect(x+w*.48,base-h-13,3,13);g.fillRect(x+w*.18,base-h-4,w*.64,3)}
      for(let wy=base-h+10;wy<base-5;wy+=12)for(let wx=x+4;wx<x+w-3;wx+=8){if(r()>.63){g.fillStyle=r()>.4?'#e2bd8050':'#8fb4b34a';g.fillRect(wx,wy,3,4)}}
    }
    // A distant Combine-style tower, deliberately narrow and hazy.
    g.fillStyle='#35464e';g.beginPath();g.moveTo(890,310);g.lineTo(922,206);g.lineTo(934,154);g.lineTo(946,111);g.lineTo(952,58);g.lineTo(963,14);g.lineTo(973,78);g.lineTo(981,119);g.lineTo(998,157);g.lineTo(1011,220);g.lineTo(1040,310);g.closePath();g.fill();
    g.fillStyle='#263941';g.fillRect(960,72,8,210);g.fillRect(949,153,31,4);
    g.fillStyle='#80b5b34f';g.fillRect(961,94,3,168);g.fillRect(971,112,2,149);
    g.fillStyle='#46565c';g.fillRect(945,178,40,9);g.fillRect(932,230,69,7);
    // Crane silhouettes and hanging cables add recognisable industrial scale.
    g.strokeStyle='#303f45';g.lineWidth=4;g.beginPath();g.moveTo(210,286);g.lineTo(210,110);g.lineTo(420,110);g.lineTo(420,286);g.moveTo(210,130);g.lineTo(420,110);g.stroke();
    g.lineWidth=2;g.beginPath();g.moveTo(375,112);g.lineTo(375,214);g.moveTo(1480,290);g.lineTo(1480,95);g.lineTo(1705,95);g.lineTo(1705,290);g.moveTo(1480,118);g.lineTo(1705,95);g.stroke();
    for(const [x,y] of [[375,214],[1642,202]]){g.beginPath();g.moveTo(x,y-30);g.lineTo(x,y+8);g.stroke()}
    // Foreground rooftop silhouettes and a band of dirty industrial fog.
    g.fillStyle='#313f43';g.fillRect(0,286,2048,64);
    for(let i=0;i<45;i++){const x=r()*2048,w=18+r()*62,h=10+r()*48;g.fillStyle=i%2?'#27363b':'#3b494b';g.fillRect(x,286-h,w,h+65);if(i%4===0){g.fillRect(x+w*.22,286-h-14,4,14);g.fillRect(x+w*.72,286-h-7,3,7)}}
    const fog=g.createLinearGradient(0,255,0,350);fog.addColorStop(0,'#a5a38e00');fog.addColorStop(1,'#c0b9a58a');g.fillStyle=fog;g.fillRect(0,255,2048,95);
    return c;
  }
  makeSprite(type){
    const c=this.makeCanvas(128,176),g=c.getContext('2d'),rect=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,y,w,h)};
    g.fillStyle='#121b1e66';g.beginPath();g.ellipse(65,169,type==='cell'?39:57,6,0,0,7);g.fill();
    if(type==='cell'){
      rect('#2b3334',28,39,72,124);rect('#4e5755',34,31,59,9);rect('#181e1f',42,20,43,12);rect('#77807b',48,22,30,4);
      const glow=g.createLinearGradient(27,0,101,0);glow.addColorStop(0,'#b96230');glow.addColorStop(.32,'#ffad55');glow.addColorStop(.67,'#f39442');glow.addColorStop(1,'#a4542b');rect(glow,32,53,64,90);
      for(let i=61;i<143;i+=17){rect('#70482f',34,i,60,4);rect('#ffc176',36,i+4,56,2)}
      rect('#3a4242',28,43,72,10);rect('#9e9a83',31,43,65,3);rect('#474d47',28,144,72,16);rect('#a4a18d',30,143,67,4);
      rect('#303b3b',50,78,28,25);g.fillStyle='#fac07c';g.font='bold 21px Arial';g.fillText('λ',57,98);
    } else if(type==='station'){
      rect('#263231',6,145,117,20);rect('#67706a',10,143,109,5);rect('#485457',21,85,88,58);rect('#2b383a',27,89,72,46);
      for(let x=35;x<95;x+=10)rect('#53625f',x,98,5,30);
      rect('#2e3d40',26,32,77,58);rect('#72827e',24,30,81,5);rect('#1e585e',31,40,66,35);rect('#86ddd8',34,43,60,26);g.fillStyle='#255454';g.font='bold 19px monospace';g.fillText('RELE',40,63);
      rect('#3d4746',35,15,4,16);rect('#a7ece1',34,9,6,7);
    } else {
      rect('#252c2c',10,6,108,159);rect('#6c736c',15,9,98,155);rect('#333e3e',22,16,83,144);rect('#4b5553',26,19,34,139);rect('#48514e',65,19,35,139);
      rect(type==='exitOpen'?'#9becb4':'#bd8658',25,23,75,6);for(let y=37;y<148;y+=20)rect('#66716c',28,y,68,2);
      rect('#242e2e',32,66,63,32);g.fillStyle=type==='exitOpen'?'#a9ffcd':'#e3a06c';g.font='bold 20px monospace';g.fillText('EXIT',39,89);
    }return c;
  }
  start(){
    this.running=true;this.ui.radio.resume();
    if(!this.encounter&&!this.yard&&!this.storyStarted){
      this.storyStarted=true;
      if(!this.done)this.ui.radio.say('arrival','station');else this.ui.radio.say(this.done===1?'firstCell':'secondCell');
    }
    this.frameSample=0;this.sampleFrames=0;this.keys.clear();this.joy={x:0,y:0};this.last=performance.now();this.frameId=requestAnimationFrame(t=>this.frame(t));this.updateUI();
  }
  stop(){this.running=false;this.ui.radio.pause();if(this.yard)this.yard.trigger=false;cancelAnimationFrame(this.frameId);this.keys.clear();this.joy={x:0,y:0}}
  tell(msg){this.ui.notice.textContent=msg;this.messageEnd=performance.now()+2800}
  distance(o){return Math.hypot(o.x-this.x,o.y-this.y)}
  visible(o){
    const dx=o.x-this.x,dy=o.y-this.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)*7));
    for(let i=1;i<n;i++)if(this.value(this.x+dx*i/n,this.y+dy*i/n))return false;return true;
  }
  nearbyCell(){return this.cells.findIndex(c=>!c.inPlace&&this.distance(c)<3.4&&Math.cos(Math.atan2(c.y-this.y,c.x-this.x)-this.angle)>.88&&this.visible(c))}
  action(fire=false){
    if(!this.running)return;
    if(this.encounter){this.encounter.input();return}
    if(this.yard){this.yard.use(fire);return}
    if(this.done===2&&this.distance(this.exit)<1.8){this.openYard();return}
    if(this.held>=0){
      const c=this.cells[this.held];
      if(this.distance(this.station)<2.4&&this.visible(this.station)){c.inPlace=true;c.x=this.station.x;c.y=this.station.y;this.held=-1;this.done++;this.ui.radio.say(this.done===1?'firstCell':'secondCell');this.ui.tone(330);this.tell(this.done===2?'Portti avattu. Seuraa vihreää merkkiä.':'Releessä on virtaa. Etsi toinen kenno.')}
      else{let dx=Math.cos(this.angle),dy=Math.sin(this.angle),range=.3;while(range<3.6&&this.clear(this.x+dx*(range+.15),this.y+dy*(range+.15),.22))range+=.15;c.x=this.x+dx*(range-.15);c.y=this.y+dy*(range-.15);this.held=-1;this.ui.tone(120);this.tell('Kenno vapautettu.')}
    } else {let i=this.nearbyCell();if(i<0){if(this.nearSpirit){if(!this.ui.radio.current)this.ui.radio.say(['station','firstCell','secondCell'][this.done]);return}this.tell(this.done===2?'Kulje vihreälle uloskäynnille.':'Tähtää läheiseen oranssiin kennoon.');return}this.held=i;this.ui.tone(205);this.tell('Kenno kiinni. Vie se siniselle releelle.')}
    this.beam=1;this.updateUI();this.ui.save();
  }
  setObjectiveProgress(value,label){
    const progress=Math.max(0,Math.min(100,Math.round(value)));
    if(this.ui.objectiveProgress){
      this.ui.objectiveProgress.setAttribute('aria-valuenow',String(progress));
      this.ui.objectiveProgress.setAttribute('aria-valuetext',label);
    }
    if(this.ui.objectiveFill)this.ui.objectiveFill.style.width=progress+'%';
    if(this.ui.objectiveDetail)this.ui.objectiveDetail.textContent=label;
  }
  updateUI(){
    const e=this.encounter;
    this.ui.section.textContent=e?'TERMINAALI 00':this.yard?'RATAPIHA 09':'ASEMA-AUKIO';
    this.ui.arena.classList.toggle('yard',!!this.yard);
    this.ui.kind.textContent=this.yard?.armed?'PULSSIKIVÄÄRI':'PAINOVOIMA-ASE';
    this.ui.act.textContent=this.yard?.armed&&!this.yard.clear?'◎':'λ';
    this.ui.act.setAttribute('aria-label',this.yard?.armed&&!this.yard.clear?'Ammu pulssikiväärillä':'Käytä tai keskustele');
    this.ui.bossHud.hidden=!e;this.ui.vitals.hidden=!e&&!this.yard?.armed;this.ui.arena.classList.toggle('terminal',!!e);
    if(e){
      this.ui.mission.textContent='Sieppaa sininen pallo ja palauta se G-Maniin.';
      this.ui.weapon.textContent=e.holding?'PALLO LADATTU':'SIEPPAAJA';
      this.ui.health.textContent=e.health+' %';this.ui.healthBar.value=e.health;
      this.ui.bossBar.value=6-e.hits;
      this.ui.bossStage.textContent='VAIHE '+(e.phase+1)+'/3 · '+phaseTitles[e.phase].toLocaleUpperCase('fi');
      this.setObjectiveProgress(e.hits/6*100,'OSUMAT '+e.hits+'/6');
    }else if(this.yard){
      const y=this.yard;
      this.ui.mission.textContent=y.objective;
      this.ui.weapon.textContent=y.armed?(y.reloadTime>0?'LATAUTUU':String(y.ammo).padStart(2,'0')+' / 12'):'VALMIS';
      this.ui.health.textContent=y.health+' %';this.ui.healthBar.value=y.health;
      this.setObjectiveProgress(y.clear?100:y.armed?y.wave/3*100:0,y.clear?'PORTTI AUKI':y.armed?'PARTIO '+Math.min(y.wave+1,3)+'/3':'HAE PULSSIKIVÄÄRI');
    }else{
      this.ui.mission.textContent=this.done===2?'Avaa portti ratapihalle.':'Vie energiakennot siniselle releelle · '+this.done+'/2';
      this.ui.weapon.textContent=this.held<0?'VALMIS':'KENNO KIINNI';
      this.setObjectiveProgress(this.done/2*100,this.done===2?'RATAPIHA AUKI':'ENERGIAKENNOT '+this.done+'/2');
    }
  }
  applyFriction(dt){
    const speed=Math.hypot(this.vx,this.vy);
    if(speed<.0001){this.vx=0;this.vy=0;return}
    const control=Math.max(speed,1.15),drop=control*5.4*dt;
    const next=Math.max(0,speed-drop),scale=next/speed;
    this.vx*=scale;this.vy*=scale;
  }
  accelerate(wishX,wishY,wishSpeed,amount,dt){
    if(wishSpeed<=0)return;
    const current=this.vx*wishX+this.vy*wishY,needed=wishSpeed-current;
    if(needed<=0)return;
    const push=Math.min(needed,amount*dt*wishSpeed);
    this.vx+=wishX*push;this.vy+=wishY*push;
  }
  movePlayer(dt,forward,side){
    const input=Math.min(1,Math.hypot(forward,side));
    const length=Math.hypot(forward,side)||1,co=Math.cos(this.angle),si=Math.sin(this.angle);
    const wishX=input?(co*forward-si*side)/length:0;
    const wishY=input?(si*forward+co*side)/length:0;
    const sprint=this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');
    const wishSpeed=(sprint?5.8:4.65)*input;
    const jumpHeld=this.keys.has('Space');

    // Holding jump performs an auto-bhop: landing does not apply ground friction
    // before the next jump, so clean timing keeps the player's momentum.
    if(this.grounded){
      if(jumpHeld){this.grounded=false;this.verticalVelocity=6.25}
      else this.applyFriction(dt);
    }
    if(input>.001){
      if(this.grounded)this.accelerate(wishX,wishY,wishSpeed,13.5,dt);
      else this.accelerate(wishX,wishY,Math.min(wishSpeed,4.5),18,dt);
    }
    if(!this.grounded){
      this.verticalVelocity-=17.5*dt;this.jumpHeight+=this.verticalVelocity*dt;
      if(this.jumpHeight<=0){this.jumpHeight=0;this.verticalVelocity=0;this.grounded=true}
    }

    // Keep air-strafing useful without letting a single bunny-hop launch the player
    // across the entire map. This is a game-scale cap, not Source's unit system.
    const speed=Math.hypot(this.vx,this.vy),cap=9.4;
    if(speed>cap){this.vx*=cap/speed;this.vy*=cap/speed}
    const dx=this.vx*dt,dy=this.vy*dt;
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/.12));
    for(let i=0;i<steps;i++){
      if(this.clear(this.x+dx/steps,this.y))this.x+=dx/steps;else this.vx=0;
      if(this.clear(this.x,this.y+dy/steps))this.y+=dy/steps;else this.vy=0;
    }
    this.walkForward=forward;this.walkSide=side;
    this.dashTime=Math.max(0,this.dashTime-dt);
    this.dashCooldown=Math.max(0,this.dashCooldown-dt);
    this.bob+=Math.min(1,speed/5)*dt*9;
    return speed;
  }
  frame(time){
    if(!this.running)return;
    const interval=Math.max(0,(time-this.last)/1000),dt=Math.min(interval,.12);this.last=time;this.elapsed+=dt;
    this.frameSample+=interval;this.sampleFrames++;
    if(this.sampleFrames>=12){
      const average=this.frameSample/this.sampleFrames;
      if(average>.040)this.pixelBudget=Math.max(76000,Math.floor(this.pixelBudget*.72));
      else if(average<.021)this.pixelBudget=Math.min(460000,Math.ceil(this.pixelBudget*1.12));
      this.frameSample=0;this.sampleFrames=0;
    }
    const key=(a,b)=>Number(this.keys.has(a)||this.keys.has(b));
    this.angle+=(key('ArrowRight')-key('ArrowLeft'))*dt*1.9;
    let f=key('KeyW','ArrowUp')-key('KeyS','ArrowDown')-this.joy.y,s=key('KeyD')-key('KeyA')+this.joy.x;
    const speed=this.movePlayer(dt,f,s);
    this.beam=Math.max(0,this.beam-dt*2.5);
    if(time>this.messageEnd&&this.ui.notice.textContent)this.ui.notice.textContent='';
    this.ui.radio.update(Math.min(.5,interval));
    if(this.encounter)this.encounter.update(dt);else if(this.yard)this.yard.update(dt);
    if(!this.running)return;
    this.footstep-=dt;
    if(this.grounded&&speed>1.25&&this.footstep<=0){this.ui.footstep?.();this.footstep=speed>5.2?.29:.43}
    this.render(time);
    const dashLabel=this.dashCooldown>0?this.dashCooldown.toFixed(1)+' s':'VALMIS';
    if(this.ui.dash.textContent!==dashLabel)this.ui.dash.textContent=dashLabel;
    this.ui.aim.classList.toggle('locked',this.encounter?!!(this.encounter.catchable()||this.encounter.holding&&this.encounter.alignment(this.encounter.target)>.971):this.yard?!!this.yard.target():this.nearbyCell()>=0);
    this.ui.aim.classList.toggle('hit',!!this.yard?.hit);
    this.ui.arena.classList.toggle('hurt',(this.encounter?.impact||this.yard?.impact||0)>0);
    const trap=this.encounter?.traps.find(t=>!t.fired&&distanceBetween(t,this)<t.radius);
    this.ui.warning.hidden=!trap;
    this.ui.phaseSplash.hidden=!this.encounter||this.encounter.phaseIntro<=0;
    if(!this.ui.phaseSplash.hidden){const title=phaseTitles[this.encounter.phase];if(this.ui.phaseSplash.textContent!==title)this.ui.phaseSplash.textContent=title}
    let keyName=matchMedia('(pointer:coarse)').matches?'λ':'E';
    const hint=this.encounter?this.encounter.hint():this.yard?this.yard.hint:this.done===2&&this.distance(this.exit)<1.8?'Siirry ratapihalle':this.held>=0&&this.distance(this.station)<2.4?'Kytke kenno':this.held<0&&this.nearbyCell()>=0?'Tartu kennoon' :this.held<0&&this.nearSpirit?'Kuuntele kaikua':'';
    const prompt=hint?'[ '+keyName+' ]  '+hint:'';
    if(this.ui.interact.textContent!==prompt)this.ui.interact.textContent=prompt;
    this.frameId=requestAnimationFrame(t=>this.frame(t));
  }
  render(time){
    const cv=this.canvas,g=this.ctx,ratio=cv.clientWidth/Math.max(1,cv.clientHeight);
    const W=Math.max(2,Math.floor(Math.min(1040,cv.clientWidth,Math.sqrt(this.pixelBudget*ratio))/2)*2),H=Math.max(2,Math.round(W/ratio));
    if(cv.width!==W||cv.height!==H||!this.buf){cv.width=W;cv.height=H;this.buf=g.createImageData(W,H);this.z=new Float32Array(W)}
    g.imageSmoothingEnabled=false;
    const co=Math.cos(this.angle),si=Math.sin(this.angle),plane=Math.min(1.1,Math.max(.48,ratio*.44)),focal=W/(2*plane);
    const mid=Math.round(H*.5+this.cameraPitch*H+this.jumpHeight*H*.19+Math.sin(this.bob)*1.1),data=this.buf.data;
    const skyW=W*4.1,offset=((this.angle/(Math.PI*2)*skyW+skyW*.43)%skyW+skyW)%skyW;
    g.fillStyle=this.encounter?'#13252f':'#859497';g.fillRect(0,0,W,H);
    g.drawImage(this.sky,-offset,mid-H*.71,skyW,H*.76);g.drawImage(this.sky,skyW-offset,mid-H*.71,skyW,H*.76);
    const fight=this.encounter;
    if(fight){
      const grad=g.createLinearGradient(0,0,0,Math.max(1,mid));grad.addColorStop(0,'#080f1e');grad.addColorStop(.72,'#203f55');grad.addColorStop(1,'#5c8586');
      g.fillStyle=grad;g.fillRect(0,0,W,mid+1);
      for(let j=0;j<18;j++){const gx=((j*131-offset*.25)%(W+60)+W+60)%(W+60);g.fillStyle='#75aaae24';g.fillRect(gx,0,1,mid)}
    }
    const eye=fight?.94:this.yard?.83:.62;
    for(let y=Math.max(0,mid+1);y<H;y++){
      const d=eye*focal/(y-mid),stepX=-si*plane*2*d/W,stepY=co*plane*2*d/W;
      let wx=this.x+(co+si*plane)*d,wy=this.y+(si-co*plane)*d;
      const fog=Math.min(.78,d/37),lit=1-fog;
      for(let x=0,i=(y*W)*4;x<W;x++,i+=4,wx+=stepX,wy+=stepY){
        const j=(((Math.floor(wy*43)&127)*128)+(Math.floor(wx*43)&127))*3;
        if(fight){
          const tileX=Math.floor(wx*1.65),tileY=Math.floor(wy*1.65),ix=wx*1.65-tileX,iy=wy*1.65-tileY;
          const seam=ix<.025||iy<.025,base=seam?38:((tileX+tileY)&1?20:25),reflection=this.floor[j]*.14;
          const stripe=(wx>6&&wx<18)&&((wy>6.87&&wy<6.93)||(wy>9.38&&wy<9.44));
          data[i]=(base+reflection+(stripe?117:0))*lit+55*fog;
          data[i+1]=(base+9+reflection+(stripe?68:0))*lit+83*fog;
          data[i+2]=(base+15+reflection+(stripe?25:0))*lit+91*fog;data[i+3]=255;
          continue;
        }
        const lane=this.yard?((wy-4.6)%3.4+3.4)%3.4:wy-8.31;
        const rail=(lane>=0&&lane<.065)||(lane>.8&&lane<.865);
        const sleeper=this.yard&&lane>-.01&&lane<1&&((wx%1.15)<.23);
        const n=rail?68:sleeper?-24:0;
        data[i]=(this.floor[j]+n)*lit+133*fog;data[i+1]=(this.floor[j+1]+n)*lit+143*fog;data[i+2]=(this.floor[j+2]+n)*lit+142*fog;data[i+3]=255;
      }
    }
    // Transparent sky pixels let the panoramic skyline show through the street buffer.
    for(let x=0;x<W;x++){
      const proj=(2*x/W-1)*plane,rx=co-si*proj,ry=si+co*proj,ax=Math.abs(1/(rx||1e-9)),ay=Math.abs(1/(ry||1e-9));
      let mx=Math.floor(this.x),my=Math.floor(this.y),sx=rx<0?-1:1,sy=ry<0?-1:1;
      let a=(sx<0?this.x-mx:mx+1-this.x)*ax,b=(sy<0?this.y-my:my+1-this.y)*ay,side=0,wall=0;
      for(let n=0;n<80&&!wall;n++){if(a<b){a+=ax;mx+=sx;side=0}else{b+=ay;my+=sy;side=1}wall=this.value(mx,my)}
      const d=Math.max(.035,side?b-ay:a-ax);this.z[x]=d;
      const height=[0,3.7,4.6,3.0,3.25][wall]||3.5,base=mid+eye*focal/d,span=height*focal/d,top=base-span;
      const start=Math.max(0,Math.floor(top)),end=Math.min(H-1,Math.floor(base));
      const pos=side?this.x+d*rx:this.y+d*ry,tx=Math.floor(pos*(fight?81:39))&127;
      const tex=this.textures[wall]||this.textures[1],fog=Math.min(.69,d/41),light=(side?.85:1)*(1-fog);
      for(let y=start;y<=end;y++){const j=(Math.min(383,Math.max(0,Math.floor((y-top)/span*384)))*128+tx)*4,i=(y*W+x)*4;data[i]=tex[j]*light+135*fog;data[i+1]=tex[j+1]*light+144*fog;data[i+2]=tex[j+2]*light+146*fog;data[i+3]=255}
      for(let y=0;y<start&&y<H;y++)data[(y*W+x)*4+3]=0;
    }
    if(!this.layer||this.layer.width!==W||this.layer.height!==H){this.layer=this.makeCanvas(W,H);this.layerCtx=this.layer.getContext('2d')}
    this.layerCtx.putImageData(this.buf,0,0);g.drawImage(this.layer,0,0);
    const objs=fight?fight.sprites():this.yard?this.yard.sprites():[this.spirit,...stationProps,...(this.done===0?[{x:13.6,y:5.48,type:'gman',height:1.87,aspect:.46}]:[]),this.station,{...this.exit,type:this.done===2?'exitOpen':'exit'},...this.cells.filter((c,i)=>!c.inPlace&&i!==this.held)];
    if(fight)this.drawTraps(g,fight,W,mid,focal,co,si,eye);
    objs.sort((a,b)=>this.distance(b)-this.distance(a));
    for(const o of objs){
      const dx=o.x-this.x,dy=o.y-this.y,depth=dx*co+dy*si;if(depth<.12)continue;
      const center=W*.5+(-dx*si+dy*co)*focal/depth,h=(o.height??(o.type==='cell'?.67:o.type==='station'?1.15:2.1))*focal/depth,w=h*(o.aspect??.73);
      const left=center-w/2,top=mid+(eye-(o.z||0))*focal/depth-h,spr=this.sprites[o.type];
      if(!spr)continue;g.globalAlpha=o.alpha??1;
      for(let x=Math.max(0,Math.floor(left));x<Math.min(W,left+w);){if(this.z[x]<=depth){x++;continue}let end=x+1;while(end<Math.min(W,left+w)&&this.z[end]>depth)end++;
        const src=(x-left)/w*spr.width;g.drawImage(spr,Math.max(0,src),0,(end-x)/w*spr.width,spr.height,x,top,end-x,h);x=end}
    }
    g.globalAlpha=1;
    if(fight?.holding){const h=H*.16;g.drawImage(this.sprites.returnOrb,W*.53-h/2,mid+H*.11+Math.sin(time*.004)*3,h,h)}
    if(!fight&&this.held>=0){const h=H*.23;g.drawImage(this.sprites.cell,W*.5-h*.36,mid-h*.2+Math.sin(time*.004)*3,h*.73,h)}
    if(fight){
      const fog=g.createLinearGradient(0,mid-H*.2,0,mid+H*.13);
      fog.addColorStop(0,'#75a79a00');fog.addColorStop(.64,'#8eb9ac12');fog.addColorStop(1,'#93ac9e00');g.fillStyle=fog;g.fillRect(0,mid-H*.2,W,H*.33);
    }
    if(this.yard?.armed)drawPulseRifle(this,W,H);else this.drawGun(W,H);this.mapOverlay(W,H);this.drawBearing(W,H);
    if(this.beam>.6&&!this.yard?.armed){
      g.save();g.globalAlpha=(this.beam-.6)*.9;g.strokeStyle=fight?.holding?'#8cfbff':'#ffd398';g.lineWidth=2;
      g.beginPath();g.moveTo(W*.76,H*.8);g.quadraticCurveTo(W*.66,H*.61,W*.5,H*.5);g.stroke();g.restore();
    }
    if(fight?.result==='won'){g.fillStyle='rgba(165,224,211,'+(1-clamp(fight.outro/fight.endingLength,0,1))*.45+')';g.fillRect(0,0,W,H)}
    this.drawRetroOverlay(g,W,H,time);
  }
  drawRetroOverlay(g,W,H,time){
    // restrained late-90s PC look: warm phosphor tint, scan lines and lens falloff
    g.save();
    g.fillStyle='rgba(161,139,102,.035)';g.fillRect(0,0,W,H);
    g.fillStyle='rgba(5,10,12,.12)';
    for(let y=1;y<H;y+=3)g.fillRect(0,y,W,1);
    const vignette=g.createRadialGradient(W*.5,H*.48,H*.12,W*.5,H*.5,Math.max(W,H)*.72);
    vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.72,'rgba(0,0,0,.06)');vignette.addColorStop(1,'rgba(0,0,0,.38)');
    g.fillStyle=vignette;g.fillRect(0,0,W,H);
    g.restore();
  }
  drawTraps(g,e,W,mid,focal,co,si,eye){
    for(const t of e.traps){
      // Clip the world-space warning disc at the camera plane, including when the
      // player stands inside it. This keeps the marked floor area stable while turning.
      let points=[];
      for(let i=0;i<48;i++){
        const ang=i*Math.PI/24,dx=t.x+Math.cos(ang)*t.radius-this.x,dy=t.y+Math.sin(ang)*t.radius-this.y;
        points.push({x:-dx*si+dy*co,z:dx*co+dy*si});
      }
      const clipped=[];let prev=points.at(-1);
      for(const q of points){
        if((prev.z>.12)!==(q.z>.12)){const k=(.12-prev.z)/(q.z-prev.z);clipped.push({x:prev.x+(q.x-prev.x)*k,z:.12})}
        if(q.z>.12)clipped.push(q);prev=q;
      }
      if(clipped.length<3)continue;
      g.save();g.beginPath();
      clipped.forEach((q,i)=>g[i?'lineTo':'moveTo'](W/2+q.x*focal/q.z,mid+(eye-.005)*focal/q.z));
      g.closePath();g.fillStyle=t.fired?'#ffaf6577':'rgba(235,109,56,'+(.16+.28*t.age/t.delay)+')';g.fill();
      g.strokeStyle='#ffb277';g.lineWidth=2;g.stroke();g.restore();
    }
  }
  drawBearing(W,H){
    const e=this.encounter;
    const obj=e?e.target:this.yard?(this.yard.clear?yardGate:this.yard.contact||(!this.yard.armed?rebels[1]:yardGate)):this.held>=0?this.station:this.done===2?this.exit:this.cells.filter(c=>!c.inPlace).sort((a,b)=>this.distance(a)-this.distance(b))[0];
    if(!obj)return;
    const angle=Math.atan2(obj.y-this.y,obj.x-this.x)-this.angle,relative=Math.atan2(Math.sin(angle),Math.cos(angle));
    const name=e?'G-MAN':this.yard?(this.yard.clear?'PORTTI':this.yard.armed?'PARTIO':'VASTARINTA'):this.held>=0?'RELE':this.done===2?'PORTTI':'KENNO';
    const label=(relative<-.65?'◀  ':'')+name+'  '+Math.round(this.distance(obj)*2.3)+' m'+(relative>.65?'  ▶':'');
    if(this.ui.bearing.textContent!==label)this.ui.bearing.textContent=label;
  }
  drawGun(W,H){
    const g=this.ctx;g.save();const size=Math.min(W*.44,H*.67),x=W-size*.96,y=H-size*.62+Math.sin(this.bob)*1.5+this.beam*7;g.translate(x,y);g.scale(size/260,size/260);
    const poly=(pts,fill,stroke)=>{g.beginPath();g.moveTo(...pts[0]);pts.slice(1).forEach(p=>g.lineTo(...p));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2;g.stroke()}};
    const metal=g.createLinearGradient(55,20,180,150);metal.addColorStop(0,'#9a9d8b');metal.addColorStop(.27,'#464e49');metal.addColorStop(.55,'#242d2d');metal.addColorStop(.72,'#59635c');metal.addColorStop(1,'#232b29');
    poly([[54,54],[22,26],[14,3],[21,0],[36,20],[76,39]],metal,'#252e2c');
    poly([[90,35],[70,0],[66,-23],[73,-28],[83,-5],[110,21]],metal,'#293432');
    poly([[57,91],[10,67],[-4,50],[3,47],[24,58],[74,68]],metal,'#26312e');
    poly([[57,39],[101,19],[148,42],[135,92],[99,116],[56,83]],'#302e27','#161e1c');
    g.save();g.translate(99,67);g.rotate(-.44);const glow=this.encounter?.holding?'#b9ffff':this.held>=0||this.beam>0?'#ffe18d':'#ff9446';
    for(let i=0;i<6;i++){g.fillStyle='#82502f';g.fillRect(-26,-35+i*12,55,9);g.fillStyle=glow;g.fillRect(-23,-34+i*12,50,3)}g.restore();
    poly([[119,37],[144,27],[181,44],[207,89],[260,111],[278,185],[130,184],[98,105],[132,85]],metal,'#232b29');
    poly([[150,60],[175,63],[196,92],[170,113],[146,97]],'#202a29','#768177');
    for(let i=0;i<4;i++){g.strokeStyle='#82877b';g.lineWidth=3;g.beginPath();g.moveTo(153+i*5,68+i*3);g.lineTo(149+i*5,76+i*3);g.stroke()}
    g.save();g.globalAlpha=.8;g.strokeStyle=this.encounter?.holding?'#c4fffe':'#f7b66d';g.lineWidth=1.4;
    g.beginPath();g.moveTo(32,25);g.quadraticCurveTo(52,39,64,47);g.moveTo(72,-15);g.quadraticCurveTo(77,17,95,29);g.stroke();g.restore();
    for(const [bx,by] of [[122,42],[142,38],[140,89],[173,103],[191,123],[211,144]]){
      g.fillStyle='#121b1e';g.beginPath();g.arc(bx,by,3.1,0,7);g.fill();g.strokeStyle='#8c9690';g.lineWidth=1;g.stroke();
      g.beginPath();g.moveTo(bx-1.5,by+1);g.lineTo(bx+1.5,by-1);g.stroke();
    }
    g.strokeStyle='#1b211e';g.lineWidth=9;g.beginPath();g.moveTo(129,96);g.bezierCurveTo(136,148,198,106,215,172);g.stroke();g.strokeStyle='#ac7548';g.lineWidth=3;g.stroke();g.restore();
  }
  mapOverlay(W,H){
    if(this.ui.minimap&&this.ui.minimap()===false)return;
    const g=this.ctx,scale=Math.min(W/155,H/105,4.3),width=22*scale,height=16*scale,pad=9;
    const left=W-width-14,top=H-height-14;g.save();g.translate(left,top);g.fillStyle='#101a1ed9';g.fillRect(-pad,-pad,width+2*pad,height+2*pad);
    this.map.forEach((row,y)=>[...row].forEach((v,x)=>{if(v!=='0'){g.fillStyle='#65706f';g.fillRect(x*scale,y*scale,scale+.1,scale+.1)}}));
    const dot=(o,color,r)=>{g.fillStyle=color;g.beginPath();g.arc(o.x*scale,o.y*scale,r,0,7);g.fill()};
    if(this.encounter){dot(this.encounter.target,'#ffb171',3);if(this.encounter.decoy)dot(this.encounter.decoy,'#80cddc',2.5);this.encounter.shots.forEach(s=>dot(s,s.returned?'#ffe3a5':'#89f8ff',1.8))}
    else if(this.yard){this.yard.allies.forEach(r=>dot(r,'#afe4be',2));this.yard.enemies.forEach(e=>dot(e,'#ff9469',2.5));if(this.yard.clear)dot(yardGate,'#a4ffd1',3)}
    else{dot(this.spirit,'#9dedde',2.8);this.cells.forEach((c,i)=>{if(!c.inPlace&&i!==this.held)dot(c,'#ff994e',2.4)});dot(this.station,'#92ebdf',2.8);if(this.done===2)dot(this.exit,'#98fdac',3)}
    g.translate(this.x*scale,this.y*scale);g.rotate(this.angle);g.fillStyle='#fff';g.beginPath();g.moveTo(5,0);g.lineTo(-3,-3);g.lineTo(-2,0);g.lineTo(-3,3);g.fill();g.restore();
  }
}
