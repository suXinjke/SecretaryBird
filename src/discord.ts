import * as Discord from 'discord.js'
import * as config from './config'
import * as messageDB from './message_database'
import ask from './routines/ask'
import discordRandomMessage from './routines/discord_random_message'
import * as fs from 'fs'
import * as lodash from 'lodash'

import * as _debug from 'debug'
const debug = _debug( 'discord' )

let discordClient: Discord.Client = null

let processing = false

function isProcessorAllowed( command: string, msg: Discord.Message ): boolean {
    const processorConfig = config.get().discord.processors[command] || config.get().discord.processors['any']
    if ( !processorConfig ) {
        return false
    }

    const {
        disabled = false,
        guildIDWhitelist = [],
        channelIDWhitelist = [],
        roleNameWhitelist = [],
        userTagWhitelist = []
    } = processorConfig

    if ( disabled ) {
        return false
    }

    if ( msg.guild && guildIDWhitelist.length > 0 && !guildIDWhitelist.includes( msg.guild.id ) ) {
        return false
    }

    if ( msg.channel && channelIDWhitelist.length > 0 && !channelIDWhitelist.includes( msg.channel.id ) ) {
        return false
    }

    const roleNameWhitelistPassed = roleNameWhitelist.length === 0 || msg.member.roles.find( role => roleNameWhitelist.includes( role.name ) )
    const userTagWhitelistPassed = userTagWhitelist.length === 0 || userTagWhitelist.includes( msg.author.tag )
    if ( !roleNameWhitelistPassed && !userTagWhitelistPassed ) {
        return false
    }

    return true
}

interface DiscordCommand {
    valid: boolean,

    command: string,
    contents: string,
    args: string[]
}

function parseDiscordCommand( msg: Discord.Message ): DiscordCommand {
    const commandRegex = /(\+[A-zА-я0-9]+) ?(.+)?/
    const results = commandRegex.exec( msg.content )
    if ( !results ) {
        return { valid: false, command: '', contents: '', args: [] }
    }

    return {
        valid: true,

        command: results[1],
        contents: results[2] || '',
        args: ( results[2] || '' ).split( /\s+/ )
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
    } )()
}

async function onDiscordMessage( msg: Discord.Message ) {

    if ( processing ) {
        return
    }

    const messageProcessingFunctions = []
    messageProcessingFunctions.forEach( func => {
        const processorName = ''
        if ( isProcessorAllowed( processorName, msg ) ) {
            func( msg )
        }
    } )

    const parsedCommand = parseDiscordCommand( msg )
    if ( !parsedCommand.valid ) {
        return
    }

    if ( !isProcessorAllowed( parsedCommand.command, msg ) ) {
        return
    }

    const { command, contents, args } = parsedCommand

    if ( command === '+ask' ) {
        if ( !contents.trim() ) {
            return
        }
        const response = ask( contents )
        msg.reply( response, { split: false } )
    }

    if ( command === '+rand' ) {

        const dumpedMessage = await messageDB.getRandomDumpedMessage()
        if ( !dumpedMessage ) {
            return
        }

        const randomMessage = await discordRandomMessage( discordClient, dumpedMessage.channel_id, dumpedMessage.id )

        randomMessage.parsedMessages.forEach(
            parsedMessage => messageDB.deletePostedMessage( parsedMessage.message_id )
        )

        if ( !randomMessage.result ) {
            return
        }

        if ( await messageDB.containsMessageHashOfMessage( randomMessage.result ) ) {
            return
        }

        messageDB.addMessageContentHash( randomMessage.result )
        msg.channel.send( randomMessage.result )
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

export async function init() {

    const { authToken, botRandomPlayingMessages, invisible } = config.get().discord

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

    const playingMessage = botRandomPlayingMessages.length > 0 ? lodash.sample( botRandomPlayingMessages ) : ''
    discordClient.user.setActivity( playingMessage, { type: 'PLAYING' } )
}
