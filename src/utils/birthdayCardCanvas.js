const { createCanvas, loadImage } = require('@napi-rs/canvas');
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

const FONT_FAMILY = '"Segoe UI", "Segoe UI Emoji", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif';

/**
 * Unduh buffer gambar dari URL secara aman
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
 * Helper potong teks melebihi maxWidth
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
function wrapText(ctx, text, maxWidth, maxLines = 4) {
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
 * Gambar bintang sparkle 4 sudut yang mewah & elegan
 */
function drawSparkle(ctx, cx, cy, size, color = '#FDE68A') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.quadraticCurveTo(cx, cy, cx + size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + size);
  ctx.quadraticCurveTo(cx, cy, cx - size, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Render Kartu Perayaan Ulang Tahun Eksklusif (Canvas PNG)
 * Resolusi: 1000 x 520 px (Dark Luxury Glassmorphism & Gold Festivity)
 */
async function generateBirthdayCardCanvas(guild, member, birthInfo = {}, wishText = '') {
  const width = 1000;
  const height = 520;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const targetUser = member.user;

  // 1. LATAR BELAKANG OBSIDIAN & FESTIVE AMBER GLOW
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0B0D14');
  bgGrad.addColorStop(0.5, '#121422');
  bgGrad.addColorStop(1, '#080A0F');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Radial Ambient Glow (Kiri: Emas Meriah, Kanan: Rose Champagne)
  const goldGlow = ctx.createRadialGradient(180, 180, 30, 180, 180, 360);
  goldGlow.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
  goldGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = goldGlow;
  ctx.fillRect(0, 0, width, height);

  const roseGlow = ctx.createRadialGradient(840, 240, 40, 840, 240, 380);
  roseGlow.addColorStop(0, 'rgba(236, 72, 153, 0.15)');
  roseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = roseGlow;
  ctx.fillRect(0, 0, width, height);

  // Pola Grid Halus
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
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

  // Partikel Kilau Bintang Sparkles (Minim & Mewah)
  const sparkles = [
    { x: 75, y: 70, s: 6, c: '#FDE68A' },
    { x: 340, y: 55, s: 8, c: '#F59E0B' },
    { x: 920, y: 80, s: 7, c: '#FDE68A' },
    { x: 880, y: 440, s: 8, c: '#F472B6' },
    { x: 120, y: 430, s: 5, c: '#FDE68A' },
    { x: 580, y: 40, s: 5, c: '#FBBF24' },
    { x: 940, y: 220, s: 6, c: '#FDE68A' },
    { x: 260, y: 460, s: 6, c: '#F59E0B' }
  ];
  for (const sp of sparkles) {
    drawSparkle(ctx, sp.x, sp.y, sp.s, sp.c);
  }

  // 2. FRAME KONTUR GLASSMORPHISM LUAR (Margin 16px)
  const offset = 16;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(offset, offset, width - 2 * offset, height - 2 * offset, 24);
  ctx.stroke();

  // Garis aksen emas di sudut atas
  const topBarGrad = ctx.createLinearGradient(offset, offset, offset + 400, offset);
  topBarGrad.addColorStop(0, '#F59E0B');
  topBarGrad.addColorStop(0.5, '#EC4899');
  topBarGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.strokeStyle = topBarGrad;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(offset, offset, 380, 4, [24, 0, 0, 0]);
  ctx.stroke();
  ctx.restore();

  // 3. KOLOM KIRI: AVATAR & CELEBRANT BADGE
  const avatarCenterX = 135;
  const avatarCenterY = 210;
  const avatarRadius = 66;

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

  // Ring Avatar Emas Meriah
  ctx.save();
  const ringGrad = ctx.createLinearGradient(avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarCenterX + avatarRadius, avatarCenterY + avatarRadius);
  ringGrad.addColorStop(0, '#FBBF24');
  ringGrad.addColorStop(0.5, '#F59E0B');
  ringGrad.addColorStop(1, '#EC4899');
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Badge Bintang Mahkota di Bawah Avatar
  ctx.save();
  const badgeW = 140;
  const badgeH = 26;
  const badgeX = avatarCenterX - (badgeW / 2);
  const badgeY = avatarCenterY + avatarRadius + 16;

  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `bold 11px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FDE68A';
  ctx.textAlign = 'center';
  ctx.fillText('✦ CELEBRANT ✦', avatarCenterX, badgeY + 17);
  ctx.restore();

  // 4. KOLOM KANAN: SAMBUTAN & DETAIL ULANG TAHUN (x: 235 s/d 945)
  const colX = 235;

  // Header Kategori Pill
  ctx.save();
  ctx.font = `bold 11px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FBBF24';
  ctx.fillText(`✦ SPECIAL CELEBRATION • ${guild.name.toUpperCase()}`, colX, 64);

  // Judul Utama Meriah
  ctx.font = `bold 32px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('SELAMAT ULANG TAHUN', colX, 105);

  // Nama Member & Username
  ctx.font = `bold 24px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FDE68A';
  const nameDisplay = truncateText(ctx, member.displayName, 450);
  ctx.fillText(nameDisplay, colX, 140);

  ctx.font = `500 14px ${FONT_FAMILY}`;
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`@${targetUser.username}`, colX, 164);
  ctx.restore();

  // Baris Pill Data: Tanggal Lahir, Usia, Zodiak
  const pillsY = 186;
  let curPillX = colX;

  function drawPill(icon, text, bgCol, borderCol, textCol) {
    ctx.save();
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    const pWidth = ctx.measureText(`${icon} ${text}`).width + 24;
    ctx.fillStyle = bgCol;
    ctx.beginPath();
    ctx.roundRect(curPillX, pillsY, pWidth, 28, 8);
    ctx.fill();
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = textCol;
    ctx.fillText(`${icon} ${text}`, curPillX + 12, pillsY + 18);
    ctx.restore();
    curPillX += pWidth + 12;
  }

  // 1. Tanggal
  if (birthInfo.formatted) {
    drawPill('🗓️', birthInfo.formatted, 'rgba(56, 189, 248, 0.12)', 'rgba(56, 189, 248, 0.3)', '#BAE6FD');
  }

  // 2. Usia
  if (birthInfo.age) {
    drawPill('🎂', `Usia ${birthInfo.age} Tahun`, 'rgba(245, 158, 11, 0.14)', 'rgba(245, 158, 11, 0.35)', '#FDE68A');
  }

  // 3. Zodiak
  const zodiacObj = getZodiac(birthInfo.day, birthInfo.month);
  if (zodiacObj || birthInfo.zodiac) {
    const zLabel = zodiacObj?.label || birthInfo.zodiac;
    drawPill('♌', zLabel, 'rgba(244, 114, 182, 0.12)', 'rgba(244, 114, 182, 0.3)', '#FBCFE8');
  }

  // Kotak Pesan Harapan & Doa Hangat (Quote Container)
  ctx.save();
  const qBoxX = colX;
  const qBoxY = 236;
  const qBoxW = width - colX - 45;
  const qBoxH = 180;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.beginPath();
  ctx.roundRect(qBoxX, qBoxY, qBoxW, qBoxH, 14);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bar vertikal aksen emas & rose
  const qAccent = ctx.createLinearGradient(qBoxX + 2, qBoxY + 14, qBoxX + 2, qBoxY + qBoxH - 14);
  qAccent.addColorStop(0, '#FBBF24');
  qAccent.addColorStop(1, '#EC4899');
  ctx.fillStyle = qAccent;
  ctx.beginPath();
  ctx.roundRect(qBoxX + 3, qBoxY + 16, 4, qBoxH - 32, 2);
  ctx.fill();

  // Header Box
  ctx.font = `bold 11px ${FONT_FAMILY}`;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('✦ UCAPAN & DOA HANGAT DARI KOMUNITAS', qBoxX + 22, qBoxY + 30);

  // Render teks ucapan
  ctx.font = `italic 14px ${FONT_FAMILY}`;
  ctx.fillStyle = '#F1F5F9';
  const cleanWish = (wishText || 'Semoga panjang umur, senantiasa diberikan kesehatan, kebahagiaan, dan kemudahan dalam setiap langkah kehidupan.')
    .replace(/\*\*/g, ''); // bersihkan markdown bold jika ada

  const wishLines = wrapText(ctx, `"${cleanWish}"`, qBoxW - 44, 4);
  let wishLineY = qBoxY + 62;
  for (const line of wishLines) {
    ctx.fillText(line, qBoxX + 22, wishLineY);
    wishLineY += 24;
  }
  ctx.restore();

  // 5. FOOTER WATERMARK
  ctx.save();
  const footY = 465;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(offset + 20, footY);
  ctx.lineTo(width - offset - 20, footY);
  ctx.stroke();

  ctx.font = `bold 11px ${FONT_FAMILY}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText(`✦ ${guild.name.toUpperCase()} • OFFICIAL BIRTHDAY HONORS`, offset + 20, footY + 24);

  ctx.font = `600 11px ${FONT_FAMILY}`;
  ctx.fillStyle = '#F59E0B';
  ctx.fillText('VERIFIED COMMUNITY CELEBRATION ✦', width - offset - 240, footY + 24);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateBirthdayCardCanvas
};
