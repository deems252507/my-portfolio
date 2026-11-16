# Catatan perbaikan (cek bug intro)

## Layar hitam di HP setelah animasi
- Tidak ada error boundary di seluruh app -> 1 error (WebGL globe gagal dibuat, file JS gagal diunduh, dll.) membuat React
  membuang SELURUH halaman = layar hitam. Ditambah: `components/ErrorBoundary.jsx` (di App: root, intro, tiap section),
  `utils/lazyWithRetry.js` (coba ulang unduhan chunk, reload 1x bila chunk lama sudah tidak ada setelah deploy),
  try/catch `createGlobe` di `Globe.jsx`, dan `IntroScreen` melewati welcome bila error.
- `workspaceScene.js`: handler `webglcontextlost` (bila context tidak kembali 2,5 dtk -> intro dilewati, tidak hitam).

## Kedip
- Perubahan tinggi kecil (bilah alamat HP) tidak lagi me-resize canvas (resize = canvas kosong sesaat).
- Blur DOF memudar halus, tidak mati mendadak.
- Tekstur monitor memakai mipmap (tidak berkilau saat kamera bergoyang).
- Animasi loader sefase di index.html / fallback / IntroLoader (tidak restart saat ganti layar).

## Berat / blur di laptop
- Bayangan diperbarui tiap 2 frame (HP 3) dan tidak digambar ulang oleh pass DOF.
- Layar monitor digambar maks ~30fps (sebelumnya ~60fps, upload tekstur besar tiap frame).
- Kualitas adaptif berurutan: matikan DOF -> turunkan resolusi -> kurangi partikel, dievaluasi juga saat animasi berjalan.
  (Sebelumnya resolusi diturunkan lebih dulu = penyebab gambar jadi blur.)

## Putaran 2 (dari video rekaman HP)
- Kedip hitam 2 frame saat kursor menuju address bar: `ResizeObserver` memanggil `renderer.setSize()` (mengosongkan canvas)
  setelah frame digambar tapi sebelum tampil. Sekarang ukuran diubah di dalam `frame()` tepat sebelum render.
- Transisi layar 3D -> layar asli patah: fade overlay memakai transisi CSS yang bisa tertunda/terpotong saat HP sibuk.
  Sekarang opacity overlay digerakkan dari jam adegan 3D (sinkron frame), 0,85 dtk.

- Monitor sudah menyala sejak frame pertama (tanpa animasi power-on), tangan langsung mengetik, editor kode sudah berisi beberapa baris.
- Durasi intro 19,4 -> 21,3 dtk: +1,5 dtk ngoding di awal, fade ke layar asli 1,2 dtk (semua jadwal di INTRO_CONFIG.t sudah digeser, urutan tetap).

## Putaran 3 (video kedua)
- Kilat (petir) tidak lagi berkedip kasar per frame: kecerahan berdenyut halus (energi rata-rata sama). Di `Lightning.jsx` dan `lightningSource.js`.
- Penurunan kualitas otomatis tidak lagi mengubah ukuran canvas saat animasi (hanya render target post-processing); `setSize` dilewati bila ukuran sama.
- Layar loading dilepas dari DOM setelah memudar (animasi kotak-kotaknya sebelumnya terus berjalan di atas canvas 3D).
- Tombol suara tanpa `backdrop-blur` (blur di atas canvas WebGL animasi memicu kedip di iOS/Android).
- Mode diagnosa: tambahkan `?debug` di akhir alamat situs -> log (resize, context WebGL hilang, frame lambat) tampil di layar.
