require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ DISCORD_TOKEN dan CLIENT_ID harus diisi di file .env');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const mod = require(path.join(commandsPath, file));
  const rawCmds = Array.isArray(mod) ? mod : [mod];
  const cmds = rawCmds.flatMap(item => {
    if (item && item.data) return [item];
    if (item && typeof item === 'object') {
      return Object.values(item).filter(v => v && v.data);
    }
    return [];
  });

  for (const cmd of cmds) {
    if (cmd.data) {
      commands.push(cmd.data.toJSON());
    }
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`🔄 Mendaftarkan ${commands.length} slash commands...`);

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );

    console.log('✅ Slash commands berhasil didaftarkan!');
    console.log('Commands yang terdaftar:');
    commands.forEach(cmd => console.log(`  /${cmd.name} - ${cmd.description}`));
  } catch (error) {
    console.error('❌ Error mendaftarkan commands:', error);
  }
})();
