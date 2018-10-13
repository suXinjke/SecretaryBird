export default ( messageText: string ): string => {

    const shouldHaveRandomMarkdown = Math.random() < 0.10
    if ( shouldHaveRandomMarkdown ) {
        const randomMarkdown = Math.random()
        if ( randomMarkdown < 0.33 ) {
            return `*${messageText}*`
        } else if ( 0.33 <= randomMarkdown && randomMarkdown < 0.67 ) {
            return `**${messageText}**`
        } else {
            return `***${messageText}***`
        }
    }

    return messageText
}
