const MARKDOWN_V2_SPECIAL_CHARS = ['.', '(', ')', '{', '}']

export const escapeMarkdownV2 = (text) => {
    for (const char of MARKDOWN_V2_SPECIAL_CHARS) {
        text = text.replaceAll(char, `\\${char}`)
    }
    return text
}