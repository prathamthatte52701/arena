import React, { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { usePromoSpeech } from '../promo/performance/usePromoSpeech';
import { REST_MOUTH } from '../promo/face/mouth';

// Controlled network/media races exercising the real hook, not real audio QA.
type Pending = { text: string; tone: string; signal: AbortSignal; resolve: (r: Response) => void };
const requests: Pending[] = [];
window.fetch = (_url, init) => new Promise(resolve => requests.push({ ...JSON.parse(typeof init?.body === 'string' ? init.body : '{}'), signal: init?.signal as AbortSignal, resolve }));
let queued: SpeechSynthesisUtterance | null = null;
Object.defineProperty(window, 'speechSynthesis', { value: {getVoices:()=>[],cancel:()=>{queued=null;},speak:(u: SpeechSynthesisUtterance)=>{queued=u;}}, configurable:true });
const audios: FakeAudio[] = [];
class FakeAudio extends EventTarget {
  constructor() {super();audios.push(this);}
  src='';preload='';currentTime=0;duration=4;ended=false;paused=true;playCount=0;
  onplay: (()=>void)|null=null; onplaying: (()=>void)|null=null; onpause: (()=>void)|null=null; onended: (()=>void)|null=null; onerror: (()=>void)|null=null;
  load(){if(this.src)queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')));}
  async play(){this.playCount++;this.paused=false;this.onplaying?.();}
  pause(){this.paused=true;this.onpause?.();}
  removeAttribute(name:string){if(name==='src')this.src='';}
}
Object.defineProperty(window,'Audio',{value:FakeAudio,configurable:true});
let api: ReturnType<typeof usePromoSpeech>;
const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
function Harness(){const speech=usePromoSpeech();useLayoutEffect(()=>{api=speech;});return null;}
flushSync(()=>root.render(<Harness/>));
const settle=()=>new Promise<void>(resolve=>setTimeout(resolve,20));
const completeRequest=async(index:number)=>{requests[index].resolve(new Response(new Blob(['mock audio']),{status:200}));await settle();};
const set=(text:string,tone: 'AUTO'|'COLD'|'ANGRY'='AUTO')=>flushSync(()=>{api.setText(text);api.setTone(tone);});
const rest=()=>JSON.stringify(api.sampleMouth(performance.now()).deformation)===JSON.stringify(REST_MOUTH);
document.querySelector<HTMLButtonElement>('#run')!.onclick=async()=>{
 const results:{name:string;pass:boolean}[]=[];
 const check=(name:string,pass:boolean)=>{results.push({name,pass});};
 set('My real promo.','COLD');api.deliver();await settle();
 check('generation keeps REST',api.status==='GENERATING'&&rest());
 api.stop();await settle();check('STOP aborts generation',requests[0].signal.aborted&&api.status==='STOPPED'&&rest());
 await completeRequest(0);check('late STOP result never creates audio',audios.length===0);
 set('First promo','COLD');api.deliver();await settle();const a=requests.length-1;
 set('Second promo','ANGRY');api.deliver();await settle();const b=requests.length-1;
 await completeRequest(b);check('newest generation plays',audios.length===1&&audios[0].playCount===1);
 await completeRequest(a);check('older generation finishing late never plays',audios.length===1&&requests[a].signal.aborted);
 const live=audios[0];live.currentTime=1;const before=api.sampleMouth(1000);check('actual audio time opens mouth',JSON.stringify(before.deformation)!==JSON.stringify(REST_MOUTH));
 api.sampleMouth(100000);check('wall time does not advance audio clock',JSON.stringify(api.sampleMouth(100001).deformation)===JSON.stringify(before.deformation));
 api.stop();await settle();check('STOP pauses resets detaches audio',live.paused&&live.currentTime===0&&live.src===''&&rest()&&api.status==='STOPPED');
 set('First promo','COLD');api.deliver();await settle();await completeRequest(requests.length-1);
 set('Undelivered text','ANGRY');api.speakPreview('Maybe we prove who really belongs here.');await settle();await completeRequest(requests.length-1);
 api.replay();await settle();check('preview cannot overwrite replay text',requests.at(-1)?.text==='First promo');check('preview cannot overwrite replay tone',requests.at(-1)?.tone==='COLD');
 await completeRequest(requests.length-1);const final=audios.at(-1)!;final.currentTime=4;final.ended=true;final.onended?.();await settle();check('end is COMPLETE and REST',api.status==='COMPLETE'&&rest());
 api.deliver();await settle();requests.at(-1)!.resolve(new Response('',{status:503}));await settle();check('missing model reports explicit fallback',api.voiceEngine==='BROWSER FALLBACK'&&queued!==null);
 api.stop();await settle();check('fallback STOP clears speech',queued===null&&api.status==='STOPPED');
 api.deliver();await settle();const last=requests.at(-1)!;root.unmount();await completeRequest(requests.length-1);check('unmount aborts pending synthesis',last.signal.aborted);
 document.querySelector('#results')!.textContent=JSON.stringify({pass:results.every(r=>r.pass),results},null,2);
};
