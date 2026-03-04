"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const channelManager_1 = require("../utils/channelManager");
const logger_1 = require("../utils/logger");
exports.default = {
    name: discord_js_1.Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        try {
            if (!newMember.user || !oldMember.roles)
                return;
            const oldRoles = oldMember.roles.cache;
            const newRoles = newMember.roles.cache;
            if (oldRoles.size !== newRoles.size) {
                const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
                const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));
                if (addedRoles.size > 0 || removedRoles.size > 0) {
                    const channel = await (0, channelManager_1.getLogChannel)(newMember.guild, 'rol-log');
                    if (channel) {
                        const fields = [
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
                        await (0, logger_1.sendLog)(channel, '🎭 Rol Degisikligi', 'Bir kullanicinin rolleri degisti.', 0x8b5cf6, fields);
                    }
                    (0, logger_1.saveLogToDatabase)('rol-log', newMember.user.id, newMember.user.tag, 'GuildMemberUpdate', JSON.stringify({
                        added: Array.from(addedRoles.keys()),
                        removed: Array.from(removedRoles.keys()),
                    }));
                }
            }
            const securityChannel = await (0, channelManager_1.getLogChannel)(newMember.guild, 'security-log');
            if (securityChannel &&
                oldMember.displayName &&
                newMember.displayName &&
                oldMember.displayName !== newMember.displayName) {
                await (0, logger_1.sendLog)(securityChannel, '🔒 Isim Degisikligi', 'Bir kullanicinin ismi degisti.', 0xf97316, [
                    { name: 'Kullanici', value: `${newMember.user} (${newMember.user.id})`, inline: true },
                    { name: 'Eski Isim', value: oldMember.displayName, inline: true },
                    { name: 'Yeni Isim', value: newMember.displayName, inline: true },
                ]);
            }
        }
        catch (error) {
            console.error('GuildMemberUpdate hatasi:', error);
        }
    },
};
