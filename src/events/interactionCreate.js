const { MessageFlags } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ====== Slash Commands ======
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Error pada command /${interaction.commandName}:`, error);

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
      return;
    }

    // ====== Select Menu (untuk help command navigasi kategori) ======
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
      const { buildHelpEmbed } = require('./helpEmbeds');
      const category = interaction.values[0];
      const embed = buildHelpEmbed(category, client);
      await interaction.update({ embeds: [embed] });
    }
  },
};

