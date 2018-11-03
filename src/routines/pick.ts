import * as randomSeed from 'random-seed'
import * as lodash from 'lodash'
import * as has_emoji from 'has-emoji'
import randomMarkdownDecorateFunction from './random_markdown_decorate'
const rand = randomSeed.create()
import * as pickDB from '../pick_database'

const discordMentionRegex = /<@\d+>/
const discordChannelRegex = /<#\d+>/

const filterRegex = /([^A-zА-я\d\s]+)/ug

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

    const separators = [ /\|\s*/g, /;\s*/g, /,\s*/g, /\s+(?:или|or)\s*/, /\s+/g ]
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

            const formattedArray = array.map( choiceToFormat => choiceToFormat.toLowerCase().replace( filterRegex, '' ).trim() )
            return formattedArray.indexOf( choice.toLowerCase().replace( filterRegex, '' ).trim() ) === index
        } )
        .map( choice => {
            const choice_seed = (
                discordChannelRegex.test( choice ) || discordMentionRegex.test( choice ) ? choice :
                choice.replace( filterRegex, '' )
            )
            .toLowerCase()
            .trim()

            rand.seed( choice_seed + additionalSeed )

            return {
                choice_original: choice,
                choice: choice_seed,
                score: rand.floatBetween( 0, 1 ) as number
            }
        } )
        .sort( ( a, b ) => b.score - a.score )

    if ( choices.length <= 1 ) {
        const scold = lodash.sample( [ 'idiot', 'cunt', 'dingus', 'dumbass', 'asshole', 'dumbfuck' ] )
        return lodash.sample( [
            `there's nothing to pick from you ${scold}`,
            `PICK WHAT THERE'S NOTHING ${scold.toUpperCase()}`,
            `YOU ${scold.toUpperCase()} THERE'S NO PICK`,
            `YOU ${scold.toUpperCase()} THERE'S NOTHING EVEN TO PICK FROM`
        ] )
    }

    if ( pickDB.isInitialized() ) {
        pickDB.dumpChoice( choices )
    }

    const answer = choices[0].choice_original

    return randomMarkdownDecorate ? randomMarkdownDecorateFunction( answer ) : answer
}
