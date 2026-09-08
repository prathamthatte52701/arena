import type { Dispatch, SetStateAction } from 'react';
import type { FaceControls, Framing } from '../performance/types';
import { EXPRESSIONS } from '../face/expressions';
import { GAZES } from '../face/gaze';
import styles from './review.module.css';

export function RheaFaceReview({ controls, setControls, framing, setFraming }: {
  controls: FaceControls;
  setControls: Dispatch<SetStateAction<FaceControls>>;
  framing: Framing;
  setFraming: Dispatch<SetStateAction<Framing>>;
}) {
  return <section className={styles.review} aria-label="Rhea face review">
    <p className={styles.heading}>FACE REVIEW <span>01 / LISTENING PERFORMANCE</span></p>
    <fieldset><legend>EXPRESSION</legend><div className={styles.buttons}>{EXPRESSIONS.map(expression =>
      <button key={expression} aria-pressed={controls.expression === expression}
        onClick={() => setControls(current => ({ ...current, expression }))}>{expression}</button>)}</div></fieldset>
    <fieldset><legend>GAZE</legend><div className={styles.buttons}>{GAZES.map(gaze =>
      <button key={gaze} aria-pressed={controls.gaze === gaze}
        onClick={() => setControls(current => ({ ...current, gaze }))}>{gaze}</button>)}</div></fieldset>
    <div className={styles.buttons}>
      <button onClick={() => setControls(current => ({ ...current, blinkPreview: null, blinkRequest: current.blinkRequest + 1 }))}>BLINK NOW</button>
      <button aria-pressed={controls.idle} onClick={() => setControls(current => ({ ...current, idle: !current.idle }))}>IDLE {controls.idle ? 'ON' : 'OFF'}</button>
      <button aria-pressed={framing === 'CLOSE'} onClick={() => setFraming('CLOSE')}>FACE CLOSE-UP</button>
      <button aria-pressed={framing === 'MEDIUM'} onClick={() => setFraming('MEDIUM')}>MEDIUM</button>
    </div>
    <label className={styles.scrub}>Blink inspection <span>{Math.round((controls.blinkPreview ?? 0) * 100)}%</span>
      <input aria-label="Blink inspection" type="range" min="0" max="100" step="1" value={(controls.blinkPreview ?? 0) * 100}
        onChange={event => setControls(current => ({ ...current, blinkPreview: Number(event.target.value) / 100 }))} />
    </label>
    <button className={styles.release} onClick={() => setControls(current => ({ ...current, blinkPreview: null }))}>RESUME NATURAL BLINK</button>
    <p className={styles.readout}>{controls.expression} · {controls.gaze} · {framing}<br />Original portrait · bounded region motion · mouth at rest</p>
  </section>;
}
