import { Scene, Color, Fog, HemisphereLight, DirectionalLight, Mesh, PlaneGeometry, MeshStandardMaterial, GridHelper, TorusGeometry, MeshBasicMaterial } from 'three';

export function createScene() {
  const scene = new Scene(); scene.background = new Color('#111e27'); scene.fog = new Fog('#111e27', 18, 44);
  scene.add(new HemisphereLight('#d5f6ff', '#344039', 2.2));
  const sun = new DirectionalLight('#ffdfb9', 3.2); sun.position.set(6, 10, 5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6; sun.shadow.camera.near = .1; sun.shadow.camera.far = 30;
  sun.shadow.normalBias = .025; sun.shadow.bias = -.0002;
  scene.add(sun, sun.target);
  const floor = new Mesh(new PlaneGeometry(80, 80), new MeshStandardMaterial({ color: '#253b46', roughness: .93 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new GridHelper(40, 40, '#668889', '#334e5a'); grid.position.y = .002; scene.add(grid);
  const origin = new Mesh(new TorusGeometry(1.35, .013, 6, 72), new MeshBasicMaterial({ color: '#b6df88' }));
  origin.rotation.x = -Math.PI / 2; origin.position.y = .005; scene.add(origin);
  return { scene, sun };
}
