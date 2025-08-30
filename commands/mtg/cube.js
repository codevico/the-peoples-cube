import { SlashCommandBuilder } from 'discord.js'
import { getAllCubeCards, getCmcCount, getColorCount } from '../../src/db.js'

export const data = new SlashCommandBuilder()
    .setName('cube')
    .setDescription('Info on the cube.')
    .addStringOption((option) => option.setName('query').setDescription('Arguments'))

export async function execute(context) {
    const argument = context.getArguments()?.split(' ')
    if (argument == null) {
        context.replyWithMarkdownV2(`Usage:
/cube stats \\- Cube statistics
/propose <card name> \\- Propose a new card for the cube`)
        return
    }
    if (argument[0]?.toLowerCase() === 'stats') {
        const arg1 = argument[1]?.toLowerCase()
        if (['color', 'colors'].includes(arg1)) {
            context.replyWithMarkdownV2(`Color balance:
\`\`\`
${getColorStatsPrettyTable()}
\`\`\``)
            return
        } if (['cmc', 'cost', 'mv'].includes(arg1)) {
            context.replyWithMarkdownV2(`CMC balance:
\`\`\`
${getCmcStatsPrettyTable()}
\`\`\``)
            return
        }
        const cards = getAllCubeCards()
        const totYes = cards.filter(card => card.voted === 1).length
        context.replyWithMarkdownV2(`Approved cards: \`${totYes}\`
Rejected cards: \`${cards.length - totYes}\`
Total: \`${cards.length}\`
More details: \`/cube stats color\`, \`/cube stats cmc\`
`)
    }
}

const getCmcStatsPrettyTable = () => {
    const data = getCmcCount()
    const tot = Object.values(data).reduce((a, b) => a + b, 0)
    const rows = Object.keys(data).map(key => {
        const percent = Math.round(100 * data[key] / tot)
        return `| ${String(key).padStart(2, ' ')}  |  ${String(percent).padStart(2, ' ')} % |`
    }).join('\n')
    return `| CMC |   %   |
|-----|-------|
${rows}`
}

const getColorStatsPrettyTable = () => {
    const data = getColorStats()
    return `| White | ${String(data.percWhite).padStart(2, ' ')} % |
| Blue  | ${String(data.percBlue).padStart(2, ' ')} % |
| Black | ${String(data.percBlack).padStart(2, ' ')} % |
| Red   | ${String(data.percRed).padStart(2, ' ')} % |
| Green | ${String(data.percGreen).padStart(2, ' ')} % |`
}

const getColorStats = () => {
    const data = getColorCount()
    const totPips = data.white + data.blue + data.black + data.red + data.green
    return {
        totPips: totPips,
        percWhite: Math.round(100 * data.white / totPips),
        percBlue: Math.round(100 * data.blue / totPips),
        percBlack: Math.round(100 * data.black / totPips),
        percRed: Math.round(100 * data.red / totPips),
        percGreen: Math.round(100 * data.green / totPips),
    }
}