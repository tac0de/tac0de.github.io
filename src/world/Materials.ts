import * as THREE from 'three';

export function createMaterials() {
  return {
    wall: new THREE.MeshStandardMaterial({
      color: 0x7b7467,
      roughness: 1,
      metalness: 0,
    }),

    darkWall: new THREE.MeshStandardMaterial({
      color: 0x514a44,
      roughness: 1,
      metalness: 0,
    }),

    floor: new THREE.MeshStandardMaterial({
      color: 0x5b574d,
      roughness: 1,
      metalness: 0,
    }),

    carpet: new THREE.MeshStandardMaterial({
      color: 0x84323c,
      roughness: 1,
      metalness: 0,
    }),

    door: new THREE.MeshStandardMaterial({
      color: 0x7c4c32,
      roughness: 1,
      metalness: 0,
    }),

    wood: new THREE.MeshStandardMaterial({
      color: 0x6b452f,
      roughness: 1,
      metalness: 0,
    }),

    metal: new THREE.MeshStandardMaterial({
      color: 0x77756d,
      roughness: 0.9,
      metalness: 0.15,
    }),

    paper: new THREE.MeshBasicMaterial({
      color: 0xded0a5,
    }),

    key: new THREE.MeshBasicMaterial({
      color: 0xf2ce65,
    }),

    neonPink: new THREE.MeshBasicMaterial({
      color: 0xff3d75,
    }),

    neonBlue: new THREE.MeshBasicMaterial({
      color: 0x75c8ff,
    }),

    screen: new THREE.MeshBasicMaterial({
      color: 0x8fc6cf,
    }),

    blood: new THREE.MeshBasicMaterial({
      color: 0x6f0808,
    }),

    black: new THREE.MeshBasicMaterial({
      color: 0x050505,
    }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;