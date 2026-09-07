export const roster=[{name:'RHEA',title:'THE NIGHTMARE',color:'#ba94ff',power:94,speed:78,finisher:'RIPTIDE'},{name:'CHYNA',title:'THE NINTH WONDER',color:'#f47564',power:99,speed:70,finisher:'PEDIGREE'},{name:'CHARLOTTE',title:'THE QUEEN',color:'#7edbff',power:86,speed:87,finisher:'NATURAL SELECTION'},{name:'BIANCA',title:'THE EST',color:'#edc558',power:91,speed:95,finisher:'K.O.D.'}];
export type Action='idle'|'walk'|'punch'|'kick'|'block'|'hit'|'suplex'|'submission'|'pin'|'finisher'|'down';
export type Fighter={id:number,x:number,y:number,hp:number,energy:number,cooldown:number,action:Action,anim:number,duration:number,face:number,down:number};
export type Hold={kind:'suplex'|'submission'|'pin'|'finisher',attacker:0|1,time:number,duration:number,escape:number,damageApplied:boolean};
export type Match={fighters:[Fighter,Fighter],phase:'select'|'fight'|'paused'|'over',time:number,ai:number,hold:Hold|null,message:string,messageTime:number,shake:number,impact:number,winner:number|null};
export const makeFighter=(id:number,x:number):Fighter=>({id,x,y:382,hp:100,energy:0,cooldown:0,action:'idle',anim:0,duration:0,face:x<500?1:-1,down:0});
export const createMatch=(a=0,b=1,phase:Match['phase']='select'):Match=>({fighters:[makeFighter(a,350),makeFighter(b,690)],phase,time:180,ai:.8,hold:null,message:'BELL RINGS',messageTime:1.2,shake:0,impact:0,winner:null});
const distance=(a:Fighter,b:Fighter)=>Math.hypot(a.x-b.x,(a.y-b.y)*1.5);
const announce=(s:Match,message:string,time=1)=>{s.message=message;s.messageTime=time;};
const finish=(s:Match,winner:number|null,reason:string)=>{s.phase='over';s.winner=winner;announce(s,winner===null?'DRAW':`${roster[s.fighters[winner].id].name} WINS`,99);s.message+=` · ${reason}`;s.hold=null;};
const hurt=(s:Match,a:Fighter,b:Fighter,n:number)=>{b.hp=Math.max(0,b.hp-n);a.energy=Math.min(100,a.energy+12);b.energy=Math.min(100,b.energy+5);s.shake=.18;s.impact++;};
export function escapeHold(s:Match,who:number){if(s.hold&&who!==s.hold.attacker&&s.hold.kind!=='suplex'&&s.hold.kind!=='finisher')s.hold.escape=Math.min(1,s.hold.escape+.13);}
export function attack(s:Match,who:0|1,kind:Action){const a=s.fighters[who],b=s.fighters[1-who];if(s.phase!=='fight'||s.hold||a.cooldown>0||a.down>0)return false;
const ground=b.down>0,range=kind==='kick'?148:kind==='punch'?132:113;
if(kind==='finisher'&&a.energy<100){announce(s,'CHARGE YOUR FINISHER FIRST');return false;}
if(kind==='pin'&&!ground){announce(s,'KNOCK THEM DOWN, THEN PIN');return false;}
if(['suplex','submission','pin','finisher'].includes(kind)&&distance(a,b)>range){announce(s,'GET CLOSER TO GRAPPLE');a.cooldown=.25;return false;}
if(['punch','kick'].includes(kind)&&ground){announce(s,'OPPONENT DOWN · PIN OR SUBMIT');return false;}
if(['suplex','submission','pin','finisher'].includes(kind)){
if(ground&&(kind==='suplex'||kind==='finisher')){announce(s,'OPPONENT DOWN · PIN OR SUBMIT');return false;}
const duration=kind==='suplex'?1.65:kind==='finisher'?2.05:kind==='pin'?3.2:4;
s.hold={kind:kind as Hold['kind'],attacker:who,time:0,duration,escape:0,damageApplied:false};a.action=kind;a.duration=duration;a.anim=duration;b.action=kind==='pin'?'down':'hit';b.anim=duration;a.face=b.x>=a.x?1:-1;b.face=-a.face;if(kind==='finisher')a.energy=0;announce(s,kind==='finisher'?roster[a.id].finisher:kind==='suplex'?'VERTICAL SUPLEX':kind==='submission'?'SUBMISSION LOCKED':'COVER!',duration);return true;}
a.action=kind;a.anim=kind==='kick'?.48:.32;a.duration=a.anim;a.cooldown=kind==='kick'?.68:.4;
if(distance(a,b)>range)return true;const blocked=b.action==='block';hurt(s,a,b,(kind==='kick'?10:6)*roster[a.id].power/90*(blocked?.16:1));if(blocked)announce(s,'BLOCKED',.5);else{b.action='hit';b.anim=.25;b.duration=.25;b.cooldown=.25;b.x+=a.face*10;if(b.hp<=0){b.down=5;b.action='down';announce(s,'DOWN! PIN OR SUBMIT TO WIN',2);}}return true;}
export function step(s:Match,dt:number,keys:Set<string>,random= Math.random){if(s.phase!=='fight')return;dt=Math.min(dt,.04);s.time=Math.max(0,s.time-dt);s.messageTime=Math.max(0,s.messageTime-dt);s.shake=Math.max(0,s.shake-dt);const [p,e]=s.fighters;
if(s.hold){const h=s.hold,a=s.fighters[h.attacker],b=s.fighters[1-h.attacker];h.time+=dt;if(h.kind==='submission'||h.kind==='pin'){if(h.attacker===0)h.escape+=dt*(h.kind==='pin'?(b.hp>35?.65:b.hp>15?.26:.07):.13+b.hp*.003);if(h.escape>=1){b.down=.8;a.cooldown=.8;announce(s,'ESCAPED!',1.2);s.hold=null;}else if(h.kind==='submission'){b.hp=Math.max(0,b.hp-dt*5);if(b.hp<=0)finish(s,h.attacker,'SUBMISSION');}else if(h.time>=h.duration)finish(s,h.attacker,'PIN FALL');}
if(s.hold&&(h.kind==='suplex'||h.kind==='finisher')&&h.time>h.duration*.7&&!h.damageApplied){hurt(s,a,b,(h.kind==='suplex'?18:36)*roster[a.id].power/90);h.damageApplied=true;s.shake=.38;b.down=5;}
if(s.hold&&h.time>=h.duration){b.down=Math.max(b.down,1.2);a.cooldown=.5;s.hold=null;announce(s,b.hp<=0?'PIN OR SUBMIT TO FINISH':'OPPONENT DOWN · N TO PIN',1.5);}
if(!s.hold){for(const f of s.fighters){f.anim=0;f.action=f.down>0?'down':'idle';}}
}else{
for(const f of s.fighters){f.cooldown=Math.max(0,f.cooldown-dt);f.anim=Math.max(0,f.anim-dt);f.down=Math.max(0,f.down-dt);if(f.down>0)f.action='down';else if(f.anim===0)f.action='idle';}p.face=e.x>=p.x?1:-1;e.face=-p.face;
const blocking=keys.has(' ')&&p.cooldown===0&&p.down===0;if(blocking)p.action='block';if(p.cooldown===0&&p.down===0&&!blocking){const dx=+(keys.has('d')||keys.has('arrowright'))-+(keys.has('a')||keys.has('arrowleft')),dy=+(keys.has('s')||keys.has('arrowdown'))-+(keys.has('w')||keys.has('arrowup'));p.x+=dx*155*roster[p.id].speed/85*dt;p.y+=dy*90*dt;if(dx||dy)p.action='walk';for(const [key,kind]of [['j','punch'],['k','kick'],['l','suplex'],['u','submission'],['n','pin'],['i','finisher']] as [string,Action][]){if(keys.has(key)){attack(s,0,kind);break;}}}
s.ai-=dt;if(!s.hold&&e.cooldown===0&&e.down===0){if(distance(e,p)>96){e.action='walk';e.x+=Math.sign(p.x-e.x)*100*dt;e.y+=Math.sign(p.y-e.y)*62*dt;}else if(s.ai<=0){if(p.down>0)attack(s,1,p.hp<35?'pin':'submission');else if(e.energy>=100)attack(s,1,'finisher');else if(random()<.2){e.action='block';e.anim=.65;e.cooldown=.65;}else attack(s,1,(['punch','kick','suplex','submission'] as Action[])[Math.floor(random()*4)]);s.ai=.65+random()*.65;}}
if(!s.hold&&p.down===0&&e.down===0){const dx=e.x-p.x,dy=e.y-p.y;if(Math.abs(dx)<78&&Math.abs(dy)<35){const shift=(78-Math.abs(dx))/2,sign=dx>=0?1:-1;p.x-=shift*sign;e.x+=shift*sign;}}
}for(const f of s.fighters){f.x=Math.max(170,Math.min(870,f.x));f.y=Math.max(325,Math.min(445,f.y));}if(s.time<=0&&s.phase==='fight')finish(s,p.hp===e.hp?null:p.hp>e.hp?0:1,'TIME LIMIT');}
