"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSingleLogChannel = createSingleLogChannel;
exports.createLogChannels = createLogChannels;
exports.getLogChannel = getLogChannel;
const discord_js_1 = require("discord.js");
const database_1 = require("../database/database");
const LOG_CHANNELS = [
    'ticket-log',
    'giris-log',
    'voice-log',
    'ban-log',
    'security-log',
    'cikis-log',
    'rol-log',
    'message-log',
];
async function createSingleLogChannel(guild, channelName) {
    try {
        const existingChannel = guild.channels.cache.find((ch) => ch.name === channelName && ch.type === discord_js_1.ChannelType.GuildText);
        if (existingChannel) {
            database_1.db.run('INSERT OR REPLACE INTO log_channels (channel_id, channel_name) VALUES (?, ?)', [existingChannel.id, channelName]);
            return existingChannel;
        }
        const botMember = guild.members.me;
        if (!botMember)
            return null;
        const channel = await guild.channels.create({
            name: channelName,
            type: discord_js_1.ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [discord_js_1.PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: botMember.id,
                    allow: [
                        discord_js_1.PermissionsBitField.Flags.ViewChannel,
                        discord_js_1.PermissionsBitField.Flags.SendMessages,
                        discord_js_1.PermissionsBitField.Flags.EmbedLinks,
                        discord_js_1.PermissionsBitField.Flags.AttachFiles,
                        discord_js_1.PermissionsBitField.Flags.ReadMessageHistory,
                    ],
                },
            ],
            reason: 'Log kanali otomatik olusturuldu',
        });
        if (channel.type !== discord_js_1.ChannelType.GuildText)
            return null;
        database_1.db.run('INSERT OR REPLACE INTO log_channels (channel_id, channel_name) VALUES (?, ?)', [channel.id, channelName]);
        return channel;
    }
    catch (error) {
        console.error('createSingleLogChannel hatasi (' + channelName + '):', error);
        return null;
    }
}
async function createLogChannels(guild) {
    const createdChannels = new Map();
    for (const channelName of LOG_CHANNELS) {
        const channel = await createSingleLogChannel(guild, channelName);
        if (channel) {
            createdChannels.set(channelName, channel);
        }
    }
    return createdChannels;
}
async function getLogChannel(guild, channelName) {
    return new Promise((resolve) => {
        database_1.db.get('SELECT channel_id FROM log_channels WHERE channel_name = ?', [channelName], (err, row) => {
            if (err || !row) {
                const channel = guild.channels.cache.find((ch) => ch.name === channelName && ch.type === discord_js_1.ChannelType.GuildText);
                resolve(channel || null);
                return;
            }
            const channel = guild.channels.cache.get(row.channel_id);
            resolve(channel || null);
        });
    });
}
