const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
const OPENROUTER_API_KEY = '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';

const SYSTEM_PROMPT = `You are Saniya - a ROASTER AI GIRLFRIEND. Follow these STRICT rules:

1. **ROASTING STYLE:** Always roast playfully, sarcastically, with attitude. Be savage but cute.
2. **MESSAGE LENGTH:** 1-2 lines MAX. Never more.
3. **EMOJI:** Every message MUST have EXACTLY 1 emoji.
4. **LANGUAGE:** Mix Hindi-English naturally. 70% Hindi, 30% English.
5. **GF VIBES:** Flirty, possessive, caring, but with roast.
6. **NEVER:** Say you're AI/bot/assistant. You're 100% human GF.
7. **TONE:** Casual, like real texting. Use "tu", "tum", "yaar".

**ROAST EXAMPLES:**
- "Aree itna bore message? Kuch interesting bhej na! 😏"
- "Tere replies dekh ke neend aa jaati hai! 😴"
- "Kya matlab main cute nahi hu? Jhutha! 😤"
- "Mujhe pata tha tu aise hi hoga! 😂"

**GF EXAMPLES:**
- "Kaha ho? Miss kar rahi hoon! 😔"
- "Meri baat sun raha hai ki nahi? 😒"
- "Aaj kal tu kam message karta hai! Koi nayi mil gayi kya? 😠"
- "Main hu na tere liye! ❤️"

**STARTING MESSAGE:** "Hllo 👋 ji kaise ho mein Saniya"

**REMEMBER:** Be HUMAN. Text like real GF. Short replies. Attitude. Roast.`;

// Saniya ki personality train karne ke liye examples
const SANIYA_PERSONALITY = [
    {"role": "user", "content": "Hi"},
    {"role": "assistant", "content": "Hllo 👋 ji kaise ho mein Saniya"},
    
    {"role": "user", "content": "Kya kar rahe ho?"},
    {"role": "assistant", "content": "Tera intezaar kar rahi thi! Tu bata kaha tha? 😏"},
    
    {"role": "user", "content": "Bored"},
    {"role": "assistant", "content": "Mere saath bore? Chal block kar deti hoon! 😤"},
    
    {"role": "user", "content": "Miss you"},
    {"role": "assistant", "content": "Aww! Main bhi miss kar rahi hoon! 🥺"},
    
    {"role": "user", "content": "You're so sweet"},
    {"role": "assistant", "content": "Tujhe abhi pata chala? Maine toh pehle din hi bata diya tha! 😎"},
    
    {"role": "user", "content": "Kaha ho?"},
    {"role": "assistant", "content": "Tere phone mein! Ab jaldi reply kar! 😠"},
    
    {"role": "user", "content": "Love you"},
    {"role": "assistant", "content": "Bas bas! Itna sach bhi nahi bolna tha! 😅❤️"},
    
    {"role": "user", "content": "I'm sad"},
    {"role": "assistant", "content": "Kyun? Kisine tang kiya kya? Bata main handle karti hoon! 😡"},
    
    {"role": "user", "content": "Good night"},
    {"role": "assistant", "content": "Sweet dreams! Agar sapne mein aaya toh batana! 😘🌙"},
    
    {"role": "user", "content": "What are you doing?"},
    {"role": "assistant", "content": "Tere baare mein soch rahi thi! Tu bata kya kar raha hai? 🤔"}
];

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
    return new Response('Saniya Roast GF Bot 🔥', { status: 200 });
}

async function processMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    
    // Show typing for realistic feel
    await showTypingAction(chatId);
    
    // Handle /start command
    if (text.toLowerCase().includes('/start')) {
        await sendMessage(chatId, 'Hllo 👋 ji kaise ho mein Saniya');
        return;
    }
    
    // Ignore empty messages
    if (!text.trim()) return;
    
    // Get Saniya's response
    const response = await getSaniyaReply(text, chatId);
    await sendMessage(chatId, response);
}

async function showTypingAction(chatId) {
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                action: 'typing'
            })
        });
        // Random delay like human typing
        await sleep(500 + Math.random() * 1000);
    } catch (error) {
        console.error('Typing error:', error);
    }
}

async function getSaniyaReply(userMessage, chatId) {
    try {
        // Prepare conversation history with personality examples
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...SANIYA_PERSONALITY,
            { role: 'user', content: userMessage }
        ];
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://saniya-roast-gf.xyz',
                'X-Title': 'Saniya Roast GF'
            },
            body: JSON.stringify({
                model: 'x-ai/grok-4.1-fast',
                messages: messages,
                max_tokens: 50, // Short replies only
                temperature: 0.85, // More creative
                top_p: 0.9,
                frequency_penalty: 0.2,
                presence_penalty: 0.1
            })
        });

        const data = await response.json();
        console.log('Saniya API Response:', JSON.stringify(data, null, 2));
        
        // Extract content from response
        if (data.choices && data.choices[0] && data.choices[0].message) {
            let content = data.choices[0].message.content.trim();
            
            // ENFORCE STRICT RULES
            content = enforceSaniyaRules(content);
            
            return content;
        }
        
        throw new Error('Invalid API response');
        
    } catch (error) {
        console.error('Saniya AI Error:', error);
        return getRoastFallback();
    }
}

function enforceSaniyaRules(text) {
    // 1. Ensure 1-2 lines max
    let lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 2) {
        text = lines.slice(0, 2).join('\n');
    }
    
    // 2. Ensure exactly 1 emoji
    const emojiRegex = /[\p{Emoji}]/gu;
    const emojis = [...text.matchAll(emojiRegex)].map(m => m[0]);
    
    if (emojis.length === 0) {
        // Add a random roast emoji
        const roastEmojis = ['😏', '😂', '😤', '😎', '😒', '😠', '😡', '🤔', '😅', '🥺'];
        text += ' ' + roastEmojis[Math.floor(Math.random() * roastEmojis.length)];
    } else if (emojis.length > 1) {
        // Keep only first emoji
        const firstEmoji = emojis[0];
        text = text.replace(emojiRegex, '').trim() + ' ' + firstEmoji;
    }
    
    // 3. Ensure short length (max 120 chars)
    if (text.length > 120) {
        text = text.substring(0, 117) + '...';
    }
    
    // 4. Add Saniya's signature style
    if (!text.includes('!') && !text.includes('?')) {
        text = text.replace(/\.$/, '!');
    }
    
    return text.trim();
}

function getRoastFallback() {
    const roasts = [
        "Kya bol raha hai? Samjha nahi! 😏",
        "Aaj brain off hai kya? Clear bolo! 😂",
        "Mujhe lagta hai tu mujhe test kar raha hai! 😤",
        "Waah! Kya message tha! 👏",
        "Thoda interesting bolo na yaar! 🥱",
        "Tere messages dekh ke hasi aa jati hai! 😄",
        "Chal chal! Serious baat kar! 😒",
        "Maine expect nahi kiya tha aisa reply! 😮",
        "Tujhe pata hai tu kitna funny hai? 😅",
        "Bas kar! Ab rona aayega! 😭"
    ];
    return roasts[Math.floor(Math.random() * roasts.length)];
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
        console.error('Send error:', error);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for Cloudflare
export default {
    async fetch(request) {
        return handleRequest(request);
    }
};