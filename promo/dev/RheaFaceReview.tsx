import type { Dispatch, SetStateAction } from 'react';
import type { BodyPoseName, Framing } from '../body/types';
import type { CameraStateName } from '../camera/types';
import type { FaceControls } from '../performance/types';
import { EXPRESSIONS } from '../face/expressions';
import { GAZES } from '../face/gaze';
import { MOUTH_DEFORMATIONS, type Viseme } from '../face/mouth';
import { RHEA_GESTURES } from '../gestures/rheaGestures';
import type { GestureName } from '../gestures/types';
import type { SpeechDebug } from '../performance/usePromoSpeech';
import { SCENE_NAMES, type RheaSceneDefinition, type SceneName } from '../scenes/types';
import styles from './review.module.css';

export function RheaFaceReview({ scene, sceneConfig, onSceneChange, controls, setControls, framing, setFraming, bodyPose, setBodyPose, gesturePreview, setGesturePreview, gestureProgress, setGestureProgress, cameraPreview, setCameraPreview, cameraProgress, setCameraProgress, onStopSpeech, onSamplePhrase, debugEnabled, setDebugEnabled, debug }: {
  scene: SceneName;
  sceneConfig: RheaSceneDefinition;
  onSceneChange: (scene: SceneName) => void;
  controls: FaceControls;
  setControls: Dispatch<SetStateAction<FaceControls>>;
  framing: Framing;
  setFraming: Dispatch<SetStateAction<Framing>>;
  bodyPose: BodyPoseName;
  setBodyPose: Dispatch<SetStateAction<BodyPoseName>>;
  gesturePreview: GestureName | null;
  setGesturePreview: Dispatch<SetStateAction<GestureName | null>>;
  gestureProgress: number;
  setGestureProgress: Dispatch<SetStateAction<number>>;
  cameraPreview: CameraStateName | null;
  setCameraPreview: Dispatch<SetStateAction<CameraStateName | null>>;
  cameraProgress: number;
  setCameraProgress: Dispatch<SetStateAction<number>>;
  onStopSpeech: () => void;
  onSamplePhrase: () => void;
  debugEnabled: boolean;
  setDebugEnabled: Dispatch<SetStateAction<boolean>>;
  debug: SpeechDebug;
}) {
  return <section className={styles.review} aria-label="Rhea face and body review">
    <p className={styles.heading}>FACE + BODY REVIEW <span>01 / LISTENING PERFORMANCE</span></p>
    <fieldset><legend>SCENE</legend><div className={styles.buttons}>{SCENE_NAMES.map(name =>
      <button key={name} aria-pressed={scene === name} onClick={() => onSceneChange(name)}>{name === 'RING_ARENA' ? 'RING / ARENA' : name}</button>)}</div></fieldset>
    <p className={styles.sceneSpec}>DEFAULT {sceneConfig.defaultFraming} · {sceneConfig.defaultPose} · {sceneConfig.defaultGesture} · {sceneConfig.defaultCamera}<br />CAMERAS {sceneConfig.allowedCameraStates.join(' · ')}<br />SAFE TEXT {sceneConfig.safeTextArea.placement} / {sceneConfig.safeTextArea.maxWidthPercent}%</p>
    <fieldset><legend>EXPRESSION</legend><div className={styles.buttons}>{EXPRESSIONS.map(expression =>
      <button key={expression} aria-pressed={controls.expression === expression}
        onClick={() => setControls(current => ({ ...current, expression }))}>{expression}</button>)}</div></fieldset>
    <fieldset><legend>GAZE</legend><div className={styles.buttons}>{GAZES.map(gaze =>
      <button key={gaze} aria-pressed={controls.gaze === gaze}
        onClick={() => setControls(current => ({ ...current, gaze }))}>{gaze}</button>)}</div></fieldset>
    <fieldset><legend>BODY POSE</legend><div className={styles.buttons}>{sceneConfig.allowedPoses.map(pose =>
      <button key={pose} aria-pressed={bodyPose === pose} onClick={() => setBodyPose(pose)}>{pose}</button>)}</div></fieldset>
    <fieldset><legend>GESTURE</legend><div className={styles.buttons}>{sceneConfig.allowedGestures.map(gesture => {
      const definition = RHEA_GESTURES[gesture];
      return <button key={gesture} className={definition.supported ? undefined : styles.unsupported} title={definition.reason ?? undefined} aria-pressed={gesturePreview === gesture}
        onClick={() => { onStopSpeech(); setGesturePreview(gesture); }}>{gesture}{definition.supported ? '' : ' · UNSUPPORTED'}</button>;
    })}</div></fieldset>
    <label className={styles.scrub}>Gesture inspection <span>{Math.round(gestureProgress * 100)}%</span>
      <input aria-label="Gesture inspection" type="range" min="0" max="100" step="1" value={gestureProgress * 100}
        onChange={event => setGestureProgress(Number(event.target.value) / 100)} />
    </label>
    <button className={styles.release} onClick={() => setGesturePreview(null)}>RESUME PERFORMANCE GESTURES</button>
    <fieldset><legend>CAMERA</legend><div className={styles.buttons}>{sceneConfig.allowedCameraStates.map(camera =>
      <button key={camera} aria-pressed={cameraPreview === camera} onClick={() => {
        onStopSpeech();
        setCameraPreview(camera);
        if (camera === 'STATIC_FULL') setFraming('FULL');
        else if (camera === 'STATIC_MEDIUM') setFraming('MEDIUM');
        else if (camera === 'CLOSE_PROMO') setFraming('CLOSE');
      }}>{camera}</button>)}</div></fieldset>
    <label className={styles.scrub}>Camera inspection <span>{Math.round(cameraProgress * 100)}%</span>
      <input aria-label="Camera inspection" type="range" min="0" max="100" step="1" value={cameraProgress * 100}
        onChange={event => setCameraProgress(Number(event.target.value) / 100)} />
    </label>
    <button className={styles.release} onClick={() => setCameraPreview(null)}>RESUME PERFORMANCE CAMERA</button>
    <div className={styles.buttons}>
      <button onClick={() => setControls(current => ({ ...current, blinkPreview: null, blinkRequest: current.blinkRequest + 1 }))}>BLINK NOW</button>
      <button aria-pressed={controls.idle} onClick={() => setControls(current => ({ ...current, idle: !current.idle }))}>IDLE {controls.idle ? 'ON' : 'OFF'}</button>
      {sceneConfig.allowedFramings.map(option => <button key={option} aria-pressed={framing === option} onClick={() => setFraming(option)}>{option === 'CLOSE' ? 'FACE CLOSE-UP' : option}</button>)}
    </div>
    <label className={styles.scrub}>Blink inspection <span>{Math.round((controls.blinkPreview ?? 0) * 100)}%</span>
      <input aria-label="Blink inspection" type="range" min="0" max="100" step="1" value={(controls.blinkPreview ?? 0) * 100}
        onChange={event => setControls(current => ({ ...current, blinkPreview: Number(event.target.value) / 100 }))} />
    </label>
    <button className={styles.release} onClick={() => setControls(current => ({ ...current, blinkPreview: null }))}>RESUME NATURAL BLINK</button>
    <fieldset><legend>LIP-SYNC</legend><div className={styles.buttons}>{(Object.keys(MOUTH_DEFORMATIONS) as Viseme[]).map(viseme =>
      <button key={viseme} aria-pressed={controls.mouthPreview === viseme}
        onClick={() => { onStopSpeech(); setControls(current => ({ ...current, mouthPreview: viseme })); }}>{viseme}</button>)}
      <button onClick={onSamplePhrase}>SAMPLE PHRASE</button>
    </div></fieldset>
    <label className={styles.debugToggle}><input type="checkbox" checked={debugEnabled} onChange={event => setDebugEnabled(event.target.checked)} /> TIMELINE DEBUG</label>
    {debugEnabled && <p className={styles.debug} data-testid="timeline-debug">WORD {debug.word}<br />VISEME {debug.viseme}<br />ELAPSED {debug.elapsedMs}MS · POS {debug.timelinePosition.toFixed(2)}<br />SENTENCE {debug.sentence}<br />BEAT {debug.beatIndex ?? '—'} · {debug.expression} · {debug.gaze}<br />INTENSITY {debug.intensity.toFixed(2)} · HEAD {debug.headBias.x.toFixed(2)},{debug.headBias.y.toFixed(2)}<br />FINAL HOLD {debug.finalHold ? 'YES' : 'NO'}<br />SESSION {debug.sessionId ?? '—'}</p>}
    <p className={styles.readout}>{sceneConfig.label} · {controls.expression} · {controls.gaze} · {bodyPose} · {gesturePreview ?? 'LIVE GESTURES'} · {cameraPreview ?? 'LIVE CAMERA'} · {framing}<br />Canonical live face · accepted static body plate · bounded deterministic gesture and camera layers</p>
  </section>;
}
