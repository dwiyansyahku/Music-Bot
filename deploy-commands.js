require('dotenv').config();
const { REST, Routes } = require('discord.js');
const path = require('fs');
const fsmod = require('fs');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ Pastikan DISCORD_TOKEN dan CLIENT_ID ada di .env');
  process.exit(1);
}

const commands = [];
const commandsPath = require('path').join(__dirname, 'src', 'commands');
for (const file of fsmod.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const mod = require(require('path').join(commandsPath, file));
  const cmds = Array.isArray(mod) ? mod : [mod];
  for (const cmd of cmds) {
    if (cmd.data) {
      commands.push(cmd.data.toJSON());
    }
  }
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`🔄 Mendaftarkan ${commands.length} slash commands...`);
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log(`✅ Berhasil mendaftarkan ${data.length} slash commands!`);
    commands.forEach(c => console.log(`  /${c.name}`));
  } catch (err) {
    console.error('❌ Gagal deploy:', err.message);
  }
})();
