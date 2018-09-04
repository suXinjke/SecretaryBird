import * as randomSeed from 'random-seed'
const rand = randomSeed.create()

export default ( messageText: string ): string => {
    // split into words by whitespace chars
    const messageParts = messageText.trim().toLowerCase().split( /\s+/iu )

    for ( let i = 0; i < messageParts.length; i++ ) {
        const messagePart = messageParts[ i ]
        const re = /([a-яa-z]+)/iug
        let pointer
        let newMessagePart = ''

        do {
            pointer = re.exec( messagePart )
            if ( pointer ) {
                newMessagePart += pointer[ 0 ]
            }
        } while ( pointer )

        messageParts[ i ] = newMessagePart
    }

    const newMessage = messageParts.sort().join( ' ' )

    rand.seed( newMessage )

    if ( Math.random() < 0.15 ) {
        return '...'
    } else {
        return rand.random() > 0.5 ? 'YES' : 'NO'
    }
}
