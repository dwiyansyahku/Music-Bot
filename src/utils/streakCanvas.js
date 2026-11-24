const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');

// Daftarkan font sistem Windows untuk mendukung semua jenis font, simbol, dan unicode
if (typeof GlobalFonts !== 'undefined' && GlobalFonts.registerFromPath) {
  const systemFonts = [
    'C:\\Windows\\Fonts\\seguisym.ttf', // Segoe UI Symbol (Simbol, Karakter Unik, Dingbats)
    'C:\\Windows\\Fonts\\seguiemj.ttf', // Segoe UI Emoji (Emoji)
    'C:\\Windows\\Fonts\\seguihis.ttf', // Segoe UI Historic
    'C:\\Windows\\Fonts\\cambria.ttc',  // Cambria Math (Simbol Matematika)
    'C:\\Windows\\Fonts\\arial.ttf',    // Arial
    'C:\\Windows\\Fonts\\msyh.ttc',     // Microsoft YaHei (Asia Timur / CJK)
    'C:\\Windows\\Fonts\\malgun.ttf'    // Malgun Gothic (Korea)
  ];
  for (const fp of systemFonts) {
    if (fs.existsSync(fp)) {
      try {
        GlobalFonts.registerFromPath(fp);
      } catch (_) {}
    }
  }
}

// Rantai font fallback lengkap agar support semua teks, simbol, dan font estetik
const FONT_FALLBACK = '"Segoe UI", "Segoe UI Symbol", "Segoe UI Emoji", "Segoe UI Historic", "Cambria Math", "Microsoft YaHei", "Arial", sans-serif';

/**
 * Normalisasi nama pengguna agar font estetik / fancy text generator (seperti font gothic, cursive,
 * bold math symbols) dapat ter-render 100% sempurna tanpa kotak tofu (0000 00...).
 */
function formatDisplayName(name, maxLen = 32) {
  if (!name) return 'Partner';
  // Decompose unicode mathematical symbols & decorative scripts ke huruf alfabet aslinya
  let cleaned = name.normalize('NFKD');
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  if (!cleaned) return 'Partner';
  // Gunakan Array.from agar pemotongan string aman untuk surrogate pairs & unicode graphemes
  const chars = Array.from(cleaned);
  return chars.length > maxLen ? chars.slice(0, maxLen - 1).join('') + '…' : cleaned;
}

/**
 * Pecah teks ke beberapa baris agar tidak melebihi maxWidth pixel pada canvas.
 * Mengembalikan array string per baris.
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

/**
 * 7 Tingkatan (Tiers) Evolusi Api Streak
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

const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 300, 365];

function isMilestoneDay(days) {
  const d = parseInt(days, 10) || 0;
  if (d <= 0) return false;
  if (STREAK_MILESTONES.includes(d)) return true;
  return d > 365 && d % 100 === 0;
}

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
  const radialGlow = ctx.createRadialGradient(0, -35, 10, 0, -35, 110);
  radialGlow.addColorStop(0, tier.glowColor);
  radialGlow.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.beginPath();
  ctx.arc(0, -35, 110, 0, Math.PI * 2);
  ctx.fill();

  // Tier 5 ke atas: Halo / Orbital Rings
  if (tier.id >= 5) {
    ctx.strokeStyle = tier.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -35, 95, 30, -Math.PI / 8, 0, Math.PI * 2);
    ctx.stroke();

    if (tier.id === 7) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, -35, 95, 30, Math.PI / 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 2. Layer Luar Api (Outer Silhouette)
  ctx.beginPath();
  ctx.moveTo(0, -100);
  ctx.bezierCurveTo(28, -68, 55, -45, 55, -10);
  ctx.bezierCurveTo(55, 30, 28, 50, 0, 50);
  ctx.bezierCurveTo(-28, 50, -55, 30, -55, -10);
  ctx.bezierCurveTo(-55, -45, -28, -68, 0, -100);
  ctx.closePath();

  const outerGrad = ctx.createLinearGradient(0, -100, 0, 50);
  outerGrad.addColorStop(0, tier.color);
  outerGrad.addColorStop(0.7, tier.secondaryColor);
  outerGrad.addColorStop(1, '#090b10');
  ctx.fillStyle = outerGrad;
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 28;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 3. Layer Tengah Api (Mid Flame)
  ctx.beginPath();
  ctx.moveTo(0, -75);
  ctx.bezierCurveTo(22, -45, 38, -28, 38, -6);
  ctx.bezierCurveTo(38, 24, 22, 40, 0, 40);
  ctx.bezierCurveTo(-22, 40, -38, 24, -38, -6);
  ctx.bezierCurveTo(-38, -28, -22, -45, 0, -75);
  ctx.closePath();

  const midGrad = ctx.createLinearGradient(0, -75, 0, 40);
  midGrad.addColorStop(0, tier.coreColor);
  midGrad.addColorStop(0.5, tier.color);
  midGrad.addColorStop(1, tier.secondaryColor);
  ctx.fillStyle = midGrad;
  ctx.fill();

  // 4. Inti Putih Terang Api (Inner Hot Core)
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.bezierCurveTo(13, -24, 22, -12, 22, 4);
  ctx.bezierCurveTo(22, 24, 13, 32, 0, 32);
  ctx.bezierCurveTo(-13, 32, -22, 24, -22, 4);
  ctx.bezierCurveTo(-22, -12, -13, -24, 0, -42);
  ctx.closePath();

  const innerGrad = ctx.createLinearGradient(0, -42, 0, 32);
  innerGrad.addColorStop(0, '#FFFFFF');
  innerGrad.addColorStop(0.65, tier.coreColor);
  innerGrad.addColorStop(1, tier.color);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  // 5. Partikel Bara / Percikan Api (Spark Embers)
  const particles = [
    { x: -40, y: -60, r: 2.5, a: 0.8 },
    { x: 44, y: -52, r: 2.8, a: 0.85 },
    { x: -22, y: -92, r: 2.0, a: 0.75 },
    { x: 24, y: -98, r: 2.2, a: 0.85 },
    { x: 0, y: -118, r: 2.8, a: 0.95 },
    { x: -50, y: -18, r: 1.8, a: 0.6 },
    { x: 48, y: -14, r: 1.9, a: 0.6 }
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
 * Render Kartu User (Avatar bundar + glow + nama multi-baris + jumlah chat)
 * maxTextWidth menentukan batas lebar piksel sebelum nama di-wrap ke baris baru.
 */
async function drawUserBlock(ctx, { x, y, user, tierColor, maxTextWidth = 220 }) {
  const avatarCenter = { x: x + 48, y: y + 48 };
  const avatarRadius = 46;

  ctx.save();

  // Avatar Glowing Ring
  ctx.beginPath();
  ctx.arc(avatarCenter.x, avatarCenter.y, avatarRadius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = tierColor;
  ctx.shadowBlur = 14;
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
    ctx.font = `700 32px ${FONT_FALLBACK}`;
    ctx.fillStyle = '#FFFFFF';
    const cleanName = formatDisplayName(user.name || 'U', 30);
    const initChar = (cleanName || 'U').charAt(0).toUpperCase();
    ctx.fillText(initChar, avatarCenter.x, avatarCenter.y);
  }

  // Nama User & Username Tag
  const textX = x + 112;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Display Name (Dengan font fallback + normalisasi fancy font + word-wrap)
  ctx.font = `700 20px ${FONT_FALLBACK}`;
  ctx.fillStyle = '#F0F6FC';
  const displayName = formatDisplayName(user.name || 'Partner', 40);
  const nameLines = wrapText(ctx, displayName, maxTextWidth);
  // Render maksimal 2 baris: baris ke-2 font lebih kecil
  const lineHeight = 22;
  for (let i = 0; i < Math.min(nameLines.length, 2); i++) {
    if (i === 1) {
      ctx.font = `600 16px ${FONT_FALLBACK}`;
      ctx.fillStyle = '#C9D1D9';
    }
    let lineText = nameLines[i];
    if (i === 1 && nameLines.length > 2) {
      lineText = lineText + '…';
    }
    ctx.fillText(lineText, textX, y + 32 + i * lineHeight);
  }
  const nameBottomY = y + 32 + (Math.min(nameLines.length, 2) - 1) * lineHeight;

  // Username Tag
  ctx.font = `500 13px ${FONT_FALLBACK}`;
  ctx.fillStyle = '#8B949E';
  const displayTag = formatDisplayName(user.tag || 'user', 24);
  ctx.fillText(`@${displayTag}`, textX, nameBottomY + 20);

  // Chat Count Badge
  const chatPillW = 140;
  const chatPillH = 22;
  const chatPillY = nameBottomY + 30;
  drawRoundedRect(ctx, textX, chatPillY, chatPillW, chatPillH, 11);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `700 11px ${FONT_FALLBACK}`;
  ctx.fillStyle = '#60A5FA';
  const chatCount = user.chatCount !== undefined ? user.chatCount : 0;
  ctx.fillText(`${chatCount.toLocaleString('id-ID')} Chat di Server`, textX + 14, chatPillY + 15);

  ctx.restore();
}

/**
 * Generator Utama: Render Banner Streak Ultra-Wide (1440 x 600 px)
 */
async function generateStreakBanner({
  days = 1,
  user1 = { name: 'User 1', tag: 'user1', avatarUrl: null, chatCount: 0 },
  user2 = { name: 'User 2', tag: 'user2', avatarUrl: null, chatCount: 0 },
  totalPairChats = 0,
  timezone = 'WIB',
  statusText = 'AKTIF • HARI INI MENYALA',
  isMilestone = false
} = {}) {
  const width = 1440;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const tier = getStreakTier(days);
  const milestoneActive = isMilestone || isMilestoneDay(days);

  // 1. Base Obsidian Background
  ctx.fillStyle = '#080A10';
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Tech Grid Pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  // 3. Ambient Tier Radial Lights (Pusat Api)
  const centerGlow = ctx.createRadialGradient(width / 2, height / 2 - 30, 20, width / 2, height / 2 - 30, 360);
  centerGlow.addColorStop(0, tier.glowColor);
  centerGlow.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
  centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, width, height);

  // 4. Main Glassmorphism Container Card
  const margin = 22;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  ctx.save();
  drawRoundedRect(ctx, margin, margin, cardW, cardH, 28);
  const cardGrad = ctx.createLinearGradient(margin, margin, margin + cardW, margin + cardH);
  cardGrad.addColorStop(0, 'rgba(20, 24, 38, 0.90)');
  cardGrad.addColorStop(0.5, 'rgba(13, 16, 26, 0.94)');
  cardGrad.addColorStop(1, 'rgba(8, 10, 18, 0.98)');
  ctx.fillStyle = cardGrad;
  ctx.fill();

  // Subtle Metallic Border
  const borderGrad = ctx.createLinearGradient(margin, margin, margin + cardW, margin);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  borderGrad.addColorStop(0.5, tier.color);
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 5. Header Bar (Top Label)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8B949E';
  ctx.font = `700 12px ${FONT_FALLBACK}`;
  ctx.fillText('FLAME STREAK SYSTEM  •  KONEKSI HARIAN RESMI', width / 2, margin + 34);
  ctx.restore();

  // 6. Draw Center Vector Flame (Skala 1.0)
  drawVectorFlame(ctx, width / 2, height / 2 - 45, 1.0, tier);

  // 7. Center Counter & Tier Badge
  ctx.save();
  ctx.textAlign = 'center';

  // Day count number (Besar & Tebal 58px)
  ctx.font = `800 58px ${FONT_FALLBACK}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = tier.color;
  ctx.shadowBlur = 16;
  ctx.fillText(String(days), width / 2, height / 2 + 55);
  ctx.shadowBlur = 0;

  // "HARI BERTURUT-TURUT" Label
  ctx.font = `700 12px ${FONT_FALLBACK}`;
  ctx.fillStyle = tier.color;
  ctx.fillText('HARI BERTURUT-TURUT', width / 2, height / 2 + 75);

  // Tier Pill Badge
  const pillW = 240;
  const pillH = 30;
  const pillX = (width - pillW) / 2;
  const pillY = height / 2 + 90;

  ctx.save();
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 15);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fill();
  ctx.strokeStyle = tier.color;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = `700 12px ${FONT_FALLBACK}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${tier.tierLabel} • ${tier.name}`, width / 2, pillY + 20);
  ctx.restore();

  // Progress Bar to Next Tier
  if (tier.nextTierDays) {
    const prevDays = tier.minDays;
    const targetDays = tier.nextTierDays;
    const progress = Math.min(1, Math.max(0, (days - prevDays) / (targetDays - prevDays)));

    const progW = 260;
    const progH = 6;
    const progX = (width - progW) / 2;
    const progY = pillY + 40;

    drawRoundedRect(ctx, progX, progY, progW, progH, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    if (progress > 0) {
      drawRoundedRect(ctx, progX, progY, Math.max(progW * progress, 6), progH, 3);
      const progGrad = ctx.createLinearGradient(progX, 0, progX + progW, 0);
      progGrad.addColorStop(0, tier.secondaryColor);
      progGrad.addColorStop(1, tier.color);
      ctx.fillStyle = progGrad;
      ctx.fill();
    }

    ctx.font = `500 11px ${FONT_FALLBACK}`;
    ctx.fillStyle = '#8B949E';
    ctx.fillText(`${days}/${targetDays} Hari menuju Tier Berikutnya`, width / 2, progY + 20);
  } else {
    ctx.font = `500 11px ${FONT_FALLBACK}`;
    ctx.fillStyle = tier.color;
    ctx.fillText('TINGKAT MAKSIMAL TERCAPAI', width / 2, pillY + 45);
  }
  ctx.restore();

  // 8. Milestone Special Seal Banner jika mencapai milestone
  if (milestoneActive) {
    ctx.save();
    const mbW = 560;
    const mbH = 32;
    const mbX = (width - mbW) / 2;
    const mbY = height - margin - 65;

    drawRoundedRect(ctx, mbX, mbY, mbW, mbH, 16);
    const mbGrad = ctx.createLinearGradient(mbX, 0, mbX + mbW, 0);
    mbGrad.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    mbGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.40)');
    mbGrad.addColorStop(1, 'rgba(245, 158, 11, 0.25)');
    ctx.fillStyle = mbGrad;
    ctx.fill();
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = `800 12px ${FONT_FALLBACK}`;
    ctx.fillStyle = '#FDE68A';
    ctx.fillText(`MILESTONE SPESIAL: RESMI MENCAPAI ${days} HARI STREAK`, width / 2, mbY + 21);
    ctx.restore();
  }

  // 9. User 1 Card (Left Side) & User 2 Card (Right Side)
  const userBlockMaxTextW = 250;
  await drawUserBlock(ctx, {
    x: margin + 40,
    y: height / 2 - 95,
    user: user1,
    tierColor: tier.color,
    maxTextWidth: userBlockMaxTextW
  });

  await drawUserBlock(ctx, {
    x: width - margin - 40 - 280,
    y: height / 2 - 95,
    user: user2,
    tierColor: tier.color,
    maxTextWidth: userBlockMaxTextW
  });

  // 10. Connecting Dashed Lines between Users & Center
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);

  ctx.beginPath();
  ctx.moveTo(margin + 350, height / 2 - 20);
  ctx.lineTo(width / 2 - 155, height / 2 - 20);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width / 2 + 155, height / 2 - 20);
  ctx.lineTo(width - margin - 350, height / 2 - 20);
  ctx.stroke();
  ctx.restore();

  // 11. Bottom Information Bar
  const bottomY = height - margin - 22;
  ctx.save();
  ctx.font = `600 12px ${FONT_FALLBACK}`;
  ctx.fillStyle = '#8B949E';

  // Left: Total Obrolan di Discord
  ctx.textAlign = 'left';
  const totalDisplay = (totalPairChats || 0).toLocaleString('id-ID');
  ctx.fillText(`TOTAL OBROLAN BERSAMA: ${totalDisplay} PESAN DI DISCORD`, margin + 35, bottomY);

  // Right: Status Streak
  ctx.textAlign = 'right';
  ctx.fillStyle = tier.color;
  ctx.fillText(`STATUS: ${statusText}`, width - margin - 35, bottomY);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  STREAK_TIERS,
  STREAK_MILESTONES,
  FONT_FALLBACK,
  formatDisplayName,
  wrapText,
  isMilestoneDay,
  getStreakTier,
  generateStreakBanner
};
