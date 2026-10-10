const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const { DIVISIONS } = require('./orgHelper');

const LOGO_PATH = path.join(process.cwd(), 'src', 'assets', 'qumpruy_logo.jpg');
const FONT_FAMILY = '"Segoe UI", "Segoe UI Emoji", Roboto, Arial, sans-serif';

/**
 * Helper untuk load gambar secara aman (file lokal atau URL)
 */
async function loadImgSafe(source) {
  if (!source) return null;
  try {
    if (typeof source === 'string') {
      if (source.startsWith('http://') || source.startsWith('https://')) {
        const res = await fetch(source, { signal: AbortSignal.timeout(4500) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return await loadImage(buf);
      }
      if (fs.existsSync(source)) {
        return await loadImage(source);
      }
    } else if (Buffer.isBuffer(source)) {
      return await loadImage(source);
    }
  } catch (err) {
    console.warn(`[OrgChartGenerator] Gagal load gambar:`, err.message);
  }
  return null;
}

/**
 * Menggambar rounded rectangle path
 */
function drawRoundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Menggambar glassmorphic card dengan border glow
 */
function drawGlassCard(ctx, x, y, w, h, r = 16, borderColor = 'rgba(255,255,255,0.15)', bgColor = 'rgba(15, 17, 35, 0.75)') {
  ctx.save();
  drawRoundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * Truncate teks jika melebihi maxWidth
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
 * Gambar ikon vektor per divisi agar selalu tajam
 */
function drawDivisionIcon(ctx, iconKey, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  switch (iconKey) {
    case 'head_admin': // Lightning
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx - 5, cy + 1);
      ctx.lineTo(cx - 1, cy + 1);
      ctx.lineTo(cx - 3, cy + 8);
      ctx.lineTo(cx + 5, cy - 1);
      ctx.lineTo(cx + 1, cy - 1);
      ctx.closePath();
      ctx.fill();
      break;

    case 'security': // Shield
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 7, cy - 4);
      ctx.lineTo(cx + 7, cy + 2);
      ctx.quadraticCurveTo(cx, cy + 9, cx, cy + 9);
      ctx.quadraticCurveTo(cx, cy + 9, cx - 7, cy + 2);
      ctx.lineTo(cx - 7, cy - 4);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      break;

    case 'admin_tiktok': // Note / Mobile
      ctx.beginPath();
      drawRoundRectPath(ctx, cx - 5, cy - 8, 10, 16, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + 5, 1, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'admin_instagram': // Camera
      ctx.beginPath();
      drawRoundRectPath(ctx, cx - 7, cy - 6, 14, 12, 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'streamer': // Broadcast / Mic
      ctx.beginPath();
      drawRoundRectPath(ctx, cx - 3, cy - 7, 6, 9, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 6, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, cy + 8);
      ctx.moveTo(cx - 4, cy + 8);
      ctx.lineTo(cx + 4, cy + 8);
      ctx.stroke();
      break;

    case 'team_creative': // Palette
    default:
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 2, 1.5, 0, Math.PI * 2);
      ctx.arc(cx + 2, cy - 2, 1.5, 0, Math.PI * 2);
      ctx.arc(cx, cy + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

/**
 * Render satu Name Card Vertikal (Portrait ID Card Tag)
 * Jika user mengunggah gambar name card custom: tampilkan utuh (fit contain/cover di dalam frame vertikal).
 * Jika belum ada name card custom: generate otomatis template ID Card bergaya Cyber Badge.
 */
function drawPortraitIDCard(ctx, {
  customCardImg = null,
  avatarImg = null,
  name = 'Member',
  role = 'Anggota',
  x,
  y,
  w,
  h,
  r = 14,
  accentColor = '#00f2fe',
  isLeader = false
}) {
  ctx.save();

  // 1. Drop shadow & ambient glow kartu
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = isLeader ? 22 : 14;
  drawRoundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = 'rgba(10, 12, 26, 0.85)';
  ctx.fill();
  ctx.restore();

  // 2. Isi Konten Kartu (Clipped)
  ctx.save();
  drawRoundRectPath(ctx, x, y, w, h, r);
  ctx.clip();

  if (customCardImg) {
    // ============================================
    // A. USER MENGUNGGAH GAMBAR NAME CARD UTUH
    // ============================================
    // Hitung aspect ratio agar gambar tampil utuh proporsional tanpa gepeng
    const imgRatio = customCardImg.width / customCardImg.height;
    const cardRatio = w / h;

    let dw = w;
    let dh = h;
    let dx = x;
    let dy = y;

    // Background dasar kartu
    ctx.fillStyle = '#0a0c1a';
    ctx.fillRect(x, y, w, h);

    if (imgRatio > cardRatio) {
      // Gambar lebih lebar: fit width
      dh = w / imgRatio;
      dy = y + (h - dh) / 2;
    } else {
      // Gambar lebih tinggi/portrait: fit height
      dw = h * imgRatio;
      dx = x + (w - dw) / 2;
    }

    ctx.drawImage(customCardImg, dx, dy, dw, dh);

    // Subtle inner glossy gradient overlay di sudut atas
    const gloss = ctx.createLinearGradient(x, y, x, y + h * 0.4);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(x, y, w, h);

  } else {
    // ============================================
    // B. TEMPLATE ID CARD OTOMATIS (FALLBACK)
    // ============================================
    // Background gradient vertikal
    const idBg = ctx.createLinearGradient(x, y, x, y + h);
    idBg.addColorStop(0, '#1c183a');
    idBg.addColorStop(0.3, '#101226');
    idBg.addColorStop(1, '#080914');
    ctx.fillStyle = idBg;
    ctx.fillRect(x, y, w, h);

    // Top Lanyard Clip Hole (Lubang gantung ID Card)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    drawRoundRectPath(ctx, x + w / 2 - 16, y + 8, 32, 6, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Accent line di bawah lanyard hole
    ctx.fillStyle = accentColor;
    ctx.fillRect(x + 14, y + 22, w - 28, 2);

    // Circular Avatar di tengah ID Card
    const avatarR = Math.min(Math.round(w * 0.26), Math.round(h * 0.18));
    const avatarCX = x + w / 2;
    const avatarCY = y + 28 + avatarR + 10;

    // Glowing border di avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarR + 2, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // Clip & Draw avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
    ctx.clip();
    if (avatarImg) {
      ctx.drawImage(avatarImg, avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
    } else {
      const grad = ctx.createLinearGradient(avatarCX - avatarR, avatarCY - avatarR, avatarCX + avatarR, avatarCY + avatarR);
      grad.addColorStop(0, '#2b2353');
      grad.addColorStop(1, '#110e24');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(avatarR * 0.85)}px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((name || '?').substring(0, 2).toUpperCase(), avatarCX, avatarCY);
    }
    ctx.restore();

    // Nama Member
    ctx.save();
    ctx.fillStyle = '#ffffff';
    const nameFontSize = Math.max(12, Math.min(18, Math.round(w * 0.09)));
    ctx.font = `bold ${nameFontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nameY = avatarCY + avatarR + 14;
    ctx.fillText(truncateText(ctx, name, w - 18), avatarCX, nameY);

    // Role Label Badge di ID Card
    const roleY = nameY + nameFontSize + 8;
    const roleFontSize = Math.max(10, Math.min(12, Math.round(w * 0.065)));
    ctx.font = `bold ${roleFontSize}px ${FONT_FAMILY}`;
    const roleText = truncateText(ctx, role || (isLeader ? 'Ketua Umum' : 'Anggota'), w - 24);
    const badgeW = Math.min(w - 18, ctx.measureText(roleText).width + 16);
    const badgeH = roleFontSize + 8;

    drawRoundRectPath(ctx, avatarCX - badgeW / 2, roleY, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = accentColor + '33';
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(roleText, avatarCX, roleY + badgeH / 2);

    // Footer Watermark di ID Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = `bold 9px ${FONT_FAMILY}`;
    ctx.fillText('QUMPRUY ID', avatarCX, y + h - 12);
    ctx.restore();
  }

  ctx.restore(); // Tutup clip

  // 3. Border Luar Kartu
  ctx.save();
  drawRoundRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = isLeader ? 2.5 : 1.8;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/**
 * Generator utama Struktur Organisasi QUMPRUY dengan Name Card Portrait
 * @param {Object} orgData
 * @param {import('discord.js').Guild} [guild]
 * @returns {Promise<Buffer>}
 */
async function generateOrgChartImage(orgData, guild = null) {
  const width = 1920;
  const height = 1440;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // ==========================================
  // 1. BACKGROUND GRADIENT & AMBIENT NEON GLOWS
  // ==========================================
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#060714');
  bgGrad.addColorStop(0.4, '#0a0c20');
  bgGrad.addColorStop(1, '#04040d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Cyber Grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
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

  // Ambient Glows
  const topGlow = ctx.createRadialGradient(width / 2, 280, 20, width / 2, 280, 480);
  topGlow.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
  topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  const blGlow = ctx.createRadialGradient(250, height - 300, 20, 250, height - 300, 500);
  blGlow.addColorStop(0, 'rgba(0, 242, 254, 0.16)');
  blGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = blGlow;
  ctx.fillRect(0, 0, width, height);

  const brGlow = ctx.createRadialGradient(width - 250, height - 300, 20, width - 250, height - 300, 500);
  brGlow.addColorStop(0, 'rgba(225, 48, 108, 0.16)');
  brGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = brGlow;
  ctx.fillRect(0, 0, width, height);

  // ==========================================
  // 2. HEADER
  // ==========================================
  const logoImg = await loadImgSafe(LOGO_PATH);
  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(110, 75, 38, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, 110 - 38, 75 - 38, 76, 76);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(110, 75, 40, 0, Math.PI * 2);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  // Header Title
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 36px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
  ctx.shadowBlur = 15;
  ctx.fillText('STRUKTUR ORGANISASI', logoImg ? 165 : 90, 68);

  // Subtitle with neon cyan bullet
  const subX = logoImg ? 165 : 90;
  ctx.fillStyle = '#00f2fe';
  ctx.beginPath();
  ctx.arc(subX + 4, 90, 4, 0, Math.PI * 2);
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 8;
  ctx.fill();

  ctx.font = `bold 15px ${FONT_FAMILY}`;
  const communityTitle = (orgData.title || 'QUMPRUY').toUpperCase() + ' COMMUNITY & CLUB';
  ctx.fillText(communityTitle, subX + 16, 95);
  ctx.restore();

  // Top Right Tag
  ctx.save();
  drawGlassCard(ctx, width - 290, 45, 200, 45, 22, 'rgba(168, 85, 247, 0.4)', 'rgba(25, 20, 48, 0.6)');
  ctx.fillStyle = '#c084fc';
  ctx.font = `bold 13px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OFFICIAL ID CARD DIRECTORY', width - 190, 68);
  ctx.restore();

  // Header Divider
  ctx.save();
  const lineGrad = ctx.createLinearGradient(90, 115, width - 90, 115);
  lineGrad.addColorStop(0, 'rgba(0, 242, 254, 0.8)');
  lineGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.8)');
  lineGrad.addColorStop(1, 'rgba(225, 48, 108, 0.8)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 115);
  ctx.lineTo(width - 90, 115);
  ctx.stroke();
  ctx.restore();

  // ==========================================
  // 3. TOP SECTION: KETUA (PORTRAIT NAME CARD)
  // ==========================================
  const leaderCardW = 230;
  const leaderCardH = 320;
  const leaderCardX = (width - leaderCardW) / 2;
  const leaderCardY = 175;

  // Crown Badge di atas Kartu Ketua
  ctx.save();
  const crownBadgeY = leaderCardY - 32;
  drawRoundRectPath(ctx, width / 2 - 75, crownBadgeY, 150, 28, 14);
  ctx.fillStyle = 'rgba(168, 85, 247, 0.45)';
  ctx.fill();
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 10;
  ctx.stroke();

  // Mini Golden Crown Vektor
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  const crownX = width / 2 - 46;
  const crownY = crownBadgeY + 14;
  ctx.moveTo(crownX - 7, crownY + 4);
  ctx.lineTo(crownX - 7, crownY - 3);
  ctx.lineTo(crownX - 3, crownY);
  ctx.lineTo(crownX, crownY - 5);
  ctx.lineTo(crownX + 3, crownY);
  ctx.lineTo(crownX + 7, crownY - 3);
  ctx.lineTo(crownX + 7, crownY + 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 12px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('KETUA UMUM', width / 2 - 32, crownBadgeY + 14);
  ctx.restore();

  // Load foto/card ketua
  const leader = orgData.leader;
  let leaderCustomCard = null;
  let leaderAvatar = null;

  if (leader?.photoPath) {
    leaderCustomCard = await loadImgSafe(leader.photoPath);
  }
  if (!leaderCustomCard && leader?.userId && guild) {
    try {
      const m = guild.members.cache.get(leader.userId) || await guild.members.fetch(leader.userId).catch(() => null);
      if (m) {
        leaderAvatar = await loadImgSafe(m.user.displayAvatarURL({ extension: 'png', size: 256 }));
      }
    } catch (_) {}
  }

  // Draw Ketua Portrait Card
  drawPortraitIDCard(ctx, {
    customCardImg: leaderCustomCard,
    avatarImg: leaderAvatar,
    name: leader?.name || 'Ketua Umum',
    role: leader?.roleTitle || 'Leader',
    x: leaderCardX,
    y: leaderCardY,
    w: leaderCardW,
    h: leaderCardH,
    r: 16,
    accentColor: '#00f2fe',
    isLeader: true
  });

  // ==========================================
  // 4. CONNECTING HIERARCHY LINES
  // ==========================================
  const colCenters = [370, 960, 1550]; // Pusat horizontal 3 kolom
  const busLineY = 530;
  const leaderBottomY = leaderCardY + leaderCardH;

  ctx.save();
  ctx.strokeStyle = '#00f2fe';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 10;

  // Garis vertikal turun dari Ketua
  ctx.beginPath();
  ctx.moveTo(width / 2, leaderBottomY);
  ctx.lineTo(width / 2, busLineY);
  ctx.stroke();

  // Garis bus horizontal
  ctx.beginPath();
  ctx.moveTo(colCenters[0], busLineY);
  ctx.lineTo(colCenters[2], busLineY);
  ctx.stroke();

  // Garis vertikal turun ke masing-masing kolom divisi
  for (const cx of colCenters) {
    ctx.beginPath();
    ctx.moveTo(cx, busLineY);
    ctx.lineTo(cx, 565);
    ctx.stroke();

    // Node dot di persimpangan
    ctx.beginPath();
    ctx.arc(cx, busLineY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();

  // ==========================================
  // 5. 6 DIVISION CARDS (3 KOLOM x 2 BARIS)
  // ==========================================
  const cardWidth = 560;
  const cardHeight = 400;

  const colX = [90, 680, 1270];
  const rowY = [565, 990];

  const divKeys = [
    ['head_admin', 'security', 'admin_tiktok'],
    ['admin_instagram', 'streamer', 'team_creative']
  ];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const divKey = divKeys[r][c];
      const divConfig = DIVISIONS[divKey];
      const divData = orgData.divisions?.[divKey] || { members: [] };
      const members = divData.members || [];

      const x = colX[c];
      const y = rowY[r];

      // Card Container Body
      drawGlassCard(ctx, x, y, cardWidth, cardHeight, 18, divConfig.color + '44', 'rgba(12, 14, 32, 0.84)');

      // Top glowing accent line
      ctx.save();
      const cardAccentGrad = ctx.createLinearGradient(x, y, x + cardWidth, y);
      cardAccentGrad.addColorStop(0, divConfig.color);
      cardAccentGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
      ctx.strokeStyle = cardAccentGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 18, y);
      ctx.lineTo(x + cardWidth - 18, y);
      ctx.stroke();
      ctx.restore();

      // Header Divisi (Icon Vektor + Nama)
      drawDivisionIcon(ctx, divKey, x + 35, y + 33, divConfig.color);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 18px ${FONT_FAMILY}`;
      ctx.textAlign = 'left';
      ctx.shadowColor = divConfig.color;
      ctx.shadowBlur = 8;
      ctx.fillText(divConfig.name.toUpperCase(), x + 55, y + 39);

      // Member count badge
      const badgeText = `${members.length} ANGGOTA`;
      ctx.font = `bold 11px ${FONT_FAMILY}`;
      const badgeW = ctx.measureText(badgeText).width + 20;
      drawRoundRectPath(ctx, x + cardWidth - badgeW - 20, y + 21, badgeW, 24, 12);
      ctx.fillStyle = members.length > 0 ? divConfig.color + '33' : 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.strokeStyle = members.length > 0 ? divConfig.color : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = members.length > 0 ? divConfig.color : '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, x + cardWidth - badgeW - 20 + badgeW / 2, y + 33);
      ctx.restore();

      // Divider tipis
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 58);
      ctx.lineTo(x + cardWidth - 20, y + 58);
      ctx.stroke();
      ctx.restore();

      // CONTENT NAME CARDS
      const contentStartY = y + 70;
      const contentH = cardHeight - 85;

      if (members.length === 0) {
        // Placeholder jika belum ada anggota
        ctx.save();
        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.font = `italic 15px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Belum ada anggota terdaftar', x + cardWidth / 2, y + cardHeight / 2);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.font = `12px ${FONT_FAMILY}`;
        ctx.fillText('Gunakan /org addmember untuk menambah', x + cardWidth / 2, y + cardHeight / 2 + 25);
        ctx.restore();
      } else if (members.length === 1) {
        // 1 ANGGOTA: 1 Name Card Vertikal Besar di Tengah
        const m = members[0];
        let mCustomCard = null;
        let mAvatar = null;

        if (m.photoPath) {
          mCustomCard = await loadImgSafe(m.photoPath);
        }
        if (!mCustomCard && m.userId && guild) {
          try {
            const memberObj = guild.members.cache.get(m.userId) || await guild.members.fetch(m.userId).catch(() => null);
            if (memberObj) {
              mAvatar = await loadImgSafe(memberObj.user.displayAvatarURL({ extension: 'png', size: 256 }));
            }
          } catch (_) {}
        }

        const cardW = 200;
        const cardH = 290;
        const cardX = x + (cardWidth - cardW) / 2;
        const cardY = contentStartY + (contentH - cardH) / 2;

        drawPortraitIDCard(ctx, {
          customCardImg: mCustomCard,
          avatarImg: mAvatar,
          name: m.name,
          role: m.roleDetail,
          x: cardX,
          y: cardY,
          w: cardW,
          h: cardH,
          r: 14,
          accentColor: divConfig.color,
          isLeader: false
        });

      } else if (members.length === 2) {
        // 2 ANGGOTA: 2 Name Card Vertikal Bersebelahan
        const cardW = 180;
        const cardH = 270;
        const gap = 30;
        const totalW = cardW * 2 + gap;
        const startX = x + (cardWidth - totalW) / 2;
        const cardY = contentStartY + (contentH - cardH) / 2;

        for (let idx = 0; idx < 2; idx++) {
          const m = members[idx];
          let mCustomCard = null;
          let mAvatar = null;

          if (m.photoPath) {
            mCustomCard = await loadImgSafe(m.photoPath);
          }
          if (!mCustomCard && m.userId && guild) {
            try {
              const memberObj = guild.members.cache.get(m.userId) || await guild.members.fetch(m.userId).catch(() => null);
              if (memberObj) {
                mAvatar = await loadImgSafe(memberObj.user.displayAvatarURL({ extension: 'png', size: 256 }));
              }
            } catch (_) {}
          }

          const curX = startX + idx * (cardW + gap);
          drawPortraitIDCard(ctx, {
            customCardImg: mCustomCard,
            avatarImg: mAvatar,
            name: m.name,
            role: m.roleDetail,
            x: curX,
            y: cardY,
            w: cardW,
            h: cardH,
            r: 12,
            accentColor: divConfig.color,
            isLeader: false
          });
        }

      } else {
        // 3 atau lebih ANGGOTA: 3 Name Card Bersebelahan
        const maxShown = Math.min(members.length, 3);
        const cardW = 150;
        const cardH = 240;
        const gap = 16;
        const totalW = cardW * maxShown + gap * (maxShown - 1);
        const startX = x + (cardWidth - totalW) / 2;
        const cardY = contentStartY + (contentH - cardH) / 2 - 8;

        for (let idx = 0; idx < maxShown; idx++) {
          const m = members[idx];
          let mCustomCard = null;
          let mAvatar = null;

          if (m.photoPath) {
            mCustomCard = await loadImgSafe(m.photoPath);
          }
          if (!mCustomCard && m.userId && guild) {
            try {
              const memberObj = guild.members.cache.get(m.userId) || await guild.members.fetch(m.userId).catch(() => null);
              if (memberObj) {
                mAvatar = await loadImgSafe(memberObj.user.displayAvatarURL({ extension: 'png', size: 256 }));
              }
            } catch (_) {}
          }

          const curX = startX + idx * (cardW + gap);
          drawPortraitIDCard(ctx, {
            customCardImg: mCustomCard,
            avatarImg: mAvatar,
            name: m.name,
            role: m.roleDetail,
            x: curX,
            y: cardY,
            w: cardW,
            h: cardH,
            r: 11,
            accentColor: divConfig.color,
            isLeader: false
          });
        }

        if (members.length > 3) {
          ctx.save();
          ctx.fillStyle = '#cbd5e1';
          ctx.font = `italic 11px ${FONT_FAMILY}`;
          ctx.textAlign = 'right';
          ctx.fillText(`+${members.length - 3} anggota lainnya`, x + cardWidth - 25, y + cardHeight - 10);
          ctx.restore();
        }
      }
    }
  }

  // ==========================================
  // 6. FOOTER WATERMARK
  // ==========================================
  ctx.save();
  ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
  ctx.font = `12px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('• QUMPRUY OFFICIAL DISCORD COMMUNITY • GENERATED VIA /ORG SHOW •', width / 2, height - 20);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

/**
 * Generator gambar detail satu divisi saja — ukuran besar dan jelas
 * Digunakan oleh Select Menu dropdown di /org show
 * @param {Object} orgData
 * @param {string} divisionKey
 * @param {import('discord.js').Guild} [guild]
 * @returns {Promise<Buffer>}
 */
async function generateDivisionDetailImage(orgData, divisionKey, guild = null) {
  const divConfig = DIVISIONS[divisionKey];
  if (!divConfig) throw new Error(`Divisi '${divisionKey}' tidak valid.`);

  const divData = orgData.divisions?.[divisionKey] || { members: [] };
  const members = divData.members || [];

  const width = 1200;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#060714');
  bgGrad.addColorStop(0.4, '#0a0c20');
  bgGrad.addColorStop(1, '#04040d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
  ctx.lineWidth = 1;
  const gridSize = 35;
  for (let gx = 0; gx < width; gx += gridSize) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
  }
  ctx.restore();

  // Ambient glow menggunakan warna divisi
  const ambientGlow = ctx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, 500);
  ambientGlow.addColorStop(0, divConfig.color + '30');
  ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(0, 0, width, height);

  // ==========================================
  // HEADER DIVISI
  // ==========================================
  // Icon divisi besar
  drawDivisionIcon(ctx, divisionKey, 70, 55, divConfig.color);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 32px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.shadowColor = divConfig.color;
  ctx.shadowBlur = 14;
  ctx.fillText(divConfig.name.toUpperCase(), 100, 64);

  // Badge anggota
  const countBadge = `${members.length} ANGGOTA`;
  ctx.font = `bold 14px ${FONT_FAMILY}`;
  const cbW = ctx.measureText(countBadge).width + 28;
  drawRoundRectPath(ctx, width - cbW - 50, 38, cbW, 34, 17);
  ctx.fillStyle = divConfig.color + '33';
  ctx.fill();
  ctx.strokeStyle = divConfig.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = divConfig.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(countBadge, width - cbW / 2 - 50, 55);
  ctx.restore();

  // Divider
  ctx.save();
  const divGrad = ctx.createLinearGradient(50, 90, width - 50, 90);
  divGrad.addColorStop(0, divConfig.color);
  divGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 90);
  ctx.lineTo(width - 50, 90);
  ctx.stroke();
  ctx.restore();

  // ==========================================
  // MEMBER CARDS — Ukuran Besar dan Jelas
  // ==========================================
  const contentStartY = 120;
  const contentH = height - contentStartY - 50;

  if (members.length === 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = `italic 22px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Belum ada anggota terdaftar di divisi ini', width / 2, height / 2);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.font = `16px ${FONT_FAMILY}`;
    ctx.fillText('Gunakan /org addmember untuk menambahkan anggota', width / 2, height / 2 + 40);
    ctx.restore();
  } else {
    // Hitung layout: max 5 kartu per baris, kartu besar
    const maxPerRow = Math.min(members.length, 4);
    const rows = Math.ceil(members.length / maxPerRow);
    const gap = 28;
    const cardW = Math.min(240, (width - 100 - gap * (maxPerRow - 1)) / maxPerRow);
    const cardH = Math.min(380, (contentH - gap * (rows - 1)) / rows);

    for (let i = 0; i < members.length; i++) {
      const row = Math.floor(i / maxPerRow);
      const col = i % maxPerRow;
      const membersInThisRow = Math.min(maxPerRow, members.length - row * maxPerRow);
      const totalRowW = membersInThisRow * cardW + (membersInThisRow - 1) * gap;
      const startX = (width - totalRowW) / 2;

      const cx = startX + col * (cardW + gap);
      const cy = contentStartY + row * (cardH + gap) + (contentH - rows * cardH - (rows - 1) * gap) / 2;

      const m = members[i];
      let mCustomCard = null;
      let mAvatar = null;

      if (m.photoPath) {
        mCustomCard = await loadImgSafe(m.photoPath);
      }
      if (!mCustomCard && m.userId && guild) {
        try {
          const memberObj = guild.members.cache.get(m.userId) || await guild.members.fetch(m.userId).catch(() => null);
          if (memberObj) {
            mAvatar = await loadImgSafe(memberObj.user.displayAvatarURL({ extension: 'png', size: 256 }));
          }
        } catch (_) {}
      }

      drawPortraitIDCard(ctx, {
        customCardImg: mCustomCard,
        avatarImg: mAvatar,
        name: m.name,
        role: m.roleDetail,
        x: cx,
        y: cy,
        w: cardW,
        h: cardH,
        r: 16,
        accentColor: divConfig.color,
        isLeader: false
      });
    }
  }

  // Footer
  ctx.save();
  ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${divConfig.icon} ${divConfig.name.toUpperCase()} — QUMPRUY ORGANIZATION`, width / 2, height - 18);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateOrgChartImage,
  generateDivisionDetailImage
};
