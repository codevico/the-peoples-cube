import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { AgnosticBot } from './src/bot.js'
import { createTables } from './src/db.js'
import { startWebServer } from './src/web.js'

createTables()

const bot = new AgnosticBot({
    discordToken: process.env.DISCORD_TOKEN?.trim(),
    telegramToken: process.env.TELEGRAM_TOKEN?.trim(),
    allowedTelegramGroups: process.env.TELEGRAM_GROUP_IDS?.split(',') || []
})

const categoriesRoot = path.join(import.meta.dirname, 'commands')
const categoriesDirs = fs.readdirSync(categoriesRoot)

const commands = []
for (const dir of categoriesDirs) {
    const commandsDir = path.join(categoriesRoot, dir)
    const commandsFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'))
    for (const file of commandsFiles) {
        const filePath = path.join(commandsDir, file)
        console.log('Importing command', filePath)
        const command = await import(`file://${filePath}`)
        if ('data' in command && 'execute' in command) {
            bot.registerCommand(command.data.name, command.execute)
            commands.push(command.data.toJSON())
        } else {
            console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`)
        }
    }
}
//bot.registerCommandsOnDiscord(process.env.DISCORD_CLIENT_ID, commands)

bot.start()

startWebServer()

console.log('Ready')