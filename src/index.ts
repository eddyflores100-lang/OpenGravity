import { Bot, Context } from 'grammy';
import dotenv from 'dotenv';
import { processMessage } from './llm/llm.js';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const allowedUserIdStr = process.env.TELEGRAM_ALLOWED_USER_IDS;

const isPlaceholder = (v?: string) =>
    !v || /sutituye|sustituye|your_|change_?me|placeholder/i.test(v);

if (!botToken || isPlaceholder(botToken)) {
    console.error('Please configure TELEGRAM_BOT_TOKEN in .env');
    process.exit(1);
}

if (!allowedUserIdStr || isPlaceholder(allowedUserIdStr)) {
    console.error('Please configure TELEGRAM_ALLOWED_USER_IDS in .env');
    process.exit(1);
}

const allowedUserIds = allowedUserIdStr.split(',').map(id => Number(id.trim())).filter(id => !Number.isNaN(id));

const bot = new Bot(botToken!);

// Global error handler — a crashed handler must never kill the polling loop
bot.catch(err => {
    console.error('[bot] unhandled error:', err.error ?? err);
});

// Auth middleware
bot.use(async (ctx, next) => {
    if (!ctx.from) return;

    if (!allowedUserIds.includes(ctx.from.id)) {
        console.warn(`Unauthorized access attempt from User ID: ${ctx.from.id}`);
        await ctx.reply('Unauthorized access.');
        return;
    }

    await next();
});

bot.command('start', ctx => {
    ctx.reply('Welcome to OpenGravity! Your personal AI Agent is ready. How can I help you?');
});

/**
 * Telegram hard-caps messages at 4096 chars. Split long LLM answers on
 * line boundaries so replies never fail.
 */
const TG_LIMIT = 4000;
async function replyLong(ctx: Context, text: string) {
    if (text.length <= TG_LIMIT) {
        await ctx.reply(text);
        return;
    }
    let rest = text;
    while (rest.length > 0) {
        let chunk = rest.slice(0, TG_LIMIT);
        if (rest.length > TG_LIMIT) {
            const cut = chunk.lastIndexOf('\n');
            if (cut > 500) chunk = chunk.slice(0, cut);
        }
        await ctx.reply(chunk);
        rest = rest.slice(chunk.length);
    }
}

bot.on('message:text', async ctx => {
    try {
        await ctx.replyWithChatAction('typing');
        const response = await processMessage(ctx.message.text);
        await replyLong(ctx, response);
    } catch (error) {
        console.error('Error handling message:', error);
        await ctx.reply('An error occurred while processing your message.');
    }
});

// Graceful shutdown
const shutdown = () => {
    console.log('\n[bot] shutting down...');
    bot.stop();
    process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

bot.start({
    onStart: botInfo => {
        console.log(`OpenGravity Bot started successfully as @${botInfo.username}`);
    }
});
