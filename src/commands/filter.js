const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkVoiceChannel, checkQueue } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Terapkan filter efek audio pada musik')
    .addStringOption(opt =>
      opt.setName('efek')
        .setDescription('Pilih efek audio (kosongkan untuk melihat filter aktif)')
        .setRequired(false)
        .addChoices(
          { name: '🧹 Clear (Matikan Semua Filter)', value: 'clear' },
          { name: '🔊 Bassboost', value: 'bassboost' },
          { name: '🐿️ Nightcore', value: 'nightcore' },
          { name: '🌊 Vaporwave', value: 'vaporwave' },
          { name: '🎧 8D (Surround)', value: '3d' },
          { name: '🎤 Karaoke', value: 'karaoke' },
          { name: '🎼 Treble', value: 'treble' },
          { name: '📻 Echo', value: 'echo' }
        )
    ),

  async execute(interaction, client) {
    const queue = checkQueue(interaction, client);
    if (!queue) return;

    const filterChoice = interaction.options.getString('efek');

    // Jika tidak ada pilihan, tampilkan filter yang sedang aktif
    if (!filterChoice) {
      const activeFilters = queue.filters?.names || [];
      const list = activeFilters.length > 0 ? activeFilters.map(f => `• \`${f}\``).join('\n') : '_Tidak ada filter aktif_';
      const embed = new EmbedBuilder()
        .setColor('#2B2D31')
        .setTitle('🎛️ Audio Filter')
        .setDescription(`**Filter Aktif Saat Ini:**\n${list}`)
        .setFooter({ text: 'Gunakan /filter [efek] untuk mengubah' });
      return interaction.reply({ embeds: [embed] });
    }

    checkVoiceChannel(interaction);
    await interaction.deferReply();

    try {
      if (filterChoice === 'clear') {
        if (queue.filters?.clear) {
          queue.filters.clear();
        } else if (queue.setFilter) {
          queue.setFilter(false);
        }
        return interaction.editReply('🧹 **Semua filter audio telah dimatikan.**');
      }

      // Toggle filter
      let isApplied = false;
      if (queue.filters) {
        if (queue.filters.has && queue.filters.has(filterChoice)) {
          queue.filters.remove(filterChoice);
          isApplied = false;
        } else {
          queue.filters.add(filterChoice);
          isApplied = true;
        }
      } else if (queue.setFilter) {
        const res = queue.setFilter(filterChoice);
        isApplied = Array.isArray(res) ? res.includes(filterChoice) : true;
      }

      const active = (queue.filters?.names || []).join(', ') || 'None';
      await interaction.editReply(
        `🎛️ Filter **${filterChoice}** ${isApplied ? 'diaktifkan ✅' : 'dimatikan ❌'}.\n*Aktif saat ini:* \`${active}\``
      );
    } catch (err) {
      console.error('[Filter] Error:', err);
      await interaction.editReply(`❌ Gagal mengatur filter: ${err.message}`);
    }
  },
};
