const { EmbedBuilder } = require('discord.js');

// ================================
// Kumpulan quotes inspiratif random
// ================================
const MORNING_QUOTES = [
  // — Inspiratif Indo —
  { text: '"Setiap pagi adalah kesempatan baru buat jadi versi terbaik diri lo." 🌟', author: 'Unknown' },
  { text: '"Jangan bandingkan perjalanan lo sama orang lain. Lo punya timeline sendiri." 🗺️', author: 'Unknown' },
  { text: '"Pagi hari adalah investasi terbaik. Modal cuma semangat, hasilnya seharian penuh." 🌄', author: 'Unknown' },
  { text: '"Jangan tunggu sempurna dulu baru mulai. Mulai dulu, sempurnain di jalan." 🛤️', author: 'Unknown' },
  { text: '"Pagi tanpa semangat itu kayak HP tanpa baterai — nggak bisa ngapa-ngapain." 😄', author: 'Unknown' },
  { text: '"Hari ini mungkin berat, tapi lo lebih berat dari hari ini." 💥', author: 'Unknown' },
  { text: '"Mulai hari ini dengan senyum. Karena attitude lo hari ini nentuin hari lo." 😊', author: 'Unknown' },
  { text: '"Kadang lo perlu remind diri sendiri: lo udah sejauh ini, jangan nyerah sekarang." 🏃', author: 'Unknown' },
  { text: '"Fokus ke progress, bukan perfection." 🎯', author: 'Unknown' },
  { text: '"Setiap hari adalah hadiah. Cara lo pakainya adalah pilihanmu." 🎁', author: 'Unknown' },
  { text: '"Hidup itu kayak kopi — mau nikmat atau pahit, tergantung cara lo bikinnya." ☕', author: 'Unknown' },
  { text: '"Lo nggak perlu jadi hebat dulu buat mulai. Tapi lo harus mulai buat jadi hebat." 🔥', author: 'Zig Ziglar' },
  { text: '"Jangan takut gagal. Yang perlu ditakutin itu nggak pernah nyoba." 🎲', author: 'Unknown' },
  { text: '"Semangat itu bukan perasaan, tapi keputusan." ⚡', author: 'Unknown' },
  { text: '"Lo mungkin lambat, tapi selama lo tetap jalan — lo masih menang." 🐢', author: 'Unknown' },
  { text: '"Rezeki nggak akan ketukar. Yang penting lo usaha dan berdoa." 🙏', author: 'Unknown' },
  { text: '"Cara terbaik buat mulai adalah berhenti ngomong dan mulai lakuin." 💬', author: 'Walt Disney' },
  { text: '"Lo adalah produk dari pilihan-pilihan lo, bukan kondisi lo." 🧩', author: 'Stephen Covey' },
  { text: '"Setiap orang punya fase low-nya sendiri. Yang penting jangan stay di sana." 🔋', author: 'Unknown' },
  { text: '"Bangun pagi bukan soal jam, tapi soal niat buat bikin hari ini berarti." ⏰', author: 'Unknown' },
  { text: '"Keberhasilan bukan milik orang yang nggak pernah gagal. Tapi milik yang nggak nyerah." 🏆', author: 'Unknown' },
  { text: '"Nggak ada yang sia-sia kalau lo belajar dari setiap prosesnya." 📚', author: 'Unknown' },
  { text: '"Lo bisa capek, tapi jangan nyerah." 🌙', author: 'Unknown' },
  { text: '"Yang bikin lo stuck itu bukan situasinya, tapi cara lo ngeliatnya." 🔭', author: 'Unknown' },
  { text: '"Besok yang lebih baik dimulai dari hari ini yang lo jalanin dengan sepenuh hati." 🌱', author: 'Unknown' },
  { text: '"Percaya sama proses. Semua yang worth it butuh waktu." ⏳', author: 'Unknown' },
  { text: '"Bukan soal seberapa keras lo jatuh, tapi seberapa cepat lo bangkit." 🦅', author: 'Unknown' },
  { text: '"Doa yang paling didengar adalah doa yang disertai usaha." 🤲', author: 'Unknown' },
  { text: '"Versi terbaik lo sedang dalam proses. Sabar aja." 🦋', author: 'Unknown' },
  { text: '"Kalau hari ini susah, inget kenapa lo mulai." 🔑', author: 'Unknown' },

  // — Inspiratif English —
  { text: '"Every morning is a new beginning. Take a deep breath and start again." ✨', author: 'Unknown' },
  { text: '"The secret of getting ahead is getting started." 🚀', author: 'Mark Twain' },
  { text: '"Wake up with determination. Go to bed with satisfaction." 💪', author: 'Unknown' },
  { text: '"Do what you can, with what you have, where you are." ⚡', author: 'Theodore Roosevelt' },
  { text: '"Success is not final, failure is not fatal: it is the courage to continue that counts." 🏆', author: 'Winston Churchill' },
  { text: '"Be the energy you want to attract." 🌈', author: 'Unknown' },
  { text: '"You are braver than you believe, stronger than you seem, and smarter than you think." 🦁', author: 'A.A. Milne' },
  { text: '"It always seems impossible until it\'s done." 🌙', author: 'Nelson Mandela' },
  { text: '"Small steps every day lead to big changes over time. Keep going!" 👣', author: 'Unknown' },
  { text: '"Dream big, work hard, stay focused, and surround yourself with good people." ⭐', author: 'Unknown' },
  { text: '"The only way to do great work is to love what you do." ❤️', author: 'Steve Jobs' },
  { text: '"Rise and shine! The world needs your light today." ☀️', author: 'Unknown' },
  { text: '"Believe you can and you\'re halfway there." 🌠', author: 'Theodore Roosevelt' },
  { text: '"Your only limit is your mind." 🧠', author: 'Unknown' },
  { text: '"Push yourself, because no one else is going to do it for you." 💥', author: 'Unknown' },
  { text: '"Great things never come from comfort zones." 🌊', author: 'Unknown' },
  { text: '"Work hard in silence. Let success make the noise." 🔇', author: 'Unknown' },
  { text: '"Don\'t stop when you\'re tired. Stop when you\'re done." 🏁', author: 'Unknown' },
  { text: '"The harder you work for something, the greater you\'ll feel when you achieve it." 🎖️', author: 'Unknown' },
  { text: '"You don\'t have to be great to start, but you have to start to be great." ✅', author: 'Zig Ziglar' },
  { text: '"A little progress each day adds up to big results." 📊', author: 'Unknown' },
  { text: '"Be so good they can\'t ignore you." 👑', author: 'Steve Martin' },
  { text: '"The future belongs to those who believe in the beauty of their dreams." 🌙', author: 'Eleanor Roosevelt' },
  { text: '"It\'s okay to not be okay. Just don\'t give up." 💙', author: 'Unknown' },
  { text: '"Difficult roads often lead to beautiful destinations." 🏔️', author: 'Unknown' },
  { text: '"You are enough. You have always been enough." 💛', author: 'Unknown' },
  { text: '"Sometimes the smallest step in the right direction ends up being the biggest step of your life." 🦶', author: 'Unknown' },
  { text: '"Don\'t watch the clock; do what it does. Keep going." ⏰', author: 'Sam Levenson' },
  { text: '"Act as if what you do makes a difference. It does." 🌍', author: 'William James' },
  { text: '"What you get by achieving your goals is not as important as what you become." 🌿', author: 'Henry David Thoreau' },

  // — Santai & Lucu —
  { text: '"Bangun pagi itu susah, tapi lebih susah nyesel nggak ngapa-ngapain seharian." 😤', author: 'Unknown' },
  { text: '"Semangat dulu, capeknya nanti. Nangisnya minggu depan." 😂', author: 'Unknown' },
  { text: '"Hari ini gak harus sempurna. Yang penting lo gerak." 🚶', author: 'Unknown' },
  { text: '"Kalau capek, istirahat. Tapi kalau nyerah, beda cerita." 🛋️', author: 'Unknown' },
  { text: '"Pagi ini lo bangun — itu aja udah achievement." 🏅', author: 'Unknown' },
  { text: '"Nggak ada ruginya jadi baik. Jadi, jangan pelit senyum hari ini!" 😁', author: 'Unknown' },
  { text: '"Hari ini misinya: jangan jadi versi kemarin lo." 🎮', author: 'Unknown' },
  { text: '"Mode: ON. Semangat: PENUH. Excuses: DELETE." 🗑️', author: 'Unknown' },
  { text: '"Inget, WiFi aja reload. Masa lo nggak bisa reset mood?" 📡', author: 'Unknown' },
  { text: '"Senyum dulu, drama belakangan." 😅', author: 'Unknown' },
  { text: '"Lo lebih kuat dari yang lo kira, bahkan waktu lo ngerasa paling lemah." 💫', author: 'Unknown' },
  { text: '"Jangan lupa: lo itu manusia, bukan robot. Boleh rehat, boleh ngerasa." 🤗', author: 'Unknown' },
  { text: '"Good morning! Selamat berjuang melawan alarm kedua." ⏰😂', author: 'Unknown' },
  { text: '"Setiap orang sukses pernah ada di titik lo sekarang. Bedanya mereka lanjut." 🛤️', author: 'Unknown' },
  { text: '"Jangan terlalu keras sama diri sendiri. Peluk diri lo dulu, baru gas!" 🤍', author: 'Unknown' },
];

// ================================
// Kumpulan sapaan selamat pagi random
// ================================
const MORNING_GREETINGS = [
  '☀️ **Selamat pagi, gaes!** Udah pada melek semua nih?',
  '🌅 **Good morning, everyone!** Semangat ya buat hari ini~',
  '🌄 **Pagi pagi ceria, gaes!** Jangan lupa sarapan sebelum aktivitas ya!',
  '☕ **Selamat pagi!** Udah pada minum kopi/teh belum? Biar semangat!',
  '🌞 **Rise and shine, geng!** Hari baru, energy baru, semangat baru!',
  '🦅 **Selamat pagi, warga server!** Siap gas hari ini?',
  '🌻 **Ohayou gozaimasu! (Selamat pagi!)** Semoga hari lo penuh hal positif ya~',
  '🎯 **Morning everyone!** Yuk mulai hari ini dengan produktif!',
  '💫 **Selamat pagi semuanya!** Jaga mood, jaga kesehatan, jaga semangat!',
  '🔥 **Pagi, squad!** It\'s a brand new day — make it count!',
  '🍀 **Good morning, bestie!** Semoga hari ini bawa keberuntungan buat kalian semua~',
  '🌈 **Selamat pagi!** Apapun yang lo hadapi hari ini, yakin lo bisa!',
  '🎵 **Pagi pagi, geng!** Yuk pasang playlist semangat dan gasss~',
  '🌸 **Selamat pagi!** Hari baru, peluang baru. Jangan sia-siainn ya!',
  '🚀 **Good morning, warga!** Jangan lupa sarapan — perut kosong bikin mood zonk~',
  '🌊 **Selamat pagi, guys!** Apapun badai yang datang hari ini, lo bisa lewatin!',
  '🎉 **Morning vibes!** Semoga hari lo hari ini penuh hal-hal yang bikin senyum~',
  '🦋 **Selamat pagi!** Ingat, lo udah survive semua hari buruk sebelumnya. Hari ini pasti bisa juga!',
  '💡 **Pagi, gaes!** Satu langkah kecil hari ini lebih baik dari nggak gerak sama sekali!',
  '🌙➡️☀️ **Selamat pagi!** Malam udah berlalu, waktunya nulis cerita baru hari ini~',
  '🏆 **Good morning, champ!** Lo udah menang cuma dengan bangun hari ini. Keep going!',
  '🎮 **Selamat pagi, players!** Hari ini server realita lagi online — siap main?',
  '🍵 **Morning!** Ambil napas dalam-dalam dulu. Oke, sekarang siap gas!',
  '🌺 **Selamat pagi, fam!** Spread positivity hari ini ya, dunia butuh vibes lo!',
  '⚡ **Pagi pagi~** Charge semangat lo full dulu sebelum mulai aktivitas!',
  '🤝 **Good morning!** Semoga lo bisa jadi alasan seseorang senyum hari ini~',
  '🦁 **Selamat pagi, geng!** Hadapi hari ini dengan berani. Lo bisa!',
  '🎶 **Morning everyone!** Jangan lupa: senyum itu gratis, jadi jangan pelit!',
  '🌿 **Selamat pagi!** Tarik napas, buang stres, gaskeun hari ini dengan santuy~',
  '🔮 **Good morning!** Lo nggak tau hari ini bakal sebagus apa kalo nggak dicoba~',
];


/**
 * Membangun payload pesan selamat pagi + reminder rules
 * @param {import('discord.js').Guild} guild
 * @returns {{ content: string, embeds: EmbedBuilder[] }}
 */
function buildMorningMessage(guild) {
  const randomGreeting = MORNING_GREETINGS[Math.floor(Math.random() * MORNING_GREETINGS.length)];
  const randomQuote = MORNING_QUOTES[Math.floor(Math.random() * MORNING_QUOTES.length)];

  // Warna gradient hangat untuk pagi hari
  const morningColors = [0xFFD93D, 0xFFB347, 0xFF8C42, 0xFFA07A, 0xFFCC44];
  const randomColor = morningColors[Math.floor(Math.random() * morningColors.length)];

  // =====================
  // Embed 1: Selamat Pagi
  // =====================
  const morningEmbed = new EmbedBuilder()
    .setColor(randomColor)
    .setTitle('🌅 Selamat Pagi, Warga Server!')
    .setDescription(
      `${randomGreeting}\n\n` +
      `> ${randomQuote.text}\n` +
      `> — *${randomQuote.author}*\n\n` +
      `Mulai hari ini dengan positif dan semangat ya~ Jangan lupa makan, minum air, dan istirahat yang cukup! 🙏 \n
      And then ALWAYS NAFAS MANUAL YAGESYA :v`
    )
    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
    .setFooter({
      text: `${guild.name} • Have a great day! ✨`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined,
    })
    .setTimestamp();

  // =====================
  // Embed 2: Server Rules
  // =====================
  const rulesEmbed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📋 Daily Reminder — Server Rules')
    .setDescription(
      `Sebelum mulai aktivitas hari ini, yuk kita inget lagi rules server kita!\n` +
      `*Rules ada bukan buat ngebatasin, tapi buat ngejaga komunitas tetap nyaman buat semua.* 🤝\n\u200b`
    )
    .addFields(
      {
        name: '╔═══ 𝗦𝗘𝗥𝗩𝗘𝗥 𝗥𝗨𝗟𝗘𝗦 ═══╗',
        value: '\u200b',
      },
      {
        name: '① Respect Everyone 🤝',
        value: '> Saling menghargai dan bersikap sopan ke semua member.\n> No harassment, hate speech, atau diskriminasi dalam bentuk apapun.',
      },
      {
        name: '② Keep It Clean 🚫',
        value: '> Dilarang bagiin konten NSFW, pornografi, SARA, atau rasisme.\n> Berlaku di text channel, voice channel, username, nickname, dan avatar.',
      },
      {
        name: '③ No External Links 🔗',
        value: '> Dilarang ngirim invite/link Discord server lain.\n> No promo tanpa izin admin ya, guys!',
      },
      {
        name: '④ Keep It Chill 😎',
        value: '> Dilarang ganggu, provokasi, atau bikin suasana toxic.\n> Jaga vibes tetap santai & positif — no drama please!',
      },
      {
        name: '⑤ No Spam 🤐',
        value: '> Dilarang spam chat, emoji berlebihan, atau flood message.\n> Kalau ngak, nanti dihitamkan doksli ya~ 👀',
      },
      {
        name: '⑥ Use Channels Wisely 📌',
        value: '> Gunakan text dan voice channel sesuai fungsinya.\n> Baca deskripsi channel buat tau channelnya buat apa.',
      },
      {
        name: '⑦ Follow The Staff 👮',
        value: '> Dengerin arahan admin & moderator.\n> Jangan debat rules di chat umum — kalau ada masalah, DM staff.',
      },
      {
        name: '⑧ Be Yourself 🌟',
        value: '> Bebas berekspresi asal tetap sopan dan positif.\n> Don\'t cross the line — inget, ada orang lain yang ngerasa juga.',
      },
      {
        name: '╚══════════════════╝',
        value: '\u200b',
      },
      {
        name: '⚠️ Sanksi Pelanggaran',
        value: '> Pelanggaran rules akan dikenakan: **Warn → Mute → Timeout → Kick → Ban**\n\n' +
               '> 📌 **Sistem Warn:**\n' +
               '> • **3x Warn** → Mute 3 jam\n' +
               '> • **5x Warn** → Kick\n' +
               '> • **8x Warn** → Permanent Ban 🔨',
      },
    )
    .setFooter({
      text: '🚀 Break the rules = Get punished. Stay cool & enjoy the server!',
    });

  const content = `<@&438949811408863243> ☀️ **Selamat pagi, geng!** Jangan lupa baca reminder rules hari ini ya~`;

  return { content, embeds: [morningEmbed, rulesEmbed] };
}

module.exports = { buildMorningMessage, MORNING_QUOTES, MORNING_GREETINGS };
