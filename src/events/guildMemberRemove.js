const storage = require('../utils/storage');
const { GALLERY_CHANNEL_ID } = require('../utils/cardHandler');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const guild = member.guild;
    const guildId = guild.id;
    const userId = member.id;

    try {
      const cardsData = storage.read('cards');
      const guildCards = cardsData[guildId];
      if (!guildCards || !guildCards[userId]) return;

      const userCard = guildCards[userId];
      const publishedMsgId = userCard.publishedMessageId;

      // 1. Hapus pesan kartu profil di #card-gallery jika ada
      if (publishedMsgId) {
        const settings = storage.read('settings');
        const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

        const galleryChannel = guild.channels.cache.get(targetChannelId)
          || await client.channels.fetch(targetChannelId).catch(() => null);

        if (galleryChannel) {
          const msg = await galleryChannel.messages.fetch(publishedMsgId).catch(() => null);
          if (msg) {
            await msg.delete().catch(err => {
              console.warn(`[Card Gallery] Gagal hapus pesan kartu saat member keluar:`, err.message);
            });
            console.log(`🗑️ [Card Gallery] Pesan kartu profil milik ${member.user?.tag || userId} berhasil dihapus dari #${galleryChannel.name} (Member keluar dari server).`);
          }
        }
      }

      // 2. Hapus data card dari database agar tidak meninggalkan ghost data
      delete guildCards[userId];
      storage.write('cards', cardsData);

      console.log(`👋 [Member Card] Data kartu profil ${member.user?.tag || userId} dibersihkan dari server ${guild.name}.`);
    } catch (err) {
      console.error(`[guildMemberRemove] Error membersihkan kartu member ${userId}:`, err.message);
    }
  }
};
