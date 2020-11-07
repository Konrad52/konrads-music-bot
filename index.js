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

    if (!servers[message.guild.id]) {
        servers[message.guild.id] = {
            queue: [],
            current: '',
            dispatcher: null
        }
    }
    const server = servers[message.guild.id];

    switch (command) {
        case 'play':
            function play(connection, server) {
                server.dispatcher = connection.play(ytdl(server.queue[0], {quality: 'highestaudio', filter: 'audioonly'}));
                server.current = server.queue[0];
                server.queue.shift();
                server.dispatcher.on('end', () => {
                    if (server.queue[0]) {
                        play(connection, server);
                    } else {
                        connection.disconnect();
                        server.current = '';
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

            server.queue.push(args[0]);
        
            if (!message.guild.voice || !message.guild.voice.channel) {
                message.member.voice.channel.join().then((connection) => {
                    connection.voice.setSelfDeaf(true);
                    play(connection, server);
                });
            } else {
                message.channel.send('I\'m already in a voice channel!');
                return;
            }

            break;
        case 'queue':
            let queueString = '';
            let id = 1;
            if (server.queue.length > 0) {
                ytdl.getBasicInfo(server.current, {}).then((err, info) => {
                    if (err) throw err;
                    queueString += 'Currently playing: ' + info.title + '\n';
                }).then(() => {
                    server.queue.forEach(song => {
                        ytdl.getBasicInfo(song, {}).then((err, info) => {
                            if (err) throw err;
                            queueString += id.toString() + '. ' + info.title + '\n';
                        });
                        id++;
                    });            
                }).then(() => {
                    message.channel.send(
                        `\`\`\`python\n${queueString}\`\`\``
                    );
                });
            } else {
                if (server.current == '') {
                    queueString = '- No songs on queue.\n'
                    message.channel.send(
                        `\`\`\`python\n${queueString}\`\`\``
                    );
                } else {
                    ytdl.getBasicInfo(server.current, {}).then((err, info) => {
                        if (err) throw err;
                        queueString += 'Currently playing: ' + info.title + '\n';
                    }).then(() => {
                        message.channel.send(
                            `\`\`\`python\n${queueString}\`\`\``
                        );
                    });
                }
            }
            break;
    }
});

client.login(process.env.TOKEN);