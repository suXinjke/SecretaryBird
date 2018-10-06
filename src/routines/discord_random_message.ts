import * as Discord from 'discord.js'
import * as url from 'url'
import * as twitterText from 'twitter-text'
import * as config from '../config'

const linksRegex = /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/[^\s]*)?/

const codeBlockRegex = /(```)((.|\s)+)\1/g
const inlineCodeRegex = /(`)(.*?)\1/g
const boldItalicsRegex = /(\*+)(.+)\1/g
const strikethroughRegex = /(\~\~)(.*?)\1/g
const underlineRegex = /(__)(.*?)\1/g
const discordMentionRegex = /<@\d+>/g
const discordEmojiRegex = /<:.+:\d+>/g

export interface MessageToSanitize {
    channel_id: string,
    message_id: string,
    username: string,
    contents: string,
    created_datetime: Date
}

export interface DiscordRandomMessage {
    parsedMessages: MessageToSanitize[],
    result: string
}

type EmojiReplacements = Array<[ string, string ]>

export function sanitize( message: string, emojiReplacements: EmojiReplacements = [] ): string {
    let result = message.replace( boldItalicsRegex, '$2' )
    .replace( codeBlockRegex, '$2' )
    .replace( inlineCodeRegex, '$2' )
    .replace( underlineRegex, '$2' )
    .replace( strikethroughRegex, '$2' )
    .replace( discordMentionRegex, '@█████████' )

    for ( const emojiReplacement of emojiReplacements ) {
        const [ input, output ] = emojiReplacement
        result = result.replace( new RegExp( `<:${input}:\\d+>` ), output )
    }

    result = result
    .replace( discordEmojiRegex, '' )
    .replace( linksRegex, ( substr, protocol ) => {
        const parsedLink = url.parse( substr )
        const amountOfBlacklistChars = Math.floor( ( parsedLink.host + parsedLink.pathname ).length / 2 ) || 1
        return protocol + ( new Array( amountOfBlacklistChars ) ).fill( '█' ).join( '' )
    } )
    .replace( /[\t ]{2,}/g, ' ' )
    .trim()

    return result
}

export function sanitizeMessages( params: {
    messages: MessageToSanitize[],
    maxLength?: number,
    maxMsecDifference?: number,
    emojiReplacements?: EmojiReplacements
} ): DiscordRandomMessage {
    const parsedMessages: MessageToSanitize[] = []

    const {
        messages,
        maxLength = 280,
        maxMsecDifference = 1000 * 60,
        emojiReplacements = []
    } = params

    let result = ''
    let currentUsername = ''
    let currentDatetime: Date = null

    for ( const message of messages ) {

        if ( result && Number( message.created_datetime ) - Number( currentDatetime ) > maxMsecDifference ) {
            break
        }

        if ( result && message.username !== currentUsername ) {
            break
        }

        let parsedMessage = sanitize( message.contents, emojiReplacements )
        if ( result ) {
            parsedMessage = '\n' + parsedMessage
        }

        const lengthAfterAddingNewMessage = twitterText.parseTweet( result + parsedMessage ).weightedLength
        if ( result && lengthAfterAddingNewMessage > maxLength ) {
            break
        }

        result += parsedMessage
        parsedMessages.push( message )

        while ( twitterText.parseTweet( result ).weightedLength > maxLength ) {
            const lastWordRegex = /( [^ ]+\s*)$/g
            if ( result.search( lastWordRegex ) === -1 ) {
                return { parsedMessages, result: '' }
            }

            result = result.replace( lastWordRegex, '...' )
        }

        currentUsername = message.username
        currentDatetime = message.created_datetime
    }

    return { parsedMessages, result: result.trim() }
}

export default async ( discordClient: Discord.Client, channel_id: string, message_id: string ): Promise<DiscordRandomMessage> => {
    const channel = discordClient.channels.get( channel_id ) as Discord.TextChannel
    if ( !channel ) {
        return { parsedMessages: [], result: '' }
    }

    const { emojiReplacements } = config.get().discord

    const fetchedMessages = ( await channel.fetchMessages( {
        after: message_id,
        limit: 20
    } ) ).map<MessageToSanitize>( message => ( {
        message_id: message.id,
        channel_id,
        contents: message.content,
        created_datetime: message.createdAt,
        username: message.author.tag
    } ) ).sort( ( a, b ) => Number( a.created_datetime ) - Number( b.created_datetime ) )

    return sanitizeMessages( {
        messages: fetchedMessages,
        emojiReplacements
    } )
}
