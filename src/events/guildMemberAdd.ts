import { Events, GuildMember } from 'discord.js';
import { getLogChannel } from '../utils/channelManager';
import { sendLog, saveLogToDatabase } from '../utils/logger';
import { buildMemberCard } from '../utils/memberCard';

export default {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    try {
      const channel = await getLogChannel(member.guild, 'giris-log');
      if (!channel) return;

      const card = await buildMemberCard(member, 'welcome');

      await sendLog(
        channel,
        '👋 Uye Katildi',
        `${member.user.tag} sunucuya katildi.`,
        0x22c55e,
        [
          { name: 'Kullanici', value: `${member.user} (${member.user.id})`, inline: true },
          {
            name: 'Hesap Acilis',
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          { name: 'Toplam Uye', value: `${member.guild.memberCount}`, inline: true },
        ],
        card
      );

      saveLogToDatabase(
        'giris-log',
        member.user.id,
        member.user.tag,
        'GuildMemberAdd',
        JSON.stringify({ memberCount: member.guild.memberCount })
      );
    } catch (error) {
      console.error('GuildMemberAdd hatasi:', error);
    }
  },
};