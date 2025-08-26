import 'dotenv/config'
import { AgnosticBot, loadCommands } from './src/bot.js'
import { createTables } from './src/db.js'
import { startWebServer } from './src/web.js'

createTables()

const bot = new AgnosticBot({
    discordToken: process.env.DISCORD_TOKEN?.trim(),
    telegramToken: process.env.TELEGRAM_TOKEN?.trim(),
    allowedTelegramGroups: process.env.TELEGRAM_GROUP_IDS?.split(',') || []
})

async function start() {
    for (const command of await loadCommands()) {
        bot.registerCommand(command.data.name, command.execute)
    }

    bot.start()

    startWebServer()

    console.log('Ready')
}

start()