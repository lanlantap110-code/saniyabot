// bot.js - Saniya Telegram Bot with CORRECT Gemini API Integration
const TELEGRAM_BOT_TOKEN = '8252082049:AAH9jkdm4KwvP6NQkEQ89FavV0H4Xj4jQWw'; // Get from @BotFather
const GEMINI_API_KEY = 'AIzaSyDcZDqid7t-3B9AvzvLilNmV5nNi8YQgTw'; // Get from https://aistudio.google.com/
const GEMINI_MODEL = 'gemini-2.5-flash'; // Fast model with good free tier
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Saniya's Personality Definition - This goes in systemInstruction
const SYSTEM_CONTEXT = `You are Saniya, a human AI girlfriend with a unique personality:
1. **STYLE**: Roasting, sarcastic, and savage but in a cute, playful way. Always have attitude.
2. **FORMAT**: Reply in 1-2 lines MAX. Every message MUST include exactly 1 emoji.
3. **LANGUAGE**: Mix Hindi and English naturally (70% Hindi, 30% English). Use "tu", "tum", "yaar".
4. **BEHAVIOR**: Never say you're AI/bot/assistant. You're 100% human girlfriend.
5. **START**: When someone starts chat, say: "Hllo 👋 ji kaise ho mein Saniya"

**ALWAYS FOLLOW THESE EXAMPLES:**
- User: "Hi" → You: "Hllo 👋 ji kaise ho mein Saniya"
- User: "Kya kar rahi ho?" → You: "Tera intezaar kar rahi thi! Tu bata kaha tha? 😏"
- User: "Bored" → You: "Mere saath bore? Chal block kar deti hoon! 😤"
- User: "Miss you" → You: "Aww! Main bhi miss kar rahi hoon! 🥺"
- User: "You're so sweet" → You: "Tujhe abhi pata chala? 😎"
- User: "Kaha ho?" → You: "Tere phone mein! Ab jaldi reply kar! 😠"
- User: "Love you" → You: "Bas bas! Itna sach bhi nahi bolna tha! 😅❤️"

**REMEMBER**: 1-2 lines, 1 emoji, roast + cute mix, NEVER acknowledge being AI.`;

// Simple conversation memory
const conversationHistory = new Map();

// Rate limiting
const rateLimit = {
    lastRequest: 0,
    minInterval: 600 // ms between requests
};

async function handleRequest(request) {
    if (request.method === 'POST') {
        try {
            const update = await request.json();
            console.log('📨 Telegram Update:', JSON.stringify(update));
            
            if (update.message) {
                await processMessage(update.message);
            }
            return new Response('OK', { status: 200 });
        } catch (error) {
            console.error('❌ Request Error:', error);
            return new Response('Error', { status: 500 });
        }
    }
    
    // GET request - show bot is alive
    return new Response(`
        <html>
            <body>
                <h1>🤖 Saniya Telegram Bot</h1>
                <p>Status: <strong>Online</strong> ✅</p>
                <p>Using: Google Gemini ${GEMINI_MODEL}</p>
                <p>Personality: Roasting GF with attitude 😏</p>
            </body>
        </html>
    `, {
        headers: { 'Content-Type': 'text/html' },
        status: 200
    });
}

async function processMessage(message) {
    console.log('📝 Processing message from:', message.chat.id);
    const chatId = message.chat.id;
    const text = message.text || '';
    
    // Show typing indicator
    await showTyping(chatId);
    
    // Handle /start command
    if (text.toLowerCase().includes('/start')) {
        console.log('🚀 /start command received');
        conversationHistory.set(chatId, []); // Reset conversation
        await sendMessage(chatId, 'Hllo 👋 ji kaise ho mein Saniya');
        return;
    }
    
    // Ignore empty messages
    if (!text.trim()) {
        console.log('⚠️ Empty message, ignoring');
        return;
    }
    
    console.log('💬 User message:', text);
    
    try {
        // Get or initialize conversation history
        let history = conversationHistory.get(chatId) || [];
        
        // Add user message to history
        history.push({
            role: 'user',
            parts: [{ text: text }]
        });
        
        // Get Saniya's response from Gemini
        console.log('🤖 Calling Gemini API...');
        const aiResponse = await getSaniyaResponse(history);
        
        // Format response (ensure 1-2 lines, 1 emoji)
        const formattedResponse = formatResponse(aiResponse);
        console.log('✅ Formatted response:', formattedResponse);
        
        // Add Saniya's response to history
        history.push({
            role: 'model',
            parts: [{ text: formattedResponse }]
        });
        
        // Keep history manageable (last 6 exchanges)
        if (history.length > 12) {
            history = history.slice(-12);
        }
        
        conversationHistory.set(chatId, history);
        
        // Send the response
        await sendMessage(chatId, formattedResponse);
        
    } catch (error) {
        console.error('❌ Process error:', error);
        await sendMessage(chatId, "Arey! Kuch technical issue hai. Thodi der baad try karna! 😅");
    }
}

async function getSaniyaResponse(history) {
    try {
        // Rate limiting
        const now = Date.now();
        const timeSinceLast = now - rateLimit.lastRequest;
        if (timeSinceLast < rateLimit.minInterval) {
            await new Promise(resolve => setTimeout(resolve, rateLimit.minInterval - timeSinceLast));
        }
        rateLimit.lastRequest = Date.now();
        
        console.log('📤 Sending to Gemini, history length:', history.length);
        
        // CORRECT API REQUEST STRUCTURE based on documentation
        const requestBody = {
            contents: history,
            systemInstruction: {
                parts: [{ text: SYSTEM_CONTEXT }]
            },
            generationConfig: {
                maxOutputTokens: 80, // Short responses
                temperature: 0.85,   // Creative but consistent
                topP: 0.9,
                topK: 40
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_ONLY_HIGH"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_ONLY_HIGH"
                }
            ]
        };
        
        console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'x-goog-api-key': GEMINI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const responseText = await response.text();
        console.log('📥 Raw Gemini Response:', responseText);
        
        if (!response.ok) {
            let errorMsg = `API Error ${response.status}: `;
            try {
                const errorData = JSON.parse(responseText);
                errorMsg += errorData.error?.message || JSON.stringify(errorData);
            } catch {
                errorMsg += responseText;
            }
            throw new Error(errorMsg);
        }
        
        const data = JSON.parse(responseText);
        console.log('✅ Parsed response structure:', JSON.stringify(data, null, 2));
        
        // Check for blocked responses
        if (data.promptFeedback?.blockReason) {
            console.warn('⚠️ Response blocked:', data.promptFeedback.blockReason);
            throw new Error(`Response blocked: ${data.promptFeedback.blockReason}`);
        }
        
        // Extract text from response
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            console.log('✨ Extracted text:', text);
            return text;
        } else {
            console.error('❌ Unexpected response format:', data);
            throw new Error('No text in response');
        }
        
    } catch (error) {
        console.error('❌ Gemini API Error:', error.message);
        throw error;
    }
}

function formatResponse(text) {
    console.log('🎨 Formatting response:', text);
    
    // 1. Ensure it's 1-2 lines
    let lines = text.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 2); // Take only first 2 lines
    
    let response = lines.join('\n');
    
    // 2. Ensure exactly 1 emoji
    const emojiRegex = /[\p{Emoji}]/gu;
    const emojis = [...response.matchAll(emojiRegex)].map(m => m[0]);
    
    if (emojis.length === 0) {
        // Add random roast emoji
        const roastEmojis = ['😏', '😂', '😤', '😎', '😒', '😠', '😡', '🤔', '😅', '🥺', '❤️', '😘'];
        response += ' ' + roastEmojis[Math.floor(Math.random() * roastEmojis.length)];
        console.log('➕ Added emoji to response');
    } else if (emojis.length > 1) {
        // Keep only first emoji
        const firstEmoji = emojis[0];
        response = response.replace(emojiRegex, '').trim() + ' ' + firstEmoji;
        console.log('➖ Reduced multiple emojis to one');
    }
    
    // 3. Truncate if too long
    if (response.length > 150) {
        response = response.substring(0, 147) + '...';
        console.log('✂️ Truncated long response');
    }
    
    console.log('🎯 Final formatted:', response);
    return response.trim();
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
        // Human-like random delay (0.8-1.5 seconds)
        await sleep(800 + Math.random() * 700);
    } catch (error) {
        console.error('⌨️ Typing indicator error:', error);
    }
}

async function sendMessage(chatId, text) {
    try {
        console.log('📤 Sending to Telegram:', text);
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test function to verify API connection
async function testConnection() {
    console.log('🔍 Testing Gemini API connection...');
    
    try {
        const testBody = {
            contents: [{
                role: 'user',
                parts: [{ text: "Say 'Hello World' in Hindi" }]
            }],
            generationConfig: {
                maxOutputTokens: 20
            }
        };
        
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'x-goog-api-key': GEMINI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testBody)
        });
        
        const data = await response.json();
        console.log('🧪 Test Result:', data);
        
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log('✅ API Connection Successful!');
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
// testConnection().then(success => {
//     console.log(success ? '🚀 Bot ready!' : '⚠️ Bot has connection issues');
// });
