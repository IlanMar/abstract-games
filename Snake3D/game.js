/* Snakes 3D: original geometry, sounds and level layouts. Three.js r158 (MIT). */
(() => {
  'use strict';
  const T = THREE;
  const DIR = [[0,-1],[1,0],[0,1],[-1,0]];
  const $ = id => document.getElementById(id);
  const key = (x,z) => `${x},${z}`;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const pad = n => String(n).padStart(2,'0');
  const debug = new URLSearchParams(location.search).get('debug') === '1';
  const line = (x1,z1,x2,z2) => {const cells=[];const dx=Math.sign(x2-x1),dz=Math.sign(z2-z1);for(let x=x1,z=z1;;x+=dx,z+=dz){cells.push([x,z]);if(x===x2&&z===z2)break;}return cells;};

  // Each stage can be extended by changing data here; game rules stay shared.
  const EXTENDED_LEVELS = [
    {name:'THE GRID',w:23,h:31,target:12,step:.27,shape:'rect',theme:'green',start:[11,22,0],length:8,time:90,paths:[line(11,18,11,10),[...line(11,7,11,5),...line(10,5,3,5)]],hint:'FOLLOW THE BLUE ENERGY PATH'},
    {name:'FIRST WALLS',w:23,h:31,target:12,step:.26,shape:'rect',theme:'green',start:[11,22,0],length:8,time:85,walls:[...line(6,9,6,16),...line(16,9,16,16)],paths:[line(11,18,11,11),[...line(11,8,11,6),...line(12,6,17,6)]],hint:'FOLLOW THE PATH · AVOID THE WALLS'},
    {name:'NARROW ROUTE',w:21,h:29,target:12,step:.25,shape:'rect',theme:'blue',start:[10,21,0],length:7,time:80,walls:[...line(5,7,5,16),...line(15,10,15,19)],paths:[line(10,18,10,10),[...line(10,7,10,5),...line(11,5,17,5)]],hint:'TURN EARLY TO STAY ON THE PATH'},
    {name:'BROKEN TILES',w:13,h:17,target:10,step:.28,shape:'islands',theme:'violet',start:[6,12,0],holes:[[4,5],[5,5],[8,5],[4,11],[8,11]],path:[[6,8],[6,7],[6,6],[6,5]]},
    {name:'CROSS CURRENT',w:15,h:19,target:11,step:.27,shape:'cross',theme:'ember',start:[7,14,0],walls:[[5,9],[9,9]],path:[[7,8],[7,7],[7,6],[7,5],[7,4]]},
    {name:'HEX FIELD',w:13,h:17,target:12,step:.27,shape:'rect',hex:true,theme:'blue',start:[6,12,0],walls:[[4,6],[8,6],[4,10],[8,10]],speed:[[6,7],[6,8]],path:[[6,5],[6,4],[6,3]],hint:'GREEN TILES MAKE YOU FASTER'},
    {name:'THE BRIDGE',w:13,h:19,target:13,step:.26,shape:'bridge',theme:'green',start:[6,14,0],holes:[[5,8],[7,8],[5,12],[7,12]],slow:[[6,9],[6,10]],special:['multiplier'],path:[[6,7],[6,6],[6,5],[6,4]]},
    {name:'OUTER RING',w:15,h:19,target:14,step:.26,shape:'ring',theme:'violet',start:[7,16,1],walls:[[3,8],[11,10]],special:['rare','chain'],path:[[9,16],[10,16],[11,16],[12,16]]},
    {name:'PATROL',w:13,h:17,target:15,step:.25,shape:'rect',theme:'blue',start:[6,13,0],hazards:[[[2,6],[3,6],[4,6],[3,6]],[[8,10],[9,10],[10,10],[9,10]]],special:['speed','slow','chain'],path:[[6,7],[6,6],[6,5],[6,4]],hint:'WATCH THE MOVING BLOCKS'},
    {name:'TWIN GATES',w:15,h:19,target:16,step:.25,shape:'islands',theme:'ember',start:[7,14,0],portals:[[[2,9],[12,9]]],walls:[[4,6],[10,6],[4,12],[10,12]],special:['multiplier','rare'],path:[[7,8],[7,7],[7,6],[7,5]],hint:'THE BLUE GATES CONNECT'},
    {name:'WRAP AROUND',w:13,h:17,target:17,step:.24,shape:'rect',theme:'green',start:[6,12,0],wrapX:true,walls:[[4,5],[5,5],[7,5],[8,5],[4,11],[5,11],[7,11],[8,11]],speed:[[2,8],[10,8]],special:['chain','speed'],path:[[6,9],[6,8],[6,7],[6,6]],hint:'THE EDGES WRAP AROUND'},
    {name:'ENDLESS RING',w:15,h:19,target:18,step:.24,shape:'ring',hex:true,theme:'violet',start:[7,16,1],wrapX:true,wrapZ:true,portals:[[[1,9],[13,9]]],hazards:[[[7,3],[8,3],[9,3],[8,3]]],special:['rare','multiplier','chain'],path:[[9,16],[10,16],[11,16],[12,16]],hint:'FOLLOW THE RING · USE THE GATES'}
  ];
  const CLASSIC_LEVELS = window.CLASSIC_MAP.stages.slice(0,12).map((stage,index)=>({
    name:`CHAPTER ${pad(index+1)}`,w:120,h:120,target:1+Math.min(6,stage.path.length)+Math.floor(index/3),
    step:Math.max(.30,.42-index*.01),classic:true,start:stage.start,length:6,time:110-index*2,
    paths:[stage.path],hint:'FOLLOW THE MARKED CELLS · COLLECT ENERGY'
  }));
  const LEVELS=[...CLASSIC_LEVELS,...EXTENDED_LEVELS];

  class SaveManager {
    constructor(){
      const defaults={unlocked:1,highScore:0,best:{},settings:{controls:'Swipe',sound:true,camera:'Classic',graphics:'Auto'}};
      try { this.data=Object.assign(defaults,JSON.parse(localStorage.getItem('snakes3d-save'))||{}); }
      catch { this.data=defaults; }
      this.data.settings=Object.assign(defaults.settings,this.data.settings||{});
    }
    write(){ try{localStorage.setItem('snakes3d-save',JSON.stringify(this.data));}catch{} }
    finish(level,score){const d=this.data;d.unlocked=Math.min(LEVELS.length,Math.max(d.unlocked,level+2));d.highScore=Math.max(d.highScore,score);d.best[level]=Math.max(d.best[level]||0,score);this.write();}
    score(level,score){const d=this.data;d.highScore=Math.max(d.highScore,score);d.best[level]=Math.max(d.best[level]||0,score);this.write();}
  }

  class AudioManager {
    constructor(save){this.save=save;this.ctx=null;this.samples={};
      for(const [id,file] of Object.entries({collect:'PowerPickUp_single.wav',bonus:'EnergyPickUp.wav',complete:'GroupComplete.wav',dead:'SpikeHit.wav',boost:'Boost.wav',wall:'ObstecleHit.wav'})){
        const clip=new Audio(`audio/${file}`);clip.preload='auto';clip.volume=.25;this.samples[id]=clip;
      }
    }
    tone(freq,duration=.08,type='square',volume=.035,delay=0){
      if(!this.save.data.settings.sound)return;
      try{
        this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();
        if(this.ctx.state==='suspended')this.ctx.resume();
        const t=this.ctx.currentTime+delay, o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);
        o.connect(g);g.connect(this.ctx.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
      }catch{}
    }
    play(id){
      if(!this.save.data.settings.sound)return;
      const sample=this.samples[id];
      if(sample){try{sample.currentTime=0;sample.play().catch(()=>this.tone(id==='dead'?150:650,.08));return;}catch{}}
      if(id==='collect'){this.tone(620,.07);this.tone(930,.1,'square',.025,.055);}
      else if(id==='bonus'){this.tone(440,.08);this.tone(660,.08,'square',.03,.08);this.tone(990,.16,'square',.03,.16);}
      else if(id==='turn')this.tone(210,.025,'triangle',.015);
      else if(id==='boost')this.tone(720,.1,'sawtooth',.025);
      else if(id==='complete'){[440,554,660,880].forEach((f,i)=>this.tone(f,.18,'square',.025,i*.09));}
      else if(id==='dead'){[310,230,150].forEach((f,i)=>this.tone(f,.2,'sawtooth',.025,i*.12));}
      else this.tone(490,.055,'triangle',.025);
    }
  }

  class Level {
    constructor(config,index){
      this.config=config;this.index=index;this.w=config.w;this.h=config.h;
      this.cells=new Set();this.walls=new Set();this.holes=new Set();
      this.portals=[];this.hazards=[];this.paths=[];this.path=[];this.pathStage=0;this.pathIndex=0;this.pathDone=false;this.pathVersion=0;
      this.speed=new Set((config.speed||[]).map(p=>key(...p)));
      this.slow=new Set((config.slow||[]).map(p=>key(...p)));
      const inset=config.inset||0;
      this.cellColors=new Map();
      if(config.classic){
        const data=window.CLASSIC_MAP.cells;
        for(let i=0;i<data.length;i+=10){const x=data[i],z=data[i+1],k=key(x,z);this.cells.add(k);
          this.cellColors.set(k,(data[i+2]<<16)|(data[i+3]<<8)|data[i+4]);
          if(data[i+8]===100)this.walls.add(k);
        }
      } else for(let z=0;z<this.h;z++)for(let x=0;x<this.w;x++){
        let good=x>=inset&&z>=inset&&x<this.w-inset&&z<this.h-inset;
        if(config.shape==='cross') good=good&&(Math.abs(x-(this.w-1)/2)<=2||Math.abs(z-(this.h-1)/2)<=2);
        if(config.shape==='bridge') good=good&&(Math.abs(x-(this.w-1)/2)<=2||(z>=3&&z<=5)||(z>=this.h-6&&z<=this.h-4));
        if(config.shape==='islands') good=good&&!((x<3||x>this.w-4)&&(z<3||z>this.h-4));
        if(config.shape==='ring') good=good&&!(x>3&&x<this.w-4&&z>3&&z<this.h-4);
        if(good)this.cells.add(key(x,z));
      }
      for(const [x,z] of config.holes||[]){this.cells.delete(key(x,z));this.holes.add(key(x,z));}
      for(const [x,z] of config.walls||[])if(this.cells.has(key(x,z)))this.walls.add(key(x,z));
      for(const pair of config.portals||[])this.portals.push(pair);
      for(const hazard of config.hazards||[])this.hazards.push({route:hazard,at:0});
      this.paths=(config.paths||[config.path||[]]).map(path=>path.filter(([x,z])=>this.isFree(x,z)));
      this.path=this.paths[0]||[];
    }
    isFree(x,z){return this.cells.has(key(x,z))&&!this.walls.has(key(x,z));}
    wrap(x,z){if(this.config.wrapX)x=(x+this.w)%this.w;if(this.config.wrapZ)z=(z+this.h)%this.h;return [x,z];}
    hazardAt(x,z){return this.hazards.some(h=>{const p=h.route[h.at];return p[0]===x&&p[1]===z;});}
    moveHazards(tick,body){if(tick%3===0)for(const h of this.hazards){const next=(h.at+1)%h.route.length,p=h.route[next];if(!body.some(q=>q[0]===p[0]&&q[1]===p[1]))h.at=next;}}
    portalAt(x,z){for(const [a,b] of this.portals){if(a[0]===x&&a[1]===z)return b;if(b[0]===x&&b[1]===z)return a;}return null;}
    world(x,z,out){return out.set(x-(this.w-1)/2,0,z-(this.h-1)/2);}
  }

  class Snake {
    constructor(level){
      const [x,z,d]=level.config.start;this.dir=d;this.turns=[];this.grow=0;
      this.body=[];for(let i=0;i<(level.config.length||6);i++){
        const bx=x-DIR[d][0]*i,bz=z-DIR[d][1]*i;
        if(!level.isFree(bx,bz))break;
        this.body.push([bx,bz]);
      }
      this.prev=this.body.map(p=>p.slice());
    }
    turn(delta){if(this.turns.length<2)this.turns.push(delta);}
    advance(next,growing){
      this.prev=this.body.map(p=>p.slice());this.body.unshift(next);
      if(!growing)this.body.pop();
      else this.prev.push(this.prev[this.prev.length-1].slice());
    }
    occupies(x,z,growing){const limit=this.body.length-(growing?0:1);for(let i=0;i<limit;i++)if(this.body[i][0]===x&&this.body[i][1]===z)return true;return false;}
  }

  class CollisionSystem {
    static check(level,snake,x,z,growing){
      if(!level.isFree(x,z))return level.holes.has(key(x,z))||!level.cells.has(key(x,z))?'FELL OFF THE GRID':'HIT A WALL';
      if(level.hazardAt(x,z))return 'HIT A MOVING BLOCK';
      if(snake.occupies(x,z,growing))return 'BIT YOUR TAIL';
      return null;
    }
  }

  class CameraController {
    constructor(camera,save){this.camera=camera;this.save=save;this.look=new T.Vector3();this.desiredLook=new T.Vector3();this.desiredPosition=new T.Vector3();this.ready=false;}
    reset(){this.ready=false;}
    update(head,dir,dt,level){
      const d=DIR[dir],high=this.save.data.settings.camera==='High';
      this.desiredLook.set(head.x+d[0]*.7,0,head.z+d[1]*.7);
      const distance=high?7.2:4.5,elevation=high?7.0:4.64;
      this.desiredPosition.set(head.x-d[0]*distance+d[1]*.2,elevation,head.z-d[1]*distance-d[0]*.2);
      if(!this.ready){this.camera.position.copy(this.desiredPosition);this.look.copy(this.desiredLook);this.ready=true;}
      else {const k=1-Math.exp(-dt*5.2);this.camera.position.lerp(this.desiredPosition,k);this.look.lerp(this.desiredLook,k);}
      this.camera.lookAt(this.look);
    }
  }

  class GameRenderer {
    constructor(canvas,save){
      this.save=save;
      this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',alpha:false});
      this.renderer.setClearColor(0x080b17);this.renderer.outputColorSpace=T.SRGBColorSpace;
      this.scene=new T.Scene();this.scene.background=new T.Color(0x050509);this.scene.fog=new T.Fog(0x050509,14,34);
      this.camera=new T.PerspectiveCamera(58,1,.1,80);
      this.cameraController=new CameraController(this.camera,save);
      this.scene.add(new T.AmbientLight(0xffffff,1.4));const light=new T.DirectionalLight(0xffffff,1.7);light.position.set(-4,9,6);this.scene.add(light);
      this.worldGroup=new T.Group();this.scene.add(this.worldGroup);
      this.dynamic=new T.Group();this.scene.add(this.dynamic);
      this.tileGeom=new T.BoxGeometry(.985,.045,.985);
      this.hexGeom=new T.CylinderGeometry(.53,.53,.045,6,1);
      this.bodyGeom=new T.CylinderGeometry(.34,.34,1.18,6,1);this.bodyGeom.rotateX(Math.PI/2);
      this.seamGeom=new T.CylinderGeometry(.35,.35,.045,6,1);this.seamGeom.rotateX(Math.PI/2);
      this.crossbarGeom=new T.BoxGeometry(.56,.018,.05);
      this.jointGeom=new T.IcosahedronGeometry(.33,0);
      const arrow=new T.Shape();arrow.moveTo(-.43,-.51);arrow.lineTo(.43,-.51);arrow.lineTo(.43,.08);arrow.lineTo(0,.62);arrow.lineTo(-.43,.08);arrow.closePath();
      this.headGeom=new T.ExtrudeGeometry(arrow,{depth:.14,bevelEnabled:false,steps:1});this.headGeom.rotateX(-Math.PI/2);
      this.wallGeom=new T.BoxGeometry(1.02,.72,1.02);
      this.foodGeom=new T.OctahedronGeometry(.31,0);
      this.pathGeom=new T.OctahedronGeometry(.19,0);
      this.ringGeom=new T.TorusGeometry(.42,.07,4,8);
      this.mat={floor:new T.MeshBasicMaterial({color:0xffffff}),wall:new T.MeshBasicMaterial({color:0xa316b3}),body:new T.MeshLambertMaterial({color:0xd71920,flatShading:true}),joint:new T.MeshLambertMaterial({color:0xb5141c,flatShading:true}),seam:new T.MeshBasicMaterial({color:0xe8f5ec}),head:new T.MeshLambertMaterial({color:0xe41b23,flatShading:true,side:T.DoubleSide}),headBorder:new T.MeshBasicMaterial({color:0xe8f5ec,side:T.DoubleSide}),food:new T.MeshBasicMaterial({color:0x29ef4e}),rare:new T.MeshBasicMaterial({color:0xf8e888}),multiplier:new T.MeshBasicMaterial({color:0xd393ec}),speedFood:new T.MeshBasicMaterial({color:0x70f485}),slowFood:new T.MeshBasicMaterial({color:0xed7865}),chain:new T.MeshBasicMaterial({color:0x77d7ed}),ring:new T.MeshBasicMaterial({color:0xf1f2ff}),speedTile:new T.MeshBasicMaterial({color:0x5af278,side:T.DoubleSide}),slowTile:new T.MeshBasicMaterial({color:0xf17958,side:T.DoubleSide}),hazard:new T.MeshBasicMaterial({color:0xf1b858}),portal:new T.MeshBasicMaterial({color:0x67c7e4,wireframe:true})};
      this.matrix=new T.Matrix4();this.quat=new T.Quaternion();this.scale=new T.Vector3(1,1,1);this.vec=new T.Vector3();
      this.headPos=new T.Vector3();
      this.resize();window.addEventListener('resize',()=>this.resize(),{passive:true});
    }
    quality(){const q=this.save.data.settings.graphics;return q==='High'?2:q==='Low'?1:Math.min(window.devicePixelRatio||1,1.5);}
    resize(){const w=this.renderer.domElement.clientWidth||innerWidth,h=this.renderer.domElement.clientHeight||innerHeight,aspect=w/h;this.renderer.setPixelRatio(this.quality());this.renderer.setSize(w,h,false);this.camera.aspect=aspect;this.camera.fov=aspect<1?62:58;this.camera.updateProjectionMatrix();}
    clear(group){while(group.children.length){const obj=group.children[0];group.remove(obj);if(obj.isInstancedMesh&&obj.dispose)obj.dispose();}}
    colorFloor(head,dir){
      const level=this.level,stamp=`${head[0]},${head[1]},${dir},${level.pathVersion},${level.pathIndex}`;
      if(stamp===this.floorStamp)return;
      this.floorStamp=stamp;
      const d=DIR[dir],active=new Map(level.path.slice(level.pathIndex).map((p,i)=>[key(...p),i]));
      for(let i=0;i<this.floorCells.length;i++){
        const [x,z]=this.floorCells[i],forward=(x-head[0])*d[0]+(z-head[1])*d[1];
        const t=clamp((forward+6)/20,0,1);
        if(level.config.classic)this.floorColor.setHex(level.cellColors.get(key(x,z))||0x095b22);
        else {this.floorColor.copy(this.floorNear).lerp(this.floorFar,t);
          const lateral=(x-head[0])*d[1]-(z-head[1])*d[0];
          if(lateral<-5)this.floorColor.lerp(this.floorSide,.38);
          if(lateral>6)this.floorColor.lerp(this.floorAccent,.18);
          if((x>4&&x<8&&z>12&&z<16)||(x>15&&x<19&&z>10&&z<13))this.floorColor.copy(this.floorAccent);}
        const pathStep=active.get(key(x,z));
        if(pathStep!==undefined)this.floorColor.setHex(pathStep===0?0x12d7ef:0x194bd9);
        this.floor.setColorAt(i,this.floorColor);
      }
      this.floor.instanceColor.needsUpdate=true;
    }
    build(level){
      this.level=level;this.clear(this.worldGroup);this.clear(this.dynamic);
      const cells=Array.from(level.cells);this.floorCells=cells.map(s=>s.split(',').map(Number));
      const floor=new T.InstancedMesh(level.config.hex?this.hexGeom:this.tileGeom,this.mat.floor,cells.length);
      floor.instanceMatrix.setUsage(T.StaticDrawUsage);
      const palette={green:[0x09c622,0x141a9b,0x9b08a7,0x0a83c5],blue:[0x0758e2,0x190b6c,0x9a0daf,0x06a8c5],violet:[0x19bf32,0x280982,0xb20ba0,0x157ac9],ember:[0xe83e12,0x27146e,0xea8714,0x1786a6]}[level.config.theme||'green'];
      this.floorNear=new T.Color(palette[0]);this.floorFar=new T.Color(palette[1]);this.floorAccent=new T.Color(palette[2]);this.floorSide=new T.Color(palette[3]);this.floorColor=new T.Color();
      this.floorCells.forEach(([x,z],i)=>{level.world(x,z,this.vec);this.vec.y=-.025;this.matrix.makeTranslation(this.vec.x,this.vec.y,this.vec.z);floor.setMatrixAt(i,this.matrix);floor.setColorAt(i,this.floorNear);});
      floor.instanceMatrix.needsUpdate=true;this.worldGroup.add(floor);this.floor=floor;this.floorStamp='';
      if(level.walls.size){const walls=new T.InstancedMesh(this.wallGeom,this.mat.wall,level.walls.size);let i=0;for(const s of level.walls){const [x,z]=s.split(',').map(Number);level.world(x,z,this.vec);this.matrix.makeTranslation(this.vec.x,.32,this.vec.z);walls.setMatrixAt(i++,this.matrix);}this.worldGroup.add(walls);}
      for(const [a,b] of level.portals)for(const p of [a,b]){const mesh=new T.Mesh(this.ringGeom,this.mat.portal);level.world(p[0],p[1],mesh.position);mesh.position.y=.12;mesh.rotation.x=-Math.PI/2;this.worldGroup.add(mesh);}
      this.maxBody=Math.min(level.w*level.h,512);this.bodyMesh=new T.InstancedMesh(this.bodyGeom,this.mat.body,this.maxBody);this.joints=new T.InstancedMesh(this.jointGeom,this.mat.joint,this.maxBody);this.seams=new T.InstancedMesh(this.seamGeom,this.mat.seam,this.maxBody);this.crossbars=new T.InstancedMesh(this.crossbarGeom,this.mat.seam,this.maxBody);this.bodyMesh.count=0;this.joints.count=0;this.seams.count=0;this.crossbars.count=0;this.dynamic.add(this.bodyMesh,this.joints,this.seams,this.crossbars);
      this.headBorder=new T.Mesh(this.headGeom,this.mat.headBorder);this.headBorder.scale.set(1.09,1,1.08);this.head=new T.Mesh(this.headGeom,this.mat.head);this.dynamic.add(this.headBorder,this.head);
      this.food=new T.Mesh(this.foodGeom,this.mat.food);this.dynamic.add(this.food);
      this.pathMesh=new T.Mesh(this.pathGeom,this.mat.ring);this.dynamic.add(this.pathMesh);this.pathStamp=-1;
      for(const [tiles,material] of [[level.speed,this.mat.speedTile],[level.slow,this.mat.slowTile]])for(const s of tiles){const [x,z]=s.split(',').map(Number);const m=new T.Mesh(this.ringGeom,material);level.world(x,z,m.position);m.position.y=.075;m.rotation.x=-Math.PI/2;this.worldGroup.add(m);}
      this.hazardMeshes=[];for(const h of level.hazards){const m=new T.Mesh(this.wallGeom,this.mat.hazard);this.dynamic.add(m);this.hazardMeshes.push(m);}
      this.cameraController.reset();
      this.colorFloor(level.config.start,level.config.start[2]);
    }
    draw(snake,food,alpha,dt,elapsed){
      const level=this.level;if(!level||!snake)return;
      const body=snake.body,prev=snake.prev;
      for(let i=0;i<body.length;i++){
        const p=body[i],old=prev[i]||p;
        let x=old[0]+(p[0]-old[0])*alpha,z=old[1]+(p[1]-old[1])*alpha;
        if(Math.abs(p[0]-old[0])+Math.abs(p[1]-old[1])>2){x=p[0];z=p[1];}
        level.world(x,z,this.vec);this.vec.y=.15;
        if(i===0){this.headPos.copy(this.vec);this.head.position.copy(this.vec);this.head.position.y=.42;this.headBorder.position.copy(this.head.position);this.headBorder.position.y=.405;const d=DIR[snake.dir],angle=Math.atan2(-d[0],-d[1]);this.head.rotation.set(0,angle,0);this.headBorder.rotation.set(0,angle,0);}
        else {
          const ahead=body[i-1],behind=body[i+1]||p,dx=ahead[0]-behind[0],dz=ahead[1]-behind[1];
          const ang=Math.atan2(dx,dz);this.quat.setFromAxisAngle(T.Object3D.DEFAULT_UP,ang);
          this.matrix.compose(this.vec,this.quat,this.scale);this.bodyMesh.setMatrixAt(i-1,this.matrix);
          this.vec.y=.50;this.matrix.compose(this.vec,this.quat,this.scale);this.crossbars.setMatrixAt(i-1,this.matrix);this.vec.y=.15;
          this.matrix.makeTranslation(this.vec.x,this.vec.y,this.vec.z);this.joints.setMatrixAt(i-1,this.matrix);
        }
      }
      this.bodyMesh.count=Math.max(0,body.length-1);this.joints.count=this.bodyMesh.count;this.seams.count=0;this.crossbars.count=this.bodyMesh.count;this.bodyMesh.instanceMatrix.needsUpdate=true;this.joints.instanceMatrix.needsUpdate=true;this.crossbars.instanceMatrix.needsUpdate=true;
      if(food){level.world(food.x,food.z,this.food.position);this.food.position.y=.35+Math.sin(elapsed*5)*.055;this.food.rotation.y=elapsed*1.6;this.food.visible=true;this.food.material=this.mat[food.type==='speed'?'speedFood':food.type==='slow'?'slowFood':food.type]||this.mat.food;}
      else this.food.visible=false;
      const pathStamp=`${level.pathVersion}:${level.pathIndex}:${level.pathDone}`;
      if(pathStamp!==this.pathStamp){
        this.pathStamp=pathStamp;this.pathMesh.visible=!level.pathDone&&level.pathIndex<level.path.length;
        if(this.pathMesh.visible){const p=level.path[level.pathIndex];level.world(p[0],p[1],this.pathMesh.position);this.pathMesh.position.y=.17;}
      }
      this.colorFloor(body[0],snake.dir);
      level.hazards.forEach((h,i)=>{const p=h.route[h.at],m=this.hazardMeshes[i];level.world(p[0],p[1],m.position);m.position.y=.35;});
      this.cameraController.update(this.headPos,snake.dir,dt,level);this.renderer.render(this.scene,this.camera);
    }
  }

  class InputController {
    constructor(game){this.game=game;this.start=null;this.bound=false;
      const canvas=$('game');canvas.addEventListener('pointerdown',e=>{this.start=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);},{passive:true});
      canvas.addEventListener('pointerup',e=>{if(!this.start)return;const dx=e.clientX-this.start[0],dy=e.clientY-this.start[1];this.start=null;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;if(Math.abs(dx)>Math.abs(dy))game.action(dx<0?'left':'right');else game.action(dy<0?'up':'down');},{passive:true});
      window.addEventListener('keydown',e=>{const map={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'pause',Escape:'pause'};const action=map[e.code];if(action){e.preventDefault();if(!e.repeat)game.action(action);}});
      document.querySelectorAll('#controls button').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();game.action(b.dataset.action);}));
    }
  }

  class UI {
    constructor(game){this.game=game;this.bind();this.settings();this.levels();}
    bind(){
      $('play').onclick=()=>this.game.start(Math.min(this.game.save.data.unlocked,LEVELS.length)-1);
      $('levels').onclick=()=>this.show('level-screen');$('settings').onclick=()=>this.show('settings-screen');
      document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>this.show('menu'));
      $('pause-button').onclick=()=>this.game.pause();
      const props=[['controls',['Swipe','Buttons']],['sound',[true,false]],['camera',['Classic','High']],['graphics',['Auto','High','Low']]];
      props.forEach(([name,values])=>{$(`setting-${name}`).onclick=()=>{const s=this.game.save.data.settings,i=values.indexOf(s[name]);s[name]=values[(i+1)%values.length];this.game.save.write();this.settings();this.game.renderer.resize();this.game.audio.play('select');};});
      document.querySelectorAll('[data-debug]').forEach(b=>b.onclick=()=>{const a=b.dataset.debug,g=this.game;if(a==='unlock'){g.save.data.unlocked=LEVELS.length;g.save.write();this.levels();}else if(a==='restart')g.start(g.levelIndex);else g.start(clamp(g.levelIndex+(a==='next'?1:-1),0,LEVELS.length-1));});
    }
    show(id){for(const el of document.querySelectorAll('.screen'))el.classList.toggle('hidden',el.id!==id);$('hud').classList.toggle('hidden',id!==null);$('timer-hud').classList.toggle('hidden',id!==null);$('pause-button').classList.toggle('hidden',id!==null);this.controls();}
    controls(){const s=this.game.save.data.settings;const playing=this.game.state==='playing';$('controls').classList.toggle('hidden',!playing||s.controls!=='Buttons');$('speed-indicator').classList.toggle('hidden',!playing||s.controls==='Buttons');}
    settings(){const s=this.game.save.data.settings;for(const k of ['controls','sound','camera','graphics'])$(`setting-${k}`).textContent=k==='sound'?(s[k]?'ON':'OFF'):s[k].toUpperCase();this.controls();}
    levels(){const grid=$('level-grid');grid.innerHTML='';LEVELS.forEach((l,i)=>{const b=document.createElement('button');b.className='level-card';b.disabled=i>=this.game.save.data.unlocked;b.innerHTML=`<strong>${pad(i+1)}</strong><small>${b.disabled?'LOCKED':l.name}</small>`;b.onclick=()=>this.game.start(i);grid.appendChild(b);});}
    hud(){const g=this.game;$('hud-level').textContent=pad(g.levelIndex+1);$('hud-name').textContent=g.level.config.name;$('hud-score').textContent=String(g.score).padStart(6,'0');$('hud-mult').textContent=`×${g.multiplier}`;$('hud-progress').textContent=`${Math.max(0,g.level.config.target-g.progress)}`;$('progress').style.width=`${Math.max(0,100-g.progress/g.level.config.target*100)}%`;}
    clock(){const g=this.game;$('hud-time').textContent=Math.max(0,Math.ceil(g.timeLeft));$('timer-progress').style.width=`${clamp(g.timeLeft/(g.level.config.time||Math.max(55,90-g.levelIndex*3))*100,0,100)}%`;}
    overlay(kicker,title,text,buttons){$('overlay-kicker').textContent=kicker;$('overlay-title').textContent=title;$('overlay-text').textContent=text;const box=$('overlay-actions');box.innerHTML='';for(const [label,fn,primary] of buttons){const b=document.createElement('button');b.textContent=label;if(primary)b.className='primary';b.onclick=fn;box.appendChild(b);}this.show('overlay');}
    toast(text,duration=1150){const el=$('toast');el.textContent=text;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.textContent='',duration);}
    debug(stats){if(!debug)return;$('debug').classList.remove('hidden');$('debug-stats').innerHTML=stats.join('<br>');}
  }

  class Game {
    constructor(){this.save=new SaveManager();this.audio=new AudioManager(this.save);this.renderer=new GameRenderer($('game'),this.save);this.input=new InputController(this);this.ui=new UI(this);this.state='menu';this.levelIndex=0;this.score=0;this.progress=0;this.elapsed=0;this.acc=0;this.tickCount=0;this.boostUntil=0;this.slowUntil=0;this.last=performance.now();this.fps=60;this.frameMs=16.7;
      this.load(0);this.ui.show('menu');document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.state==='playing')this.pause();this.last=performance.now();});requestAnimationFrame(t=>this.frame(t));
    }
    load(index){this.levelIndex=index;this.level=new Level(LEVELS[index],index);this.snake=new Snake(this.level);this.renderer.build(this.level);this.progress=0;this.acc=0;this.tickCount=0;this.elapsed=0;this.timeLeft=this.level.config.time||Math.max(55,90-index*3);this.lastClock=-1;this.multiplier=1;this.boostUntil=0;this.slowUntil=0;this.multUntil=0;this.pickups=0;this.chainRemaining=0;this.chainDeadline=0;this.lastFood=null;this.spawnFood();this.ui.hud();this.ui.clock();}
    start(index){this.score=0;this.load(index);this.state='playing';this.ui.show(null);this.ui.controls();this.audio.play('select');if(this.level.config.hint)this.ui.toast(this.level.config.hint,2500);}
    menu(){this.state='menu';this.ui.levels();this.ui.show('menu');this.audio.play('select');}
    pause(){if(this.state==='playing'){this.state='paused';this.ui.overlay('GAME PAUSED','PAUSED','Take your time. The grid will wait.',[['RESUME',()=>{this.state='playing';this.ui.show(null);this.last=performance.now();},true],['RESTART',()=>this.start(this.levelIndex)],['MAIN MENU',()=>this.menu()]]);}else if(this.state==='paused'){this.state='playing';this.ui.show(null);this.last=performance.now();}}
    action(a){if(this.state!=='playing'){if(a==='pause'&&this.state==='paused')this.pause();return;}if(a==='left'||a==='right'){this.snake.turn(a==='left'?-1:1);this.audio.play('turn');}else if(a==='up'){this.boostUntil=this.elapsed+1.2;this.audio.play('boost');this.ui.toast('ACCELERATE');}else if(a==='down'){this.slowUntil=this.elapsed+1.2;this.ui.toast('BRAKE');}else this.pause();}
    spawnFood(){
      const reserved=new Set(this.level.paths.flat().map(p=>key(...p)));
      const free=[];for(const s of this.level.cells){const [x,z]=s.split(',').map(Number);if(!this.level.isFree(x,z)||this.level.hazardAt(x,z)||this.snake.body.some(p=>p[0]===x&&p[1]===z)||reserved.has(s))continue;free.push([x,z]);}
      if(!free.length){this.food=null;return;}
      const special=this.level.config.special||[];
      if(!this.chainRemaining&&special.includes('chain')&&this.pickups>0&&this.pickups%5===0)this.chainRemaining=3;
      let type='food';
      if(this.chainRemaining)type='chain';
      else if(special.length&&Math.random()<.32){const candidate=special[Math.floor(Math.random()*special.length)];type=candidate==='chain'?'food':candidate;}
      let pool=free;
      if((this.levelIndex<2||this.level.config.classic)&&type==='food'){
        const h=this.snake.body[0],d=DIR[this.snake.dir];
        const ahead=free.filter(p=>{const dx=p[0]-h[0],dz=p[1]-h[1],forward=dx*d[0]+dz*d[1],side=Math.abs(dx*d[1]-dz*d[0]);return forward>=2&&forward<=8&&side<=4;});
        if(ahead.length)pool=ahead;
      }
      if(this.level.config.classic&&pool===free){const h=this.snake.body[0];const near=free.filter(p=>Math.abs(p[0]-h[0])+Math.abs(p[1]-h[1])<=8);if(near.length)pool=near;}
      if(this.level.config.classic&&this.pickups===0&&type==='food'){
        const h=this.snake.body[0],d=DIR[this.snake.dir],x=h[0]+2*d[0],z=h[1]+2*d[1];
        if(this.level.isFree(x,z)&&!reserved.has(key(x,z))){this.food={x,z,type};this.lastFood=[x,z];return;}
      }
      if(type==='chain'&&this.lastFood){const near=free.filter(p=>Math.abs(p[0]-this.lastFood[0])+Math.abs(p[1]-this.lastFood[1])<=4);if(near.length)pool=near;}
      const p=pool[Math.floor(Math.random()*pool.length)];this.food={x:p[0],z:p[1],type};this.lastFood=p;
      if(type==='chain')this.chainDeadline=this.elapsed+9;
    }
    tick(){
      const snake=this.snake,level=this.level;this.tickCount++;
      if(snake.turns.length)snake.dir=(snake.dir+snake.turns.shift()+4)%4;
      const d=DIR[snake.dir],h=snake.body[0];let [x,z]=level.wrap(h[0]+d[0],h[1]+d[1]);
      const portal=level.portalAt(x,z);if(portal){x=portal[0];z=portal[1];this.audio.play('bonus');}
      const eating=!!this.food&&this.food.x===x&&this.food.z===z;
      const foodType=eating?this.food.type:null;
      const growing=eating||snake.grow>0;
      const collision=CollisionSystem.check(level,snake,x,z,growing);
      if(collision){this.dead(collision);return;}
      snake.advance([x,z],growing);if(snake.grow>0)snake.grow--;
      if(eating){
        this.pickups++;const base=foodType==='rare'?500:foodType==='chain'?125:100;
        this.score+=base*this.multiplier*(this.elapsed<this.multUntil?2:1);this.progress+=foodType==='rare'?2:1;
        if(foodType==='multiplier'){this.multUntil=this.elapsed+12;this.ui.toast('SCORE ×2');}
        if(foodType==='speed'){this.boostUntil=this.elapsed+5;this.ui.toast('SPEED UP');}
        if(foodType==='slow'){this.slowUntil=this.elapsed+5;this.ui.toast('SLOW DOWN');}
        if(foodType==='chain'){this.chainRemaining--;if(!this.chainRemaining){this.score+=600;this.progress+=2;this.ui.toast('CHAIN COMPLETE +600');this.audio.play('bonus');}}
        else this.audio.play(foodType==='rare'?'bonus':'collect');
        this.spawnFood();this.ui.hud();
      }
      if(!level.pathDone&&level.path.length){
        const p=level.path[level.pathIndex];
        if(p&&p[0]===x&&p[1]===z){
          level.pathIndex++;this.audio.play('collect');
          if(level.pathIndex===level.path.length){
            this.progress+=Math.min(6,level.path.length);this.score+=400*this.multiplier;this.multiplier=Math.min(8,this.multiplier*2);
            this.ui.toast(`POWER PATH · ×${this.multiplier}`);this.audio.play('bonus');
            level.pathStage++;
            if(level.pathStage<level.paths.length){level.path=level.paths[level.pathStage];level.pathIndex=0;level.pathVersion++;}
            else level.pathDone=true;
            this.ui.hud();
          }
        }
        else if(level.pathIndex>0){level.pathIndex=0;this.multiplier=1;this.ui.toast('PATH BROKEN');this.ui.hud();}
      }
      const spot=key(x,z);if(level.speed.has(spot)){this.boostUntil=this.elapsed+2;this.ui.toast('SPEED TILE');}else if(level.slow.has(spot)){this.slowUntil=this.elapsed+2;this.ui.toast('SLOW TILE');}
      level.moveHazards(this.tickCount,snake.body);
      if(this.progress>=level.config.target)this.complete();
    }
    dead(reason){this.state='dead';this.save.score(this.levelIndex,this.score);this.audio.play(reason==='HIT A WALL'?'wall':'dead');this.ui.overlay('SIGNAL LOST','GAME OVER',`${reason} · SCORE ${this.score}`, [['TRY AGAIN',()=>this.start(this.levelIndex),true],['MAIN MENU',()=>this.menu()]]);}
    complete(){this.state='complete';this.save.finish(this.levelIndex,this.score);this.audio.play('complete');this.ui.levels();this.ui.overlay('STAGE CLEARED','LEVEL COMPLETE',`SCORE ${this.score} · BEST ${this.save.data.best[this.levelIndex]}`, [[this.levelIndex+1<LEVELS.length?'NEXT LEVEL':'PLAY AGAIN',()=>this.start(Math.min(this.levelIndex+1,LEVELS.length-1)),true],['LEVEL SELECT',()=>this.ui.show('level-screen')],['MAIN MENU',()=>this.menu()]]);}
    frame(now){const dt=Math.min(.05,(now-this.last)/1000||0);this.last=now;if(this.state==='playing'){this.elapsed+=dt;this.timeLeft-=dt;if(Math.ceil(this.timeLeft)!==this.lastClock){this.lastClock=Math.ceil(this.timeLeft);this.ui.clock();}if(this.timeLeft<=0)this.dead('OUT OF TIME');}this.frameMs=this.frameMs*.9+dt*1000*.1;this.fps=this.fps*.9+(dt?1/dt:60)*.1;
      if(this.state==='playing'){
        if(this.chainRemaining&&this.elapsed>this.chainDeadline){this.chainRemaining=0;this.pickups++;this.ui.toast('CHAIN EXPIRED');this.spawnFood();}
        const pace=this.level.config.step*(this.elapsed<this.boostUntil ? .68 : this.elapsed<this.slowUntil ? 1.42 : 1);
        this.acc+=dt;let safety=0;while(this.acc>=pace&&safety++<3&&this.state==='playing'){this.acc-=pace;this.tick();}
      }
      const pace=this.level.config.step*(this.elapsed<this.boostUntil ? .68 : this.elapsed<this.slowUntil ? 1.42 : 1);
      this.renderer.draw(this.snake,this.food,clamp(this.acc/pace,0,1),dt,this.elapsed);
      if(debug&&Math.floor(now/250)!==this.debugFrame){this.debugFrame=Math.floor(now/250);const info=this.renderer.renderer.info;const mem=performance.memory?`Memory ${(performance.memory.usedJSHeapSize/1048576).toFixed(1)} MB`:'';this.ui.debug([`FPS ${this.fps.toFixed(0)}`,`Frame ${this.frameMs.toFixed(1)} ms`,`Length ${this.snake.body.length}`,`Grid ${this.snake.body[0].join(',')}`,`Draw ${info.render.calls}`,`Triangles ${info.render.triangles}`,mem]);}
      requestAnimationFrame(t=>this.frame(t));
    }
  }

  try{new Game();}catch(error){console.error(error);$('menu').innerHTML='<div class="result"><h2>WEBGL UNAVAILABLE</h2><p>This device needs WebGL to play Snakes 3D.</p></div>';}
})();
