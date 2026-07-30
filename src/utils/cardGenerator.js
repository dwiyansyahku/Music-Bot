const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * Helper to fetch image buffer with User-Agent & 1.8s timeout.
 * Discord CDN delays or blocks canvas's default libcurl if User-Agent is missing.
 * Passing Buffer directly to loadImage(buffer) executes in < 5ms.
 */
async function fetchImageBuffer(url, timeoutMs = 1800) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function safeLoadImage(url, timeoutMs = 1800) {
  if (!url) throw new Error('No URL provided');
  const buffer = await fetchImageBuffer(url, timeoutMs);
  return await loadImage(buffer);
}

/**
 * Helper to draw a rounded rectangle
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
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
 * Helper for dynamic text wrapping with max lines
 */
function getWrappedLines(ctx, text, maxWidth, maxLines = 3) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        // Last allowed line — truncate remainder with ellipsis
        let remaining = words.slice(i).join(' ');
        let truncated = currentLine;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        lines.push(truncated + '...');
        return lines;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generate HD Canvas Member Profile Card (1000px x 560px)
 */
async function generateMemberCardCanvas(guild, member, userCardData = {}) {
  const width = 1000;
  const height = 560;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const accentColor = userCardData.color || member.roles.color?.hexColor || '#5865F2';

  // ============================================================
  // 1. BACKGROUND DRAWING
  // ============================================================
  let bgLoaded = false;
  if (userCardData.bgUrl) {
    try {
      const bgImg = await safeLoadImage(userCardData.bgUrl, 1800);
      // Object-fit: cover math
      const imgRatio = bgImg.width / bgImg.height;
      const canvasRatio = width / height;
      let drawW, drawH, drawX, drawY;

      if (imgRatio > canvasRatio) {
        drawH = height;
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = width;
        drawH = width / imgRatio;
        drawX = 0;
        drawY = (height - drawH) / 2;
      }

      ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
      bgLoaded = true;

      // Dark Overlay gradient over custom image for text readability
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
      overlayGrad.addColorStop(0, 'rgba(15, 17, 23, 0.65)');
      overlayGrad.addColorStop(1, 'rgba(10, 11, 16, 0.88)');
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, width, height);
    } catch (err) {
      console.warn('[CardCanvas] Custom background image failed to load or timed out, using default gradient:', err.message);
    }
  }

  if (!bgLoaded) {
    // Default Modern Mesh Dark Gradient
    const baseGrad = ctx.createLinearGradient(0, 0, width, height);
    baseGrad.addColorStop(0, '#111319');
    baseGrad.addColorStop(0.5, '#181b26');
    baseGrad.addColorStop(1, '#0e0f14');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    // Accent Glow Circles in background
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = accentColor;

    ctx.beginPath();
    ctx.arc(150, 100, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(850, 460, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Card Outer Border Accent Line
  ctx.lineWidth = 3;
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.6;
  drawRoundedRect(ctx, 4, 4, width - 8, height - 8, 20);
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // ============================================================
  // 2. HEADER SECTION (AVATAR & USERNAME)
  // ============================================================
  const avatarSize = 120;
  const avatarX = 50;
  const avatarY = 45;

  // Draw Avatar
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatarImg = await safeLoadImage(avatarUrl, 1800);

    // Circle Clip for Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Accent Ring around Avatar
    ctx.lineWidth = 4;
    ctx.strokeStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (err) {
    console.warn('[CardCanvas] Failed to draw avatar image:', err.message);
  }

  // Display Name (Dynamic font size adjustment)
  ctx.fillStyle = '#FFFFFF';
  let nameFontSize = 36;
  ctx.font = `bold ${nameFontSize}px sans-serif`;
  const nameText = member.displayName;
  const nameX = avatarX + avatarSize + 25;
  const nameY = avatarY + 42;

  // Auto shrink font size if display name is long
  while (ctx.measureText(nameText).width > 420 && nameFontSize > 22) {
    nameFontSize -= 2;
    ctx.font = `bold ${nameFontSize}px sans-serif`;
  }
  ctx.fillText(nameText, nameX, nameY);

  // Username (@tag)
  ctx.fillStyle = '#A0A5B5';
  ctx.font = '20px sans-serif';
  ctx.fillText(`@${member.user.username}`, nameX, nameY + 30);

  // Top-Right System Badge (MEMBER CARD)
  const badgeText = 'MEMBER CARD';
  ctx.font = 'bold 14px sans-serif';
  const badgeWidth = ctx.measureText(badgeText).width + 30;
  const badgeX = width - 50 - badgeWidth;
  const badgeY = 45;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, 34, 17);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(badgeText, badgeX + 15, badgeY + 22);

  // ============================================================
  // 3. MIDDLE CONTAINERS (GLASSMORPHISM CARDS)
  // ============================================================
  const containerY = 190;
  const containerH = 175;
  const gap = 20;
  const colWidth = (width - 100 - gap) / 2; // 440px each

  // Helper to draw Glass Container Box
  function drawGlassBox(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 24, 36, 0.65)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // --- BOX 1: INFO & STATS (LEFT) ---
  const box1X = 50;
  drawGlassBox(box1X, containerY, colWidth, containerH);

  // Box 1 Header
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MEMBER INFO', box1X + 20, containerY + 30);

  // Calculate join position (fast cached version)
  const cachedMembers = guild.members.cache;
  const sortedByJoin = [...cachedMembers.values()]
    .filter(m => m.joinedAt)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  const joinPos = sortedByJoin.findIndex(m => m.id === member.id) + 1;
  const totalMembers = guild.memberCount;

  function formatDate(d) {
    if (!d) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const stats = [
    { label: 'Position', val: `#${joinPos || '-'} of ${totalMembers.toLocaleString('en-US')}` },
    { label: 'Location', val: userCardData.asal || '-' },
    { label: 'Joined', val: formatDate(member.joinedAt) },
    { label: 'Account', val: formatDate(member.user.createdAt) }
  ];

  ctx.font = '15px sans-serif';
  let statY = containerY + 62;
  stats.forEach(s => {
    ctx.fillStyle = '#8E94A5';
    ctx.fillText(s.label + ':', box1X + 20, statY);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(s.val, box1X + 115, statY);
    ctx.font = '15px sans-serif';
    statY += 27;
  });

  // --- BOX 2: ROLES & PERKS (RIGHT) ---
  const box2X = box1X + colWidth + gap;
  drawGlassBox(box2X, containerY, colWidth, containerH);

  // Box 2 Header
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('TOP ROLES', box2X + 20, containerY + 30);

  const topRoles = member.roles.cache
    .filter(r => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .first(4);

  let roleY = containerY + 62;
  if (topRoles.length === 0) {
    ctx.fillStyle = '#8E94A5';
    ctx.font = '15px sans-serif';
    ctx.fillText('No special roles', box2X + 20, roleY);
  } else {
    topRoles.forEach(r => {
      // Role color dot
      ctx.fillStyle = r.hexColor !== '#000000' ? r.hexColor : '#99AAB5';
      ctx.beginPath();
      ctx.arc(box2X + 26, roleY - 5, 6, 0, Math.PI * 2);
      ctx.fill();

      // Role name
      ctx.fillStyle = '#E1E4EC';
      ctx.font = '15px sans-serif';
      let rName = r.name;
      if (ctx.measureText(rName).width > 370) {
        while (ctx.measureText(rName + '...').width > 370 && rName.length > 0) {
          rName = rName.slice(0, -1);
        }
        rName += '...';
      }
      ctx.fillText(rName, box2X + 42, roleY);
      roleY += 27;
    });
  }

  // ============================================================
  // 4. BOTTOM CONTAINER (BIO & LINK)
  // ============================================================
  const box3Y = containerY + containerH + 18;
  const box3H = 125;
  drawGlassBox(50, box3Y, width - 100, box3H);

  // Box 3 Header / Bio
  const bioText = userCardData.bio || 'No bio status set yet.';
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('BIO / STATUS', 70, box3Y + 28);

  ctx.fillStyle = '#D6DAE4';
  ctx.font = '15px sans-serif';
  const wrappedBio = getWrappedLines(ctx, bioText, width - 140, 2);
  let bioY = box3Y + 52;
  wrappedBio.forEach(line => {
    ctx.fillText(line, 70, bioY);
    bioY += 22;
  });

  // Link (If provided)
  if (userCardData.linkUrl) {
    const linkTitle = userCardData.linkTitle || 'Link';
    const linkText = `🔗 ${linkTitle}: ${userCardData.linkUrl}`;
    ctx.fillStyle = '#5865F2';
    ctx.font = '14px sans-serif';
    let displayLink = linkText;
    if (ctx.measureText(displayLink).width > width - 140) {
      while (ctx.measureText(displayLink + '...').width > width - 140 && displayLink.length > 0) {
        displayLink = displayLink.slice(0, -1);
      }
      displayLink += '...';
    }
    ctx.fillText(displayLink, 70, box3Y + 106);
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateMemberCardCanvas
};
