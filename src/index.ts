import 'dotenv/config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { ZEALY_API_KEY } from './utils/env-vars';
import { bot } from './telegram/client';

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
});

const subdomain = 'swapxfi';
const page = 0;
const limit = 20;

const channelUsername = 'ilchuDevChannel';

console.log('Zealy bot started...');

bot.on('message', (msg) => {
  if (msg.chat.username === channelUsername) {
    console.log(`New announcement in ${channelUsername}: ${msg.text}`);
    if (msg.photo) {
      console.log('Photo:', msg.photo);
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
