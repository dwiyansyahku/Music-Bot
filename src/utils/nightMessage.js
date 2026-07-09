const NIGHT_QUOTES = [
  // — Santai & Reflektif Indo —
  { text: '"Malam adalah waktu terbaik buat refleksi — apa aja yang udah lo lakuin hari ini?" 🌙', author: 'Unknown' },
  { text: '"Sebelum tidur, inget hal-hal kecil yang bikin lo tersenyum hari ini." 😌', author: 'Unknown' },
  { text: '"Istirahat itu bukan menyerah. Istirahat itu investasi untuk esok hari." 🛌', author: 'Unknown' },
  { text: '"Lepas semua beban hari ini sebelum tidur. Besok adalah babak baru." 🌟', author: 'Unknown' },
  { text: '"Lo udah kerja keras hari ini. Sekarang waktunya istirahat — lo layak dapetin itu." 🤍', author: 'Unknown' },
  { text: '"Tidur yang cukup itu bukan males, itu perawatan diri." 💤', author: 'Unknown' },
  { text: '"Malam ini, maafin diri lo sendiri kalau hari ini nggak sempurna. Besok coba lagi." 🌸', author: 'Unknown' },
  { text: '"Bintang-bintang di langit ingetin kita: masalah kita nggak sebesar yang kita kira." ⭐', author: 'Unknown' },
  { text: '"Tutup hari ini dengan rasa syukur, sekecil apapun hal yang patut disyukuri." 🙏', author: 'Unknown' },
  { text: '"Jangan bawa drama hari ini ke dalam tidur lo. Pikiran tenang = tidur nyenyak." 😴', author: 'Unknown' },
  { text: '"Malam adalah bukti bahwa setelah gelap, selalu ada terang." 🌅', author: 'Unknown' },
  { text: '"Hari yang berat pun akan berakhir. Lo udah sampai di penghujung hari — itu kemenangan." 🏆', author: 'Unknown' },
  { text: '"Recharge dirimu malam ini. Dunia butuh versi terbaik lo besok." ⚡', author: 'Unknown' },
  { text: '"Malam ini, bersyukurlah: lo masih hidup, masih bernapas, masih punya kesempatan." 🕯️', author: 'Unknown' },
  { text: '"Tidur lebih awal = bangun dengan semangat lebih besar. Math-nya simpel." 📐', author: 'Unknown' },
  { text: '"Lo boleh nggak produktif hari ini. Yang penting besok lo bangkit lagi." 🦋', author: 'Unknown' },
  { text: '"Biarkan malam ini jadi jembatan menuju hari esok yang lebih baik." 🌉', author: 'Unknown' },
  { text: '"Setiap malam adalah kesempatan buat reset pikiran dan hati." 🔄', author: 'Unknown' },
  { text: '"Mimpi indah itu reward buat yang udah berjuang seharian." 💭', author: 'Unknown' },
  { text: '"Jangan tidur dengan hati yang berat. Maafkan, lepaskan, istirahatkan." 🕊️', author: 'Unknown' },
  { text: '"Rasa lelah malam ini adalah bukti nyata dari perjuanganmu hari ini." 💪', author: 'Unknown' },
  { text: '"Gelapnya malam takkan pernah abadi, esok fajar kembali menyinari." 🌅', author: 'Unknown' },
  { text: '"Tarik napas dalam-dalam, hembuskan. Malam ini biarkan dirimu beristirahat." 🧘', author: 'Unknown' },
  { text: '"Kasur adalah tempat terbaik untuk melarikan diri dari kepenatan dunia." 🛌', author: 'Unknown' },
  { text: '"Jangan bandingkan prosesmu dengan orang lain sebelum tidur. Fokus pada dirimu sendiri." 🎯', author: 'Unknown' },
  { text: '"Malam yang sunyi adalah teman terbaik untuk menjernihkan pikiran yang kusut." 🍃', author: 'Unknown' },

  // — Inspiratif English —
  { text: '"The night is the hardest time to be alive, but it makes the dawn all the sweeter." 🌄', author: 'Patti Smith' },
  { text: '"Good night, sleep tight — tomorrow is a brand new fight." 🥊', author: 'Unknown' },
  { text: '"Rest when you\'re weary. Refresh and renew yourself." 🌿', author: 'Unknown' },
  { text: '"Each night, when I go to sleep, I die. Each morning, when I wake up, I am reborn." ☀️', author: 'Mahatma Gandhi' },
  { text: '"Sleep is the best meditation." 🧘', author: 'Dalai Lama' },
  { text: '"The darkest nights produce the brightest stars." ✨', author: 'Unknown' },
  { text: '"End the day with gratitude. There is someone, somewhere, who has less than you." 🙏', author: 'Unknown' },
  { text: '"A day without a grateful moment is a day wasted." 🌻', author: 'Unknown' },
  { text: '"Take rest; a field that has rested gives a bountiful crop." 🌾', author: 'Ovid' },
  { text: '"Be grateful for what you already have while you pursue your goals." 💛', author: 'Roy Bennett' },
  { text: '"Never go to sleep with anger in your heart. Lay it down and find peace." ✨', author: 'Unknown' },
  { text: '"Starry skies are reminders that beauty exists even in the dark." 🌌', author: 'Unknown' },
  { text: '"Night is to see the dreams and day is to make them alive." 💭', author: 'Unknown' },
  { text: '"The best bridge between despair and hope is a good night\'s sleep." 🌉', author: 'E. Joseph Cossman' },
  { text: '"As the night gets dark, let your worries fade. Sleep peacefully." 💤', author: 'Unknown' },

  // — Lucu & Santai —
  { text: '"Selamat malam! Tolong matiin gadget lo dan istirahat. Bot ini pun butuh tidur." 😂', author: 'Unknown' },
  { text: '"Malam ini misinya satu: tidur tepat waktu. Besok baru drama lagi." 😅', author: 'Unknown' },
  { text: '"Good night! Jangan lupa charge HP — dan diri lo sendiri." 🔋', author: 'Unknown' },
  { text: '"Kalau bisa tidur 8 jam tapi milih scrolling sampai subuh... itu masalah lo bukan masalah saya." 😭', author: 'Unknown' },
  { text: '"Malam ini skip doomscrolling, langsung tidur. Trust me, berita besok masih ada." 📱', author: 'Unknown' },
  { text: '"Selamat malam! Semoga mimpi lo lebih indah dari FYP lo malam ini." 🛏️', author: 'Unknown' },
  { text: '"Reminder: waktu tidur bukan buang-buang waktu. Itu namanya self-care." 💆', author: 'Unknown' },
  { text: '"Hari udah kelar. Lo udah survive. Itu cukup hebat." 🎖️', author: 'Unknown' },
  { text: '"Begadang tidak akan menyelesaikan masalah, kecuali masalah lo adalah ingin ngantuk di siang hari." 🦉', author: 'Unknown' },
  { text: '"Mimpi indah itu gratis, jadi mimpilah setinggi langit. Kalau jatuh kan cuma di kasur." 🛏️', author: 'Unknown' },
  { text: '"Tidurlah. Besok pagi musuh lo (alarm) sudah bersiap-siap untuk berteriak." ⏰', author: 'Unknown' },
  { text: '"Selamat malam! Semoga besok kuota internet lo bertambah secara ajaib." 🌐', author: 'Unknown' },
  { text: '"Tidur sekarang, karena bermimpi kaya raya itu lebih gampang daripada nyari duit beneran." 💸', author: 'Unknown' },
  { text: '"Malam telah tiba, singkirkan beban pikiran, mari kita selimutan." 🛌', author: 'Unknown' },
  { text: '"Kasur lo kangen tuh, jangan diduain sama HP mulu." 📱', author: 'Unknown' },
  { text: '"Selamat malam buat lo yang masih nungguin chat yang nggak kunjung dibales." 💔', author: 'Unknown' },
];

const NIGHT_GREETINGS = [
  '🌙 **Selamat malam, gaes!** Gimana hari ini? Semoga seru dan produktif ya~',
  '🌛 **Good night, geng!** Udah waktunya istirahat nih, jangan begadang mulu!',
  '⭐ **Selamat malam semuanya!** Semoga hari ini menyenangkan dan penuh hal positif!',
  '🌃 **Malam malam~** Jangan lupa istirahat ya, besok masih ada hari baru!',
  '😴 **Selamat malam!** Udah saatnya rebahan dan charging diri buat besok!',
  '🌌 **Good night, squad!** Semoga mimpi kalian indah dan penuh keseruan~',
  '🕯️ **Malam udah dateng~** Yuk tutup hari ini dengan hal-hal yang bikin lo bersyukur!',
  '🌠 **Selamat malam, warga server!** Terima kasih udah meramaikan hari ini!',
  '🛌 **Night night, fam!** Jangan lupa lepas semua beban hari ini sebelum tidur ya~',
  '🌙 **Selamat istirahat, guys!** Lo udah kerja keras hari ini — lo layak tidur nyenyak!',
  '💤 **Malam, geng!** Reminder: tidur cukup itu penting buat kesehatan lo!',
  '🌟 **Good night everyone!** Besok adalah hari baru — simpan energi terbaik lo!',
  '🦉 **Selamat malam!** Kalau masih melek, at least jangan scroll sendirian — share ke chat!',
  '🌑 **Malam~** Apapun yang terjadi hari ini, lo udah lakuin yang terbaik. Bangga sama lo!',
  '🎇 **Selamat malam, bestie!** Tutup hari ini dengan senyum dan rasa syukur ya!',
  '🌜 **Halo gengs malam!** Rehat dulu yuk, simpan semua urusan kerjaan/tugas buat besok!',
  '✨ **Good night, warga Discord!** Dingin-dingin gini enaknya langsung tarik selimut sih.',
  '🦉 **Malam para kalong server!** Meskipun malam adalah dunia kalian, tetep jangan lupa merem ya.',
  '🍵 **Malam semuanya!** Semoga malam ini memberikan ketenangan yang luar biasa buat kalian.',
  '💤 **Heii kawan!** Matikan layarmu, pejamkan matamu, dan rasakan kehangatan kasurmu.',
  '🛌 **Heyy, selamat tidur!** Semoga mimpi kalian malam ini sangat indah sampai malas bangun.',
  '🌙 **Selamat malam bestie-bestieku!** Terima kasih buat tawa dan ceritanya hari ini.',
  '🌌 **Malam guys!** Langit malam ini indah banget, seindah tidur nyenyak tanpa gangguan.',
  '🌛 **Selamat tidur semuanya!** Besok kita bangun dengan senyuman baru, oke?',
  '⭐ **Night night!** Semoga malaikat tidur menjagamu malam ini. Sleep well!',
  '🌈 **Malam warga!** Tutup bukumu, matikan tokomu, saatnya istirahat malam ini.',
  '😴 **Selamat tidur para pejuang!** Lelah hari ini akan terbayar dengan segar esok pagi.',
  '🌃 **Selamat istirahat semuanya!** Lepaskan semua kepenatan, mari kita tenggelam dalam mimpi.',
  '🕯️ **Malam gaes!** Jangan lupa matikan lampu biar tidurnya makin nyenyak dan rileks.',
  '🌠 **Good night everyone!** Waktunya mengistirahatkan tubuh dan pikiranmu yang hebat itu.',
];

// ================================
// Callout lucu buat yang belum tidur
// ================================
const SLEEP_CALLOUTS = [
  // Gamer
  '🎮 **Buat yang lagi gaming:** "One more game" lo udah ke-47 kali. Matiin konsol/PC lo sekarang juga, champ.',
  '🎮 **Gamer gang:** Server bisa nunggu, rank bisa nunggu. Mata lo nggak bisa. LOG OUT SEKARANG.',
  '🎮 **Buat yang lagi ranked:** Kalah? Tidur. Menang? Tetap tidur. Besok main lagi dengan kepala segar.',
  '🎮 **Oi gamer!** Lo tau nggak, tidur itu kayak save game. Kalau lo nggak save, progress lo ilang semua besok.',
  '🎮 **Buat yang "bentar lagi boss mati":** Bro, boss itu respawn. Tidur lo nggak. Pergi tidur.',
  '🎮 **Mobile legend / Valorant gang:** Toksik di game boleh, tapi jangan toksik sama kesehatan lo sendiri. Tidur gih.',

  // Nugas / Mahasiswa
  '📚 **Buat yang nugas:** Deadline jam 8 pagi itu masih bisa dikerjain jam 6 pagi. Tapi sekarang? Tidur dulu 4 jam masih menang.',
  '📚 **Mahasiswa mode aktif:** Nugas sambil rebahan di kasur = tidur nggak sengaja dalam 10 menit. Lo tau itu. Aku tau itu. Tidur aja.',
  '📚 **Pejuang tugas:** Otak yang lelah itu kayak laptop 2% baterai. Nggak ada yang bisa dikerjain dengan bener. Charge dulu.',
  '📚 **Buat yang zoom-in ke materi:** Kalau lo udah baca kalimat yang sama 5 kali dan tetep nggak ngerti — tandanya otak lo minta istirahat.',
  '📚 **Skripsi gang:** Bab 3 bisa dikerjain besok. Lingkaran hitam di bawah mata lo nggak bisa ditutup besok. Tidur sekarang.',

  // Gibah / Scroll medsos
  '📱 **Buat yang lagi scroll TikTok/IG:** Lo udah masuk FYP jam 3 pagi. Konten yang lo tonton sekarang bukan untuk manusia — itu untuk zombie. TUTUP HP.',
  '🗣️ **Gossip gang:** Gibah yang lo lakuin malem ini bisa dilanjut besok. Orang yang lo gibah juga udah tidur btw.',
  '📱 **Buat yang lagi doomscrolling:** Lo lagi baca berita jam segini? Dunia tetap kacau besok pagi. Informasi itu bisa nunggu, tidur lo nggak.',
  '🗣️ **Gibah squad:** Update drama server bisa lo cek besok. Sekarang tutup Discord dan tidur. *ini bukan request, ini perintah.*',
  '📱 **Buat yang stalking seseorang:** HENTIKAN. Tidur. Besok stalking lagi boleh. (Jangan sih tapi)',

  // Ngoding
  '💻 **Buat yang ngoding:** Bug itu nggak akan kelar kalau lo capek. Tidur, besok lo liat kodenya dan langsung nemu masalahnya dalam 5 menit.',
  '💻 **Developer gang:** "Just one more feature" = 3 jam ngulik stackoverflow. Lo tau itu. Commit dulu, push, terus tidur.',
  '💻 **Coder yang lagi error:** Error 500 jam segini? Itu bukan masalah kodenya — itu masalah lo yang kurang tidur. Git stash, tidur.',
  '💻 **Buat yang debug sampai malam:** Otak manusia itu bukan compiler. Ada batas prosesnya. Matiin laptop, tidur, besok fresh.',
  '💻 **Stack overflow reader:** Kalau lo udah scroll 10 halaman SO dan belum ketemu jawaban, itu tanda dari alam: TIDUR.',

  // Nonton / Streaming
  '🎬 **Buat yang nonton Netflix/film:** "Episode terakhir" itu bohong. Lo udah bilang itu 5 episode yang lalu. MATIKAN.',
  '🎬 **Anime/series gang:** Cliffhanger itu memang didesain buat bikin lo nggak bisa stop. Tapi lo lebih kuat dari itu. Pause. Tidur.',
  '🎬 **Buat yang marathon film:** Lo lagi di season 3 jam 2 pagi? Karakter fiktif itu nggak butuh lo. Tapi badan lo butuh tidur.',

  // Random / General
  '😴 **Buat yang masih melek nggak jelas:** Lo nggak tau mau ngapain tapi nggak bisa tidur juga? Itu namanya overtired. Matiin layar, pejamkan mata.',
  '🌙 **Buat yang "nggak ngantuk":** Lo nggak ngantuk karena paparan cahaya HP bikin otak lo mikir masih siang. Matiin HP 15 menit, dijamin ngantuk.',
  '😂 **Buat siapapun yang baca ini jam 12+:** Hai. Kamu tau kamu harusnya udah tidur. Aku tau kamu tau. Sekarang pergi tidur.',
  '🦥 **Untuk semua warga malam:** Lo semua pada sama aja. Nggak ada yang mau tidur tapi semua capek. Solusinya satu: TIDUR.',
];

const { EmbedBuilder } = require('discord.js');

/**
 * Membangun payload pesan selamat malam
 * @param {import('discord.js').Guild} guild
 * @returns {{ content: string, embeds: EmbedBuilder[] }}
 */
function buildNightMessage(guild) {
  const randomGreeting = NIGHT_GREETINGS[Math.floor(Math.random() * NIGHT_GREETINGS.length)];
  const randomQuote = NIGHT_QUOTES[Math.floor(Math.random() * NIGHT_QUOTES.length)];

  // Warna gelap elegan untuk malam hari
  const nightColors = [0x2C2F33, 0x3B4270, 0x4B3F72, 0x1A1A2E, 0x16213E];
  const randomColor = nightColors[Math.floor(Math.random() * nightColors.length)];

  const randomCallout = SLEEP_CALLOUTS[Math.floor(Math.random() * SLEEP_CALLOUTS.length)];

  const nightEmbed = new EmbedBuilder()
    .setColor(randomColor)
    .setTitle('🌙 Selamat Malam, Warga Server!')
    .setDescription(
      `${randomGreeting}\n\n` +
      `> ${randomQuote.text}\n` +
      `> — *${randomQuote.author}*\n\n` +
      `Jangan lupa istirahat ya~ Besok kita ketemu lagi dengan semangat baru! 🌅\n` +
      `*And then ALWAYS NAFAS MANUAL YAGESYA :v*`
    )
    .addFields({
      name: '😴 Pesan Khusus Buat Lo Yang Masih Melek:',
      value: randomCallout,
    })
    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
    .setFooter({
      text: `${guild.name} • Sweet dreams! 🌙`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined,
    })
    .setTimestamp();

  const content = `<@&1396396538686607410> 🌙 **Selamat malam, geng!** Saatnya istirahat~`;

  return { content, embeds: [nightEmbed] };
}

module.exports = { buildNightMessage, NIGHT_QUOTES, NIGHT_GREETINGS, SLEEP_CALLOUTS };
