"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logChannels = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
    apiPort: parseInt(process.env.API_PORT || '3000'),
    databasePath: process.env.DATABASE_PATH || './data/hoowers.db',
};
exports.logChannels = [
    'ticket-log',
    'giris-log',
    'voice-log',
    'ban-log',
    'security-log',
    'cikis-log',
    'rol-log',
    'message-log',
];
