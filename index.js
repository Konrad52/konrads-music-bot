const getYoutubeTitle = require('get-youtube-title')
const getYoutubeId = require('get-youtube-id');
const discord = require('discord.js');
const request = require('request');
const ytdl = require('ytdl-core');
const fs = require('fs');

const client = new discord.Client();

require('dotenv').config();

var prefix = ".";
var servers = {};

function isYoutube(string) {
    return string.toLowerCase().indexOf("youtube.com") > -1;
}

function getID(string, callback) {
    if (isYoutube(string)) {
        callback(getYoutubeId(string));
    } else {
        searchYoutube(string, function (id) {
            callback(id);
        });
    }
}

function dispatcherEnd(server, message) {
    if (server.queue[0]) {
        setTimeout(() => {play(server.connection, message)}, 20000);
    } else {
        server.current = '';
        setTimeout(() => {server.connection.disconnect()}, 20000);
    }
}

function dispatcherEndNoTimeout(server, message) {
    if (server.queue[0]) {
        play(server.connection, message);
    } else {
        server.current = '';
        server.connection.disconnect();
    }
}

function play(connection, message) {
    const server = servers[message.guild.id];
    
    server.current = server.queue[0];
    server.queue.splice(0, 1);
    server.connection = connection;
    
    let ytdlInstance = ytdl("https://www.youtube.com/watch?v=" + server.current, {quality: 'highestaudio', filter: 'audioonly', highWaterMark: 1 << 25});
    message.channel.send('Currently playing: "' + server.current + '"');

    ytdlInstance.on('end', () => {
        dispatcherEnd(server, message);
    });

    connection.play(ytdlInstance);
    server.dispatcher = ytdlInstance;
}

function searchYoutube(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + process.env.YT_API_KEY, function(error, response) {
        if (error) throw error;
        callback(JSON.parse(response.body).items[0].id.videoId);
    });
}

function queue(queueString, server, id, callback) {
    if (id < server.queue.length)
        getYoutubeTitle(server.queue[id], function(err, title) {
            if (err) throw err;
            queueString += ' - ' (id + 1) + ': "' + title + '"\n';
            id++;
            queue(queueString, server, id, callback);
        });
    else callback(queueString);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    if (!message.content.startsWith(prefix))
        return;

    if (!servers[message.guild.id]) {
        servers[message.guild.id] = {
            queue: [],
            current: '',
            dispatcher: null,
            connection: null
        }
    }
    const server = servers[message.guild.id];

    const input = message.content.substring(prefix.length);
    const split = input.split(" ");
    const command = split[0];
    const args = split.slice(1, split.length);

    switch (command) {
        case 'p':
        case 'play':
            if (!message.member.voice.channel) {
                message.channel.send('You must be in a voice channel to use this command!');
                return;
            }
            if (args.length < 1) {
                message.channel.send('You must specify what to play!');
                return;
            }
        
            let search = '';
            if (!isYoutube(args[0]))
                search = message.content.substring(prefix.length + command.length + 1);
            else
                search = args[0];
            
            getID(search, function(id) {
                server.queue.push(id);

                if (!message.guild.voice || !message.guild.voice.channel) {
                    message.member.voice.channel.join().then((connection) => {
                        connection.voice.setSelfDeaf(true);
                        play(connection, message);
                    });
                } else {
                    if (message.member.voice && message.member.voice.channelID == message.guild.voice.channelID)
                        message.channel.send('Song added to queue: "' + id + '"\nTo get the current queue type: `.queue`.');
                    else
                        message.channel.send('I\'m already in another voice channel!');
                    return;
                }
            });

            break;

        case 's':
        case 'skip':
            if (server.dispatcher)
                dispatcherEndNoTimeout(server, message);
            break;

        case 'r':
        case 'remove':
            if (args.length > 0) {
                if (args.length != 1) {
                    message.channel.send('Too many arguments!');
                    return;
                }
            } else {
                message.channel.send('You need to specify the song\'s number that you want to remove.');
                return;
            }

            if (isNaN(args[0])) {
                message.channel.send('You need to specify the song\'s number that you want to remove.');
                return;
            }
            
            if (parseInt(args[0]) > server.queue.length + 1 && parseInt(args[0]) > 0) {
                message.channel.send('Invalid song number!');
                return;
            }

            getYoutubeTitle(server.queue[parseInt(args[0]) - 1], function(err, title) {
                if (err) throw err;
                message.channel.send('The song "' + title + '" has been removed from the queue.');
            });
            server.queue.splice(parseInt(args[0]) - 1, 1);
            break;

        case 'fuckoff':
        case 'leave':
        case 'stop':
            server.current = '';
            server.queue = [];
            if (server.dispatcher)
                dispatcherEndNoTimeout(server, message);
            break;

        case 'q':
        case 'queue':
            let queueString = '';

            if (server.current == '') {
                message.channel.send('```python\n - No songs on queue\n```');
                return;
            }

            let id = 0;
            getYoutubeTitle(server.current, function(err, title) {
                if (err) throw err;
                queueString += ' - Currently playing: "' + title + '"\n';
                queue(queueString, server, id, (finalString) => {
                    message.channel.send('```python\n' + finalString + '```');
                });
            });
            break;
    }
});

client.login(process.env.TOKEN);