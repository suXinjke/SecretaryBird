import * as lodash from 'lodash'

export default ( messageText: string ): string => {

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

    return lodash.random( numbers[0], numbers[1], false ).toString()
}
