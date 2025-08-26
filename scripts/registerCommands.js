import 'dotenv/config'
import { loadCommands, registerCommandsOnDiscord } from '../src/bot.js'

(async() => {
    const commands = []
    for (const command of await loadCommands()) {
        commands.push(command.data.toJSON())
    }
    console.log('Sending commands to discord...')
    registerCommandsOnDiscord(process.env.DISCORD_CLIENT_ID, commands)
    console.log('Done')
})()
