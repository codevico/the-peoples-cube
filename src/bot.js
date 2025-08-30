import { Client, Collection, Events, GatewayIntentBits, Partials, PollLayoutType, REST, Routes } from 'discord.js'
import { Telegraf } from 'telegraf'
import { escapeMarkdownV2 } from './utils.js'
import { handleDiscordPoll, handleTelegramPoll } from './polls.js'
import path from 'path'
import fs from 'fs'

class AgnosticCommand {
    callback = null
    constructor(callback) {
        this.callback = callback
    }
    executeCallback = (context) => {
        this.callback({
            originalContext: context,
            reply: (message) => {
                return context.reply(message)
            },
            replyWithHTML: (message) => {
                if (context.replyWithHTML) {
                    return context.replyWithHTML(message)
                } else {
                    return context.reply(message)
                }
            },
            replyWithMarkdownV2: (message) => {
                if (context.replyWithMarkdownV2) {
                    return context.replyWithMarkdownV2(escapeMarkdownV2(message))
                } else {
                    return context.reply(message)
                }
            },
            replyWithPhoto: async({ urls }) => {
                if (context.replyWithPhoto) {
                    const result = context.replyWithPhoto({ url: urls[0] })
                    for (const additionalUrl of urls.splice(1)) {
                        context.replyWithPhoto({ url: additionalUrl })
                    }
                    return result
                } else {
                    const result = await context.reply(urls[0])
                    for (const additionalUrl of urls.splice(1)) {
                        await context.followUp(additionalUrl)
                    }
                    return result
                }
            },
            sendPoll: (chatId, question, answers, options) => {
                if (context.telegram) {
                    return context.telegram.sendPoll(chatId, question, answers.map(answer => answer.text), options)
                } else {
                    return context.channel.send({
                        poll: {
                            question: { text: question },
                            answers: answers,
                            allowMultiselect: false,
                            duration: 24,
                            layoutType: PollLayoutType.Default
                        }
                    })
                }
            },
            getArguments: (optionName='query') => {
                if (context.update) {
                    const parts = context.update.message?.text?.split(' ')
                    if (parts?.length > 1) return parts.splice(1).join(' ')
                } else if (context.options) {
                    return context.options.data?.[0]?.value || ''
                }
                return null
            }
        })
    }
}

export class AgnosticBot {
    discordToken = null
    discordBot = null
    telegramBot = null
    allowedTelegramGroups = []
    constructor({ discordToken, telegramToken, allowedTelegramGroups }) {
        if (discordToken) {
            this.discordToken = discordToken
            this.discordBot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessagePolls] })
            this.discordBot.commands = new Collection()
            this.discordBot.on(Events.InteractionCreate, async(interaction) => {
                if (!interaction.isChatInputCommand()) return
                const command = interaction.client.commands.get(interaction.commandName)
                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`)
                    return
                }
                try {
                    await command.execute(interaction)
                } catch (error) {
                    console.error(error)
                    const props = { content: `There was an error while executing this command!`, ephemeral: true }
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(props)
                    } else {
                        await interaction.reply(props)
                    }
                }
            })
            this.discordBot.on(Events.MessagePollVoteAdd, async(context) => {
                handleDiscordPoll(context, this.discordBot)
            })
        }
        if (telegramToken) {
            this.telegramBot = new Telegraf(telegramToken)
            this.allowedTelegramGroups = allowedTelegramGroups
            this.telegramBot.on('poll', (context) => {
                console.log('got a poll event')
                handleTelegramPoll(context)
            })
        }
    }
    start = () => {
        this.telegramBot?.launch()
        this.discordBot?.login(this.discordToken)
    }
    registerCommand = async(name, callback) => {
        const command = new AgnosticCommand(callback)
        if (this.telegramBot) {
            this.telegramBot.command(name, (context) => {
                if (this.allowedTelegramGroups.length > 0 && !this.allowedTelegramGroups.includes(String(context.chat.id))) {
                    console.warn(`Ignoring message coming from non-whitelisted chat ${context.chat.id}`)
                    return
                }
                try {
                    command.executeCallback(context)
                } catch (error) {
                    console.error(`error while executing command [${name}] on telegram`, error)
                }
            })
        }
        if (this.discordBot) {
            this.discordBot.commands.set(name, {
                execute: async(interaction) => {
                    try {
                        command.executeCallback(interaction)
                    } catch (error) {
                        console.error(`error while executing command [${name}] on discord`, error)
                    }
                }
            })
        }
    }
}

export const loadCommands = async() => {
    const commands = []
    const categoriesRoot = path.join(import.meta.dirname, '..', 'commands')
    const categoriesDirs = fs.readdirSync(categoriesRoot)
    for (const dir of categoriesDirs) {
        const commandsDir = path.join(categoriesRoot, dir)
        const commandsFiles = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'))
        for (const file of commandsFiles) {
            const filePath = path.join(commandsDir, file)
            console.log('Importing command', filePath)
            const command = await import(`file://${filePath}`)
            if ('data' in command && 'execute' in command) {
                commands.push(command)
            } else {
                console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`)
            }
        }
    }
    return commands
}

export const registerCommandsOnDiscord = async(discordClientId, commands) => {
    const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN)
    try {
        const commandsToSend = commands.filter(command => command.description != null).map(command => ({
            name: command.name,
            description: command.description || '',
            options: command.options || undefined
        }))
        await rest.put(Routes.applicationCommands(discordClientId), {body: commandsToSend})
    } catch (error) {
        console.error(error)
    }
}