import {
  reportReactivityError,
  type ReactivityErrorHandler,
} from './error.js';
import { getCurrentScope } from './scope.js';

export type FlushPhase = 'pre' | 'update' | 'post';
export type EffectFlush = 'sync' | 'pre' | 'post';
export type SchedulerJob = () => unknown;

export interface SchedulerJobOptions {
  readonly phase?: FlushPhase;
  readonly id?: number;
  readonly onError?: ReactivityErrorHandler;
}

interface QueuedJob extends Required<Pick<SchedulerJobOptions, 'phase'>> {
  readonly job: SchedulerJob;
  readonly id: number;
  readonly order: number;
  readonly onError?: ReactivityErrorHandler;
}

const phaseOrder = ['pre', 'update', 'post'] as const;
const queues: Record<FlushPhase, Map<SchedulerJob, QueuedJob>> = {
  pre: new Map(),
  update: new Map(),
  post: new Map(),
};
const batchedJobs = new Map<SchedulerJob, QueuedJob & { readonly flush: EffectFlush }>();
const invalidatedJobs = new Set<SchedulerJob>();
const pendingSnapshotJobs = new Set<SchedulerJob>();
const pendingBatchJobs = new Set<SchedulerJob>();
const resolvedPromise = Promise.resolve();
const recursionLimit = 100;
let currentFlushPromise: Promise<void> | undefined;
let sequence = 0;
let batchDepth = 0;
let flushingBatch = false;

function compareJobs(first: QueuedJob, second: QueuedJob): number {
  return first.id - second.id || first.order - second.order;
}

function hasQueuedJobs(): boolean {
  return phaseOrder.some((phase) => queues[phase].size > 0);
}

function ensureFlush(): void {
  currentFlushPromise ??= resolvedPromise.then(flushJobs);
}

async function runJob(entry: QueuedJob): Promise<void> {
  try {
    await entry.job();
  } catch (error) {
    reportReactivityError(error, 'scheduler', entry.job, entry.onError);
  }
}

async function flushPhase(
  phase: FlushPhase,
  executions: Map<SchedulerJob, number>,
): Promise<void> {
  const queue = queues[phase];
  while (queue.size > 0) {
    const jobs = [...queue.values()].sort(compareJobs);
    queue.clear();
    for (const entry of jobs) pendingSnapshotJobs.add(entry.job);
    for (const entry of jobs) {
      const invalidated = invalidatedJobs.delete(entry.job);
      pendingSnapshotJobs.delete(entry.job);
      if (invalidated) continue;
      const executionCount = (executions.get(entry.job) ?? 0) + 1;
      executions.set(entry.job, executionCount);
      if (executionCount > recursionLimit) {
        reportReactivityError(
          new Error('Scheduler recursion limit exceeded.'),
          'scheduler',
          entry.job,
          entry.onError,
        );
        continue;
      }
      await runJob(entry);
    }
  }
}

async function flushJobs(): Promise<void> {
  const executions = new Map<SchedulerJob, number>();
  try {
    do {
      for (const phase of phaseOrder) await flushPhase(phase, executions);
    } while (hasQueuedJobs());
  } finally {
    currentFlushPromise = undefined;
    if (hasQueuedJobs()) ensureFlush();
  }
}

export function queueJob(
  job: SchedulerJob,
  options: SchedulerJobOptions = {},
): void {
  const phase = options.phase ?? 'update';
  const queue = queues[phase];
  const onError = options.onError ?? getCurrentScope()?.onError;
  invalidatedJobs.delete(job);
  if (!queue.has(job)) {
    queue.set(job, {
      job,
      phase,
      id: options.id ?? Number.POSITIVE_INFINITY,
      order: sequence,
      onError,
    });
    sequence += 1;
  }
  ensureFlush();
}

export function queuePreFlushCallback(
  callback: SchedulerJob,
  options: Omit<SchedulerJobOptions, 'phase'> = {},
): void {
  queueJob(callback, { ...options, phase: 'pre' });
}

export function queuePostFlushCallback(
  callback: SchedulerJob,
  options: Omit<SchedulerJobOptions, 'phase'> = {},
): void {
  queueJob(callback, { ...options, phase: 'post' });
}

export function invalidateJob(job: SchedulerJob): void {
  if (pendingSnapshotJobs.has(job)) invalidatedJobs.add(job);
  for (const phase of phaseOrder) queues[phase].delete(job);
  batchedJobs.delete(job);
}

export function nextTick(): Promise<void>;
export function nextTick<T>(callback: () => T | PromiseLike<T>): Promise<T>;
export function nextTick<T>(callback?: () => T | PromiseLike<T>): Promise<void | T> {
  const promise = currentFlushPromise ?? resolvedPromise;
  return callback ? promise.then(callback) : promise;
}

export function batch<T>(callback: () => T): T {
  batchDepth += 1;
  try {
    return callback();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0) flushBatchedJobs();
  }
}

function flushBatchedJobs(): void {
  flushingBatch = true;
  try {
    while (batchedJobs.size > 0) {
      const jobs = [...batchedJobs.values()].sort(compareJobs);
      batchedJobs.clear();
      for (const entry of jobs) pendingBatchJobs.add(entry.job);
      for (const entry of jobs) {
        pendingBatchJobs.delete(entry.job);
        dispatchEffect(entry.job, entry.flush, entry.id, entry.onError);
      }
    }
  } finally {
    pendingBatchJobs.clear();
    flushingBatch = false;
  }
}

function dispatchEffect(
  job: SchedulerJob,
  flush: EffectFlush,
  id: number,
  onError?: ReactivityErrorHandler,
): void {
  if (flush === 'sync') {
    void runJob({ job, phase: 'update', id, order: sequence, onError });
    sequence += 1;
  } else {
    queueJob(job, { phase: flush, id, onError });
  }
}

/** @internal */
export function scheduleEffect(
  job: SchedulerJob,
  flush: EffectFlush,
  id = Number.POSITIVE_INFINITY,
  onError?: ReactivityErrorHandler,
): void {
  if (batchDepth > 0 || flushingBatch) {
    if (pendingBatchJobs.has(job)) return;
    if (!batchedJobs.has(job)) {
      batchedJobs.set(job, {
        job,
        flush,
        phase: flush === 'sync' ? 'update' : flush,
        id,
        order: sequence,
        onError,
      });
      sequence += 1;
    }
    return;
  }

  dispatchEffect(job, flush, id, onError);
}
