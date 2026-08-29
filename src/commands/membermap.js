const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { parseLocation } = require('../utils/locationHelper');

function createProgressBar(percent, length = 10) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membermap')
    .setDescription('Tampilkan statistik peta dan sebaran daerah/kota asal seluruh member server'),

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
        continue; // Lewati lokasi anomali (seperti 'HOME', 'Surga', dll)
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

    const rankIcons = ['🥇', '🥈', '🥉'];

    // Format SEMUA data lokasi tanpa batasan limit 10
    const formattedList = sorted.map(([loc, count], idx) => {
      const pct = Math.round((count / totalValidLocations) * 100);
      const bar = createProgressBar(pct, 10);
      const rankNum = idx + 1;
      const rankLabel = rankIcons[idx] || `\`#${rankNum.toString().padStart(2, '0')}\``;
      const meta = locMetadata[loc];
      const regionText = meta?.region ? ` *(${meta.region})*` : '';
      const flagText = meta?.flag ? ` ${meta.flag}` : '';

      return `${rankLabel} **${loc}**${regionText}${flagText} — \`${count} Member\` (${pct}%)\n   \`${bar}\``;
    }).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`🗺️ Peta Sebaran Wilayah Member — ${interaction.guild.name}`)
      .setDescription(
        `Statistik persebaran domisili member resmi yang terdaftar di **Member Card** server.\n\n` +
        formattedList
      )
      .addFields(
        { name: '👥 Member Terdata', value: `**${totalValidLocations}** / ${usersWithCard.length} pemilik card`, inline: true },
        { name: '🏙️ Total Wilayah', value: `**${sorted.length}** Daerah/Kota`, inline: true }
      )
      .setFooter({ text: 'Lokasi diperbarui secara realtime dari kartu profil member' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
