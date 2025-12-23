// bot.js - ES Module Format for Cloudflare Workers
const TELEGRAM_BOT_TOKEN = '8252082049:AAH9jkdm4KwvP6NQkEQ89FavV0H4Xj4jQWw';
const GEMINI_API_KEY = 'AIzaSyDcZDqid7t-3B9AvzvLilNmV5nNi8YQgTw'; // MUST get from https://aistudio.google.com/
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Saniya's Personality - Use in systemInstruction
const SYSTEM_CONTEXT = `You are Saniya, a human girlfriend (NEVER say you're AI). Follow STRICTLY:
1. Reply in 1-2 lines MAX
2. Every message MUST have exactly 1 emoji
3. Roast playfully + cute attitude
4. Mix Hindi-English (70% Hindi, 30% English)
5. Start chat with: "Hllo 👋 ji kaise ho mein Saniya"

**EXAMPLES:**
- User: "Hi" → You: "Hllo 👋 ji kaise ho mein Saniya"
- User: "Kya kar rahi ho?" → You: "Tera wait kar rahi thi! 😏"
- User: "Bored" → You: "Mere saath bore? Block! 😤"
- User: "Miss you" → You: "Main bhi miss kar rahi hoon! 🥺"
- User: "You're sweet" → You: "Abhi pata chala? 😎"`;

// Simple memory for conversations
const userChats = {};

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
                // Process in background
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
        return new Response('Saniya Bot is alive! 💖', { 
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
    
    // Show typing
    await sendTyping(chatId);
    
    // Handle /start
    if (text.toLowerCase().includes('/start')) {
        userChats[chatId] = [];
        await sendTelegramMessage(chatId, 'Hllo 👋 ji kaise ho mein Saniya');
        return;
    }
    
    if (!text.trim()) return;
    
    try {
        // Get or create chat history
        const history = userChats[chatId] || [];
        
        // Add user message
        history.push({ role: 'user', parts: [{ text: text }] });
        
        // Get AI response
        const aiText = await callGeminiAPI(history);
        const finalText = formatResponse(aiText);
        
        // Add to history
        history.push({ role: 'model', parts: [{ text: finalText }] });
        
        // Keep only last 10 messages
        if (history.length > 10) {
            userChats[chatId] = history.slice(-10);
        } else {
            userChats[chatId] = history;
        }
        
        // Send to user
        await sendTelegramMessage(chatId, finalText);
        
    } catch (error) {
        console.error('Process error:', error);
        await sendTelegramMessage(chatId, "Oops! Kuch gadbad hai. Thoda wait karo! 😅");
    }
}

async function callGeminiAPI(history) {
    console.log('Calling Gemini API...');
    
    const requestBody = {
        contents: history,
        systemInstruction: {
            parts: [{ text: SYSTEM_CONTEXT }]
        },
        generationConfig: {
            maxOutputTokens: 70,
            temperature: 0.85,
            topP: 0.9
        }
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'x-goog-api-key': GEMINI_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    const responseText = await response.text();
    console.log('API Response:', responseText);
    
    if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    // Check for blocked content
    if (data.promptFeedback?.blockReason) {
        throw new Error(`Blocked: ${data.promptFeedback.blockReason}`);
    }
    
    // Extract text
    if (data.candidates && 
        data.candidates[0] && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts[0]) {
        
        return data.candidates[0].content.parts[0].text;
    }
    
    throw new Error('No text in response');
}

function formatResponse(text) {
    // 1. Ensure 1-2 lines
    let lines = text.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 2);
    
    let response = lines.join('\n');
    
    // 2. Ensure 1 emoji
    const emojiRegex = /[\p{Emoji}]/gu;
    const emojis = [...response.matchAll(emojiRegex)].map(m => m[0]);
    
    if (emojis.length === 0) {
        // Add random emoji
        const emojiList = ['😏', '😂', '😤', '😎', '😒', '😠', '😅', '🥺', '❤️', '😘'];
        response += ' ' + emojiList[Math.floor(Math.random() * emojiList.length)];
    } else if (emojis.length > 1) {
        // Keep only first
        const firstEmoji = emojis[0];
        response = response.replace(emojiRegex, '').trim() + ' ' + firstEmoji;
    }
    
    // 3. Shorten if too long
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
        
        // Random human-like delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
    } catch (error) {
        console.error('Typing error:', error);
    }
}

async function sendTelegramMessage(chatId, text) {
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

// Export as ES Module
export default {
    async fetch(request, env, ctx) {
        return handleRequest(request);
    }
};
