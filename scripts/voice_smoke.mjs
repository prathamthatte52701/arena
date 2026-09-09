import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { wavDurationMs } from '../promo/voice/pipeline.ts';

const base = process.env.PROMO_QA_URL ?? 'http://127.0.0.1:3000';
const short = "You think you're ready for me? Then prove it.";
const long = "Maybe people believe promises, but I believe in showing up. Every time I enter this arena, I bring everything I have. You think you're ready for me? Then prove it. Fight for every victory, find your voice, and make every moment count. I will be here, ready for the challenge, when the lights come on again.";
const results = [];
await mkdir('outputs/phase22-repair', { recursive: true });
for (const [name,text,tone] of [['short',short,'AUTO'],['long',long,'AUTO']]) {
  const response = await fetch(`${base}/api/promo-voice`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,tone})});
  assert.equal(response.status,200,await (response.ok ? Promise.resolve('') : response.text()));
  assert.equal(response.headers.get('X-Promo-TTS-Engine'),'LOCAL NEURAL');
  const wav = new Uint8Array(await response.arrayBuffer());
  const durationMs = wavDurationMs(wav);
  assert.ok(durationMs>0 && wav.length>44);
  await writeFile(`outputs/phase22-repair/${name}.wav`,wav);
  results.push({name,tone,bytes:wav.length,durationMs});
}
for(const body of ['{','null',JSON.stringify({text:short,tone:'BOGUS'}),JSON.stringify({text:short,tone:null}),JSON.stringify({text:short,tone:''}),JSON.stringify({text:42,tone:'AUTO'}),JSON.stringify({text:'a'.repeat(421),tone:'AUTO'})]) {
  const r=await fetch(`${base}/api/promo-voice`,{method:'POST',headers:{'Content-Type':'application/json'},body});
  assert.equal(r.status,400);results.push({invalidRequest:body.slice(0,60),status:r.status,error:await r.json()});
}
console.log(JSON.stringify(results,null,2));
