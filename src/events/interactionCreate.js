const { MessageFlags } = require('discord.js');
const { handleCardButton, handleCardModalSubmit } = require('../utils/cardHandler');

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
        // 10062: Unknown interaction
        // 40060: Interaction has already been acknowledged
        if (error.code === 10062 || error.code === 40060) return;

        console.error(`Error pada command /${interaction.commandName}:`, error);

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
          if (replyError.code === 10062 || replyError.code === 40060) return;
          console.error('Gagal mengirim pesan error:', replyError);
        }
      }
      return;
    }

    // ====== Button Interaction (Sistem Panel Card Member) ======
    if (interaction.isButton() && interaction.customId.startsWith('card_btn_')) {
      try {
        await handleCardButton(interaction, client);
      } catch (err) {
        if (err.code === 10062 || err.code === 40060) return;
        console.error('Error handling card button:', err);
      }
      return;
    }

    // ====== Modal Submit Interaction (Pop-up Form Card Member) ======
    if (interaction.isModalSubmit() && interaction.customId === 'card_modal_submit') {
      try {
        await handleCardModalSubmit(interaction, client);
      } catch (err) {
        if (err.code === 10062 || err.code === 40060) return;
        console.error('Error handling card modal submit:', err);
      }
      return;
    }

    // ====== Select Menu (untuk help command navigasi kategori) ======
    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
      const { buildHelpEmbed } = require('./helpEmbeds');
      const category = interaction.values[0];
      const embed = buildHelpEmbed(category, client);
      try {
        await interaction.update({ embeds: [embed] });
      } catch (err) {
        if (err.code === 10062 || err.code === 40060) return;
        console.error('Error updating help select menu:', err.message);
      }
    }
  },
};
