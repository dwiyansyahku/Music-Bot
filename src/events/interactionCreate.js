const { MessageFlags } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error pada command /${interaction.commandName}:`, error);

      // Skip if error is a double-acknowledge (command already replied/deferred and handled it)
      if (error.code === 40060) return;

      const reply = {
        content: `❌ Terjadi error: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      } catch (replyError) {
        console.error('Gagal mengirim pesan error:', replyError);
      }
    }
  },
};
