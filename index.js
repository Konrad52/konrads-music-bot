const discord = require('discord.js');
const client = new discord.Client();

const ytdl = require('ytdl-core');

const prefix = ".";

var servers = {};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    if (!message.content.startsWith(prefix))
        return;

    const input = message.content.substring(prefix.length);
    const split = input.split(" ");
    const command = split[0];
    const args = split.slice(1, split.length);

    switch (command) {
        case 'play':
            function play(connection, server) {
                server.dispatcher = connection.play(ytdl(server.queue[0], {quality: 'highestaudio', filter: 'audioonly'}));
                server.queue.shift();
                server.dispatcher.on('end', () => {
                    if (server.queue[0]) {
                        play(connection, server);
                    } else {
                        connection.disconnect();
                    }
                });
            }

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

            if (!servers[message.guild.id]) {
                servers[message.guild.id] = {
                    queue: [],
                    dispatcher: null
                }
            }

            let server = servers[message.guild.id];
            server.queue.push(args[0]);
        
            if (!message.guild.voice.connection) {
                message.member.voice.channel.join().then((connection) => {
                    play(connection, server);
                });
            } else {
                message.channel.send('I\'m already in a voice channel!');
                return;
            }

            break;
    }
});

client.login(process.env.TOKEN);