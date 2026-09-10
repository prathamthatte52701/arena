'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The canvas itself is the live image; img cannot render animated texture coordinates. */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { createBodyPoseController } from '../body/controller';
import { rheaBodyProfile } from '../body/rheaBodyProfile';
import type { BodyPoseName, Framing } from '../body/types';
import type { FaceControls } from '../performance/types';
import type { PerformanceTarget } from '../performance/types';
import { createFaceController } from '../face/controller';
import { createPortraitRenderer } from './portraitRenderer';
import { rheaProfile } from './rheaProfile';
import type { MouthTarget } from '../face/mouth.ts';
import styles from './rig.module.css';

export function RheaPortraitRig({ controls, framing, bodyPose, sampleMouth, samplePerformance }: { controls: FaceControls; framing: Framing; bodyPose: BodyPoseName; sampleMouth: (nowMs: number) => MouthTarget; samplePerformance: (nowMs: number) => PerformanceTarget | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef(controls);
  const sampleMouthRef = useRef(sampleMouth);
  const samplePerformanceRef = useRef(samplePerformance);
  const [status, setStatus] = useState('Loading portrait');
  const bodyController = useMemo(() => createBodyPoseController(), []);
  const bodyFrame = bodyController.sample(bodyPose, framing);
  useEffect(() => { controlsRef.current = controls; }, [controls]);
  useEffect(() => { sampleMouthRef.current = sampleMouth; }, [sampleMouth]);
  useEffect(() => { samplePerformanceRef.current = samplePerformance; }, [samplePerformance]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let raf = 0;
    let renderer: ReturnType<typeof createPortraitRenderer> | undefined;
    const controller = createFaceController();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const image = new window.Image();
    const onLost = (event: Event) => { event.preventDefault(); window.cancelAnimationFrame(raf); setStatus('Portrait paused — reload to restore'); };
    canvas.addEventListener('webglcontextlost', onLost);
    image.onload = () => {
      if (disposed) return;
      try {
        renderer = createPortraitRenderer(canvas, image);
        setStatus('Live portrait');
        const animate = (timestamp: number) => {
          if (disposed) return;
          const settings = controlsRef.current;
          if (!document.hidden) {
            const performance = samplePerformanceRef.current(timestamp);
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
    image.src = rheaProfile.portrait;
    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      image.onload = null;
      image.onerror = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      renderer?.dispose();
    };
  }, []);
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

  return <div className={`${styles.viewport} ${framingClass}`} data-framing={framing} data-body-pose={bodyFrame.name}>
    <div className={styles.bodySurface} style={bodyStyle}>
      <Image className={styles.bodyPlate} src={rheaBodyProfile.runtimeAsset} alt="" aria-hidden="true" draggable={false} fill sizes="(max-width: 900px) 100vw, 70vw" priority />
      <canvas ref={canvasRef} className={styles.portrait} width={rheaProfile.width} height={rheaProfile.height}
        role="img" aria-label={`Rhea portrait, ${controls.expression.toLowerCase()}, looking toward ${controls.gaze.toLowerCase()}`}
        data-testid="rhea-portrait" data-status={status} />
    </div>
    {status !== 'Live portrait' && <output className={styles.notice}>{status}</output>}
    <div className={styles.vignette} />
  </div>;
}
