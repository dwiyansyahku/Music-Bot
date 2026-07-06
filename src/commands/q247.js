const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { checkVoiceChannel, isBotOwner } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('q247')
    .setDescription('Toggle mode 24/7 (bot akan stay di voice channel walaupun kosong)'),

  async execute(interaction, client) {
    // Cek apakah user adalah owner bot
    const isOwner = await isBotOwner(interaction, client);
    if (!isOwner) {
      return interaction.reply({
        content: '❌ Perintah ini hanya bisa digunakan oleh Owner bot!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const voiceChannel = checkVoiceChannel(interaction);
    if (!voiceChannel) return;

    // Defer early to prevent interaction timeout and avoid double-acknowledge errors
    await interaction.deferReply();

    if (!client.stay247) {
      client.stay247 = new Set();
    }

    const guildId = interaction.guild.id;
    const is247 = client.stay247.has(guildId);

    if (is247) {
      client.stay247.delete(guildId);
    } else {
      client.stay247.add(guildId);
      // Ensure bot joins the voice channel immediately if not already there
      try {
        await client.distube.voices.join(voiceChannel);
      } catch (err) {
        console.error('Error joining voice channel:', err);
        // Revert 24/7 state and inform the user — return early to prevent further replies
        client.stay247.delete(guildId);
        return interaction.editReply({
          content: `❌ Gagal bergabung ke voice channel: ${err.message}`,
        });
      }
    }

    const newState = !is247;
    const embed = new EmbedBuilder()
      .setColor(newState ? 0x1DB954 : 0xFF6B6B)
      .setTitle(newState ? '🟢 Mode 24/7 Aktif' : '🔴 Mode 24/7 Nonaktif')
      .setDescription(
        newState
          ? 'Bot akan tetap stay di voice channel walaupun tidak ada orang atau lagu yang diputar.'
          : 'Bot akan keluar dari voice channel saat tidak ada orang atau saat antrean lagu selesai.'
      )
      .setFooter({ text: `Diubah oleh ${interaction.member?.displayName || 'Unknown'}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
