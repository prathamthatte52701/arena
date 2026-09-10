'use client';
import { useState } from 'react';
import Link from 'next/link';
import { RheaPortraitRig } from '../../promo/character/RheaPortraitRig';
import { RheaFaceReview } from '../../promo/dev/RheaFaceReview';
import { SAMPLE_LIP_SYNC_PHRASE, usePromoSpeech } from '../../promo/performance/usePromoSpeech';
import type { BodyPoseName, Framing } from '../../promo/body/types';
import type { FaceControls, Tone } from '../../promo/performance/types';
import styles from './promo.module.css';

export default function PromoRhea() {
  const [controls, setControls] = useState<FaceControls>({ expression: 'NEUTRAL', gaze: 'INTERVIEWER', idle: true, blinkRequest: 0, blinkPreview: null, mouthPreview: null });
  const [framing, setFraming] = useState<Framing>('MEDIUM');
  const [bodyPose, setBodyPose] = useState<BodyPoseName>('NEUTRAL_STAND');
  const [review, setReview] = useState(false);
  const speech = usePromoSpeech();

  return <main className={styles.shell}>
    <header className={styles.header}>
      <Link href="/">P/Q <span>PROMO QUEENS</span></Link>
      <button aria-expanded={review} onClick={() => setReview(value => !value)}>DEV REVIEW</button>
    </header>
    <section className={styles.stage}>
      <div className={styles.set}>
        <RheaPortraitRig controls={controls} framing={framing} bodyPose={bodyPose} sampleMouth={speech.sampleMouth} samplePerformance={speech.samplePerformance} />
        <div className={styles.topline}><span>BACKSTAGE / 01</span><span className={styles.live}>● LIVE</span></div>
        <div className={styles.nameplate}><p>THE INTERVIEW</p><h1>RHEA</h1><span>{controls.expression} / {controls.gaze}</span></div>
      </div>
      <aside className={styles.side}>
        {review ? <RheaFaceReview controls={controls} setControls={setControls} framing={framing} setFraming={setFraming} bodyPose={bodyPose} setBodyPose={setBodyPose} onStopSpeech={speech.stop} onSamplePhrase={() => { setControls(current => ({ ...current, mouthPreview: null })); speech.speakPreview(SAMPLE_LIP_SYNC_PHRASE); }} debugEnabled={speech.debugEnabled} setDebugEnabled={speech.setDebugEnabled} debug={speech.debug} /> :
          <div className={styles.prompt}><p className={styles.kicker}>RHEA / BACKSTAGE INTERVIEW</p><h2>Say it to her face.</h2><p className={styles.question}>“What&apos;s next for you?”</p><p className={styles.description}>The room goes quiet. She waits for your next words.</p></div>}
        <section className={styles.panel} aria-label="Promo dialogue">
          <label htmlFor="promo-text">YOUR PROMO</label>
          <label className={styles.toneLabel} htmlFor="promo-tone">PERFORMANCE TONE</label>
          <select id="promo-tone" aria-label="Performance tone" value={speech.tone} onChange={event => speech.setTone(event.target.value as Tone)}>
            {(['AUTO', 'CONFIDENT', 'COLD', 'MOCKING', 'ANGRY', 'INTIMIDATING', 'SMIRKING'] as Tone[]).map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <textarea id="promo-text" value={speech.text} onChange={event => speech.setText(event.target.value)} maxLength={420} />
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => { setControls(current => ({ ...current, mouthPreview: null })); speech.deliver(); }}>DELIVER PROMO</button>
            <button onClick={() => { setControls(current => ({ ...current, mouthPreview: null })); speech.stop(); }}>STOP</button>
            <button onClick={() => { setControls(current => ({ ...current, mouthPreview: null })); speech.replay(); }}>REPLAY</button>
          </div>
          <output className={styles.status}>{speech.status}</output>
          <p className={styles.note}>VOICE ENGINE: {speech.voiceEngine}{review && speech.generatedDurationMs !== null ? ` · AUDIO: ${Math.round(speech.generatedDurationMs)} ms` : ''}</p>
          <p className={styles.note}>Local synthetic speech · deterministic mouth timeline · last delivered promo replays exactly</p>
        </section>
      </aside>
    </section>
  </main>;
}
