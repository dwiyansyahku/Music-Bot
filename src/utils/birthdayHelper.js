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
  (name, age) => `🎂 **Happy Birthday, ${name}!** ${age ? `Selamat menginjak usia yang ke-${age} tahun! ` : ''}Semoga panjang umur, sehat selalu, dan semua impianmu tercapai.`,
  (name, age) => `🎉 **Selamat Ulang Tahun, ${name}!** ${age ? `Resmi berumur ${age} tahun! ` : ''}Semoga rezekimu bertambah luas dan harimu dipenuhi kebahagiaan.`,
  (name, age) => `🎁 **Happy Birthday, ${name}!** ${age ? `Sudah ${age} tahun saja nih! ` : ''}Semoga harimu menyenangkan bersama teman-teman di server.`,
  (name, age) => `🎊 **Happy Birthday, ${name}!** ${age ? `Usia ${age} tahun ` : ''}semoga semakin sukses, berkah, dan dijauhkan dari segala kesulitan.`,
  (name, age) => `🍰 **Selamat Ulang Tahun, ${name}!** ${age ? `Selamat menyambut usia ${age} tahun! ` : ''}Semoga hari ini menjadi awal dari babak terbaik dalam hidupmu.`,
  (name, age) => `👑 **Hari ini panggung milik ${name}!** Happy Birthday yang ke-${age || 'spesial'}! Tetap jadi sosok yang asik dan membanggakan.`,
  (name, age) => `🎈 **Happy level up day, ${name}!** ${age ? `Level ${age} unlocked! ` : ''}Semoga makin sukses dalam karir, studi, dan kehidupan.`,
  (name, age) => `🌟 **Happy Birthday, ${name}!** ${age ? `Genap ${age} tahun! ` : ''}Terima kasih sudah selalu meramaikan hari-hari di komunitas server.`,
  (name, age) => `☕ **Happy Birthday, ${name}!** Nikmati hari spesialmu dengan tenang. Semoga segala urusanmu dimudahkan dan harimu selalu cerah.`,
  (name, age) => `💎 **Happy Birthday, ${name}!** Semoga harimu semanis kue ulang tahun dan dipenuhi berkah yang melimpah.`,
  (name, age) => `🎯 **Happy Birthday, ${name}!** Semoga semua target dan resolusimu di tahun ini tercapai dengan lancar.`,
  (name, age) => `🍀 **Happy Birthday, ${name}!** Semoga keberuntungan dan kemudahan selalu menyertai setiap langkahmu.`,
  (name, age) => `🏆 **Happy Birthday sang juara, ${name}!** ${age ? `Usia ${age} ` : ''}adalah langkah baru menuju pencapaian-pencapaian hebat lainnya.`,
  (name, age) => `🕊️ **Selamat Hari Lahir, ${name}!** Semoga kedamaian, ketenangan, dan kesehatan selalu menyertai hari-harimu.`,
  (name, age) => `🌻 **Happy Birthday, ${name}!** ${age ? `Selamat berumur ${age} tahun! ` : ''}Semoga senantiasa dalam perlindungan dan selalu diberi kemudahan hidup.`
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
    .setColor(0x2B2D31)
    .setAuthor({
      name: `BIRTHDAY CELEBRATION — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Selamat Ulang Tahun, ${member.displayName}! ✦`)
    .setDescription(
      `${wishText}\n\n` +
      `Hari ini adalah hari istimewa kelahiran **<@${member.id}>**.\n` +
      `Mari sampaikan ucapan dan doa terbaik di chat!`
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
    .setImage(BIRTHDAY_GIFS[Math.floor(Math.random() * BIRTHDAY_GIFS.length)])
    .setFooter({
      text: `${guild.name} • Birthday System • ${birthInfo?.formatted || ''} ${zodiac ? `(${zodiac.label})` : ''}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTimestamp();

  if (birthInfo?.formatted) {
    embed.addFields(
      { name: 'Tanggal Lahir', value: `${birthInfo.formatted}`, inline: true },
      { name: 'Zodiak', value: `${zodiac?.label || '-'}`, inline: true }
    );
    if (birthInfo.age) {
      embed.addFields({ name: 'Usia Saat Ini', value: `${birthInfo.age} Tahun`, inline: true });
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
