
import * as config from './config'
import * as messageDB from './message_database'
import * as discord from './discord'
import * as log4js from 'log4js'

function consoleAppender( prefix: string = '' ): log4js.ConsoleAppender {
    return {
        type: 'console',
        layout: {
            type: 'pattern',
            pattern: `%[[%d{ABSOLUTE}] [%p]%] ${prefix}%m`,
            colorized: true
        }
    }
}

function fileAppender( filename: string ): log4js.FileAppender {
    return {
        type: 'file',
        filename: filename || '',
        layout: {
            type: 'pattern',
            pattern: '[%d]%n%m',
            colorized: true
        }
    }
}

function initLogging() {
    const { log } = config.get()

    log4js.configure( {
        appenders: {
            main_console: consoleAppender(),

            main_file: fileAppender( log.toFile ),
        },
        categories: {
            default: {
                appenders: [
                    log.toConsole ? 'main_console' : '',
                    log.toFile ? 'main_file' : ''
                ].filter( appenderName => appenderName.length > 0 ),

                level: 'info'
            }
        }
    } )
}

async function main() {
    config.init()
    initLogging()

    await Promise.all( [
        messageDB.init(),
        discord.init()
    ] )

}

main()
