"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const channelManager_1 = require("../utils/channelManager");
const logger_1 = require("../utils/logger");
const memberCard_1 = require("../utils/memberCard");
exports.default = {
    name: discord_js_1.Events.GuildMemberAdd,
    async execute(member) {
        try {
            const channel = await (0, channelManager_1.getLogChannel)(member.guild, 'giris-log');
            if (!channel)
                return;
            const card = await (0, memberCard_1.buildMemberCard)(member, 'welcome');
            await (0, logger_1.sendLog)(channel, '👋 Uye Katildi', `${member.user.tag} sunucuya katildi.`, 0x22c55e, [
                { name: 'Kullanici', value: `${member.user} (${member.user.id})`, inline: true },
                {
                    name: 'Hesap Acilis',
                    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                    inline: true,
                },
                { name: 'Toplam Uye', value: `${member.guild.memberCount}`, inline: true },
            ], card);
            (0, logger_1.saveLogToDatabase)('giris-log', member.user.id, member.user.tag, 'GuildMemberAdd', JSON.stringify({ memberCount: member.guild.memberCount }));
        }
        catch (error) {
            console.error('GuildMemberAdd hatasi:', error);
        }
    },
};
