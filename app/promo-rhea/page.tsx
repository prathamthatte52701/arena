'use client';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { RheaPortraitRig } from '../../promo/character/RheaPortraitRig';
import { RheaFaceReview } from '../../promo/dev/RheaFaceReview';
import { SAMPLE_LIP_SYNC_PHRASE, usePromoSpeech } from '../../promo/performance/usePromoSpeech';
import type { BodyPoseName, Framing } from '../../promo/body/types';
import type { CameraPerformanceSignal, CameraStateName } from '../../promo/camera/types';
import type { GestureName } from '../../promo/gestures/types';
import type { FaceControls, Tone } from '../../promo/performance/types';
import { createSceneController } from '../../promo/scenes/controller';
import { createSceneRuntimePlan, remapSceneRuntimePlan, restartSceneRuntimePlan, stopSceneRuntimePlan, type SceneRuntimePlan } from '../../promo/scenes/orchestration';
import type { SceneName } from '../../promo/scenes/types';
import styles from './promo.module.css';

export default function PromoRhea() {
  const [controls, setControls] = useState<FaceControls>({ expression: 'NEUTRAL', gaze: 'INTERVIEWER', idle: true, blinkRequest: 0, blinkPreview: null, mouthPreview: null });
  const [framing, setFraming] = useState<Framing>('MEDIUM');
  const [bodyPose, setBodyPose] = useState<BodyPoseName>('INTERVIEWER');
  const [gesturePreview, setGesturePreview] = useState<GestureName | null>(null);
  const [gestureProgress, setGestureProgress] = useState(0.5);
  const [cameraPreview, setCameraPreview] = useState<CameraStateName | null>(null);
  const [cameraProgress, setCameraProgress] = useState(0.5);
  const [scene, setScene] = useState<SceneName>('INTERVIEW');
  const [scenePlan, setScenePlan] = useState<SceneRuntimePlan>(() => createSceneRuntimePlan({ scene: 'INTERVIEW', text: '', tone: 'AUTO', mode: 'REST' }));
  const [review, setReview] = useState(false);
  const speech = usePromoSpeech();
  const activePresentation = useRef<{ scene: SceneName; text: string; tone: Tone } | null>(null);
  const replayPresentation = useRef<{ scene: SceneName; text: string; tone: Tone } | null>(null);
  const sceneController = useMemo(() => createSceneController(), []);
  const sceneFrame = sceneController.sample(scene);
  const completedPerformance: CameraPerformanceSignal | null = speech.debug.finalHold && speech.debug.beatIndex !== null ? {
    beatIndex: speech.debug.beatIndex,
    expression: speech.debug.expression,
    gaze: speech.debug.gaze,
    intensity: speech.debug.intensity,
    headBias: speech.debug.headBias,
    finalHold: true,
  } : null;

  const applyScenePlan = (plan: SceneRuntimePlan) => {
    setScene(plan.scene);
    setScenePlan(plan);
    setFraming(plan.framing);
    setBodyPose(plan.pose);
    setControls(current => ({ ...current, gaze: plan.gaze, mouthPreview: null }));
    setGesturePreview(null);
    setGestureProgress(0.5);
    setCameraPreview(null);
    setCameraProgress(0.5);
  };

  const selectScene = (name: SceneName) => {
    const active = activePresentation.current;
    const speaking = active && ['GENERATING', 'SPEAKING', 'PAUSED'].includes(speech.status);
    if (speaking) {
      const remapped = remapSceneRuntimePlan(createSceneRuntimePlan({ ...active, mode: 'SPEAKING' }), name);
      activePresentation.current = { scene: remapped.scene, text: active.text, tone: active.tone };
      if (replayPresentation.current) replayPresentation.current = { ...replayPresentation.current, scene: remapped.scene };
      applyScenePlan(remapped);
      return;
    }
    if (speech.status === 'COMPLETE') speech.stop();
    activePresentation.current = null;
    applyScenePlan(createSceneRuntimePlan({ scene: name, text: speech.text, tone: speech.tone, mode: 'REST' }));
  };

  const deliverPromo = () => {
    if (!speech.text.trim()) {
      activePresentation.current = null;
      applyScenePlan(createSceneRuntimePlan({ scene, text: speech.text, tone: speech.tone, mode: 'REST' }));
      speech.deliver();
      return;
    }
    const memory = { scene, text: speech.text, tone: speech.tone };
    const plan = createSceneRuntimePlan({ ...memory, mode: 'SPEAKING' });
    activePresentation.current = memory;
    replayPresentation.current = memory;
    applyScenePlan(plan);
    speech.deliver();
  };

  const stopPromo = () => {
    speech.stop();
    activePresentation.current = null;
    applyScenePlan(stopSceneRuntimePlan(scenePlan));
  };

  const replayPromo = () => {
    const memory = replayPresentation.current;
    if (!memory) return;
    const plan = restartSceneRuntimePlan(createSceneRuntimePlan({ ...memory, mode: 'SPEAKING' }));
    activePresentation.current = memory;
    speech.setText(memory.text);
    speech.setTone(memory.tone);
    applyScenePlan(plan);
    speech.replay();
  };

  const previewPhrase = () => {
    const memory = { scene, text: SAMPLE_LIP_SYNC_PHRASE, tone: speech.tone };
    activePresentation.current = memory;
    applyScenePlan(createSceneRuntimePlan({ ...memory, mode: 'SPEAKING' }));
    speech.speakPreview(SAMPLE_LIP_SYNC_PHRASE);
  };
  const sceneStyle = {
    '--scene-safe-width': `${sceneFrame.safeTextArea.maxWidthPercent}%`,
    '--scene-safe-inset': `${sceneFrame.safeTextArea.insetPercent}%`,
  } as CSSProperties;

  return <main className={styles.shell} data-scene={sceneFrame.name} data-scene-container={sceneFrame.container} style={sceneStyle}>
    <header className={styles.header}>
      <Link href="/">P/Q <span>PROMO QUEENS</span></Link>
      <button aria-expanded={review} onClick={() => setReview(value => !value)}>DEV REVIEW</button>
    </header>
    <section className={styles.stage}>
      <div className={styles.set} data-scene-background={sceneFrame.background}>
        <RheaPortraitRig controls={controls} framing={framing} bodyPose={bodyPose} gesturePreview={gesturePreview} gestureProgress={gestureProgress} cameraPreview={cameraPreview} cameraProgress={cameraProgress} cameraFinalPerformance={completedPerformance} scenePlan={scenePlan} sampleMouth={speech.sampleMouth} samplePerformance={speech.samplePerformance} />
        <div className={styles.sceneBackdrop} aria-hidden="true"><span className={styles.environmentLabel}>PQ</span></div>
        <div className={styles.topline}><span>{sceneFrame.eyebrow}</span><span className={styles.live}>● LIVE</span></div>
        <div className={styles.nameplate}><p>{sceneFrame.label}</p><h1>RHEA</h1><span>{controls.expression} / {controls.gaze}</span></div>
      </div>
      <aside className={styles.side} data-safe-text-area={sceneFrame.safeTextArea.placement}>
        {review ? <RheaFaceReview scene={scene} sceneConfig={sceneFrame} onSceneChange={selectScene} controls={controls} setControls={setControls} framing={framing} setFraming={setFraming} bodyPose={bodyPose} setBodyPose={setBodyPose} gesturePreview={gesturePreview} setGesturePreview={setGesturePreview} gestureProgress={gestureProgress} setGestureProgress={setGestureProgress} cameraPreview={cameraPreview} setCameraPreview={setCameraPreview} cameraProgress={cameraProgress} setCameraProgress={setCameraProgress} onStopSpeech={stopPromo} onSamplePhrase={previewPhrase} debugEnabled={speech.debugEnabled} setDebugEnabled={speech.setDebugEnabled} debug={speech.debug} /> :
          <div className={styles.prompt}><p className={styles.kicker}>RHEA / {sceneFrame.label}</p><h2>{sceneFrame.prompt}</h2><p className={styles.question}>“What&apos;s next for you?”</p><p className={styles.description}>{sceneFrame.description}</p></div>}
        <section className={styles.panel} aria-label="Promo dialogue">
          <label htmlFor="promo-text">YOUR PROMO</label>
          <label className={styles.toneLabel} htmlFor="promo-tone">PERFORMANCE TONE</label>
          <select id="promo-tone" aria-label="Performance tone" value={speech.tone} onChange={event => speech.setTone(event.target.value as Tone)}>
            {(['AUTO', 'CONFIDENT', 'COLD', 'MOCKING', 'ANGRY', 'INTIMIDATING', 'SMIRKING'] as Tone[]).map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          <textarea id="promo-text" value={speech.text} onChange={event => speech.setText(event.target.value)} maxLength={420} />
          <div className={styles.actions}>
            <button className={styles.primary} onClick={deliverPromo}>DELIVER PROMO</button>
            <button onClick={stopPromo}>STOP</button>
            <button onClick={replayPromo}>REPLAY</button>
          </div>
          <output className={styles.status}>{speech.status}</output>
          <p className={styles.note}>VOICE ENGINE: {speech.voiceEngine}{review && speech.generatedDurationMs !== null ? ` · AUDIO: ${Math.round(speech.generatedDurationMs)} ms` : ''}</p>
          <p className={styles.note}>Local synthetic speech · deterministic mouth timeline · last delivered promo replays exactly</p>
        </section>
      </aside>
    </section>
  </main>;
}
