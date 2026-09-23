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
  guild = null,
  inviter = null,
  inviteType = 'regular',
  inviteCode = null,
  memberCount = null
}) {
  const width = 1060;
  const height = 660;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#090812');
  bg.addColorStop(0.5, '#120d24');
  bg.addColorStop(1, '#07060e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle Grid
  ctx.save();
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.05)';
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

  // Floating pixel particles
  const particles = [
    { x: 390, y: 55, s: 4, c: '#a78bfa' },
    { x: 440, y: 45, s: 3, c: '#ffffff' },
    { x: 990, y: 65, s: 5, c: '#8b5cf6' },
    { x: 1010, y: 95, s: 3, c: '#c4b5fd' },
    { x: 50, y: 610, s: 4, c: '#8b5cf6' },
    { x: 380, y: 620, s: 3, c: '#ffffff' },
    { x: 1000, y: 610, s: 5, c: '#a78bfa' }
  ];
  for (const p of particles) {
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x, p.y, p.s, p.s);
  }

  // Outer Double Border with minimal margin (14px)
  const offset = 14;
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(offset, offset, width - 2 * offset, height - 2 * offset);

  ctx.strokeStyle = 'rgba(196, 181, 253, 0.3)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(offset + 8, offset + 8, width - 2 * (offset + 8), height - 2 * (offset + 8));

  // Corner metallic accents
  function drawCornerAccent(x, y) {
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }
  drawCornerAccent(offset + 8, offset + 8);
  drawCornerAccent(width - offset - 8, offset + 8);
  drawCornerAccent(offset + 8, height - offset - 8);
  drawCornerAccent(width - offset - 8, height - offset - 8);

  // Left Section (ID / Photo Box)
  const leftX = 36;
  const leftY = 36;
  const leftW = 330;
  const leftH = height - 72;

  ctx.fillStyle = '#100d1c';
  ctx.fillRect(leftX, leftY, leftW, leftH);
  ctx.strokeStyle = '#4c3a72';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftX, leftY, leftW, leftH);

  // Logo top left
  const logoPath = path.join(process.cwd(), 'src', 'assets', 'qumpruy_logo.jpg');
  const logoSize = 88;
  const logoX = leftX + (leftW - logoSize) / 2;
  const logoY = leftY + 22;

  if (fs.existsSync(logoPath)) {
    try {
      const logoImg = await loadImage(logoPath);
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
      ctx.stroke();
    } catch (_) {}
  }

  // Member Avatar Box (220 x 220px - Maximized!)
  const avatarSize = 220;
  const avatarX = leftX + (leftW - avatarSize) / 2;
  const avatarY = leftY + 135;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(avatarX - 5, avatarY - 5, avatarSize + 10, avatarSize + 10);

  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(avatarX - 10, avatarY - 10, avatarSize + 20, avatarSize + 20);

  ctx.fillStyle = '#181328';
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
    ctx.fillStyle = '#f5f3ff';
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + 70, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(avatarX + avatarSize / 2, avatarY + 172, 70, 56, 0, Math.PI, 0, true);
    ctx.fill();
  }

  // Pixel Crown on top of avatar
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(avatarX + avatarSize / 2 - 16, avatarY + 8, 8, 8);
  ctx.fillRect(avatarX + avatarSize / 2 - 4, avatarY + 8, 8, 8);
  ctx.fillRect(avatarX + avatarSize / 2 + 8, avatarY + 8, 8, 8);
  ctx.fillRect(avatarX + avatarSize / 2 - 14, avatarY + 17, 28, 7);

  // Lencana Royal Citizen
  const badgeY = leftY + leftH - 70;
  drawStarShape(ctx, leftX + 45, badgeY - 5, 4, 8, 3, '#c084fc');
  drawStarShape(ctx, leftX + leftW - 45, badgeY - 5, 4, 8, 3, '#c084fc');

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Consolas", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ROYAL CITIZEN', leftX + leftW / 2, badgeY);

  ctx.font = '14px "Consolas", monospace';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('AUTHENTIC IDENTIFIER', leftX + leftW / 2, badgeY + 26);

  // Right Section
  const rightX = 400;
  let curY = 74;

  const serverName = (guild?.name || member?.guild?.name || 'QUMPRUY').toUpperCase();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  let titleFontSize = 54;
  ctx.font = `bold ${titleFontSize}px "Times New Roman", Georgia, serif`;
  while (ctx.measureText(serverName).width > 580 && titleFontSize > 28) {
    titleFontSize -= 2;
    ctx.font = `bold ${titleFontSize}px "Times New Roman", Georgia, serif`;
  }
  ctx.fillText(serverName, rightX, curY);

  curY += 34;
  ctx.font = 'bold 20px "Consolas", monospace';
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('—  O F F I C I A L   C O M M U N I T Y  —', rightX + 15, curY);

  curY += 22;
  ctx.strokeStyle = '#4c3a72';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rightX, curY);
  ctx.lineTo(width - 45, curY);
  ctx.stroke();

  drawStarShape(ctx, rightX + (width - 45 - rightX) / 2, curY, 4, 7, 3, '#c084fc');

  // Fields Table
  const displayName = (member?.displayName || member?.user?.username || 'CITIZEN').toUpperCase().slice(0, 22);
  const username = (member?.user?.username || 'USER').toUpperCase().slice(0, 22);

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

  curY += 48;
  const labelX = rightX;
  const valueX = rightX + 165;
  const rowHeight = 50;

  for (const item of fields) {
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 22px "Consolas", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, labelX, curY);
    ctx.fillText(':', labelX + 130, curY);

    ctx.fillStyle = '#ffffff';
    let valFontSize = 24;
    ctx.font = `bold ${valFontSize}px "Times New Roman", Georgia, serif`;
    while (ctx.measureText(item.value).width > (width - 45 - valueX) && valFontSize > 15) {
      valFontSize -= 1;
      ctx.font = `bold ${valFontSize}px "Times New Roman", Georgia, serif`;
    }
    ctx.fillText(item.value, valueX, curY);

    ctx.strokeStyle = '#2d2345';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(valueX, curY + 8);
    ctx.lineTo(width - 45, curY + 8);
    ctx.stroke();
    ctx.setLineDash([]);

    curY += rowHeight;
  }

  // Tagline Box
  curY += 12;
  const boxW = width - 45 - rightX;
  const boxH = 74;

  ctx.fillStyle = '#120e20';
  ctx.fillRect(rightX, curY, boxW, boxH);
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rightX, curY, boxW, boxH);

  drawStarShape(ctx, rightX + 24, curY + 24, 4, 5.5, 2.5, '#c084fc');
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 14px "Consolas", monospace';
  ctx.fillText('ROYAL STATUS :', rightX + 38, curY + 28);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic bold 21px "Times New Roman", Georgia, serif';
  ctx.fillText('WELCOME TO THE EMPIRE OF QUMPRUY', rightX + 34, curY + 56);

  // Barcode
  curY += boxH + 26;
  const barcodeX = rightX;
  const barcodeY = curY;
  const barcodeW = boxW;
  const barcodeH = 54;

  ctx.fillStyle = '#ffffff';
  let bx = barcodeX;
  const barPattern = [4, 2, 5, 2, 3, 1, 3, 4, 6, 2, 4, 2, 1, 5, 2, 2, 6, 2, 3, 1, 5, 2, 2, 6, 2, 3, 4, 2, 3, 2, 6, 2, 2, 5, 2, 3, 6, 2, 4, 2, 3, 2, 6, 3, 2, 5, 3, 2, 6];
  for (let i = 0; i < barPattern.length && bx < barcodeX + barcodeW; i++) {
    const w = barPattern[i];
    ctx.fillRect(bx, barcodeY, w, barcodeH);
    bx += w + (i % 2 === 0 ? 3 : 2);
  }

  // Barcode ID
  curY += barcodeH + 30;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Consolas", monospace';

  const mCount = memberCount || member?.guild?.memberCount || guild?.memberCount || 1;
  drawStarShape(ctx, rightX + boxW / 2 - 160, curY - 8, 4, 9, 3.5, '#a855f7');
  ctx.fillText(`ID : QMP - ${mCount}`, rightX + boxW / 2, curY);
  drawStarShape(ctx, rightX + boxW / 2 + 160, curY - 8, 4, 9, 3.5, '#a855f7');

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
  const serverName = (guild?.name || member?.guild?.name || 'QUMPRUY').toUpperCase();
  const memberCount = guild?.memberCount || 1;
  const createdTs = Math.floor((member.user?.createdTimestamp || Date.now()) / 1000);
  const joinedTs = Math.floor((member.joinedTimestamp || Date.now()) / 1000);
  const avatarURL = member.user?.displayAvatarURL ? member.user.displayAvatarURL({ dynamic: true, size: 256 }) : undefined;

  // Deteksi akun baru (< 3 hari)
  const isNewAccount = member.user?.createdTimestamp ? (Date.now() - member.user.createdTimestamp) < (3 * 24 * 60 * 60 * 1000) : false;

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
    inviterDisplay = `• Tipe: Vanity URL Resmi Server\n• Server: **${serverName}**`;
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
    .setColor(0x0c0a14)
    .setAuthor({
      name: `${serverName} • Member Directory`,
      iconURL: guild?.iconURL ? guild.iconURL({ dynamic: true }) : undefined
    })
    .setTitle(isTest ? 'Simulasi Pelacakan Undangan' : 'Member Baru Bergabung')
    .setDescription(`Selamat datang <@${member.id}> di **${serverName}**.${isTest ? ' *(Pesan Simulasi)*' : ''}`)
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
      // Kirim embed log undangan estetik (tanpa kanvas grafis sesuai permintaan)
      const embed = buildInviteEmbed({
        member,
        inviter,
        inviteType,
        inviteCode: usedCode,
        inviteUses: usedUses,
        inviterStats
      });
      await channel.send({ embeds: [embed] }).catch(err => {
        console.warn('[InviteTracker Send Error]:', err.message);
      });
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
