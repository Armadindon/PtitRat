//IMPORTS
const fetch = require('node-fetch');
global.fetch = fetch;
const fs = require('fs');
const Unsplash = require('unsplash-js').default;
const toJson = require('unsplash-js').toJson;
const Discord = require('discord.js');
const client = new Discord.Client();

//CONFIG
const params = JSON.parse(fs.readFileSync('params.json', 'utf-8'));

const unsplash = new Unsplash({
    accessKey: params.unsplashAPI,
    privateKey: params.unsplashPrivateKey
});

//FONCTIONS


const getImageByKeyword = (topic, channel) =>{
    try{
        unsplash.photos.getRandomPhoto({query: topic})
            .then(toJson)
            .then(json => {
                const img = json.urls.regular;
                const attachment = new Discord.MessageAttachment(img, topic + '.jpg');
                channel.send(attachment);
            });

    } catch (e) {
        channel.send('Je n\'ai pas pu récupérer une image, sois Baptiste est une merde, soit j\'ai atteint ma limite de 50 requêtes par heure !')
    }
};


//VARIABLES

//CODE

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {

    if(msg.content.startsWith("!pr ")){
        let command = msg.content.replace('!pr ', '');

        switch (command) {
            case 'waf':
                getImageByKeyword('dog', msg.channel);
                break;

            case 'chat':
                getImageByKeyword('cat', msg.channel);
                break;

            case 'fuck Binj':
                break;

            case 'kamoulox':
                break
        }
    }


});

client.on('voiceStateUpdate', async (old, current)=>{
    if((current.channel) && current.member.id === params.binjId){
       const connection = await current.channel.join();
       const dispatcher = connection.play('assets/fckBinj.mp3');
       dispatcher.resume();
       dispatcher.on('finish', () => {
           current.channel.leave();
           dispatcher.destroy(); // end the stream
       });
   }
});

client.login(params.discordToken);