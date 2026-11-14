# Intro 3D "Developer Workspace"

Overlay sinematik di atas portfolio asli. Portfolio, routing, Supabase, dan semua fitur lama tidak diubah.

## Alur
1. Ruangan futuristik 3D, programmer mengetik (jari bergerak, tombol keyboard menyala).
2. Kamera mendekat perlahan (efek telephoto), URL `https://rizkydm.vercel.app/` terketik di address bar.
3. Enter -> loading browser -> website tampil di monitor.
4. Dolly zoom, browser jadi layar penuh, kamera menembus layar.
5. Overlay 3D memudar dan **layar "Welcome To My Portofolio" milikmu** (WelcomeScreen, tidak diubah) tampil dengan animasi partikel 3D-nya.
6. Setelah welcome selesai, website asli langsung terlihat. Animasi tidak diulang saat scroll.

## File
- `src/Pages/IntroScreen.jsx` : pengatur overlay, tombol Skip Intro, ESC, reduced-motion, fallback.
- `src/components/intro/DeveloperIntro.jsx` : mount scene (lazy / code-split).
- `src/components/intro/workspaceScene.js` : scene Three.js + timeline GSAP. Semua durasi ada di `INTRO_CONFIG.t` (bagian atas file).
- `src/components/intro/browserScreen.js` : tampilan browser di monitor (tekstur kanvas).
- `src/App.jsx` : hanya 1 baris diubah (import `IntroScreen`). `WelcomeScreen.jsx` lama tetap ada.

## Perilaku
- WebGL tidak ada / error / reduced-motion: langsung ke WelcomeScreen milikmu tanpa intro 3D.
- Skip Intro (tombol kanan bawah) atau Esc: lewati semuanya langsung ke portfolio. Pengaman waktu 45 detik.
- Mobile: resolusi dibatasi, bayangan lebih ringan, kamera ditarik mundur untuk layar portrait.
- FPS rendah: resolusi otomatis diturunkan.

## Upgrade ke karakter realistis (opsional)
Taruh model di `public/models/developer.glb`. Jika file ada, otomatis dipakai menggantikan karakter bawaan.
- Origin di lantai, menghadap -Z (ke monitor), pose duduk di kursi (kursi ada di z = 0.66).
- Atur `position`, `rotationY`, `scale` di `INTRO_CONFIG.characterGLB`.
- Jika model punya animasi (mengetik), klip pertama diputar berulang.

## Pratinjau layar (opsional)
Taruh screenshot hero asli di `public/intro/portfolio-preview.jpg`. Dipakai di layar monitor
menggantikan pratinjau gambar-kanvas bawaan, sehingga transisi ke website asli lebih mirip.

## Instal
```
npm install
npm run dev
```
(`three` dan `gsap` ditambahkan ke package.json; package-lock akan diperbarui oleh `npm install`.)

## Pembaruan (versi sinematik)
Alur sekarang: programmer bekerja di markas luar angkasa -> kamera mendekat -> tangan ke mouse, kursor menuju address bar, klik ->
URL `https://rizkydm.vercel.app/` diketik huruf demi huruf (suara keyboard) -> kelingking tangan kanan bergerak ke tombol ENTER,
menekan (tombol turun sinkron dengan jari) -> loading browser -> monitor menampilkan layar tujuan yang SAMA (petir + "Welcome To My / Portofolio Website",
dirender dengan shader petir situs) -> kamera masuk menembus layar, bezel hilang -> petir ungu memenuhi layar -> menyatu dengan WelcomeScreen -> homepage.

File baru di `src/components/intro/`:
- `spaceRoom.js` : kaca panorama, planet, bintang/nebula/galaksi, bulan, asteroid & stasiun melayang, berkas cahaya, pantulan (environment map dari angkasa).
- `character.js` : karakter lebih detail (wajah, rambut berlapis, kacamata, headset, hoodie berlipat, tangan 2 ruas jari).
- `lightningBG.js` : petir WebGL (shader sama dengan `ui/Lightning.jsx`), dipakai di layar monitor dan overlay layar-penuh.
- `audio.js` : efek suara Web Audio (keyboard, ENTER, loading, energi, petir). MATI default; tombol "Suara" kiri bawah.

Warna petir mengikuti pengaturan Dashboard Admin (`lightning_hue`). Untuk memaksa ungu di intro: `INTRO_CONFIG.lightningHue = 270` di `workspaceScene.js`.
Semua waktu adegan ada di `INTRO_CONFIG.t`.
