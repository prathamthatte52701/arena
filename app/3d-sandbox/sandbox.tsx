'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { developmentHumanoid } from '../../game3d/assets/contract';
import { emptySnapshot, type DebugSnapshot } from '../../game3d/debug/metrics';
import DebugPanel from '../../game3d/debug/panel';
import styles from './sandbox.module.css';

export default function Sandbox() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const qaStarted = useRef(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Loading the rigged humanoid and its animation clips.');
  const [stats, setStats] = useState<DebugSnapshot>(emptySnapshot);
  const [debug, setDebug] = useState(process.env.NODE_ENV !== 'production');
  useEffect(() => {
    const surface = canvas.current;
    if (!surface) return;
    let disposed = false;
    let runtime: { dispose: () => void } | undefined;
    // Three/WebGL initialize only in the browser and never in the legacy route.
    void import('../../game3d/core/runtime').then(({ SandboxRuntime }) => {
      if (disposed) return;
      const asset = { ...developmentHumanoid };
      // Explicit development-only failure injection for repeatable asset-error QA.
      if (process.env.NODE_ENV !== 'production' && new URLSearchParams(window.location.search).get('assetError') === '1') asset.modelPath = '/models/development/missing.glb';
      runtime = new SandboxRuntime(surface, asset, {
        ready: () => { if (!disposed) setStatus('ready'); },
        failure: text => { if (!disposed) { setStatus('error'); setMessage(text); } },
        stats: snapshot => { if (!disposed) setStats(snapshot); },
      });
    }).catch(error => { if (!disposed) { setStatus('error'); setMessage(error instanceof Error ? error.message : '3D runtime initialization failed.'); } });
    return () => { disposed = true; runtime?.dispose(); };
  }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || status !== 'ready' || qaStarted.current) return;
    const query = new URLSearchParams(window.location.search);
    const allowed = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft'];
    const sequence = (query.get('qaSequence') || '').split(',').map(item => {
      const [code, duration] = item.split(':');
      return { code, duration: Math.max(100, Math.min(5000, Number(duration) || 700)) };
    }).filter(item => allowed.includes(item.code));
    const codes = (query.get('qaMove') || '').split(',').filter(code => allowed.includes(code));
    if (!codes.length && !sequence.length) return;
    qaStarted.current = true;
    const holdMs = Math.max(100, Math.min(5000, Number(query.get('qaHold') || 1500)));
    const startDelay = Math.max(50, Math.min(5000, Number(query.get('qaDelay') || 250)));
    const blurAfter = Number(query.get('qaBlurAfter') || 0);
    const releaseCodes = (query.get('qaRelease') || '').split(',').filter(code => codes.includes(code));
    const releaseAfter = Math.max(50, Math.min(5000, Number(query.get('qaReleaseAfter') || Math.max(100, holdMs * .5))));
    const event = (type: 'keydown' | 'keyup', selected = codes) => selected.forEach(code => {
      const key = code === 'ShiftLeft' ? 'Shift' : code.slice(-1).toLowerCase();
      window.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, code, key }));
    });
    if (sequence.length) {
      let cancelled = false;
      const runSequence = async () => {
        await new Promise(resolve => window.setTimeout(resolve, startDelay));
        for (const item of sequence) {
          if (cancelled) return;
          event('keydown', [item.code]); document.documentElement.dataset.phase1Qa = `held-${item.code}`;
          await new Promise(resolve => window.setTimeout(resolve, item.duration));
          event('keyup', [item.code]);
        }
        document.documentElement.dataset.phase1Qa = 'released';
      };
      void runSequence();
      return () => { cancelled = true; };
    }
    const start = window.setTimeout(() => {
      event('keydown');
      document.documentElement.dataset.phase1Qa = 'held';
      const blurTimer = blurAfter > 0 ? window.setTimeout(() => {
        window.dispatchEvent(new Event('blur'));
        document.documentElement.dataset.phase1Qa = 'blurred';
      }, Math.min(blurAfter, holdMs - 50)) : undefined;
      const releaseTimer = releaseCodes.length ? window.setTimeout(() => event('keyup', releaseCodes), Math.min(releaseAfter, holdMs - 50)) : undefined;
      window.setTimeout(() => {
        if (blurTimer) window.clearTimeout(blurTimer);
        if (releaseTimer) window.clearTimeout(releaseTimer);
        event('keyup', codes.filter(code => !releaseCodes.includes(code)));
        document.documentElement.dataset.phase1Qa = 'released';
      }, holdMs);
    }, startDelay);
    return () => window.clearTimeout(start);
  }, [status]);
  return <main className={styles.shell}>
    <div className={styles.topbar}><Link href="/" className={styles.brand}>Q/R <span>DEVELOPMENT LAB</span></Link><Link href="/">← Legacy game</Link></div>
    <div className={styles.title}><div><p>PHASE 01 / LOCOMOTION FOUNDATION</p><h1>Into the third dimension.</h1></div><span className={styles.badge}>3D SANDBOX</span></div>
    <div className={styles.workspace}>
      <div className={styles.viewport}>
        <canvas ref={canvas} tabIndex={0} aria-label="3D humanoid sandbox. WASD to move, Shift to run, drag to orbit." />
        <div className={styles.sceneLabel}><i />{status === 'ready' ? 'LIVE 3D SCENE' : status === 'loading' ? 'LOADING ASSET' : 'LOAD FAILED'}<span>Y-UP · WORLD SPACE</span></div>
        {status !== 'ready' && <output className={styles.loading}><strong>{status === 'error' ? 'The 3D character could not load.' : 'Preparing the development character…'}</strong><p>{message}</p>{status === 'error' && <button onClick={() => window.location.reload()}>Reload sandbox</button>}</output>}
        <div className={styles.sceneFooter}><span>TEMPORARY DEVELOPMENT CHARACTER</span><span>{stats.motion.toUpperCase()}</span></div>
      </div>
      <aside className={styles.sidebar}>
        <p className={styles.eyebrow}>CONTROL THE CHARACTER</p><h2>Move. Turn. Explore.</h2>
        <p>A generic rigged humanoid for testing movement and animation. This is not a final wrestler model.</p>
        <div className={styles.keys}><kbd>W</kbd><div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div>
        <dl className={styles.instructions}><div><dt>W / S</dt><dd>Forward / backward</dd></div><div><dt>A / D</dt><dd>Left / right</dd></div><div><dt>SHIFT</dt><dd>Hold to run</dd></div><div><dt>DRAG</dt><dd>Orbit the follow camera</dd></div></dl>
        <p className={styles.note}>Movement follows world axes. Click the scene to focus. Releasing the keys stops movement; changing focus clears held keys.</p>
        <button className={styles.debugToggle} aria-expanded={debug} onClick={() => setDebug(value => !value)}>{debug ? 'Hide diagnostics' : 'Show diagnostics'}</button>
        {debug && <div className={styles.debug}><DebugPanel snapshot={stats} /></div>}
      </aside>
    </div>
    <p className={styles.bottom}>One humanoid. Three skeletal clips. A separate runtime. <span>Legacy gameplay remains available.</span></p>
  </main>;
}
