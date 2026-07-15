// ============================================================
// Karakter ber-animasi: bungkus model + AnimationMixer
// Menggantikan animasi sinus manual dengan klip animasi asli.
// ============================================================
import * as THREE from 'three';
import { instantiate, normalizeModel, computeDisplayBox } from './assets';

/** Normalkan nama klip: 'CharacterArmature|Run_Fast' → 'runfast' */
function norm(s: string): string {
  return s.toLowerCase().split('|').pop()!.replace(/[^a-z]/g, '');
}

export class AnimatedCharacter {
  /** Group luar — inilah yang diposisikan/diputar oleh gameplay. */
  root: THREE.Group;
  /** Model asli di dalam holder (tempat rangka & animasi berada). */
  animRoot: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  clips: THREE.AnimationClip[];
  private current: THREE.AnimationAction | null = null;
  private currentClip = '';

  constructor(root: THREE.Group, clips: THREE.AnimationClip[], animRoot?: THREE.Object3D) {
    this.root = root;
    this.clips = clips;
    this.animRoot = animRoot ?? root;
    this.mixer = new THREE.AnimationMixer(this.animRoot);
  }

  static async load(url: string, targetHeight = 2.05): Promise<AnimatedCharacter> {
    const { root, clips } = await instantiate(url);
    // Bungkus dalam group luar: normalisasi skala/pijakan ditaruh di model dalam,
    // sementara gameplay bebas menyetel posisi/rotasi di group luar tanpa bentrok.
    const holder = new THREE.Group();
    holder.add(root);

    // Pasang pose frame pertama klip idle (atau klip pertama) SEBELUM normalisasi.
    // Bind-pose bisa berbeda dari pose tampil (badan tergeser/kaki lain posisi),
    // sehingga tanpa ini model bisa melayang atau tingginya meleset.
    const poseClip = clips.find(c => norm(c.name).includes('idle')) ?? clips[0];
    if (poseClip) {
      const poser = new THREE.AnimationMixer(root);
      poser.clipAction(poseClip).play();
      poser.update(1e-4);       // tulis pose frame-0 ke tulang (delta 0 di-skip mixer)
      normalizeModel(root, targetHeight);
      poser.stopAllAction();
      poser.uncacheRoot(root);  // mixer asli dibuat bersih di constructor
    } else {
      normalizeModel(root, targetHeight);
    }
    return new AnimatedCharacter(holder, clips, root);
  }

  /** Daftar nama klip yang tersedia (buat inspeksi/debug). */
  listClips(): string[] {
    return this.clips.map(c => c.name);
  }

  /** Cari klip dengan pencocokan longgar: 'run' cocok ke 'Armature|Running'. */
  findClip(name: string): THREE.AnimationClip | null {
    const want = norm(name);
    return this.clips.find(c => norm(c.name) === want)
      ?? this.clips.find(c => norm(c.name).includes(want))
      ?? this.clips.find(c => want.includes(norm(c.name)))
      ?? null;
  }

  /**
   * Mainkan klip dengan crossfade halus. Mengembalikan false kalau klip tak ada,
   * sehingga pemanggil bisa menyiapkan fallback.
   */
  play(name: string, opts: { fade?: number; loop?: boolean; speed?: number } = {}): boolean {
    const { fade = 0.2, loop = true, speed = 1 } = opts;
    const clip = this.findClip(name);
    if (!clip) return false;
    if (this.currentClip === clip.name) return true;

    const next = this.mixer.clipAction(clip);
    next.reset();
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = !loop;
    next.setEffectiveTimeScale(speed);
    next.fadeIn(fade).play();
    if (this.current && this.current !== next) this.current.fadeOut(fade);

    this.current = next;
    this.currentClip = clip.name;
    return true;
  }

  /** Klip yang sedang diputar (nama asli dari file). */
  get playing(): string { return this.currentClip; }

  // Jepret kaki ke tanah SETELAH animasi benar-benar berjalan.
  // Beberapa klip menggeser rangka relatif terhadap bind-pose, sehingga
  // normalisasi saat load bisa meleset (model melayang). Ukur sekali pose
  // nyata yang tampil, lalu koreksi — berlaku untuk karakter maupun bos.
  private settleT = 0.3;
  private _wp = new THREE.Vector3();

  snapToGround() {
    const box = computeDisplayBox(this.animRoot, true); // badan saja, abaikan prop
    if (box.isEmpty()) return;
    this.root.getWorldPosition(this._wp);
    this.animRoot.position.y -= (box.min.y - this._wp.y);
  }

  update(dt: number) {
    this.mixer.update(dt);
    if (this.settleT > 0 && dt > 0) {
      this.settleT -= dt;
      if (this.settleT <= 0) this.snapToGround();
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.animRoot as THREE.Object3D);
  }
}
