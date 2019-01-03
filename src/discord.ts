import * as Discord from 'discord.js'
import * as config from './config'
import * as messageDB from './message_database'
import * as twitter from './twitter'
import ask from './routines/ask'
import pick from './routines/pick'
import range from './routines/range'
import discordRandomMessage from './routines/discord_random_message'
import * as fs from 'fs'
import * as lodash from 'lodash'

import * as _debug from 'debug'
import { DumpedMessage } from './message_database'
import { DiscordCommandConfig } from './config'
const debug = _debug( 'discord' )

let discordClient: Discord.Client = null

let processing = false

function isProcessorAllowed( command: string, msg: Discord.Message ): boolean {
    const anyCommandConfig = {
        disabled: false,
        snowflakeWhitelist: [] as string[],
        snowflakeBlacklist: [] as string[],
        ...( config.get().discord.processors['any'] || {} )
    }

    const commandConfig = lodash.mergeWith(
        anyCommandConfig,
        config.get().discord.processors[command] || {},

        ( objValue, srcValue ) => {
            if ( lodash.isArray( objValue ) ) {
                return objValue.concat( srcValue );
            }
        }
    )

    const { disabled, snowflakeWhitelist, snowflakeBlacklist } = commandConfig

    if ( disabled ) {
        return false
    }

    const ids = [
        msg.guild.id,
        msg.channel.id,
        ...( msg.member.roles.map( role => role.id ) ),
        msg.author.id
    ]

    return (
        !ids.some( id => snowflakeBlacklist.includes( id ) ) &&
        ids.some( id => snowflakeWhitelist.length === 0 || snowflakeWhitelist.includes( id ) )
    )
}

interface DiscordCommand {
    valid: boolean,

    command: string,
    contents: string,
    args: string[],

    attachmentSeeds: string[]
}

function parseDiscordCommand( msg: Discord.Message ): DiscordCommand {
    const commandRegex = /^(\+[A-zА-я0-9]+) ?(.+)?/
    const results = commandRegex.exec( msg.content )
    if ( !results ) {
        return { valid: false, command: '', contents: '', args: [], attachmentSeeds: [] }
    }

    return {
        valid: true,

        command: results[1].toLowerCase(),
        contents: results[2] || '',
        args: ( results[2] || '' ).split( /\s+/ ),
        attachmentSeeds: msg.attachments
            .filter( attach => Boolean( attach.height ) && Boolean( attach.height ) )
            .map( attach => `${attach.filesize}.${attach.width}x${attach.height}` )
    }
}

const messageProcessors = {

    // just what is a static variable
    to_csv: ( () => {
        let staticFileStream: fs.WriteStream
        let staticFileStreamCloseTimeout: NodeJS.Timer

        return ( msg: Discord.Message ) => {
            if ( !staticFileStream ) {
                staticFileStream = fs.createWriteStream( 'crawl_results.csv' )
            }

            staticFileStream.write( `${msg.channel.id},${msg.id},${msg.createdTimestamp}\n` )

            if ( staticFileStreamCloseTimeout ) {
                clearTimeout( staticFileStreamCloseTimeout )
            }

            staticFileStreamCloseTimeout = setTimeout( () => {
                staticFileStream.close()
                staticFileStream = undefined
            }, 5000 )
        }
    } )(),

    to_database: ( () => {
        let messageBuffer: DumpedMessage[] = []
        let messageBufferTimeout: NodeJS.Timer

        return ( msg: Discord.Message ) => {
            const dumpedMessage: DumpedMessage = {
                id: msg.id,
                channel_id: msg.channel.id,
                created_datetime: msg.createdTimestamp
            }

            if ( messageBuffer.length < 100 ) {
                messageBuffer.push( dumpedMessage )

                if ( messageBufferTimeout ) {
                    clearTimeout( messageBufferTimeout )
                }
                messageBufferTimeout = setTimeout( () => {
                    messageDB.dumpMessages( messageBuffer )
                    messageBuffer = []
                }, 5000 )

                return
            }

            messageDB.dumpMessages( messageBuffer )
            messageBuffer = []
        }
    } )()
}

export async function getRandomDumpedMessageToSend() {
    const dumpedMessage = await messageDB.getRandomDumpedMessage()
    if ( !dumpedMessage ) {
        return
    }

    const randomMessage = await discordRandomMessage( discordClient, dumpedMessage.channel_id, dumpedMessage.id )

    randomMessage.parsedMessages.forEach(
        parsedMessage => messageDB.deletePostedMessage( parsedMessage.message_id )
    )

    if ( !randomMessage.result ) {
        debug( 'failed to get random message for sending: message contents are empty' )
        return
    }

    if ( await messageDB.containsMessageHashOfMessage( randomMessage.result ) ) {
        debug( 'failed to get random message for sending: message with simillar hash was already sent' )
        return
    }

    messageDB.addMessageContentHash( randomMessage.result )

    return randomMessage
}

async function onDiscordMessage( msg: Discord.Message ) {

    if ( processing ) {
        return
    }

    const { messageDBChannels, randomDecorateAskResults, randomDecoratePickResults, askNoAnswerProbability } = config.get().discord

    if ( messageDBChannels.includes( msg.channel.id ) ) {
        messageDB.dumpMessages( [ {
            id: msg.id,
            channel_id: msg.channel.id,
            created_datetime: msg.createdTimestamp
        } ] )
    }

    const parsedCommand = parseDiscordCommand( msg )
    if ( !parsedCommand.valid ) {
        return
    }

    if ( !isProcessorAllowed( parsedCommand.command, msg ) ) {
        return
    }

    const { command, contents, args, attachmentSeeds } = parsedCommand

    if ( msg.author.id === discordClient.user.id ) {
        return
    }

    if ( command === '+ask' ) {
        if ( !contents.trim() ) {
            return
        }

        const response = ask( {
            messageText: contents,
            randomMarkdownDecorate: randomDecorateAskResults,
            additionalSeed: attachmentSeeds.join( '' ),
            noAnswerProbability: askNoAnswerProbability
        } )
        msg.reply( response, { split: false } )
    }

    if ( command === '+ask2' ) {
        if ( !contents.trim() ) {
            return
        }

        const response = ask( {
            messageText: contents,
            randomMarkdownDecorate: randomDecorateAskResults,
            additionalSeed: ( new Date ).toISOString(),
            noAnswerProbability: askNoAnswerProbability
        } )
        msg.reply( response, { split: false } )
    }

    if ( command === '+pick' ) {
        const response = pick( {
            messageText: contents,
            randomMarkdownDecorate: randomDecoratePickResults,
            additionalSeed: attachmentSeeds.join( '' )
        } )
        msg.reply( response, { split: false } )
    }

    if ( command === '+range' ) {
        const response = range( {
            messageText: contents,
            additionalSeed: attachmentSeeds.join( '' )
        } )
        msg.reply( response, { split: false } )
    }

    if ( command === '+crawl' ) {

        const processorName = args[0]
        const processor = messageProcessors[ processorName ]
        if ( !processor ) {
            debug( 'unknown processor' )
            return
        }

        let to_date: Date = null
        if ( args[1] ) {
            to_date = new Date( args[1] )
            const date_is_correct = !isNaN( Number( to_date ) )
            if ( !date_is_correct ) {
                debug( 'incorrect to_date provided for the +crawl command' )
                return
            }
        }

        processing = true

        let idCursor = args[2]
        const dumpChannel = msg.channel as Discord.TextChannel

        let messageCount = 0

        do {
            const messageBatch = (
                await dumpChannel.fetchMessages( { before: idCursor, limit: 100 } )
            ).filter( message => message.createdAt >= to_date )

            messageBatch.forEach( message => {
                processor( message )
            } )

            const lastMessage = messageBatch.last()

            if ( lastMessage ) {
                idCursor = lastMessage.id
                messageCount += messageBatch.size
                debug( `${processorName} | ${messageCount} | ${new Date( lastMessage.createdTimestamp )}` )
            } else {
                idCursor = ''
            }

        } while ( idCursor !== '' )

        processing = false
    }
}

let nextRandomPlayingActivityTimer: NodeJS.Timer
export function setRandomPlayingActivity() {
    if ( !discordClient || !discordClient.user ) {
        return
    }

    const { botRandomPlayingMessages, randomPlayingActivityChangeMsecs, randomPlayingActivityChangeErrorMsecs } = config.get().discord
    if ( botRandomPlayingMessages.length === 0 ) {
        return
    }

    if ( nextRandomPlayingActivityTimer ) {
        clearTimeout( nextRandomPlayingActivityTimer )
    }


    nextRandomPlayingActivityTimer = setTimeout(
        setRandomPlayingActivity,
        randomPlayingActivityChangeMsecs + lodash.random( -randomPlayingActivityChangeErrorMsecs, randomPlayingActivityChangeErrorMsecs )
    )

    discordClient.user.setActivity( lodash.sample( botRandomPlayingMessages ), { type: 'PLAYING' } )
}

export async function init() {

    const { authToken, invisible } = config.get().discord

    discordClient = new Discord.Client()
    discordClient.on( 'error', err => {
        debug( err.message )
    } )
    discordClient.on( 'debug', err => {
        debug( err )
    } )
    discordClient.on( 'message', onDiscordMessage )

    await discordClient.login( authToken )

    if ( invisible ) {
        discordClient.user.setStatus( 'invisible' )
    }

    setRandomPlayingActivity()
}
