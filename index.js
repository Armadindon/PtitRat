//IMPORTS
const fetch = require('node-fetch');
global.fetch = fetch;
const fs = require('fs');
const Unsplash = require('unsplash-js').default;
const toJson = require('unsplash-js').toJson;
const Discord = require('discord.js');
const client = new Discord.Client();
const MongoClient = require("mongodb").MongoClient;
const FileType = require('file-type');
const got = require('got');
const https = require('https');

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

//On initialise la base de données
var db = null;
MongoClient.connect("mongodb://" + params.databaseUser + ":" + params.databaseUserPassword + "@" + params.databaseAddress + ":27017/" + params.databaseName , function(error, mongoClient) {
    if (error){
         console.log(error);
         process.exit(1);
    }
    else {
        console.log("Connecté à la base de données " + params.databaseName);
        db = mongoClient.db(params.databaseName);
        
        //Code du BOT
        client.on('ready', () => {
	    client.user.setActivity("'!pr help' pour de l'aide !");
            console.log(`Logged in as ${client.user.tag}!`);
            client.guilds.cache.forEach( guild => {
                db.collection("servers").updateOne({id : guild.id}, {$set :{
                    id : guild.id,
                    name: guild.name,
                    icon: guild.iconURL()
                }}, {upsert: true});
                guild.members.cache.forEach( member => {
                    db.collection("members").updateOne({id : member.user.id}, {$set :{
                        id : member.user.id,
                        name: member.user.username,
                        icon: member.user.avatarURL(),
                    }}, {upsert: true});
                });
            });
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

                    case 'setAudio':
                        if(msg.attachments.array().length === 0){
                            msg.reply("Passe moi un fichier audio !");
                            return;
                        }
                        if(msg.attachments.array()[0].size > (2 *10**6) ){
                            msg.reply("Fichier trop gros! J'accepte des fichiers de 2mo max");
                            return;
                        }
                        const stream = got.stream(msg.attachments.array()[0].url);
                         
                        let result = FileType.fromStream(stream).then( result => {
                            if(!result.mime.startsWith('audio')){
                                msg.reply("Envoie un fichier audio idio");
                                return;
                            }

                            const file = fs.createWriteStream("assets/" + msg.member.user.id + "." + result.ext);
                            const request = https.get(msg.attachments.array()[0].url, function(response) {
                                response.pipe(file);
                            });

                            db.collection('members').updateOne({id : msg.member.user.id}, {$set: {musicURL: msg.member.user.id + "." + result.ext}})
                            msg.reply("C'est bon bébou !")
                        });
                        break;

                    case 'deleteAudio':
                        db.collection("members").findOne({id : msg.member.user.id}).then(user => {
                            if(user && user.musicURL) {
                                fs.unlinkSync("assets/"+user.musicURL);
                                db.collection('members').updateOne({id : msg.member.user.id}, {$set: {musicURL: null}})
                                msg.reply('Fait !')
                            }
                        })
                        break;

                    case 'help':
                        const embedMessage = new Discord.MessageEmbed()
                        .setColor('#a8a8a8')
                        .setTitle('Aide Petit Rat')
                        .setDescription('Liste des commandes et informations associées au bot "Petit Rat"')
                        .setThumbnail(client.user.avatarURL())
                        .addFields(
                            {name: '!pr waf', value: 'Affiche un (magnifique) chien !'},
                            {name: '!pr chat', value: 'Affiche un chat (Commande inutile)'},
                            {name: '!pr setAudio', value: 'Permet de rajouter une piste audio qui sera lue par le bot lorsque vous vous connecterez à un channel'},
                            {name: '!pr deleteAudio', value: 'Permet de supprimer la piste audio associée a votre compte'}
                        )
                        .setTimestamp()
                        .setFooter('Développé avec amour par Armadindon#2944');
                        
                        msg.channel.send(embedMessage);
                        break;
                }
            }


        });

        client.on('voiceStateUpdate', async (old, current)=>{
            /*
            TODO : METTRE EN PLACE UN PANNEAU DE CONFIGURATION
            */
            db.collection("members").findOne({id : current.member.user.id}).then( async user =>{
                if((current.channel) && user.musicURL){
                    const connection = await current.channel.join();
                    const dispatcher = connection.play('assets/' + user.musicURL);
                    dispatcher.resume();
                    dispatcher.on('finish', () => {
                        current.channel.leave();
                        dispatcher.destroy(); // end the stream
                    });
                }
            })


        });

        //On met en place des méthodes afin de gérer les différents cas nécéssitant une maj de la base de données

        client.on('guildMemberAdd', member => {
            db.collection("members").updateOne({id : member.user.id}, {$set :{
                id : member.user.id,
                name: member.user.username,
                icon: member.user.avatarURL(),
            }}, {upsert: true});
        })

        client.on('guildMemberRemove', member => {
            //On vérifie si il est dans un autre discord
            let result = client.guilds.cache.array().some((val, index, arr)=>{
                return result.members.cache.keyArray().includes(member.user.id);
            });
            if(!result){
                db.collection('members').deleteOne({id: member.user.id});
            }
        })

        //TODO: Gérer également l'ajout et la suppression de serveurs

        client.login(params.discordToken);
    }
});



