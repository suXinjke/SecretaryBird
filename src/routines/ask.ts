import * as randomSeed from 'random-seed'
const rand = randomSeed.create()

export default ( messageText: string ): string => {

    const parsedMessage = messageText
        .trim()
        .toLowerCase()
        .replace( /([^a-яa-z\s]+)/iug, '' )
        .split( /\s+/iu )
        .sort()
        .join( ' ' )
        .trim()

    rand.seed( parsedMessage )

    if ( Math.random() < 0.15 ) {
        return '...'
    } else {
        return rand.random() > 0.5 ? 'YES' : 'NO'
    }
}
