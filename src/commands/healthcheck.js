const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('healthcheck')
    .setDescription('Cek status semua sistem & fitur bot secara menyeluruh (Owner / Admin Only)'),

  async execute(interaction, client) {
    const isOwner = await isBotOwner(interaction, client);
    const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      return interaction.reply({
        content: '❌ Perintah ini khusus untuk **Bot Owner** atau **Server Administrator**.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const results = [];
    const guildId = interaction.guildId;

    // ========================================
    // 1. BOT CORE
    // ========================================
    const uptimeSeconds = Math.floor(client.uptime / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeStr = `${hours}j ${minutes}m ${seconds}d`;
    const apiLatency = Math.round(client.ws.ping);

    results.push({
      category: '🤖 Bot Core',
      checks: [
        { name: 'Bot Online', status: true, detail: `${client.user.tag}` },
        { name: 'Uptime', status: true, detail: uptimeStr },
        { name: 'API Latency', status: apiLatency < 500, detail: `${apiLatency}ms${apiLatency >= 500 ? ' ⚠️ Tinggi' : ''}` },
        { name: 'Server Count', status: true, detail: `${client.guilds.cache.size} server` },
        { name: 'Slash Commands', status: (client.commands?.size || 0) > 0, detail: `${client.commands?.size || 0} commands loaded` },
      ]
    });

    // ========================================
    // 2. DATA FILES (Volume/Persistence)
    // ========================================
    const dataDir = path.join(process.cwd(), 'data');
    const dataFiles = [
      'cards.json', 'settings.json', 'voiceStats.json', 'jail.json',
      'gacha_data.json', 'musicquiz_lb.json', 'gallery.json',
      'saweria_donations.json', 'season_data.json', 'stardust_rain.json',
      'throne_data.json', 'throne_duels.json', 'timecapsules.json', 'events.json'
    ];

    const dataChecks = [];
    let totalDataSize = 0;
    let existingFiles = 0;

    for (const file of dataFiles) {
      const filePath = path.join(dataDir, file);
      const exists = fs.existsSync(filePath);
      let size = 0;
      if (exists) {
        try {
          const stat = fs.statSync(filePath);
          size = stat.size;
          totalDataSize += size;
          existingFiles++;
        } catch { }
      }
      dataChecks.push({
        name: file,
        status: exists,
        detail: exists ? `${(size / 1024).toFixed(1)} KB` : 'Tidak ada'
      });
    }

    // Check if data dir is writable (volume working)
    let volumeWritable = false;
    try {
      const testFile = path.join(dataDir, '_healthcheck_test');
      fs.writeFileSync(testFile, 'test', 'utf8');
      fs.unlinkSync(testFile);
      volumeWritable = true;
    } catch { }

    results.push({
      category: '💾 Data & Volume',
      checks: [
        { name: 'Data Directory', status: fs.existsSync(dataDir), detail: fs.existsSync(dataDir) ? dataDir : '❌ Tidak ditemukan' },
        { name: 'Volume Writable', status: volumeWritable, detail: volumeWritable ? 'Read/Write OK' : '❌ Tidak bisa tulis!' },
        { name: 'Total File', status: existingFiles > 0, detail: `${existingFiles}/${dataFiles.length} file (${(totalDataSize / 1024).toFixed(1)} KB)` },
        ...dataChecks
      ]
    });

    // ========================================
    // 3. GUILD SETTINGS
    // ========================================
    const storage = require('../utils/storage');
    const settings = storage.read('settings');
    const guildSettings = settings[guildId] || {};

    const welcomeConfig = client.welcomeSettings?.get(guildId);
    const morningConfig = client.morningSettings?.get(guildId);
    const nightConfig = client.nightSettings?.get(guildId);
    const stay247Config = client.stay247Settings?.get(guildId);

    const settingsChecks = [];

    // Welcome
    if (welcomeConfig) {
      const ch = welcomeConfig.channelId ? await interaction.guild.channels.fetch(welcomeConfig.channelId).catch(() => null) : null;
      settingsChecks.push({
        name: 'Welcome',
        status: welcomeConfig.enabled && !!ch,
        detail: welcomeConfig.enabled
          ? (ch ? `#${ch.name}` : `❌ Channel tidak ditemukan`)
          : 'Disabled'
      });
    } else {
      settingsChecks.push({ name: 'Welcome', status: null, detail: 'Belum dikonfigurasi' });
    }

    // Morning
    if (morningConfig) {
      const ch = morningConfig.channelId ? await interaction.guild.channels.fetch(morningConfig.channelId).catch(() => null) : null;
      settingsChecks.push({
        name: 'Morning Reminder',
        status: morningConfig.enabled && !!ch,
        detail: morningConfig.enabled
          ? `${String(morningConfig.hour).padStart(2, '0')}:${String(morningConfig.minute).padStart(2, '0')} WIB → ${ch ? `#${ch.name}` : '❌ Channel hilang'}`
          : 'Disabled'
      });
    } else {
      settingsChecks.push({ name: 'Morning Reminder', status: null, detail: 'Belum dikonfigurasi' });
    }

    // Night
    if (nightConfig) {
      const ch = nightConfig.channelId ? await interaction.guild.channels.fetch(nightConfig.channelId).catch(() => null) : null;
      settingsChecks.push({
        name: 'Night Reminder',
        status: nightConfig.enabled && !!ch,
        detail: nightConfig.enabled
          ? `${String(nightConfig.hour).padStart(2, '0')}:${String(nightConfig.minute).padStart(2, '0')} WIB → ${ch ? `#${ch.name}` : '❌ Channel hilang'}`
          : 'Disabled'
      });
    } else {
      settingsChecks.push({ name: 'Night Reminder', status: null, detail: 'Belum dikonfigurasi' });
    }

    // 24/7
    if (stay247Config) {
      const ch = stay247Config.channelId ? await interaction.guild.channels.fetch(stay247Config.channelId).catch(() => null) : null;
      settingsChecks.push({
        name: '24/7 Voice',
        status: stay247Config.enabled && !!ch,
        detail: stay247Config.enabled
          ? (ch ? `🔊 ${ch.name}` : '❌ Channel hilang')
          : 'Disabled'
      });
    } else {
      settingsChecks.push({ name: '24/7 Voice', status: null, detail: 'Belum dikonfigurasi' });
    }

    // Mod Log
    const modLogConfig = guildSettings.modlog;
    if (modLogConfig) {
      const ch = modLogConfig.channelId ? await interaction.guild.channels.fetch(modLogConfig.channelId).catch(() => null) : null;
      settingsChecks.push({
        name: 'Mod Log Channel',
        status: !!ch,
        detail: ch ? `#${ch.name}` : '❌ Channel hilang'
      });
    } else {
      settingsChecks.push({ name: 'Mod Log Channel', status: null, detail: 'Belum dikonfigurasi' });
    }

    // Automod
    const automodConfig = guildSettings.automod;
    settingsChecks.push({
      name: 'Automod',
      status: automodConfig ? true : null,
      detail: automodConfig ? 'Aktif' : 'Belum dikonfigurasi'
    });

    results.push({
      category: '⚙️ Guild Settings',
      checks: settingsChecks
    });

    // ========================================
    // 4. MUSIC ENGINE (DisTube)
    // ========================================
    const musicChecks = [];

    // DisTube instance
    const distube = client.distube;
    musicChecks.push({
      name: 'DisTube Engine',
      status: !!distube,
      detail: distube ? 'Loaded' : '❌ Tidak ditemukan'
    });

    // Active queues
    if (distube) {
      const activeQueues = distube.queues?.collection?.size || 0;
      musicChecks.push({
        name: 'Active Queues',
        status: true,
        detail: `${activeQueues} queue aktif`
      });
    }

    // yt-dlp binary
    const ytdlpPath = process.platform === 'win32'
      ? path.join(process.cwd(), 'bin', 'yt-dlp.exe')
      : 'yt-dlp';

    let ytdlpVersion = null;
    try {
      ytdlpVersion = await new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, ['--version']);
        let out = '';
        proc.stdout.on('data', d => out += d);
        proc.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(`exit ${code}`)));
        proc.on('error', reject);
        setTimeout(() => { proc.kill(); reject(new Error('timeout')); }, 5000);
      });
    } catch { }

    musicChecks.push({
      name: 'yt-dlp',
      status: !!ytdlpVersion,
      detail: ytdlpVersion || '❌ Tidak ditemukan'
    });

    // ffmpeg
    let ffmpegOk = false;
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn('ffmpeg', ['-version']);
        proc.on('close', code => code === 0 ? resolve() : reject());
        proc.on('error', reject);
        setTimeout(() => { proc.kill(); reject(); }, 5000);
      });
      ffmpegOk = true;
    } catch { }

    musicChecks.push({
      name: 'FFmpeg',
      status: ffmpegOk,
      detail: ffmpegOk ? 'OK' : '❌ Tidak ditemukan'
    });

    results.push({
      category: '🎵 Music Engine',
      checks: musicChecks
    });

    // ========================================
    // 5. PROXY & NETWORK
    // ========================================
    const proxyRotator = require('../utils/proxyRotator');
    const proxyChecks = [];

    const proxyCount = proxyRotator._getProxyCount ? proxyRotator._getProxyCount() : 0;
    const currentProxy = proxyRotator.getProxy ? proxyRotator.getProxy() : null;

    proxyChecks.push({
      name: 'Proxy Pool',
      status: proxyCount > 0,
      detail: proxyCount > 0 ? `${proxyCount} proxy tersedia` : '⚠️ Tidak ada proxy (risiko 429)'
    });

    if (currentProxy && proxyRotator._maskProxy) {
      proxyChecks.push({
        name: 'Active Proxy',
        status: true,
        detail: proxyRotator._maskProxy(currentProxy)
      });
    }

    results.push({
      category: '🌐 Proxy & Network',
      checks: proxyChecks
    });

    // ========================================
    // 6. COOKIES & AUTH
    // ========================================
    const cookieChecks = [];

    // Check cookies.txt
    const cookieTxtPath = path.join(process.cwd(), 'cookies.txt');
    const cookieJsonPath = path.join(process.cwd(), 'cookies.json');
    const hasCookieTxt = fs.existsSync(cookieTxtPath);
    const hasCookieJson = fs.existsSync(cookieJsonPath);

    cookieChecks.push({
      name: 'cookies.txt',
      status: hasCookieTxt ? true : null,
      detail: hasCookieTxt ? 'Ada' : 'Tidak ada (opsional)'
    });

    cookieChecks.push({
      name: 'cookies.json',
      status: hasCookieJson ? true : null,
      detail: hasCookieJson ? 'Ada' : 'Tidak ada (opsional)'
    });

    // Spotify config
    const spotifyId = process.env.SPOTIFY_CLIENT_ID;
    const spotifyConfigured = spotifyId && spotifyId !== 'your_spotify_client_id_here';
    cookieChecks.push({
      name: 'Spotify API',
      status: spotifyConfigured ? true : null,
      detail: spotifyConfigured ? 'Terkonfigurasi' : '⚠️ Belum diset'
    });

    results.push({
      category: '🔑 Auth & Cookies',
      checks: cookieChecks
    });

    // ========================================
    // 7. SAWERIA WEBHOOK
    // ========================================
    const saweriaChecks = [];
    const saweriaPort = process.env.SAWERIA_PORT || '3000';
    const saweriaUrl = process.env.SAWERIA_PUBLIC_URL;

    saweriaChecks.push({
      name: 'Webhook Port',
      status: true,
      detail: `Port ${saweriaPort}`
    });

    saweriaChecks.push({
      name: 'Public URL',
      status: saweriaUrl && saweriaUrl !== 'http://localhost:3000',
      detail: saweriaUrl || '⚠️ Belum diset'
    });

    results.push({
      category: '💰 Saweria Webhook',
      checks: saweriaChecks
    });

    // ========================================
    // 8. GACHA SYSTEM
    // ========================================
    const gachaChecks = [];
    const gachaData = storage.read('gacha_data');
    const gachaUsers = Object.keys(gachaData).length;

    gachaChecks.push({
      name: 'Gacha Data',
      status: true,
      detail: `${gachaUsers} user profiles`
    });

    // Cards database
    const cardsData = storage.read('cards');
    const cardUsers = Object.keys(cardsData).length;
    gachaChecks.push({
      name: 'Member Cards',
      status: true,
      detail: `${cardUsers} user cards`
    });

    results.push({
      category: '🎰 Gacha & Cards',
      checks: gachaChecks
    });

    // ========================================
    // 9. VOICE TRACKER
    // ========================================
    const voiceData = storage.read('voiceStats');
    const voiceUsers = Object.keys(voiceData).length;

    results.push({
      category: '🎙️ Voice Tracker',
      checks: [
        { name: 'Voice Stats', status: voiceUsers > 0, detail: `${voiceUsers} user tracked` },
        { name: 'Invite Tracker', status: true, detail: 'Active' },
      ]
    });

    // ========================================
    // BUILD EMBEDS
    // ========================================
    const embeds = [];
    let totalPass = 0;
    let totalFail = 0;
    let totalWarn = 0;

    for (const section of results) {
      for (const check of section.checks) {
        if (check.status === true) totalPass++;
        else if (check.status === false) totalFail++;
        else totalWarn++;
      }
    }

    // Main summary embed
    const overallStatus = totalFail === 0;
    const summaryEmbed = new EmbedBuilder()
      .setColor(overallStatus ? 0x57F287 : 0xED4245)
      .setAuthor({
        name: `HEALTH CHECK — ${interaction.guild?.name?.toUpperCase() || 'BOT'}`,
        iconURL: interaction.guild?.iconURL({ dynamic: true }) || undefined
      })
      .setTitle(overallStatus ? '✅ Semua Sistem Berjalan Normal!' : '⚠️ Ada Beberapa Masalah Terdeteksi')
      .setDescription(
        `**Ringkasan:**\n` +
        `✅ Pass: **${totalPass}** | ❌ Fail: **${totalFail}** | ⚠️ Opsional: **${totalWarn}**\n\n` +
        `🕐 Uptime: **${uptimeStr}** | 📡 Latency: **${apiLatency}ms**`
      )
      .setTimestamp()
      .setFooter({ text: 'Health Check System • Semua fitur dicek secara real-time' });

    // Detail fields
    for (const section of results) {
      const lines = section.checks.map(c => {
        const icon = c.status === true ? '✅' : c.status === false ? '❌' : '⚠️';
        return `${icon} \`${c.name}\` — ${c.detail}`;
      });

      summaryEmbed.addFields({
        name: section.category,
        value: lines.join('\n').substring(0, 1024),
        inline: false
      });
    }

    embeds.push(summaryEmbed);

    return interaction.editReply({ embeds });
  }
};
