const discord = require('discord.js');
const client = new discord.Client();

const ytdl = require('ytdl-core');

const PREFIX = ".";

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    if (!message.content.startsWith(PREFIX))
        return;

    const input = message.content.substring(PREFIX.length);
    const split = input.split(" ");
    const command = split[0];
    const args = split.slice(1, split.length);

    switch (command) {
        case 'play':
            if (args.length != 1)
                message.channel.send('You must specify what to play!');

            if (!message.member.voice.channel)
                message.channel.send('You must be in a voice channel to use this command!');
            break;
    }
});

client.login(process.env.TOKEN);