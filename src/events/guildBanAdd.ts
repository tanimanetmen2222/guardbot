import { Events, GuildBan } from 'discord.js';
import { getLogChannel } from '../utils/channelManager';
import { sendLog, saveLogToDatabase } from '../utils/logger';

export default {
  name: Events.GuildBanAdd,
  async execute(ban: GuildBan) {
    try {
      const channel = await getLogChannel(ban.guild, 'ban-log');
      if (!channel) return;

      await sendLog(
        channel,
        '🔨 Kullanici Yasaklandi',
        `${ban.user.tag} sunucudan yasaklandi.`,
        0xdc2626,
        [
          { name: 'Kullanici', value: `${ban.user} (${ban.user.id})`, inline: true },
          { name: 'Sebep', value: ban.reason || 'Sebep belirtilmedi', inline: false },
        ]
      );

      saveLogToDatabase(
        'ban-log',
        ban.user.id,
        ban.user.tag,
        'GuildBanAdd',
        JSON.stringify({ reason: ban.reason || null })
      );
    } catch (error) {
      console.error('GuildBanAdd hatasi:', error);
    }
  },
};