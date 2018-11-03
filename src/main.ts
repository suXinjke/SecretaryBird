
import * as debug from 'debug'
import * as config from './config'
import * as messageDB from './message_database'
import * as pickDB from './pick_database'
import * as discord from './discord'
import * as twitter from './twitter'

async function main() {
    config.init()
    if ( config.get().forceDebugLogging ) {
        debug.enable( '*' )
    }

    await Promise.all( [
        messageDB.init(),
        pickDB.init(),
        discord.init(),
        twitter.init()
    ] )

}

main()
