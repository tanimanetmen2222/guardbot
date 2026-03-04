import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { getLogChannel } from '../utils/channelManager';
import { sendLog, saveLogToDatabase } from '../utils/logger';
import { buildMemberCard } from '../utils/memberCard';

export default {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    try {
      if (!member.guild || !member.user) return;

      const channel = await getLogChannel(member.guild, 'cikis-log');
      if (!channel) return;

      const card = await buildMemberCard(member as GuildMember, 'goodbye');

      await sendLog(
        channel,
        '👋 Uye Ayrildi',
        `${member.user.tag} sunucudan ayrildi.`,
        0xef4444,
        [
          { name: 'Kullanici', value: `${member.user} (${member.user.id})`, inline: true },
          { name: 'Kalan Uye', value: `${member.guild.memberCount}`, inline: true },
        ],
        card
      );

      saveLogToDatabase(
        'cikis-log',
        member.user.id,
        member.user.tag,
        'GuildMemberRemove',
        JSON.stringify({ memberCount: member.guild.memberCount })
      );
    } catch (error) {
      console.error('GuildMemberRemove hatasi:', error);
    }
  },
};