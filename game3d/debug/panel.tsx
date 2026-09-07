import type { DebugSnapshot } from './metrics';
export default function DebugPanel({ snapshot: s }: { snapshot: DebugSnapshot }) {
  return <section aria-label="Development diagnostics">
    <h2>Runtime diagnostics</h2>
    <dl>
      <div><dt>FPS / frame</dt><dd data-testid="fps">{s.fps.toFixed(0)} / {s.frameMs.toFixed(1)} ms</dd></div>
      <div><dt>Position x / y / z</dt><dd data-testid="position">{s.x.toFixed(3)} / {s.y.toFixed(3)} / {s.z.toFixed(3)}</dd></div>
      <div><dt>Movement</dt><dd data-testid="motion">{s.motion}</dd></div>
      <div><dt>Active animation</dt><dd data-testid="animation">{s.animation}</dd></div>
      <div><dt>Animation weights</dt><dd data-testid="animation-weights">{Object.entries(s.animationWeights).map(([name, weight]) => `${name} ${weight.toFixed(2)}`).join(' · ') || '—'}</dd></div>
      <div><dt>Character loaded</dt><dd data-testid="loaded">{s.loaded ? 'YES' : 'NO'}</dd></div>
      <div><dt>Skeleton / skinned meshes</dt><dd>{s.bones} bones / {s.skins} mesh</dd></div>
      <div><dt>Yaw / clip clock</dt><dd>{s.yaw.toFixed(3)} rad / {s.animationTime.toFixed(2)} s</dd></div>
      <div><dt>Spine / thigh rotation</dt><dd data-testid="bone-angles">{s.spineAngle.toFixed(4)} / {s.thighAngle.toFixed(4)}</dd></div>
      <div><dt>Camera x / y / z</dt><dd data-testid="camera">{s.cameraX.toFixed(2)} / {s.cameraY.toFixed(2)} / {s.cameraZ.toFixed(2)}</dd></div>
      <div><dt>Draw calls / triangles</dt><dd>{s.drawCalls} / {s.triangles}</dd></div>
      <div><dt>Input focus</dt><dd>{s.focused ? 'ACTIVE' : 'RELEASED'}</dd></div>
    </dl>
  </section>;
}
