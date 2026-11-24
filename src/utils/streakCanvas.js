const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * 7 Tingkatan (Tiers) Evolusi Api Streak
 * Dirancang elegan dengan palet warna mewah, bukan warna mencolok/norak.
 */
const STREAK_TIERS = [
  {
    id: 1,
    minDays: 1,
    maxDays: 3,
    name: 'EMBER',
    tierLabel: 'TIER I',
    color: '#F59E0B',          // Warm Amber
    secondaryColor: '#B45309',
    coreColor: '#FEF3C7',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    description: 'Percikan Bara Awal',
    nextTierDays: 4
  },
  {
    id: 2,
    minDays: 4,
    maxDays: 7,
    name: 'BLAZE',
    tierLabel: 'TIER II',
    color: '#FF643D',          // Vivid Flame Orange
    secondaryColor: '#C2410C',
    coreColor: '#FFEDD5',
    glowColor: 'rgba(255, 100, 61, 0.52)',
    description: 'Kobaran Api Menghangat',
    nextTierDays: 8
  },
  {
    id: 3,
    minDays: 8,
    maxDays: 14,
    name: 'CRIMSON INFERNO',
    tierLabel: 'TIER III',
    color: '#E11D48',          // Ruby Crimson
    secondaryColor: '#9F1239',
    coreColor: '#FFE4E6',
    glowColor: 'rgba(225, 29, 72, 0.58)',
    description: 'Inferno Membara Pekat',
    nextTierDays: 15
  },
  {
    id: 4,
    minDays: 15,
    maxDays: 29,
    name: 'AZURE FLARE',
    tierLabel: 'TIER IV',
    color: '#06B6D4',          // Electric Cyan & Royal Sapphire (Api Biru terpanas)
    secondaryColor: '#2563EB',
    coreColor: '#E0F2FE',
    glowColor: 'rgba(6, 182, 212, 0.62)',
    description: 'Api Biru Bersuhu Ekstrem',
    nextTierDays: 30
  },
  {
    id: 5,
    minDays: 30,
    maxDays: 59,
    name: 'AMETHYST ECLIPSE',
    tierLabel: 'TIER V',
    color: '#A855F7',          // Royal Violet / Mystic Purple
    secondaryColor: '#6D28D9',
    coreColor: '#F3E8FF',
    glowColor: 'rgba(168, 85, 247, 0.68)',
    description: 'Gerhana Mistik Api Ungu',
    nextTierDays: 60
  },
  {
    id: 6,
    minDays: 60,
    maxDays: 99,
    name: 'SOLAR RADIANCE',
    tierLabel: 'TIER VI',
    color: '#FBBF24',          // Radiant Pure Gold
    secondaryColor: '#D97706',
    coreColor: '#FFFBEB',
    glowColor: 'rgba(251, 191, 36, 0.78)',
    description: 'Cahaya Surya Emas Murni',
    nextTierDays: 100
  },
  {
    id: 7,
    minDays: 100,
    maxDays: Infinity,
    name: 'CELESTIAL SUPERNOVA',
    tierLabel: 'TIER VII',
    color: '#38BDF8',          // Prismatic Divine
    secondaryColor: '#EC4899',
    coreColor: '#FFFFFF',
    glowColor: 'rgba(255, 255, 255, 0.88)',
    description: 'Api Abadi Supernova Kosmis',
    nextTierDays: null
  }
];

/**
 * Dapatkan objek tier berdasarkan jumlah hari streak
 */
function getStreakTier(days) {
  const d = Math.max(1, parseInt(days, 10) || 1);
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (d >= STREAK_TIERS[i].minDays) return STREAK_TIERS[i];
  }
  return STREAK_TIERS[0];
}

/**
 * Download avatar buffer dengan timeout aman
 */
async function fetchImageBuffer(url, timeoutMs = 3500) {
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'DiscordBot/1.0',
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
 * Gambar persegi panjang dengan sudut membulat (Rounded Rectangle)
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
 * Gambar ilustrasi api vektor multi-layer dengan aura & partikel elegan
 */
function drawVectorFlame(ctx, cx, cy, scale, tier) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // 1. Ambient Glow di belakang api
  const radialGlow = ctx.createRadialGradient(0, -30, 10, 0, -30, 95);
  radialGlow.addColorStop(0, tier.glowColor);
  radialGlow.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.beginPath();
  ctx.arc(0, -30, 95, 0, Math.PI * 2);
  ctx.fill();

  // Tier 7: Halo / Orbital Rings
  if (tier.id === 7) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -30, 80, 26, -Math.PI / 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, -30, 80, 26, Math.PI / 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Layer Luar Api (Outer Silhouette)
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.bezierCurveTo(26, -62, 50, -42, 50, -10);
  ctx.bezierCurveTo(50, 26, 26, 46, 0, 46);
  ctx.bezierCurveTo(-26, 46, -50, 26, -50, -10);
  ctx.bezierCurveTo(-50, -42, -26, -62, 0, -92);
  ctx.closePath();

  const outerGrad = ctx.createLinearGradient(0, -92, 0, 46);
  outerGrad.addColorStop(0, tier.color);
  outerGrad.addColorStop(0.7, tier.secondaryColor);
  outerGrad.addColorStop(1, '#0b0d14');
  ctx.fillStyle = outerGrad;
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 24;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 3. Layer Tengah Api (Mid Flame)
  ctx.beginPath();
  ctx.moveTo(0, -68);
  ctx.bezierCurveTo(19, -42, 33, -26, 33, -6);
  ctx.bezierCurveTo(33, 21, 19, 36, 0, 36);
  ctx.bezierCurveTo(-19, 36, -33, 21, -33, -6);
  ctx.bezierCurveTo(-33, -26, -19, -42, 0, -68);
  ctx.closePath();

  const midGrad = ctx.createLinearGradient(0, -68, 0, 36);
  midGrad.addColorStop(0, tier.coreColor);
  midGrad.addColorStop(0.5, tier.color);
  midGrad.addColorStop(1, tier.secondaryColor);
  ctx.fillStyle = midGrad;
  ctx.fill();

  // 4. Inti Putih Terang Api (Inner Hot Core)
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.bezierCurveTo(11, -21, 19, -11, 19, 4);
  ctx.bezierCurveTo(19, 21, 11, 29, 0, 29);
  ctx.bezierCurveTo(-11, 29, -19, 21, -19, 4);
  ctx.bezierCurveTo(-19, -11, -11, -21, 0, -36);
  ctx.closePath();

  const innerGrad = ctx.createLinearGradient(0, -36, 0, 29);
  innerGrad.addColorStop(0, '#FFFFFF');
  innerGrad.addColorStop(0.65, tier.coreColor);
  innerGrad.addColorStop(1, tier.color);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // 5. Partikel Bara / Percikan Api (Spark Embers)
  const particles = [
    { x: -36, y: -52, r: 2.2, a: 0.8 },
    { x: 39, y: -46, r: 2.5, a: 0.85 },
    { x: -19, y: -82, r: 1.8, a: 0.75 },
    { x: 21, y: -88, r: 2.0, a: 0.85 },
    { x: 0, y: -108, r: 2.6, a: 0.95 },
    { x: -46, y: -16, r: 1.6, a: 0.6 },
    { x: 44, y: -12, r: 1.7, a: 0.6 }
  ];

  for (const p of particles) {
    ctx.fillStyle = tier.coreColor;
    ctx.globalAlpha = p.a;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  ctx.restore();
}

/**
 * Render Kartu User (Avatar bundar + glow + nama + status)
 */
async function drawUserBlock(ctx, { x, y, user, tierColor }) {
  const avatarCenter = { x: x + 44, y: y + 44 };
  const avatarRadius = 42;

  ctx.save();

  // Avatar Glowing Ring
  ctx.beginPath();
  ctx.arc(avatarCenter.x, avatarCenter.y, avatarRadius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = tierColor;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Base background lingkaran avatar
  ctx.beginPath();
  ctx.arc(avatarCenter.x, avatarCenter.y, avatarRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#161B26';
  ctx.fill();

  // Load avatar image jika ada
  let avatarLoaded = false;
  if (user.avatarUrl) {
    const avatarBuf = await fetchImageBuffer(user.avatarUrl);
    if (avatarBuf) {
      try {
        const img = await loadImage(avatarBuf);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCenter.x, avatarCenter.y, avatarRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, avatarCenter.x - avatarRadius, avatarCenter.y - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        ctx.restore();
        avatarLoaded = true;
      } catch (_) {}
    }
  }

  // Jika avatar gagal / tidak ada, gambar inisial nama
  if (!avatarLoaded) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 28px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText((user.name || 'U').charAt(0).toUpperCase(), avatarCenter.x, avatarCenter.y);
  }

  // Nama User & Username Tag
  const textX = x + 102;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Display Name
  ctx.font = '700 18px "Segoe UI", sans-serif';
  ctx.fillStyle = '#F0F6FC';
  const rawName = user.name || 'Partner';
  const displayName = rawName.length > 13 ? rawName.slice(0, 12) + '…' : rawName;
  ctx.fillText(displayName, textX, y + 32);

  // Username Tag
  ctx.font = '500 13px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8B949E';
  const rawTag = user.tag || 'user';
  const displayTag = rawTag.length > 15 ? rawTag.slice(0, 14) + '…' : rawTag;
  ctx.fillText(`@${displayTag}`, textX, y + 51);

  // Status Badge Pill
  const statusPillW = 88;
  const statusPillH = 20;
  drawRoundedRect(ctx, textX, y + 59, statusPillW, statusPillH, 10);
  ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '700 9px "Segoe UI", sans-serif';
  ctx.fillStyle = '#4ADE80';
  ctx.fillText('MENYALA', textX + 18, y + 72);

  ctx.restore();
}

/**
 * Generator Utama: Render Banner Streak Lebar & Elegan (1080 x 400 px)
 *
 * @param {Object} options
 * @param {number} options.days - Jumlah hari streak aktif
 * @param {Object} options.user1 - Data user 1 { name, tag, avatarUrl }
 * @param {Object} options.user2 - Data user 2 { name, tag, avatarUrl }
 * @param {string} options.timezone - WIB | WITA | WIT
 * @param {string} options.statusText - Label status di kanan bawah
 * @returns {Promise<Buffer>} PNG Buffer
 */
async function generateStreakBanner({
  days = 1,
  user1 = { name: 'User 1', tag: 'user1', avatarUrl: null },
  user2 = { name: 'User 2', tag: 'user2', avatarUrl: null },
  timezone = 'WIB',
  statusText = 'AKTIF • HARI INI MENYALA'
}) {
  const width = 1080;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const tier = getStreakTier(days);

  // 1. Base Obsidian Background
  ctx.fillStyle = '#090B10';
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Tech Grid Pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
  ctx.lineWidth = 1;
  const gridSize = 36;
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

  // 3. Ambient Tier Radial Lights (Pusat Api)
  const centerGlow = ctx.createRadialGradient(width / 2, height / 2 - 20, 20, width / 2, height / 2 - 20, 290);
  centerGlow.addColorStop(0, tier.glowColor);
  centerGlow.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
  centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, width, height);

  // 4. Main Glassmorphism Container Card
  const margin = 20;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  ctx.save();
  drawRoundedRect(ctx, margin, margin, cardW, cardH, 24);
  const cardGrad = ctx.createLinearGradient(margin, margin, margin + cardW, margin + cardH);
  cardGrad.addColorStop(0, 'rgba(23, 27, 42, 0.88)');
  cardGrad.addColorStop(0.5, 'rgba(15, 17, 26, 0.92)');
  cardGrad.addColorStop(1, 'rgba(10, 12, 19, 0.96)');
  ctx.fillStyle = cardGrad;
  ctx.fill();

  // Subtle Metallic Border
  const borderGrad = ctx.createLinearGradient(margin, margin, margin + cardW, margin);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  borderGrad.addColorStop(0.5, tier.color);
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // 5. Header Bar (Top Label)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8B949E';
  ctx.font = '600 11px "Segoe UI", sans-serif';
  ctx.fillText('FLAME STREAK SYSTEM  •  KONEKSI HARIAN', width / 2, margin + 28);
  ctx.restore();

  // 6. Draw Center Vector Flame
  drawVectorFlame(ctx, width / 2, height / 2 - 35, 0.85, tier);

  // 7. Center Counter & Tier Badge
  ctx.save();
  ctx.textAlign = 'center';

  // Day count number
  ctx.font = '800 48px "Segoe UI", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 12;
  ctx.fillText(String(days), width / 2, height / 2 + 50);
  ctx.shadowBlur = 0;

  // "HARI BERTURUT-TURUT" Label
  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.fillStyle = tier.color;
  ctx.fillText('HARI BERTURUT-TURUT', width / 2, height / 2 + 66);

  // Tier Pill Badge
  const pillW = 200;
  const pillH = 26;
  const pillX = (width - pillW) / 2;
  const pillY = height / 2 + 78;

  ctx.save();
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 13);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();
  ctx.strokeStyle = tier.color;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = '700 11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${tier.tierLabel} • ${tier.name}`, width / 2, pillY + 17);
  ctx.restore();

  // Progress Bar to Next Tier
  if (tier.nextTierDays) {
    const prevDays = tier.minDays;
    const targetDays = tier.nextTierDays;
    const progress = Math.min(1, Math.max(0, (days - prevDays) / (targetDays - prevDays)));

    const progW = 220;
    const progH = 5;
    const progX = (width - progW) / 2;
    const progY = pillY + 34;

    // Track
    drawRoundedRect(ctx, progX, progY, progW, progH, 2.5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    // Fill
    if (progress > 0) {
      drawRoundedRect(ctx, progX, progY, Math.max(progW * progress, 5), progH, 2.5);
      const progGrad = ctx.createLinearGradient(progX, 0, progX + progW, 0);
      progGrad.addColorStop(0, tier.secondaryColor);
      progGrad.addColorStop(1, tier.color);
      ctx.fillStyle = progGrad;
      ctx.fill();
    }

    ctx.font = '500 10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#6E7681';
    ctx.fillText(`${days}/${targetDays} Hari menuju Tier Berikutnya`, width / 2, progY + 16);
  } else {
    ctx.font = '500 10px "Segoe UI", sans-serif';
    ctx.fillStyle = tier.color;
    ctx.fillText('TINGKAT MAKSIMAL TERCAPAI', width / 2, pillY + 45);
  }
  ctx.restore();

  // 8. User 1 Card (Left Side) & User 2 Card (Right Side)
  await drawUserBlock(ctx, {
    x: margin + 45,
    y: height / 2 - 80,
    user: user1,
    tierColor: tier.color
  });

  await drawUserBlock(ctx, {
    x: width - margin - 45 - 200,
    y: height / 2 - 80,
    user: user2,
    tierColor: tier.color
  });

  // 9. Connecting Dashed Lines between Users & Center
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);

  // Left line
  ctx.beginPath();
  ctx.moveTo(margin + 265, height / 2 - 20);
  ctx.lineTo(width / 2 - 120, height / 2 - 20);
  ctx.stroke();

  // Right line
  ctx.beginPath();
  ctx.moveTo(width / 2 + 120, height / 2 - 20);
  ctx.lineTo(width - margin - 265, height / 2 - 20);
  ctx.stroke();
  ctx.restore();

  // 10. Bottom Information Bar
  const bottomY = height - margin - 28;
  ctx.save();
  ctx.font = '600 11px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8B949E';

  // Left: Zona Waktu & Reset
  ctx.textAlign = 'left';
  const tzOffset = timezone === 'WIB' ? '7' : timezone === 'WITA' ? '8' : '9';
  ctx.fillText(`ZONA WAKTU: ${timezone} (UTC+${tzOffset})   |   RESET: 00:00 ${timezone}`, margin + 35, bottomY);

  // Right: Status Streak
  ctx.textAlign = 'right';
  ctx.fillStyle = tier.color;
  ctx.fillText(`STATUS: ${statusText}`, width - margin - 35, bottomY);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  STREAK_TIERS,
  getStreakTier,
  generateStreakBanner
};
