const { ActivityType, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ready',
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
  },
};
