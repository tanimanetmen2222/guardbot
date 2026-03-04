"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const channelManager_1 = require("../utils/channelManager");
const logger_1 = require("../utils/logger");
exports.default = {
    name: discord_js_1.Events.GuildBanAdd,
    async execute(ban) {
        try {
            const channel = await (0, channelManager_1.getLogChannel)(ban.guild, 'ban-log');
            if (!channel)
                return;
            await (0, logger_1.sendLog)(channel, '🔨 Kullanici Yasaklandi', `${ban.user.tag} sunucudan yasaklandi.`, 0xdc2626, [
                { name: 'Kullanici', value: `${ban.user} (${ban.user.id})`, inline: true },
                { name: 'Sebep', value: ban.reason || 'Sebep belirtilmedi', inline: false },
            ]);
            (0, logger_1.saveLogToDatabase)('ban-log', ban.user.id, ban.user.tag, 'GuildBanAdd', JSON.stringify({ reason: ban.reason || null }));
        }
        catch (error) {
            console.error('GuildBanAdd hatasi:', error);
        }
    },
};
