const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { checkVoiceChannel, isOwnerOrMod } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('q247')
    .setDescription('Toggle mode 24/7 (bot akan stay di voice channel walaupun kosong)'),

  async execute(interaction, client) {
    // Cek apakah user adalah owner bot atau moderator
    const isAllowed = await isOwnerOrMod(interaction, client);
    if (!isAllowed) {
      return interaction.reply({
        content: '❌ Perintah ini hanya bisa digunakan oleh Owner bot atau Moderator!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const voiceChannel = checkVoiceChannel(interaction);
    if (!voiceChannel) return;

    // Respon ephemeral (hanya terlihat oleh pengguna yang mengeksekusi)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
      // Bersihkan ghost connection dari @discordjs/voice jika ada
        try {
          const { getVoiceConnection } = require('@discordjs/voice');
          const ghostConn = getVoiceConnection(guildId);
          if (ghostConn) {
            ghostConn.destroy();
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (_) {}
        try {
          await client.distube.voices.join(voiceChannel);
        } catch (err) {
          console.error('Error joining voice channel:', err);
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
