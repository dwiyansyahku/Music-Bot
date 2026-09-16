const http = require('http');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const storage = require('./storage');

// Memory cache untuk deduplikasi ID transaksi (mencegah double send)
const processedDonationIds = new Set();
const MAX_PROCESSED_CACHE = 1000;

// URL Logo Saweria PNG yang valid (Discord tidak mendukung .ico)
const SAWERIA_ICON_URL = 'https://saweria.co/apple-touch-icon.png';

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
 * Normalisasi payload Saweria dari berbagai kemungkinan variasi struktur
 * @param {object} raw
 * @returns {{ donator_name: string, amount_raw: number, message: string, id: string|null, created_at: string, is_test: boolean }}
 */
function normalizeSaweriaPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      donator_name: 'Anonim',
      amount_raw: 0,
      message: '*(Tanpa pesan)*',
      id: `sw_${Date.now()}`,
      created_at: new Date().toISOString(),
      is_test: false
    };
  }

  // Cek jika data dibungkus di dalam objek 'data', 'donation', 'body', dll.
  const data = (raw.data && typeof raw.data === 'object') ? raw.data :
               (raw.donation && typeof raw.donation === 'object') ? raw.donation :
               (raw.body && typeof raw.body === 'object') ? raw.body : raw;

  // 1. Ekstrak Nama Donatur
  let donatorName =
    data.donator_name ||
    data.name ||
    data.donator ||
    data.donor_name ||
    data.sender ||
    data.from ||
    data.username ||
    data.customer_name ||
    raw.donator_name ||
    raw.name ||
    raw.donator;

  // 2. Ekstrak Nominal Donasi
  let rawAmount =
    data.amount_raw ??
    data.amount ??
    data.nominal ??
    data.total ??
    data.amount_to_display ??
    (data.etc && data.etc.amount_to_display) ??
    raw.amount_raw ??
    raw.amount ??
    raw.nominal;

  // 3. Ekstrak Pesan Donasi
  let rawMessage =
    data.message ||
    data.msg ||
    data.pesan ||
    data.comment ||
    data.notes ||
    raw.message ||
    raw.msg ||
    raw.pesan;

  // 4. Ekstrak ID Transaksi
  let transactionId =
    data.id ||
    data.transaction_id ||
    data.order_id ||
    data.bill_id ||
    data.id_transaksi ||
    raw.id ||
    raw.transaction_id;

  // 5. Dukungan jika Saweria mengirim payload format Webhook Discord
  // Contoh: { content: "...", embeds: [...] }
  if ((!rawAmount || !donatorName) && (raw.content || raw.embeds)) {
    if (Array.isArray(raw.embeds) && raw.embeds.length > 0) {
      const em = raw.embeds[0];
      if (!donatorName && em.author?.name) donatorName = em.author.name;
      if (!donatorName && em.title) donatorName = em.title;
      if (!rawMessage && em.description) rawMessage = em.description;
      if (Array.isArray(em.fields)) {
        for (const f of em.fields) {
          const fn = (f.name || '').toLowerCase();
          if (!donatorName && (fn.includes('donat') || fn.includes('nama') || fn.includes('user') || fn.includes('pengirim'))) {
            donatorName = f.value;
          }
          if (!rawAmount && (fn.includes('nominal') || fn.includes('jumlah') || fn.includes('amount') || fn.includes('rp'))) {
            rawAmount = f.value;
          }
          if (!rawMessage && (fn.includes('pesan') || fn.includes('message') || fn.includes('catatan'))) {
            rawMessage = f.value;
          }
        }
      }
    }

    if (typeof raw.content === 'string' && raw.content.trim()) {
      if (!rawMessage) rawMessage = raw.content;
      const amountMatch = raw.content.match(/(?:Rp\.?\s*|IDR\s*)([\d.,]+)/i);
      if (amountMatch && !rawAmount) {
        rawAmount = amountMatch[1];
      }
    }
  }

  // Konversi amount ke integer murni
  let numericAmount = 0;
  if (typeof rawAmount === 'string') {
    const cleanDigits = rawAmount.replace(/[^\d]/g, '');
    numericAmount = parseInt(cleanDigits, 10) || 0;
  } else if (typeof rawAmount === 'number') {
    numericAmount = rawAmount;
  }

  const isTest = !!(
    raw.is_test ||
    raw.type === 'test' ||
    data.is_test ||
    data.type === 'test' ||
    (transactionId && transactionId.toString().startsWith('test_'))
  );

  return {
    donator_name: sanitizeText(donatorName) || 'Anonim',
    amount_raw: numericAmount,
    message: sanitizeText(rawMessage) || '*(Tanpa pesan)*',
    id: transactionId ? transactionId.toString().trim() : null,
    created_at: raw.created_at || data.created_at || new Date().toISOString(),
    is_test: isTest
  };
}

/**
 * Buat Embed minimalis untuk notifikasi donasi Saweria
 * @param {object} rawDonation
 * @returns {EmbedBuilder}
 */
function buildSaweriaEmbed(rawDonation) {
  const donation = normalizeSaweriaPayload(rawDonation);
  const amountFormatted = formatRupiah(donation.amount_raw || 0);
  const isTest = donation.is_test;

  return new EmbedBuilder()
    .setColor(0xFAAE2B) // Saweria Amber Gold
    .setAuthor({
      name: isTest ? 'Uji Coba Donasi Saweria' : 'Donasi Saweria',
      iconURL: SAWERIA_ICON_URL,
      url: 'https://saweria.co'
    })
    .setTitle(isTest ? 'Simulasi Donasi Berhasil Diterima' : `Donasi Baru dari ${donation.donator_name}`)
    .setDescription('Terima kasih banyak atas dukungan yang telah diberikan.')
    .addFields(
      {
        name: 'Donatur',
        value: donation.donator_name,
        inline: true
      },
      {
        name: 'Nominal',
        value: `**${amountFormatted}**`,
        inline: true
      },
      {
        name: 'Pesan',
        value: donation.message.length > 1000 ? donation.message.substring(0, 997) + '...' : donation.message,
        inline: false
      }
    )
    .setFooter({
      text: `ID: ${donation.id || 'N/A'}${isTest ? ' (Simulasi)' : ''} • Saweria`,
      iconURL: SAWERIA_ICON_URL
    })
    .setTimestamp(donation.created_at ? new Date(donation.created_at) : new Date());
}

/**
 * Kirim notifikasi donasi ke channel Discord
 * @param {import('discord.js').Client} client
 * @param {object} rawDonation
 * @param {string|null} [targetGuildId]
 * @returns {Promise<{ sentCount: number, errors: string[] }>}
 */
async function sendSaweriaNotification(client, rawDonation, targetGuildId = null) {
  const donation = normalizeSaweriaPayload(rawDonation);
  const embed = buildSaweriaEmbed(donation);
  const settings = storage.read('settings');
  const amount = donation.amount_raw || 0;

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
    if (!config.enabled && !donation.is_test) continue;

    // Filter nominal minimum jika ada
    const minAmount = config.minAmount || 0;
    if (amount < minAmount && !donation.is_test) {
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
  const port = parseInt(process.env.PORT, 10) || parseInt(process.env.SAWERIA_PORT, 10) || 3000;
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

          let rawPayload;
          try {
            rawPayload = JSON.parse(bodyData);
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }

          console.log('[Saweria Raw Payload]:', JSON.stringify(rawPayload));

          const normalized = normalizeSaweriaPayload(rawPayload);

          // 3. Deduplikasi ID Transaksi
          if (normalized.id) {
            if (processedDonationIds.has(normalized.id)) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ status: 'duplicate_ignored' }));
            }
            processedDonationIds.add(normalized.id);
            if (processedDonationIds.size > MAX_PROCESSED_CACHE) {
              const firstVal = processedDonationIds.values().next().value;
              processedDonationIds.delete(firstVal);
            }
          }

          console.log(`[Saweria] Donasi diterima: ${normalized.donator_name} (${formatRupiah(normalized.amount_raw)}) - "${normalized.message}" (ID: ${normalized.id || 'N/A'})`);

          const queryGuild = parsedUrl.searchParams.get('guild') || null;
          const result = await sendSaweriaNotification(client, normalized, queryGuild);

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
  buildSaweriaEmbed,
  normalizeSaweriaPayload
};
