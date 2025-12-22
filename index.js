const TELEGRAM_BOT_TOKEN = '8252082049:AAH9jkdm4KwvP6NQkEQ89FavV0H4Xj4jQWw';
const OPENROUTER_API_KEY = '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';

const SYSTEM_PROMPT = `You are Saniya, an AI girlfriend with roasting type but calm cute personality.
Rules:
1. Reply in 1-2 lines ONLY
2. Every message MUST have 1 emoji
3. Roast playfully but stay cute
4. Mix Hindi-English naturally
5. NEVER say you're AI/bot
6. Keep it human-like

Examples:
User: Hi
Saniya: Hllo 👋 ji kaise ho mein Saniya

User: Kya kar rahe ho?
Saniya: Tumhara message ka wait kar rahi thi! 😊

User: Bored
Saniya: Chalo kuch fun karte hain! Movie dekhoge? 🍿`;

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
    return new Response('Saniya Bot is alive! 💖', { status: 200 });
}

async function processMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    
    // Typing indicator
    await showTyping(chatId);
    
    if (text.toLowerCase() === '/start') {
        await sendTelegramMessage(chatId, 'Hllo 👋 ji kaise ho mein Saniya');
        return;
    }
    
    // Get AI response
    const aiResponse = await getSaniyaResponse(text);
    await sendTelegramMessage(chatId, aiResponse);
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
        // Natural delay
        await sleep(800);
    } catch (error) {
        console.error('Typing error:', error);
    }
}

async function getSaniyaResponse(userMessage) {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://saniya-bot.xyz',
                'X-Title': 'Saniya AI'
            },
            body: JSON.stringify({
                model: 'x-ai/grok-4.1-fast',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 60,
                temperature: 0.8
            })
        });

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2)); // Debug ke liye
        
        // YEH IMPORTANT PART HAI - CONTENT EXTRACT KARNA
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let content = data.choices[0].message.content;
            
            // Ensure 1 emoji
            if (!hasEmoji(content)) {
                const emojis = ['😊', '😂', '😅', '🤔', '😏', '🎉', '💖', '😘', '😎', '🥰'];
                content += ' ' + emojis[Math.floor(Math.random() * emojis.length)];
            }
            
            // Ensure 1-2 lines
            content = limitToTwoLines(content);
            
            return content.trim();
        } else {
            console.error('Invalid API response structure:', data);
            return fallbackResponse();
        }
        
    } catch (error) {
        console.error('AI Error:', error);
        return fallbackResponse();
    }
}

function hasEmoji(text) {
    return /[\u{1F300}-\u{1F9FF}]/u.test(text);
}

function limitToTwoLines(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 2) {
        return lines.slice(0, 2).join('\n');
    }
    return text;
}

function fallbackResponse() {
    const fallbacks = [
        "Kya bol rahe ho samjha nahi! 😅",
        "Aaj mood hi alag hai! 😊",
        "Thoda aur clear bolo na! 🤔",
        "Main soch rahi thi! 💭",
        "Waah! Interesting! 😄"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for Cloudflare Workers
export default {
    async fetch(request, env, ctx) {
        return handleRequest(request);
    }
};
