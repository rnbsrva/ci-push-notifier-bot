require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const subscribers = new Set(); 

app.post(`/bot`, async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  if (text === "/start" || text === "/subscribe") {
    subscribers.add(chatId);
    await sendMessage(chatId, "✅ Subscribed to CI/CD push notifications!");
  } else if (text === "/unsubscribe") {
    subscribers.delete(chatId);
    await sendMessage(chatId, "❌ Unsubscribed.");
  } else {
    await sendMessage(chatId, "Use /subscribe to get notified on main branch push.");
  }

  res.sendStatus(200);
});

app.post('/github-webhook', async (req, res) => {
  const body = req.body;

  console.log("GitHub Webhook Received:", JSON.stringify(body, null, 2));

  if (body.ref === 'refs/heads/main') {
    const pusher = body.pusher.name;
    const repo = body.repository.full_name;
    const commits = body.commits.map(c => `- ${c.message} by ${c.author.name}`).join('\n');

    const text = `🚀 Push to *main* in _${repo}_ by ${pusher}\n\n${commits}`;
    for (const chatId of subscribers) {
      await sendMessage(chatId, text);
    }
  }

  res.sendStatus(200);
});

async function sendMessage(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
  const result = await res.json();
  console.log("Telegram response:", result); 
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot is running on port ${PORT}`));
