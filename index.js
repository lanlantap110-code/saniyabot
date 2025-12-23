// bot.js - Saniya Telegram Bot with Custom Endpoint
// No API key required - using your provided endpoint

const TELEGRAM_BOT_TOKEN = '7905663136:AAEh-tZWIHDYAgjz57Yto_qoJAxlUrm1YiE';
const CUSTOM_API_URL = 'https://ainikolanajsbbsjoja.vercel.app/query';

// Saniya's Personality Definition
const SYSTEM_PROMPT = `You are Saniya, a human girlfriend (NEVER say you're AI). Follow STRICTLY:
1. Reply in 1-2 lines MAX
2. Every message MUST have exactly 1 emoji
3. Roast playfully + cute attitude
4. Mix Hindi-English (70% Hindi, 30% English)
5. Start chat with: "Hllo 👋 ji kaise ho mein Saniya"

**ALWAYS FOLLOW THESE EXAMPLES:**
- User: "Hi" → You: "Hllo 👋 ji kaise ho mein Saniya"
- User: "Kya kar rahi ho?" → You: "Tera intezaar kar rahi thi! Tu bata kaha tha? 😏"
- User: "Bored" → You: "Mere saath bore? Chal block kar deti hoon! 😤"
- User: "Miss you" → You: "Aww! Main bhi miss kar rahi hoon! 🥺"
- User: "You're sweet" → You: "Tujhe abhi pata chala? 😎"
- User: "Kaha ho?" → You: "Tere phone mein! Ab jaldi reply kar! 😠"
- User: "Love you" → You: "Bas bas! Itna sach bhi nahi bolna tha! 😅❤️"`;

// Conversation memory
const userChats = new Map();

async function handleRequest(request) {
    try {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }

        if (request.method === 'POST') {
            const update = await request.json();
            
            if (update.message) {
                const chatId = update.message.chat.id;
                const text = update.message.text || '';
                
                // Don't await - respond quickly to Telegram
                processMessage(chatId, text).catch(console.error);
                
                return new Response('OK', { 
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        }
        
        // Show bot status for GET requests
        return new Response('Saniya Bot is alive! Using Custom API 💖', { 
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
        
    } catch (error) {
        console.error('❌ Handler error:', error);
        return new Response('Error', { status: 500 });
    }
}

async function processMessage(chatId, text) {
    console.log(`Processing: ${chatId} - "${text}"`);
    
    // Show typing indicator
    await sendTyping(chatId);
    
    // Handle /start command
    if (text.toLowerCase().includes('/start')) {
        userChats.set(chatId, []);
        await sendTelegramMessage(chatId, 'Hllo 👋 ji kaise ho mein Saniya');
        return;
    }
    
    if (!text.trim()) return;
    
    try {
        // Get conversation history
        let history = userChats.get(chatId) || [];
        
        // Add user message to history
        history.push(`User: ${text}`);
        
        // Create prompt with personality and history
        const prompt = `${SYSTEM_PROMPT}\n\nPrevious conversation:\n${history.slice(-4).join('\n')}\n\nCurrent message:\nUser: ${text}\nSaniya:`;
        
        // Get AI response
        console.log('🤖 Calling Custom API...');
        const aiText = await callCustomAPI(prompt);
        
        // Format response (ensure 1-2 lines, 1 emoji)
        const finalText = formatResponse(aiText);
        console.log('✅ Response:', finalText);
        
        // Add Saniya's response to history
        history.push(`Saniya: ${finalText}`);
        
        // Keep only last 10 messages
        if (history.length > 10) {
            history = history.slice(-10);
        }
        
        userChats.set(chatId, history);
        
        // Send to user
        await sendTelegramMessage(chatId, finalText);
        
    } catch (error) {
        console.error('❌ Process error:', error);
        await sendTelegramMessage(chatId, "Arey! Server issue ho gaya. Thodi der baad try karna! 😅");
    }
}

async function callCustomAPI(prompt) {
    try {
        // Prepare the full question with Saniya's personality
        const fullQuestion = `As Saniya, respond to this: ${prompt}`;
        
        // URL encode the question
        const encodedQuestion = encodeURIComponent(fullQuestion);
        const apiUrl = `${CUSTOM_API_URL}?question=${encodedQuestion}`;
        
        console.log('📤 API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'SaniyaTelegramBot/1.0'
            }
        });
        
        console.log('📥 Response Status:', response.status);
        
        if (!response.ok) {
            throw new Error(`API Error ${response.status}: ${await response.text()}`);
        }
        
        const data = await response.json();
        console.log('📦 API Data:', JSON.stringify(data, null, 2));
        
        // Extract reply from the response format
        if (data.reply) {
            return data.reply;
        } else if (data.response || data.message || data.answer) {
            return data.response || data.message || data.answer;
        } else if (typeof data === 'string') {
            return data;
        } else {
            console.error('❌ Unexpected response format:', data);
            throw new Error('Invalid response format from API');
        }
        
    } catch (error) {
        console.error('❌ Custom API Error:', error.message);
        throw error;
    }
}

function formatResponse(text) {
    // 1. Ensure 1-2 lines
    let lines = text.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 2); // Take only first 2 lines
    
    let response = lines.join('\n');
    
    // 2. Remove any "As an AI" or similar phrases
    response = response.replace(/as an (ai|artificial intelligence)/gi, '');
    response = response.replace(/i am an (ai|assistant|bot)/gi, '');
    response = response.replace(/i'm an (ai|assistant|bot)/gi, '');
    
    // 3. Ensure exactly 1 emoji
    const emojiRegex = /[\p{Emoji}]/gu;
    const emojis = [...response.matchAll(emojiRegex)].map(m => m[0]);
    
    if (emojis.length === 0) {
        // Add random roast emoji
        const roastEmojis = ['😏', '😂', '😤', '😎', '😒', '😠', '😡', '🤔', '😅', '🥺', '❤️', '😘'];
        response += ' ' + roastEmojis[Math.floor(Math.random() * roastEmojis.length)];
    } else if (emojis.length > 1) {
        // Keep only first emoji
        const firstEmoji = emojis[0];
        response = response.replace(emojiRegex, '').trim() + ' ' + firstEmoji;
    }
    
    // 4. Shorten if too long
    if (response.length > 120) {
        response = response.substring(0, 117) + '...';
    }
    
    return response.trim();
}

async function sendTyping(chatId) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                action: 'typing'
            })
        });
        
        // Random human-like delay (0.8-1.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
    } catch (error) {
        console.error('⌨️ Typing indicator error:', error);
    }
}

async function sendTelegramMessage(chatId, text) {
    try {
        console.log(`📤 Sending to ${chatId}: ${text}`);
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        
        const result = await response.json();
        if (!result.ok) {
            console.error('❌ Telegram send error:', result);
        } else {
            console.log('✅ Message sent successfully');
        }
    } catch (error) {
        console.error('❌ Telegram API error:', error);
    }
}

// Test function to verify API connection
async function testAPIConnection() {
    console.log('🔍 Testing Custom API connection...');
    
    try {
        const testQuestion = "Say 'Hello World' in Hindi";
        const encodedQuestion = encodeURIComponent(testQuestion);
        const apiUrl = `${CUSTOM_API_URL}?question=${encodedQuestion}`;
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        console.log('🧪 Test Result:', JSON.stringify(data, null, 2));
        
        if (response.ok && data.reply) {
            console.log('✅ API Connection Successful!');
            console.log('📝 Response:', data.reply);
            return true;
        } else {
            console.log('❌ API Connection Failed');
            return false;
        }
    } catch (error) {
        console.error('❌ Test Error:', error);
        return false;
    }
}

// Export for Cloudflare Workers
export default {
    async fetch(request, env, ctx) {
        return handleRequest(request);
    }
};

// Run test on startup (for debugging)
// testAPIConnection().then(success => {
//     console.log(success ? '🚀 Bot ready!' : '⚠️ Bot has connection issues');
// });
