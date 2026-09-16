const http = require('http');
const { EmbedBuilder, WebhookClient, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

// Memory cache untuk deduplikasi ID transaksi (mencegah replay / double send)
const processedDonationIds = new Set();
const MAX_PROCESSED_CACHE = 1000;

let webhookServer = null;

/**
 * Format angka ke format mata uang Rupiah (contoh: 50000 -> Rp 50.000)
 * @param {number|string} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  const num = parseInt(amount, 10);
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * Bersihkan teks dari mention berbahaya (@everyone, @here)
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
 * Buat Embed estetik untuk notifikasi donasi Saweria
 * @param {object} donation
 * @returns {EmbedBuilder}
 */
function buildSaweriaEmbed(donation) {
  const donatorName = sanitizeText(donation.donator_name) || 'Orang Baik (Anonim)';
  const amountFormatted = formatRupiah(donation.amount_raw || 0);
  const message = sanitizeText(donation.message) || '*(Tidak menyertakan pesan)*';
  const isTest = donation.is_test || donation.type === 'test';

  const embed = new EmbedBuilder()
    .setColor(0xFAAE2B) // Warna oranye keemasan khas Saweria
    .setAuthor({
      name: isTest ? '🧪 SIMULASI TES DONASI SAWERIA' : '✨ NOTIFIKASI DONASI SAWERIA',
      iconURL: 'https://saweria.co/favicon.ico',
      url: 'https://saweria.co'
    })
    .setTitle(isTest ? '🎉 Tes Donasi Berhasil Diterima!' : `🎉 Donasi Baru dari ${donatorName}!`)
    .setDescription(
      `Terima kasih banyak atas dukungan yang diberikan! Setiap dukungan sangat berarti bagi perkembangan server ini. ❤️`
    )
    .addFields(
      {
        name: '👤 Donatur',
        value: `**${donatorName}**`,
        inline: true
      },
      {
        name: '💰 Nominal',
        value: `**${amountFormatted}**`,
        inline: true
      },
      {
        name: '💬 Pesan Donatur',
        value: message.length > 1000 ? message.substring(0, 997) + '...' : message,
        inline: false
      }
    )
    .setThumbnail('https://cdn.discordapp.com/emojis/1054708705007939634.webp?size=96&quality=lossless')
    .setFooter({
      text: `ID: ${donation.id || 'N/A'}${isTest ? ' • Uji Coba' : ''} • Saweria Integration`,
      iconURL: 'https://saweria.co/favicon.ico'
    })
    .setTimestamp(donation.created_at ? new Date(donation.created_at) : new Date());

  return embed;
}

/**
 * Simpan donasi ke riwayat data/saweria_donations.json
 * @param {object} donation
 * @param {string} [guildId]
 */
function recordDonationHistory(donation, guildId = 'GLOBAL') {
  try {
    const history = storage.read('saweria_donations');
    const list = Array.isArray(history.donations) ? history.donations : [];

    list.unshift({
      id: donation.id || `gen_${Date.now()}`,
      donator_name: donation.donator_name || 'Anonim',
      amount_raw: donation.amount_raw || 0,
      message: donation.message || '',
      created_at: donation.created_at || new Date().toISOString(),
      guild_id: guildId,
      is_test: !!donation.is_test
    });

    // Simpan maksimal 200 riwayat transaksi terakhir
    if (list.length > 200) {
      list.length = 200;
    }

    storage.write('saweria_donations', { donations: list, lastUpdated: new Date().toISOString() });
  } catch (err) {
    console.error('⚠️ [Saweria] Gagal mencatat riwayat donasi:', err.message);
  }
}

/**
 * Kirim notifikasi donasi ke Discord (Text Channel atau Webhook)
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

  // 1. Identifikasi daftar guild target
  const targetGuildConfigs = [];

  if (targetGuildId) {
    const gConfig = settings[targetGuildId]?.saweria;
    if (gConfig) {
      targetGuildConfigs.push({ guildId: targetGuildId, ...gConfig });
    }
  } else {
    // Periksa semua guild yang mengaktifkan Saweria
    for (const [guildId, data] of Object.entries(settings)) {
      if (data.saweria && data.saweria.enabled) {
        targetGuildConfigs.push({ guildId, ...data.saweria });
      }
    }
  }

  // 2. Fallback jika tidak ada konfigurasi per guild, cek .env global
  if (targetGuildConfigs.length === 0) {
    const envChannelId = process.env.SAWERIA_DEFAULT_CHANNEL_ID;
    const envWebhookUrl = process.env.SAWERIA_DISCORD_WEBHOOK_URL;

    if (envChannelId || envWebhookUrl) {
      targetGuildConfigs.push({
        guildId: 'ENV_CONFIG',
        enabled: true,
        channelId: envChannelId,
        webhookUrl: envWebhookUrl,
        minAmount: 0
      });
    }
  }

  // 3. Eksekusi pengiriman untuk setiap target
  for (const config of targetGuildConfigs) {
    if (!config.enabled && !donationData.is_test) continue;

    // Cek filter minimal donasi
    const minAmount = config.minAmount || 0;
    if (amount < minAmount && !donationData.is_test) {
      console.log(`ℹ️ [Saweria] Donasi (${amount}) di bawah batas minimum (${minAmount}) untuk target: ${config.guildId}`);
      continue;
    }

    let payloadContent = null;
    if (config.roleId) {
      payloadContent = `<@&${config.roleId}> 🎁 Ada donasi baru di Saweria!`;
    }

    let sent = false;

    // A. Pengiriman via Discord Webhook URL jika dikonfigurasi
    if (config.webhookUrl && config.webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      try {
        const webhookClient = new WebhookClient({ url: config.webhookUrl });
        await webhookClient.send({
          username: 'Saweria Alert',
          avatarURL: 'https://saweria.co/favicon.ico',
          content: payloadContent || undefined,
          embeds: [embed]
        });
        sent = true;
        sentCount++;
      } catch (whErr) {
        console.error(`⚠️ [Saweria] Gagal kirim via Webhook URL (${config.guildId}):`, whErr.message);
        errors.push(`Webhook Error: ${whErr.message}`);
      }
    }

    // B. Pengiriman via Bot Text Channel
    if (!sent && config.channelId && client) {
      try {
        const channel = client.channels.cache.get(config.channelId) ||
          await client.channels.fetch(config.channelId).catch(() => null);

        if (channel && channel.isTextBased()) {
          const perms = channel.permissionsFor(channel.guild?.members.me);
          if (perms && (!perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.EmbedLinks))) {
            errors.push(`Bot kekurangan izin kirim pesan/embed di channel <#${config.channelId}>`);
          } else {
            await channel.send({
              content: payloadContent || undefined,
              embeds: [embed]
            });
            sent = true;
            sentCount++;
          }
        } else {
          errors.push(`Channel ${config.channelId} tidak ditemukan.`);
        }
      } catch (chErr) {
        console.error(`⚠️ [Saweria] Gagal kirim ke Channel (${config.channelId}):`, chErr.message);
        errors.push(`Channel Error: ${chErr.message}`);
      }
    }
  }

  // Catat riwayat
  recordDonationHistory(donationData, targetGuildId || 'BROADCAST');

  return { sentCount, errors };
}

/**
 * Jalankan HTTP Webhook listener server untuk Saweria
 * @param {import('discord.js').Client} client
 */
function startSaweriaWebhookServer(client) {
  const port = parseInt(process.env.SAWERIA_PORT, 10) || 3000;
  const configuredSecret = (process.env.SAWERIA_SECRET || '').trim();

  if (webhookServer) {
    console.log(`ℹ️ [Saweria Webhook] Server sudah berjalan di port ${port}`);
    return webhookServer;
  }

  webhookServer = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, ''); // normalkan trailing slash

    // Endpoint Health Check (GET /webhook/saweria atau GET /saweria)
    if (req.method === 'GET' && (pathname === '/webhook/saweria' || pathname === '/saweria' || pathname === '')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'online',
        service: 'Qumpruy Bot - Saweria Webhook Service',
        endpoint: '/webhook/saweria',
        message: 'Endpoint siap menerima POST request dari Saweria.',
        uptime_seconds: Math.floor(process.uptime())
      }));
    }

    // Endpoint Menerima Webhook Donasi (POST /webhook/saweria atau POST /saweria)
    if (req.method === 'POST' && (pathname === '/webhook/saweria' || pathname === '/saweria')) {
      // 1. Validasi Keamanan Token Rahasia (Optional Secret)
      if (configuredSecret) {
        const queryToken = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('secret');
        const headerSecret = req.headers['x-saweria-secret'] || req.headers['authorization'];
        const authHeaderMatch = headerSecret && headerSecret.startsWith('Bearer ') ? headerSecret.slice(7) : headerSecret;

        const isAuthorized = (queryToken && queryToken === configuredSecret) ||
                             (authHeaderMatch && authHeaderMatch === configuredSecret);

        if (!isAuthorized) {
          console.warn(`🔒 [Saweria Webhook] Upaya akses tidak sah (Invalid Secret Token) dari IP: ${req.socket.remoteAddress}`);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Unauthorized: Invalid secret token' }));
        }
      }

      // 2. Baca Body Request dengan batas aman ukuran payload (Max 64KB)
      let bodyData = '';
      const MAX_BODY_SIZE = 64 * 1024;

      req.on('data', chunk => {
        bodyData += chunk;
        if (bodyData.length > MAX_BODY_SIZE) {
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
          } catch (pErr) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Invalid JSON format' }));
          }

          // 3. Cek Deduplikasi Transaksi ID
          const transactionId = payload.id;
          if (transactionId) {
            if (processedDonationIds.has(transactionId)) {
              console.log(`ℹ️ [Saweria Webhook] Transaksi duplikat diabaikan: ${transactionId}`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ status: 'duplicate_ignored', id: transactionId }));
            }

            // Tambahkan ke cache
            processedDonationIds.add(transactionId);
            if (processedDonationIds.size > MAX_PROCESSED_CACHE) {
              const firstVal = processedDonationIds.values().next().value;
              processedDonationIds.delete(firstVal);
            }
          }

          console.log(`\n💖 ==========================================`);
          console.log(`🎉 [Saweria Webhook] Donasi Diterima!`);
          console.log(`👤 Dari: ${payload.donator_name || 'Anonim'}`);
          console.log(`💰 Nominal: ${formatRupiah(payload.amount_raw || 0)}`);
          console.log(`💬 Pesan: "${payload.message || '-'}"`);
          console.log(`💖 ==========================================\n`);

          // Target guild spesifik jika disediakan di query parameter (?guild=GUILD_ID)
          const queryGuild = parsedUrl.searchParams.get('guild') || null;

          // 4. Kirim notifikasi ke Discord
          const result = await sendSaweriaNotification(client, payload, queryGuild);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            received: true,
            sent_count: result.sentCount,
            errors: result.errors.length > 0 ? result.errors : undefined
          }));
        } catch (err) {
          console.error('❌ [Saweria Webhook] Error saat memproses request:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });

      return;
    }

    // Endpoint 404 Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found. Gunakan POST /webhook/saweria' }));
  });

  webhookServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ [Saweria Webhook] Port ${port} sudah digunakan aplikasi lain! Atur SAWERIA_PORT di .env jika ingin mengubah port.`);
    } else {
      console.error('❌ [Saweria Webhook] Server error:', err.message);
    }
  });

  webhookServer.listen(port, '0.0.0.0', () => {
    console.log(`🔌 [Saweria Webhook] Server aktif & mendengarkan di http://0.0.0.0:${port}/webhook/saweria`);
  });

  return webhookServer;
}

module.exports = {
  startSaweriaWebhookServer,
  sendSaweriaNotification,
  formatRupiah,
  buildSaweriaEmbed
};
