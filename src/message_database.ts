import * as sqlite from 'sqlite3'
import * as config from './config'
import * as crypto from 'crypto'

import * as _debug from 'debug'
const debug = _debug( 'message_database' )

let messagesDB: sqlite.Database = null

export interface DumpedMessage {
    id: string,
    channel_id: string,
    created_datetime: number
}

function getSHA1( message: string ): string {
    return crypto.createHash( 'sha256' ).update( message ).digest( 'hex' )
}

export async function init() {

    const { messageDBPath } = config.get().discord

    if ( !messageDBPath ) {
        debug( 'Messages SQLite DB path is not specified' )
        return
    }

    await new Promise( ( res, rej ) => {
        messagesDB = new sqlite.Database( messageDBPath, ( err ) => {
            if ( err ) {
                debug( err.message )
                return rej( err )
            }

            debug( 'Messages DB initialized' )

            res()
        } )
    } )

    await new Promise( ( res, rej ) => {
        messagesDB.exec( `
            CREATE TABLE IF NOT EXISTS 'messages' ( 'channel_id' TEXT, 'message_id' TEXT, 'created_datetime' INTEGER, PRIMARY KEY('message_id','channel_id') );
            CREATE TABLE IF NOT EXISTS 'posted_messages' ( 'message_hash' TEXT UNIQUE, PRIMARY KEY('message_hash') )
        `, ( err ) => {
            return err ? rej( err ) : res()
        } )
    } )
}

export async function dumpMessages( messages: DumpedMessage[] ) {
    if ( messages.length === 0 ) {
        return
    }

    return new Promise( ( res, rej ) => {
        const sql = `INSERT INTO messages ( 'channel_id', 'message_id', 'created_datetime' ) VALUES ` + messages.map( message => `( ?, ?, ? )` ).join( ',' )
        const params = messages.reduce( ( sum, message ) => sum.concat( message.channel_id, message.id, message.created_datetime ), [] )

        messagesDB.run( sql, params, ( err ) => {
            return err ? rej( err ) : res()
        } )
    } )
}

export async function getRandomDumpedMessage(): Promise<DumpedMessage> {
    const sql = `SELECT channel_id, message_id, created_datetime FROM messages WHERE rowid = abs( random() ) % ( SELECT max( rowid ) FROM messages ) + 1`

    return new Promise<DumpedMessage>( ( res, rej ) => {

        messagesDB.get( sql, ( err, row ) => {
            return err ? rej( err ) : res( {
                id: row.message_id,
                channel_id: row.channel_id,
                created_datetime: row.created_datetime
            } )
        } )
    } )
}

export async function deletePostedMessage( message_id: string ) {
    const sql = `DELETE FROM messages WHERE message_id = ?`

    return new Promise<DumpedMessage>( ( res, rej ) => {

        messagesDB.run( sql, [ message_id ], ( err ) => {
            return err ? rej( err ) : res()
        } )
    } )
}

export async function addMessageContentHash( message: string ) {
    const sql = `INSERT OR IGNORE INTO posted_messages ( 'message_hash' ) VALUES ( ? )`

    return new Promise<DumpedMessage>( ( res, rej ) => {

        messagesDB.run( sql, [ getSHA1( message ) ], ( err ) => {
            return err ? rej( err ) : res()
        } )
    } )
}

export async function containsMessageHashOfMessage( message: string ) {
    const sql = `SELECT COUNT(*) AS contains_hash FROM posted_messages WHERE message_hash = ?`

    return new Promise<boolean>( ( res, rej ) => {

        messagesDB.get( sql, [ getSHA1( message ) ], ( err, row ) => {
            return err ? rej( err ) : res( row.contains_hash !== 0 )
        } )
    } )
}
