import * as randomSeed from 'random-seed'
const rand = randomSeed.create()
import randomMarkdownDecorateFunction from './random_markdown_decorate'

export default ( params: {
    messageText: string,
    randomMarkdownDecorate?: boolean,
    additionalSeed?: string
} ): string => {

    const {
        messageText,
        randomMarkdownDecorate = false,
        additionalSeed = ''
    } = params

    const parsedMessage = messageText
        .trim()
        .toLowerCase()
        .replace( /([^a-яa-z\s]+)/iug, '' )
        .split( /\s+/iu )
        .sort()
        .join( ' ' )
        .trim()

    rand.seed( parsedMessage + additionalSeed )

    if ( Math.random() < 0.15 ) {
        return '...'
    } else {
        const answer = rand.random() > 0.5 ? 'YES' : 'NO'
        return randomMarkdownDecorate ? randomMarkdownDecorateFunction( answer ) : answer
    }
}
