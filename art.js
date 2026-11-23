'use strict';
function gameArt(game) {
  const canvas=(w,h)=>game.makeCanvas(w,h);
  const image=(path,apply)=>{
    const art=new Image();
    art.onload=()=>{
      try{apply(art)}catch(error){
        // Some browsers isolate individual file:// assets. The procedural surfaces
        // stay available when those browsers deny texture pixel reads.
        if(error.name!=='SecurityError')throw error;
      }
    };
    art.src='assets/'+path;
  };
  const drawing=(w,h,paint)=>{const c=canvas(w,h);paint(c.getContext('2d'),w,h);return c};
  const ellipse=(g,x,y,width,height,color)=>{
    g.fillStyle=color;g.beginPath();g.ellipse(x,y,width,height,0,0,Math.PI*2);g.fill();
  };
  const orb=(warm)=>drawing(128,128,(g)=>{
    const haze=g.createRadialGradient(64,64,1,64,64,63);
    haze.addColorStop(0,'#ffffff');haze.addColorStop(.12,warm?'#fff6a9':'#d7ffff');
    haze.addColorStop(.26,warm?'#ffb339':'#65f6ff');haze.addColorStop(.37,warm?'#ed6724a0':'#1cbfeda0');
    haze.addColorStop(1,warm?'#e4730000':'#00b7f700');g.fillStyle=haze;g.fillRect(0,0,128,128);
    g.strokeStyle=warm?'#ffe2a2c0':'#cffdffc0';g.lineWidth=1.3;
    for(let i=0;i<3;i++){g.beginPath();g.ellipse(64,64,23+i*3,10+i*3,i*1.08,0,7);g.stroke()}
  });
  const sprites=game.sprites;
  sprites.clock=drawing(240,240,(g)=>{
    g.translate(120,120);
    const face=g.createRadialGradient(0,0,18,0,0,111);face.addColorStop(0,'#173039');face.addColorStop(.88,'#12242b');face.addColorStop(1,'#4e696b');
    ellipse(g,0,0,116,116,'#0b181c');ellipse(g,0,0,111,111,face);
    g.strokeStyle='#a2beb4';g.lineWidth=2;g.beginPath();g.arc(0,0,104,0,7);g.stroke();
    for(let i=0;i<60;i++){g.save();g.rotate(i*Math.PI/30);g.strokeStyle=i%5?'#668681':'#b6d1c5';g.lineWidth=i%5?1:3;g.beginPath();g.moveTo(0,-99);g.lineTo(0,i%5?-95:-84);g.stroke();g.restore()}
    g.lineCap='round';g.strokeStyle='#d9d9bb';g.lineWidth=5;g.beginPath();g.moveTo(-22,-44);g.lineTo(0,0);g.lineTo(61,15);g.stroke();
    g.strokeStyle='#d49157';g.lineWidth=1.6;g.beginPath();g.moveTo(-35,72);g.lineTo(5,-10);g.stroke();ellipse(g,0,0,5,5,'#cdb48a');
  });
  sprites.case=drawing(120,80,g=>{
    g.strokeStyle='#b4a684';g.lineWidth=5;g.strokeRect(43,8,33,18);
    g.fillStyle='#453f36';g.fillRect(7,21,106,52);g.strokeStyle='#97856a';g.lineWidth=2;g.strokeRect(8,22,104,50);g.fillStyle='#cfb48b';g.fillRect(24,26,8,6);g.fillRect(88,26,8,6);
  });
  sprites.orb=orb(false);sprites.returnOrb=orb(true);
  sprites.rift=drawing(128,192,(g)=>{
    const grad=g.createRadialGradient(64,94,4,64,94,86);grad.addColorStop(0,'#1f384e20');grad.addColorStop(.67,'#459d9944');grad.addColorStop(1,'#122a3600');
    g.fillStyle=grad;g.fillRect(0,0,128,192);
    g.fillStyle='#15282dbb';g.fillRect(27,13,74,166);g.fillStyle='#57978e77';g.fillRect(25,12,3,167);g.fillRect(100,12,3,167);
    for(let y=18;y<178;y+=7){g.fillStyle='#58959345';g.fillRect(31,y,66,1)}
    ellipse(g,64,182,57,5,'#7effe84a');
  });
  sprites.realHalo=drawing(128,176,(g)=>{
    const grad=g.createRadialGradient(64,75,14,64,75,65);grad.addColorStop(0,'#ffc47d30');grad.addColorStop(1,'#f69b4900');g.fillStyle=grad;g.fillRect(0,0,128,176);
    g.strokeStyle='#ffb568';g.lineWidth=2;
    for(let j=0;j<4;j++){g.beginPath();g.arc(64,32,21,j*Math.PI/2+.15,j*Math.PI/2+1.28);g.stroke()}
    ellipse(g,64,165,49,3,'#ffc676af');
  });
  // Small silhouette is ready on the first frame while the character portrait loads.
  sprites.gman=drawing(100,220,(g)=>{
    ellipse(g,50,26,13,19,'#a69783');g.fillStyle='#233546';g.fillRect(28,47,43,80);g.fillStyle='#131e29';g.fillRect(31,124,16,89);g.fillRect(53,124,16,89);
    g.fillRect(16,60,13,69);g.fillRect(70,60,12,69);g.fillStyle='#3b3329';g.fillRect(6,135,32,39);g.fillStyle='#a1bdc4';g.fillRect(47,49,7,26);
  });sprites.ghost=sprites.gman;
  image('gman.svg',art=>{
    sprites.gman=art;
    sprites.ghost=drawing(art.width,art.height,(g,w,h)=>{
      g.drawImage(art,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='#4ccada99';g.fillRect(0,0,w,h);
      g.fillStyle='#153f5d99';for(let y=1;y<h;y+=7)g.fillRect(0,y,w,2);
    });
  });
  sprites.lamp=drawing(100,230,(g)=>{
    ellipse(g,50,222,19,3,'#17232370');g.fillStyle='#3a4747';g.fillRect(48,36,5,186);g.fillRect(38,213,23,9);
    g.fillStyle='#67736d';g.fillRect(46,37,3,169);g.fillStyle='#29342f';g.fillRect(30,32,38,7);g.fillRect(33,14,31,4);
    g.fillStyle='#a48e68';g.fillRect(35,18,27,14);g.fillStyle='#ffeab1';g.fillRect(39,20,20,10);
    const light=g.createRadialGradient(49,25,2,49,25,37);light.addColorStop(0,'#ffe8a7b0');light.addColorStop(1,'#ffd77c00');g.fillStyle=light;g.fillRect(0,0,100,70);
  });
  sprites.sign=drawing(120,160,(g)=>{
    g.fillStyle='#414e50';g.fillRect(22,42,5,113);g.fillRect(94,42,5,113);
    g.fillStyle='#232f32';g.fillRect(4,12,112,80);g.strokeStyle='#bcb6a1';g.strokeRect(8,16,104,72);
    g.fillStyle='#e5dccc';g.textAlign='center';g.font='bold 39px Arial';g.fillText('17',60,60);g.font='10px monospace';g.fillText('CITY STATION',60,78);
  });
  sprites.crate=drawing(128,128,(g)=>{
    g.fillStyle='#454b42';g.fillRect(7,27,107,86);g.fillStyle='#787d67';g.fillRect(7,22,107,9);g.fillStyle='#293733';
    for(let x=17;x<115;x+=22)g.fillRect(x,32,5,79);
    g.fillStyle='#89907a';g.fillRect(8,97,106,7);g.fillStyle='#c08747';g.fillRect(39,49,38,24);g.fillStyle='#343936';g.font='bold 19px monospace';g.fillText('λ',52,69);
  });
  game.textures[4]=drawing(128,384,(g)=>{
    g.fillStyle='#344550';g.fillRect(0,0,128,384);for(let y=10;y<384;y+=49){g.fillStyle='#1c2d33';g.fillRect(0,y,128,5)}
    g.fillStyle='#7bc9c2';g.fillRect(14,30,2,245);
  }).getContext('2d').getImageData(0,0,128,384).data;
  image('masonry.webp',atlas=>{
    const halfW=atlas.width/2,halfH=atlas.height/2;
    const sample=(x,y,w,h)=>drawing(w,h,g=>g.drawImage(atlas,x*halfW+2,y*halfH+2,halfW-4,halfH-4,0,0,w,h)).getContext('2d').getImageData(0,0,w,h).data;
    game.textures[1]=sample(0,0,128,384); // weathered plaster and stone facade
    game.textures[2]=sample(1,0,128,384); // red industrial brick
    game.textures[3]=sample(0,1,128,384); // reinforced Combine steel gate
    game.textures[4]=sample(1,1,128,384); // rough foundation stone
    const src=sample(1,1,128,128);
    for(let j=0;j<128*128;j++)for(let c=0;c<3;c++)game.floor[j*3+c]=src[j*4+c];
  });
}
const stationProps=[
  {type:'sign',x:8.2,y:5.55,height:1.8,aspect:.8},
  {type:'lamp',x:6.8,y:7.0,height:2.85,aspect:.44},{type:'lamp',x:13.2,y:7.0,height:2.85,aspect:.44},
  {type:'lamp',x:19.45,y:7.15,height:2.85,aspect:.44},{type:'lamp',x:10.28,y:11.6,height:2.85,aspect:.44},
  {type:'crate',x:18.8,y:10.7,height:.72,aspect:1.1},{type:'crate',x:18.25,y:11.1,height:.71,aspect:1.1},
  {type:'crate',x:10.3,y:5.1,height:.68,aspect:1.1}
];
