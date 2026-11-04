import { useState, useEffect } from 'react';
import { apiClient as api } from '@/services/apiClient';
import { toast } from 'sonner';
import type { CallLogPreviewRow } from '@/hooks/usePipeline';
import type { QueryClient } from '@tanstack/react-query';

export interface QueueProgress {
  total: number;
  completed: number;
  queued: number;
  isRunning: boolean;
  taskId?: string;
  filename?: string;
}

export type QueueListener = (event: {
  progress: QueueProgress;
  completedChunk?: CallLogPreviewRow[];
}) => void;

class CallLogImportQueueService {
  private queue: CallLogPreviewRow[] = [];
  private queuedRowIndices = new Set<number>();
  private completedIndices = new Set<number>();
  private totalEnqueued = 0;
  private totalCompleted = 0;
  private isProcessing = false;
  private listeners = new Set<QueueListener>();
  private queryClient: QueryClient | null = null;
  private toastId = 'call-log-bg-batch-import';
  private activeTaskId?: string;
  private activeFilename?: string;

  public setQueryClient(qc: QueryClient) {
    this.queryClient = qc;
  }

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener({ progress: this.getProgress() });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getProgress(): QueueProgress {
    return {
      total: this.totalEnqueued,
      completed: this.totalCompleted,
      queued: this.queue.length,
      isRunning: this.isProcessing,
      taskId: this.activeTaskId,
      filename: this.activeFilename,
    };
  }

  public isRowQueued(rowIndex: number): boolean {
    return this.queuedRowIndices.has(rowIndex);
  }

  public enqueue(rows: CallLogPreviewRow[], qc?: QueryClient, taskId?: string, filename?: string) {
    if (qc && !this.queryClient) {
      this.queryClient = qc;
    }
    if (taskId) {
      this.activeTaskId = taskId;
    }
    if (filename) {
      this.activeFilename = filename;
    }

    const newRows: CallLogPreviewRow[] = [];
    for (const r of rows) {
      if (!this.queuedRowIndices.has(r.row_index) && !this.completedIndices.has(r.row_index)) {
        this.queuedRowIndices.add(r.row_index);
        newRows.push(r);
      }
    }

    if (newRows.length === 0) return;

    this.queue.push(...newRows);
    this.totalEnqueued += newRows.length;

    toast.info(
      `Added ${newRows.length} call logs to background import queue (${this.queue.length} in queue). You can safely close the preview anytime.`,
      { duration: 4000 }
    );

    this.notify();
    this.startWorker();
  }

  private notify(completedChunk?: CallLogPreviewRow[]) {
    const event = {
      progress: this.getProgress(),
      completedChunk,
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Queue listener error:', err);
      }
    }
  }

  private async startWorker() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.notify();

    const BATCH_SIZE = 100;

    try {
      while (this.queue.length > 0) {
        const chunk = this.queue.slice(0, BATCH_SIZE);

        toast.loading(
          `Importing call logs in background: ${this.totalCompleted} / ${this.totalEnqueued} completed (${this.queue.length} remaining)...`,
          { id: this.toastId }
        );

        try {
          await api.post<{ imported_count: number; status: string }>('/api/pipeline/confirm-import-call-log', {
            rows: chunk,
          });
        } catch (err: any) {
          console.error('Batch import chunk error:', err);
          toast.error(`A batch of ${chunk.length} items encountered an error: ${err?.message || 'Server error'}. Continuing next batch...`);
        }

        // Pop chunk from queue
        this.queue.splice(0, chunk.length);
        this.totalCompleted += chunk.length;

        for (const r of chunk) {
          this.completedIndices.add(r.row_index);
        }

        // Invalidate queries periodically as batches land in DB
        if (this.queryClient) {
          this.queryClient.invalidateQueries({ queryKey: ['call-logs'] });
          this.queryClient.invalidateQueries({ queryKey: ['call-tracking-summary'] });
          this.queryClient.invalidateQueries({ queryKey: ['call-tracking-summary-infinite'] });
          this.queryClient.invalidateQueries({ queryKey: ['companies'] });
          this.queryClient.invalidateQueries({ queryKey: ['tasks'] });
          this.queryClient.invalidateQueries({ queryKey: ['pipeline-tasks'] });
        }

        // Notify listeners with the completed chunk
        this.notify(chunk);
      }

      toast.success(`Successfully imported all ${this.totalCompleted} call logs to database!`, {
        id: this.toastId,
        duration: 6000,
      });

      // Reset counters once all done
      this.totalEnqueued = 0;
      this.totalCompleted = 0;
      this.queuedRowIndices.clear();
      this.completedIndices.clear();
    } finally {
      this.isProcessing = false;
      this.notify();
    }
  }
}

export const callLogImportQueue = new CallLogImportQueueService();

export function useCallLogImportQueue() {
  const [progress, setProgress] = useState<QueueProgress>(() => callLogImportQueue.getProgress());

  useEffect(() => {
    return callLogImportQueue.subscribe(({ progress: p }) => {
      setProgress(p);
    });
  }, []);

  return {
    ...progress,
    enqueue: (rows: CallLogPreviewRow[], qc?: QueryClient, taskId?: string, filename?: string) =>
      callLogImportQueue.enqueue(rows, qc, taskId, filename),
  };
}
