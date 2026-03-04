"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const channelManager_1 = require("../utils/channelManager");
const logger_1 = require("../utils/logger");
exports.default = {
    name: discord_js_1.Events.MessageDelete,
    async execute(message) {
        try {
            if (!message.guild)
                return;
            if (message.partial) {
                try {
                    await message.fetch();
                }
                catch { }
            }
            if (message.author?.bot)
                return;
            if (!(message.channel instanceof discord_js_1.TextChannel))
                return;
            const channel = await (0, channelManager_1.getLogChannel)(message.guild, 'message-log');
            if (!channel)
                return;
            await (0, logger_1.sendLog)(channel, '🗑️ Mesaj Silindi', 'Bir mesaj silindi.', 0xf59e0b, [
                {
                    name: 'Kullanici',
                    value: message.author ? `${message.author} (${message.author.id})` : 'Bilinmiyor',
                    inline: true,
                },
                { name: 'Kanal', value: `${message.channel}`, inline: true },
                {
                    name: 'Mesaj',
                    value: message.content && message.content.trim().length > 0
                        ? message.content.slice(0, 1000)
                        : '*Icerik yok veya cache disi mesaj*',
                    inline: false,
                },
            ]);
            (0, logger_1.saveLogToDatabase)('message-log', message.author?.id || null, message.author?.tag || null, 'MessageDelete', JSON.stringify({
                channelId: message.channel.id,
                channelName: 'name' in message.channel ? message.channel.name : null,
                content: message.content?.slice(0, 500) || '',
            }));
        }
        catch (error) {
            console.error('MessageDelete hatasi:', error);
        }
    },
};
