const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// 40+ kutipan sambutan hangat khusus QUMPRUY dengan ajakan bergabung ke voice channel
const WELCOME_QUOTES = [
  "Selamat datang di Qumpruy! Jangan lupa mampir dan join voice channel buat ngobrol dan kenalan ya!",
  "Tarik kursi dan buat dirimu nyaman! Langsung mampir ke voice channel yuk buat kenalan bareng teman-teman.",
  "Senang kamu ada di sini! Jangan ragu join voice channel ya, kawan-kawan di sini asik diajak ngobrol.",
  "Make yourself at home! Pasang headset dan jangan lupa join voice channel buat chit-chat dan kenalan.",
  "Selamat bergabung di keluarga besar Qumpruy! Yuk langsung meluncur ke voice channel buat kenalan seru.",
  "Good vibes only! Luangkan waktu buat join voice channel, ngobrol santai, dan nikmati musik bareng.",
  "Pintu selalu terbuka lebar! Jangan lupa mampir ke voice channel ya buat ngobrol dan saling menyapa.",
  "Nongkrong santai tanpa beban. Yuk langsung join voice channel biar makin akrab sama warga Qumpruy!",
  "A new friend has arrived! Jangan sungkan buat join voice channel, mari mengobrol dan berkenalan.",
  "Akhirnya mendarat juga di server! Jangan lupa mampir ke voice channel buat kenalan dan seru-seruan bareng.",
  "Salam hangat dari Qumpruy! Pasang kopimu dan jangan lupa join voice channel buat chit-chat santai.",
  "Datang sebagai kawan, pulang sebagai keluarga. Langsung join voice channel ya buat kenalan lebih dekat!",
  "Mulai harimu dengan obrolan seru! Jangan lupa mampir ke voice channel buat kenalan dan dengerin musik.",
  "Rebahan santai sambil dengerin lagu favorit. Yuk langsung join voice channel biar obrolan makin hidup!",
  "Selamat datang kawan baru! Jangan lupa join voice channel ya, kita biasa ngobrol dan mabar santai di sana.",
  "Tempat terbaik buat rehat sejenak. Jangan sungkan buat join voice channel dan kenalan sama teman-teman!",
  "Selamat bergabung! Langsung merapat ke voice channel yuk, obrolan seru dan musik asik menunggumu.",
  "Vibing, chilling, and laughing together! Jangan lupa join voice channel buat saling kenalan ya.",
  "Tinggalkan penatmu di luar pintu. Yuk mampir ke voice channel buat ngobrol santai dan berkenalan.",
  "Senang banget bisa menyambutmu di sini! Jangan lupa join voice channel biar bisa saling sapa langsung.",
  "Kapan pun kamu butuh teman ngobrol, server ini selalu siap. Yuk langsung join voice channel dan kenalan!",
  "Suasana santai, teman baru, dan musik asik. Jangan lupa mampir ke voice channel buat kenalan ya!",
  "Bebas berekspresi dan saling menghargai. Langsung meluncur ke voice channel yuk buat ngobrol santai.",
  "Selamat datang di tongkrongan digital kita! Jangan lupa join voice channel buat saling kenalan dan seru-seruan.",
  "Keluarga Qumpruy makin ramai! Yuk langsung mampir ke voice channel buat kenalan sama warga lainnya.",
  "Santai sejenak sehabis aktivitas seharian. Jangan lupa join voice channel buat ngobrol santai bareng kita!",
  "Pintu obrolan selalu terbuka lebar. Jangan ragu buat join voice channel dan mulai kenalan ya!",
  "Selamat mendarat di Qumpruy! Pasang earphone-mu dan jangan lupa join voice channel buat saling sapa.",
  "Teman baru, cerita baru, momen seru baru! Yuk join voice channel buat ngobrol dan kenalan hangat.",
  "Hangatnya kebersamaan menunggumu di sini. Jangan lupa join voice channel buat kenalan sama kawan-kawan.",
  "Dari obrolan santai hingga tawa lepas, semua ada di sini. Langsung join voice channel yuk buat kenalan!",
  "Selamat bergabung di server! Jangan lupa mampir ke voice channel ya biar makin akrab dan banyak teman.",
  "Siapkan minuman favoritmu dan langsung join voice channel buat ngobrol santai dan kenalan!",
  "Waktunya rileks dan nikmati suasana. Jangan lupa melipir ke voice channel buat kenalan bareng kita ya.",
  "Hari yang cerah untuk teman baru! Yuk langsung join voice channel buat kenalan dan nikmati playlist seru.",
  "Satu server sejuta cerita. Jangan sungkan join voice channel ya buat ngobrol dan kenalan lebih akrab.",
  "Senang kamu memilih singgah di sini! Jangan lupa join voice channel buat saling sapa dan mengobrol.",
  "Selamat datang di Qumpruy! Tarik napas, santai, dan jangan lupa join voice channel buat kenalan bareng warga.",
  "Tempat nongkrong yang selalu ramah untuk siapa saja. Yuk join voice channel buat ngobrol santai sekarang!",
  "Makin ramai makin asik! Jangan lupa langsung mampir ke voice channel buat kenalan dan seru-seruan."
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
 * Render Master Welcome Boarding Pass (Gabungan elemen terbaik tiket pass & welcome banner)
 */
async function renderWelcomeBanner({
  member,
  guild = null,
  inviter = null,
  inviteType = 'regular',
  memberCount = null,
  customQuote = null
}) {
  const width = 1060;
  const height = 640;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const targetGuild = guild || member?.guild;
  const serverName = (targetGuild?.name || 'QUMPRUY').toUpperCase();
  const count = memberCount || targetGuild?.memberCount || 1;

  // 1. Midnight Dark Obsidian Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#090712');
  bgGrad.addColorStop(0.4, '#130c26');
  bgGrad.addColorStop(1, '#07060e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Purple ambient glow on left & right
  const leftGlow = ctx.createRadialGradient(200, 320, 30, 200, 320, 360);
  leftGlow.addColorStop(0, 'rgba(147, 51, 234, 0.32)');
  leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, width, height);

  const rightGlow = ctx.createRadialGradient(880, 220, 40, 880, 220, 400);
  rightGlow.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
  rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rightGlow;
  ctx.fillRect(0, 0, width, height);

  // Subtle Cyber Grid in Background
  ctx.save();
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 42;
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

  // 2. Outer Double Border Frame (Edge-to-edge: 14px margin)
  const offset = 14;
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(offset, offset, width - 2 * offset, height - 2 * offset);

  ctx.strokeStyle = 'rgba(196, 181, 253, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(offset + 8, offset + 8, width - 2 * (offset + 8), height - 2 * (offset + 8));

  // Corner metallic accents
  function drawCorner(x, y) {
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }
  drawCorner(offset + 8, offset + 8);
  drawCorner(width - offset - 8, offset + 8);
  drawCorner(offset + 8, height - offset - 8);
  drawCorner(width - offset - 8, height - offset - 8);

  // Watermark Logo on Right Background (Gambar 1: Logo dibesarin, dinaikin, dan background hitam dihapus)
  const logoPath = path.join(process.cwd(), 'src', 'assets', 'qumpruy_logo.jpg');
  if (fs.existsSync(logoPath)) {
    try {
      const rawLogo = await loadImage(logoPath);
      // Buat canvas in-memory untuk menghapus background hitam logo agar estetik dan transparan
      const logoCanvas = createCanvas(rawLogo.width, rawLogo.height);
      const lCtx = logoCanvas.getContext('2d');
      lCtx.drawImage(rawLogo, 0, 0);
      const imgData = lCtx.getImageData(0, 0, rawLogo.width, rawLogo.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const maxVal = Math.max(d[i], d[i+1], d[i+2]);
        if (maxVal < 16) {
          d[i+3] = 0;
        } else if (maxVal < 45) {
          d[i+3] = Math.round(((maxVal - 16) / 29) * 255);
        }
      }
      lCtx.putImageData(imgData, 0, 0);

      // Gambar 1: Ukuran diperbesar (420px) dan dinaikkan (y = 80) agar tidak tertutup badge
      ctx.save();
      ctx.globalAlpha = 0.16;
      const wmSize = 420;
      const wmX = width - wmSize - 25;
      const wmY = 80;
      ctx.drawImage(logoCanvas, wmX, wmY, wmSize, wmSize);
      ctx.restore();
    } catch (_) {}
  }

  // 3. Left Section: Passport / Photo ID Box (Gambar 2: Hapus top logo, hiasan strip2, dan pita di bawah)
  const leftX = 36;
  const leftY = 36;
  const leftW = 320;
  const leftH = height - 72;

  ctx.fillStyle = '#100d1c';
  ctx.fillRect(leftX, leftY, leftW, leftH);
  ctx.strokeStyle = '#4c3a72';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftX, leftY, leftW, leftH);

  // Hiasan Strip-Strip pada Border Kotak (Outer box dashed inner frame)
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(leftX + 7, leftY + 7, leftW - 14, leftH - 14);
  ctx.restore();

  // Hiasan Strip-Strip Diagonal di 4 Sudut Kotak (Striping Corner Accents)
  function drawCornerStripes(cx, cy, dirX, dirY) {
    ctx.save();
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const step = 14 + i * 6;
      ctx.beginPath();
      ctx.moveTo(cx + dirX * step, cy);
      ctx.lineTo(cx, cy + dirY * step);
      ctx.stroke();
    }
    ctx.restore();
  }
  drawCornerStripes(leftX + 7, leftY + 7, 1, 1);
  drawCornerStripes(leftX + leftW - 7, leftY + 7, -1, 1);
  drawCornerStripes(leftX + 7, leftY + leftH - 7, 1, -1);
  drawCornerStripes(leftX + leftW - 7, leftY + leftH - 7, -1, -1);

  // Top Accent Bar with Tech Stripes (Pengganti top logo)
  const topBarY = leftY + 28;
  ctx.fillStyle = 'rgba(167, 139, 250, 0.08)';
  ctx.fillRect(leftX + 24, topBarY - 10, leftW - 48, 22);
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(leftX + 24, topBarY - 10, leftW - 48, 22);

  // Horizontal strip lines inside top accent bar
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 1.5;
  for (let s = 0; s < 5; s++) {
    ctx.beginPath();
    ctx.moveTo(leftX + 38 + s * 7, topBarY - 4);
    ctx.lineTo(leftX + 38 + s * 7, topBarY + 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(leftX + leftW - 38 - s * 7, topBarY - 4);
    ctx.lineTo(leftX + leftW - 38 - s * 7, topBarY + 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#c4b5fd';
  ctx.font = 'bold 11px "Consolas", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CITIZEN CARD', leftX + leftW / 2, topBarY + 4);

  // Member Avatar Box (214 x 214px) - Diberi jarak yang pas agar mengisi penuh
  const avatarSize = 214;
  const avatarX = leftX + (leftW - avatarSize) / 2;
  const avatarY = leftY + 72;

  // Avatar Striped Border
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(avatarX - 5, avatarY - 5, avatarSize + 10, avatarSize + 10);

  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(avatarX - 10, avatarY - 10, avatarSize + 20, avatarSize + 20);
  ctx.restore();

  // Corner Bracket Strips on Avatar Box
  function drawAvatarCornerBracket(x, y, dx, dy) {
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + dx * 14, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 14);
    ctx.stroke();
  }
  drawAvatarCornerBracket(avatarX - 10, avatarY - 10, 1, 1);
  drawAvatarCornerBracket(avatarX + avatarSize + 10, avatarY - 10, -1, 1);
  drawAvatarCornerBracket(avatarX - 10, avatarY + avatarSize + 10, 1, -1);
  drawAvatarCornerBracket(avatarX + avatarSize + 10, avatarY + avatarSize + 10, -1, -1);

  ctx.fillStyle = '#181328';
  ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

  let avatarLoaded = false;
  if (member && member.user && member.user.displayAvatarURL) {
    try {
      const avUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
      const avBuf = await fetchImageBuffer(avUrl, 3500);
      if (avBuf) {
        const avImg = await loadImage(avBuf);
        ctx.drawImage(avImg, avatarX, avatarY, avatarSize, avatarSize);
        avatarLoaded = true;
      }
    } catch (_) {}
  }

  if (!avatarLoaded) {
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + 70, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(avatarX + avatarSize / 2, avatarY + 172, 68, 54, 0, Math.PI, 0, true);
    ctx.fill();
  }

  // Pixel Crown on top of avatar
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(avatarX + avatarSize / 2 - 16, avatarY + 8, 8, 8);
  ctx.fillRect(avatarX + avatarSize / 2 - 4, avatarY + 8, 8, 8);
  ctx.fillRect(avatarX + avatarSize / 2 + 8, avatarY + 8, 8, 8);
  ctx.fillRect(avatarX + avatarSize / 2 - 14, avatarY + 17, 28, 7);

  // Status Indicator below avatar box
  const midStatusY = avatarY + avatarSize + 28;
  drawStar(ctx, leftX + 44, midStatusY, 4, 6, 2.5, '#c084fc');
  drawStar(ctx, leftX + leftW - 44, midStatusY, 4, 6, 2.5, '#c084fc');

  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 12px "Consolas", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('IDENTITY VERIFIED', leftX + leftW / 2, midStatusY + 4);

  // Gambar 2: Dekorasi PITA Cantik (Ribbon Banner) di Bagian Bawah
  const ribbonCenterY = avatarY + avatarSize + 96;
  const ribbonW = 224;
  const ribbonH = 44;
  const ribX = leftX + (leftW - ribbonW) / 2;
  const ribY = ribbonCenterY - ribbonH / 2;
  const tailW = 26;

  // 1. Ribbon Left Tail
  ctx.save();
  ctx.fillStyle = '#3b0764'; // Darker violet fold
  ctx.beginPath();
  ctx.moveTo(ribX + 10, ribY + 6);
  ctx.lineTo(ribX - tailW, ribY + 6);
  ctx.lineTo(ribX - tailW + 12, ribY + ribbonH / 2 + 6); // Swallowtail notch
  ctx.lineTo(ribX - tailW, ribY + ribbonH + 6);
  ctx.lineTo(ribX + 10, ribY + ribbonH + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 2. Ribbon Right Tail
  ctx.beginPath();
  ctx.moveTo(ribX + ribbonW - 10, ribY + 6);
  ctx.lineTo(ribX + ribbonW + tailW, ribY + 6);
  ctx.lineTo(ribX + ribbonW + tailW - 12, ribY + ribbonH / 2 + 6); // Swallowtail notch
  ctx.lineTo(ribX + ribbonW + tailW, ribY + ribbonH + 6);
  ctx.lineTo(ribX + ribbonW - 10, ribY + ribbonH + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Fold shadow triangles (depth effect)
  ctx.fillStyle = '#1e0538';
  ctx.beginPath();
  ctx.moveTo(ribX, ribY + ribbonH);
  ctx.lineTo(ribX + 10, ribY + ribbonH + 6);
  ctx.lineTo(ribX, ribY + ribbonH + 6);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(ribX + ribbonW, ribY + ribbonH);
  ctx.lineTo(ribX + ribbonW - 10, ribY + ribbonH + 6);
  ctx.lineTo(ribX + ribbonW, ribY + ribbonH + 6);
  ctx.closePath();
  ctx.fill();

  // 4. Main Ribbon Body (Front plate)
  const ribGrad = ctx.createLinearGradient(ribX, ribY, ribX, ribY + ribbonH);
  ribGrad.addColorStop(0, '#7c3aed');
  ribGrad.addColorStop(0.5, '#5b21b6');
  ribGrad.addColorStop(1, '#4c1d95');
  ctx.fillStyle = ribGrad;

  ctx.beginPath();
  ctx.roundRect(ribX, ribY, ribbonW, ribbonH, 6);
  ctx.fill();

  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Gold/light accent line inside ribbon
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(ribX + 4, ribY + 4, ribbonW - 8, ribbonH - 8, 4);
  ctx.stroke();

  // Text inside Ribbon: ROYAL CITIZEN
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROYAL CITIZEN', leftX + leftW / 2, ribY + 28);
  ctx.restore();

  // Text below Ribbon: OFFICIAL COMMUNITY
  const subRibY = ribY + ribbonH + 34;
  drawStar(ctx, leftX + 48, subRibY - 4, 4, 6, 2.5, '#c084fc');
  drawStar(ctx, leftX + leftW - 48, subRibY - 4, 4, 6, 2.5, '#c084fc');

  ctx.font = 'bold 13px "Consolas", monospace';
  ctx.fillStyle = '#c4b5fd';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL COMMUNITY', leftX + leftW / 2, subRibY);

  // Bottom Tech Stripe Accent (Memberi kesan terisi penuh di paling bawah)
  const bottomStripeY = leftY + leftH - 22;
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
  ctx.lineWidth = 1.5;
  for (let s = 0; s < 7; s++) {
    ctx.beginPath();
    ctx.moveTo(leftX + leftW / 2 - 28 + s * 8, bottomStripeY);
    ctx.lineTo(leftX + leftW / 2 - 24 + s * 8, bottomStripeY + 6);
    ctx.stroke();
  }

  // 4. Right Section: Master Details & Community Typography
  const rightX = 390;
  const rightCenterX = rightX + (width - 45 - rightX) / 2;
  let curY = 68;

  // Header Title - Centered
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px "Times New Roman", Georgia, serif';
  ctx.fillText(serverName, rightCenterX, curY);

  curY += 28;
  ctx.font = 'bold 16px "Consolas", monospace';
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('—  O F F I C I A L   C O M M U N I T Y  —', rightCenterX, curY);

  curY += 18;
  ctx.strokeStyle = '#4c3a72';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rightX, curY);
  ctx.lineTo(width - 45, curY);
  ctx.stroke();
  drawStar(ctx, rightCenterX, curY, 4, 7, 3, '#c084fc');

  // Subtitle & Display Name - Generous vertical spacing
  curY += 44;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9ca3af';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText('HELLO, WELCOME ABOARD!', rightX, curY);

  curY += 56;
  const rawDisplayName = member?.displayName || member?.user?.username || 'NEW MEMBER';
  const displayName = rawDisplayName.toUpperCase().slice(0, 24);
  ctx.fillStyle = '#ffffff';
  let nameSize = 54;
  ctx.font = `bold ${nameSize}px "Segoe UI", Arial, sans-serif`;
  while (ctx.measureText(displayName).width > 600 && nameSize > 28) {
    nameSize -= 2;
    ctx.font = `bold ${nameSize}px "Segoe UI", Arial, sans-serif`;
  }
  ctx.fillText(displayName, rightX, curY);

  curY += 40;
  const username = member?.user?.username || 'user';
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 22px "Consolas", monospace';
  ctx.fillText(`@${username}`, rightX, curY);

  // Voice Chat Welcoming Quote (Multi-line 2-line rendering)
  const chosenQuote = customQuote || WELCOME_QUOTES[Math.floor(Math.random() * WELCOME_QUOTES.length)];
  curY += 40;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'italic 16px "Georgia", serif';

  const maxQuoteW = width - 45 - rightX;
  const quoteWords = chosenQuote.split(' ');
  let l1 = '';
  let l2 = '';

  for (let i = 0; i < quoteWords.length; i++) {
    const testL1 = l1 ? `${l1} ${quoteWords[i]}` : quoteWords[i];
    if (ctx.measureText(`"${testL1}`).width <= maxQuoteW && !l2) {
      l1 = testL1;
    } else {
      const testL2 = l2 ? `${l2} ${quoteWords[i]}` : quoteWords[i];
      if (ctx.measureText(`${testL2}"`).width <= maxQuoteW) {
        l2 = testL2;
      } else {
        l2 = `${l2}...`;
        break;
      }
    }
  }

  if (l2) {
    ctx.fillText(`"${l1}`, rightX, curY);
    curY += 28;
    ctx.fillText(`${l2}"`, rightX, curY);
  } else {
    ctx.fillText(`"${l1}"`, rightX, curY);
    curY += 28;
  }

  // 3 Stat Badges (Invited By, Joined Date, Server Count)
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

  curY += 26;
  const badges = [
    { label: 'INVITED BY', value: inviterDisplay.slice(0, 18) },
    { label: 'JOINED DATE', value: dateFormatted },
    { label: 'PERSON', value: `THE #${count} PERSON` }
  ];

  let bx = rightX;
  const bW = 195;
  const bH = 76;
  const bY = curY;

  for (const b of badges) {
    ctx.fillStyle = 'rgba(23, 17, 40, 0.94)';
    ctx.beginPath();
    ctx.roundRect(bx, bY, bW, bH, 10);
    ctx.fill();

    ctx.strokeStyle = '#5b3a9e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, bY, bW, bH, 10);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(192, 132, 252, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx + 12, bY + 1);
    ctx.lineTo(bx + bW - 12, bY + 1);
    ctx.stroke();

    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillText(b.label, bx + 14, bY + 26);

    ctx.fillStyle = '#ffffff';
    let valSize = 18;
    ctx.font = `bold ${valSize}px "Segoe UI", Arial, sans-serif`;
    while (ctx.measureText(b.value).width > (bW - 28) && valSize > 12) {
      valSize -= 1;
      ctx.font = `bold ${valSize}px "Segoe UI", Arial, sans-serif`;
    }
    ctx.fillText(b.value, bx + 14, bY + 56);

    bx += bW + 18;
  }

  // Barcode & Community ID
  curY += bH + 32;
  const barcodeX = rightX;
  const barcodeY = curY;
  const barcodeW = width - 45 - rightX;
  const barcodeH = 46;

  ctx.fillStyle = '#ffffff';
  let barX = barcodeX;
  const barPattern = [4, 2, 5, 2, 3, 1, 3, 4, 6, 2, 4, 2, 1, 5, 2, 2, 6, 2, 3, 1, 5, 2, 2, 6, 2, 3, 4, 2, 3, 2, 6, 2, 2, 5, 2, 3, 6, 2, 4, 2, 3, 2, 6, 3, 2, 5, 3, 2, 6];
  let pIdx = 0;
  while (barX < barcodeX + barcodeW - 8) {
    const w = barPattern[pIdx % barPattern.length];
    if (barX + w > barcodeX + barcodeW - 8) break;
    ctx.fillRect(barX, barcodeY, w, barcodeH);
    barX += w + (pIdx % 2 === 0 ? 3 : 2);
    pIdx++;
  }

  // Pass ID below barcode
  curY += barcodeH + 34;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Consolas", monospace';

  drawStar(ctx, rightX + barcodeW / 2 - 140, curY - 7, 4, 8, 3, '#a855f7');
  ctx.fillText(`ID : QMP - ${count}`, rightX + barcodeW / 2, curY);
  drawStar(ctx, rightX + barcodeW / 2 + 140, curY - 7, 4, 8, 3, '#a855f7');

  return canvas.toBuffer('image/png');
}

module.exports = {
  WELCOME_QUOTES,
  renderWelcomeBanner
};
