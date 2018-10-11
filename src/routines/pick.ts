import * as randomSeed from 'random-seed'
import * as lodash from 'lodash'
import * as has_emoji from 'has-emoji'
const rand = randomSeed.create()

const discordMentionRegex = /<@\d+>/
const discordChannelRegex = /<#\d+>/

export default ( messageText: string ): string => {

    const separators = [ /\|\s*/g, /;\s*/g, /,\s*/g, /\s+/g ]
    const separatorToUse = separators.find( separator => separator.test( messageText ) ) || separators[separators.length - 1]

    const hasEmoji = has_emoji( messageText )

    const choices = messageText
        .trim()
        .split( separatorToUse )
        .sort()
        .filter( choice => choice.trim().length > 0 )
        .filter( ( choice, index, array ) => {
            if ( hasEmoji ) {
                return true
            }

            if (
                discordChannelRegex.test( choice ) ||
                discordMentionRegex.test( choice )
            ) {
                return array.indexOf( choice ) === index
            }

            const formattedArray = array.map( choiceToFormat => choiceToFormat.toLowerCase().replace( /([^a-яa-z\s]+)/iug, '' ).trim() )
            return formattedArray.indexOf( choice.toLowerCase().replace( /([^a-яa-z\s]+)/iug, '' ).trim() ) === index
        } )

    if ( choices.length <= 1 ) {
        const scold = lodash.sample( [ 'idiot', 'cunt', 'dingus', 'dumbass', 'asshole', 'dumbfuck' ] )
        return lodash.sample( [
            `there's nothing to pick from you ${scold}`,
            `PICK WHAT THERE'S NOTHING ${scold.toUpperCase()}`,
            `YOU ${scold.toUpperCase()} THERE'S NO PICK`,
            `YOU ${scold.toUpperCase()} THERE'S NOTHING EVEN TO PICK FROM`
        ] )
    }

    const seed = choices
        .map( choice => {
            if (
                discordChannelRegex.test( choice ) ||
                discordMentionRegex.test( choice )
            ) {
                return choice
            }

            return choice.replace( /([^a-яa-z\s]+)/iug, '' )
        } )
        .join( ' ' )
        .toLowerCase()
        .trim()

    rand.seed( seed )
    return choices[ rand( choices.length ) ]
}
