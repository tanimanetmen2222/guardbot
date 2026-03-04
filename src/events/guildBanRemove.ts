import { Events, GuildBan } from 'discord.js';
import { getLogChannel } from '../utils/channelManager';
import { sendLog, saveLogToDatabase } from '../utils/logger';

export default {
  name: Events.GuildBanRemove,
  async execute(ban: GuildBan) {
    try {
      const channel = await getLogChannel(ban.guild, 'ban-log');
      if (!channel) return;

      await sendLog(
        channel,
        '✅ Yasak Kaldirildi',
        `${ban.user.tag} kullanicisinin yasagi kaldirildi.`,
        0x22c55e,
        [{ name: 'Kullanici', value: `${ban.user} (${ban.user.id})`, inline: true }]
      );

      saveLogToDatabase(
        'ban-log',
        ban.user.id,
        ban.user.tag,
        'GuildBanRemove',
        null
      );
    } catch (error) {
      console.error('GuildBanRemove hatasi:', error);
    }
  },
};