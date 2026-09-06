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
 * Validasi tautan gambar banner:
 * Mendukung link attachment Discord, direct image URL (.png, .jpg, .gif, .webp), dan image host populer.
 */
function isValidBannerUrl(url) {
  if (!url || !url.trim()) return { isValid: true, isEmpty: true };
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;

  const isDiscordCdn = clean.includes('cdn.discordapp.com') ||
                       clean.includes('media.discordapp.net') ||
                       clean.includes('discord.com/channels');

  const cleanWithoutQuery = clean.split('?')[0].toLowerCase();
  const hasImageExt = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(cleanWithoutQuery);

  const isKnownHost = clean.includes('imgur.com') ||
                      clean.includes('catbox.moe') ||
                      clean.includes('pinimg.com') ||
                      clean.includes('tenor.com') ||
                      clean.includes('giphy.com');

  if (isDiscordCdn || hasImageExt || isKnownHost) {
    return { isValid: true, url: normalizeBannerUrl(clean) };
  }

  return { isValid: false, url: clean };
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
    else if (lower.includes('twitter.com') || lower.includes('x.com')) title = 'X / Twitter';
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

/**
 * Parse gabungan MBTI dan Social Link
 * Contoh input:
 * - "ENTJ | https://instagram.com/username" -> mbti: "ENTJ", link: { title: "Instagram", url: "https://..." }
 * - "INFP" -> mbti: "INFP", link: null
 * - "https://instagram.com/username" -> mbti: null, link: { title: "Instagram", url: "https://..." }
 */
function parseMbtiAndSocial(input) {
  if (!input || !input.trim()) return { mbti: null, link: null };

  let raw = input.trim();
  let mbti = null;
  let link = null;

  // Cari apakah ada URL di dalam input
  const urlMatch = raw.match(/(https?:\/\/[^\s|]+)/i) || raw.match(/(www\.[^\s|]+)/i);

  if (urlMatch) {
    let extractedUrl = urlMatch[1].trim();
    if (!/^https?:\/\//i.test(extractedUrl)) extractedUrl = `https://${extractedUrl}`;

    try {
      new URL(extractedUrl);

      // Ambil teks sisa selain URL
      let remainingText = raw.replace(urlMatch[0], '').replace(/\|/g, ' ').trim();
      const tokens = remainingText.split(/[\s/\\,]+/).filter(Boolean);
      const mbtiRegex = /^(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)$/i;

      let customTitle = '';
      for (const token of tokens) {
        if (mbtiRegex.test(token)) {
          mbti = token.toUpperCase();
        } else if (!customTitle && token.length > 1 && !/^(https?|link|sosmed|social)$/i.test(token)) {
          customTitle = token;
        }
      }

      link = parsePromoLink(customTitle ? `${customTitle} | ${extractedUrl}` : extractedUrl);
    } catch (_) {
      // URL tidak valid, abaikan link
    }
  }

  if (!link) {
    const mbtiMatch = raw.match(/\b(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)\b/i);
    if (mbtiMatch) {
      mbti = mbtiMatch[1].toUpperCase();
    } else if (raw.length <= 25 && !raw.includes('/')) {
      mbti = raw.trim();
    }
  }

  return { mbti, link };
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
    .setColor(0x2B2D31)
    .setAuthor({
      name: `MEMBER IDENTITY — ${guild.name.toUpperCase()}`,
      iconURL: guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle('Member Profile Card')
    .setDescription(
      `Buat dan kelola kartu profil identitas digitalmu di server **${guild.name}**.\n\n` +
      `◈ **Petunjuk Pembuatan:**\n` +
      `1. Klik tombol **Buat / Edit Profil** untuk mengisi Bio, Asal Kota, Tanggal Lahir, MBTI / Sosmed, dan Foto Banner.\n` +
      `2. **Zodiak Otomatis:** Zodiakmu akan otomatis terhitung dan ditampilkan dari tanggal lahir.\n` +
      `3. Kartumu akan otomatis diterbitkan dan diperbarui di <#${targetChannelId}>.\n` +
      `4. **Live Voice & Companions:** Menampilkan durasi ngobrol dan teman terdekatmu secara otomatis.\n` +
      `5. **Perayaan Ultah:** Dapatkan ucapan selamat otomatis saat hari ulang tahunmu tiba.\n` +
      `6. Klik **Lihat Kartuku** untuk pratinjau kartu secara privat, atau **Reset Data** untuk menghapus data.`
    )
    .setFooter({ text: 'Kartu profil diperbarui secara realtime dari database' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('card_btn_edit')
      .setLabel('Buat / Edit Profil')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('card_btn_view_self')
      .setLabel('Lihat Kartuku')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('card_btn_reset')
      .setLabel('Reset Data')
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
 * Includes: Live VC status, Birthday, Zodiac (auto-calculated), MBTI, Social Link, and Banner
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

  // Ambil Gelar Utama (Equipped Title) dari sistem Gacha
  const gachaData = storage.read('gacha_data');
  const userGacha = gachaData[guild.id]?.[targetUser.id] || {};
  const equippedTitleText = userGacha.equippedTitle ? ` • ✧ \`${userGacha.equippedTitle}\`` : '';

  let description = `\`@${targetUser.username}\`${equippedTitleText}`;
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

  // Row 2: Voice Time | Location | Zodiac / MBTI (3 Balanced Inline Columns)
  const voiceStats = getVoiceStats(guild.id, targetUser.id, guild);
  embed.addFields({ name: 'Voice Time', value: voiceStats.formattedTime, inline: true });

  // Location display (Smart normalized)
  const locDisplay = userCard.location?.display || userCard.asal || '-';
  embed.addFields({ name: 'Location', value: locDisplay, inline: true });

  // Zodiac / MBTI (Zodiak dihitung otomatis dari tanggal lahir yang tersimpan di sistem)
  let zodiacSymbolAndName = null;
  if (userCard.birthdate && userCard.birthdate.day && userCard.birthdate.month) {
    const zodiacObj = getZodiac(userCard.birthdate.day, userCard.birthdate.month);
    if (zodiacObj) zodiacSymbolAndName = zodiacObj.label;
  }
  const mbtiText = userCard.mbti ? userCard.mbti.toUpperCase() : null;

  let zodiacMbtiDisplay = '-';
  if (zodiacSymbolAndName && mbtiText) {
    zodiacMbtiDisplay = `${zodiacSymbolAndName} • ${mbtiText}`;
  } else if (zodiacSymbolAndName) {
    zodiacMbtiDisplay = zodiacSymbolAndName;
  } else if (mbtiText) {
    zodiacMbtiDisplay = mbtiText;
  }

  embed.addFields({ name: 'Zodiac / MBTI', value: zodiacMbtiDisplay, inline: true });

  // Row 3: Social Link (Elegan & rapi)
  if (userCard.linkUrl && /^https?:\/\/[^\s]+$/i.test(userCard.linkUrl)) {
    const linkTitle = userCard.linkTitle || 'Visit Link';
    embed.addFields({
      name: 'Social Link',
      value: `[${linkTitle} ↗](${userCard.linkUrl})`,
      inline: Boolean(zodiacMbtiDisplay)
    });
  }

  // Row 4: Top Voice Companions (Full Width, Vertical List)
  if (voiceStats.topCompanions && voiceStats.topCompanions.length > 0) {
    const compText = voiceStats.topCompanions
      .map((c, i) => `${i + 1}. **${c.name}** — ${c.timeFormatted}`)
      .join('\n');
    embed.addFields({ name: 'Top Voice Companions', value: compText, inline: false });
  }

  // Row 5: Badges & Recognition (Clean Minimalist Design)
  try {
    const { getUserAchievements } = require('./achievementHelper');
    const achData = getUserAchievements(guild.id, member.id, member);
    if (achData.unlocked.length > 0) {
      const badgeList = achData.unlocked.map(a => `\`${a.tag} ${a.name}\``).join('  ');
      embed.addFields({
        name: `Titles & Badges (${achData.unlocked.length})`,
        value: badgeList,
        inline: false
      });
    }
  } catch (_) {}

  // Banner image: Direct Image URL via Discord native proxy
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

  let publishedMsgId = userCard.publishedMessageId;

  // CASE 1: Edit existing published message
  if (userCard.publishedMessageId) {
    try {
      const existingMessage = await publishChannel.messages.fetch(userCard.publishedMessageId).catch(() => null);
      if (existingMessage) {
        await existingMessage.edit({
          embeds: [embed],
          components: components
        });
        const jumpUrl = `https://discord.com/channels/${guildId}/${targetChannelId}/${userCard.publishedMessageId}`;
        return { messageId: userCard.publishedMessageId, jumpUrl };
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
    const jumpUrl = `https://discord.com/channels/${guildId}/${targetChannelId}/${newMessage.id}`;
    return { messageId: newMessage.id, jumpUrl };
  } catch (err) {
    console.error(`[CardHandler] Failed to publish new card message:`, err.message);
    return null;
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
      .setLabel('Bio / Quote / Status (Maks 150)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Tuliskan sesuatu tentang dirimu...')
      .setValue((userCard.bio || '').slice(0, 150))
      .setRequired(false)
      .setMaxLength(150);

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Location / Kota Asal (Maks 30)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Indramayu, Bandung, Jakarta')
      .setValue((userCard.asalRaw || userCard.asal || '').slice(0, 30))
      .setRequired(false)
      .setMaxLength(30);

    const birthdayInput = new TextInputBuilder()
      .setCustomId('card_input_birthdate')
      .setLabel('Tanggal Lahir (Zodiak Otomatis)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: 16-10-2002 atau 16 Oktober')
      .setValue((userCard.birthdateRaw || (userCard.birthdate?.formatted || '')).slice(0, 30))
      .setRequired(false)
      .setMaxLength(30);

    // Pre-fill MBTI & Social Link
    let mbtiSocialPrefill = '';
    if (userCard.mbti && userCard.linkUrl) {
      mbtiSocialPrefill = `${userCard.mbti} | ${userCard.linkUrl}`;
    } else if (userCard.mbti) {
      mbtiSocialPrefill = userCard.mbti;
    } else if (userCard.linkUrl) {
      mbtiSocialPrefill = userCard.linkTitle && userCard.linkTitle !== 'Visit Link'
        ? `${userCard.linkTitle} | ${userCard.linkUrl}`
        : userCard.linkUrl;
    }

    const mbtiSocialInput = new TextInputBuilder()
      .setCustomId('card_input_mbti_social')
      .setLabel('MBTI / Social Link (Maks 100)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: ENTJ | https://instagram.com/username')
      .setValue(mbtiSocialPrefill.slice(0, 100))
      .setRequired(false)
      .setMaxLength(100);

    const bannerInput = new TextInputBuilder()
      .setCustomId('card_input_banner')
      .setLabel('Banner Image URL')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Link gambar banner (Direct image URL https://...)')
      .setValue((userCard.bannerUrl || '').slice(0, 250))
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(birthdayInput),
      new ActionRowBuilder().addComponents(mbtiSocialInput),
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
  
  let mbtiSocialRaw = '';
  try {
    mbtiSocialRaw = (
      interaction.fields.getTextInputValue('card_input_mbti_social') ||
      interaction.fields.getTextInputValue('card_input_zodiac') || ''
    ).trim();
  } catch (_) {}

  let bannerUrl = interaction.fields.getTextInputValue('card_input_banner').trim();

  // Save profile data
  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (bio) userCard.bio = bio; else delete userCard.bio;

  // 1. Process Location (Smart Normalizer)
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

  // 2. Process Birthday & Automatic Zodiac Calculation
  if (birthdateRaw) {
    const parsedBday = parseBirthdate(birthdateRaw);
    if (parsedBday) {
      userCard.birthdate = parsedBday;
      userCard.birthdateRaw = birthdateRaw;
      const zodiacObj = getZodiac(parsedBday.day, parsedBday.month);
      userCard.zodiac = zodiacObj ? zodiacObj.label : undefined;
    } else {
      userCard.birthdateRaw = birthdateRaw;
      delete userCard.zodiac;
    }
  } else {
    delete userCard.birthdate;
    delete userCard.birthdateRaw;
    delete userCard.zodiac;
  }

  // 3. Process MBTI & Social Link
  const parsedMbtiSocial = parseMbtiAndSocial(mbtiSocialRaw);
  if (parsedMbtiSocial.mbti) {
    userCard.mbti = parsedMbtiSocial.mbti;
  } else {
    delete userCard.mbti;
  }

  if (parsedMbtiSocial.link && parsedMbtiSocial.link.url) {
    userCard.linkTitle = parsedMbtiSocial.link.title;
    userCard.linkUrl = parsedMbtiSocial.link.url;
  } else {
    delete userCard.linkTitle;
    delete userCard.linkUrl;
  }

  // 4. Process Banner Image
  let bannerWarning = '';
  if (bannerUrl) {
    const bannerCheck = isValidBannerUrl(bannerUrl);
    if (bannerCheck.isValid && bannerCheck.url) {
      userCard.bannerUrl = bannerCheck.url;
    } else {
      delete userCard.bannerUrl;
      bannerWarning = '\n\n⚠️ **Catatan Banner:** Tautan banner yang kamu masukkan tidak valid (bukan link gambar langsung / salinan link Discord). Banner belum dipasang, tetapi bagian profil lainnya tetap berhasil disimpan!';
    }
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
    const { updateMemberMapPanel } = require('./memberMapHelper');
    updateMemberMapPanel(interaction.guild, client).catch(() => {});
  } catch (_) {}

  try {
    const result = await publishCardToChannel(interaction.guild, interaction.member, client);
    const jumpUrl = result?.jumpUrl || (userCard.publishedMessageId ? `https://discord.com/channels/${guildId}/${targetChannelId}/${userCard.publishedMessageId}` : null);

    if (jumpUrl) {
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Lihat Kartu Profil ↗')
          .setStyle(ButtonStyle.Link)
          .setURL(jumpUrl)
      );

      await interaction.editReply({
        content: `✅ **Profil berhasil disimpan & diperbarui di <#${targetChannelId}>!**${bannerWarning}\nKlik tombol di bawah untuk langsung menuju ke kartumu:`,
        components: [row]
      }).catch(() => {});
    } else {
      await interaction.editReply({
        content: `✅ **Profil berhasil disimpan & dipublikasikan di <#${targetChannelId}>!**${bannerWarning}`
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[CardHandler] Publish failed:', err.message);
    await interaction.editReply({
      content: `**Profile saved!** Card published to <#${targetChannelId}>.${bannerWarning}`
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
