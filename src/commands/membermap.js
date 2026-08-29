const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const storage = require('../utils/storage');
const { parseLocation } = require('../utils/locationHelper');

function createProgressBar(percent, length = 10) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

const ITEMS_PER_PAGE = 6; // 6 kota per halaman agar embed tetap proporsional & rapi

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membermap')
    .setDescription('Peta sebaran daerah/kota asal member server dengan navigasi halaman (Pagination)'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const cardsData = storage.read('cards');
    const guildCards = cardsData[guildId] || {};

    const usersWithCard = Object.values(guildCards);

    // Hitung frekuensi per lokasi & filter anomali
    const locCounts = {};
    const locMetadata = {};
    let totalValidLocations = 0;

    for (const card of usersWithCard) {
      const rawAsal = card.asal || card.location?.display || '';
      if (!rawAsal || rawAsal.trim() === '') continue;

      const locObj = parseLocation(rawAsal);
      if (!locObj || locObj.isAnomaly || !locObj.city) {
        continue;
      }

      const cityKey = locObj.city;
      const flag = locObj.flag || '🇮🇩';
      const region = locObj.stateOrProvince && locObj.stateOrProvince !== cityKey
        ? locObj.stateOrProvince
        : (locObj.country !== 'Indonesia' ? locObj.country : '');

      locCounts[cityKey] = (locCounts[cityKey] || 0) + 1;
      if (!locMetadata[cityKey]) {
        locMetadata[cityKey] = { flag, region };
      }
      totalValidLocations++;
    }

    if (totalValidLocations === 0) {
      return interaction.reply({
        content: '📍 **Belum ada member yang mengisi data Lokasi valid di Kartu Profil mereka!**\nYuk buat/edit kartu profilmu di channel panel card untuk mengisi peta server!',
        ephemeral: true
      });
    }

    // Sort descending berdasarkan jumlah terbanyak
    const sorted = Object.entries(locCounts).sort((a, b) => b[1] - a[1]);
    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);

    const rankIcons = ['🥇', '🥈', '🥉'];

    function generateEmbed(pageIndex) {
      const start = pageIndex * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const pageItems = sorted.slice(start, end);

      const formattedList = pageItems.map(([loc, count], idx) => {
        const globalRank = start + idx + 1;
        const pct = Math.round((count / totalValidLocations) * 100);
        const bar = createProgressBar(pct, 10);
        const rankLabel = rankIcons[globalRank - 1] || `\`#${globalRank.toString().padStart(2, '0')}\``;
        const meta = locMetadata[loc];
        const regionText = meta?.region ? ` *(${meta.region})*` : '';
        const flagText = meta?.flag ? ` ${meta.flag}` : '';

        return `${rankLabel} **${loc}**${regionText}${flagText} — \`${count} Member\` (${pct}%)\n   \`${bar}\``;
      }).join('\n\n');

      return new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle(`🗺️ Peta Sebaran Wilayah Member — ${interaction.guild.name}`)
        .setDescription(
          `Statistik persebaran domisili member resmi di server **${interaction.guild.name}**.\n\n` +
          formattedList
        )
        .addFields(
          { name: '👥 Member Terdata', value: `**${totalValidLocations}** / ${usersWithCard.length} pemilik card`, inline: true },
          { name: '🏙️ Total Wilayah', value: `**${sorted.length}** Daerah/Kota`, inline: true },
          { name: '📄 Halaman', value: `**${pageIndex + 1}** dari **${totalPages}**`, inline: true }
        )
        .setFooter({ text: 'Gunakan tombol di bawah untuk berpindah halaman wilayah' })
        .setTimestamp();
    }

    function generateActionRow(pageIndex) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('map_first')
          .setLabel('⏮️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('map_prev')
          .setLabel('◀ Sebelumnya')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('map_page_info')
          .setLabel(`${pageIndex + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('map_next')
          .setLabel('Berikutnya ▶')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(pageIndex === totalPages - 1),
        new ButtonBuilder()
          .setCustomId('map_last')
          .setLabel('⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIndex === totalPages - 1)
      );
    }

    let currentPage = 0;
    const initialEmbed = generateEmbed(currentPage);
    const initialRow = generateActionRow(currentPage);

    const replyMsg = await interaction.reply({
      embeds: [initialEmbed],
      components: totalPages > 1 ? [initialRow] : [],
      flags: MessageFlags.Ephemeral,
      fetchReply: true
    });

    if (totalPages <= 1) return;

    // Interactive Button Collector (5 Menit Aktif Khusus User Tersebut)
    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 Menit
    });

    collector.on('collect', async (btnInt) => {
      // Perpanjang timer collector setiap ada interaksi
      collector.resetTimer();

      if (btnInt.customId === 'map_prev' && currentPage > 0) {
        currentPage--;
      } else if (btnInt.customId === 'map_next' && currentPage < totalPages - 1) {
        currentPage++;
      } else if (btnInt.customId === 'map_first') {
        currentPage = 0;
      } else if (btnInt.customId === 'map_last') {
        currentPage = totalPages - 1;
      }

      const updatedEmbed = generateEmbed(currentPage);
      const updatedRow = generateActionRow(currentPage);

      await btnInt.update({
        embeds: [updatedEmbed],
        components: [updatedRow]
      }).catch(() => {});
    });

    collector.on('end', async () => {
      // Nonaktifkan tombol setelah timeout
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('d1').setLabel('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('d2').setLabel('◀ Sebelumnya').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('d3').setLabel(`${currentPage + 1} / ${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('d4').setLabel('Berikutnya ▶').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('d5').setLabel('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );

      await interaction.editReply({
        components: [disabledRow]
      }).catch(() => {});
    });
  }
};
