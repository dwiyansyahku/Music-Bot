const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const { checkVoiceChannel } = require('../utils/helpers');
const { formatDuration } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Cari lagu dan pilih dari hasil pencarian')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Judul lagu yang dicari')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const voiceChannel = checkVoiceChannel(interaction);
    if (!voiceChannel) return;

    const query = interaction.options.getString('query');
    await interaction.deferReply();

    try {
      // Cari 5 hasil via yt-dlp
      const results = await client.distube.search(query, { limit: 5 });

      if (!results || results.length === 0) {
        return interaction.editReply('❌ Tidak ditemukan hasil untuk pencarian tersebut.');
      }

      const options = results.slice(0, 5).map((song, i) => ({
        label: song.name?.substring(0, 100) || `Hasil ${i + 1}`,
        description: `${song.uploader?.name || 'Unknown'} • ${formatDuration(song.duration)}`.substring(0, 100),
        value: String(i),
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('search_select')
        .setPlaceholder('Pilih lagu yang ingin diputar...')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const listText = results.slice(0, 5).map((s, i) =>
        `**${i + 1}.** [${s.name}](${s.url}) — \`${formatDuration(s.duration)}\``
      ).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle(`🔍 Hasil Pencarian: "${query}"`)
        .setDescription(listText)
        .setFooter({ text: 'Pilih lagu dari dropdown di bawah • Timeout 30 detik' });

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });

      // Simpan data search results sementara untuk handler
      if (!client._searchResults) client._searchResults = new Map();
      client._searchResults.set(interaction.user.id, {
        results,
        voiceChannel,
        textChannel: interaction.channel,
        member: interaction.member,
        messageId: msg.id,
        timeout: setTimeout(() => {
          client._searchResults.delete(interaction.user.id);
          interaction.editReply({ components: [], embeds: [embed.setFooter({ text: 'Pencarian expired.' })] }).catch(() => {});
        }, 30000),
      });
    } catch (error) {
      console.error('[Search] Error:', error);
      await interaction.editReply(`❌ Gagal mencari: ${error.message}`);
    }
  },
};
