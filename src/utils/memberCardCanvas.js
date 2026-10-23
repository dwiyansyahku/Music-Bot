const { createCanvas, loadImage } = require('@napi-rs/canvas');
const storage = require('./storage');
const { getVoiceStats, getLiveVoiceInfo } = require('./voiceTracker');
const { parseBirthdate, getZodiac } = require('./birthdayHelper');
const { parseLocation } = require('./locationHelper');

const FONT_FAMILY = '"Segoe UI", "Segoe UI Emoji", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif';

/**
 * Unduh buffer gambar dari URL secara aman dengan timeout ketat
 */
async function fetchImageBuffer(url, timeoutMs = 3500) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'QumpruyDiscordBot/1.0 (https://github.com/dwiyansyahku/Music-Bot)',
        'Accept': 'image/png,image/webp,image/jpeg,image/*;q=0.9'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (_) {
    return null;
  }
}

/**
 * Helper untuk memotong teks jika melebihi lebar maksimum
 */
function truncateText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 0 && ctx.measureText(str + '...').width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + '...';
}

/**
 * Helper membungkus teks menjadi beberapa baris
 */
function wrapText(ctx, text, maxWidth, maxLines = 3) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  if (lines.length === maxLines && words.length > lines.join(' ').split(' ').length) {
    lines[maxLines - 1] = truncateText(ctx, lines[maxLines - 1], maxWidth);
  }
  return lines;
}

/**
 * Bersihkan string dari flag emoji regional indicators (yang sering jadi kotak di font canvas)
 */
function sanitizeFlagEmoji(str) {
  if (!str) return '';
  // Menghilangkan flag emoji Unicode (U+1F1E6 sampai U+1F1FF)
  return str.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim();
}

/**
 * Render Kartu Profil Member Eksklusif dalam format Canvas PNG
 * Dimensi: 1000 x 540 px (Rasio Elegan Glassmorphism Dark Mode)
 */
async function generateMemberCardCanvas(guild, member) {
  const width = 1000;
  const height = 540;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const targetUser = member.user;
  const guildId = guild.id;
  const userId = targetUser.id;

  // Baca data profil member dari storage
  const cardsData = storage.read('cards') || {};
  const userCard = cardsData[guildId]?.[userId] || {};

  // Baca data gacha untuk gelar & senjata yang di-equip
  const gachaData = storage.read('gacha_data') || {};
  const userGacha = gachaData[guildId]?.[userId] || {};

  // Warna aksen utama (berdasarkan role color Discord atau default Royal Violet)
  const roleColor = (member?.roles?.color?.hexColor && member.roles.color.hexColor !== '#000000')
    ? member.roles.color.hexColor
    : '#8B5CF6';

  // 1. LATAR BELAKANG OBSIDIAN DARK MODE & GLOW
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#090B10');
  bgGrad.addColorStop(0.5, '#0E121E');
  bgGrad.addColorStop(1, '#06080D');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radial Ambient Glow di sudut kiri-atas & kanan-bawah
  const leftGlow = ctx.createRadialGradient(160, 140, 20, 160, 140, 320);
  leftGlow.addColorStop(0, `${roleColor}30`); // subtle glow
  leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, width, height);

  const rightGlow = ctx.createRadialGradient(840, 260, 40, 840, 260, 360);
  rightGlow.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
  rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, width, height);

  // 2. GAMBAR BANNER KUSTOM (JIKA ADA)
  if (userCard.bannerUrl) {
    try {
      const bannerBuffer = await fetchImageBuffer(userCard.bannerUrl, 2500);
      if (bannerBuffer) {
        const bannerImg = await loadImage(bannerBuffer);
        ctx.save();
        ctx.globalAlpha = 0.20;
        ctx.drawImage(bannerImg, 0, 0, width, height);
        ctx.restore();
      }
    } catch (_) {}
  }

  // Pola Grid Halus di Latar Belakang
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. FRAME KONTUR GLASSMORPHISM LUAR (Margin 16px)
  const offset = 16;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(offset, offset, width - 2 * offset, height - 2 * offset, 24);
  ctx.stroke();

  // Garis aksen warna role di sudut kiri-atas
  const accentGrad = ctx.createLinearGradient(offset, offset, offset + 260, offset);
  accentGrad.addColorStop(0, roleColor);
  accentGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.strokeStyle = accentGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(offset, offset, 280, 4, [24, 0, 0, 0]);
  ctx.stroke();
  ctx.restore();

  // 4. KOLOM KIRI: AVATAR & PROFIL UTAMA (x: 45 s/d 385)
  const avatarCenterX = 100;
  const avatarCenterY = 96;
  const avatarRadius = 46;

  // Unduh Avatar Member
  try {
    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarBuffer = await fetchImageBuffer(avatarUrl, 3000);
    if (avatarBuffer) {
      const avatarImg = await loadImage(avatarBuffer);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
      ctx.restore();
    }
  } catch (_) {
    ctx.save();
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ring Avatar
  ctx.save();
  ctx.strokeStyle = roleColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Status Voice Dot pada Avatar
  const inVoice = Boolean(member.voice && member.voice.channel);
  ctx.save();
  ctx.fillStyle = inVoice ? '#10B981' : '#64748B';
  ctx.strokeStyle = '#090B10';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarCenterX + 32, avatarCenterY + 32, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Nama Tampilan (Display Name)
  ctx.save();
  ctx.font = `bold 23px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FFFFFF';
  const truncatedName = truncateText(ctx, member.displayName, 225);
  ctx.fillText(truncatedName, 162, 84);

  // Username Tag
  ctx.font = `500 14px ${FONT_FAMILY}`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`@${targetUser.username}`, 162, 108);

  // Gelar Utama dari Sistem Gacha (Equipped Title)
  if (userGacha.equippedTitle) {
    const titleText = `👑 ${userGacha.equippedTitle}`;
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    const titleWidth = ctx.measureText(titleText).width + 18;

    ctx.fillStyle = 'rgba(139, 92, 246, 0.22)';
    ctx.beginPath();
    ctx.roundRect(162, 118, Math.min(titleWidth, 220), 22, 11);
    ctx.fill();
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#DDD6FE';
    ctx.fillText(truncateText(ctx, titleText, 205), 171, 133);
  }
  ctx.restore();

  // Kotak Bio / Kutipan
  ctx.save();
  const bioX = 45;
  const bioY = 160;
  const bioW = 340;
  const bioH = 92;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  ctx.roundRect(bioX, bioY, bioW, bioH, 14);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bar vertikal aksen
  ctx.fillStyle = roleColor;
  ctx.beginPath();
  ctx.roundRect(bioX + 2, bioY + 12, 3.5, bioH - 24, 2);
  ctx.fill();

  // Render teks bio
  ctx.font = `italic 13px ${FONT_FAMILY}`;
  ctx.fillStyle = userCard.bio ? '#E2E8F0' : '#64748B';
  const bioRaw = userCard.bio || 'Belum mengatur bio. Gunakan tombol Edit Card untuk menulis bio kamu.';
  const bioLines = wrapText(ctx, `"${bioRaw}"`, bioW - 28, 3);
  let lineY = bioY + 28;
  for (const line of bioLines) {
    ctx.fillText(line, bioX + 16, lineY);
    lineY += 20;
  }
  ctx.restore();

  // Senjata Utama Raid Boss (Equipped Relic dari Gacha)
  ctx.save();
  const eqX = 45;
  const eqY = 264;
  const eqW = 340;
  const eqH = 44;

  if (userGacha.equippedRelic) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.beginPath();
    ctx.roundRect(eqX, eqY, eqW, eqH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `bold 13px ${FONT_FAMILY}`;
    ctx.fillStyle = '#FCD34D';
    const relicText = `⚔️ SENJATA: ${userGacha.equippedRelic}`;
    ctx.fillText(truncateText(ctx, relicText, eqW - 24), eqX + 14, eqY + 27);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.beginPath();
    ctx.roundRect(eqX, eqY, eqW, eqH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `500 12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#64748B';
    ctx.fillText('⚔️ Senjata Raid: Belum dipasang', eqX + 14, eqY + 27);
  }
  ctx.restore();

  // Pill Likes & Respects
  ctx.save();
  const likesCount = (userCard.likes || []).length;
  const respectsCount = (userCard.respects || []).length;

  const likeX = 45;
  const likeY = 320;
  const likeW = 162;
  const likeH = 42;

  // Like Pill
  ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
  ctx.beginPath();
  ctx.roundRect(likeX, likeY, likeW, likeH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = `bold 14px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FB7185';
  ctx.fillText(`❤️  ${likesCount} Likes`, likeX + 22, likeY + 26);

  // Respect Pill
  const respX = 223;
  const respW = 162;
  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.beginPath();
  ctx.roundRect(respX, likeY, respW, likeH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#FBBF24';
  ctx.fillText(`🫡  ${respectsCount} Respects`, respX + 18, likeY + 26);
  ctx.restore();

  // 5. KOLOM KANAN: STATISTIK & HUB AKTIVITAS (x: 415 s/d 955)
  function drawStatTile(x, y, w, h, icon, title, mainVal, subVal, valColor = '#FFFFFF') {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Judul Header Tile
    ctx.font = `bold 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`${icon} ${title.toUpperCase()}`, x + 16, y + 24);

    // Nilai Utama
    ctx.font = `bold 17px ${FONT_FAMILY}`;
    ctx.fillStyle = valColor;
    ctx.fillText(truncateText(ctx, mainVal, w - 32), x + 16, y + 49);

    // Keterangan Sub
    if (subVal) {
      ctx.font = `500 12px ${FONT_FAMILY}`;
      ctx.fillStyle = '#64748B';
      ctx.fillText(truncateText(ctx, subVal, w - 32), x + 16, y + 69);
    }
    ctx.restore();
  }

  // Ambil Data Voice
  const voiceStats = getVoiceStats(guildId, userId, guild);
  let liveVcText = 'Inactive';
  if (member.voice && member.voice.channel) {
    const chName = member.voice.channel.name;
    const liveInfo = getLiveVoiceInfo(guildId, userId);
    const durText = liveInfo.durationFormatted ? ` (${liveInfo.durationFormatted})` : '';
    liveVcText = `#${chName}${durText}`;
  }

  // Tile 1: Voice Activity (x: 415, y: 50, w: 260, h: 80)
  drawStatTile(
    415, 50, 260, 80,
    '🎙️', 'Voice Activity',
    voiceStats.formattedTime || '0m',
    `Live: ${liveVcText}`,
    '#38BDF8'
  );

  // Ambil Data Join Server & Posisi Member
  function formatDate(d) {
    if (!d) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const joinDateStr = formatDate(member.joinedAt);

  // Tile 2: Join Date & Server Tenure (x: 695, y: 50, w: 260, h: 80)
  drawStatTile(
    695, 50, 260, 80,
    '🗓️', 'Join Server',
    joinDateStr,
    `Komunitas: ${guild.name}`,
    '#FFFFFF'
  );

  // Lokasi / Domisili
  const rawLoc = userCard.asalRaw || userCard.asal || userCard.location?.display || '';
  const parsedLoc = rawLoc ? parseLocation(rawLoc) : null;
  const locCity = parsedLoc?.city || userCard.location?.city || userCard.asal || 'Belum diatur';
  const cleanDisplay = sanitizeFlagEmoji(parsedLoc?.display || userCard.location?.display || parsedLoc?.country || '-');

  // Tile 3: Domisili / Asal (x: 415, y: 140, w: 260, h: 80)
  drawStatTile(
    415, 140, 260, 80,
    '📍', 'Domisili / Asal',
    locCity,
    cleanDisplay,
    '#34D399'
  );

  // Zodiak & MBTI
  let zodiacSymbolAndName = null;
  if (userCard.birthdate && userCard.birthdate.day && userCard.birthdate.month) {
    const zodiacObj = getZodiac(userCard.birthdate.day, userCard.birthdate.month);
    if (zodiacObj) zodiacSymbolAndName = zodiacObj.label;
  }
  const mbtiText = userCard.mbti ? userCard.mbti.toUpperCase() : null;
  let zodiacMbtiDisplay = '-';
  if (zodiacSymbolAndName && mbtiText) zodiacMbtiDisplay = `${zodiacSymbolAndName} • ${mbtiText}`;
  else if (zodiacSymbolAndName) zodiacMbtiDisplay = zodiacSymbolAndName;
  else if (mbtiText) zodiacMbtiDisplay = mbtiText;

  // Tile 4: Zodiac & Personality (x: 695, y: 140, w: 260, h: 80)
  drawStatTile(
    695, 140, 260, 80,
    '♌', 'Zodiac & Personality',
    zodiacMbtiDisplay,
    'Karakteristik & Zodiak',
    '#F472B6'
  );

  // Tile 5: Social Link & Teman Voice (x: 415, y: 230, w: 540, h: 132)
  ctx.save();
  const socX = 415;
  const socY = 230;
  const socW = 540;
  const socH = 132;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  ctx.roundRect(socX, socY, socW, socH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header Social Link
  ctx.font = `bold 11px ${FONT_FAMILY}`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('🔗 CONNECT & TOP VOICE COMPANIONS', socX + 16, socY + 24);

  // Link Social
  ctx.font = `bold 14px ${FONT_FAMILY}`;
  if (userCard.linkUrl) {
    ctx.fillStyle = '#60A5FA';
    const linkTitle = userCard.linkTitle || 'Tautan Sosial';
    const cleanUrl = userCard.linkUrl.replace(/^https?:\/\//i, '');
    ctx.fillText(truncateText(ctx, `🌐 ${linkTitle}: ${cleanUrl}`, socW - 32), socX + 16, socY + 52);
  } else {
    ctx.fillStyle = '#64748B';
    ctx.fillText('🌐 Belum menambahkan tautan sosial (/card edit)', socX + 16, socY + 52);
  }

  // Top Companions
  ctx.font = `500 12px ${FONT_FAMILY}`;
  ctx.fillStyle = '#CBD5E1';
  let companionText = 'Teman Voice: Belum ada data mengobrol bersama';
  if (voiceStats.topCompanions && voiceStats.topCompanions.length > 0) {
    const list = voiceStats.topCompanions.slice(0, 3).map((c, i) => `${i + 1}. ${c.name} (${c.timeFormatted})`).join('  •  ');
    companionText = `Kawan Dekat: ${list}`;
  }
  ctx.fillText(truncateText(ctx, companionText, socW - 32), socX + 16, socY + 84);
  ctx.restore();

  // 6. BARIS PRESTASI / ACHIEVEMENTS & BADGES (x: 45, y: 374, w: 910, h: 84)
  ctx.save();
  const achX = 45;
  const achY = 374;
  const achW = 910;
  const achH = 84;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  ctx.roundRect(achX, achY, achW, achH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Dapatkan achievements user
  let unlockedAchievements = [];
  try {
    const { getUserAchievements } = require('./achievementHelper');
    const achData = getUserAchievements(guildId, userId, member);
    unlockedAchievements = achData.unlocked || [];
  } catch (_) {}

  // Header Achievements
  ctx.font = `bold 11px ${FONT_FAMILY}`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`🏆 TITLES & SERVER ACHIEVEMENTS (${unlockedAchievements.length})`, achX + 16, achY + 24);

  // Render badge pills
  let badgeCurX = achX + 16;
  const badgeY = achY + 38;
  const maxBadgeX = achX + achW - 20;

  function getAchievementIcon(ach) {
    if (ach.category === 'Profile') return '💎';
    if (ach.category === 'Social') return '⭐';
    if (ach.category === 'Voice') return '🎙️';
    if (ach.category === 'Relics') return '👑';
    if (ach.category === 'Music') return '🎵';
    return '🎖️';
  }

  if (unlockedAchievements.length > 0) {
    for (const ach of unlockedAchievements) {
      const icon = getAchievementIcon(ach);
      const bText = `${icon} ${ach.name}`;
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      const bWidth = ctx.measureText(bText).width + 20;
      if (badgeCurX + bWidth > maxBadgeX) {
        // Tampilkan sisa counter jika ruang penuh
        const remaining = unlockedAchievements.length - unlockedAchievements.indexOf(ach);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(badgeCurX, badgeY, 65, 28, 8);
        ctx.fill();
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`+${remaining} more`, badgeCurX + 10, badgeY + 18);
        break;
      }

      // Chip background
      ctx.fillStyle = 'rgba(139, 92, 246, 0.16)';
      ctx.beginPath();
      ctx.roundRect(badgeCurX, badgeY, bWidth, 28, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#E9D5FF';
      ctx.fillText(bText, badgeCurX + 10, badgeY + 18);

      badgeCurX += bWidth + 10;
    }
  } else {
    // Default starter badge
    const defaultBadge = '⭐ Verified Resident';
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    const dWidth = ctx.measureText(defaultBadge).width + 20;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    ctx.roundRect(badgeCurX, badgeY, dWidth, 28, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#BAE6FD';
    ctx.fillText(defaultBadge, badgeCurX + 10, badgeY + 18);
  }
  ctx.restore();

  // 7. FOOTER WATERMARK & IDENTITY BADGE
  ctx.save();
  const footY = 478;

  // Garis pemisah halus
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(offset + 20, footY);
  ctx.lineTo(width - offset - 20, footY);
  ctx.stroke();

  // Watermark teks
  ctx.font = `bold 11px ${FONT_FAMILY}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText(`✨ ${guild.name.toUpperCase()} • OFFICIAL MEMBER IDENTITY CARD`, offset + 20, footY + 28);

  ctx.font = `600 11px ${FONT_FAMILY}`;
  ctx.fillStyle = '#10B981';
  ctx.fillText('🛡️ VERIFIED MEMBER PROFILE', width - offset - 210, footY + 28);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateMemberCardCanvas
};
