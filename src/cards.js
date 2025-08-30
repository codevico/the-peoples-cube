import { Cards } from 'scryfall-sdk'

export const getCardImages = (card, imageType='normal') => {
    const images = []
    if (card.card_faces) {
        for (const face of card.card_faces) {
            images.push(face.image_uris[imageType])
        }
    } else {
        images.push(card.image_uris[imageType])
    }
    return images
}

export const queryCard = async(query) => {
    // If value starts with ?, use query to search.
    // Otherwise just search a card by name.
    if (query?.startsWith('?')) {
        return await findFirstCard(query.slice(1)?.trim())
    } else {
        return await Cards.byName(query, true)
    }
}

export const findFirstCard = async(query) => {
    return await new Promise(resolve => {
        const emitter = Cards.search(query)
            .on('data', (card) => {
                resolve(card)
                emitter.cancel()
            })
            .on('done', () => {
                resolve(null)
            })
    })
}
