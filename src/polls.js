import { Cards } from 'scryfall-sdk'
import { insertCard } from './db.js'

export const OPTION_YES = 'Yes'
export const OPTION_NO = 'No'

const MIN_VOTES_YES = 1 // Todo env?
const MIN_VOTES_NO = 1 // Todo env?

export const activePolls = {} // Only tracking for telegram for now
export const activeDiscordPollsByCardName = {}

export const handleDiscordPoll = async(context, client) => {
    // Discord answers are in the format
    // Yes - Add <cardname>
    // No - Don't add <cardname>
    const answer = context.text
    const isVoteYes = answer.startsWith(`${OPTION_YES}`)
    const approved = isVoteYes && context.voteCount >= MIN_VOTES_YES
    const rejected = !isVoteYes && context.voteCount >= MIN_VOTES_NO

    const cardName = isVoteYes ? answer.substring(`${OPTION_YES} - Add `.length) : answer.substring(`${OPTION_NO} - Don't add `.length)
    if (!cardName) return
    const card = await Cards.byName(cardName)
    if (!card) return
    const poll = activeDiscordPollsByCardName[card.name]
    if (!poll) return
    if (isVoteYes) poll.votesYes = context.voteCount
    else poll.votesNo = context.voteCount

    if (approved || rejected) {
        console.log(poll)
        const message = `The card ${card.name} ${approved ? `has been approved and will be added to the cube` : `has been rejected`}.`
        const channel = await client.channels.fetch(poll.pollContext.channelId)
        channel.send(message)
        insertCard(card, approved ? 1 : 0, poll.votesYes || 0, poll.votesNo || 0)
    }
}

export const handleTelegramPoll = async(context) => {
    const poll = activePolls[context.update.poll.id]
    if (!poll) {
        // Ignoring answer for untracked poll
        return
    }
    const results = {
        yes: context.update.poll.options.find(option => option.text.startsWith(OPTION_YES)).voter_count,
        no: context.update.poll.options.find(option => option.text.startsWith(OPTION_NO)).voter_count
    }
    const approved = results.yes >= MIN_VOTES_YES
    const rejected = !approved && results.no >= MIN_VOTES_NO
    if (approved || rejected) {
        const card = await Cards.byId(poll.card_id)
        const message = `The card ${card.name} ${approved ? `has been approved and will be added to the cube` : `has been rejected`}.`
        context?.telegram?.stopPoll(poll.chat_id, poll.message_id)
        context?.telegram?.sendMessage(poll.chat_id, message, { reply_to_message_id: poll.message_id })
        context?.telegram?.deleteMessage(poll.chat_id, poll.photo_message_id)
        insertCard(card, approved ? 1 : 0, results.yes, results.no)
        delete activePolls[context.update.poll.id]
    }
}