import { Client, Collection, Events, GatewayIntentBits, Partials, PollLayoutType, REST, Routes } from 'discord.js'
import { Telegraf } from 'telegraf'
import { escapeMarkdownV2 } from './utils.js'
import { handleDiscordPoll, handleTelegramPoll } from './polls.js'

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
            replyWithPhoto: ({ url }) => {
                if (context.replyWithPhoto) {
                    return context.replyWithPhoto({ url })
                } else {
                    return context.reply(url)
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
                    return context.options.getString(optionName)
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
                command.executeCallback(context)
            })
        }
        if (this.discordBot) {
            this.discordBot.commands.set(name, {
                execute: async(interaction) => {
                    command.executeCallback(interaction)
                }
            })
        }
    }
    registerCommandsOnDiscord = async(discordClientId, commands) => {
        const rest = new REST({version: '10'}).setToken(this.discordToken)
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
}