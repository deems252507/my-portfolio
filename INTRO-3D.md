# Intro 3D sinematik — "Programmer di markas luar angkasa"

Overlay di atas portfolio asli. Portfolio, routing, Supabase, dashboard admin, dan semua fitur lama tidak diubah
(`App.jsx`, `WelcomeScreen.jsx`, halaman, dan database tidak disentuh).

## Alur (± 19,5 detik)
1. Programmer bekerja di ruangan berkaca menghadap planet; kamera dari belakang, tangan mengetik.
2. Dolly-in ke monitor; tangan memegang mouse, kursor bergerak ke address bar dan klik.
3. `https://rizkydm.vercel.app/` diketik huruf demi huruf (tiap huruf = ketukan jari di tombol QWERTY yang benar + tombol turun + suara).
4. Kamera mundur pelan ke bidikan medium, tangan kanan meluncur ke ENTER, JARI MANIS menekan, tombol turun, baru loading browser.
5. Halaman sambutan tampil di monitor (petir dari shader yang SAMA dengan WelcomeBackground, hue dari admin),
   bezel/browser menghilang, kamera masuk ke layar, petir memenuhi layar, lalu crossfade ke WelcomeScreen asli -> homepage.

## File
- `src/Pages/IntroScreen.jsx` : overlay, Skip Intro, Esc, tombol suara, reduced-motion, fallback perangkat lemah.
- `intro/DeveloperIntro.jsx` : mount scene (lazy) + meneruskan pengaturan petir & audio.
- `intro/workspaceScene.js` : scene, jalur kamera (Hermite, ada momentum), timeline. Semua waktu di `INTRO_CONFIG.t`.
- `intro/character.js` : karakter (hoodie berlipatan, rambut gerombol, headphone, tangan & jari dua ruas).
- `intro/furniture.js` : meja, monitor lengkung + kaca, keyboard dengan tombol ENTER nyata, kursi.
- `intro/spaceEnvironment.js` : langit (bintang, nebula, galaksi), planet, bulan, asteroid, satelit, pesawat, bintang jatuh, kaca panorama, lantai.
- `intro/browserScreen.js` : tekstur layar monitor (browser, kursor, halaman sambutan).
- `intro/lightningSource.js` : shader petir (disalin dari `components/ui/Lightning.jsx`).
- `intro/introAudio.js` : efek suara sintetis Web Audio (tanpa file audio).
- `intro/IntroLoader.jsx` : layar loading sebelum adegan siap.
- `intro/helpers.js` : fungsi bantu.

## Perilaku
- Suara hanya 2: ketukan keyboard dan klik ENTER. Default MATI (aturan autoplay browser); tombol "Suara" kiri bawah. Tombol Skip Intro dihapus (Esc masih berfungsi diam-diam).
- Layar loading tampil sejak halaman dibuka (index.html -> IntroLoader) sampai adegan 3D siap, tidak ada layar hitam kosong.
- Tanpa WebGL / reduced-motion / RAM atau CPU sangat rendah: langsung ke WelcomeScreen/website utama.
- Mobile: resolusi dibatasi, tanpa DOF & RectAreaLight, bintang/asteroid lebih sedikit. FPS rendah -> resolusi turun, lalu DOF dimatikan.
- Pengaman waktu 45 detik.

## Opsional
- `public/models/developer.glb` : model karakter sungguhan (menggantikan karakter prosedural; animasi tangan/ENTER tidak ikut karena tidak ada rig).
- `public/intro/portfolio-preview.jpg` : tangkapan layar asli, dipakai di monitor menggantikan halaman sambutan buatan.

## Jalankan
```
npm install
npm run dev
```
