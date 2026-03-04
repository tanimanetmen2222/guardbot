"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const channelManager_1 = require("../utils/channelManager");
const logger_1 = require("../utils/logger");
exports.default = {
    name: discord_js_1.Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        try {
            const member = newState.member || oldState.member;
            if (!member || member.user.bot)
                return;
            const channel = await (0, channelManager_1.getLogChannel)(member.guild, 'voice-log');
            if (!channel)
                return;
            if (!oldState.channelId && newState.channelId) {
                await (0, logger_1.sendLog)(channel, '🎧 Sese Giris', `${member.user.tag} ses kanalina girdi.`, 0x22c55e, [{ name: 'Kanal', value: `${newState.channel}`, inline: true }]);
                (0, logger_1.saveLogToDatabase)('voice-log', member.user.id, member.user.tag, 'VoiceJoin', JSON.stringify({ channelId: newState.channelId }));
                return;
            }
            if (oldState.channelId && !newState.channelId) {
                await (0, logger_1.sendLog)(channel, '🎧 Sesten Cikis', `${member.user.tag} ses kanalindan cikti.`, 0xef4444, [{ name: 'Kanal', value: `${oldState.channel}`, inline: true }]);
                (0, logger_1.saveLogToDatabase)('voice-log', member.user.id, member.user.tag, 'VoiceLeave', JSON.stringify({ channelId: oldState.channelId }));
                return;
            }
            if (oldState.channelId &&
                newState.channelId &&
                oldState.channelId !== newState.channelId) {
                await (0, logger_1.sendLog)(channel, '🔁 Ses Kanal Degisimi', `${member.user.tag} ses kanali degistirdi.`, 0x3b82f6, [
                    { name: 'Eski Kanal', value: `${oldState.channel}`, inline: true },
                    { name: 'Yeni Kanal', value: `${newState.channel}`, inline: true },
                ]);
                (0, logger_1.saveLogToDatabase)('voice-log', member.user.id, member.user.tag, 'VoiceMove', JSON.stringify({
                    oldChannelId: oldState.channelId,
                    newChannelId: newState.channelId,
                }));
            }
        }
        catch (error) {
            console.error('VoiceStateUpdate hatasi:', error);
        }
    },
};
