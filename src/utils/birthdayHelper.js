const { EmbedBuilder } = require('discord.js');

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_NAMES_SHORT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * 50+ Variasi Kalimat Ucapan Selamat Ulang Tahun (Hangat, Seru, Kocak, Bestie Discord)
 */
const BIRTHDAY_WISHES = [
  (name, age) => `🎂 **HAPPY BIRTHDAY ${name.toUpperCase()}!** ${age ? `Selamat menginjak usia yang ke-${age} tahun! ` : ''}Semoga panjang umur, sehat selalu, dan semua impianmu tercapai! 🎉✨`,
  (name, age) => `🥳 **SELAMAT ULANG TAHUN ${name}!** ${age ? `Resmi berumur ${age} tahun nih! ` : ''}Semoga rezekinya seluas samudra dan harimu penuh kebahagiaan! 🌟💫`,
  (name, age) => `🎁 **Aaaak ada yang ulang tahun hari ini!! Happy Birthday ${name}!** ${age ? `Udah ${age} tahun aja nih sepuh! ` : ''}Traktirannya ditunggu yaa di tongkrongan! 🍕🥤`,
  (name, age) => `🎊 **Happy Birthday ${name}!** ${age ? `Usia ${age} tahun ` : ''}semoga makin berkah, makin sukses, makin glowing, dan dijauhkan dari segala drama! 💖🌈`,
  (name, age) => `🍰 **Tiup lilinnya, potong kuenya! Happy Birthday ${name}!** ${age ? `Selamat berumur ${age} tahun! ` : ''}Semoga hari ini jadi awal dari tahun terbaik dalam hidupmu! 🕯️🎈`,
  (name, age) => `👑 **Hari ini panggung milik ${name}!** Happy Birthday yang ke-${age || 'spesial'}! Tetap jadi sosok yang seru, asik, dan kebanggaan server kita! 🔥🏆`,
  (name, age) => `🎈 **Happy level up day, ${name}!** ${age ? `Level ${age} unlocked! ` : ''}Semoga makin jago di game, makin gacor di real life, dan makin disayang semua orang! 🎮👾`,
  (name, age) => `🌟 **Happy Birthday bestie ${name}!** ${age ? `Genap ${age} tahun nih! ` : ''}Terima kasih udah selalu ada dan ngeramein hari-hari kita. You're the best! 🥂✨`,
  (name, age) => `🔥 **Happy Birthday ${name}!** ${age ? `Umur ${age} tahun ` : ''}semoga dompet makin tebal, tagihan makin tipis, dan jodoh makin mendekat! 💸😎`,
  (name, age) => `🦖 **Happy Birthday ${name}!** Makin tua nih, tapi tenang... semakin tua semakin mahal kayak barang antik! Stay awesome! 🤣🎉`,
  (name, age) => `💫 **Selamat hari lahir ${name}!** ${age ? `Selamat menyambut usia ${age} tahun! ` : ''}Semoga setiap langkahmu dipenuhi keberuntungan dan kebahagiaan tak terhingga! 🍀🌻`,
  (name, age) => `🚀 **Happy Birthday ${name}!** Semoga karir, studi, dan cita-citamu melesat tinggi kayak roket ke bulan! 🌕✨`,
  (name, age) => `🎂 **Happy Birthday buat salah satu member terkeren kita, ${name}!** ${age ? `Selamat ultah ke-${age}! ` : ''}Jangan lupa bersyukur dan makan enak hari ini! 🍜🍖`,
  (name, age) => `☕ **Happy Birthday ${name}!** Santai dulu sejenak nikmati hari spesialmu. Semoga segala urusanmu dimudahkan dan harimu selalu cerah! ☀️🌻`,
  (name, age) => `🍿 **Selamat ulang tahun ${name}!** ${age ? `Udah umur ${age} nih, ` : ''}semoga kebiasaan begadangnya berkurang tapi rezekinya bertambah banyak! 😂🎉`,
  (name, age) => `💎 **Happy Birthday ${name}!** Kamu adalah permata berharga di server ini. Semoga harimu semanis kue ulang tahun dan seindah pelangi! 🌈🍰`,
  (name, age) => `🎸 **Rock n roll! Happy Birthday ${name}!** ${age ? `Usia ${age} ` : ''}bukan halangan buat tetap berjiwa muda dan heboh di voice channel! Gaskeun! 🎶🔊`,
  (name, age) => `🌺 **Selamat Ulang Tahun ${name}!** Semoga selalu dikelilingi orang-orang yang tulus menyayangimu dan selalu bahagia lahir batin! 💐💕`,
  (name, age) => `🎉 **Happy Birthday ${name}!** ${age ? `Umur ${age} tahun ` : ''}wajib makan enak! Jangan lupa traktir bakso, seblak, atau kopi buat anak-anak server ya! 🍲☕`,
  (name, age) => `🎯 **Happy Birthday ${name}!** Semoga semua resolusi dan target hidupmu di tahun ini tercapai dengan mulus tanpa hambatan! 🏹🏆`,
  (name, age) => `🕯️ **Selamat Ulang Tahun ${name}!** Make a wish, tiup lilinnya, dan semoga semesta mengabulkan doa-doa terbaikmu hari ini! 🎂✨`,
  (name, age) => `🦄 **Happy Birthday ${name}!** Semoga harimu penuh keajaiban, tawa canda, dan kejutan manis dari orang-orang tersayang! 🎁💖`,
  (name, age) => `🌴 **Happy Birthday ${name}!** Tetap santai, tetap keren, dan nikmati setiap detik di hari kelahiranmu yang istimewa ini! 🍹🏖️`,
  (name, age) => `🤖 **BEEP BOOP! Happy Birthday ${name}!** Sistem bot mendeteksi 100% tingkat kebahagiaan hari ini khusus untukmu! 🎊🤖`,
  (name, age) => `🍦 **Happy Sweet Birthday ${name}!** Semoga hidupmu selalu manis dan harimu penuh warna-warni kebahagiaan! 🍭🍧`,
  (name, age) => `⚡ **Selamat bertambah umur ${name}!** ${age ? `Usia ${age} tahun! ` : ''}Semoga energimu selalu membara dan semangatmu pantang padam! 💥⚡`,
  (name, age) => `🍩 **Happy Birthday ${name}!** Donat aja manis, apalagi senyumanmu di hari ulang tahun ini. Have a wonderful day! 🍩🥳`,
  (name, age) => `🛡️ **Happy Birthday sang pejuang hidup, ${name}!** ${age ? `Keren udah bertahan sampai usia ${age} tahun! ` : ''}Masa depan cerah menantimu! ⚔️🏰`,
  (name, age) => `🌻 **Happy Birthday ${name}!** Seperti bunga matahari yang selalu menghadap cahaya, semoga hidupmu selalu menuju kebaikan dan keberhasilan! 🌻🌞`,
  (name, age) => `🥂 **Cheers to another year of greatness, ${name}!** ${age ? `Selamat ulang tahun ke-${age}! ` : ''}Semoga sehat sentosa dan panjang umur! 🍾🎉`,
  (name, age) => `🐱 **Meow! Happy Birthday ${name}!** Kucing-kucing sedunia ikut bersorak merayakan hari lahirmu yang luar biasa ini! 🐾😻`,
  (name, age) => `🌊 **Happy Birthday ${name}!** Semoga rezekimu mengalir deras tanpa henti seperti air terjun yang megah! 🌊💎`,
  (name, age) => `🏆 **Happy Birthday sang juara, ${name}!** ${age ? `Usia ${age} ` : ''}adalah langkah baru menuju pencapaian-pencapaian spektakuler lainnya! 🥇🌟`,
  (name, age) => `🎪 **Satu server heboh nih! Happy Birthday ${name}!** Ayo kawan-kawan kirim ucapan dan doa terbaik buat bestie kita ini! 🥳📣`,
  (name, age) => `✨ **Happy Birthday ${name}!** Semoga harimu sehangat pelukan sahabat dan secerah mentari pagi! ☀️🌸`,
  (name, age) => `🎮 **GG WP! Happy Birthday ${name}!** Selamat menyelesaikan 1 tahun perjalanan hidup dan siap memulai chapter baru yang lebih seru! 🕹️🏆`,
  (name, age) => `🍕 **Happy Birthday ${name}!** Satu loyang pizza kebahagiaan siap dikirimkan untuk menemani hari ulang tahunmu! 🍕🎉`,
  (name, age) => `🎈 **Selamat Ulang Tahun ${name}!** Jangan hitung berapa lilinnya, tapi hitung berapa banyak berkah dan sahabat yang menyayangimu! 🕯️❤️`,
  (name, age) => `🍀 **Happy Lucky Birthday ${name}!** Semoga keberuntungan selalu berpihak padamu di setiap langkah dan keputusan! 🍀🌈`,
  (name, age) => `🌠 **Happy Birthday ${name}!** Bintang jatuh semalam berbisik bahwa tahun ini akan jadi tahun paling beruntung untukmu! 🌌✨`,
  (name, age) => `💖 **Selamat Ulang Tahun ${name}!** Terima kasih sudah lahir ke dunia dan menjadi sosok yang begitu berarti bagi banyak orang! 🌸💕`,
  (name, age) => `🥞 **Happy Birthday ${name}!** Tumpukan kebahagiaan dan tawa siap menyambutmu di umur yang baru ini! 🥞🍓`,
  (name, age) => `🛸 **Happy Birthday ${name}!** Alien dari galaksi lain pun setuju kalau kamu adalah orang yang luar biasa keren! 👽🛸`,
  (name, age) => `🕊️ **Selamat Hari Lahir ${name}!** Semoga kedamaian, ketenangan, dan kesehatan selalu menyertai hari-harimu! 🕊️🌿`,
  (name, age) => `🎁 **Happy Birthday ${name}!** Buka kado terindahmu hari ini: hari baru, kesempatan baru, dan semangat baru! 🎁🎊`,
  (name, age) => `🥳 **Waktunya berpesta! Happy Birthday ${name}!** Nikmati harimu dan bersenang-senanglah sampai puas! 💃🕺🎉`,
  (name, age) => `🌻 **Happy Birthday ${name}!** ${age ? `Selamat berumur ${age} tahun! ` : ''}Semoga senantiasa dalam lindungan Tuhan dan selalu diberi kemudahan hidup! 🤲✨`,
  (name, age) => `🍉 **Segar dan manis! Happy Birthday ${name}!** Semoga hari ulang tahunmu sesegar semangka di siang hari yang terik! 🍉☀️`,
  (name, age) => `👑 **Happy Birthday King/Queen ${name}!** Kenakan mahkotamu dan pimpin tahun baru ini dengan penuh percaya diri! 👑🌟`,
  (name, age) => `🎉 **Happy Birthday ${name}!** Semoga semua doa baik yang dipanjatkan untukmu hari ini segera dikabulkan satu per satu! Aamiin! 🤲🎂`
];

/**
 * Koleksi GIF Ulang Tahun — dipilih secara random untuk setiap pengumuman
 */
const BIRTHDAY_GIFS = [
  'https://media.tenor.com/IhLBvhbS1noAAAAC/happy-birthday.gif',
  'https://media.tenor.com/zCJqmyPDl5QAAAAC/happy-birthday-birthday-cake.gif',
  'https://media.tenor.com/sM2jtbb0S2wAAAAC/happy-birthday.gif',
  'https://media.tenor.com/yRhBABTqlFMAAAAC/happy-birthday.gif',
  'https://media.tenor.com/Y3VYnRuHvJwAAAAC/happy-birthday-wishes.gif',
  'https://media.tenor.com/9kR4bWfnWZgAAAAC/happy-birthday.gif',
  'https://media.tenor.com/ygCbfMYZdv0AAAAC/hbd-happy-birthday.gif',
  'https://media.tenor.com/LiKnn8d2WQAAAAAC/happy-birthday.gif',
  'https://media.tenor.com/0VYnN4JqBN4AAAAC/birthday-happy-birthday.gif',
  'https://media.tenor.com/8kEjjxolHiMAAAAC/happy-birthday.gif',
  'https://media.tenor.com/nnBTD2T3TQUAAAAC/happy-birthday-birthday.gif',
  'https://media.tenor.com/4xpVjVYJfqgAAAAC/happy-birthday.gif',
  'https://media.tenor.com/0Cy1JOQsTC4AAAAC/happy-birthday-to-you.gif',
  'https://media.tenor.com/DLJRkh0h9fgAAAAC/happy-birthday.gif',
  'https://media.tenor.com/1Cv1_Sl7mPMAAAAC/happy-birthday.gif',
  'https://media.tenor.com/z0KjG1Y7vRkAAAAC/happy-birthday-cake.gif',
  'https://media.tenor.com/LfD4d0TksTIAAAAC/happy-birthday-birthday.gif',
  'https://media.tenor.com/7jXP1_jgMDQAAAAC/happy-birthday.gif',
  'https://media.tenor.com/3bL_ypY8DGEAAAAC/happy-birthday.gif',
  'https://media.tenor.com/cCwF85OMqPcAAAAC/happy-birthday.gif',
];

/**
 * Tentukan Zodiak berdasarkan tanggal dan bulan
 */
function getZodiac(day, month) {
  if (!day || !month) return null;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);

  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return { name: 'Aries', symbol: '♈', label: '♈ Aries' };
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return { name: 'Taurus', symbol: '♉', label: '♉ Taurus' };
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return { name: 'Gemini', symbol: '♊', label: '♊ Gemini' };
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return { name: 'Cancer', symbol: '♋', label: '♋ Cancer' };
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return { name: 'Leo', symbol: '♌', label: '♌ Leo' };
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return { name: 'Virgo', symbol: '♍', label: '♍ Virgo' };
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return { name: 'Libra', symbol: '♎', label: '♎ Libra' };
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return { name: 'Scorpio', symbol: '♏', label: '♏ Scorpio' };
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return { name: 'Sagittarius', symbol: '♐', label: '♐ Sagittarius' };
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return { name: 'Capricorn', symbol: '♑', label: '♑ Capricorn' };
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return { name: 'Aquarius', symbol: '♒', label: '♒ Aquarius' };
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return { name: 'Pisces', symbol: '♓', label: '♓ Pisces' };
  return null;
}

/**
 * Parsing input tanggal lahir yang fleksibel
 * Format yang didukung:
 * - 15-08 / 15/08 / 15.08 / 15 08
 * - 15-08-2000 / 15/08/2000 / 15.08.2000
 * - 15 Agustus 2000 / 15 Agustus / 15 Aug / 15 August 1999
 * @param {string} input
 * @returns {{ day: number, month: number, year: number|null, formatted: string, shortFormatted: string, raw: string, age: number|null } | null}
 */
function parseBirthdate(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();
  if (!clean) return null;

  let day = null;
  let month = null;
  let year = null;

  // 1. Coba format nama bulan: e.g. "15 Agustus 2000" atau "15 Agustus"
  const monthRegex = /(januari|jan|january|februari|feb|february|maret|mar|march|april|apr|mei|may|juni|jun|june|juli|jul|july|agustus|agu|aug|august|september|sep|sept|oktober|okt|oct|october|november|nov|desember|des|dec|december)/i;
  const monthMatch = clean.match(monthRegex);

  if (monthMatch) {
    const monthStr = monthMatch[1].toLowerCase();
    if (monthStr.startsWith('jan')) month = 1;
    else if (monthStr.startsWith('feb')) month = 2;
    else if (monthStr.startsWith('mar')) month = 3;
    else if (monthStr.startsWith('apr')) month = 4;
    else if (monthStr.startsWith('mei') || monthStr === 'may') month = 5;
    else if (monthStr.startsWith('jun')) month = 6;
    else if (monthStr.startsWith('jul')) month = 7;
    else if (monthStr.startsWith('ag') || monthStr.startsWith('au')) month = 8;
    else if (monthStr.startsWith('sep')) month = 9;
    else if (monthStr.startsWith('ok') || monthStr.startsWith('oc')) month = 10;
    else if (monthStr.startsWith('nov')) month = 11;
    else if (monthStr.startsWith('des') || monthStr.startsWith('dec')) month = 12;

    const numbers = clean.match(/\b\d+\b/g);
    if (numbers && numbers.length >= 1) {
      day = parseInt(numbers[0], 10);
      if (numbers.length >= 2 && numbers[1].length === 4) {
        year = parseInt(numbers[1], 10);
      }
    }
  } else {
    // 2. Coba format numerik: "DD-MM-YYYY", "DD-MM", "DD/MM/YYYY", "DD/MM", "DD.MM"
    const parts = clean.split(/[-/.\s]+/);
    if (parts.length >= 2) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);

      // Asumsi DD-MM (standard Indonesia)
      if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
        day = p1;
        month = p2;
      } else if (p2 >= 1 && p2 <= 31 && p1 >= 1 && p1 <= 12) {
        // Fallback MM-DD
        day = p2;
        month = p1;
      }

      if (parts.length >= 3) {
        const p3 = parseInt(parts[2], 10);
        if (p3 >= 1900 && p3 <= 2100) {
          year = p3;
        } else if (p3 >= 0 && p3 <= 99) {
          year = p3 > 30 ? 1900 + p3 : 2000 + p3;
        }
      }
    }
  }

  // Validasi tanggal & bulan
  if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }

  // Validasi jumlah hari per bulan
  const daysInMonth = new Date(year || 2024, month, 0).getDate();
  if (day > daysInMonth) {
    return null;
  }

  // Hitung umur saat ini jika ada tahun
  let age = null;
  if (year && year <= new Date().getFullYear()) {
    const now = new Date();
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const birthDateObj = new Date(year, month - 1, day);
    let calculatedAge = wibNow.getFullYear() - year;
    const currentMonthWib = wibNow.getMonth() + 1;
    const currentDayWib = wibNow.getDate();

    if (currentMonthWib < month || (currentMonthWib === month && currentDayWib < day)) {
      calculatedAge--;
    }
    age = Math.max(0, calculatedAge);
  }

  const formatted = year
    ? `${day} ${MONTH_NAMES[month]} ${year}`
    : `${day} ${MONTH_NAMES[month]}`;

  const shortFormatted = year
    ? `${day} ${MONTH_NAMES_SHORT[month]} ${year}`
    : `${day} ${MONTH_NAMES_SHORT[month]}`;

  return {
    day,
    month,
    year,
    formatted,
    shortFormatted,
    raw: clean,
    age
  };
}

/**
 * Hitung sisa hari menuju ulang tahun berikutnya
 */
function getNextBirthdayCountdown(day, month) {
  const now = new Date();
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const currentYear = wibNow.getFullYear();

  let nextBday = new Date(currentYear, month - 1, day);
  // Reset jam ke 00:00 untuk perbandingan hari yang akurat
  nextBday.setHours(0, 0, 0, 0);
  const todayZero = new Date(wibNow.getFullYear(), wibNow.getMonth(), wibNow.getDate(), 0, 0, 0, 0);

  if (nextBday < todayZero) {
    nextBday.setFullYear(currentYear + 1);
  }

  const diffMs = nextBday.getTime() - todayZero.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return {
    daysLeft,
    isToday: daysLeft === 0,
    nextDate: nextBday
  };
}

/**
 * Buat Embed Ucapan Ulang Tahun yang Mewah & Menarik
 */
function buildBirthdayAnnouncementEmbed(member, customWish, birthInfo, guild) {
  const user = member.user;
  const wishText = customWish || BIRTHDAY_WISHES[Math.floor(Math.random() * BIRTHDAY_WISHES.length)](member.displayName, birthInfo?.age);
  const zodiac = getZodiac(birthInfo?.day, birthInfo?.month);

  const embed = new EmbedBuilder()
    .setColor('#FF69B4') // Hot pink celebratory color
    .setAuthor({
      name: `🎉 BIRTHDAY CELEBRATION — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`🎂 SELAMAT ULANG TAHUN, ${member.displayName.toUpperCase()}! 🎈`)
    .setDescription(
      `${wishText}\n\n` +
      `🎊 Hari ini adalah hari spesial kelahiran **<@${member.id}>**!\n` +
      `Yuk kawan-kawan berikan ucapan, kado, dan doa terbaik di chat! 🥳🥂`
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setImage(BIRTHDAY_GIFS[Math.floor(Math.random() * BIRTHDAY_GIFS.length)])
    .setFooter({
      text: `${guild.name} • Birthday Alert System • ${birthInfo?.formatted || ''} ${zodiac ? `(${zodiac.label})` : ''}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTimestamp();

  if (birthInfo?.formatted) {
    embed.addFields(
      { name: '📅 Tanggal Lahir', value: `**${birthInfo.formatted}**`, inline: true },
      { name: '🌟 Zodiak', value: `**${zodiac?.label || '-'}**`, inline: true }
    );
    if (birthInfo.age) {
      embed.addFields({ name: '🎂 Usia Sekarang', value: `**${birthInfo.age} Tahun**`, inline: true });
    }
  }

  return embed;
}

module.exports = {
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  BIRTHDAY_WISHES,
  getZodiac,
  parseBirthdate,
  getNextBirthdayCountdown,
  buildBirthdayAnnouncementEmbed
};
