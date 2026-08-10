const { createCanvas, loadImage } = require('@napi-rs/canvas');
const dns = require('dns');
const https = require('https');
const http = require('http');

// Force IPv4 first globally to bypass Railway/Docker IPv6 DNS delays
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Helper to fetch image buffer with timeout.
 */
function fetchImageBuffer(urlStr, timeoutMs = 500) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.get(parsedUrl, {
        agent: false,
        family: 4,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

async function safeLoadImage(url, timeoutMs = 500) {
  if (!url) throw new Error('No URL provided');
  const buffer = await fetchImageBuffer(url, timeoutMs);
  return await loadImage(buffer);
}

/**
 * Draw a rounded rectangle path
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
 * Convert hex color string to { r, g, b }
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/**
 * Truncate text with ellipsis if it exceeds maxWidth
 */
function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (ctx.measureText(t + '…').width > maxWidth && t.length > 0) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

/**
 * Generate clean, minimal Member Card image (934×282px)
 * Simple layout: gradient background + accent glow + avatar + name/bio/info
 */
async function generateMemberCardCanvas(guild, member, userCardData = {}) {
  const width = 934;
  const height = 282;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const accentColor = userCardData.color || member.roles.color?.hexColor || '#8B5CF6';
  const { r, g, b } = hexToRgb(accentColor);

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0d0d17');
  bgGrad.addColorStop(1, '#161627');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Accent glow — soft radial in top-right
  const glowGrad = ctx.createRadialGradient(width - 150, 50, 0, width - 150, 50, 350);
  glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
  glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // Accent bottom bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, height - 4, width, 4);

  // Subtle border
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.25)`;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 1, 1, width - 2, height - 2, 16);
  ctx.stroke();

  // ── Avatar ──
  const avatarSize = 100;
  const avatarX = 50;
  const avatarCY = height / 2; // center Y

  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatarImg = await safeLoadImage(avatarUrl, 500);

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, avatarCY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // Fallback circle with initial letter
    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((member.displayName || 'U').charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarCY);
    ctx.restore();
  }

  // Avatar border ring
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarCY, avatarSize / 2 + 3, 0, Math.PI * 2);
  ctx.stroke();

  // ── Text Area ──
  const textX = avatarX + avatarSize + 30;
  const maxTextW = width - textX - 40;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Display Name
  let nameSize = 30;
  ctx.font = `bold ${nameSize}px sans-serif`;
  let nameText = member.displayName;
  while (ctx.measureText(nameText).width > maxTextW && nameSize > 20) {
    nameSize -= 2;
    ctx.font = `bold ${nameSize}px sans-serif`;
  }
  nameText = truncateText(ctx, nameText, maxTextW);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(nameText, textX, 90);

  // @username
  ctx.fillStyle = '#8E94A5';
  ctx.font = '16px sans-serif';
  ctx.fillText(`@${member.user.username}`, textX, 114);

  // Bio
  if (userCardData.bio) {
    ctx.fillStyle = '#C8CCD8';
    ctx.font = '15px sans-serif';
    ctx.fillText(truncateText(ctx, userCardData.bio, maxTextW), textX, 160);
  }

  // Bottom info: Location + Joined
  const parts = [];
  if (userCardData.asal) parts.push(`📍 ${userCardData.asal}`);
  if (member.joinedAt) {
    const joined = member.joinedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    parts.push(`📅 Joined ${joined}`);
  }
  if (parts.length > 0) {
    ctx.fillStyle = '#6B7085';
    ctx.font = '13px sans-serif';
    ctx.fillText(parts.join('  •  '), textX, 232);
  }

  // Server name — bottom right
  ctx.fillStyle = '#3D4155';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(guild.name, width - 20, height - 16);

  return canvas.toBuffer('image/jpeg');
}

module.exports = {
  generateMemberCardCanvas
};