const { ActivityType, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { buildMorningMessage } = require('../utils/morningMessage');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`\n🎵 ================================`);
    console.log(`✅ Bot online sebagai: ${client.user.tag}`);
    console.log(`📊 Melayani ${client.guilds.cache.size} server`);
    console.log(`🎵 ================================\n`);

    // Auto-deploy slash commands saat bot start
    try {
      const commands = [];
      const commandsPath = path.join(__dirname, '..', 'commands');
      for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
        const mod = require(path.join(commandsPath, file));
        const cmds = Array.isArray(mod) ? mod : [mod];
        for (const cmd of cmds) {
          if (cmd.data) commands.push(cmd.data.toJSON());
        }
      }

      const rest = new REST().setToken(process.env.DISCORD_TOKEN);
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log(`✅ [Auto-Deploy] ${commands.length} slash commands berhasil didaftarkan!`);
    } catch (err) {
      console.error('⚠️ [Auto-Deploy] Gagal deploy slash commands:', err.message);
    }

    // Set activity
    const activities = [
      { name: '🎵 qp [lagu] untuk memutar musik!', type: ActivityType.Playing },
      { name: '🎶 qhelp untuk bantuan', type: ActivityType.Listening },
      { name: `${client.guilds.cache.size} server`, type: ActivityType.Watching },
    ];

    let i = 0;
    setInterval(() => {
      client.user.setActivity(activities[i % activities.length].name, {
        type: activities[i % activities.length].type,
      });
      i++;
    }, 15000);

    // =============================================
    // SCHEDULER: Selamat Pagi + Reminder Rules
    // Cek setiap menit, kirim sesuai jam WIB yang dikonfigurasi
    // =============================================
    if (!client.morningSettings) client.morningSettings = new Map();

    // Simpan flag agar tidak double-send di menit yang sama (per guild)
    const lastSentMorning = new Map(); // guildId -> "HH:MM" string terakhir dikirim

    setInterval(async () => {
      if (!client.morningSettings || client.morningSettings.size === 0) return;

      // Waktu sekarang dalam WIB (UTC+7)
      const nowUTC = new Date();
      const wibOffset = 7 * 60; // menit
      const nowWIB = new Date(nowUTC.getTime() + wibOffset * 60 * 1000);
      const currentHour = nowWIB.getUTCHours();
      const currentMinute = nowWIB.getUTCMinutes();
      const currentTimeKey = `${currentHour}:${String(currentMinute).padStart(2, '0')}`;

      for (const [guildId, config] of client.morningSettings.entries()) {
        if (!config.enabled || !config.channelId) continue;

        // Cek apakah jam & menit cocok dengan jadwal
        if (config.hour !== currentHour || config.minute !== currentMinute) continue;

        // Hindari double-send di menit yang sama
        if (lastSentMorning.get(guildId) === currentTimeKey) continue;

        try {
          const guild = client.guilds.cache.get(guildId);
          if (!guild) continue;

          const channel = guild.channels.cache.get(config.channelId);
          if (!channel) {
            console.warn(`[Morning] Channel ${config.channelId} tidak ditemukan di guild ${guildId}`);
            continue;
          }

          const { content, embeds } = buildMorningMessage(guild);
          await channel.send({ content, embeds });

          lastSentMorning.set(guildId, currentTimeKey);
          console.log(`☀️ [Morning] Pesan selamat pagi dikirim ke guild: ${guild.name} (${currentTimeKey} WIB)`);
        } catch (err) {
          console.error(`[Morning] Gagal kirim ke guild ${guildId}:`, err.message);
        }
      }
    }, 60 * 1000); // cek setiap 60 detik

    console.log('☀️ [Morning Scheduler] Morning reminder scheduler aktif!');
  },
};
