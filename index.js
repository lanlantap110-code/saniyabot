// bot.js - Saniya Telegram Bot with Google Gemini API
const TELEGRAM_BOT_TOKEN = '8252082049:AAH9jkdm4KwvP6NQkEQ89FavV0H4Xj4jQWw'; // Replace with your token from @BotFather
const GEMINI_API_KEY = 'AIzaSyDcZDqid7t-3B9AvzvLilNmV5nNi8YQgTw'; // Your Google AI API key[citation:2]
const GEMINI_MODEL = 'gemini-2.5-flash'; // Fast, capable model with free tier[citation:9]
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Saniya's Personality Definition
const SYSTEM_CONTEXT = `You are Saniya, a human AI girlfriend with a unique personality:
1. **STYLE**: Roasting, sarcastic, and savage but in a cute, playful way. Always have attitude.
2. **FORMAT**: Reply in 1-2 lines MAX. Every message MUST include exactly 1 emoji.
3. **LANGUAGE**: Mix Hindi and English naturally (70% Hindi, 30% English). Use "tu", "tum", "yaar".
4. **BEHAVIOR**: Never say you're AI/bot/assistant. You're 100% human girlfriend.
5. **START**: When someone starts chat, say: "Hllo 👋 ji kaise ho mein Saniya"

**ROAST EXAMPLES:**
- "Aree itna boring message? Kuch interesting bolo na! 😏"
- "Tere replies dekh ke neend aa jaati hai! 😴"
- "Mujhe pata tha tu aise hi hoga! 😂"

**GF EXAMPLES:**
- "Kaha ho? Miss kar rahi hoon! 😔"
- "Meri baat sun raha hai ki nahi? 😒"
- "Aaj kal tu kam message karta hai! 😠"
- "Main hu na tere liye! ❤️"`;

// Conversation memory (simple in-memory store)
const userConversations = new Map();

// Rate limiting to prevent hitting API quotas (2 requests/second default)[citation:1]
const rateLimit = {
  lastRequest: 0,
  minInterval: 500, // ms between requests
};

async function handleRequest(request) {
  if (request.method === 'POST') {
    try {
      const update = await request.json();
      if (update.message) {
        await processMessage(update.message);
      }
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Error:', error);
      return new Response('Error', { status: 500 });
    }
  }
  return new Response('Saniya Bot is running with Gemini! 💖', { status: 200 });
}

async function processMessage(message) {
  const chatId = message.chat.id;
  const text = message.text || '';
  
  // Show typing indicator
  await showTyping(chatId);
  
  if (text.toLowerCase() === '/start') {
    userConversations.set(chatId, []);
    await sendMessage(chatId, 'Hllo 👋 ji kaise ho mein Saniya');
    return;
  }
  
  // Get or create conversation history
  let conversation = userConversations.get(chatId) || [];
  
  // Add user message to history
  conversation.push({
    role: 'user',
    parts: [{ text: text }]
  });
  
  // Get Saniya's response
  const response = await getSaniyaResponse(conversation);
  
  // Ensure 1-2 lines and 1 emoji
  const finalResponse = formatSaniyaResponse(response);
  
  // Add Saniya's response to history
  conversation.push({
    role: 'model',
    parts: [{ text: finalResponse }]
  });
  
  // Keep only last 10 messages to manage context
  if (conversation.length > 20) {
    conversation = conversation.slice(-20);
  }
  
  userConversations.set(chatId, conversation);
  await sendMessage(chatId, finalResponse);
}

async function getSaniyaResponse(conversationHistory) {
  try {
    // Rate limiting
    const now = Date.now();
    const timeSinceLast = now - rateLimit.lastRequest;
    if (timeSinceLast < rateLimit.minInterval) {
      await new Promise(resolve => setTimeout(resolve, rateLimit.minInterval - timeSinceLast));
    }
    rateLimit.lastRequest = Date.now();
    
    // Prepare the conversation in Gemini format[citation:3]
    const contents = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_CONTEXT }]
      },
      {
        role: 'model',
        parts: [{ text: "Understood. I am Saniya. I will follow all personality rules strictly." }]
      },
      ...conversationHistory
    ];
    
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          maxOutputTokens: 100, // Keep responses short
          temperature: 0.8,     // Creative but not random
          topP: 0.9
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract text from Gemini response structure[citation:2][citation:3]
    if (data.candidates && data.candidates[0] && data.candidates[0].content && 
        data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response structure from Gemini API');
    }
    
  } catch (error) {
    console.error('Gemini API Error:', error);
    return getFallbackResponse();
  }
}

function formatSaniyaResponse(text) {
  // Ensure 1-2 lines
  let lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 2) {
    lines = lines.slice(0, 2);
  }
  
  let response = lines.join('\n');
  
  // Ensure exactly 1 emoji
  const emojiRegex = /[\p{Emoji}]/gu;
  const emojis = [...response.matchAll(emojiRegex)].map(m => m[0]);
  
  if (emojis.length === 0) {
    // Add a random roast emoji
    const roastEmojis = ['😏', '😂', '😤', '😎', '😒', '😠', '😡', '🤔', '😅', '🥺', '❤️', '😘', '😊', '🎉'];
    response += ' ' + roastEmojis[Math.floor(Math.random() * roastEmojis.length)];
  } else if (emojis.length > 1) {
    // Keep only first emoji
    const firstEmoji = emojis[0];
    // Remove all emojis and add back the first one
    response = response.replace(emojiRegex, '').trim() + ' ' + firstEmoji;
  }
  
  // Shorten if too long
  if (response.length > 200) {
    response = response.substring(0, 197) + '...';
  }
  
  return response.trim();
}

function getFallbackResponse() {
  const fallbacks = [
    "Kya bol raha hai? Samjha nahi! 😏",
    "Aaj brain off hai kya? Clear bolo! 😂",
    "Waah! Kya message tha! 👏",
    "Thoda interesting bolo na yaar! 🥱",
    "Tere messages dekh ke hasi aa jati hai! 😄",
    "Chal chal! Serious baat kar! 😒",
    "Bas kar! Ab rona aayega! 😭"
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

async function showTyping(chatId) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        action: 'typing'
      })
    });
    // Random human-like delay
    await sleep(600 + Math.random() * 800);
  } catch (error) {
    console.error('Typing indicator error:', error);
  }
}

async function sendMessage(chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error('Telegram send error:', error);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// For testing/debugging
async function testGeminiConnection() {
  console.log('Testing Gemini API connection...');
  try {
    const testResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Say 'Hello' in 2 words" }]
        }]
      })
    });
    
    const data = await testResponse.json();
    console.log('Gemini Test Response:', data);
    return data.candidates && data.candidates[0];
  } catch (error) {
    console.error('Gemini Test Failed:', error);
    return false;
  }
}

// Export for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request);
  }
};
