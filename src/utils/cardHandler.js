const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require('discord.js');
const storage = require('./storage');
const { getVoiceStats, getLiveVoiceInfo } = require('./voiceTracker');

const COLOR_MAP = {
  'ungu': '#8B5CF6',
  'purple': '#8B5CF6',
  'violet': '#8B5CF6',
  'biru': '#3B82F6',
  'blue': '#3B82F6',
  'birumuda': '#60A5FA',
  'biru muda': '#60A5FA',
  'birutua': '#1E40AF',
  'biru tua': '#1E40AF',
  'cyan': '#06B6D4',
  'hijau': '#10B981',
  'green': '#10B981',
  'hijautua': '#047857',
  'hijau tua': '#047857',
  'hijaumuda': '#34D399',
  'hijau muda': '#34D399',
  'merah': '#EF4444',
  'red': '#EF4444',
  'merahmuda': '#F472B6',
  'merah muda': '#F472B6',
  'pink': '#EC4899',
  'merahhati': '#991B1B',
  'merah hati': '#991B1B',
  'maroon': '#800000',
  'marun': '#800000',
  'kuning': '#FBBF24',
  'yellow': '#FBBF24',
  'emas': '#F59E0B',
  'gold': '#F59E0B',
  'oranye': '#F97316',
  'orange': '#F97316',
  'jingga': '#F97316',
  'toska': '#06B6D4',
  'tosca': '#06B6D4',
  'hitam': '#1E1E2E',
  'hitampekat': '#11111B',
  'hitam pekat': '#11111B',
  'putih': '#FFFFFF',
  'putihbersih': '#FFFFFF',
  'putih bersih': '#FFFFFF',
  'abu': '#6B7280',
  'abu-abu': '#6B7280',
  'abumuda': '#9CA3AF',
  'abu muda': '#9CA3AF',
  'abutua': '#374151',
  'abu tua': '#374151',
  'cokelat': '#78350F',
  'coklat': '#78350F'
};

/**
 * Resolve color from English name, Indonesian name, or Hex code (#RGB / #RRGGBB / RRGGBB)
 */
function resolveColor(input) {
  if (!input || !input.trim()) return null;
  const clean = input.trim().toLowerCase();
  if (COLOR_MAP[clean]) return COLOR_MAP[clean];
  const noSpace = clean.replace(/[\s-_]+/g, '');
  if (COLOR_MAP[noSpace]) return COLOR_MAP[noSpace];
  const hexMatch = clean.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
    }
    return `#${hex}`.toUpperCase();
  }
  return null;
}

function normalizeBannerUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;
  // Convert imgur.com/abc to i.imgur.com/abc.png
  const imgurMatch = clean.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/i);
  if (imgurMatch) {
    clean = `https://i.imgur.com/${imgurMatch[1]}.png`;
  }
  return clean;
}

/**
 * Parse promo link input: supports 'Title | URL' or standalone 'URL' (auto-detects platform name)
 */
function parsePromoLink(input) {
  if (!input || !input.trim()) return null;
  let title = '';
  let url = '';

  if (input.includes('|')) {
    const parts = input.split('|');
    title = parts[0].trim();
    url = parts.slice(1).join('|').trim();
  } else {
    url = input.trim();
  }

  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Auto-detect platform name if no custom title was provided
  if (!title) {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) title = 'YouTube';
    else if (lower.includes('spotify.com')) title = 'Spotify';
    else if (lower.includes('instagram.com')) title = 'Instagram';
    else if (lower.includes('tiktok.com')) title = 'TikTok';
    else if (lower.includes('github.com')) title = 'GitHub';
    else if (lower.includes('twitter.com') || lower.includes('x.com')) title = 'X (Twitter)';
    else if (lower.includes('twitch.tv')) title = 'Twitch';
    else if (lower.includes('soundcloud.com')) title = 'SoundCloud';
    else if (lower.includes('discord.gg') || lower.includes('discord.com')) title = 'Discord';
    else if (lower.includes('steamcommunity.com') || lower.includes('steampowered.com')) title = 'Steam';
    else {
      try {
        const domain = new URL(url).hostname.replace(/^www\./i, '');
        title = domain.charAt(0).toUpperCase() + domain.slice(1);
      } catch (_) {
        title = 'Visit Link';
      }
    }
  }

  return { title, url };
}

// Default Channel ID tempat hasil Member Card diterbitkan (#card-gallery)
const GALLERY_CHANNEL_ID = '1532290934396555354';

/**
 * Creates Embed & ActionRow for Member Profile Card Hub Panel posted in #create-card
 */
function createCardHubPayload(guild) {
  const settings = storage.read('settings');
  const targetChannelId = settings[guild.id]?.cardResultChannel || GALLERY_CHANNEL_ID;

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle('Member Profile Card')
    .setDescription(
      'Create and customize your digital identity card in this server.\n\n' +
      '**How It Works:**\n' +
      `1. Click **Edit Profile** to configure your Bio, Location, Zodiac / MBTI, Card Color, Social Link, and Banner Image. Your card will automatically publish and update in <#${targetChannelId}>.\n` +
      '2. **Live Voice Status:** Automatically displays your active voice channel and session duration.\n' +
      '3. **Banner Image:** Provide any direct image URL to display at the bottom of your card.\n' +
      '4. Click **View My Card** to preview your profile card privately.\n' +
      '5. Click **Reset** to clear your profile data and remove your card from the gallery.'
    )
    .setFooter({ text: `${guild.name} • Member Identity System` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('card_btn_edit')
      .setLabel('Edit Profile')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('card_btn_view_self')
      .setLabel('View My Card')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('card_btn_reset')
      .setLabel('Reset')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Helper to build interactive Like & Respect buttons for published cards in gallery
 */
function createPublishedCardComponents(authorId, likesCount = 0, respectsCount = 0) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`card_btn_like_${authorId}`)
      .setLabel(`Like (${likesCount})`)
      .setEmoji('❤️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`card_btn_respect_${authorId}`)
      .setLabel(`Respect (${respectsCount})`)
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

/**
 * Helper to calculate member join position order in the guild (e.g. #42 of 250)
 */
async function getMemberJoinPosition(guild, member) {
  if (!guild || !member) return null;
  try {
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const sorted = [...members.values()]
      .filter(m => !m.user.bot && m.joinedTimestamp)
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

    const index = sorted.findIndex(m => m.id === member.id);
    if (index !== -1) {
      return `#${index + 1} of ${sorted.length}`;
    }
  } catch (err) {
    console.warn('[CardHandler] Failed to get member join position:', err.message);
  }
  return null;
}

/**
 * Build clean, aesthetic, and elegant Member Profile Card Embed
 * Includes: Live VC status, Zodiac/MBTI, Social Link, Card Color, and Direct Banner URL
 */
async function buildMemberCardEmbed(guild, member) {
  const targetUser = member.user;
  const cardsData = storage.read('cards');
  const userCard = cardsData[guild.id]?.[targetUser.id] || {};

  function formatDate(date) {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const embedColor = userCard.color || member.roles.color?.hexColor || '#8B5CF6';

  let description = `\`@${targetUser.username}\``;
  if (userCard.bio) {
    description += `\n\n*"${userCard.bio}"*`;
  }

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(member.displayName)
    .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
    .setDescription(description);

  // Row 1: Member # | Join Server | Live VC (3 Inline Columns)
  const joinPos = await getMemberJoinPosition(guild, member);
  if (joinPos) {
    embed.addFields({ name: 'Member #', value: joinPos, inline: true });
  }

  if (member.joinedAt) {
    embed.addFields({ name: 'Join Server', value: formatDate(member.joinedAt), inline: true });
  }

  // Column 3: Live VC Status (Clean & Minimalist)
  let liveVcText = 'Inactive';
  if (member.voice && member.voice.channel) {
    const chName = member.voice.channel.name;
    const liveInfo = getLiveVoiceInfo(guild.id, targetUser.id);
    const durText = liveInfo.durationFormatted ? ` (${liveInfo.durationFormatted})` : '';
    const displayCh = chName.length > 14 ? chName.substring(0, 12) + '..' : chName;
    liveVcText = `#${displayCh}${durText}`;
  }
  embed.addFields({ name: 'Live VC', value: liveVcText, inline: true });

  // Row 2: Voice Time | Location | Zodiac / MBTI (3 Inline Columns)
  const voiceStats = getVoiceStats(guild.id, targetUser.id, guild);
  embed.addFields({ name: 'Voice Time', value: voiceStats.formattedTime, inline: true });

  embed.addFields({ name: 'Location', value: userCard.asal || '-', inline: true });

  embed.addFields({ name: 'Zodiac / MBTI', value: userCard.zodiac || '-', inline: true });

  // Row 3: Social Link (if set)
  if (userCard.linkUrl) {
    const linkTitle = userCard.linkTitle || 'Visit Link ↗';
    embed.addFields({
      name: 'Social Link',
      value: `[${linkTitle}](${userCard.linkUrl})`,
      inline: false
    });
  }

  // Row 4: Top Voice Friends (Full Width, Vertical List)
  if (voiceStats.topCompanions && voiceStats.topCompanions.length > 0) {
    const compText = voiceStats.topCompanions
      .map((c, i) => `${i + 1}. **${c.name}** — ${c.timeFormatted}`)
      .join('\n');
    embed.addFields({ name: 'Top Voice Friends', value: compText, inline: false });
  }

  // Banner image: Direct Image URL via Discord native proxy (Instant, 0 socket drops)
  if (userCard.bannerUrl && /^https?:\/\/.+/i.test(userCard.bannerUrl)) {
    embed.setImage(userCard.bannerUrl);
  }

  embed
    .setFooter({ text: `${guild.name} • Member Card` })
    .setTimestamp();

  return { embed };
}

/**
 * Publish or update member card in #card-gallery (Pure JSON, 0 Multipart Uploads, 0 Socket Errors)
 */
async function publishCardToChannel(guild, member, client, isAutoSync = false) {
  const guildId = guild.id;
  const userId = member.id;

  const settings = storage.read('settings');
  const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

  const publishChannel = guild.channels.cache.get(targetChannelId)
    || await client.channels.fetch(targetChannelId).catch(err => {
      console.error(`[CardHandler] Fetch gallery channel failed:`, err.message);
      return null;
    });

  if (!publishChannel) {
    return null;
  }

  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[userId] || {};
  const existingMsgId = userCard.publishedMessageId;

  const likesCount = (userCard.likes || []).length;
  const respectsCount = (userCard.respects || []).length;

  const { embed } = await buildMemberCardEmbed(guild, member);
  const components = createPublishedCardComponents(userId, likesCount, respectsCount);

  // If card was already published, edit existing message in-place
  if (existingMsgId) {
    try {
      const existingMsg = await publishChannel.messages.fetch(existingMsgId);
      if (existingMsg) {
        await existingMsg.edit({
          content: `**${member.displayName}** updated their Member Card.`,
          embeds: [embed],
          components: components
        });
        if (!isAutoSync) {
          console.log(`[CardHandler] Card for ${member.displayName} updated in-place in #${publishChannel.name}`);
        }
        return 'updated';
      }
    } catch (fetchErr) {
      if (fetchErr.code === 10008 || fetchErr.status === 404) {
        delete userCard.publishedMessageId;
        storage.write('cards', cardsData);
      }
    }
  }

  // First time publish OR fallback if existing message was deleted
  try {
    const warmMessage = `**${member.displayName}** published their Member Card.`;
    const newMsg = await publishChannel.send({
      content: warmMessage,
      embeds: [embed],
      components: components
    });

    if (!cardsData[guildId]) cardsData[guildId] = {};
    if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};
    cardsData[guildId][userId].publishedMessageId = newMsg.id;
    storage.write('cards', cardsData);

    console.log(`[CardHandler] Card for ${member.displayName} published to #${publishChannel.name}`);
    return existingMsgId ? 'updated' : 'first';
  } catch (sendErr) {
    console.error(`[CardHandler] Failed to publish card:`, sendErr.message);
    return null;
  }
}

/**
 * Handle when user clicks a button in Card Hub Panel or Published Card
 */
async function handleCardButton(interaction, client) {
  const customId = interaction.customId;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const settings = storage.read('settings');
  const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

  // 1. EDIT PROFILE → 5 fields (Bio, Location & Zodiac, Card Color, Social Link, Banner URL)
  if (customId === 'card_btn_edit') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_submit')
      .setTitle('Edit Member Profile');

    const bioInput = new TextInputBuilder()
      .setCustomId('card_input_bio')
      .setLabel('Bio / Status Tagline (Max 100)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g. Passionate music enthusiast & developer')
      .setValue(userCard.bio || '')
      .setRequired(false)
      .setMaxLength(100);

    const asalAndZodiacVal = userCard.asal && userCard.zodiac
      ? `${userCard.asal} | ${userCard.zodiac}`
      : (userCard.asal || userCard.zodiac || '');

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Location & Zodiac / MBTI (Max 40)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Jakarta | Taurus • INTJ (or just Jakarta)')
      .setValue(asalAndZodiacVal)
      .setRequired(false)
      .setMaxLength(40);

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Card Color (Color Name / Hex)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. biru, pink, ungu, gold, red, or #8B5CF6')
      .setValue(userCard.color || '')
      .setRequired(false)
      .setMaxLength(25);

    const linkInput = new TextInputBuilder()
      .setCustomId('card_input_link')
      .setLabel('Social Link (Title | URL)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Instagram | https://instagram.com/myusername')
      .setValue(userCard.linkTitle && userCard.linkUrl ? `${userCard.linkTitle} | ${userCard.linkUrl}` : (userCard.linkUrl || ''))
      .setRequired(false)
      .setMaxLength(250);

    const bannerInput = new TextInputBuilder()
      .setCustomId('card_input_banner')
      .setLabel('Banner Image (Image URL)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Paste image URL (Right-click image ➔ Copy Image Link)')
      .setValue(userCard.bannerUrl || '')
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(linkInput),
      new ActionRowBuilder().addComponents(bannerInput)
    );

    return interaction.showModal(modal);
  }

  // 2. VIEW MY CARD (Ephemeral Preview — Pure JSON, 0 ms)
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { embed } = await buildMemberCardEmbed(interaction.guild, interaction.member);
      return await interaction.editReply({
        content: '*Your Member Card Preview:*',
        embeds: [embed]
      });
    } catch (err) {
      console.error('[ViewCard] Error:', err);
      return await interaction.editReply({
        content: `Failed to generate card preview: ${err.message}`
      });
    }
  }

  // 4. RESET CARD
  if (customId === 'card_btn_reset') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId];
    if (userCard) {
      if (userCard.publishedMessageId) {
        const publishChannel = interaction.guild.channels.cache.get(targetChannelId)
          || await client.channels.fetch(targetChannelId).catch(() => null);
        if (publishChannel) {
          publishChannel.messages.fetch(userCard.publishedMessageId)
            .then(msg => msg.delete().catch(() => { }))
            .catch(() => { });
        }
      }
      delete cardsData[guildId][userId];
      storage.write('cards', cardsData);
    }
    return interaction.reply({
      content: 'Your profile card has been reset and removed from the gallery.',
      flags: MessageFlags.Ephemeral
    });
  }

  // 5. LIKE & RESPECT BUTTONS (on published cards in gallery)
  if (customId.startsWith('card_btn_like_') || customId.startsWith('card_btn_respect_')) {
    const isLike = customId.startsWith('card_btn_like_');
    const authorId = customId.replace(isLike ? 'card_btn_like_' : 'card_btn_respect_', '');
    const voterId = interaction.user.id;

    const cardsData = storage.read('cards');
    if (!cardsData[guildId]?.[authorId]) {
      return interaction.reply({
        content: 'Card data not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    const targetCard = cardsData[guildId][authorId];

    // Toggle vote (add or remove)
    if (isLike) {
      if (!Array.isArray(targetCard.likes)) targetCard.likes = [];
      const idx = targetCard.likes.indexOf(voterId);
      if (idx > -1) targetCard.likes.splice(idx, 1);
      else targetCard.likes.push(voterId);
    } else {
      if (!Array.isArray(targetCard.respects)) targetCard.respects = [];
      const idx = targetCard.respects.indexOf(voterId);
      if (idx > -1) targetCard.respects.splice(idx, 1);
      else targetCard.respects.push(voterId);
    }

    storage.write('cards', cardsData);

    // Re-build and update the message in-place (real-time)
    const authorMember = await interaction.guild.members.fetch(authorId).catch(() => null);
    if (!authorMember) {
      return interaction.reply({
        content: 'Card author not found in this server.',
        flags: MessageFlags.Ephemeral
      });
    }

    const { embed: updatedEmbed } = await buildMemberCardEmbed(interaction.guild, authorMember);
    const updatedComponents = createPublishedCardComponents(
      authorId,
      (targetCard.likes || []).length,
      (targetCard.respects || []).length
    );

    // Update the message instantly (real-time update)
    await interaction.update({
      embeds: [updatedEmbed],
      components: updatedComponents
    });

    const isAdded = isLike
      ? targetCard.likes.includes(voterId)
      : targetCard.respects.includes(voterId);

    const actionText = isLike
      ? (isAdded ? 'You liked this card.' : 'You removed your like.')
      : (isAdded ? 'You gave respect.' : 'You removed your respect.');

    return interaction.followUp({
      content: actionText,
      flags: MessageFlags.Ephemeral
    }).catch(() => { });
  }
}

/**
 * Handle modal form submit — save data & auto-update in gallery
 */
async function handleCardModalSubmit(interaction, client) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const settings = storage.read('settings');
  const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

  let bio = interaction.fields.getTextInputValue('card_input_bio').trim();
  let asalRaw = interaction.fields.getTextInputValue('card_input_asal').trim();
  let colorRaw = interaction.fields.getTextInputValue('card_input_color').trim();
  let linkRaw = interaction.fields.getTextInputValue('card_input_link').trim();
  let bannerUrl = interaction.fields.getTextInputValue('card_input_banner').trim();

  // Parse Location & Zodiac (supports "Location | Zodiac" or standalone Location)
  let asal = '';
  let zodiac = '';
  if (asalRaw.includes('|')) {
    const parts = asalRaw.split('|');
    asal = parts[0].trim();
    zodiac = parts.slice(1).join('|').trim();
  } else {
    asal = asalRaw;
  }

  // Resolve color by name (English / Indonesian) or hex code
  let resolvedColor = resolveColor(colorRaw);

  // Parse Social Link
  const parsedLink = parsePromoLink(linkRaw);

  if (bannerUrl) {
    bannerUrl = normalizeBannerUrl(bannerUrl);
  }

  // Save profile data
  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (bio) userCard.bio = bio; else delete userCard.bio;
  if (asal) userCard.asal = asal; else delete userCard.asal;
  if (zodiac) userCard.zodiac = zodiac; else delete userCard.zodiac;
  if (resolvedColor) userCard.color = resolvedColor; else delete userCard.color;

  if (parsedLink) {
    userCard.linkTitle = parsedLink.title;
    userCard.linkUrl = parsedLink.url;
  } else {
    delete userCard.linkTitle;
    delete userCard.linkUrl;
  }

  if (bannerUrl) {
    userCard.bannerUrl = bannerUrl;
  } else {
    delete userCard.bannerUrl;
  }

  // Clean up unused song fields
  delete userCard.songTitle;
  delete userCard.songUrl;
  delete userCard.bannerCropUrl;

  storage.write('cards', cardsData);

  await interaction.editReply({
    content: `**Profile saved!** Publishing your card to <#${targetChannelId}>...`
  });

  try {
    await publishCardToChannel(interaction.guild, interaction.member, client);
    await interaction.editReply({
      content: `**Profile saved & published to <#${targetChannelId}>!**`
    }).catch(() => {});
  } catch (err) {
    console.error('[CardHandler] Publish failed:', err.message);
    await interaction.editReply({
      content: `**Profile saved!** Card published to <#${targetChannelId}>.`
    }).catch(() => {});
  }
}

module.exports = {
  createCardHubPayload,
  handleCardButton,
  handleCardModalSubmit,
  buildMemberCardEmbed,
  publishCardToChannel
};
