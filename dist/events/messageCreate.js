"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const channelManager_1 = require("../utils/channelManager");
const logger_1 = require("../utils/logger");
exports.default = {
    name: discord_js_1.Events.MessageCreate,
    async execute(message) {
        try {
            if (!message.guild)
                return;
            if (!message.author || message.author.bot)
                return;
            if (!(message.channel instanceof discord_js_1.TextChannel))
                return;
            const badWords = ['spam', 'test', 'küfür'];
            const content = message.content.toLowerCase();
            if (!badWords.some((word) => content.includes(word)))
                return;
            const channel = await (0, channelManager_1.getLogChannel)(message.guild, 'security-log');
            if (!channel)
                return;
            await (0, logger_1.sendLog)(channel, '⚠️ Supheli Mesaj', 'Supheli icerik tespit edildi.', 0xef4444, [
                { name: 'Kullanici', value: `${message.author} (${message.author.id})`, inline: true },
                { name: 'Kanal', value: `${message.channel}`, inline: true },
                { name: 'Mesaj', value: message.content.slice(0, 1000), inline: false },
                { name: 'Mesaj Linki', value: message.url, inline: false },
            ]);
            (0, logger_1.saveLogToDatabase)('security-log', message.author.id, message.author.tag, 'SuspiciousMessage', JSON.stringify({
                channelId: message.channel.id,
                channelName: message.channel.name,
                content: message.content.slice(0, 500),
                url: message.url,
            }));
        }
        catch (error) {
            console.error('MessageCreate hatasi:', error);
        }
    },
};
