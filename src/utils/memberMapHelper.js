const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const storage = require('./storage');
const { parseLocation } = require('./locationHelper');

const ITEMS_PER_PAGE = 6;

function createProgressBar(percent, length = 10) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '■'.repeat(filled) + '□'.repeat(empty);
}

/**
 * Ambil data sebaran lokasi yang dikelompokkan berdasarkan Provinsi Terbanyak,
 * lalu diurutkan berdasarkan Kota Terbanyak di dalam provinsi tersebut.
 */
function getMemberMapData(guildOrId) {
  const guildId = typeof guildOrId === 'string' ? guildOrId : guildOrId?.id;
  const guild = typeof guildOrId === 'object' ? guildOrId : null;

  const cardsData = storage.read('cards');
  const guildCards = cardsData[guildId] || {};

  const regions = {}; // provinceName -> { name, flag, totalCount, cities: { cityName -> { city, count, members } } }
  const locCounts = {};
  const locMetadata = {};
  const locMembers = {}; // cityKey -> [ { userId, card } ]
  let totalValidLocations = 0;
  let totalCardsCount = 0;

  for (const [userId, card] of Object.entries(guildCards)) {
    // Pastikan user masih berada di dalam server
    if (guild && !guild.members.cache.has(userId)) {
      continue;
    }

    totalCardsCount++;
    const rawAsal = card.asal || card.location?.display || '';
    if (!rawAsal || rawAsal.trim() === '') continue;

    const locObj = parseLocation(rawAsal);
    if (!locObj || locObj.isAnomaly || !locObj.city) {
      continue;
    }

    const cityKey = locObj.city;
    const flag = locObj.flag || '🇮🇩';
    const province = locObj.stateOrProvince || (locObj.country !== 'Indonesia' ? locObj.country : 'Lainnya');

    // 1. Grouping per Provinsi / Region
    if (!regions[province]) {
      regions[province] = {
        name: province,
        flag,
        totalCount: 0,
        cities: {}
      };
    }

    regions[province].totalCount++;
    if (!regions[province].cities[cityKey]) {
      regions[province].cities[cityKey] = {
        city: cityKey,
        count: 0,
        members: []
      };
    }
    regions[province].cities[cityKey].count++;
    regions[province].cities[cityKey].members.push({ userId, card });

    // 2. Metadata umum
    locCounts[cityKey] = (locCounts[cityKey] || 0) + 1;
    if (!locMetadata[cityKey]) {
      locMetadata[cityKey] = { flag, region: province !== cityKey ? province : '' };
    }
    if (!locMembers[cityKey]) {
      locMembers[cityKey] = [];
    }
    locMembers[cityKey].push({ userId, card });
    totalValidLocations++;
  }

  // 3. SORTING TINGKAT 1: Urutkan Provinsi dari yang membernya paling banyak
  const sortedRegions = Object.values(regions).sort((a, b) => b.totalCount - a.totalCount);

  // 4. SORTING TINGKAT 2: Di dalam tiap provinsi, urutkan kota dari yang membernya terbanyak
  const sorted = [];
  for (const reg of sortedRegions) {
    const sortedCities = Object.values(reg.cities).sort((a, b) => b.count - a.count);
    for (const c of sortedCities) {
      sorted.push([c.city, c.count, reg.name]);
    }
  }

  const topRegion = sortedRegions.length > 0 ? sortedRegions[0] : null;
  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));

  return {
    sorted,
    sortedRegions,
    topRegion,
    locMetadata,
    locMembers,
    totalValidLocations,
    totalCards: totalCardsCount,
    totalPages
  };
}

/**
 * Buat Embed Halaman Spesifik (Hierarki Provinsi Terbanyak -> Kota Terbanyak)
 */
function buildMemberMapEmbed(guild, pageIndex = 0) {
  const data = getMemberMapData(guild);
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

    const members = data.locMembers[loc] || [];
    let memberMentions = members.slice(0, 4).map(m => `<@${m.userId}>`).join(', ');
    if (members.length > 4) {
      memberMentions += ` *(+${members.length - 4} lainnya)*`;
    }

    return `${rankLabel} **${loc}**${regionText}${flagText} — \`${count} Member\` (${pct}%)\n   \`${bar}\`\n   └ ${memberMentions}`;
  }).join('\n\n');

  const topRegionInfo = data.topRegion
    ? `**${data.topRegion.name}** (${data.topRegion.totalCount} Member)`
    : '-';

  return new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `REGIONAL DIRECTORY — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Peta Persebaran Wilayah Member`)
    .setDescription(
      `Statistik domisili member resmi di server **${guild.name}**.\n` +
      `*Dikelompokkan berdasarkan provinsi & kota terbanyak.*\n\n` +
      formattedList
    )
    .addFields(
      { name: 'Provinsi Terbanyak', value: topRegionInfo, inline: true },
      { name: 'Member Terdata', value: `**${data.totalValidLocations}** / ${data.totalCards} profil`, inline: true },
      { name: 'Halaman', value: `**${safePage + 1}** dari **${data.totalPages}**`, inline: true }
    )
    .setFooter({ text: 'Pilih daerah pada menu di bawah untuk melihat detail profil member' })
    .setTimestamp();
}

/**
 * Buat Action Rows (Select Menu + Tombol Navigasi)
 */
function buildMemberMapComponents(pageIndex, totalPages, guild) {
  const data = getMemberMapData(guild);
  const safePage = Math.max(0, Math.min(pageIndex, totalPages - 1));

  const rows = [];

  // 1. Select Menu: Pilih kota di halaman ini untuk lihat detail member
  const start = safePage * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = data.sorted.slice(start, end);

  if (pageItems.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('mmap_select_city')
      .setPlaceholder('Pilih kota/wilayah untuk melihat detail member...')
      .addOptions(
        pageItems.map(([loc, count]) => {
          const meta = data.locMetadata[loc];
          const desc = meta?.region ? `Provinsi: ${meta.region} • ${count} Member` : `Total ${count} member terdaftar`;
          return {
            label: `${loc} (${count} Member)`,
            description: desc.substring(0, 100),
            value: loc.substring(0, 100)
          };
        })
      );

    rows.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  // 2. Button Pagination (Jika lebih dari 1 halaman)
  if (totalPages > 1) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('mmap_first')
          .setLabel('⏮')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage === 0),
        new ButtonBuilder()
          .setCustomId(`mmap_prev:${Math.max(0, safePage - 1)}`)
          .setLabel('◀ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage === 0),
        new ButtonBuilder()
          .setCustomId('mmap_info')
          .setLabel(`${safePage + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`mmap_next:${Math.min(totalPages - 1, safePage + 1)}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage >= totalPages - 1),
        new ButtonBuilder()
          .setCustomId(`mmap_last:${totalPages - 1}`)
          .setLabel('⏭')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(safePage >= totalPages - 1)
      )
    );
  }

  return rows;
}

/**
 * Buat Embed Detail Member untuk Kota Tertentu
 */
async function buildCityDetailEmbed(guild, cityKey) {
  const data = getMemberMapData(guild);
  const members = data.locMembers[cityKey] || [];
  const meta = data.locMetadata[cityKey];
  const regionText = meta?.region ? ` (${meta.region})` : '';
  const flagText = meta?.flag ? ` ${meta.flag}` : '';

  const settings = storage.read('settings');
  const targetChannelId = settings[guild.id]?.cardResultChannel;

  const memberLines = [];
  for (let i = 0; i < members.length; i++) {
    const item = members[i];
    const memberObj = await guild.members.fetch(item.userId).catch(() => null);
    const displayName = memberObj ? memberObj.displayName : `User <@${item.userId}>`;
    const bioText = item.card.bio ? `\n   > _"${item.card.bio}"_` : '';

    let jumpLink = '';
    if (targetChannelId && item.card.publishedMessageId) {
      jumpLink = ` • [Lihat Kartu ↗](https://discord.com/channels/${guild.id}/${targetChannelId}/${item.card.publishedMessageId})`;
    }

    memberLines.push(`\`#${(i + 1).toString().padStart(2, '0')}\` **${displayName}** (<@${item.userId}>)${jumpLink}${bioText}`);
  }

  const embed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `MEMBER DIRECTORY — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Daftar Member: ${cityKey}${regionText}${flagText}`)
    .setDescription(
      `Berikut adalah daftar **${members.length} member** yang berdomisili di **${cityKey}**:\n\n` +
      (memberLines.join('\n\n') || '_Tidak ada member yang ditemukan._')
    )
    .setFooter({ text: 'Data diambil realtime dari kartu profil member server' })
    .setTimestamp();

  return embed;
}

/**
 * Buat Payload Panel Publik Permanen
 */
function createMemberMapPanelPayload(guild) {
  const data = getMemberMapData(guild);
  const topRegionInfo = data.topRegion
    ? `**${data.topRegion.name}** (${data.topRegion.totalCount} Member)`
    : '-';

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
      { name: 'Provinsi Terbanyak', value: topRegionInfo, inline: true },
      { name: 'Member Terdata', value: `**${data.totalValidLocations} Member**`, inline: true }
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
  buildCityDetailEmbed,
  createMemberMapPanelPayload
};
