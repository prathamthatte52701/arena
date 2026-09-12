'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The canvas itself is the live image; img cannot render animated texture coordinates. */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { createBodyPoseController } from '../body/controller';
import type { BodyPoseName, Framing } from '../body/types';
import { cameraForPerformance, createCameraController, sampleCameraProgress } from '../camera/controller';
import type { CameraFrame, CameraPerformanceSignal, CameraStateName } from '../camera/types';
import { createGestureController, gestureForPerformance, sampleGestureProgress } from '../gestures/controller';
import type { GestureFrame, GestureName } from '../gestures/types';
import type { CharacterDefinition } from '../characters/types.ts';
import type { FaceControls } from '../performance/types';
import type { PerformanceTarget } from '../performance/types';
import { createFaceController } from '../face/controller';
import { createPortraitRenderer } from './portraitRenderer';
import type { MouthTarget } from '../face/mouth.ts';
import { orchestrateCameraRequest, orchestrateGestureRequest, orchestratePerformance, type SceneRuntimePlan } from '../scenes/orchestration.ts';
import styles from './rig.module.css';

export interface CharacterPortraitRigProps {
  character: CharacterDefinition;
  controls: FaceControls;
  framing: Framing;
  bodyPose: BodyPoseName;
  gesturePreview: GestureName | null;
  gestureProgress: number;
  cameraPreview: CameraStateName | null;
  cameraProgress: number;
  cameraFinalPerformance: CameraPerformanceSignal | null;
  scenePlan: SceneRuntimePlan | null;
  sampleMouth: (nowMs: number) => MouthTarget;
  samplePerformance: (nowMs: number) => PerformanceTarget | null;
}

export function CharacterPortraitRig({ character, controls, framing, bodyPose, gesturePreview, gestureProgress, cameraPreview, cameraProgress, cameraFinalPerformance, scenePlan, sampleMouth, samplePerformance }: CharacterPortraitRigProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraSurfaceRef = useRef<HTMLDivElement>(null);
  const gestureSurfaceRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef(controls);
  const sampleMouthRef = useRef(sampleMouth);
  const samplePerformanceRef = useRef(samplePerformance);
  const gesturePreviewRef = useRef(gesturePreview);
  const gestureProgressRef = useRef(gestureProgress);
  const cameraPreviewRef = useRef(cameraPreview);
  const cameraProgressRef = useRef(cameraProgress);
  const cameraFinalPerformanceRef = useRef(cameraFinalPerformance);
  const scenePlanRef = useRef(scenePlan);
  const [status, setStatus] = useState('Loading portrait');
  const bodyController = useMemo(() => createBodyPoseController(character.body), [character]);
  const bodyFrame = bodyController.sample(bodyPose, framing);
  useEffect(() => { controlsRef.current = controls; }, [controls]);
  useEffect(() => { sampleMouthRef.current = sampleMouth; }, [sampleMouth]);
  useEffect(() => { samplePerformanceRef.current = samplePerformance; }, [samplePerformance]);
  useEffect(() => { gesturePreviewRef.current = gesturePreview; }, [gesturePreview]);
  useEffect(() => { gestureProgressRef.current = gestureProgress; }, [gestureProgress]);
  useEffect(() => { cameraPreviewRef.current = cameraPreview; }, [cameraPreview]);
  useEffect(() => { cameraProgressRef.current = cameraProgress; }, [cameraProgress]);
  useEffect(() => { cameraFinalPerformanceRef.current = cameraFinalPerformance; }, [cameraFinalPerformance]);
  useEffect(() => { scenePlanRef.current = scenePlan; }, [scenePlan]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let raf = 0;
    let renderer: ReturnType<typeof createPortraitRenderer> | undefined;
    const controller = createFaceController();
    const gestureController = createGestureController(character.gestures);
    const cameraController = createCameraController(character.camera);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const image = new window.Image();
    const onLost = (event: Event) => { event.preventDefault(); window.cancelAnimationFrame(raf); setStatus('Portrait paused — reload to restore'); };
    canvas.addEventListener('webglcontextlost', onLost);
    image.onload = () => {
      if (disposed) return;
      try {
        renderer = createPortraitRenderer(canvas, image, character.portrait);
        setStatus('Live portrait');
        const animate = (timestamp: number) => {
          if (disposed) return;
          const settings = controlsRef.current;
          if (!document.hidden) {
            const plan = scenePlanRef.current;
            const performance = orchestratePerformance(plan, samplePerformanceRef.current(timestamp));
            const preview = gesturePreviewRef.current;
            const gestureRequest = orchestrateGestureRequest(plan, gestureForPerformance(performance));
            const gesture = preview ? sampleGestureProgress(character.gestures, preview, gestureProgressRef.current) : gestureController.update(timestamp, gestureRequest);
            applyGestureFrame(gestureSurfaceRef.current, gesture);
            const cameraPreview = cameraPreviewRef.current;
            const cameraPerformance = performance ?? cameraFinalPerformanceRef.current;
            const cameraRequest = orchestrateCameraRequest(plan, cameraForPerformance(cameraPerformance));
            const camera = cameraPreview ? sampleCameraProgress(character.camera, cameraPreview, cameraProgressRef.current) : cameraController.update(timestamp, cameraRequest);
            applyCameraFrame(cameraSurfaceRef.current, camera);
            renderer?.draw(controller.update(timestamp / 1000, { ...settings, idle: settings.idle && !reducedMotion.matches, performance }, sampleMouthRef.current(timestamp)));
          }
          raf = window.requestAnimationFrame(animate);
        };
        raf = window.requestAnimationFrame(animate);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Portrait unavailable');
      }
    };
    image.onerror = () => { if (!disposed) setStatus('Portrait could not load — reload to retry'); };
    image.src = character.portrait.portrait;
    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      image.onload = null;
      image.onerror = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      renderer?.dispose();
    };
  }, [character]);
  const framingClass = framing === 'CLOSE' ? styles.close : framing === 'FULL' ? styles.full : styles.medium;
  const bodyStyle = {
    '--body-height': `${bodyFrame.framingHeightPercent}%`,
    '--body-top': `${bodyFrame.framingTopPercent}%`,
    '--body-x': `${bodyFrame.bodyXPercent}%`,
    '--body-y': `${bodyFrame.bodyYPercent}%`,
    '--body-scale': bodyFrame.bodyScale,
    '--torso-yaw': `${bodyFrame.torsoYawDeg}deg`,
    '--torso-lean': `${bodyFrame.torsoLeanDeg}deg`,
    '--head-x': `${bodyFrame.headXPercent}%`,
    '--head-y': `${bodyFrame.headYPercent}%`,
    '--head-scale': bodyFrame.headScale,
    '--head-rotation': `${bodyFrame.headRotationDeg}deg`,
  } as CSSProperties;

  return <div className={`${styles.viewport} ${framingClass}`} data-character={character.id} data-framing={framing} data-body-pose={bodyFrame.name} data-scene-runtime={scenePlan?.scene ?? 'NONE'} data-scene-runtime-mode={scenePlan?.mode ?? 'REST'}>
    <div ref={cameraSurfaceRef} className={styles.cameraSurface} data-camera="STATIC_MEDIUM" data-camera-phase="REST">
      <div className={styles.bodySurface} style={bodyStyle}>
        <div ref={gestureSurfaceRef} className={styles.gestureSurface} data-gesture="IDLE" data-gesture-phase="REST">
          <Image className={styles.bodyPlate} src={character.body.profile.runtimeAsset} alt="" aria-hidden="true" draggable={false} fill sizes="(max-width: 900px) 100vw, 70vw" priority />
          <canvas ref={canvasRef} className={styles.portrait} width={character.portrait.width} height={character.portrait.height}
            role="img" aria-label={`${character.name} portrait, ${controls.expression.toLowerCase()}, looking toward ${controls.gaze.toLowerCase()}`}
            data-testid="character-portrait" data-character={character.id} data-status={status} />
        </div>
      </div>
    </div>
    {status !== 'Live portrait' && <output className={styles.notice}>{status}</output>}
    <div className={styles.vignette} />
  </div>;
}

function applyCameraFrame(surface: HTMLDivElement | null, camera: CameraFrame) {
  if (!surface) return;
  surface.dataset.camera = camera.name;
  surface.dataset.cameraPhase = camera.phase;
  surface.style.setProperty('--camera-x', `${camera.xPercent}%`);
  surface.style.setProperty('--camera-y', `${camera.yPercent}%`);
  surface.style.setProperty('--camera-scale', String(camera.scale));
  surface.style.setProperty('--camera-rotation', `${camera.rotationDeg}deg`);
}

function applyGestureFrame(surface: HTMLDivElement | null, gesture: GestureFrame) {
  if (!surface) return;
  surface.dataset.gesture = gesture.name;
  surface.dataset.gesturePhase = gesture.phase;
  surface.dataset.gestureSupported = String(gesture.supported);
  surface.style.setProperty('--gesture-body-x', `${gesture.bodyXPercent}%`);
  surface.style.setProperty('--gesture-body-y', `${gesture.bodyYPercent}%`);
  surface.style.setProperty('--gesture-body-scale', String(gesture.bodyScale));
  surface.style.setProperty('--gesture-torso-yaw', `${gesture.torsoYawDeg}deg`);
  surface.style.setProperty('--gesture-torso-lean', `${gesture.torsoLeanDeg}deg`);
  surface.style.setProperty('--gesture-head-x', `${gesture.headXPercent}%`);
  surface.style.setProperty('--gesture-head-y', `${gesture.headYPercent}%`);
  surface.style.setProperty('--gesture-head-scale', String(gesture.headScale));
  surface.style.setProperty('--gesture-head-rotation', `${gesture.headRotationDeg}deg`);
}
