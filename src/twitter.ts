import * as Twit from 'twit'
import * as LoginWithTwitter from 'login-with-twitter'
import * as log4js from 'log4js'
import * as config from './config'

import * as fs from 'fs'
import * as Koa from 'koa'

const log: log4js.Logger = log4js.getLogger()

let token_secret = ''
let login_with_twitter
let ebooks_bot: Twit

export function init() {

    const { signInPort, consumerKey, consumerSecret, ebooksAccessToken, ebooksAccessTokenSecret } = config.get().twitter

    login_with_twitter = new LoginWithTwitter( {
        consumerKey,
        consumerSecret,
        callbackUrl: 'http://127.0.0.1/'
    } )

    ebooks_bot = new Twit( {
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token: ebooksAccessToken,
        access_token_secret: ebooksAccessTokenSecret,
        timeout_ms: 60 * 1000
    } )

    if ( !signInPort ) {
        return
    }

    const http = new Koa()
    http.use( async ctx => {
        if ( ctx.method === 'GET' ) {
            const { oauth_token, oauth_verifier } = ctx.query
            if ( oauth_token && oauth_verifier && token_secret ) {
                await new Promise( ( res, rej ) => {
                    login_with_twitter.callback( { oauth_token, oauth_verifier }, token_secret, ( err, data ) => {
                        return err ? rej( err ) : res( data )
                    } )
                } )
            }

            ctx.body = fs.readFileSync( './dist/index.html' )
            ctx.type = 'html'
        } else if ( ctx.method = 'POST' ) {
            token_secret = ''

            const [ tokenSecret, url ] = await new Promise<[ string, string ]>( ( res, rej ) => {
                login_with_twitter.login( ( err, tokenSecret, url ) => {
                    if ( err ) {
                        return rej( err )
                    }

                    return res( [ tokenSecret, url ] )
                } )
            } )

            token_secret = tokenSecret

            ctx.redirect( url )
        }
    } )
    http.listen( signInPort, '127.0.0.1' )
}

export async function sendEbook( message: string ) {
    try {
        await ebooks_bot.post( 'statuses/update', { status: message } )
    } catch ( err ) {
        log.error( err )
    }
}