const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Kumpulan kutipan sambutan acak khusus server QUMPRUY (variatif & ramah tongkrongan)
const WELCOME_QUOTES = [
  "Enjoy your stay, have fun chatting, and vibing with the music!",
  "Selamat datang di Qumpruy! Tarik kursi, santai & selamat seru-seruan!",
  "Langsung nimbrung di chatroom atau mabar seru bareng member lainnya!",
  "Semoga betah nongkrong di sini, good vibes only & have a great day!",
  "Akhirnya yang ditunggu mendarat juga, selamat menikmati obrolan di server!",
  "Make yourself at home! Jangan ragu buat nyapa teman-teman di chatroom.",
  "Siap-siap dengerin lagu asik dan seru-seruan bareng keluarga Qumpruy!",
  "Nongkrong santai, ngobrol bebas, no judge, and always positive energy!",
  "Selamat bergabung! Jangan lupa mampir ke voice channel buat kenalan!",
  "Welcome to the family! Semoga harimu di sini menyenangkan dan seru.",
  "Happy to have you here! Yuk langsung kenalan dan temukan teman mabar baru!",
  "Duduk santai, pasang lagu favoritmu, dan nikmati waktu di server Qumpruy!",
  "Tarik kopi, pasang headset, dan nikmati playlist seru di Qumpruy!",
  "Salam kenal! Langsung sapa kawan-kawan di obrolan umum biar makin akrab.",
  "Rebahan santai sambil dengerin musik favorit bareng kawan-kawan.",
  "Datang sebagai tamu, pulang sebagai keluarga. Selamat datang di Qumpruy!",
  "Chill vibes, great music, and friendly chats await you here.",
  "Gas mabar, ngobrol santai, atau sekadar dengerin lagu asik bareng!",
  "Senang bisa ketemu kamu di sini! Semoga betah dan banyak teman baru.",
  "Waktunya rileks dan nikmati suasana santai bareng warga Qumpruy.",
  "Jangan sungkan buat nimbrung di VC atau chit-chat di obrolan umum!",
  "A new friend has arrived! Welcome to our cozy little hangout corner.",
  "Selamat datang! Semoga server ini jadi tempat nongkrong favoritmu.",
  "Vibing, gaming, and chilling — make your best memories here!",
  "Kapan pun butuh tempat santai sehabis aktivitas, Qumpruy selalu terbuka.",
  "Selamat datang kawan! Langsung ambil roles dan ramaikan obrolan!",
  "Pintu selalu terbuka lebar. Have a blast and enjoy the community!",
  "Tempat asik buat berbagi cerita, lagu hits, dan canda tawa sehari-hari.",
  "Welcome to Qumpruy! Siapkan cemilan dan mari mengobrol santai.",
  "Musik on, vibes cool, obrolan seru. Selamat bergabung di server!",
  "Semoga hari-harimu makin ceria dengan nongkrong bareng di sini.",
  "Mulai harimu dengan lagu enak dan obrolan seru di server ini.",
  "Teman baru, cerita baru, dan waktu santai seru menunggumu di sini!",
  "Santai sejenak, tinggalkan penat, mari nikmati musik bersama!",
  "Turn up the volume, grab a drink, and enjoy the community vibes!",
  "Bebas berekspresi, hormati sesama, dan nikmati setiap momen serunya!"
];

/**
 * Unduh buffer gambar dari URL secara aman dengan timeout ketat
 */
async function fetchImageBuffer(url, timeoutMs = 3500) {
  if (!url || typeof url !== 'string') return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'DiscordBot (https://discord.js.org, 14.26.4)',
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

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawPixelDot(ctx, x, y, size = 3, color = '#a78bfa') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color = '#a78bfa') {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * Render banner selamat datang kustom QUMPRUY dengan avatar dinamis dan kutipan acak
 */
async function renderWelcomeBanner({
  member,
  inviter = null,
  inviteType = 'regular',
  memberCount = null,
  customQuote = null
}) {
  const width = 880;
  const height = 360;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Midnight Dark Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0a0814');
  bgGrad.addColorStop(0.5, '#120d22');
  bgGrad.addColorStop(1, '#08070d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Purple ambient glow on left & right
  const leftGlow = ctx.createRadialGradient(150, 180, 10, 150, 180, 260);
  leftGlow.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
  leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, width, height);

  const rightGlow = ctx.createRadialGradient(720, 110, 20, 720, 110, 320);
  rightGlow.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
  rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, width, height);

  // 2. Futuristic Chamfered Border
  const offset = 18;
  const cut = 20;

  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(offset + cut, offset);
  ctx.lineTo(width - offset - cut, offset);
  ctx.lineTo(width - offset, offset + cut);
  ctx.lineTo(width - offset, height - offset - cut);
  ctx.lineTo(width - offset - cut, height - offset);
  ctx.lineTo(offset + cut, height - offset);
  ctx.lineTo(offset, height - offset - cut);
  ctx.lineTo(offset, offset + cut);
  ctx.closePath();
  ctx.stroke();

  // Inner subtle border
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(offset + 8, offset + 8, width - 2 * (offset + 8), height - 2 * (offset + 8));

  // Corner HUD brackets
  function drawHudCorner(x, y, dirX, dirY) {
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + dirY * 16);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dirX * 16, y);
    ctx.stroke();
  }
  drawHudCorner(offset + 8, offset + 8, 1, 1);
  drawHudCorner(width - offset - 8, offset + 8, -1, 1);
  drawHudCorner(offset + 8, height - offset - 8, 1, -1);
  drawHudCorner(width - offset - 8, height - offset - 8, -1, -1);

  // Floating pixel stars
  const particles = [
    { x: 380, y: 55, s: 4, c: '#a78bfa' },
    { x: 420, y: 38, s: 3, c: '#ffffff' },
    { x: 810, y: 55, s: 4, c: '#8b5cf6' },
    { x: 830, y: 80, s: 3, c: '#c4b5fd' },
    { x: 55, y: 310, s: 4, c: '#8b5cf6' },
    { x: 340, y: 315, s: 3, c: '#a78bfa' },
    { x: 800, y: 310, s: 4, c: '#ffffff' }
  ];
  for (const p of particles) {
    drawPixelDot(ctx, p.x, p.y, p.s, p.c);
  }

  // 3. Watermark Logo on Right Background
  const logoPath = path.join(process.cwd(), 'src', 'assets', 'qumpruy_logo.jpg');
  if (fs.existsSync(logoPath)) {
    try {
      const logoImg = await loadImage(logoPath);
      ctx.save();
      ctx.globalAlpha = 0.14;
      const wmSize = 220;
      ctx.drawImage(logoImg, width - wmSize - 45, (height - wmSize) / 2, wmSize, wmSize);
      ctx.restore();
    } catch (_) {}
  }

  // 4. Left Area: Glowing Circular Avatar with Crown
  const avCenterX = 150;
  const avCenterY = 185;
  const avRadius = 66;

  // Outer gradient glow ring
  const ringGrad = ctx.createLinearGradient(
    avCenterX - avRadius, avCenterY - avRadius,
    avCenterX + avRadius, avCenterY + avRadius
  );
  ringGrad.addColorStop(0, '#a855f7');
  ringGrad.addColorStop(0.5, '#8b5cf6');
  ringGrad.addColorStop(1, '#6366f1');

  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(avCenterX, avCenterY, avRadius + 7, 0, Math.PI * 2);
  ctx.stroke();

  // Outer orbital dashed ring
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(avCenterX, avCenterY, avRadius + 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(avCenterX, avCenterY, avRadius, 0, Math.PI * 2);
  ctx.clip();

  let avatarLoaded = false;
  if (member && member.user && member.user.displayAvatarURL) {
    try {
      const avUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
      const avBuf = await fetchImageBuffer(avUrl, 3500);
      if (avBuf) {
        const avImg = await loadImage(avBuf);
        ctx.drawImage(avImg, avCenterX - avRadius, avCenterY - avRadius, avRadius * 2, avRadius * 2);
        avatarLoaded = true;
      }
    } catch (_) {}
  }

  if (!avatarLoaded) {
    ctx.fillStyle = '#1c172e';
    ctx.fillRect(avCenterX - avRadius, avCenterY - avRadius, avRadius * 2, avRadius * 2);
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    ctx.arc(avCenterX, avCenterY - 12, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(avCenterX, avCenterY + 45, 48, 38, 0, Math.PI, 0, true);
    ctx.fill();
  }
  ctx.restore();

  // Floating Royal Pixel Crown above avatar
  const crownY = avCenterY - avRadius - 28;
  ctx.fillStyle = '#8b5cf6';
  ctx.fillRect(avCenterX - 15, crownY, 7, 7);
  ctx.fillRect(avCenterX - 3, crownY - 5, 7, 7);
  ctx.fillRect(avCenterX + 9, crownY, 7, 7);
  ctx.fillRect(avCenterX - 13, crownY + 8, 27, 6);
  drawPixelDot(ctx, avCenterX - 1, crownY - 1, 3, '#ffffff');

  // Pill Badge below Avatar: "NEW MEMBER"
  ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
  drawRoundedRect(ctx, avCenterX - 68, avCenterY + avRadius + 22, 136, 24, 12);
  ctx.fill();
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  drawStar(ctx, avCenterX - 48, avCenterY + avRadius + 34, 4, 4, 1.5, '#c4b5fd');
  drawStar(ctx, avCenterX + 48, avCenterY + avRadius + 34, 4, 4, 1.5, '#c4b5fd');

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEW MEMBER', avCenterX, avCenterY + avRadius + 38);

  // 5. Right Area: Modern Typography & Information
  const textX = 265;

  // Top Glass Pill: "WELCOME TO QUMPRUY"
  ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
  drawRoundedRect(ctx, textX, 55, 230, 26, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawStar(ctx, textX + 18, 68, 4, 5, 2, '#c4b5fd');
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('WELCOME TO QUMPRUY', textX + 32, 72);

  // Subtitle
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText('HELLO, WELCOME ABOARD!', textX, 114);

  // Member Display Name (Massive, bright white with subtle shadow)
  const displayName = (member?.displayName || member?.user?.username || 'NEW MEMBER').toUpperCase().slice(0, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.fillText(displayName, textX, 156);

  // Discord tag & subtitle
  const username = (member?.user?.username || 'user');
  const count = memberCount || member?.guild?.memberCount || 1;
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 15px "Consolas", monospace';
  ctx.fillText(`@${username}  •  Member Ke - #${count}`, textX, 185);

  // Random quote from collection or custom quote
  const chosenQuote = customQuote || WELCOME_QUOTES[Math.floor(Math.random() * WELCOME_QUOTES.length)];
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 13px "Georgia", serif';

  let quoteText = `"${chosenQuote}"`;
  const maxQuoteW = width - textX - 55; // 880 - 265 - 55 = 560px
  if (ctx.measureText(quoteText).width > maxQuoteW) {
    while (ctx.measureText(quoteText + '..."').width > maxQuoteW && quoteText.length > 10) {
      quoteText = quoteText.slice(0, -1);
    }
    quoteText = quoteText + '..."';
  }
  ctx.fillText(quoteText, textX, 220);

  // Horizontal divider
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(textX, 240);
  ctx.lineTo(width - 55, 240);
  ctx.stroke();

  // Bottom 3 Glass Badges (Kombinasi C: INVITED BY, JOINED DATE, SERVER COUNT)
  let inviterDisplay = 'Vanity URL';
  if (inviteType === 'regular' && inviter) {
    inviterDisplay = `@${inviter.displayName || inviter.username || 'Friend'}`;
  } else if (inviteType === 'bot') {
    inviterDisplay = 'Bot Auth';
  } else if (inviteType === 'unknown') {
    inviterDisplay = 'Direct Link';
  }

  const joinDate = new Date();
  const dateFormatted = `${joinDate.getDate()} ${joinDate.toLocaleDateString('id-ID', { month: 'short' })} ${joinDate.getFullYear()}`;

  const badges = [
    { label: 'Invited By', value: inviterDisplay.slice(0, 16) },
    { label: 'Joined Date', value: dateFormatted },
    { label: 'Server Count', value: `${count} Members` }
  ];

  let bx = textX;
  const badgeW = 165;
  const badgeH = 46;

  for (const b of badges) {
    ctx.fillStyle = 'rgba(23, 18, 38, 0.85)';
    drawRoundedRect(ctx, bx, 256, badgeW, badgeH, 8);
    ctx.fill();
    ctx.strokeStyle = '#3d2f5c';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 10px "Segoe UI", Arial, sans-serif';
    ctx.fillText(b.label.toUpperCase(), bx + 12, 274);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillText(b.value, bx + 12, 292);

    bx += badgeW + 16;
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  WELCOME_QUOTES,
  renderWelcomeBanner
};
