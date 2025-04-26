# PulseBot - AI-Powered Startup Ideas & Insights Bot

PulseBot is a Telegram bot that delivers personalized startup ideas, trends, and news summaries using AI. It helps entrepreneurs stay informed and get creative business ideas tailored to their interests.

## Features

- 🚀 Daily personalized startup ideas
- 📈 Current market trends
- 📰 Relevant news summaries
- 🎯 Topic customization
- ⏰ Flexible delivery scheduling
- 🌐 Timezone support
- 🔄 On-demand insights with `/now` command
- 📝 Detailed MVP outlines with "Expand" feature

## Commands

- `/start` - Initialize your account
- `/settings` - Change delivery time
- `/topics` - Set your interests
- `/timezone` - Set your timezone
- `/now` - Get insights right now
- `/help` - Show help message
- `/stop` - Pause subscription

## Setup Instructions

1. **Prerequisites**
   - Node.js 14+ installed
   - Firebase account
   - OpenAI API key
   - Telegram Bot token

2. **Environment Setup**
   Create a `.env` file with:
   ```
   # Bot Configuration
   BOT_TOKEN=your_telegram_bot_token

   # OpenAI API Key
   OPENAI_API_KEY=your_openai_api_key

   # Firebase Configuration
   GOOGLE_APPLICATION_CREDENTIALS_JSON=your_firebase_service_account_json
   ```

3. **Installation**
   ```bash
   npm install
   ```

4. **Running the Bot**
   ```bash
   # Start the bot
   node deploy.js start

   # Check status
   node deploy.js status

   # Stop the bot
   node deploy.js stop

   # Restart the bot
   node deploy.js restart
   ```

## Deployment

1. **Server Requirements**
   - Linux/Unix environment
   - Node.js 14+
   - PM2 or similar process manager (optional)
   - 512MB RAM minimum
   - 1GB storage minimum

2. **Production Deployment**
   ```bash
   # Install PM2 globally
   npm install -g pm2

   # Start with PM2
   pm2 start telegram-bot-code.js --name pulsebot

   # Monitor the bot
   pm2 monit pulsebot
   ```

## Error Handling

The bot includes:
- Automatic retry for rate limits
- Error logging to `bot.log`
- Firebase delivery tracking
- Graceful shutdown handling

## Support

For issues or questions, please open an issue in the repository or contact support@pulsebot.example.com

## License

MIT License - Feel free to use and modify for your needs. 