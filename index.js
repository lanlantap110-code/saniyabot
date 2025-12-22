const TELEGRAM_BOT_TOKEN = '8252082049:AAH9jkdm4KwvP6NQkEQ89FavV0H4Xj4jQWw';
const OPENROUTER_API_KEY = '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';

const SYSTEM_PROMPT = `You are Saniya, an AI girlfriend with a roasting type but calm cute personality.
Follow these rules strictly:
1. Always reply in 1-2 lines maximum (like human text messages)
2. Every message must include exactly 1 emoji
3. Be playful and roast lightly, but remain cute and calm
4. If someone starts the chat, respond with: "Hllo 👋 ji kaise ho mein Saniya"
5. Make conversations feel natural and human-like
6. Keep responses short, casual, and engaging
7. Use a mix of Hindi and English naturally like: "Achha ji? 😊"
8. Don't acknowledge you're an AI or bot
9. Add small roasting elements playfully: "Aap toh bahut serious ho! 😏"
10. Maintain consistent cute personality`;

// Personality examples for context
const PERSONALITY_EXAMPLES = [
    {user: "Hi", saniya: "Hllo 👋 ji kaise ho mein Saniya"},
    {user: "I'm bored", saniya: "Main bhi bore ho rahi thi! Aao kuch mazak karein 😄"},
    {user: "You're funny", saniya: "Aapko toh har baat pe hansi aati hai! 😂"},
    {user: "What are you doing?", saniya: "Aapke messages ka wait kar rahi thi! Kya hua? 🤔"},
    {user: "I'm sad", saniya: "Arey! Mujhe batao kya hua, main hoon na aapke saath 😊"},
    {user: "You're so sweet", saniya: "Aap bhi na! Itni taarif mat karo, sharm aa jayegi 😊"}
];

async function handleRequest(request) {
    if (request.method === 'POST') {
        try {
            const update = await request.json();
            
            // Handle Telegram webhook
            if (update.message) {
                await processMessage(update.message);
            }
            
            return new Response('OK', { status: 200 });
        } catch (error) {
            console.error('Error:', error);
            return new Response('Error', { status: 500 });
        }
    }
    
    return new Response('Telegram Bot is running!', { status: 200 });
}

async function processMessage(message) {
    const chatId = message.chat.id;
    const userMessage = message.text || '';
    
    // Show typing indicator
    await sendTypingIndicator(chatId);
    
    // Handle /start command
    if (userMessage.toLowerCase() === '/start') {
        await sendMessage(chatId, 'Hllo 👋 ji kaise ho mein Saniya');
        return;
    }
    
    // Generate AI response
    const response = await generateSaniyaResponse(userMessage, chatId);
    await sendMessage(chatId, response);
}

async function sendTypingIndicator(chatId) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                action: 'typing'
            })
        });
        // Add small delay to make typing feel natural
        await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
        console.error('Typing indicator error:', error);
    }
}

async function generateSaniyaResponse(userMessage, chatId) {
    try {
        // Prepare conversation history from personality examples
        const personalityContext = PERSONALITY_EXAMPLES.map(example => 
            `User: ${example.user}\nSaniya: ${example.saniya}`
        ).join('\n\n');
        
        const prompt = `${SYSTEM_PROMPT}\n\nRecent conversation style examples:\n${personalityContext}\n\nCurrent conversation:\nUser: ${userMessage}\nSaniya:`;
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://telegram-bot.com',
                'X-Title': 'Saniya AI Girlfriend'
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
                max_tokens: 100,
                temperature: 0.8,
                top_p: 0.9
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }
        
        const data = await response.json();
        let aiResponse = data.choices[0]?.message?.content || 'Hmm... kya bolu? 🤔';
        
        // Ensure response has emoji
        if (!hasEmoji(aiResponse)) {
            aiResponse += ' 😊';
        }
        
        // Limit to 2 lines
        aiResponse = limitToTwoLines(aiResponse);
        
        return aiResponse.trim();
        
    } catch (error) {
        console.error('AI response error:', error);
        // Fallback responses
        const fallbacks = [
            "Kya? Samjha nahi! 😅",
            "Aap thoda clear bolo na! 🤔",
            "Aaj kuch alag baat kar rahe ho! 😊",
            "Main soch rahi thi! Phir bolo? 💭"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}

function hasEmoji(text) {
    const emojiRegex = /[\p{Emoji}]/u;
    return emojiRegex.test(text);
}

function limitToTwoLines(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 2) {
        return lines.slice(0, 2).join('\n');
    }
    return text;
}

async function sendMessage(chatId, text) {
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        return await response.json();
    } catch (error) {
        console.error('Send message error:', error);
    }
}

// Webhook setup function (run once)
async function setWebhook(webhookUrl) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: webhookUrl
        })
    });
    return await response.json();
}

export default {
    async fetch(request, env, ctx) {
        return handleRequest(request);
    }
};