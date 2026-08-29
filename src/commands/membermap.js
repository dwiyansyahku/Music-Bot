const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');
const { parseLocation } = require('../utils/locationHelper');

/**
 * Buat text progress bar
 */
function createProgressBar(percent, length = 12) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membermap')
    .setDescription('Tampilkan statistik peta dan sebaran daerah/kota asal member server'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const cardsData = storage.read('cards');
    const guildCards = cardsData[guildId] || {};

    const usersWithCard = Object.values(guildCards);
    const usersWithLocation = usersWithCard.filter(c => (c.location && c.location.city) || (c.asal && c.asal.trim() !== ''));

    if (usersWithLocation.length === 0) {
      return interaction.reply({
        content: '📍 **Belum ada member yang mengisi data Lokasi di Kartu Profil mereka!**\nYuk buat kartu profilmu di channel panel card untuk mengisi peta server!',
        ephemeral: true
      });
    }

    // Hitung frekuensi per lokasi
    const locCounts = {};
    const locMetadata = {};

    for (const card of usersWithLocation) {
      const locObj = card.location || parseLocation(card.asal);
      const cityKey = locObj?.city || 'Lainnya';
      const flag = locObj?.flag || '📍';
      const region = locObj?.stateOrProvince || (locObj?.country !== 'Indonesia' ? locObj?.country : '');

      locCounts[cityKey] = (locCounts[cityKey] || 0) + 1;
      if (!locMetadata[cityKey]) {
        locMetadata[cityKey] = { flag, region };
      }
    }

    // Sort descending berdasarkan jumlah terbanyak
    const sorted = Object.entries(locCounts).sort((a, b) => b[1] - a[1]);
    const totalWithLoc = usersWithLocation.length;

    const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const formattedList = sorted.slice(0, 10).map(([loc, count], idx) => {
      const pct = Math.round((count / totalWithLoc) * 100);
      const bar = createProgressBar(pct, 10);
      const medal = rankEmojis[idx] || '📍';
      const meta = locMetadata[loc];
      const regionText = meta?.region ? ` *(${meta.region})*` : '';
      const flagText = meta?.flag ? ` ${meta.flag}` : '';

      return `${medal} **${loc}**${regionText}${flagText} — \`${count} Member\` (${pct}%)\n   \`${bar}\``;
    }).join('\n\n');

    const remainingCount = sorted.slice(10).reduce((acc, curr) => acc + curr[1], 0);

    const embed = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setTitle(`🗺️ Peta Sebaran Wilayah Member — ${interaction.guild.name}`)
      .setDescription(
        `Statistik domisili member yang terdaftar di sistem **Member Card** server.\n\n` +
        formattedList +
        (remainingCount > 0 ? `\n\n*...dan ${remainingCount} member lainnya dari berbagai kota berbeda.*` : '')
      )
      .addFields(
        { name: '👥 Total Member Terdata', value: `**${totalWithLoc}** / ${usersWithCard.length} pemilik card`, inline: true },
        { name: '🏙️ Total Kota/Daerah', value: `**${sorted.length}** Wilayah`, inline: true }
      )
      .setFooter({ text: 'Isi lokasi di profil card-mu untuk menambahkan kotamu ke peta!' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
