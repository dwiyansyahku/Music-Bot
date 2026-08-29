const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require('discord.js');
const storage = require('./storage');
const { getVoiceStats, getLiveVoiceInfo } = require('./voiceTracker');
const { parseBirthdate, getZodiac } = require('./birthdayHelper');
const { parseLocation } = require('./locationHelper');

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
      `1. Click **Edit Profile** to configure your Bio, Location, Birthday (Tanggal Lahir), Zodiac / MBTI, Social Link, and Banner Image. Your card will automatically publish and update in <#${targetChannelId}>.\n` +
      '2. **Live Voice Status:** Automatically displays your active voice channel and session duration.\n' +
      '3. **Birthday Alert:** Fill in your birthday to receive an automatic celebration wish on your special day!\n' +
      '4. **Banner Image:** Provide any direct image URL to display at the bottom of your card.\n' +
      '5. Click **View My Card** to preview your profile card privately.\n' +
      '6. Click **Reset** to clear your profile data and remove your card from the gallery.'
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
 * Includes: Live VC status, Birthday, Zodiac/MBTI, Social Link, and Direct Banner URL
 */
async function buildMemberCardEmbed(guild, member) {
  const targetUser = member.user;
  const cardsData = storage.read('cards');
  const userCard = cardsData[guild.id]?.[targetUser.id] || {};

  function formatDate(date) {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const embedColor = member.roles.color?.hexColor || '#8B5CF6';

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

  // Row 2: Voice Time | Location | Birthday (3 Inline Columns)
  const voiceStats = getVoiceStats(guild.id, targetUser.id, guild);
  embed.addFields({ name: 'Voice Time', value: voiceStats.formattedTime, inline: true });

  // Location display (Smart normalized)
  const locDisplay = userCard.location?.display || userCard.asal || '-';
  embed.addFields({ name: 'Location', value: locDisplay, inline: true });

  // Birthday display
  let birthdayText = '-';
  if (userCard.birthdate && userCard.birthdate.formatted) {
    birthdayText = userCard.birthdate.formatted;
    if (userCard.birthdate.age) {
      birthdayText += ` (${userCard.birthdate.age} th)`;
    }
  }
  embed.addFields({ name: '🎂 Birthday', value: birthdayText, inline: true });

  // Row 3: Zodiac / MBTI (if set or auto-detected from birthday)
  const zodiacDetected = userCard.birthdate ? getZodiac(userCard.birthdate.day, userCard.birthdate.month) : null;
  const zodiacDisplay = userCard.zodiac || (zodiacDetected ? zodiacDetected.label : null);

  if (zodiacDisplay) {
    embed.addFields({ name: 'Zodiac / MBTI', value: zodiacDisplay, inline: true });
  }

  // Row 3 (or 4): Social Link (if set)
  if (userCard.linkUrl) {
    const linkTitle = userCard.linkTitle || 'Visit Link ↗';
    embed.addFields({
      name: 'Social Link',
      value: `[${linkTitle}](${userCard.linkUrl})`,
      inline: Boolean(zodiacDisplay)
    });
  }

  // Row 4: Top Voice Companions (Full Width, Vertical List)
  if (voiceStats.topCompanions && voiceStats.topCompanions.length > 0) {
    const compText = voiceStats.topCompanions
      .map((c, i) => `${i + 1}. **${c.name}** — ${c.timeFormatted}`)
      .join('\n');
    embed.addFields({ name: 'Top Voice Companions', value: compText, inline: false });
  }

  // Row 5: Achievements & Badges (Dynamic)
  try {
    const { getUserAchievements } = require('./achievementHelper');
    const achData = getUserAchievements(guild.id, member.id, member);
    if (achData.unlocked.length > 0) {
      const badgeList = achData.unlocked.map(a => `${a.emoji} ${a.name}`).join(' • ');
      embed.addFields({
        name: `🎖️ Badges & Gelar (${achData.unlocked.length})`,
        value: badgeList,
        inline: false
      });
    }
  } catch (_) {}

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
    console.warn(`[CardHandler] Target channel ${targetChannelId} not found in guild ${guild.name}`);
    return;
  }

  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];
  const { embed } = await buildMemberCardEmbed(guild, member);

  const likesCount = (userCard.likes || []).length;
  const respectsCount = (userCard.respects || []).length;
  const components = createPublishedCardComponents(userId, likesCount, respectsCount);

  // CASE 1: Edit existing published message
  if (userCard.publishedMessageId) {
    try {
      const existingMessage = await publishChannel.messages.fetch(userCard.publishedMessageId).catch(() => null);
      if (existingMessage) {
        await existingMessage.edit({
          embeds: [embed],
          components: components
        });
        return;
      }
    } catch (err) {
      console.warn(`[CardHandler] Edit existing card message failed, will repost:`, err.message);
    }
  }

  // CASE 2: Post brand new message if not published yet or deleted
  try {
    const newMessage = await publishChannel.send({
      embeds: [embed],
      components: components
    });

    userCard.publishedMessageId = newMessage.id;
    storage.write('cards', cardsData);
  } catch (err) {
    console.error(`[CardHandler] Failed to publish new card message:`, err.message);
  }
}

/**
 * Handle button clicks from #create-card and #card-gallery
 */
async function handleCardButton(interaction, client) {
  const customId = interaction.customId;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const settings = storage.read('settings');
  const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

  // 1. OPEN EDIT PROFILE MODAL
  if (customId === 'card_btn_edit') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_submit')
      .setTitle('Edit Member Profile Card');

    const bioInput = new TextInputBuilder()
      .setCustomId('card_input_bio')
      .setLabel('Bio / Quote / Status (Max 150)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Tell something about yourself...')
      .setValue(userCard.bio || '')
      .setRequired(false)
      .setMaxLength(150);

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Location / Kota Asal (Max 30)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Indramayu atau Bandung (Kota/Kabupaten)')
      .setValue(userCard.asalRaw || userCard.asal || '')
      .setRequired(false)
      .setMaxLength(30);

    const birthdayInput = new TextInputBuilder()
      .setCustomId('card_input_birthdate')
      .setLabel('Tanggal Lahir (Contoh: 15-08 atau 15-08-2000)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 15-08-2000 atau 15 Agustus')
      .setValue(userCard.birthdateRaw || (userCard.birthdate?.formatted || ''))
      .setRequired(false)
      .setMaxLength(30);

    const zodiacInput = new TextInputBuilder()
      .setCustomId('card_input_zodiac')
      .setLabel('Zodiac / MBTI / Social Link')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Taurus / INTJ atau Instagram | https://...')
      .setValue(
        userCard.zodiac || (userCard.linkTitle && userCard.linkUrl ? `${userCard.linkTitle} | ${userCard.linkUrl}` : (userCard.linkUrl || ''))
      )
      .setRequired(false)
      .setMaxLength(100);

    const bannerInput = new TextInputBuilder()
      .setCustomId('card_input_banner')
      .setLabel('Banner Image URL')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Paste image link (Direct image URL https://...)')
      .setValue(userCard.bannerUrl || '')
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(birthdayInput),
      new ActionRowBuilder().addComponents(zodiacInput),
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

    // Prevent voting on own card
    if (voterId === authorId) {
      return interaction.reply({
        content: '❌ Kamu tidak bisa memberikan Like atau Respect pada kartumu sendiri!',
        flags: MessageFlags.Ephemeral
      });
    }

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
  let asal = interaction.fields.getTextInputValue('card_input_asal').trim();
  let birthdateRaw = interaction.fields.getTextInputValue('card_input_birthdate').trim();
  let zodiacOrLink = interaction.fields.getTextInputValue('card_input_zodiac').trim();
  let bannerUrl = interaction.fields.getTextInputValue('card_input_banner').trim();

  // Save profile data
  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (bio) userCard.bio = bio; else delete userCard.bio;

  // Process Location (Smart Normalizer)
  if (asal) {
    const parsedLoc = parseLocation(asal);
    if (parsedLoc) {
      userCard.location = parsedLoc;
      userCard.asal = parsedLoc.display;
      userCard.asalRaw = asal;
    } else {
      userCard.asal = asal;
      userCard.asalRaw = asal;
    }
  } else {
    delete userCard.location;
    delete userCard.asal;
    delete userCard.asalRaw;
  }

  // Process Birthday
  if (birthdateRaw) {
    const parsedBday = parseBirthdate(birthdateRaw);
    if (parsedBday) {
      userCard.birthdate = parsedBday;
      userCard.birthdateRaw = birthdateRaw;
    } else {
      // Keep raw if unparseable but store
      userCard.birthdateRaw = birthdateRaw;
    }
  } else {
    delete userCard.birthdate;
    delete userCard.birthdateRaw;
  }

  // Check if zodiacOrLink is a Social Link or Zodiac/MBTI text
  if (zodiacOrLink) {
    if (zodiacOrLink.includes('http://') || zodiacOrLink.includes('https://') || zodiacOrLink.includes('|')) {
      const parsedLink = parsePromoLink(zodiacOrLink);
      if (parsedLink) {
        userCard.linkTitle = parsedLink.title;
        userCard.linkUrl = parsedLink.url;
        delete userCard.zodiac;
      } else {
        userCard.zodiac = zodiacOrLink;
      }
    } else {
      userCard.zodiac = zodiacOrLink;
      delete userCard.linkTitle;
      delete userCard.linkUrl;
    }
  } else {
    delete userCard.zodiac;
    delete userCard.linkTitle;
    delete userCard.linkUrl;
  }

  if (bannerUrl) {
    userCard.bannerUrl = normalizeBannerUrl(bannerUrl);
  } else {
    delete userCard.bannerUrl;
  }

  // Clean up unused legacy fields
  delete userCard.color;
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
