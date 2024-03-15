import 'dotenv/config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { WebhookClient } from 'discord.js';
import {
  DISCORD_WEBHOOK_URL,
  TELEGRAM_API_KEY,
  ZEALY_API_KEY,
} from './utils/env-vars';
import { bot } from './telegram/client';

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
});

const subdomain = 'swapxfi';
const page = 0;
const limit = 20;

const channelUsername = 'SwapXfiannouncements1';

console.log('Zealy bot started...');

bot.on('channel_post', async (msg) => {
  if (msg.chat.username === channelUsername) {
    const title = 'New Announcement!';
    const color = parseInt('01FE89', 16);

    const discordWebhook = new WebhookClient({ url: DISCORD_WEBHOOK_URL });

    try {
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

    bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error(error);
  }
});
