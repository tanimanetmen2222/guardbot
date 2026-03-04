import { client } from './botClient';
import { config } from './config/config';
import * as fs from 'fs';
import * as path from 'path';
import './database/database';
//import './api/server';
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath).default;

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(config.token);
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);