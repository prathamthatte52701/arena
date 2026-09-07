import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three';

const material = (color: string, roughness = .7) => new MeshStandardMaterial({ color, roughness });
const mesh = (geometry: BoxGeometry | CylinderGeometry | SphereGeometry, mat: MeshStandardMaterial, y: number) => { const item = new Mesh(geometry, mat); item.position.y = y; item.castShadow = true; item.receiveShadow = true; return item; };

export function createWrestlingRing() {
  const group = new Group(); group.name = 'Phase2WrestlingRing';
  const apronMat = material('#172934'), matMat = material('#536d7b', .9), trimMat = material('#d4e8dc', .55), postMat = material('#10171c', .35), ropeMat = material('#b9d5d8', .45);
  const platform = mesh(new BoxGeometry(10.4, .55, 8.2), apronMat, .2); platform.name = 'RaisedPlatform'; group.add(platform);
  const mat = mesh(new BoxGeometry(9.35, .12, 7.15), matMat, .54); mat.name = 'RingMat'; group.add(mat);
  const apron = mesh(new BoxGeometry(10.1, .55, 7.9), trimMat, .2); apron.name = 'Apron'; apron.scale.y = .08; group.add(apron);
  const postPositions = [[-4.75, -3.65], [-4.75, 3.65], [4.75, -3.65], [4.75, 3.65]];
  for (const [x, z] of postPositions) {
    const post = mesh(new CylinderGeometry(.11, .14, 4.2, 12), postMat, 2.3); post.position.x = x; post.position.z = z; post.name = 'RingPost'; group.add(post);
    for (const level of [1.25, 2.05, 2.85]) { const pad = mesh(new SphereGeometry(.22, 12, 8), ropeMat, level); pad.position.x = x > 0 ? x - .15 : x + .15; pad.position.z = z > 0 ? z - .15 : z + .15; pad.name = 'Turnbuckle'; group.add(pad); }
  }
  for (const y of [1.25, 2.05, 2.85]) {
    for (const [x, z, length, horizontal] of [[0, -3.65, 9.5, true], [0, 3.65, 9.5, true], [-4.75, 0, 7.3, false], [4.75, 0, 7.3, false]] as const) {
      const rope = mesh(new CylinderGeometry(.045, .045, length, 8), ropeMat, y); rope.position.x = x; rope.position.z = z; if (horizontal) rope.rotation.z = Math.PI / 2; else rope.rotation.x = Math.PI / 2; rope.name = 'Rope'; group.add(rope);
    }
  }
  return group;
}
