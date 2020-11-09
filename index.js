const discord = require('discord.js');
const ytdl = require('ytdl-core');
const util = require('util');
const client = new discord.Client();

var prefix = ".";

var servers = {};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

function play(connection, server, message) {
    server.current = server.queue[0];
    server.queue.splice(0, 1);
    
    server.ytdlInstance = ytdl(server.current, {quality: 'highestaudio', filter: 'audioonly', highWaterMark: 1 << 25});
    server.ytdlInstance.on("info", (info) => {
        server.current = info.title;
        console.log(info.title);
    });
    server.ytdlInstance.on('end', () => {
        if (server.queue[0]) {
            server.ytdlInstance = undefined;
            play(connection, server, message);
        } else {
            connection.disconnect();
            server.current = '';
        }
    });

    connection.play(server.ytdlInstance);
}

client.on('message', message => {
    if (!message.content.startsWith(prefix))
        return;

    if (!servers[message.guild.id]) {
        servers[message.guild.id] = {
            queue: [],
            current: '',
            ytdlInstance: null
        }
    }
    const server = servers[message.guild.id];

    const input = message.content.substring(prefix.length);
    const split = input.split(" ");
    const command = split[0];
    const args = split.slice(1, split.length);

    switch (command) {
        case 'play':
            if (!message.member.voice.channel) {
                message.channel.send('You must be in a voice channel to use this command!');
                return;
            }

            if (args.length < 1) {
                message.channel.send('You must specify what to play!');
                return;
            }

            if (args.length > 1) {
                message.channel.send('You must ONLY specify what to play!');
                return;
            }
        
            if (!message.guild.voice || !message.guild.voice.channel) {
                message.member.voice.channel.join().then((connection) => {
                    server.queue.push(args[0]);
                    connection.voice.setSelfDeaf(true);
                    play(connection, server, message);
                });
            } else {
                if (message.member.voice && message.member.voice.channelID == message.guild.voice.channelID) {
                    server.queue.push(args[0]);
                    message.channel.send('Song added to queue! To get the current queue type: `.queue`.');
                } else
                    message.channel.send('I\'m already in a voice channel!');
                return;
            }

            break;

        case 'skip':
            server.ytdlInstance.end();
            break;

        case 'stop':
            server.current = '';
            server.queue = [];
            server.ytdlInstance.end();
            //if (message.guild.voice && message.guild.voice.connection) message.guild.voice.connection.disconnect();
            break;

        case 'queue':
            let queueString = '';
            let id = 1;
            if (server.queue.length > 0) {
                queueString += 'Currently playing: ' + server.current + '\n';
                server.queue.forEach(song => {
                    queueString += id.toString() + '. ' + song + '\n';
                    id++;
                });            
            } else {
                if (server.current == '')
                    queueString = '- No songs on queue.\n'
                else
                    queueString = 'Currently playing: ' + server.current + '\n';
            }
            message.channel.send(
                `\`\`\`python\n${queueString}\`\`\``
            );
            break;
    }
});

client.login(process.env.TOKEN);