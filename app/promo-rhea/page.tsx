'use client';
import { useState } from 'react';
import Link from 'next/link';
import { RheaPortraitRig } from '../../promo/character/RheaPortraitRig';
import { RheaFaceReview } from '../../promo/dev/RheaFaceReview';
import { usePromoSpeech } from '../../promo/performance/usePromoSpeech';
import type { FaceControls, Framing } from '../../promo/performance/types';
import styles from './promo.module.css';

export default function PromoRhea() {
  const [controls, setControls] = useState<FaceControls>({ expression: 'NEUTRAL', gaze: 'INTERVIEWER', idle: true, blinkRequest: 0, blinkPreview: null });
  const [framing, setFraming] = useState<Framing>('MEDIUM');
  const [review, setReview] = useState(false);
  const speech = usePromoSpeech();

  return <main className={styles.shell}>
    <header className={styles.header}>
      <Link href="/">P/Q <span>PROMO QUEENS</span></Link>
      <button aria-expanded={review} onClick={() => setReview(value => !value)}>DEV REVIEW</button>
    </header>
    <section className={styles.stage}>
      <div className={styles.set}>
        <RheaPortraitRig controls={controls} framing={framing} />
        <div className={styles.topline}><span>BACKSTAGE / 01</span><span className={styles.live}>● LIVE</span></div>
        <div className={styles.nameplate}><p>THE INTERVIEW</p><h1>RHEA</h1><span>{controls.expression} / {controls.gaze}</span></div>
      </div>
      <aside className={styles.side}>
        {review ? <RheaFaceReview controls={controls} setControls={setControls} framing={framing} setFraming={setFraming} /> :
          <div className={styles.prompt}><p className={styles.kicker}>RHEA / BACKSTAGE INTERVIEW</p><h2>Say it to her face.</h2><p className={styles.question}>“What&apos;s next for you?”</p><p className={styles.description}>The room goes quiet. She waits for your next words.</p></div>}
        <section className={styles.panel} aria-label="Promo dialogue">
          <label htmlFor="promo-text">YOUR PROMO</label>
          <textarea id="promo-text" value={speech.text} onChange={event => speech.setText(event.target.value)} maxLength={420} />
          <div className={styles.actions}>
            <button className={styles.primary} onClick={speech.deliver}>DELIVER PROMO</button>
            <button onClick={speech.stop}>STOP</button>
            <button onClick={speech.deliver}>REPLAY</button>
          </div>
          <output className={styles.status}>{speech.status}</output>
          <p className={styles.note}>Local speech prototype · face articulation at rest</p>
        </section>
      </aside>
    </section>
  </main>;
}
