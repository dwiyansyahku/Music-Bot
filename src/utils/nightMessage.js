// ================================
// Kumpulan quotes dan sapaan untuk MALAM HARI
// ================================

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

  // — Lucu & Santai —
  { text: '"Selamat malam! Tolong matiin gadget lo dan istirahat. Bot ini pun butuh tidur." 😂', author: 'Unknown' },
  { text: '"Malam ini misinya satu: tidur tepat waktu. Besok baru drama lagi." 😅', author: 'Unknown' },
  { text: '"Good night! Jangan lupa charge HP — dan diri lo sendiri." 🔋', author: 'Unknown' },
  { text: '"Kalau bisa tidur 8 jam tapi milih scrolling sampai subuh... itu masalah lo bukan masalah saya." 😭', author: 'Unknown' },
  { text: '"Malam ini skip doomscrolling, langsung tidur. Trust me, berita besok masih ada." 📱', author: 'Unknown' },
  { text: '"Selamat malam! Semoga mimpi lo lebih indah dari FYP lo malam ini." 🛏️', author: 'Unknown' },
  { text: '"Reminder: waktu tidur bukan buang-buang waktu. Itu namanya self-care." 💆', author: 'Unknown' },
  { text: '"Hari udah kelar. Lo udah survive. Itu cukup hebat." 🎖️', author: 'Unknown' },
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
    .setThumbnail(guild.iconURL({ dynamic: true }) || null)
    .setFooter({
      text: `${guild.name} • Sweet dreams! 🌙`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined,
    })
    .setTimestamp();

  const content = `<@&1396396538686607410> 🌙 **Selamat malam, geng!** Saatnya istirahat~`;

  return { content, embeds: [nightEmbed] };
}

module.exports = { buildNightMessage, NIGHT_QUOTES, NIGHT_GREETINGS };
