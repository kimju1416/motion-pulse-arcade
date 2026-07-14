import { FilesetResolver, PoseLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm";

const $ = (s) => document.querySelector(s);
const canvas = $("#gameCanvas"), ctx = canvas.getContext("2d");
const video = $("#camera");
const ui = {
  intro:$("#intro"),loading:$("#loading"),loadingTitle:$("#loadingTitle"),loadingText:$("#loadingText"),
  calibrate:$("#calibrate"),calibrateText:$("#calibrateText"),signal:$("#signalBar"),countdown:$("#countdown"),
  result:$("#result"),resultTitle:$("#resultTitle"),cue:$("#cue"),toast:$("#toast"),demoHelp:$("#demoHelp"),motionArt:$("#motionArt"),
  score:$("#score"),combo:$("#combo"),time:$("#time"),finalScore:$("#finalScore"),accuracy:$("#accuracy"),maxCombo:$("#maxCombo"),grade:$("#grade")
};

const bg = new Image(); bg.src = "assets/neon-arena.webp";
let poseLandmarker, stream, running=false, demo=false, sound=true, lastVideoTime=-1, lastPose=null;
let score=0, combo=0, maxCombo=0, hits=0, misses=0, startedAt=0, target=null, particles=[], ripples=[];
let calibrationFrames=0, calibrationStarted=0, audioCtx;
let selectedGame="pulse", sessionMs=60000, squatNext="squat", rhythmSide="right";
const TARGET_LIFE=2600;
const games={
  pulse:{name:"NEON TOUCH",ms:60000,image:"assets/game-pulse.webp",description:"공간에 나타나는 코어와 스쿼트 게이트를 연속 공략합니다."},
  rhythm:{name:"BEAT BOX",ms:45000,image:"assets/game-rhythm.webp",description:"박자에 맞춰 왼손과 오른손 펀치를 번갈아 적중시킵니다."},
  squat:{name:"SQUAT TUNNEL",ms:45000,image:"assets/game-squat.webp",description:"낮은 게이트와 높은 게이트를 오가며 정확한 스쿼트를 반복합니다."},
  pose:{name:"POSE FLASH",ms:60000,image:"assets/game-pose.webp",description:"양팔 들기, T 자세, 좌우 기울이기 등 전신 포즈를 빠르게 맞춥니다."}
};
const connections=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];

function resize(){const d=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0)}
addEventListener("resize",resize);addEventListener("orientationchange",()=>setTimeout(resize,180));resize();
const hide=(...els)=>els.forEach(e=>e.classList.add("hidden")); const show=(e)=>e.classList.remove("hidden");
function setLoading(title,text){ui.loadingTitle.textContent=title;ui.loadingText.textContent=text;show(ui.loading)}
function tone(freq=440,dur=.08,type="sine",vol=.06){if(!sound)return;audioCtx ||= new AudioContext();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}

async function loadPose(){
  if(poseLandmarker)return;
  const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm");
  poseLandmarker=await PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"GPU"},runningMode:"VIDEO",numPoses:1,minPoseDetectionConfidence:.55,minPosePresenceConfidence:.55,minTrackingConfidence:.55});
}
async function startCamera(){
  hide(ui.intro);setLoading("카메라 연결 중","브라우저의 카메라 사용을 허용해 주세요.");
  try{
    const portrait=matchMedia("(orientation: portrait)").matches;
    stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:portrait?720:1280},height:{ideal:portrait?1280:720},facingMode:{ideal:"user"},frameRate:{ideal:30,max:30}},audio:false});
    video.srcObject=stream;await video.play();setLoading("동작 인식 준비 중","AI 포즈 모델을 불러오고 있습니다.");await loadPose();
    hide(ui.loading);show(ui.calibrate);calibrationStarted=performance.now();calibrationFrames=0;demo=false;requestAnimationFrame(loop);
  }catch(err){setLoading("카메라를 시작할 수 없어요","주소창의 카메라 권한을 허용한 뒤 새로고침하거나, 카메라 없이 체험해 보세요.");setTimeout(()=>{hide(ui.loading);show(ui.intro)},3500)}
}
function startDemo(){hide(ui.intro,ui.loading,ui.calibrate);demo=true;show(ui.demoHelp);startCountdown()}
async function startCountdown(){
  hide(ui.calibrate,ui.loading);for(const n of [3,2,1]){ui.countdown.textContent=n;show(ui.countdown);tone(280+n*80,.12,"square",.04);await new Promise(r=>setTimeout(r,720));hide(ui.countdown)}
  ui.countdown.textContent="GO";show(ui.countdown);tone(660,.25,"sawtooth",.07);await new Promise(r=>setTimeout(r,520));hide(ui.countdown);beginGame();
}
function beginGame(){score=combo=maxCombo=hits=misses=0;particles=[];ripples=[];squatNext="squat";rhythmSide="right";sessionMs=games[selectedGame].ms;ui.motionArt.src=games[selectedGame].image;startedAt=performance.now();running=true;spawnTarget();updateHUD();show(ui.cue);show(ui.motionArt);if(demo)requestAnimationFrame(loop)}
function spawnTarget(){
  const elapsed=(performance.now()-startedAt)/1000;let type="any",x=.5,y=.5,radius=.065;
  if(selectedGame==="pulse"){
    const roll=Math.random();if(elapsed>12&&roll<.18)type="squat";else if(elapsed>7&&roll<.52)type=Math.random()<.5?"left":"right";
    x=.16+Math.random()*.68;y=.23+Math.random()*.52;
  }else if(selectedGame==="rhythm"){
    rhythmSide=rhythmSide==="left"?"right":"left";type=rhythmSide;x=type==="left"?.72:.28;y=.38+Math.random()*.25;radius=.075;
  }else if(selectedGame==="squat"){
    type=squatNext;squatNext=squatNext==="squat"?"stand":"squat";x=.5;y=type==="squat"?.78:.31;radius=.13;
  }else{
    const poses=["poseUp","poseT","leanLeft","leanRight","squat"];type=poses[Math.floor(Math.random()*poses.length)];x=.5;y=.58;radius=.16;
  }
  target={type,x,y,r:radius,born:performance.now(),dwell:0,pulse:0};
  const labels={any:["에너지 코어","손으로 터치!"],left:["왼손 코어","왼손으로 터치!"],right:["오른손 코어","오른손으로 터치!"],squat:["LOW GATE","스쿼트 자세!"],stand:["RISE UP","완전히 일어서기!"],poseUp:["POWER UP","양손을 머리 위로!"],poseT:["T-POSE","양팔을 옆으로!"],leanLeft:["LEAN LEFT","화면 왼쪽으로 기울이기!"],leanRight:["LEAN RIGHT","화면 오른쪽으로 기울이기!"]};
  ui.cue.querySelector("strong").textContent=labels[type][0];ui.cue.querySelector("span").textContent=labels[type][1];
}
function updateHUD(){ui.score.textContent=String(score).padStart(5,"0");ui.combo.textContent=`×${combo}`;ui.time.textContent=Math.max(0,Math.ceil((sessionMs-(performance.now()-startedAt))/1000))}
function pos(lm){return {x:(1-lm.x)*innerWidth,y:lm.y*innerHeight,v:lm.visibility??1}}
function posePoints(){if(!lastPose)return null;return {lw:pos(lastPose[15]),rw:pos(lastPose[16]),ls:pos(lastPose[11]),rs:pos(lastPose[12]),lh:pos(lastPose[23]),rh:pos(lastPose[24]),lk:pos(lastPose[25]),rk:pos(lastPose[26])}}
function angle(a,b,c){const ab={x:a.x-b.x,y:a.y-b.y},cb={x:c.x-b.x,y:c.y-b.y};return Math.acos(Math.max(-1,Math.min(1,(ab.x*cb.x+ab.y*cb.y)/(Math.hypot(ab.x,ab.y)*Math.hypot(cb.x,cb.y)||1))))*180/Math.PI}
function isSquat(p){const hipY=(p.lh.y+p.rh.y)/2,shoulderY=(p.ls.y+p.rs.y)/2,kneeY=(p.lk.y+p.rk.y)/2,torso=Math.max(60,hipY-shoulderY);const kneeBent=(angle(p.lh,p.lk,{x:p.lk.x,y:innerHeight})+angle(p.rh,p.rk,{x:p.rk.x,y:innerHeight}))/2<145;return hipY>kneeY-torso*.5&&kneeBent}
function isStand(p){return (angle(p.lh,p.lk,{x:p.lk.x,y:innerHeight})+angle(p.rh,p.rk,{x:p.rk.x,y:innerHeight}))/2>158}
function isPose(type,p){
  const shoulderY=(p.ls.y+p.rs.y)/2,hipY=(p.lh.y+p.rh.y)/2,torso=Math.max(70,hipY-shoulderY),shoulderX=(p.ls.x+p.rs.x)/2,hipX=(p.lh.x+p.rh.x)/2;
  if(type==="poseUp")return p.lw.y<shoulderY-torso*.35&&p.rw.y<shoulderY-torso*.35;
  if(type==="poseT")return Math.abs(p.lw.y-shoulderY)<torso*.42&&Math.abs(p.rw.y-shoulderY)<torso*.42&&Math.abs(p.lw.x-p.rw.x)>torso*1.8;
  if(type==="leanLeft")return shoulderX<hipX-torso*.14;
  if(type==="leanRight")return shoulderX>hipX+torso*.14;
  return false;
}
function targetLife(){if(demo)return 6000;if(selectedGame==="rhythm")return 1750;if(selectedGame==="squat")return 4200;if(selectedGame==="pose")return 3600;return TARGET_LIFE}
function checkHit(now){
  if(!target)return;let inside=false;const p=posePoints(),tx=target.x*innerWidth,ty=target.y*innerHeight,rr=target.r*Math.min(innerWidth,innerHeight);
  if(target.type==="squat")inside=demo?false:(p&&isSquat(p));
  else if(target.type==="stand")inside=demo?false:(p&&isStand(p));
  else if(["poseUp","poseT","leanLeft","leanRight"].includes(target.type))inside=demo?false:(p&&isPose(target.type,p));
  else if(p){const candidates=target.type==="left"?[p.lw]:target.type==="right"?[p.rw]:[p.lw,p.rw];inside=candidates.some(q=>q.v>.45&&Math.hypot(q.x-tx,q.y-ty)<rr*1.25)}
  if(inside)target.dwell+=16;else target.dwell=Math.max(0,target.dwell-18);
  const life=targetLife(),hold=selectedGame==="pose"?420:selectedGame==="squat"?260:150;
  if(target.dwell>hold)hitTarget(tx,ty);else if(now-target.born>life){misses++;combo=0;tone(115,.15,"sawtooth",.025);spawnTarget();updateHUD()}
}
function hitTarget(x,y){hits++;combo++;maxCombo=Math.max(maxCombo,combo);const gain=100+Math.min(combo,20)*10;score+=gain;tone(520+Math.min(combo,12)*28,.1,"triangle",.07);burst(x,y,target.type==="squat"?"#c8ff3d":target.type==="any"?"#38f6ff":"#ff3ea5");ui.toast.textContent=combo>2?`${combo} COMBO  +${gain}`:`PERFECT  +${gain}`;ui.toast.classList.remove("show");void ui.toast.offsetWidth;ui.toast.classList.add("show");spawnTarget();updateHUD()}
function burst(x,y,color){ripples.push({x,y,r:8,a:1,color});for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*8;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color})}}
function drawBackground(t){
  ctx.clearRect(0,0,innerWidth,innerHeight);if(bg.complete&&bg.naturalWidth)ctx.drawImage(bg,0,0,innerWidth,innerHeight);else{const g=ctx.createRadialGradient(innerWidth/2,innerHeight*.55,0,innerWidth/2,innerHeight*.55,innerWidth*.65);g.addColorStop(0,"#19102e");g.addColorStop(.45,"#070510");g.addColorStop(1,"#020105");ctx.fillStyle=g;ctx.fillRect(0,0,innerWidth,innerHeight)}
  if(video.readyState>=2&&!demo){ctx.save();ctx.globalAlpha=.72;ctx.globalCompositeOperation="screen";ctx.translate(innerWidth,0);ctx.scale(-1,1);const vr=video.videoWidth/video.videoHeight,cr=innerWidth/innerHeight;let sx=0,sy=0,sw=video.videoWidth,sh=video.videoHeight;if(vr>cr){sw=video.videoHeight*cr;sx=(video.videoWidth-sw)/2}else{sh=video.videoWidth/cr;sy=(video.videoHeight-sh)/2}ctx.drawImage(video,sx,sy,sw,sh,0,0,innerWidth,innerHeight);ctx.restore();ctx.fillStyle="#04030a55";ctx.fillRect(0,0,innerWidth,innerHeight)}
  ctx.strokeStyle="#38f6ff18";ctx.lineWidth=1;for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(innerWidth/2,innerHeight*.55,innerWidth*(.16+i*.11),innerHeight*(.22+i*.11),0,0,Math.PI*2);ctx.stroke()}
}
function drawPose(){if(!lastPose||demo)return;ctx.save();ctx.lineWidth=3;ctx.shadowBlur=16;ctx.shadowColor="#38f6ff";ctx.strokeStyle="#bafcffbb";connections.forEach(([a,b])=>{const p=pos(lastPose[a]),q=pos(lastPose[b]);if(p.v>.4&&q.v>.4){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}});[15,16].forEach((i,n)=>{const p=pos(lastPose[i]);ctx.fillStyle=n?"#ff3ea5":"#38f6ff";ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fill()});ctx.restore()}
function drawPoseGlyph(type,x,y,r,t){ctx.save();ctx.translate(x,y);ctx.strokeStyle="#c8ff3d";ctx.fillStyle="#c8ff3d";ctx.lineWidth=6;ctx.lineCap="round";ctx.shadowBlur=25;ctx.shadowColor="#c8ff3d";ctx.beginPath();ctx.arc(0,-r*.72,r*.14,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(0,-r*.54);ctx.lineTo(0,r*.18);if(type==="poseUp"){ctx.moveTo(0,-r*.38);ctx.lineTo(-r*.34,-r*.84);ctx.moveTo(0,-r*.38);ctx.lineTo(r*.34,-r*.84)}else if(type==="poseT"){ctx.moveTo(-r*.65,-r*.34);ctx.lineTo(r*.65,-r*.34)}else{const dir=type==="leanLeft"?-1:1;ctx.moveTo(0,-r*.42);ctx.lineTo(dir*r*.34,-r*.08);ctx.moveTo(dir*r*.12,-r*.28);ctx.lineTo(dir*r*.58,-r*.48)}ctx.moveTo(0,r*.18);ctx.lineTo(-r*.32,r*.72);ctx.moveTo(0,r*.18);ctx.lineTo(r*.32,r*.72);ctx.stroke();ctx.globalAlpha=.25+.12*Math.sin(t/130);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.restore()}
function drawTarget(t){if(!target||!running)return;const x=target.x*innerWidth,y=target.y*innerHeight,r=target.r*Math.min(innerWidth,innerHeight),age=t-target.born,life=Math.max(0,1-age/targetLife());if(target.type==="squat"||target.type==="stand"){const low=target.type==="squat",color=low?"#c8ff3d":"#38f6ff";ctx.save();ctx.shadowBlur=28;ctx.shadowColor=color;ctx.strokeStyle=color;ctx.globalAlpha=.65+.25*Math.sin(t/130);ctx.lineWidth=5;ctx.setLineDash([24,12]);ctx.strokeRect(innerWidth*.18,y-r*.45,innerWidth*.64,r*.9);ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle=color;ctx.font="700 13px IBM Plex Sans KR";ctx.textAlign="center";ctx.fillText(low?"몸을 낮춰 게이트 통과":"무릎을 펴고 완전히 일어서기",innerWidth/2,y+5);ctx.restore();return}if(["poseUp","poseT","leanLeft","leanRight"].includes(target.type)){drawPoseGlyph(target.type,x,y,r,t);return}
  const color=target.type==="any"?"#38f6ff":"#ff3ea5";ctx.save();ctx.translate(x,y);ctx.rotate(t/1200);ctx.shadowBlur=30;ctx.shadowColor=color;ctx.strokeStyle=color;ctx.lineWidth=4;for(let i=0;i<3;i++){ctx.globalAlpha=.26+i*.24;ctx.beginPath();ctx.arc(0,0,r*(.58+i*.22)+Math.sin(t/120+i)*4,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,0,r*.18,0,Math.PI*2);ctx.fill();ctx.rotate(-t/1200);ctx.fillStyle="#fff";ctx.font="700 12px IBM Plex Sans KR";ctx.textAlign="center";ctx.fillText(target.type==="any"?"TOUCH":target.type==="left"?"LEFT":"RIGHT",0,r+26);ctx.restore();ctx.fillStyle="#ffffff18";ctx.fillRect(x-r,y-r-12,r*2,3);ctx.fillStyle=color;ctx.fillRect(x-r,y-r-12,r*2*life,3)
}
function drawEffects(){particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.96;p.vy*=.96;p.life-=.035;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)});particles=particles.filter(p=>p.life>0);ripples.forEach(r=>{r.r+=10;r.a-=.06;ctx.globalAlpha=Math.max(0,r.a);ctx.strokeStyle=r.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke()});ripples=ripples.filter(r=>r.a>0);ctx.globalAlpha=1}
async function detect(){if(!poseLandmarker||video.readyState<2||video.currentTime===lastVideoTime)return;lastVideoTime=video.currentTime;const result=poseLandmarker.detectForVideo(video,performance.now());lastPose=result.landmarks?.[0]||null}
function calibration(){const now=performance.now(),visible=lastPose&&[11,12,23,24,25,26].every(i=>(lastPose[i].visibility??0)>.45);calibrationFrames=visible?Math.min(60,calibrationFrames+1):Math.max(0,calibrationFrames-2);ui.signal.style.width=`${calibrationFrames/60*100}%`;ui.calibrateText.textContent=visible?"좋아요, 그대로 서세요!":"어깨부터 무릎까지 화면에 보여주세요";if(calibrationFrames>=60)startCountdown();else if(now-calibrationStarted>15000){ui.calibrateText.textContent="인식이 어렵다면 조명을 밝히고 조금 뒤로 서주세요"}}
function loop(t=performance.now()){
  drawBackground(t);if(!demo)detect();drawPose();if(!running&&ui.calibrate&&!ui.calibrate.classList.contains("hidden"))calibration();
  if(running){drawTarget(t);drawEffects();checkHit(t);updateHUD();if(t-startedAt>=sessionMs)endGame()}
  if(running||(!demo&&stream))requestAnimationFrame(loop)
}
function endGame(){running=false;target=null;hide(ui.cue,ui.demoHelp,ui.motionArt);const total=hits+misses,acc=total?Math.round(hits/total*100):0;ui.resultTitle.textContent=`${games[selectedGame].name} 완료!`;ui.finalScore.textContent=score.toLocaleString();ui.accuracy.textContent=`${acc}%`;ui.maxCombo.textContent=maxCombo;ui.grade.textContent=acc>=92?"S":acc>=80?"A":acc>=65?"B":"C";tone(660,.18,"triangle",.08);setTimeout(()=>tone(880,.35,"triangle",.08),180);show(ui.result)}
function demoTap(x,y){if(!running||!demo||!target||target.type==="squat")return;const tx=target.x*innerWidth,ty=target.y*innerHeight,r=target.r*Math.min(innerWidth,innerHeight);if(Math.hypot(x-tx,y-ty)<r*1.4)hitTarget(tx,ty)}
$("#app").addEventListener("click",e=>{if(!e.target.closest("button"))demoTap(e.clientX,e.clientY)});addEventListener("keydown",e=>{if(!demo||!running||!target)return;if(target.type==="squat"&&e.key.toLowerCase()==="s")hitTarget(innerWidth/2,target.y*innerHeight);else if(target.type!=="squat"&&e.code==="Space")hitTarget(target.x*innerWidth,target.y*innerHeight)});
$("#startBtn").onclick=startCamera;$("#demoBtn").onclick=startDemo;$("#retryBtn").onclick=()=>{hide(ui.result);demo?startCountdown():startCountdown()};$("#soundBtn").onclick=e=>{sound=!sound;e.currentTarget.classList.toggle("off",!sound)};
document.querySelectorAll(".game-card").forEach(card=>card.addEventListener("click",()=>{document.querySelectorAll(".game-card").forEach(c=>c.classList.remove("active"));card.classList.add("active");selectedGame=card.dataset.game;sessionMs=games[selectedGame].ms;ui.motionArt.src=games[selectedGame].image;ui.motionArt.alt=`${games[selectedGame].name} 동작 안내`;$("#gameDescription").textContent=games[selectedGame].description;ui.time.textContent=Math.round(sessionMs/1000);tone(330,.05,"triangle",.025)}));
drawBackground(0);
