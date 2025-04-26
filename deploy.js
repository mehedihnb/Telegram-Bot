const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const BOT_SCRIPT = 'telegram-bot-code.js';
const LOG_FILE = 'bot.log';
const PID_FILE = 'bot.pid';

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function start() {
  // Check if already running
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
    if (isRunning(pid)) {
      log('Bot is already running!');
      return;
    }
    fs.unlinkSync(PID_FILE);
  }

  // Start the bot
  const bot = spawn('node', [BOT_SCRIPT], {
    detached: true,
    stdio: ['ignore', 
      fs.openSync(LOG_FILE, 'a'),
      fs.openSync(LOG_FILE, 'a')
    ]
  });

  fs.writeFileSync(PID_FILE, bot.pid.toString());
  log(`Bot started with PID: ${bot.pid}`);
  bot.unref();
}

function stop() {
  if (!fs.existsSync(PID_FILE)) {
    log('No PID file found. Bot may not be running.');
    return;
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
  try {
    process.kill(pid);
    fs.unlinkSync(PID_FILE);
    log('Bot stopped successfully');
  } catch (e) {
    log(`Error stopping bot: ${e.message}`);
    fs.unlinkSync(PID_FILE);
  }
}

function status() {
  if (!fs.existsSync(PID_FILE)) {
    log('Bot is not running');
    return;
  }

  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
  if (isRunning(pid)) {
    log(`Bot is running with PID: ${pid}`);
  } else {
    log('Bot process not found. Cleaning up...');
    fs.unlinkSync(PID_FILE);
  }
}

// Handle command line arguments
const command = process.argv[2];
switch (command) {
  case 'start':
    start();
    break;
  case 'stop':
    stop();
    break;
  case 'restart':
    stop();
    setTimeout(start, 2000);
    break;
  case 'status':
    status();
    break;
  default:
    console.log('Usage: node deploy.js [start|stop|restart|status]');
} 