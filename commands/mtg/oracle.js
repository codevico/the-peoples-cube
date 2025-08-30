import { SlashCommandBuilder } from 'discord.js'
import { queryCard } from '../../src/cards.js'

export const data = new SlashCommandBuilder()
    .setName('oracle')
    .setDescription(`Get a card's oracle text.`)
    .addStringOption((option) => option.setName('card').setDescription('Card name'))

export async function execute(context) {
    try {
        const query = context.getArguments()
        const card = await queryCard(query)
        if (card) {
            await context.replyWithMarkdownV2(card.card_faces.map(face => `**${face.name}**\n${face.oracle_text}`).join('\n\n'))
        } else {
            await context.reply('Card not found.')
        }
    } catch (error) {
        await context.reply(error)
    }
}
