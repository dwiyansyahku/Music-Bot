const { createCanvas, loadImage } = require('@napi-rs/canvas');
const dns = require('dns');
const https = require('https');
const http = require('http');

// Force IPv4 first globally to bypass Railway/Docker IPv6 DNS delays
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Helper to fetch image buffer with a tight 300ms timeout.
 * Immediately destroys socket on timeout so background rendering NEVER blocks.
 */
function fetchImageBuffer(urlStr, timeoutMs = 300) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.get(parsedUrl, {
        agent: false,
        family: 4,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/png,image/jpeg,image/*;q=0.8'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchImageBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', (err) => reject(err));
      });

      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error(`Avatar fetch timeout (${timeoutMs}ms)`));
      });

      req.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

async function safeLoadImage(url, timeoutMs = 300) {
  if (!url) throw new Error('No URL provided');
  const buffer = await fetchImageBuffer(url, timeoutMs);
  return await loadImage(buffer);
}

/**
 * Helper to draw a rounded rectangle with 100% geometric precision
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
 * Generate 100% Instant HD Landscape Canvas Member Profile Card (1000px x 560px)
 */
async function generateMemberCardCanvas(guild, member, userCardData = {}) {
  const width = 1000;
  const height = 560;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Accent Color (Default matches QP Purple Crown Logo: #8B5CF6)
  const accentColor = userCardData.color || member.roles.color?.hexColor || '#8B5CF6';

  // ============================================================
  // 1. BACKGROUND DRAWING (100% Local QP Royal Purple Theme — 0ms Instant Load)
  // ============================================================
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0B0614');
  bgGrad.addColorStop(0.5, '#1D0D36');
  bgGrad.addColorStop(1, '#08040E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Ambient Purple Glow Circles
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = accentColor;

  ctx.beginPath();
  ctx.arc(160, 100, 270, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(840, 450, 310, 0, Math.PI * 2);
  ctx.fill();

  // Curved Decorative Wave Lines
  ctx.strokeStyle = '#A78BFA';
  ctx.lineWidth = 36;
  ctx.globalAlpha = 0.08;

  ctx.beginPath();
  ctx.moveTo(-50, 180);
  ctx.bezierCurveTo(300, 40, 600, 380, 1050, 140);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-50, 360);
  ctx.bezierCurveTo(400, 480, 700, 80, 1050, 300);
  ctx.stroke();
  ctx.restore();

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

  // Try loading real avatar with ultra-fast 300ms timeout, otherwise draw crisp fallback circle
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatarImg = await safeLoadImage(avatarUrl, 300);

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.lineWidth = 4;
    ctx.strokeStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (err) {
    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((member.displayName || 'U').charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    ctx.restore();

    ctx.lineWidth = 4;
    ctx.strokeStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Display Name
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  let nameFontSize = 36;
  ctx.font = `bold ${nameFontSize}px sans-serif`;
  const nameText = member.displayName;
  const nameX = avatarX + avatarSize + 25;
  const nameY = avatarY + 42;

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

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MEMBER INFO', box1X + 20, containerY + 30);

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
    { label: 'Created', val: formatDate(member.user.createdAt) }
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
      ctx.fillStyle = r.hexColor !== '#000000' ? r.hexColor : '#99AAB5';
      ctx.beginPath();
      ctx.arc(box2X + 26, roleY - 5, 6, 0, Math.PI * 2);
      ctx.fill();

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
  // 4. BOTTOM CONTAINER (BIO & LINK TITLE + URL)
  // ============================================================
  const box3Y = containerY + containerH + 18;
  const box3H = 125;
  drawGlassBox(50, box3Y, width - 100, box3H);

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

  if (userCardData.linkUrl) {
    const linkTitle = userCardData.linkTitle || 'Link';
    const linkText = `${linkTitle.toUpperCase()}: ${userCardData.linkUrl}`;
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 14px sans-serif';
    let displayLink = linkText;
    if (ctx.measureText(displayLink).width > width - 140) {
      while (ctx.measureText(displayLink + '...').width > width - 140 && displayLink.length > 0) {
        displayLink = displayLink.slice(0, -1);
      }
      displayLink += '...';
    }
    ctx.fillText(displayLink, 70, box3Y + 106);
  }

  return canvas.toBuffer('image/jpeg');
}

module.exports = {
  generateMemberCardCanvas
};
