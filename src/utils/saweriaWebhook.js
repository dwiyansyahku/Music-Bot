const http = require('http');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

// Memory cache untuk deduplikasi ID transaksi (mencegah double send)
const processedDonationIds = new Set();
const MAX_PROCESSED_CACHE = 1000;

let webhookServer = null;

/**
 * Format angka ke mata uang Rupiah
 * @param {number|string} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  const num = parseInt(amount, 10);
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * Bersihkan teks dari mention massal
 * @param {string} text
 * @returns {string}
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/@everyone/gi, '@\u200beveryone')
    .replace(/@here/gi, '@\u200bhere');
}

/**
 * Buat Embed minimalis untuk notifikasi donasi Saweria
 * @param {object} donation
 * @returns {EmbedBuilder}
 */
function buildSaweriaEmbed(donation) {
  const donatorName = sanitizeText(donation.donator_name) || 'Anonim';
  const amountFormatted = formatRupiah(donation.amount_raw || 0);
  const message = sanitizeText(donation.message) || '*(Tanpa pesan)*';
  const isTest = donation.is_test || donation.type === 'test';

  return new EmbedBuilder()
    .setColor(0xFAAE2B) // Saweria Amber Gold
    .setAuthor({
      name: isTest ? 'Uji Coba Donasi Saweria' : 'Donasi Saweria',
      iconURL: 'https://saweria.co/favicon.ico',
      url: 'https://saweria.co'
    })
    .setTitle(isTest ? 'Simulasi Donasi Berhasil Diterima' : `Donasi Baru dari ${donatorName}`)
    .setDescription('Terima kasih banyak atas dukungan yang telah diberikan.')
    .addFields(
      {
        name: 'Donatur',
        value: donatorName,
        inline: true
      },
      {
        name: 'Nominal',
        value: `**${amountFormatted}**`,
        inline: true
      },
      {
        name: 'Pesan',
        value: message.length > 1000 ? message.substring(0, 997) + '...' : message,
        inline: false
      }
    )
    .setFooter({
      text: `ID: ${donation.id || 'N/A'}${isTest ? ' (Simulasi)' : ''} • Saweria`,
      iconURL: 'https://saweria.co/favicon.ico'
    })
    .setTimestamp(donation.created_at ? new Date(donation.created_at) : new Date());
}

/**
 * Kirim notifikasi donasi ke channel Discord
 * @param {import('discord.js').Client} client
 * @param {object} donationData
 * @param {string|null} [targetGuildId]
 * @returns {Promise<{ sentCount: number, errors: string[] }>}
 */
async function sendSaweriaNotification(client, donationData, targetGuildId = null) {
  const embed = buildSaweriaEmbed(donationData);
  const settings = storage.read('settings');
  const amount = parseInt(donationData.amount_raw, 10) || 0;

  let sentCount = 0;
  const errors = [];

  const targetGuildConfigs = [];

  if (targetGuildId) {
    const gConfig = settings[targetGuildId]?.saweria;
    if (gConfig) {
      targetGuildConfigs.push({ guildId: targetGuildId, ...gConfig });
    }
  } else {
    for (const [guildId, data] of Object.entries(settings)) {
      if (data.saweria && data.saweria.enabled && data.saweria.channelId) {
        targetGuildConfigs.push({ guildId, ...data.saweria });
      }
    }
  }

  for (const config of targetGuildConfigs) {
    if (!config.enabled && !donationData.is_test) continue;

    // Filter nominal minimum jika ada
    const minAmount = config.minAmount || 0;
    if (amount < minAmount && !donationData.is_test) {
      continue;
    }

    if (!config.channelId || !client) continue;

    try {
      const channel = client.channels.cache.get(config.channelId) ||
        await client.channels.fetch(config.channelId).catch(() => null);

      if (channel && channel.isTextBased()) {
        const perms = channel.permissionsFor(channel.guild?.members.me);
        if (perms && (!perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.EmbedLinks))) {
          errors.push(`Bot kekurangan izin kirim pesan/embed di channel <#${config.channelId}>`);
        } else {
          const saweriaUrl = process.env.SAWERIA_URL || 'https://saweria.co/qumpruy';
          const linkButtonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Dukung di Saweria')
              .setStyle(ButtonStyle.Link)
              .setURL(saweriaUrl)
          );

          await channel.send({
            embeds: [embed],
            components: [linkButtonRow]
          });
          sentCount++;
        }
      } else {
        errors.push(`Channel ${config.channelId} tidak ditemukan.`);
      }
    } catch (chErr) {
      console.error(`[Saweria] Gagal kirim ke channel ${config.channelId}:`, chErr.message);
      errors.push(`Channel Error: ${chErr.message}`);
    }
  }

  return { sentCount, errors };
}

/**
 * Jalankan server Webhook listener untuk Saweria
 * @param {import('discord.js').Client} client
 */
function startSaweriaWebhookServer(client) {
  const port = parseInt(process.env.SAWERIA_PORT, 10) || 3000;
  const configuredSecret = (process.env.SAWERIA_SECRET || '').trim();

  if (webhookServer) return webhookServer;

  webhookServer = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, '');

    // Health Check
    if (req.method === 'GET' && (pathname === '/webhook/saweria' || pathname === '/saweria' || pathname === '')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'online',
        service: 'Qumpruy Bot - Saweria Webhook',
        endpoint: '/webhook/saweria',
        uptime_seconds: Math.floor(process.uptime())
      }));
    }

    // Menerima Payload Donasi dari Saweria
    if (req.method === 'POST' && (pathname === '/webhook/saweria' || pathname === '/saweria')) {
      // 1. Verifikasi Secret Token jika diatur
      if (configuredSecret) {
        const queryToken = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('secret');
        const headerSecret = req.headers['x-saweria-secret'] || req.headers['authorization'];
        const authMatch = headerSecret && headerSecret.startsWith('Bearer ') ? headerSecret.slice(7) : headerSecret;

        if (queryToken !== configuredSecret && authMatch !== configuredSecret) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Unauthorized: Invalid secret token' }));
        }
      }

      // 2. Baca Body Request
      let bodyData = '';
      req.on('data', chunk => {
        bodyData += chunk;
        if (bodyData.length > 65536) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload too large' }));
          req.destroy();
        }
      });

      req.on('end', async () => {
        try {
          if (!bodyData) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Empty payload' }));
          }

          let payload;
          try {
            payload = JSON.parse(bodyData);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }

          // 3. Deduplikasi ID Transaksi
          if (payload.id) {
            if (processedDonationIds.has(payload.id)) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ status: 'duplicate_ignored' }));
            }
            processedDonationIds.add(payload.id);
            if (processedDonationIds.size > MAX_PROCESSED_CACHE) {
              const firstVal = processedDonationIds.values().next().value;
              processedDonationIds.delete(firstVal);
            }
          }

          console.log(`[Saweria] Donasi diterima: ${payload.donator_name || 'Anonim'} (${formatRupiah(payload.amount_raw || 0)}) - "${payload.message || '-'}"`);

          const queryGuild = parsedUrl.searchParams.get('guild') || null;
          const result = await sendSaweriaNotification(client, payload, queryGuild);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            sent_count: result.sentCount,
            errors: result.errors.length > 0 ? result.errors : undefined
          }));
        } catch (err) {
          console.error('[Saweria Webhook Error]:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });

      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  webhookServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Saweria Webhook] Port ${port} sudah digunakan aplikasi lain.`);
    } else {
      console.error('[Saweria Webhook] Server error:', err.message);
    }
  });

  webhookServer.listen(port, '0.0.0.0', () => {
    console.log(`[Saweria Webhook] Server aktif di http://0.0.0.0:${port}/webhook/saweria`);
  });

  return webhookServer;
}

module.exports = {
  startSaweriaWebhookServer,
  sendSaweriaNotification,
  formatRupiah,
  buildSaweriaEmbed
};
