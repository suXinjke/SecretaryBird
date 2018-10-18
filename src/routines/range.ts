import * as randomSeed from 'random-seed'
const rand = randomSeed.create()

export default ( params: {
    messageText: string,
    additionalSeed?: string
} ): string => {

    const { messageText, additionalSeed = '' } = params

    const numbers = messageText
        .replace( /[^-\d\s]/iug, ' ' )
        .trim()
        .split( /\s+/ )
        .slice( 0, 2 )
        .map( num => Number( num ) )
        .sort()

    if ( numbers.length < 2 ) {
        const scold = 'need atleast two numbers'
        return Math.random() > 0.5 ? scold : scold.toUpperCase()
    }

    rand.seed( additionalSeed ? additionalSeed : Number( new Date() ) )
    return rand.intBetween( numbers[0], numbers[1] )
}
