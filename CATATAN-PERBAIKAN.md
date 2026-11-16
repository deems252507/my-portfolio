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
