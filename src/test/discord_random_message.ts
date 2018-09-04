import { assert } from 'chai'
import { sanitize, sanitizeMessages } from '../routines/discord_random_message'

describe( 'Sanitizing of random messages for posting in public', () => {
    it( 'Basic trimming', () => {
        assert.equal( sanitize( '\t\n     FFFFFFFF fffffff aaaaa        \n\t\n' ), 'FFFFFFFF fffffff aaaaa' )
        assert.equal( sanitize( '\nOne\nTwo\nThree\n\n' ), 'One\nTwo\nThree' )
    } )

    it( 'No markdown', () => {
        assert.equal( sanitize( 'clean *italics*' ),                        'clean italics' )
        assert.equal( sanitize( 'clean **bold**' ),                         'clean bold' )
        assert.equal( sanitize( 'clean ***bold italics***' ),               'clean bold italics' )
        assert.equal( sanitize( 'clean __underline__' ),                    'clean underline' )
        assert.equal( sanitize( 'clean __*underline italics*__' ),          'clean underline italics' )
        assert.equal( sanitize( 'clean __**underline bold**__' ),           'clean underline bold' )
        assert.equal( sanitize( 'clean __***underline bold italics***__' ), 'clean underline bold italics' )
        assert.equal( sanitize( 'clean ~~strikethrough~~' ),                'clean strikethrough' )
        assert.equal( sanitize( 'clean `one codeblock`' ),                  'clean one codeblock' )
        assert.equal( sanitize( 'clean ```multi codeblock```' ),            'clean multi codeblock' )
        assert.equal( sanitize( 'clean ```css\nmulti\ncodeblock 2```' ),      'clean css\nmulti\ncodeblock 2' )
    } )

    it( 'Sanitize links with blackout', () => {
        assert.equal( sanitize( 'bird twitter http://twitter.com/   ' ),   'bird twitter http://██████' )
        assert.equal( sanitize( 'https://cdn.discordapp.com/attachments/1111111/32222222222/blablablablabl.png oh' ),   'https://██████████████████████████████████ oh' )
        assert.equal( sanitize( 'no querystring http://twitter.com/abracadabra?something=4&page=5' ),   'no querystring http://███████████' )
    } )

    it( 'No excessive whitespace', () => {
        assert.equal( sanitize( 'I really        like long s        spaces but why  poooooooooost like       this?' ),   'I really like long s spaces but why poooooooooost like this?' )
    } )

    it( 'Sanitize mentions with blackout', () => {
        assert.equal( sanitize( 'here <@120341634327117824> <@366091824315760640> 👀 hey' ), 'here @█████████ @█████████ 👀 hey' )
    } )

    it( `No custom emoji unless it's on replace list`, () => {
        assert.equal( sanitize( 'very <:raiden:484678250254172172>' ), 'very' )
        assert.equal( sanitize( 'very <:yellow:484678250254172172>', [ ['yellow', '👱' ] ] ), 'very 👱' )
    } )
} )

describe( 'Properly combining sanitized messages', () => {
    it( 'Basic combine', () => {
        assert.equal( sanitizeMessages( {
            messages: [
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 0 ),  contents: 'Message one' },
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 10 ), contents: 'Message two' }
            ]
        } ).result, 'Message one\nMessage two' )
    } )

    it( `Basic combine but it's interrupted by other user`, () => {
        assert.equal( sanitizeMessages( {
            messages: [
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 0 ),  contents: 'Message one' },
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 10 ), contents: 'Message two' },
                { channel_id: '', message_id: '', username: 'dumb', created_datetime: new Date( 20 ), contents: 'interrupt' },
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 30 ), contents: 'Message three' }
            ]
        } ).result, 'Message one\nMessage two' )
    } )

    it( `Basic combine but it's interrupted by huge time difference`, () => {
        assert.equal( sanitizeMessages( {
            maxMsecDifference: 20,
            messages: [
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 0 ),  contents: 'one' },
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 10 ), contents: 'two' },
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 30 ), contents: 'three' },
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 51 ), contents: 'interrupt' }
            ]
        } ).result, 'one\ntwo\nthree' )
    } )

    it( 'Long message that requires trimming', () => {
        assert.equal( sanitizeMessages( {
            maxLength: 10,
            messages: [
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 0 ),  contents: 'Message one' }
            ]
        } ).result, 'Message...' )
    } )

    it( 'Long message with emoji that requires trimming, ensure emoji length is calculated correctly', () => {
        assert.equal( sanitizeMessages( {
            maxLength: 10,
            messages: [
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 0 ),  contents: 'Message b✔' }
            ]
        } ).result, 'Message...' )
    } )

    it( `Long message that can't be trimmed should be empty`, () => {
        assert.equal( sanitizeMessages( {
            maxLength: 10,
            messages: [
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 0 ),  contents: 'Message_very_long_cant_be_trimmed' }
            ]
        } ).result, '' )
    } )

    it( `Second message is long and shouldn't be included`, () => {
        assert.equal( sanitizeMessages( {
            maxLength: 15,
            messages: [
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 0 ),  contents: 'Message one' },
                { channel_id: '', message_id: '', username: 'user', created_datetime: new Date( 10 ),  contents: 'Message two' }
            ]
        } ).result, 'Message one' )
    } )

} )
