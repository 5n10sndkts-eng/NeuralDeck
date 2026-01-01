/**
 * Storage Lifecycle Management Service
 * Handles auto-cleanup, quota monitoring, and storage optimization
 */

const RETENTION_PERIOD_KEY = 'neuraldeck_retention_period';
const DEFAULT_RETENTION_DAYS = 30;
const LAST_CLEANUP_KEY = 'neuraldeck_last_cleanup';
const CLEANUP_INTERVAL_DAYS = 7; // Run cleanup weekly

export interface StorageConfig {
  retentionDays: number;
  autoCleanupEnabled: boolean;
}

export class StorageManager {
  private static instance: StorageManager;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Get retention period from localStorage
   */
  getRetentionPeriod(): number {
    const saved = localStorage.getItem(RETENTION_PERIOD_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_RETENTION_DAYS;
  }

  /**
   * Set retention period
   */
  setRetentionPeriod(days: number): void {
    localStorage.setItem(RETENTION_PERIOD_KEY, days.toString());
    console.log('[StorageManager] Retention period set to', days, 'days');
  }

  /**
   * Check if cleanup is due
   */
  isCleanupDue(): boolean {
    const lastCleanup = localStorage.getItem(LAST_CLEANUP_KEY);
    if (!lastCleanup) return true;

    const lastCleanupTime = parseInt(lastCleanup, 10);
    const daysSinceCleanup = (Date.now() - lastCleanupTime) / (1000 * 60 * 60 * 24);
    
    return daysSinceCleanup >= CLEANUP_INTERVAL_DAYS;
  }

  /**
   * Mark cleanup as completed
   */
  markCleanupCompleted(): void {
    localStorage.setItem(LAST_CLEANUP_KEY, Date.now().toString());
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    used: number;
    quota: number;
    percentage: number;
    formattedUsed: string;
    formattedQuota: string;
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      return {
        used,
        quota,
        percentage,
        formattedUsed: this.formatBytes(used),
        formattedQuota: this.formatBytes(quota)
      };
    }

    return {
      used: 0,
      quota: 0,
      percentage: 0,
      formattedUsed: 'N/A',
      formattedQuota: 'N/A'
    };
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if storage quota is running low
   */
  async isStorageLow(threshold: number = 80): Promise<boolean> {
    const stats = await this.getStorageStats();
    return stats.percentage >= threshold;
  }

  /**
   * Initialize auto-cleanup scheduler
   * Should be called on app initialization
   */
  initAutoCleanup(cleanupCallback: () => Promise<number>): void {
    if (this.isCleanupDue()) {
      console.log('[StorageManager] Auto-cleanup is due, running...');
      cleanupCallback().then(count => {
        console.log(`[StorageManager] Auto-cleanup completed, removed ${count} sessions`);
        this.markCleanupCompleted();
      }).catch(error => {
        console.error('[StorageManager] Auto-cleanup failed:', error);
      });
    } else {
      console.log('[StorageManager] Auto-cleanup not due');
    }
  }

  /**
   * Estimate message count that can fit in remaining storage
   */
  async estimateCapacity(avgMessageSize: number = 500): Promise<number> {
    const stats = await this.getStorageStats();
    const remaining = stats.quota - stats.used;
    return Math.floor(remaining / avgMessageSize);
  }

  /**
   * Get config for storage management
   */
  getConfig(): StorageConfig {
    return {
      retentionDays: this.getRetentionPeriod(),
      autoCleanupEnabled: true
    };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<StorageConfig>): void {
    if (config.retentionDays !== undefined) {
      this.setRetentionPeriod(config.retentionDays);
    }
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance();
