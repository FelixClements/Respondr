const { schedule, validate } = require('node-cron');
const { runOnce } = require('./engine/runner');
const settingsDb = require('./db/settings');
const logger = require('./lib/logger');

let task = null;

function buildExpression(minutes) {
  return `*/${minutes} * * * *`;
}

function start() {
  if (task) {
    task.destroy();
    task = null;
  }

  const minutes = parseInt(settingsDb.get('interval_minutes'), 10) || 30;
  const expression = buildExpression(minutes);

  if (!validate(expression)) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  task = schedule(expression, async () => {
    await runOnce();
  }, { noOverlap: true });

  logger.info(`Scheduler started with expression: ${expression}`);
}

function stop() {
  if (task) {
    task.destroy();
    task = null;
  }
}

function getNextRunAt() {
  return task ? task.getNextRun() : null;
}

function reschedule() {
  start();
}

module.exports = { start, stop, getNextRunAt, reschedule };
