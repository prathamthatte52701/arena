import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { usePromoSpeech } from '../promo/performance/usePromoSpeech';
import { createFaceController } from '../promo/face/controller';
import { createPortraitRenderer } from '../promo/character/portraitRenderer';
import { rheaProfile } from '../promo/character/rheaProfile';
import { rheaV2Assets } from '../promo/character/rheaV2Assets';
import { createVisemeTimeline } from '../promo/speech/textTimeline';

// Synthetic event driver tests the real hook and renderer. This is explicitly
// NOT audio evidence; real browser SpeechSynthesis is checked on /promo-rhea.
let queued: SpeechSynthesisUtterance | null = null;
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
  getVoices: () => [], cancel: () => { queued = null; },
  speak: (u: SpeechSynthesisUtterance) => { queued = u; },
} });
let api: ReturnType<typeof usePromoSpeech>;
function Harness() { const speech = usePromoSpeech(); useEffect(() => { api = speech; }); return null; }
const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host); root.render(<Harness />);
const tick = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const source = new Image(); source.src = rheaV2Assets.faceFrontNeutral; await source.decode();
const canvas = document.querySelector('canvas')!;
const renderer = createPortraitRenderer(canvas, source, rheaProfile);
const controller = createFaceController(() => .5);
const controls = { expression: 'NEUTRAL', gaze: 'CENTER', idle: false, blinkRequest: 0, blinkPreview: 0 } as const;
let frameTime = 0;
function pixels(now: number) {
  const target = api.sampleMouth(now);
  renderer.draw(controller.update(frameTime += .05, controls, target));
  const gl = canvas.getContext('webgl')!; const data = new Uint8Array(180*160*4);
  gl.readPixels(462,689,180,160,gl.RGBA,gl.UNSIGNED_BYTE,data); return data;
}
function difference(a: Uint8Array,b: Uint8Array) { let count=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>24)count++;return count; }
const phrase = "You think you're ready for me? Then prove it.";
document.querySelector('button')!.onclick = async () => {
 const results: {name:string;pass:boolean;changed?:number}[]=[];
 const check=(name:string,pass:boolean,changed?:number)=>results.push({name,pass,changed});
 const rest=pixels(performance.now());
 api.setText(phrase);await tick();await tick();api.deliver();await tick();
 const first=queued!;const staleEnd=first.onend;
 check('utterance text unchanged',first.text===phrase);
 check('delayed onstart keeps rendered mouth REST',difference(rest,pixels(performance.now()+800))===0);
 const startedAt=performance.now();first.onstart?.call(first,{} as SpeechSynthesisEvent);
 let moving=pixels(startedAt+550);for(let i=0;i<10;i++)moving=pixels(startedAt+550);
 check('onstart releases visible articulation',difference(rest,moving)>100,difference(rest,moving));
 const pause=createVisemeTimeline(phrase).find(s=>s.kind==='pause'&&s.endMs-s.startMs>250)!;
 const paused=pixels(startedAt+pause.startMs+180);
 check('punctuation returns rendered pixels to REST',difference(rest,paused)===0,difference(rest,paused));
 let resumed=pixels(startedAt+pause.endMs+100);for(let i=0;i<10;i++)resumed=pixels(startedAt+pause.endMs+100);
 check('articulation resumes after punctuation',difference(rest,resumed)>100);
 api.stop();check('STOP immediately restores rendered REST',difference(rest,pixels(performance.now()))===0);
 api.setText('Undelivered edit');await tick();await tick();api.replay();await tick();
 check('replay retains delivered text',queued!.text===phrase);
 const second=queued!;second.onstart?.call(second,{} as SpeechSynthesisEvent);
 staleEnd?.call(first,{} as SpeechSynthesisEvent);await tick();await tick();
 check('stale completion cannot end replay',api.status==='SPEAKING');
 second.onend?.call(second,{} as SpeechSynthesisEvent);await tick();await tick();
 check('end restores rendered REST and COMPLETE',api.status==='COMPLETE'&&difference(rest,pixels(performance.now()))===0);
 api.deliver();await tick();root.unmount();
 check('unmount cancels pending synthesis',queued===null);
 document.querySelector('pre')!.textContent=JSON.stringify({pass:results.every(r=>r.pass),results},null,2);
};
