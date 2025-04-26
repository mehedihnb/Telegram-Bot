const { Telegraf } = require('telegraf');
const axios = require('axios');
const cron = require('node-cron');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const http = require('http');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create health check server
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, () => {
  console.log('Health check server running on port 3000');
});

// Initialize Firebase
try {
  const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON 
    ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) 
    : undefined;
    
  console.log('Initializing Firebase...');
  initializeApp({
    credential: serviceAccount 
      ? cert(serviceAccount) 
      : applicationDefault(),
    projectId: 'habit-sequence'
  });
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  console.error('Firebase credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'Present' : 'Missing');
  process.exit(1);
}

const db = getFirestore();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Error handling middleware
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
  ctx.reply('Sorry, something went wrong. Please try again later.');
});

// Rate limiting configuration
const rateLimitConfig = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 60000,    // 1 minute
  backoffFactor: 2
};

// Queue for managing API requests
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      let delay = rateLimitConfig.initialDelay;
      let retries = 0;

      while (retries < rateLimitConfig.maxRetries) {
        try {
          const result = await fn();
          resolve(result);
          break;
        } catch (error) {
          if (error.response?.status === 429) {
            console.log(`Rate limit hit, retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            delay = Math.min(delay * rateLimitConfig.backoffFactor, rateLimitConfig.maxDelay);
            retries++;
            if (retries === rateLimitConfig.maxRetries) {
              reject(new Error('Max retries reached for rate limit'));
            }
          } else {
            reject(error);
            break;
          }
        }
      }
      // Add a small delay between requests to prevent hitting rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

// Add request deduplication tracking
const processedRequests = new Set();
const REQUEST_TIMEOUT = 60000; // 1 minute

// Update the OpenAI API call to use the queue
async function generateAIResponse(prompt, model = 'gpt-3.5-turbo') {
  return requestQueue.add(async () => {
    try {
      if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
        throw new Error('Invalid OpenAI API key format. Key must start with "sk-"');
      }

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a concise business idea generator. Generate very short, clear ideas. Keep headlines under 6 words and ideas under 15 words.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI response:', error);
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is invalid. Please check your configuration.');
      }
      throw error;
    }
  });
}

// Helper to fetch content from OpenAI with retry
async function fetchFromOpenAI(prompt, topics = [], retryCount = 0) {
  try {
    const topicsStr = topics.length > 0 ? `focused on ${topics.join(', ')}` : '';
    const fullPrompt = `${prompt} ${topicsStr}. FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
Headline: [One short headline, max 6 words]
Idea: [One sentence business idea, max 15 words]`;
    
    console.log('Making OpenAI API request...');
    console.log('Request details:', {
      model: 'gpt-3.5-turbo',
      prompt: fullPrompt,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      apiKeyStart: process.env.OPENAI_API_KEY?.substring(0, 7) || 'missing'
    });

    const response = await generateAIResponse(fullPrompt);
    console.log('OpenAI API request successful');
    return response;
  } catch (error) {
    console.error('OpenAI API error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    });

    // Handle rate limiting
    if (error.response?.status === 429 && retryCount < 3) {
      const waitTime = 20000;
      console.log(`Rate limit hit, waiting ${waitTime/1000} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchFromOpenAI(prompt, topics, retryCount + 1);
    }

    throw new Error('Failed to generate content: ' + (error.response?.data?.error?.message || error.message));
  }
}

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    const testDoc = await db.collection('test').doc('test').set({
      test: 'test',
      timestamp: new Date()
    });
    console.log('Firebase connection test successful');
    await db.collection('test').doc('test').delete();
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    process.exit(1);
  }
}

// Test OpenAI connection
async function testOpenAIConnection() {
  try {
    console.log('Testing OpenAI connection...');
    console.log('Using API key starting with:', process.env.OPENAI_API_KEY.substring(0, 7) + '...');
    const response = await fetchFromOpenAI('Test connection', []);
    console.log('OpenAI connection test successful');
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}

// Start Command
bot.start(async (ctx) => {
  try {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name;
    const timestamp = new Date().toISOString();
    
    await db.collection('users').doc(userId.toString()).set({
      userId: userId.toString(),
      userName: userName,
      dailyTime: '10:00',
      topics: ['AI', 'Startups', 'Health'],
      timezone: 'UTC',
      joined: timestamp,
      active: true
    }, { merge: true });
    
    ctx.reply(
      `🚀 Welcome to PulseBot, ${userName}!\n\n` +
      `You will receive daily startup ideas, trends, and summaries at 10:00 UTC.\n\n` +
      `Commands:\n` +
      `• /settings - Change delivery time\n` +
      `• /topics - Set your interests\n` +
      `• /timezone - Set your timezone\n` +
      `• /now - Get insights right now`
    );
  } catch (error) {
    console.error('Start command error:', error);
    ctx.reply('Sorry, there was an error setting up your account. Please try again.');
  }
});

// Settings Command - Time configuration
bot.command('settings', async (ctx) => {
  try {
    ctx.reply(
      '🛠️ Please reply with your preferred daily drop time (24h format, e.g., 09:00):\n\n' +
      'Example: 08:30'
    );
    
    // We need to store the context to handle the next message
    ctx.session = { waitingFor: 'time' };
  } catch (error) {
    console.error('Settings command error:', error);
    ctx.reply('Sorry, there was an error. Please try again.');
  }
});

// Topics Command
bot.command('topics', (ctx) => {
  try {
    ctx.reply(
      '🧠 Please reply with your topics separated by commas\n\n' +
      'Example: AI, Health, Finance, Crypto, Climate'
    );
    
    ctx.session = { waitingFor: 'topics' };
  } catch (error) {
    console.error('Topics command error:', error);
    ctx.reply('Sorry, there was an error. Please try again.');
  }
});

// Timezone Command
bot.command('timezone', (ctx) => {
  try {
    ctx.reply(
      '🌐 Please reply with your timezone (e.g., UTC, America/New_York, Europe/London)\n\n' +
      'Example: America/Los_Angeles'
    );
    
    ctx.session = { waitingFor: 'timezone' };
  } catch (error) {
    console.error('Timezone command error:', error);
    ctx.reply('Sorry, there was an error. Please try again.');
  }
});

// Get content now Command
bot.command('now', async (ctx) => {
  try {
    const requestId = `${ctx.from.id}-${Date.now()}`;
    if (processedRequests.has(requestId)) {
      return; // Skip duplicate request
    }
    processedRequests.add(requestId);
    
    // Remove the request ID after timeout
    setTimeout(() => {
      processedRequests.delete(requestId);
    }, REQUEST_TIMEOUT);

    console.log('Received /now command');
    ctx.reply('🔍 Generating your personalized insights... This may take a moment.');
    
    const userId = ctx.from.id;
    console.log(`Processing /now command for user ${userId}`);
    
    const userDoc = await db.collection('users').doc(userId.toString()).get();
    
    if (!userDoc.exists) {
      console.log('User not found, asking to start');
      return ctx.reply('Please use /start to set up your account first.');
    }
    
    const userData = userDoc.data();
    console.log('User data retrieved:', { userId, topics: userData.topics });
    
    await sendPersonalizedContent(userId.toString(), userData.topics);
  } catch (error) {
    console.error('Now command error:', error);
    ctx.reply('Sorry, there was an error generating your insights. Please try again later.');
  }
});

// Help Command
bot.command('help', (ctx) => {
  ctx.reply(
    '📚 PulseBot Help\n\n' +
    'PulseBot delivers personalized startup ideas, trends, and news summaries.\n\n' +
    'Commands:\n' +
    '• /start - Initialize your account\n' +
    '• /settings - Change delivery time\n' +
    '• /topics - Set your interests\n' +
    '• /timezone - Set your timezone\n' +
    '• /now - Get insights right now\n' +
    '• /help - Show this help message\n' +
    '• /stop - Pause your subscription\n\n' +
    'Reply "Expand" to any idea to get a detailed MVP outline.\n\n' +
    'Questions or feedback? Contact our team at support@pulsebot.example.com'
  );
});

// Stop Command - Pause subscription
bot.command('stop', async (ctx) => {
  try {
    const userId = ctx.from.id;
    await db.collection('users').doc(userId.toString()).update({ active: false });
    ctx.reply(
      '⏸️ Your subscription has been paused. You will no longer receive daily updates.\n\n' +
      'Use /start to reactivate your subscription anytime.'
    );
  } catch (error) {
    console.error('Stop command error:', error);
    ctx.reply('Sorry, there was an error. Please try again.');
  }
});

// Message handler for collecting user input
bot.on('text', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    
    // Handle "Expand" requests with topic
    if (text.startsWith('Expand')) {
      return handleExpandRequest(ctx);
    }
    
    // If we're not waiting for any specific input, just ignore
    if (!ctx.session || !ctx.session.waitingFor) {
      return;
    }
    
    const waitingFor = ctx.session.waitingFor;
    ctx.session.waitingFor = null; // Reset the waiting state
    
    // Handle time settings
    if (waitingFor === 'time') {
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(text)) {
        return ctx.reply('⚠️ Invalid time format. Please use HH:MM format (e.g., 09:00).');
      }
      
      await db.collection('users').doc(userId.toString()).update({ dailyTime: text });
      ctx.reply(`✅ Daily drop time updated to ${text}`);
    }
    
    // Handle topics settings
    else if (waitingFor === 'topics') {
      const topics = text.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      if (topics.length === 0) {
        return ctx.reply('⚠️ Please provide at least one topic.');
      }
      
      await db.collection('users').doc(userId.toString()).update({ topics });
      ctx.reply(`✅ Topics updated to: ${topics.join(', ')}`);
    }
    
    // Handle timezone settings
    else if (waitingFor === 'timezone') {
      try {
        // Simple validation - a proper implementation would validate against a timezone database
        const date = new Date().toLocaleString('en-US', { timeZone: text });
        await db.collection('users').doc(userId.toString()).update({ timezone: text });
        ctx.reply(`✅ Timezone updated to ${text}`);
      } catch (e) {
        ctx.reply('⚠️ Invalid timezone. Please use a valid timezone like "America/New_York" or "UTC".');
      }
    }
  } catch (error) {
    console.error('Message handler error:', error);
    ctx.reply('Sorry, there was an error processing your request. Please try again.');
  }
});

// Handle "Expand" requests
async function handleExpandRequest(ctx) {
  try {
    const text = ctx.message.text.trim();
    const topicMatch = text.match(/^Expand\s+(.+)$/);
    if (!topicMatch) {
      return ctx.reply('Please specify a topic to expand. Example: "Expand AI" or "Expand Startups"');
    }

    const topicToExpand = topicMatch[1];
    ctx.reply(`🔍 Expanding ${topicToExpand} idea...`);
    
    const userId = ctx.from.id;
    const userDoc = await db.collection('users').doc(userId.toString()).get();
    
    if (!userDoc.exists) {
      return ctx.reply('Please use /start to set up your account first.');
    }
    
    const expandedInsight = await fetchFromOpenAI(
      `Create a simple business plan for ${topicToExpand} with these points:\n` +
      '1) Market Need (1-2 sentences)\n' +
      '2) Solution (1-2 sentences)\n' +
      '3) Target Users (1 sentence)\n' +
      '4) Revenue Model (1 sentence)\n' +
      '5) Next Steps (1-2 steps)',
      [topicToExpand]
    );
    
    ctx.reply(expandedInsight);
  } catch (error) {
    console.error('Expand handler error:', error);
    ctx.reply('Sorry, I had trouble expanding this topic. Please try again later.');
  }
}

// Send personalized content to a specific user
async function sendPersonalizedContent(userId, topics = []) {
  try {
    console.log(`Generating personalized content for user ${userId}...`);
    
    // Generate insights for each topic
    const insights = [];
    for (const topic of topics) {
      console.log(`Generating insight for topic: ${topic}`);
      const response = await fetchFromOpenAI(
        `Generate a quick business idea for ${topic}`,
        [topic]
      );
      
      // Parse the response into headline and idea
      const headline = response.match(/Headline: (.+)/)?.[1] || '';
      const idea = response.match(/Idea: (.+)/)?.[1] || '';
      
      insights.push({ 
        topic, 
        headline: headline.trim(),
        idea: idea.trim()
      });
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Format the message with headlines and topics
    const message = insights.map(({ topic, headline, idea }) => (
      `📌 *${topic}*\n` +
      `💡 *${headline}*\n` +
      `${idea}\n\n` +
      `Type "Expand ${topic}" for business plan`
    )).join('\n\n');
    
    const fullMessage = 
      `🎯 *Quick Business Ideas*\n\n${message}\n\n` +
      `Type "Expand [Topic]" for detailed plan`;
    
    console.log('Sending message to user...');
    await bot.telegram.sendMessage(userId, fullMessage, { parse_mode: 'Markdown' });
    console.log('Message sent successfully');
    
    // Log successful delivery
    await db.collection('deliveries').add({
      userId,
      timestamp: new Date().toISOString(),
      delivered: true,
      topics: topics,
      insights: insights
    });
    
    return true;
  } catch (error) {
    console.error(`Error sending content to user ${userId}:`, error);
    
    // Log failed delivery
    await db.collection('deliveries').add({
      userId,
      timestamp: new Date().toISOString(),
      delivered: false,
      error: error.message
    });
    
    // Try to notify the user about the error
    try {
      await bot.telegram.sendMessage(
        userId, 
        "Sorry, I encountered an issue. Please try again in a minute by sending /now"
      );
    } catch (notifyError) {
      console.error(`Failed to notify user ${userId} about error:`, notifyError);
    }
    
    return false;
  }
}

// Daily Summary Sender - main scheduling function
async function sendDailySummaries() {
  try {
    console.log('Running scheduled daily summaries...');
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    // Get all active users scheduled for this time
    const snapshot = await db.collection('users')
      .where('active', '==', true)
      .where('dailyTime', '==', currentTime)
      .get();
    
    if (snapshot.empty) {
      console.log(`No users scheduled for delivery at ${currentTime} UTC`);
      return;
    }
    
    console.log(`Sending content to ${snapshot.size} users scheduled for ${currentTime} UTC`);
    
    // Process each user
    const promises = [];
    snapshot.forEach((doc) => {
      const userData = doc.data();
      promises.push(sendPersonalizedContent(doc.id, userData.topics));
    });
    
    await Promise.allSettled(promises);
    console.log(`Completed sending batch at ${currentTime} UTC`);
  } catch (error) {
    console.error('Error in daily summary scheduler:', error);
  }
}

// Cron Scheduler - check every minute for users who should receive content
cron.schedule('* * * * *', () => {
  sendDailySummaries();
});

// Start the bot
bot.launch().then(async () => {
  console.log('Bot is starting...');
  
  // Log environment variables (safely)
  console.log('Environment check:');
  console.log('- BOT_TOKEN:', process.env.BOT_TOKEN ? '✓ Present' : '✗ Missing');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Present' : '✗ Missing');
  console.log('- GOOGLE_APPLICATION_CREDENTIALS_JSON:', process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? '✓ Present' : '✗ Missing');
  
  try {
    console.log('Testing Firebase connection...');
    await testFirebaseConnection();
    console.log('Firebase connection successful');
  } catch (error) {
    console.error('Firebase connection failed:', error);
    process.exit(1);
  }

  try {
    console.log('Testing OpenAI connection...');
    const openAIWorking = await testOpenAIConnection();
    if (!openAIWorking) {
      console.error('OpenAI connection failed. Please check your API key.');
      process.exit(1);
    }
    console.log('OpenAI connection successful');
  } catch (error) {
    console.error('OpenAI connection error:', error);
    process.exit(1);
  }

  console.log('PulseBot started successfully!');
  console.log('Health check server running on port 3000');
}).catch(err => {
  console.error('Failed to start bot:', err);
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    code: err.code
  });
  process.exit(1);
});

// Enable graceful stop
process.once('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close();
  bot.stop('SIGTERM');
});
