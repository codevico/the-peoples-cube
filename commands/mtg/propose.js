import { SlashCommandBuilder } from 'discord.js'
import { Cards } from 'scryfall-sdk'
import { getSavedCardByName } from '../../src/db.js'
import { getCardImages } from '../../src/cards.js'
import { activeDiscordPollsByCardName, activePolls, OPTION_YES, OPTION_NO } from '../../src/polls.js'

export const data = new SlashCommandBuilder()
    .setName('propose')
    .setDescription('Propose a new card for the cube.')
    .addStringOption((option) => option.setName('query').setDescription('Card name'))

export async function execute(context) {
    const argument = context.getArguments()
    if (argument == null) {
        context.replyWithMarkdownV2(`Usage: /propose Card name`)
        return
    }
    const card = await Cards.byName(argument).catch(() => {
        return null
    })
    if (card == null) {
        context.reply(`No card found.`)
        return
    }
    const savedCard = getSavedCardByName(card.name)
    if (savedCard) {
        context.reply(`Card ${card.name} already voted.`)
        return
    }
    context.replyWithPhoto({
        urls: [getCardImages(card)[0]]
    }).then(imageContext => {
        const isTelegram = !!imageContext?.message_id

        // Discord poll events don't reference the poll id so I have to add the card name to the *answer* text
        const optionYes = isTelegram ? OPTION_YES : `${OPTION_YES} - Add ${card.name}`
        const optionNo = isTelegram ? OPTION_NO : `${OPTION_NO} - Don't add ${card.name}`

        const photoMessageId = imageContext?.message_id || imageContext.id
        const chatId = imageContext?.chat?.id || imageContext.channelId
        context.sendPoll(chatId, `Add ${card.name} to the cube?`, [{text: optionYes}, {text: optionNo}], {
            protect_content: true,
            reply_to_message_id: photoMessageId
        }).then(pollContext => {
            if (isTelegram) {
                activePolls[pollContext.id] = {
                    card_name: card.name,
                    card_id: card.id,
                    chat_id: chatId,
                    message_id: pollContext?.message_id || pollContext.id,
                    photo_message_id: photoMessageId
                }
            } else {
                activeDiscordPollsByCardName[card.name] = {
                    cardName: card.name,
                    commandContext: context,
                    imageContext: imageContext,
                    pollContext: pollContext
                }
            }
        })
    })
}