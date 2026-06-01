require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const mod = require(path.join(commandsPath, file));
  // Handle both single command export and array of commands
  const cmds = Array.isArray(mod) ? mod : [mod];
  for (const cmd of cmds) {
    if (cmd.data) {
      commands.push(cmd.data.toJSON());
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`🔄 Mendaftarkan ${commands.length} slash commands...`);

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('✅ Slash commands berhasil didaftarkan!');
    console.log('Commands yang terdaftar:');
    commands.forEach(cmd => console.log(`  /${cmd.name} - ${cmd.description}`));
  } catch (error) {
    console.error('❌ Error mendaftarkan commands:', error);
  }
})();
