import { Events, VoiceState } from 'discord.js';
import { getLogChannel } from '../utils/channelManager';
import { sendLog, saveLogToDatabase } from '../utils/logger';

export default {
  name: Events.VoiceStateUpdate,
  async execute(oldState: VoiceState, newState: VoiceState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const channel = await getLogChannel(member.guild, 'voice-log');
      if (!channel) return;

      if (!oldState.channelId && newState.channelId) {
        await sendLog(
          channel,
          '🎧 Sese Giris',
          `${member.user.tag} ses kanalina girdi.`,
          0x22c55e,
          [{ name: 'Kanal', value: `${newState.channel}`, inline: true }]
        );

        saveLogToDatabase(
          'voice-log',
          member.user.id,
          member.user.tag,
          'VoiceJoin',
          JSON.stringify({ channelId: newState.channelId })
        );
        return;
      }

      if (oldState.channelId && !newState.channelId) {
        await sendLog(
          channel,
          '🎧 Sesten Cikis',
          `${member.user.tag} ses kanalindan cikti.`,
          0xef4444,
          [{ name: 'Kanal', value: `${oldState.channel}`, inline: true }]
        );

        saveLogToDatabase(
          'voice-log',
          member.user.id,
          member.user.tag,
          'VoiceLeave',
          JSON.stringify({ channelId: oldState.channelId })
        );
        return;
      }

      if (
        oldState.channelId &&
        newState.channelId &&
        oldState.channelId !== newState.channelId
      ) {
        await sendLog(
          channel,
          '🔁 Ses Kanal Degisimi',
          `${member.user.tag} ses kanali degistirdi.`,
          0x3b82f6,
          [
            { name: 'Eski Kanal', value: `${oldState.channel}`, inline: true },
            { name: 'Yeni Kanal', value: `${newState.channel}`, inline: true },
          ]
        );

        saveLogToDatabase(
          'voice-log',
          member.user.id,
          member.user.tag,
          'VoiceMove',
          JSON.stringify({
            oldChannelId: oldState.channelId,
            newChannelId: newState.channelId,
          })
        );
      }
    } catch (error) {
      console.error('VoiceStateUpdate hatasi:', error);
    }
  },
};