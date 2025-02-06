export const telegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID ? parseInt(process.env.TELEGRAM_ADMIN_CHAT_ID) : undefined,
    developmentMode: process.env.NODE_ENV === 'development',
};
