const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('./storage');
const { parseLocation } = require('./locationHelper');

const ITEMS_PER_PAGE = 6;

function createProgressBar(percent, length = 10) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '■'.repeat(filled) + '□'.repeat(empty);
}

/**
 * Ambil data sebaran lokasi yang valid
 */
function getMemberMapData(guildId) {
  const cardsData = storage.read('cards');
  const guildCards = cardsData[guildId] || {};
  const usersWithCard = Object.values(guildCards);

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

  const sorted = Object.entries(locCounts).sort((a, b) => b[1] - a[1]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));

  return {
    sorted,
    locMetadata,
    totalValidLocations,
    totalCards: usersWithCard.length,
    totalPages
  };
}

/**
 * Buat Embed Halaman Spesifik (Clean & Dark Minimalist)
 */
function buildMemberMapEmbed(guild, pageIndex = 0) {
  const data = getMemberMapData(guild.id);
  const safePage = Math.max(0, Math.min(pageIndex, data.totalPages - 1));

  if (data.totalValidLocations === 0) {
    return new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`Peta Persebaran Wilayah — ${guild.name}`)
      .setDescription('Belum ada data domisili yang terdaftar di sistem kartu profil.\nMember dapat melengkapi lokasi mereka melalui panel Member Card.')
      .setFooter({ text: 'Lokasi diperbarui secara realtime dari profil member' })
      .setTimestamp();
  }

  const start = safePage * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = data.sorted.slice(start, end);

  const formattedList = pageItems.map(([loc, count], idx) => {
    const globalRank = start + idx + 1;
    const pct = Math.round((count / data.totalValidLocations) * 100);
    const bar = createProgressBar(pct, 10);
    const rankLabel = `\`#${globalRank.toString().padStart(2, '0')}\``;
    const meta = data.locMetadata[loc];
    const regionText = meta?.region ? ` *(${meta.region})*` : '';
    const flagText = meta?.flag ? ` ${meta.flag}` : '';

    return `${rankLabel} **${loc}**${regionText}${flagText} — \`${count} Member\` (${pct}%)\n   \`${bar}\``;
  }).join('\n\n');

  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `REGIONAL DIRECTORY — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Peta Persebaran Wilayah Member`)
    .setDescription(
      `Statistik domisili member resmi di server **${guild.name}**.\n\n` +
      formattedList
    )
    .addFields(
      { name: 'Member Terdata', value: `**${data.totalValidLocations}** / ${data.totalCards} profil`, inline: true },
      { name: 'Total Wilayah', value: `**${data.sorted.length}** Daerah`, inline: true },
      { name: 'Halaman', value: `**${safePage + 1}** dari **${data.totalPages}**`, inline: true }
    )
    .setFooter({ text: 'Navigasi halaman melalui tombol di bawah' })
    .setTimestamp();
}

/**
 * Buat Action Row Tombol Navigasi (Stateless via CustomId)
 */
function buildMemberMapComponents(pageIndex, totalPages) {
  if (totalPages <= 1) return [];

  const safePage = Math.max(0, Math.min(pageIndex, totalPages - 1));

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mmap_goto:0`)
        .setLabel('⏮')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage === 0),
      new ButtonBuilder()
        .setCustomId(`mmap_goto:${safePage - 1}`)
        .setLabel('◀ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage === 0),
      new ButtonBuilder()
        .setCustomId('mmap_info')
        .setLabel(`${safePage + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`mmap_goto:${safePage + 1}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage >= totalPages - 1),
      new ButtonBuilder()
        .setCustomId(`mmap_goto:${totalPages - 1}`)
        .setLabel('⏭')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(safePage >= totalPages - 1)
    )
  ];
}

/**
 * Buat Payload Panel Publik Permanen
 */
function createMemberMapPanelPayload(guild) {
  const data = getMemberMapData(guild.id);

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `REGIONAL HUB — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Peta Persebaran Domisili Member`)
    .setDescription(
      `Jelajahi statistik sebaran daerah dan kota asal teman-teman di komunitas **${guild.name}**.\n\n` +
      `Klik tombol **Buka Peta Wilayah** di bawah untuk membuka sesi navigasi interaktif pribadimu.`
    )
    .addFields(
      { name: 'Member Terdata', value: `**${data.totalValidLocations} Member**`, inline: true },
      { name: 'Total Wilayah', value: `**${data.sorted.length} Daerah/Kota**`, inline: true }
    )
    .setFooter({ text: 'Sesi bersifat privat dan tidak saling mengganggu antar member' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mmap_open_panel')
      .setLabel('Buka Peta Wilayah ↗')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  getMemberMapData,
  buildMemberMapEmbed,
  buildMemberMapComponents,
  createMemberMapPanelPayload
};
