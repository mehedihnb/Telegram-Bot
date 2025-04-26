# PulseBot - AI-Powered Telegram Business Ideas Bot 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-✓-blue)](https://core.telegram.org/bots/api)
[![OpenAI API](https://img.shields.io/badge/OpenAI%20API-GPT--3.5-orange)](https://openai.com/api/)

An intelligent Telegram bot that generates personalized startup ideas and business insights using AI. Get daily inspiration, detailed business plans, and market analysis tailored to your interests.

## 🌟 Features

- 🤖 AI-powered business idea generation
- 📊 Personalized insights based on user interests
- ⏰ Customizable daily delivery schedule
- 🌍 Timezone support
- 💡 Detailed MVP outlines with "Expand" feature
- 🔄 Auto-retry and rate limit handling
- ❤️ Health check endpoint for monitoring
- 🐳 Docker support for easy deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 14+
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- OpenAI API Key
- Firebase Project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mehedihnb/Telegram-Bot.git
   cd Telegram-Bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit .env with your credentials:
   - BOT_TOKEN (from @BotFather)
   - OPENAI_API_KEY (from OpenAI)
   - GOOGLE_APPLICATION_CREDENTIALS_JSON (from Firebase)

4. Start the bot:
   ```bash
   npm start
   ```

### Docker Deployment

1. Build and run with Docker Compose:
   ```bash
   docker-compose up -d
   ```

2. Check logs:
   ```bash
   docker-compose logs -f
   ```

## 💻 Available Commands

- `/start` - Initialize your account
- `/settings` - Change delivery time
- `/topics` - Set your interests
- `/timezone` - Set your timezone
- `/now` - Get insights right now
- `/help` - Show help message
- `/stop` - Pause subscription

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| BOT_TOKEN | Telegram Bot API Token | Yes |
| OPENAI_API_KEY | OpenAI API Key | Yes |
| GOOGLE_APPLICATION_CREDENTIALS_JSON | Firebase Service Account JSON | Yes |

### Health Check

The bot includes a health check endpoint at:
```
http://localhost:3000/health
```

## 🚢 Deployment Options

- Railway.app (Recommended)
- Render.com
- Heroku
- Local Docker deployment

For detailed deployment instructions, see [deployment-guide.md](deployment-guide.md)

## 🛡️ Security

- Rate limiting with exponential backoff
- Request deduplication
- Secure credential handling
- No sensitive data logging

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Telegraf](https://github.com/telegraf/telegraf)
- [OpenAI](https://openai.com)
- [Firebase](https://firebase.google.com)

## 📞 Support

For support, email mehediuxd@gmail.com or join our [Telegram support group](https://t.me/imehedih). 
