/**
 * Koleksi kalimat ajakan elegan tanpa emoji berlebih
 * Didesain khusus untuk menjaga estetika, wibawa, dan kesan mewah pada pesan notifikasi Discord.
 */

const LIVE_PHRASES = [
  'Siaran langsung kini sedang berlangsung. Luangkan waktu sejenak dan mari bergabung bersama di ruang siaran.',
  'Ruang siaran telah resmi dibuka. Kehadiranmu dinantikan untuk meramaikan sesi kali ini.',
  'Sesi interaktif sedang berjalan saat ini. Jangan lewatkan obrolan dan momen hangatnya.',
  'Pintu siaran kini telah terbuka. Mari merapat dan nikmati suasananya bersama kawan-kawan.',
  'Siaran baru saja dimulai. Mari bergabung sebelum sesinya berakhir.',
  'Waktu yang tepat untuk singgah sejenak. Siaran langsung sedang mengudara.',
  'Suasana siaran telah menyala. Jangan ragu untuk ikut menyapa dan meramaikan.',
  'Momen kebersamaan kembali hadir di linimasa. Bergabunglah sekarang selagi siaran masih berlangsung.',
  'Obrolan hangat tengah bergulir di siaran langsung. Jadilah bagian dari keseruannya.',
  'Koneksi siaran telah aktif. Mari hadir dan ramaikan ruang siaran sekarang.'
];

const POST_PHRASES = [
  'Sebuah karya visual terbaru telah resmi dirilis. Saksikan dan nikmati sajian kali ini.',
  'Konten anyar kini telah mengudara. Luangkan sejenak waktumu untuk menyimak cuplikan berikut.',
  'Satu karya terbaru telah dipublikasikan. Simak selengkapnya melalui tautan yang tersedia.',
  'Sajian visual baru telah hadir di linimasa. Jangan lewatkan ulasan dan cuplikan terbarunya.',
  'Edisi konten terbaru telah tayang hari ini. Mari saksikan bersama melalui tautan di bawah.',
  'Eksplorasi visual terkini baru saja diluncurkan. Saksikan sebelum terlewatkan.',
  'Ada perspektif dan cerita baru yang baru saja dibagikan. Simak selengkapnya sekarang.',
  'Kreasi terbaru telah siap dinikmati. Luangkan waktu sejenak untuk menyaksikannya.',
  'Publikasi anyar telah hadir di hadapanmu. Tonton dan temukan keseruan di dalamnya.',
  'Sebuah sajian segar baru saja mengudara. Simak cuplikan lengkapnya hari ini.'
];

/**
 * Mengambil kalimat ajakan secara acak berdasarkan jenis konten (live / post)
 * @param {'live' | 'post'} type 
 * @returns {string}
 */
function getRandomPhrase(type = 'post') {
  const list = type === 'live' ? LIVE_PHRASES : POST_PHRASES;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

module.exports = {
  LIVE_PHRASES,
  POST_PHRASES,
  getRandomPhrase
};
