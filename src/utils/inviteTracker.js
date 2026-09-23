const {
  EmbedBuilder, PermissionFlagsBits, ChannelType, AuditLogEvent,
  AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const storage = require('./storage');

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

/**
 * Format waktu lokal WIB / ringkas
 */
function getFormattedTime() {
  return new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }) + ' WIB';
}

/**
 * Inisialisasi invite tracker saat bot ready
 * @param {import('discord.js').Client} client
 */
async function initInviteTracker(client) {
  if (!client.invitesCache) {
    client.invitesCache = new Map();
  }

  let totalGuildsCached = 0;
  for (const guild of client.guilds.cache.values()) {
    const success = await cacheGuildInvites(guild, client);
    if (success) totalGuildsCached++;
  }

  console.log(`[InviteTracker] Cache undangan diinisialisasi untuk ${totalGuildsCached} server.`);
}

/**
 * Fetch dan simpan invite per guild ke cache
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} client
 */
async function cacheGuildInvites(guild, client) {
  if (!guild || !guild.members?.me) return false;

  // Bot butuh izin ManageGuild untuk membaca daftar invite
  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return false;
  }

  try {
    const invites = await guild.invites.fetch().catch(() => null);
    const invitesMap = new Map();

    if (invites) {
      for (const [code, invite] of invites) {
        invitesMap.set(code, {
          code: invite.code,
          uses: invite.uses || 0,
          maxUses: invite.maxUses || 0,
          inviter: invite.inviter ? {
            id: invite.inviter.id,
            tag: invite.inviter.tag || invite.inviter.username,
            username: invite.inviter.username
          } : null
        });
      }
    }

    let vanityCode = null;
    let vanityUses = 0;
    if (guild.features.includes('VANITY_URL')) {
      const vanity = await guild.fetchVanityData().catch(() => null);
      if (vanity) {
        vanityCode = vanity.code;
        vanityUses = vanity.uses || 0;
      }
    }

    client.invitesCache.set(guild.id, {
      invites: invitesMap,
      vanityCode,
      vanityUses
    });

    return true;
  } catch (err) {
    console.warn(`[InviteTracker] Gagal cache invites untuk guild ${guild.name}:`, err.message);
    return false;
  }
}

/**
 * Event: Invite baru dibuat
 */
function handleInviteCreate(invite, client) {
  if (!invite.guild || !client.invitesCache) return;
  const guildCache = client.invitesCache.get(invite.guild.id);
  if (!guildCache) return;

  guildCache.invites.set(invite.code, {
    code: invite.code,
    uses: invite.uses || 0,
    maxUses: invite.maxUses || 0,
    inviter: invite.inviter ? {
      id: invite.inviter.id,
      tag: invite.inviter.tag || invite.inviter.username,
      username: invite.inviter.username
    } : null
  });
}

/**
 * Event: Invite dihapus
 */
function handleInviteDelete(invite, client) {
  if (!invite.guild || !client.invitesCache) return;
  const guildCache = client.invitesCache.get(invite.guild.id);
  if (!guildCache) return;

  guildCache.invites.delete(invite.code);
}

/**
 * Ambil statistik pengundang dari storage
 * @param {string} guildId
 * @param {string} userId
 */
function getInviterStats(guildId, userId) {
  const invitesData = storage.read('invites');
  const guildStats = invitesData[guildId]?.inviters?.[userId] || {
    regular: 0,
    leaves: 0,
    fake: 0,
    bonus: 0
  };

  const totalNet = Math.max(0, (guildStats.regular || 0) + (guildStats.bonus || 0) - (guildStats.leaves || 0));

  return {
    regular: guildStats.regular || 0,
    leaves: guildStats.leaves || 0,
    fake: guildStats.fake || 0,
    bonus: guildStats.bonus || 0,
    total: totalNet
  };
}

/**
 * Ambil leaderboard pengundang server
 * @param {string} guildId
 * @param {number} limit
 */
function getLeaderboard(guildId, limit = 10) {
  const invitesData = storage.read('invites');
  const guildInviters = invitesData[guildId]?.inviters || {};

  const entries = Object.entries(guildInviters).map(([userId, stats]) => {
    const regular = stats.regular || 0;
    const bonus = stats.bonus || 0;
    const leaves = stats.leaves || 0;
    const fake = stats.fake || 0;
    const total = Math.max(0, regular + bonus - leaves);
    return { userId, regular, bonus, leaves, fake, total };
  });

  entries.sort((a, b) => b.total - a.total || b.regular - a.regular);
  return entries.slice(0, limit);
}

function drawStarShape(ctx, cx, cy, spikes, outerRadius, innerRadius, color = '#8b5cf6') {
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
 * Render kartu tiket selamat datang eksklusif QUMPRUY menggunakan Canvas Skia
 */
async function renderQumpruyTicket({
  member,
  inviter = null,
  inviteType = 'regular',
  inviteCode = null,
  memberCount = null
}) {
  const width = 850;
  const height = 480;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#09080e');
  bgGrad.addColorStop(0.5, '#0c0a14');
  bgGrad.addColorStop(1, '#07060a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Grid texture
  ctx.strokeStyle = '#181424';
  ctx.lineWidth = 1;
  for (let x = 24; x < width - 24; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, height - 24);
    ctx.stroke();
  }
  for (let y = 24; y < height - 24; y += 32) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }

  // Floating pixel particles
  const particles = [
    { x: 350, y: 55, s: 4, c: '#a78bfa' },
    { x: 370, y: 75, s: 3, c: '#ffffff' },
    { x: 800, y: 65, s: 4, c: '#8b5cf6' },
    { x: 780, y: 90, s: 3, c: '#c4b5fd' },
    { x: 50, y: 440, s: 4, c: '#8b5cf6' },
    { x: 320, y: 430, s: 3, c: '#ffffff' },
    { x: 800, y: 420, s: 4, c: '#a78bfa' }
  ];
  for (const p of particles) {
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x, p.y, p.s, p.s);
  }

  // Double Border with Purple & White Accents
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  ctx.strokeStyle = '#4c3a70';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(30, 30, width - 60, height - 60);
  ctx.setLineDash([]);

  // Corner Rivets
  function drawCornerAccent(cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
    ctx.moveTo(0, -7); ctx.lineTo(0, 7);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }
  drawCornerAccent(40, 40);
  drawCornerAccent(width - 40, 40);
  drawCornerAccent(40, height - 40);
  drawCornerAccent(width - 40, height - 40);

  // Chains in corners
  function drawChain(startX, startY, count, angle) {
    for (let i = 0; i < count; i++) {
      const cx = startX + i * 20 * Math.cos(angle);
      const cy = startY + i * 20 * Math.sin(angle);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-15, -8, 30, 16, 8);
      ctx.stroke();
      ctx.strokeStyle = '#09080e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-8, -4, 16, 8, 4);
      ctx.stroke();
      ctx.restore();
    }
  }
  drawChain(width - 32, 32, 4, (Math.PI * 3) / 4);
  drawChain(32, height - 32, 4, -Math.PI / 4);

  // Left Section Box
  const leftX = 52;
  const leftY = 50;
  const leftW = 246;
  const leftH = 380;

  ctx.fillStyle = '#100e18';
  ctx.fillRect(leftX, leftY, leftW, leftH);
  ctx.strokeStyle = '#3d2f5c';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftX, leftY, leftW, leftH);

  // Draw QUMPRUY Logo Badge on top left
  const logoPath = path.join(process.cwd(), 'src', 'assets', 'qumpruy_logo.jpg');
  if (fs.existsSync(logoPath)) {
    try {
      const logoImg = await loadImage(logoPath);
      ctx.save();
      const logoSize = 64;
      const logoX = leftX + (leftW - logoSize) / 2;
      const logoY = leftY + 18;
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 0, Math.PI * 2);
      ctx.stroke();
    } catch (_) {}
  }

  // Member Avatar Box
  const avatarSize = 135;
  const avatarX = leftX + (leftW - avatarSize) / 2;
  const avatarY = leftY + 105;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(avatarX - 5, avatarY - 5, avatarSize + 10, avatarSize + 10);

  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1;
  ctx.strokeRect(avatarX - 9, avatarY - 9, avatarSize + 18, avatarSize + 18);

  ctx.fillStyle = '#171424';
  ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

  // Try to load real member avatar
  let avatarLoaded = false;
  if (member && member.user && member.user.displayAvatarURL) {
    try {
      const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
      const avatarBuf = await fetchImageBuffer(avatarUrl, 3500);
      if (avatarBuf) {
        const avatarImg = await loadImage(avatarBuf);
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        avatarLoaded = true;
      }
    } catch (_) {}
  }

  if (!avatarLoaded) {
    // Silhouette fallback
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + 50, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(avatarX + avatarSize / 2, avatarY + 120, 46, 38, 0, Math.PI, 0, true);
    ctx.fill();
  }

  // Pixel Crown on top of avatar
  ctx.fillStyle = '#8b5cf6';
  ctx.fillRect(avatarX + avatarSize / 2 - 12, avatarY + 4, 6, 6);
  ctx.fillRect(avatarX + avatarSize / 2 - 3, avatarY + 4, 6, 6);
  ctx.fillRect(avatarX + avatarSize / 2 + 6, avatarY + 4, 6, 6);
  ctx.fillRect(avatarX + avatarSize / 2 - 10, avatarY + 10, 20, 5);

  // Lencana Royal Citizen
  const badgeY = leftY + leftH - 52;
  drawStarShape(ctx, leftX + 38, badgeY - 5, 4, 6, 2, '#a78bfa');
  drawStarShape(ctx, leftX + leftW - 38, badgeY - 5, 4, 6, 2, '#a78bfa');

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Consolas", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ROYAL CITIZEN', leftX + leftW / 2, badgeY);

  ctx.font = '9px "Consolas", monospace';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('AUTHENTIC IDENTIFIER', leftX + leftW / 2, badgeY + 16);

  // Right Section
  const rightX = 338;
  let curY = 74;

  const serverName = (member?.guild?.name || 'QUMPRUY').toUpperCase();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "Times New Roman", Georgia, serif';
  ctx.fillText(serverName, rightX, curY);

  curY += 26;
  ctx.font = 'bold 13px "Consolas", monospace';
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('—  O F F I C I A L   C O M M U N I T Y  —', rightX + 15, curY);

  curY += 15;
  ctx.strokeStyle = '#3d2f5c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightX, curY);
  ctx.lineTo(width - 55, curY);
  ctx.stroke();

  drawStarShape(ctx, rightX + (width - 55 - rightX) / 2, curY, 4, 5, 2, '#a78bfa');

  // Fields Table
  const displayName = (member?.displayName || member?.user?.username || 'NEVERENDLESSLY').toUpperCase().slice(0, 20);
  const username = (member?.user?.username || 'USER').toUpperCase().slice(0, 20);

  let statusText = 'VIA VANITY URL';
  if (inviteType === 'regular' && inviter) {
    statusText = `INVITED BY ${(inviter.displayName || inviter.username || 'FRIEND').toUpperCase().slice(0, 16)}`;
  } else if (inviteType === 'bot') {
    statusText = 'BOT AUTHORIZATION';
  } else if (inviteType === 'vanity') {
    statusText = 'VIA VANITY URL';
  } else if (inviteType === 'unknown') {
    statusText = 'DIRECT / DISCOVERY';
  }

  const joinDate = new Date();
  const dateStr = `${joinDate.getDate()} ${joinDate.toLocaleDateString('id-ID', { month: 'long' }).toUpperCase()} ${joinDate.getFullYear()}`;

  const fields = [
    { label: 'NAME', value: displayName },
    { label: 'DISCORD', value: username },
    { label: 'STATUS', value: statusText },
    { label: 'SINCE', value: dateStr }
  ];

  curY += 34;
  const labelX = rightX;
  const valueX = rightX + 115;
  const rowHeight = 33;

  for (const item of fields) {
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 14px "Consolas", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, labelX, curY);
    ctx.fillText(':', labelX + 88, curY);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Times New Roman", Georgia, serif';
    ctx.fillText(item.value, valueX, curY);

    ctx.strokeStyle = '#271f3b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(valueX, curY + 6);
    ctx.lineTo(width - 55, curY + 6);
    ctx.stroke();
    ctx.setLineDash([]);

    curY += rowHeight;
  }

  // Tagline Box
  curY += 10;
  const boxW = width - 55 - rightX;
  const boxH = 50;

  ctx.fillStyle = '#110e1a';
  ctx.fillRect(rightX, curY, boxW, boxH);
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1;
  ctx.strokeRect(rightX, curY, boxW, boxH);

  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 10px "Consolas", monospace';
  ctx.fillText('ROYAL STATUS :', rightX + 14, curY + 18);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic bold 14px "Times New Roman", Georgia, serif';
  ctx.fillText('WELCOME TO THE EMPIRE OF QUMPRUY', rightX + 25, curY + 36);

  // Barcode
  curY += boxH + 20;
  const barcodeX = rightX;
  const barcodeY = curY;
  const barcodeW = boxW;
  const barcodeH = 34;

  ctx.fillStyle = '#ffffff';
  let bx = barcodeX;
  const barPattern = [3, 1, 4, 1, 2, 1, 1, 2, 4, 1, 3, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 4];
  for (let i = 0; i < barPattern.length && bx < barcodeX + barcodeW; i++) {
    const w = barPattern[i];
    ctx.fillRect(bx, barcodeY, w, barcodeH);
    bx += w + (i % 2 === 0 ? 3 : 2);
  }

  // Barcode ID
  curY += barcodeH + 20;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Consolas", "Courier New", monospace';

  const mCount = memberCount || member?.guild?.memberCount || 1;
  drawStarShape(ctx, rightX + boxW / 2 - 110, curY - 5, 4, 5, 2, '#8b5cf6');
  ctx.fillText(`ID : QMP - ${mCount}`, rightX + boxW / 2, curY);
  drawStarShape(ctx, rightX + boxW / 2 + 110, curY - 5, 4, 5, 2, '#8b5cf6');

  return canvas.toBuffer('image/png');
}

/**
 * Membuat UI Embed Bersih & Minimalis untuk log member bergabung
 */
function buildInviteEmbed({
  member,
  inviter = null,
  inviteType = 'regular', // 'regular' | 'vanity' | 'bot' | 'unknown'
  inviteCode = null,
  inviteUses = null,
  inviterStats = null,
  isTest = false
}) {
  const guild = member.guild;
  const memberCount = guild.memberCount;
  const createdTs = Math.floor(member.user.createdTimestamp / 1000);
  const joinedTs = Math.floor((member.joinedTimestamp || Date.now()) / 1000);
  const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 256 });

  // Deteksi akun baru (< 3 hari)
  const isNewAccount = (Date.now() - member.user.createdTimestamp) < (3 * 24 * 60 * 60 * 1000);

  // Styling warna: Blurple rapi atau Dark Slate
  const embedColor = isTest ? 0x5865F2 : (isNewAccount ? 0xE67E22 : 0x2B2D31);

  let inviterDisplay = '';
  let codeDisplay = '';
  let statsDisplay = '';

  if (inviteType === 'regular' && inviter) {
    inviterDisplay = `• Pengundang: <@${inviter.id}>\n• Tag: \`${inviter.tag || inviter.username}\`\n• ID: \`${inviter.id}\``;
    codeDisplay = `• Tautan: \`${inviteCode ? `discord.gg/${inviteCode}` : 'N/A'}\`\n• Penggunaan: **${inviteUses ?? 1}** kali`;
    if (inviterStats) {
      statsDisplay = `• Total Net: **${inviterStats.total}** invite\n• Rincian: **${inviterStats.regular}** valid • **${inviterStats.leaves}** left${inviterStats.fake > 0 ? ` • **${inviterStats.fake}** baru` : ''}`;
    } else {
      statsDisplay = '• Statistik belum tercatat';
    }
  } else if (inviteType === 'vanity') {
    inviterDisplay = `• Tipe: Vanity URL Resmi Server\n• Server: **${guild.name}**`;
    codeDisplay = `• Tautan: \`discord.gg/${inviteCode || 'vanity'}\`\n• Penggunaan: **${inviteUses ?? 'N/A'}** kali`;
    statsDisplay = '• Tautan undangan kustom server';
  } else if (inviteType === 'bot') {
    inviterDisplay = inviter ? `• Ditambahkan: <@${inviter.id}>\n• Tag: \`${inviter.tag || inviter.username}\`` : '• Ditambahkan via OAuth Bot';
    codeDisplay = '• Otorisasi Aplikasi Bot (OAuth2)';
    statsDisplay = '• Integrasi Bot';
  } else {
    inviterDisplay = '• Tidak dapat dipastikan\n• Direct link / Widget / Temp invite';
    codeDisplay = '• Tautan: Tidak terlacak';
    statsDisplay = '• Bukan invite reguler aktif';
  }

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setAuthor({
      name: `INVITE TRACKER | Member Bergabung`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(isTest ? 'Uji Coba Tampilan Invite Tracker' : 'Member Baru Bergabung')
    .setDescription(`**${member.user.username}** telah bergabung ke **${guild.name}**.${isTest ? ' *(Pesan Simulasi)*' : ''}`)
    .setThumbnail(avatarURL)
    .addFields(
      {
        name: 'Member',
        value: `• User: <@${member.id}>\n• Tag: \`${member.user.tag}\`\n• ID: \`${member.id}\``,
        inline: true
      },
      {
        name: 'Diundang Oleh',
        value: inviterDisplay,
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: false
      },
      {
        name: 'Kode Undangan',
        value: codeDisplay,
        inline: true
      },
      {
        name: 'Statistik Pengundang',
        value: statsDisplay,
        inline: true
      },
      {
        name: '\u200B',
        value: '\u200B',
        inline: false
      },
      {
        name: 'Informasi Akun',
        value: `• Dibuat: <t:${createdTs}:R>\n• Bergabung: <t:${joinedTs}:R>`,
        inline: true
      },
      {
        name: 'Urutan Server',
        value: `• Urutan: Member ke-**#${memberCount}**\n• Total: **${memberCount}** member`,
        inline: true
      }
    )
    .setFooter({
      text: `${guild.name} • Invite Tracker • ${getFormattedTime()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTimestamp();

  return embed;
}

/**
 * Handle ketika ada member baru bergabung
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').Client} client
 */
async function handleMemberJoin(member, client) {
  const guild = member.guild;
  if (!guild) return;

  // Cek konfigurasi channel invite tracker di settings
  const settings = storage.read('settings');
  const guildConfig = settings[guild.id]?.inviteTracking || null;

  if (!client.invitesCache) client.invitesCache = new Map();
  const cachedData = client.invitesCache.get(guild.id);

  let inviteType = 'unknown';
  let inviter = null;
  let usedCode = null;
  let usedUses = null;

  // 1. Jika member adalah BOT, cek Audit Log
  if (member.user.bot) {
    inviteType = 'bot';
    if (guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
      try {
        const auditLogs = await guild.fetchAuditLogs({
          type: AuditLogEvent.BotAdd,
          limit: 1
        }).catch(() => null);

        const entry = auditLogs?.entries.first();
        if (entry && entry.target?.id === member.id && (Date.now() - entry.createdTimestamp < 30000)) {
          inviter = entry.executor;
        }
      } catch (_) {}
    }
  } else if (cachedData && guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    // 2. Fetch fresh invites
    const freshInvites = await guild.invites.fetch().catch(() => null);

    if (freshInvites) {
      // Cari invite yang uses-nya bertambah
      for (const [code, fresh] of freshInvites) {
        const cached = cachedData.invites.get(code);
        if (cached && fresh.uses > cached.uses) {
          inviteType = 'regular';
          usedCode = fresh.code;
          usedUses = fresh.uses;
          inviter = fresh.inviter ? {
            id: fresh.inviter.id,
            tag: fresh.inviter.tag || fresh.inviter.username,
            username: fresh.inviter.username
          } : cached.inviter;
          break;
        }
      }

      // Jika belum ketemu dan guild punya VANITY_URL, cek vanity
      if (inviteType === 'unknown' && guild.features.includes('VANITY_URL')) {
        const freshVanity = await guild.fetchVanityData().catch(() => null);
        if (freshVanity && freshVanity.uses > (cachedData.vanityUses || 0)) {
          inviteType = 'vanity';
          usedCode = freshVanity.code;
          usedUses = freshVanity.uses;
        }
      }

      // Perbarui cache dengan daftar invites terbaru
      await cacheGuildInvites(guild, client);
    }
  }

  // Cek apakah akun baru (< 3 hari)
  const isFake = (Date.now() - member.user.createdTimestamp) < (3 * 24 * 60 * 60 * 1000);

  // Simpan data invite ke invites.json
  const invitesData = storage.read('invites');
  if (!invitesData[guild.id]) {
    invitesData[guild.id] = { members: {}, inviters: {} };
  }
  if (!invitesData[guild.id].members) invitesData[guild.id].members = {};
  if (!invitesData[guild.id].inviters) invitesData[guild.id].inviters = {};

  invitesData[guild.id].members[member.id] = {
    inviterId: inviter?.id || null,
    inviteType,
    code: usedCode,
    joinedAt: Date.now(),
    fake: isFake
  };

  if (inviteType === 'regular' && inviter?.id) {
    if (!invitesData[guild.id].inviters[inviter.id]) {
      invitesData[guild.id].inviters[inviter.id] = { regular: 0, leaves: 0, fake: 0, bonus: 0 };
    }
    invitesData[guild.id].inviters[inviter.id].regular = (invitesData[guild.id].inviters[inviter.id].regular || 0) + 1;
    if (isFake) {
      invitesData[guild.id].inviters[inviter.id].fake = (invitesData[guild.id].inviters[inviter.id].fake || 0) + 1;
    }
  }

  storage.write('invites', invitesData);

  // Ambil statistik terkini pengundang
  let inviterStats = null;
  if (inviter?.id) {
    inviterStats = getInviterStats(guild.id, inviter.id);
  }

  // Kirim ke channel khusus jika aktif
  if (guildConfig && guildConfig.enabled && guildConfig.channelId) {
    const channel = guild.channels.cache.get(guildConfig.channelId)
      || await client.channels.fetch(guildConfig.channelId).catch(() => null);

    if (channel) {
      let ticketBuffer = null;
      try {
        ticketBuffer = await renderQumpruyTicket({
          member,
          inviter,
          inviteType,
          inviteCode: usedCode,
          memberCount: guild.memberCount
        });
      } catch (err) {
        console.warn(`[InviteTracker] Canvas render error:`, err.message);
      }

      if (ticketBuffer) {
        const attachment = new AttachmentBuilder(ticketBuffer, { name: 'qumpruy-ticket.png' });

        const rulesChannelId = settings[guild.id]?.rulesChannelId
          || guild.rulesChannelId
          || guild.channels.cache.find(c => c.name.includes('rules'))?.id;

        const components = [];
        if (rulesChannelId) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('READ RULES')
              .setStyle(ButtonStyle.Link)
              .setURL(`https://discord.com/channels/${guild.id}/${rulesChannelId}`)
          );
          components.push(row);
        }

        let inviterText = '`Vanity URL Server`';
        if (inviteType === 'regular' && inviter) {
          inviterText = `<@${inviter.id}>`;
        } else if (inviteType === 'bot') {
          inviterText = inviter ? `<@${inviter.id}> (Bot Auth)` : '`OAuth2 Bot`';
        } else if (inviteType === 'unknown') {
          inviterText = '`Direct Link / Discovery`';
        }

        const dateFormatted = new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const embed = new EmbedBuilder()
          .setColor(0x0c0a14)
          .setImage('attachment://qumpruy-ticket.png')
          .setFooter({
            text: `${guild.name} | ${dateFormatted} ${getFormattedTime()}`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
          });

        const sendOptions = {
          content: `Hii <@${member.id}>\n\nMember ke - **${guild.memberCount}**\nInvited by: ${inviterText}`,
          embeds: [embed],
          files: [attachment],
          components
        };

        let sent = false;
        for (let attempt = 1; attempt <= 2 && !sent; attempt++) {
          try {
            await channel.send(sendOptions);
            sent = true;
          } catch (sendErr) {
            const isNetErr = /other side closed|aborted|socket|econnreset|etimedout/i.test(sendErr.message || '');
            if (isNetErr && attempt === 1) {
              console.warn(`[InviteTracker] Jaringan terputus saat kirim tiket (${sendErr.message}), mencoba ulang dalam 1 detik...`);
              await new Promise(r => setTimeout(r, 1000));
            } else {
              console.warn(`[InviteTracker] Gagal kirim tiket dengan attachment (${sendErr.message}), beralih ke embed teks...`);
              break;
            }
          }
        }

        if (sent) return;
      }

      // Fallback ke embed standar jika rendering atau upload attachment gagal
      const embed = buildInviteEmbed({
        member,
        inviter,
        inviteType,
        inviteCode: usedCode,
        inviteUses: usedUses,
        inviterStats
      });
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
}

/**
 * Handle ketika ada member keluar dari server
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').Client} client
 */
async function handleMemberLeave(member, client) {
  const guild = member.guild;
  if (!guild) return;

  const invitesData = storage.read('invites');
  const guildData = invitesData[guild.id];
  if (!guildData || !guildData.members) return;

  const memberRecord = guildData.members[member.id];
  if (memberRecord && memberRecord.inviterId) {
    const inviterId = memberRecord.inviterId;
    if (!guildData.inviters) guildData.inviters = {};
    if (!guildData.inviters[inviterId]) {
      guildData.inviters[inviterId] = { regular: 0, leaves: 0, fake: 0, bonus: 0 };
    }

    guildData.inviters[inviterId].leaves = (guildData.inviters[inviterId].leaves || 0) + 1;
    storage.write('invites', invitesData);

    // Kirim notifikasi ringkas ke channel invite-logs jika dikonfigurasi
    const settings = storage.read('settings');
    const guildConfig = settings[guild.id]?.inviteTracking;
    if (guildConfig && guildConfig.enabled && guildConfig.channelId) {
      const channel = guild.channels.cache.get(guildConfig.channelId)
        || await client.channels.fetch(guildConfig.channelId).catch(() => null);

      if (channel) {
        const stats = getInviterStats(guild.id, inviterId);
        const leaveEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setAuthor({
            name: `INVITE TRACKER | Member Keluar`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
          })
          .setDescription(`**${member.user.username}** telah meninggalkan server.`)
          .addFields(
            {
              name: 'Member',
              value: `• User: <@${member.id}>\n• Tag: \`${member.user.tag}\``,
              inline: true
            },
            {
              name: 'Diundang Oleh',
              value: `• Pengundang: <@${inviterId}>\n• Total Net: **${stats.total}** invite`,
              inline: true
            }
          )
          .setFooter({
            text: `${guild.name} • Invite Tracker • ${getFormattedTime()}`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
          })
          .setTimestamp();

        await channel.send({ embeds: [leaveEmbed] }).catch(() => {});
      }
    }
  }
}

/**
 * Otomatis membuat channel khusus "invite-logs" dengan permission terproteksi
 * @param {import('discord.js').Guild} guild
 */
async function createDedicatedInviteChannel(guild) {
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('Bot membutuhkan izin Manage Channels (Kelola Saluran) untuk membuat channel khusus.');
  }

  // Cari channel yang mungkin sudah ada dengan nama serupa
  const existing = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === 'invite-logs');
  if (existing) {
    return { channel: existing, created: false };
  }

  // Buat channel baru dengan permission read-only bagi member biasa
  const newChannel = await guild.channels.create({
    name: 'invite-logs',
    type: ChannelType.GuildText,
    topic: 'Log pelacakan tautan undangan server (Invite Tracker)',
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.SendMessages],
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ]
  });

  return { channel: newChannel, created: true };
}

module.exports = {
  initInviteTracker,
  cacheGuildInvites,
  handleInviteCreate,
  handleInviteDelete,
  handleMemberJoin,
  handleMemberLeave,
  getInviterStats,
  getLeaderboard,
  buildInviteEmbed,
  createDedicatedInviteChannel,
  renderQumpruyTicket
};
