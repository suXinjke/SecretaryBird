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
    forceDebugLogging: boolean,

    discord: {
        authToken: string,
        botRandomPlayingMessages: string[],
        invisible: boolean,

        processors?: {
            [index: string]: DiscordCommandConfig
        },

        messageDBPath: string,
        messageDBChannels: string[]
    },

    twitter: {
        signInPort: number,

        consumerKey: string,
        consumerSecret: string,

        ebooksAccessToken: string,
        ebooksAccessTokenSecret: string,

        ebooksCronSchedule: string
    }
}

const config: MainConfig = {
    forceDebugLogging: false,

    discord: {
        authToken: null,
        botRandomPlayingMessages: [],
        invisible: false,

        processors: {},

        messageDBPath: '',
        messageDBChannels: []
    },

    twitter: {
        signInPort: null,

        consumerKey: '',
        consumerSecret: '',

        ebooksAccessToken: '',
        ebooksAccessTokenSecret: '',

        ebooksCronSchedule: ''
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
        console.error( err )
    }
}

export function set( newConfig: Partial<MainConfig> ) {
    lodash.merge( config, newConfig )
}
