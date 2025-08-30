import { SlashCommandBuilder } from 'discord.js'
import { getCardImages, queryCard } from '../../src/cards.js'

export const data = new SlashCommandBuilder()
    .setName('card')
    .setDescription(`Get a card.`)
    .addStringOption((option) => option.setName('card').setDescription('Card name'))

export async function execute(context) {
    try {
        const query = context.getArguments()
        const card = await queryCard(query)
        if (card) {
            const images = getCardImages(card)
            context.replyWithPhoto({urls: images})
        } else {
            await context.reply('Card not found.')
        }
    } catch (error) {
        if (error.details) await context.reply(error.details)
    }
}
