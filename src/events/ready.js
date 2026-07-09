const { ActivityType, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { buildMorningMessage } = require('../utils/morningMessage');
const { buildNightMessage } = require('../utils/nightMessage');
const { loadAllSettings } = require('../utils/storage');
const storage = require('../utils/storage');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`\n🎵 ================================`);
    console.log(`✅ Bot online sebagai: ${client.user.tag}`);
    console.log(`📊 Melayani ${client.guilds.cache.size} server`);
    console.log(`🎵 ================================\n`);

    // =============================================
    // LOAD SETTINGS dari JSON ke client Maps
    // =============================================
    loadAllSettings(client);

    // Auto-deploy slash commands saat bot start
    try {
      const commands = [];
      const commandsPath = path.join(__dirname, '..', 'commands');
      for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
        const mod = require(path.join(commandsPath, file));
        const cmds = Array.isArray(mod) ? mod : [mod];
        for (const cmd of cmds) {
          if (cmd.data) commands.push(cmd.data.toJSON());
          // Tangani export object {birthday, ...}
          if (!cmd.data && typeof cmd === 'object') {
            for (const val of Object.values(cmd)) {
              if (val && val.data) commands.push(val.data.toJSON());
            }
          }
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
    // MASTER SCHEDULER — cek setiap menit (WIB)
    // =============================================
    if (!client.morningSettings) client.morningSettings = new Map();
    if (!client.nightSettings) client.nightSettings = new Map();

    const lastSentMorning = new Map();
    const lastSentNight = new Map();
    const lastSentAnnounce = new Map(); // key: `${guildId}_${id}`
    let lastBirthdayCheck = ''; // "DD-MM" string

    setInterval(async () => {
      // ====== Hitung waktu WIB sekarang ======
      const nowUTC = new Date();
      const wibOffset = 7 * 60;
      const nowWIB = new Date(nowUTC.getTime() + wibOffset * 60 * 1000);
      const currentHour = nowWIB.getUTCHours();
      const currentMinute = nowWIB.getUTCMinutes();
      const currentTimeKey = `${currentHour}:${String(currentMinute).padStart(2, '0')}`;
      const currentDay = nowWIB.getUTCDate();
      const currentMonth = nowWIB.getUTCMonth() + 1;
      const birthdayKey = `${currentDay}-${currentMonth}`;

      // ====== 1. MORNING SCHEDULER ======
      for (const [guildId, config] of client.morningSettings.entries()) {
        if (!config.enabled || !config.channelId) continue;
        if (config.hour !== currentHour || config.minute !== currentMinute) continue;
        if (lastSentMorning.get(guildId) === currentTimeKey) continue;

        try {
          const guild = client.guilds.cache.get(guildId);
          if (!guild) continue;

          const channel = await guild.channels.fetch(config.channelId).catch(() => null);
          if (!channel) {
            console.warn(`[Morning] ⚠️ Channel ${config.channelId} tidak ditemukan di guild ${guild.name}. Auto-disable.`);
            config.enabled = false;
            client.morningSettings.set(guildId, config);
            storage.saveGuildSetting(guildId, 'morning', config);
            continue;
          }

          const { content, embeds } = buildMorningMessage(guild);
          await channel.send({ content, embeds });
          lastSentMorning.set(guildId, currentTimeKey);
          console.log(`☀️ [Morning] Terkirim ke ${guild.name} (${currentTimeKey} WIB)`);
        } catch (err) {
          console.error(`[Morning] Gagal kirim ke guild ${guildId}:`, err.message);
        }
      }

      // ====== 2. NIGHT SCHEDULER ======
      for (const [guildId, config] of client.nightSettings.entries()) {
        if (!config.enabled || !config.channelId) continue;
        if (config.hour !== currentHour || config.minute !== currentMinute) continue;
        if (lastSentNight.get(guildId) === currentTimeKey) continue;

        try {
          const guild = client.guilds.cache.get(guildId);
          if (!guild) continue;

          const channel = await guild.channels.fetch(config.channelId).catch(() => null);
          if (!channel) {
            console.warn(`[Night] ⚠️ Channel ${config.channelId} tidak ditemukan di guild ${guild.name}. Auto-disable.`);
            config.enabled = false;
            client.nightSettings.set(guildId, config);
            storage.saveGuildSetting(guildId, 'night', config);
            continue;
          }

          const { content, embeds } = buildNightMessage(guild);
          await channel.send({ content, embeds });
          lastSentNight.set(guildId, currentTimeKey);
          console.log(`🌙 [Night] Terkirim ke ${guild.name} (${currentTimeKey} WIB)`);
        } catch (err) {
          console.error(`[Night] Gagal kirim ke guild ${guildId}:`, err.message);
        }
      }

      // ====== 3. ANNOUNCEMENT SCHEDULER ======
      const allAnnouncements = storage.read('announcements');
      for (const [guildId, list] of Object.entries(allAnnouncements)) {
        if (!Array.isArray(list)) continue;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;

        for (const announcement of list) {
          if (announcement.hour !== currentHour || announcement.minute !== currentMinute) continue;
          const key = `${guildId}_${announcement.id}`;
          if (lastSentAnnounce.get(key) === currentTimeKey) continue;

          try {
            const channel = await guild.channels.fetch(announcement.channelId).catch(() => null);
            if (!channel) {
              console.warn(`[Announce] ⚠️ Channel ${announcement.channelId} tidak ditemukan. Skip.`);
              continue;
            }

            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('📢 Pengumuman Terjadwal')
              .setDescription(announcement.pesan)
              .setFooter({ text: `${guild.name} • Pengumuman Otomatis`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
              .setTimestamp();

            await channel.send({ embeds: [embed] });
            lastSentAnnounce.set(key, currentTimeKey);
            console.log(`📢 [Announce] Terkirim ke ${guild.name} (${currentTimeKey} WIB)`);
          } catch (err) {
            console.error(`[Announce] Gagal kirim ke guild ${guildId}:`, err.message);
          }
        }
      }

      // ====== 4. BIRTHDAY SCHEDULER (cek sekali per hari jam 00:01 WIB) ======
      if (currentHour === 0 && currentMinute === 1 && lastBirthdayCheck !== birthdayKey) {
        lastBirthdayCheck = birthdayKey;

        const { BIRTHDAY_WISHES } = require('../commands/birthday');
        const settings = storage.read('settings');

        for (const [guildId, guildSettings] of Object.entries(settings)) {
          const channelId = guildSettings?.birthday?.channelId;
          if (!channelId) continue;

          const guild = client.guilds.cache.get(guildId);
          if (!guild) continue;

          const channel = await guild.channels.fetch(channelId).catch(() => null);
          if (!channel) continue;

          try {
            // Fetch all members in the guild to check their creation dates
            const members = await guild.members.fetch();
            for (const member of members.values()) {
              if (member.user.bot) continue;

              const createdAt = member.user.createdAt;
              const bdayDay = createdAt.getDate();
              const bdayMonth = createdAt.getMonth() + 1;

              if (bdayDay === currentDay && bdayMonth === currentMonth) {
                // Akun berulang tahun hari ini! Hitung umur akun
                const age = nowWIB.getUTCFullYear() - createdAt.getFullYear();
                if (age <= 0) continue; // Akun baru dibuat tahun ini, tidak dihitung anniversary

                const wish = BIRTHDAY_WISHES[Math.floor(Math.random() * BIRTHDAY_WISHES.length)];
                const { EmbedBuilder } = require('discord.js');

                const embed = new EmbedBuilder()
                  .setColor(0xFF69B4)
                  .setTitle('🎂 HAPPY DISCORD ANNIVERSARY! 🎉')
                  .setDescription(`${wish(member.user.username, age)}\n\n🎊 Rayakan hari jadi akun Discord-nya bersama di server! 🥳`)
                  .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                  .setFooter({ text: `${guild.name} • Akun dibuat pada ${createdAt.toLocaleDateString('id-ID')}`, iconURL: guild.iconURL({ dynamic: true }) || undefined })
                  .setTimestamp();

                await channel.send({
                  content: `🎉 <@${member.id}> 🎂`,
                  embeds: [embed],
                }).catch(err => console.error(`[Birthday Scheduler] Gagal mengirim ucapan:`, err.message));

                console.log(`🎂 [Birthday] Ucapan anniversary terkirim untuk ${member.user.tag} (Umur: ${age} tahun) di ${guild.name}`);
              }
            }
          } catch (fetchErr) {
            console.error(`[Birthday Scheduler] Gagal fetch member di guild ${guild.name}:`, fetchErr.message);
          }
        }
      }

    }, 60 * 1000); // cek setiap 60 detik

    console.log('✅ [Schedulers] Morning, Night, Announce, Birthday schedulers aktif!');
  },
};
