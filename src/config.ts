import * as lodash from 'lodash'
import * as node_config from 'config'
import * as Discord from 'discord.js'

interface Log4jsSettings {
    /** If true - will output this log to console */
    toConsole: boolean,

    /** Log file path, leave null to disable logging to file */
    toFile: string
}

export interface DiscordCommandConfig {
    disabled: boolean,

    snowflakeWhitelist: Discord.Snowflake[],
    snowflakeBlacklist: Discord.Snowflake[]
}

interface MainConfig {
    forceDebugLogging: boolean,

    discord: {
        authToken: string,
        randomPlayingActivityChangeMsecs: number,
        randomPlayingActivityChangeErrorMsecs: number,
        botRandomPlayingMessages: string[],
        invisible: boolean,

        emojiReplacements: Array<[ string, string ]>,

        processors?: {
            [index: string]: DiscordCommandConfig
        },

        messageDBPath: string,
        messageDBChannels: string[],

        pickDBPath: string,

        randomDecorateAskResults: boolean,
        randomDecoratePickResults: boolean,

        askNoAnswerProbability: number
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
        randomPlayingActivityChangeMsecs: 1000 * 60 * 60 * 24,
        randomPlayingActivityChangeErrorMsecs: 1000 * 60 * 60 * 12,
        invisible: false,

        emojiReplacements: [],

        processors: {},

        messageDBPath: '',
        messageDBChannels: [],

        pickDBPath: '',

        randomDecorateAskResults: true,
        randomDecoratePickResults: true,

        askNoAnswerProbability: 0.05
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
