# Simulasi Penjadwalan Hybrid Greedy-GA

Tugas Projek Matematika Terapan — Kelompok 3.

Aplikasi client-side (tanpa backend) yang mensimulasikan penjadwalan kuliah menggunakan **Hybrid Greedy–Genetic Algorithm** dan membandingkannya dengan **Pure GA**.

## Cara menjalankan

1. Buka `index.html` di browser (atau jalankan `npm run serve`).
2. Pilih dataset via **Preset M** / **Preset L**, atau edit kelas/ruang/waktu lewat editor visual.
3. Klik **JALANKAN EKSPERIMEN HYBRID** atau **BANDINGKAN PERFORMA (GA VS HYBRID)**.

## Parameter algoritma

| Parameter | Rentang (di-clamp) | Default |
|---|---|---|
| Ukuran Populasi | 10–500 | 50 |
| Maks Generasi | 10–1000 | 100 |
| Laju Crossover (Cr) | 0–1 | 0.8 |
| Laju Mutasi (Mr) | 0–1 | 0.1 |
| Rasio Greedy Awal | 0–1 (0 = Pure GA) | 0.5 |

**Fitness** dihitung sebagai `1 / (1 + totalBentrokan)`. Fitness `1.0` berarti jadwal bebas bentrokan ruang maupun dosen.

## Catatan grafik fitness

- Titik **Gen 0** adalah fitness populasi awal.
- Simulasi **berhenti lebih awal** jika fitness mencapai `1.0` (konvergen optimal); log akan mencatat generasi konvergen.
- Dataset default cukup mudah sehingga Hybrid sering konvergen sangat cepat — itu perilaku normal greedy seed.

## Pengembangan

```bash
npm test   # unit test (node:test) untuk fitness, greedy, clamp, escape, dll.
```

## Struktur

- `index.html` — UI
- `style.css` — styling
- `app.js` — algoritma GA + rendering
- `tests/app.test.js` — unit test
