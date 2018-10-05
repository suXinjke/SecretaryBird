import * as log4js from 'log4js'
import * as lodash from 'lodash'
import * as node_config from 'config'
import * as Discord from 'discord.js'

interface Log4jsSettings {
    /** If true - will output this log to console */
    toConsole: boolean,

    /** Log file path, leave null to disable logging to file */
    toFile: string
}

interface DiscordCommandConfig {
    disabled: boolean,

    guildIDWhitelist: Discord.Snowflake[],
    channelIDWhitelist: Discord.Snowflake[],

    roleNameWhitelist: Discord.Snowflake[],
    userTagWhitelist: Discord.Snowflake[]
}

interface MainConfig {
    log: Log4jsSettings,

    discord: {
        authToken: string,
        botRandomPlayingMessages: string[],
        invisible: boolean,

        processors?: {
            [index: string]: DiscordCommandConfig
        },

        messageDBPath: string
    },

    twitter: {
        signInPort: number,

        consumerKey: string,
        consumerSecret: string,

        ebooksAccessToken: string,
        ebooksAccessTokenSecret: string
    }
}

const config: MainConfig = {
    log: {
        toConsole: true,
        toFile: null
    },

    discord: {
        authToken: null,
        botRandomPlayingMessages: [],
        invisible: false,

        processors: {},

        messageDBPath: ''
    },

    twitter: {
        signInPort: null,

        consumerKey: '',
        consumerSecret: '',

        ebooksAccessToken: '',
        ebooksAccessTokenSecret: ''
    }
}
export function get(): MainConfig {
    return config
}

export function init() {
    try {
        const newConfig = node_config.util.loadFileConfigs( '' )
        set( newConfig )
    } catch ( err ) {
        const log = log4js.getLogger( 'main' )
        if ( log ) {
            log.error( err )
        }
    }
}

export function set( newConfig: Partial<MainConfig> ) {
    lodash.merge( config, newConfig )
}
