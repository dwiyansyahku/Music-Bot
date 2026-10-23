const storage = require('../utils/storage');
const { publishCardToChannel } = require('../utils/cardHandler');

const userDebounce = new Map();

module.exports = {
  name: 'userUpdate',
  async execute(oldUser, newUser, client) {
    if (!newUser || newUser.bot) return;

    const avatarChanged = oldUser.avatar !== newUser.avatar;
    const usernameChanged = oldUser.username !== newUser.username;
    const globalNameChanged = oldUser.globalName !== newUser.globalName;

    if (!avatarChanged && !usernameChanged && !globalNameChanged) {
      return;
    }

    const userId = newUser.id;
    if (userDebounce.has(userId)) {
      clearTimeout(userDebounce.get(userId));
    }

    const timer = setTimeout(async () => {
      userDebounce.delete(userId);
      try {
        const cardsData = storage.read('cards');
        for (const guild of client.guilds.cache.values()) {
          const userCard = cardsData[guild.id]?.[userId];
          if (userCard && userCard.publishedMessageId) {
            const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
            if (member) {
              await publishCardToChannel(guild, member, client, true).catch(() => {});
              console.log(`🎨 [Card Auto-Sync] Kartu member ${newUser.tag} di ${guild.name} otomatis diperbarui (Avatar/User global Discord diupdate).`);
            }
          }
        }
      } catch (err) {
        console.warn(`[userUpdate] Gagal auto-update kartu ${userId}:`, err.message);
      }
    }, 2000);

    userDebounce.set(userId, timer);
  }
};
