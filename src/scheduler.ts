import { schedule, validate } from 'node-cron';
import { runOnce } from './engine/runner.js';
import * as settingsDb from './db/settings.js';
import * as logger from './lib/logger.js';

let task: ReturnType<typeof schedule> | null = null;

function buildExpression(minutes: number): string {
  return `*/${minutes} * * * *`;
}

export function start(): void {
  if (task) {
    task.destroy();
    task = null;
  }

  const minutes = parseInt(settingsDb.get('interval_minutes') || '30', 10) || 30;
  const expression = buildExpression(minutes);

  if (!validate(expression)) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  task = schedule(
    expression,
    async () => {
      logger.debug('Scheduled scan triggered');
      await runOnce();
    },
    { noOverlap: true }
  );

  logger.info(`Scheduler started with expression: ${expression}`);
}

export function stop(): void {
  if (task) {
    task.destroy();
    task = null;
  }
}

export function getNextRunAt(): Date | null {
  return task ? task.getNextRun() : null;
}

export function reschedule(): void {
  start();
}
