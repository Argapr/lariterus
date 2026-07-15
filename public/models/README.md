# Model 3D (karakter & bos)

Folder ini di-serve Vite di root URL. Contoh:
`public/models/characters/ninja.glb` → diakses sebagai `/models/characters/ninja.glb`

## Yang perlu diunduh

**Quaternius** (https://quaternius.com) — lisensi **CC0** (bebas pakai komersial, tanpa atribusi):
- Pack **karakter ber-rig + animasi** → taruh di `public/models/characters/`
- Pack **monster/creature ber-rig** (untuk bos) → taruh di `public/models/bosses/`

**Mixamo** (https://mixamo.com, gratis + akun Adobe) — kalau klip animasi bawaan kurang
(butuh: `Idle`, `Run`, `Jump`, `Attack`/`Shoot`, `Hit`, `Death`).

## Syarat teknis (penting)

1. **Format `.glb`** (atau `.gltf` + bin). Kalau pack-nya cuma menyediakan **FBX**, bilang ke saya —
   perlu dikonversi dulu (lewat Blender export, atau `fbx2gltf`).
2. **Rig + animasi harus ikut ter-embed** di file. Model statis tanpa rangka tidak menyelesaikan
   masalah "kaku" — animasinya yang bikin hidup.
3. Ukuran/tinggi model **tidak masalah** — kode menormalkan tinggi otomatis.
4. Nama klip animasi **tidak masalah** — pencocokan nama dibuat fleksibel
   (`CharacterArmature|Run`, `Armature|Running`, `run` → semuanya cocok ke `run`).

## Cara menguji setelah menaruh file

Jalankan `npm run dev`, buka game, lalu di console browser:

```js
// lihat file apa saja yang terbaca & nama klipnya
await __game.spikeClips('/models/characters/NAMA_FILE.glb')

// tampilkan model itu sebagai karakter di menu
await __game.spike('/models/characters/NAMA_FILE.glb')

// coba klip tertentu
__game.spikePlay('run')

// kembali ke karakter prosedural lama
__game.spikeOff()
```
