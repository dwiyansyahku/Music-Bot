const { handleInviteDelete } = require('../utils/inviteTracker');

module.exports = {
  name: 'inviteDelete',
  async execute(invite, client) {
    try {
      handleInviteDelete(invite, client);
    } catch (err) {
      console.warn('[inviteDelete Error]:', err.message);
    }
  }
};
