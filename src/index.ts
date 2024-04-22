import 'dotenv/config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { WebhookClient, Client, IntentsBitField } from 'discord.js';
import {
  DISCORD_TOKEN,
  DISCORD_WEBHOOK_URL,
  TELEGRAM_API_KEY,
  ZEALY_API_KEY,
} from './utils/env-vars';
import { bot } from './telegram/client';
import express from 'express';

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
});

const subdomain = 'swapxfi';
const page = 0;
const limit = 20;

const channelUsername = 'SwapXfiannouncements1';
const discordChannelId = '1202651838147592222';
const color = parseInt('01FE89', 16);
const title = 'New Announcement!';
const questTitle = '**🕵️‍♀️ New Zealy Quest Published! 🕵️‍♂️**';

client.on('ready', (c) => {
  console.log(`Logged in as ${c.user!.tag}!`);
  console.log('Zealy bot started...');
});

async function fetchNewestPublishedQuest(
  subdomain: string,
  ZEALY_API_KEY: string | undefined
) {
  try {
    const response = await axios.get(
      `https://api-v2.zealy.io/public/communities/${subdomain}/quests`,
      {
        headers: {
          'x-api-key': ZEALY_API_KEY,
        },
      }
    );

    const sortedQuests = response.data.sort((a: any, b: any) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const newestPublishedQuest = sortedQuests.find(
      (quest: any) => quest.published
    );

    return newestPublishedQuest;
  } catch (error) {
    console.error('Error fetching quests:', error);
    throw error;
  }
}

client.on('messageCreate', async (message) => {
  if (
    message.channel.id === discordChannelId &&
    message.content.includes('A new quest has been published')
  ) {
    try {
      const newestQuest = await fetchNewestPublishedQuest(
        subdomain,
        ZEALY_API_KEY
      );

      if (newestQuest) {
        const msg = `
${newestQuest.name}

[Quest Link](https://zealy.io/cw/${subdomain}/questboard/users/${newestQuest.id})
`;
        const embed = {
          title: questTitle,
          description: msg,
          color: color,
        };

        await message.channel.send({ embeds: [embed] });
        await bot.sendMessage(`@${subdomain}`, `${questTitle}\n${msg}`, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        });
      } else {
        console.log('No published quests found.');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
});

client.login(DISCORD_TOKEN);

bot.on('channel_post', async (msg) => {
  if (msg.chat.username === channelUsername) {
    const discordWebhook = new WebhookClient({ url: DISCORD_WEBHOOK_URL });

    try {
      await discordWebhook.send('@everyone');

      if (msg.photo) {
        const photoFileId = msg.photo[msg.photo.length - 1].file_id;
        const photoInfo = await bot.getFile(photoFileId);
        const photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_API_KEY}/${photoInfo.file_path}`;

        const embed = {
          title: title,
          image: { url: photoUrl },
          description: msg.caption || '',
          color: color,
        };

        await discordWebhook.send({ embeds: [embed] });
      } else if (msg.video) {
        const videoFileId = msg.video.file_id;
        const videoInfo = await bot.getFile(videoFileId);
        const videoUrl = `https://api.telegram.org/file/bot${TELEGRAM_API_KEY}/${videoInfo.file_path}`;

        const embed = {
          title: title,
          description: msg.caption || '',
          color: color,
        };
        await discordWebhook.send({ files: [videoUrl] });
        await discordWebhook.send({ embeds: [embed] });
      } else if (msg.poll) {
        const imageUrl =
          'https://cdn.discordapp.com/attachments/1001892605551988886/1222966940277145863/image.png?ex=661823b8&is=6605aeb8&hm=93985b7311b72c007d55eada492126a61f6bc8acc8f8a4f1cb3ded8644d67469&';
        const pollMessageLink = `https://t.me/${msg.chat.username}/${msg.message_id}`;
        const message = `
Head over to Telegram to participate in our poll!

TG poll message link: ${pollMessageLink}
`;

        const embed = {
          title: title,
          image: { url: imageUrl },
          description: message,
          color: color,
        };

        await discordWebhook.send({ embeds: [embed] });
      } else {
        const embed = {
          title: title,
          description: msg.text || '',
          color: color,
        };

        await discordWebhook.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Error sending announcement:', error);
    }
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.onText(/\/leaderboard/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const response = await axios.get(
      `https://api-v1.zealy.io/communities/${subdomain}/leaderboard`,
      {
        params: {
          page: page,
          limit: limit,
        },
        headers: {
          'x-api-key': ZEALY_API_KEY,
        },
      }
    );

    const leaderboard = response.data.leaderboard;
    let message = '<b>🏆 Zealy Top 20 🏆</b>\n\n';

    leaderboard.forEach((user: { name: string; xp: number }, index: number) => {
      let emoji;
      switch (index) {
        case 0:
          emoji = '🥇';
          break;
        case 1:
          emoji = '🥈';
          break;
        case 2:
          emoji = '🥉';
          break;
        default:
          emoji = `${index + 1}.`;
      }
      message += `${emoji} ${user.name} (${user.xp} XP)\n`;
    });

    message +=
      '\n<b><a href="https://zealy.io/cw/swapxfi/leaderboard">Zealy Leaderboard</a></b>';

    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error(error);
  }
});

const app = express();

const apiKey = '5888a6800dbac634e52d8504f097e064';

app.post('/claim', express.raw({ type: 'application/json' }), (req, res) => {
  const payload = req.body;
  const headers = req.headers;

  if (apiKey !== headers['x-api-key']) {
    throw new Error('Invalid API Key');
  }

  const success = true; // Replace with custom logic

  if (!success) {
    return res.status(400).send({
      message: 'Validation failed', // Replace with custom error message - will be displayed to the user
    });
  }

  return res.status(200).send({
    message: 'Quest completed',
  });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
