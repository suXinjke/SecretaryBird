import * as randomSeed from 'random-seed'
const rand = randomSeed.create()
import randomMarkdownDecorateFunction from './random_markdown_decorate'

export default ( params: {
    messageText: string,
    randomMarkdownDecorate?: boolean,
    additionalSeed?: string,
    noAnswerProbability?: number
} ): string => {

    const {
        messageText,
        randomMarkdownDecorate = false,
        additionalSeed = '',
        noAnswerProbability = 0.05
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

    if ( noAnswerProbability > 0.0 && Math.random() < noAnswerProbability ) {
        return '...'
    } else {
        const answer = rand.random() > 0.5 ? 'YES' : 'NO'
        return randomMarkdownDecorate ? randomMarkdownDecorateFunction( answer ) : answer
    }
}
