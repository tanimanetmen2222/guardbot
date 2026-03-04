import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { getLogChannel } from '../utils/channelManager';
import { sendLog, saveLogToDatabase } from '../utils/logger';

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) {
    try {
      if (!newMember.user || !oldMember.roles) return;

      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      if (oldRoles.size !== newRoles.size) {
        const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
        const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));

        if (addedRoles.size > 0 || removedRoles.size > 0) {
          const channel = await getLogChannel(newMember.guild, 'rol-log');
          if (channel) {
            const fields: Array<{ name: string; value: string; inline?: boolean }> = [
              { name: 'Kullanici', value: `${newMember.user} (${newMember.user.id})`, inline: true },
            ];

            if (addedRoles.size > 0) {
              fields.push({
                name: '✅ Eklenen Roller',
                value: addedRoles.map((r) => r.name).join(', '),
                inline: false,
              });
            }

            if (removedRoles.size > 0) {
              fields.push({
                name: '❌ Kaldirilan Roller',
                value: removedRoles.map((r) => r.name).join(', '),
                inline: false,
              });
            }

            await sendLog(
              channel,
              '🎭 Rol Degisikligi',
              'Bir kullanicinin rolleri degisti.',
              0x8b5cf6,
              fields
            );
          }

          saveLogToDatabase(
            'rol-log',
            newMember.user.id,
            newMember.user.tag,
            'GuildMemberUpdate',
            JSON.stringify({
              added: Array.from(addedRoles.keys()),
              removed: Array.from(removedRoles.keys()),
            })
          );
        }
      }

      const securityChannel = await getLogChannel(newMember.guild, 'security-log');

      if (
        securityChannel &&
        oldMember.displayName &&
        newMember.displayName &&
        oldMember.displayName !== newMember.displayName
      ) {
        await sendLog(
          securityChannel,
          '🔒 Isim Degisikligi',
          'Bir kullanicinin ismi degisti.',
          0xf97316,
          [
            { name: 'Kullanici', value: `${newMember.user} (${newMember.user.id})`, inline: true },
            { name: 'Eski Isim', value: oldMember.displayName, inline: true },
            { name: 'Yeni Isim', value: newMember.displayName, inline: true },
          ]
        );
      }
    } catch (error) {
      console.error('GuildMemberUpdate hatasi:', error);
    }
  },
};