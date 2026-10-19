const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * Unduh buffer gambar dari URL secara aman dengan timeout ketat
 */
async function fetchImageBuffer(url, timeoutMs = 3500) {
  if (!url || typeof url !== 'string') return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
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
 * Gambar rounded rectangle path
 */
function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Utility untuk memotong teks panjang agar rapi dengan multi-line wrap
 */
function wrapText(ctx, text, maxWidth, maxLines = 4) {
  if (!text) return [];
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
      if (lines.length === maxLines - 1) {
        // Line terakhir, tampung sisa dan potong dengan ellipsis
        const remaining = words.slice(i).join(' ');
        let truncated = remaining;
        while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
          truncated = truncated.slice(0, -1).trim();
        }
        lines.push(truncated + '...');
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Render Kartu Visual Cuplikan Konten (Canvas 1200 x 630)
 * Bergaya Minimalist Dark Luxury — Tanpa emoji alay, estetik, berkelas
 * 
 * @param {Object} options
 * @param {'tiktok' | 'instagram'} options.platform
 * @param {'live' | 'post' | 'video' | 'reels'} options.type
 * @param {string} options.author
 * @param {string} options.handle
 * @param {string} [options.avatarUrl]
 * @param {string} [options.title]
 * @param {string} [options.caption]
 * @param {string} [options.previewUrl]
 * @param {string} [options.extraInfo]
 * @returns {Promise<Buffer>}
 */
async function renderSocmedCard({
  platform = 'tiktok',
  type = 'post',
  author = 'Content Creator',
  handle = '@username',
  avatarUrl = null,
  title = null,
  caption = 'Simak cuplikan video terbaru selengkapnya melalui tautan resmi yang telah disediakan.',
  previewUrl = null,
  extraInfo = null
}) {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const isTikTok = platform.toLowerCase() === 'tiktok';
  const isLive = type.toLowerCase() === 'live';

  // 1. Base Dark Luxury Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (isTikTok) {
    bgGrad.addColorStop(0, '#07080D');
    bgGrad.addColorStop(0.5, '#0E1019');
    bgGrad.addColorStop(1, '#06070B');
  } else {
    bgGrad.addColorStop(0, '#0C0614');
    bgGrad.addColorStop(0.5, '#170E22');
    bgGrad.addColorStop(1, '#09040F');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Glow Accents
  if (isTikTok) {
    // Soft Crimson Glow (Top Right)
    const glowCrimson = ctx.createRadialGradient(1050, 150, 40, 1050, 150, 420);
    glowCrimson.addColorStop(0, 'rgba(254, 44, 85, 0.16)');
    glowCrimson.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowCrimson;
    ctx.fillRect(0, 0, width, height);

    // Soft Cyan Glow (Bottom Left)
    const glowCyan = ctx.createRadialGradient(160, 480, 40, 160, 480, 380);
    glowCyan.addColorStop(0, 'rgba(0, 242, 254, 0.12)');
    glowCyan.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowCyan;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Warm Magenta Glow (Top Right)
    const glowMagenta = ctx.createRadialGradient(1050, 150, 40, 1050, 150, 420);
    glowMagenta.addColorStop(0, 'rgba(225, 48, 108, 0.20)');
    glowMagenta.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowMagenta;
    ctx.fillRect(0, 0, width, height);

    // Deep Violet Glow (Bottom Left)
    const glowViolet = ctx.createRadialGradient(160, 480, 40, 160, 480, 380);
    glowViolet.addColorStop(0, 'rgba(131, 58, 180, 0.18)');
    glowViolet.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowViolet;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Subtle Cyber Dot Grid Texture
  ctx.save();
  ctx.fillStyle = isTikTok ? 'rgba(255, 255, 255, 0.02)' : 'rgba(216, 180, 254, 0.025)';
  const dotStep = 32;
  for (let dx = 40; dx < width - 40; dx += dotStep) {
    for (let dy = 40; dy < height - 40; dy += dotStep) {
      ctx.beginPath();
      ctx.arc(dx, dy, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 4. Outer Subtle Framing
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  roundedRect(ctx, 24, 24, width - 48, height - 48, 20);
  ctx.stroke();
  ctx.restore();

  // 5. Header Section: Badges & Tags (x: 64, y: 56)
  const headerY = 58;

  // Platform Pill Badge
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeStyle = isTikTok ? 'rgba(0, 242, 254, 0.3)' : 'rgba(225, 48, 108, 0.35)';
  ctx.lineWidth = 1;
  roundedRect(ctx, 64, headerY, 115, 34, 17);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(isTikTok ? 'TIKTOK' : 'INSTAGRAM', 88, headerY + 17);
  ctx.restore();

  // Status Badge Pill
  ctx.save();
  const statusX = 190;
  if (isLive) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 1;
    roundedRect(ctx, statusX, headerY, 128, 34, 17);
    ctx.fill();
    ctx.stroke();

    // Glowing Red Live Dot
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(statusX + 20, headerY + 17, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FCA5A5';
    ctx.font = 'bold 12px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIVE NOW', statusX + 32, headerY + 17);
  } else {
    ctx.fillStyle = 'rgba(99, 102, 241, 0.14)';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
    ctx.lineWidth = 1;
    roundedRect(ctx, statusX, headerY, 140, 34, 17);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#A5B4FC';
    ctx.font = 'bold 12px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('◆ KONTEN BARU', statusX + 16, headerY + 17);
  }
  ctx.restore();

  // 6. Right Side: Cuplikan Visual Snapshot Card (Review Frame)
  const previewBoxX = 640;
  const previewBoxY = 56;
  const previewBoxW = 496;
  const previewBoxH = 490;

  // Background box with drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 12;

  ctx.fillStyle = '#12141F';
  roundedRect(ctx, previewBoxX, previewBoxY, previewBoxW, previewBoxH, 18);
  ctx.fill();
  ctx.restore();

  // Fetch preview image if provided
  let previewImg = null;
  if (previewUrl) {
    const pBuf = await fetchImageBuffer(previewUrl, 3000);
    if (pBuf) {
      try {
        previewImg = await loadImage(pBuf);
      } catch (_) {}
    }
  }

  // Draw snapshot inside rounded clip
  ctx.save();
  roundedRect(ctx, previewBoxX, previewBoxY, previewBoxW, previewBoxH, 18);
  ctx.clip();

  if (previewImg) {
    // Hitung proporsi cover
    const scale = Math.max(previewBoxW / previewImg.width, previewBoxH / previewImg.height);
    const sw = previewImg.width * scale;
    const sh = previewImg.height * scale;
    const sx = previewBoxX + (previewBoxW - sw) / 2;
    const sy = previewBoxY + (previewBoxH - sh) / 2;
    ctx.drawImage(previewImg, sx, sy, sw, sh);

    // Subtle bottom glass overlay gradient
    const shadowGrad = ctx.createLinearGradient(0, previewBoxY + previewBoxH - 180, 0, previewBoxY + previewBoxH);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(previewBoxX, previewBoxY, previewBoxW, previewBoxH);
  } else {
    // Elegant geometric fallback placeholder
    const phGrad = ctx.createLinearGradient(previewBoxX, previewBoxY, previewBoxX + previewBoxW, previewBoxY + previewBoxH);
    phGrad.addColorStop(0, isTikTok ? '#141724' : '#1C122A');
    phGrad.addColorStop(1, '#090A10');
    ctx.fillStyle = phGrad;
    ctx.fillRect(previewBoxX, previewBoxY, previewBoxW, previewBoxH);

    // Subtle center emblem
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isLive ? 'SIARAN LANGSUNG' : 'CUPLIKAN VISUAL', previewBoxX + previewBoxW / 2, previewBoxY + previewBoxH / 2 - 10);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillText('PRATINJAU KONTEN', previewBoxX + previewBoxW / 2, previewBoxY + previewBoxH / 2 + 18);
  }

  // Overlay Play Button jika tipe video / post
  if (!isLive) {
    const playCenterX = previewBoxX + previewBoxW / 2;
    const playCenterY = previewBoxY + previewBoxH / 2;

    // Semi-transparent glass circle
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playCenterX, playCenterY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Triangle play symbol
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(playCenterX - 10, playCenterY - 15);
    ctx.lineTo(playCenterX + 16, playCenterY);
    ctx.lineTo(playCenterX - 10, playCenterY + 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Overlay Badge di pojok atas thumbnail cuplikan
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  roundedRect(ctx, previewBoxX + 16, previewBoxY + 16, 120, 28, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isLive ? '● ON AIR' : '▶ CUPLIKAN', previewBoxX + 76, previewBoxY + 30);
  ctx.restore();

  // Border outline untuk preview snapshot
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, previewBoxX, previewBoxY, previewBoxW, previewBoxH, 18);
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // end clip

  // 7. Left Side: Author Info Block (x: 64, y: 118)
  const authorBoxY = 120;
  const avatarSize = 68;
  const avatarCenterX = 64 + avatarSize / 2;
  const avatarCenterY = authorBoxY + avatarSize / 2;

  // Avatar fetching
  let avatarImg = null;
  if (avatarUrl) {
    const aBuf = await fetchImageBuffer(avatarUrl, 3000);
    if (aBuf) {
      try {
        avatarImg = await loadImage(aBuf);
      } catch (_) {}
    }
  }

  // Draw Avatar Circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
  ctx.clip();

  if (avatarImg) {
    ctx.drawImage(avatarImg, 64, authorBoxY, avatarSize, avatarSize);
  } else {
    // Elegant fallback monogram circle
    ctx.fillStyle = isTikTok ? '#1E2337' : '#28173D';
    ctx.fillRect(64, authorBoxY, avatarSize, avatarSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (author || 'C')[0].toUpperCase();
    ctx.fillText(initial, avatarCenterX, avatarCenterY);
  }
  ctx.restore();

  // Avatar Border Ring
  ctx.save();
  ctx.strokeStyle = isTikTok ? 'rgba(0, 242, 254, 0.5)' : 'rgba(225, 48, 108, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2 + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Author Names
  const nameX = 64 + avatarSize + 18;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.textBaseline = 'top';

  // Limit author name width
  let authorDisplay = author || 'Official Creator';
  while (ctx.measureText(authorDisplay).width > 420 && authorDisplay.length > 5) {
    authorDisplay = authorDisplay.slice(0, -1).trim();
  }
  ctx.fillText(authorDisplay, nameX, authorBoxY + 8);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 15px sans-serif';
  const cleanHandle = handle?.startsWith('@') ? handle : `@${handle || 'creator'}`;
  ctx.fillText(cleanHandle, nameX, authorBoxY + 40);
  ctx.restore();

  // 8. Review Cuplikan / Excerpt Section (Left Column)
  const descY = 224;
  const leftColWidth = 530;

  // Label Seksi Cuplikan
  ctx.save();
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('RINGKASAN & CUPLIKAN KONTEN', 64, descY);
  ctx.restore();

  // Title Konten jika ada
  let textStartY = descY + 24;
  if (title) {
    ctx.save();
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const titleLines = wrapText(ctx, title, leftColWidth, 2);
    titleLines.forEach(line => {
      ctx.fillText(line, 64, textStartY);
      textStartY += 28;
    });
    textStartY += 6;
    ctx.restore();
  }

  // Caption Cuplikan (Text review / excerpt)
  ctx.save();
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Vertical quotation line accent on left of text
  const quoteBarX = 64;
  const quoteTextX = 76;
  const captionLines = wrapText(ctx, caption || 'Simak karya visual terbaru melalui tautan resmi yang telah disediakan.', leftColWidth - 20, 5);
  
  const textBlockHeight = captionLines.length * 25;
  ctx.strokeStyle = isTikTok ? '#38BDF8' : '#C084FC';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(quoteBarX, textStartY + 2);
  ctx.lineTo(quoteBarX, textStartY + textBlockHeight + 2);
  ctx.stroke();

  captionLines.forEach(line => {
    ctx.fillText(line, quoteTextX, textStartY);
    textStartY += 25;
  });
  ctx.restore();

  // Extra info badge (misal: "Disiarkan langsung • 1080p 60fps" atau durasi)
  if (extraInfo) {
    ctx.save();
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText(extraInfo, 64, textStartY + 14);
    ctx.restore();
  }

  // 9. Bottom Footer Bar (x: 64, y: 566)
  const footerY = 568;

  // Thin separator line
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, footerY);
  ctx.lineTo(width - 64, footerY);
  ctx.stroke();
  ctx.restore();

  // Footer labels
  ctx.save();
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('QUMPRUY BROADCAST • SISTEM DISTRIBUSI INFORMASI RESMI', 64, footerY + 24);

  // Date formatted
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(dateStr, width - 64, footerY + 24);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  renderSocmedCard,
  fetchImageBuffer
};
