import * as sqlite from 'sqlite3'
import * as config from './config'
import * as crypto from 'crypto'

import * as _debug from 'debug'
const debug = _debug( 'message_database' )

let pickDB: sqlite.Database = null

export function isInitialized() {
    return Boolean( pickDB )
}

export async function init() {

    const { pickDBPath } = config.get().discord

    if ( !pickDBPath ) {
        debug( 'Pick SQLite DB path is not specified' )
        return
    }

    await new Promise( ( res, rej ) => {
        pickDB = new sqlite.Database( pickDBPath, ( err ) => {
            if ( err ) {
                debug( err.message )
                return rej( err )
            }

            debug( 'Pick DB initialized' )

            res()
        } )
    } )

    await new Promise( ( res, rej ) => {
        pickDB.exec( `
            CREATE TABLE IF NOT EXISTS 'choices' ( 'choice' TEXT, 'score' REAL, PRIMARY KEY('choice') );
        `, ( err ) => {
            return err ? rej( err ) : res()
        } )
    } )
}

export function dumpChoice( choices: Array<{ choice: string, score: number }> ) {

    return new Promise( ( res, rej ) => {
        const sql = `INSERT OR IGNORE INTO choices ( 'choice', 'score' ) VALUES ` + choices.map( message => `( ?, ? )` ).join( ',' )
        const params = choices.reduce( ( sum, choice ) => sum.concat( choice.choice, choice.score ), [] )

        pickDB.run( sql, params, ( err ) => {
            return err ? rej( err ) : res()
        } )
    } ).catch( err => {
        debug( err )
    } )
}
