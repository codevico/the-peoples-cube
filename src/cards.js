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