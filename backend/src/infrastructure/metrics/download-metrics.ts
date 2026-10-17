
export interface DownloadMetricsSnapshot {
  activeStreams: number;
  totalRequests: number;
  completedRequests: number;
  abortedRequests: number;
  errorRequests: number;
  rangeRequests: number;
  totalBytesStreamed: number;
  originMemory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
  uptimeSeconds: number;
}

export class DownloadMetrics {
  private activeStreams = 0;
  private totalRequests = 0;
  private completedRequests = 0;
  private abortedRequests = 0;
  private errorRequests = 0;
  private rangeRequests = 0;
  private totalBytesStreamed = 0;

  trackStart(isRange: boolean): void {
    this.activeStreams++;
    this.totalRequests++;
    if (isRange) this.rangeRequests++;
  }

  trackComplete(bytes: number): void {
    this.activeStreams = Math.max(0, this.activeStreams - 1);
    this.completedRequests++;
    this.totalBytesStreamed += bytes;
  }

  trackAbort(partialBytes: number): void {
    this.activeStreams = Math.max(0, this.activeStreams - 1);
    this.abortedRequests++;
    this.totalBytesStreamed += partialBytes;
  }

  trackError(): void {
    this.activeStreams = Math.max(0, this.activeStreams - 1);
    this.errorRequests++;
  }

  getSnapshot(): DownloadMetricsSnapshot {
    const mem = process.memoryUsage();
    return {
      activeStreams: this.activeStreams,
      totalRequests: this.totalRequests,
      completedRequests: this.completedRequests,
      abortedRequests: this.abortedRequests,
      errorRequests: this.errorRequests,
      rangeRequests: this.rangeRequests,
      totalBytesStreamed: this.totalBytesStreamed,
      originMemory: {
        rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      },
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  reset(): void {
    this.activeStreams = 0;
    this.totalRequests = 0;
    this.completedRequests = 0;
    this.abortedRequests = 0;
    this.errorRequests = 0;
    this.rangeRequests = 0;
    this.totalBytesStreamed = 0;
  }
}

export const downloadMetrics = new DownloadMetrics();
