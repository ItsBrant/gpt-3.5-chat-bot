require('dotenv/config');
const { Client, IntentsBitField, ActivityType } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

let status = [
  {
    name: 'The Destruction of AMC West Palm Beach',
    type: ActivityType.Streaming,
    url: 'https://www.youtube.com/watch?v=bNUKhcIpRGU',
  },
  {
    name: 'Eric fall down the stairs',
    type: ActivityType.Watching,
  },
  {
    name: 'Witt Lowry',
    type: ActivityType.Listening,
  },
];

client.on('ready', (c) => {
  console.log(`✅ ${c.user.tag} is online.`);

  setInterval(() => {
    let random = Math.floor(Math.random() * status.length);
    client.user.setActivity(status[random]);
  }, 10000);
});

const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});
const openai = new OpenAIApi(configuration);

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith('!')) return;

  let conversationLog = [{ role: 'system', content: 'You are a friendly chatbot.' }];

  try {
    await message.channel.sendTyping();

    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
      if (message.content.startsWith('!')) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;

      conversationLog.push({
        role: 'user',
        content: msg.content,
      });
    });

    const result = await openai
      .createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: conversationLog,
        // max_tokens: 256, // limit token usage
      })
      .catch((error) => {
        console.log(`OPENAI ERR: ${error}`);
      });

      let reply = result.data.choices[0].message?.content;

      try {
        if (reply?.length > 2000) {
          // If the reply length is over 2000 characters, send a txt file.
          const buffer = Buffer.from(reply, 'utf8');
          const txtFile = new AttachmentBuilder(buffer, { name: `${message.author.tag}_response.txt` });
      
          message.reply({ files: [txtFile] }).catch(() => {
            message.channel.send({ content: `${message.author}`, files: [txtFile] });
          });
        } else {
          message.reply(reply).catch(() => {
            message.channel.send(`${message.author} ${reply}`);
          });
        }
      } catch (error) {
        message.reply(`Something went wrong. Try again in a bit.`).then((msg) => {
          setTimeout(async () => {
            await msg.delete().catch(() => null);
          }, 5000);
        });
      
        console.log(`Error: ${error}`);
      }
      
      client.login(process.env.TOKEN);
      
  } catch (error) {
    console.log(`ERR: ${error}`);
  }
});

client.login(process.env.TOKEN);