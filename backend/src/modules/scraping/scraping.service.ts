import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval, Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import {
  ScrapingJob,
  CollectionStatus,
} from "../../common/entities/scraping-job.entity";
import { Post } from "../../common/entities/post.entity";
import { ScrapingGateway } from "./scraping.gateway";

export type TriggerResult = "started" | "busy" | "disabled";

@Injectable()
export class ScrapingService implements OnModuleInit {
  private readonly logger = new Logger(ScrapingService.name);

  private busy = false;
  private currentChild: ChildProcess | null = null;
  private lastAutoRunAt = 0;

  constructor(
    @InjectRepository(ScrapingJob)
    private readonly jobsRepo: Repository<ScrapingJob>,
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    private readonly configService: ConfigService,
    private readonly gateway: ScrapingGateway,
  ) {}

  /**
   * Jadwal otomatis scraping Threads (default: setiap 6 jam).
   * Hanya aktif jika THREADS_ENABLED=true.
   */
  @Cron("0 0 */6 * * *", { name: "threads-scheduled-run" })
  async handleScheduledThreadsRun(): Promise<void> {
    const enabled =
      this.configService.get<boolean>("workers.threads.enabled") ?? false;
    if (!enabled) {
      return;
    }

    const result = await this.triggerThreads();
    if (result === "started") {
      this.logger.log("Scheduled Threads scraping started");
    } else if (result === "busy") {
      this.logger.warn("Scheduled Threads scraping skipped: busy");
    }
  }

  async onModuleInit(): Promise<void> {
    const recovered = await this.recoverStaleJobs();
    if (recovered > 0) {
      this.logger.warn(
        `Recovery: ${recovered} scraping job(s) stale ditandai sebagai failed`,
      );
    }
  }

  private get pythonCmd(): string {
    return this.configService.get<string>("workers.pythonCmd") || "python";
  }

  private get workersDir(): string {
    return (
      this.configService.get<string>("workers.dir") ||
      path.resolve(process.cwd(), "../workers")
    );
  }

  private get staleTimeoutMs(): number {
    return (
      this.configService.get<number>("workers.staleTimeout") || 30 * 60 * 1000
    );
  }

  private get autoRefreshIntervalMs(): number {
    return this.configService.get<number>("workers.interval") || 0;
  }

  /**
   * Auto-refresh / scheduled scraping: jalankan seluruh worker (Instagram,
   * Website, Facebook, TikTok, X) secara periodik. Interval dari env
   * WORKER_INTERVAL (ms). Nilai 0 / tidak diatur = nonaktif.
   * Keyword selalu dibaca ulang dari database oleh worker pada setiap
   * siklus, sehingga perubahan keyword langsung dipakai tanpa restart.
   */
  @Interval("auto-scraping", 60_000)
  async handleAutoScraping(): Promise<void> {
    const interval = this.autoRefreshIntervalMs;
    if (interval <= 0) {
      return;
    }
    const now = Date.now();
    if (now - this.lastAutoRunAt < interval) {
      return;
    }
    try {
      if (await this.isBusy()) {
        return;
      }
      const result = await this.trigger();
      if (result === "started") {
        this.lastAutoRunAt = now;
        this.logger.log(`Auto-scraping cycle dimulai (interval ${interval}ms)`);
      }
    } catch (error) {
      this.logger.error(
        `Auto-scraping cycle gagal: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Tandai scraping_jobs berstatus RUNNING yang sudah stale (mulai lebih
   * lama dari staleTimeout) menjadi FAILED. Worker tidak pernah menyentuh
   * baris ini; ini murni recovery sisi backend untuk job yang menggantung.
   */
  async recoverStaleJobs(): Promise<number> {
    const cutoff = new Date(Date.now() - this.staleTimeoutMs);
    const result = await this.jobsRepo
      .createQueryBuilder()
      .update(ScrapingJob)
      .set({
        status: CollectionStatus.FAILED,
        completedAt: new Date(),
        errorMessage:
          "Scraping dihentikan: proses worker tidak menyelesaikan job (stale timeout / backend restart)",
      })
      .where("status = :running", { running: CollectionStatus.RUNNING })
      .andWhere("started_at < :cutoff", { cutoff })
      .execute();
    return result.affected ?? 0;
  }

  /**
   * Cek apakah scraping sedang aktif.
   * Dua lapis: lock in-memory (anti race saat worker baru mulai menulis
   * scraping_jobs) + cek tabel scraping_jobs (anti blokir setelah restart).
   */
  async isBusy(): Promise<boolean> {
    if (this.busy) {
      return true;
    }
    const cutoff = new Date(Date.now() - this.staleTimeoutMs);
    const count = await this.jobsRepo
      .createQueryBuilder("job")
      .where("job.status IN (:...statuses)", {
        statuses: [CollectionStatus.RUNNING, CollectionStatus.PENDING],
      })
      .andWhere("job.started_at >= :cutoff", { cutoff })
      .getCount();
    return count > 0;
  }

  /**
   * Trigger scraping manual. Bersihkan job stale dulu, lalu spawn worker.
   */
  async trigger(): Promise<TriggerResult> {
    await this.recoverStaleJobs();

    if (await this.isBusy()) {
      return "busy";
    }

    this.busy = true;
    try {
      this.gateway.emitJobStarted({
        jobId: "manual-" + Date.now(),
        platform: "all",
        startedAt: new Date().toISOString(),
      });
      this.spawnWorker();
      return "started";
    } catch (error) {
      this.busy = false;
      throw error;
    }
  }

  /**
   * Trigger scraping Threads manual - TERISOLASI dari POST /scraping/run.
   * Hanya menjalankan workers/threads/worker.py.
   *
   * Menghormati THREADS_ENABLED (default false): jika dinonaktifkan, tidak
   * ada worker yang di-spawn dan tidak ada request API yang dibuat.
   */
  async triggerThreads(): Promise<TriggerResult> {
    const enabled =
      this.configService.get<boolean>("workers.threads.enabled") ?? false;
    if (!enabled) {
      return "disabled";
    }

    await this.recoverStaleJobs();

    if (await this.isBusy()) {
      return "busy";
    }

    this.busy = true;
    try {
      this.gateway.emitJobStarted({
        jobId: "threads-" + Date.now(),
        platform: "threads",
        startedAt: new Date().toISOString(),
      });
      this.spawnWorker("threads/worker.py");
      return "started";
    } catch (error) {
      this.busy = false;
      throw error;
    }
  }

  /**
   * Spawn worker Python sebagai proses detached.
   * Backend tidak menunggu worker selesai.
   *
   * `script` adalah path relatif terhadap workers dir; default tetap
   * run_all.py (orchestrator) sehingga semua platform (Instagram, Website,
   * Facebook, TikTok, X, Threads) dijalankan sekaligus. Mode
   * paralel/sequential dikendalikan env WORKER_MODE di workers/.env.
   * Endpoint /scraping/run/threads melewatkan "threads/worker.py".
   */
  spawnWorker(script: string = "run_all.py"): ChildProcess {
    const child = spawn(this.pythonCmd, [script], {
      cwd: this.workersDir,
      detached: true,
      stdio: "ignore",
    });

    child.unref();
    this.currentChild = child;

    child.on("error", (error) => {
      this.busy = false;
      this.currentChild = null;
      this.logger.error(
        `Gagal spawn worker (${this.pythonCmd} ${script} di ${this.workersDir}): ${error.message}`,
      );
    });

    child.on("exit", (code, signal) => {
      this.busy = false;
      this.currentChild = null;
      this.logger.log(
        `Worker selesai (exit=${code}, signal=${signal ?? "none"})`,
      );
      if (code === 0) {
        this.gateway.emitJobCompleted({
          jobId: "worker-" + Date.now(),
          platform: script.includes("threads") ? "threads" : "all",
          completedAt: new Date().toISOString(),
          postsFound: 0,
        });
      } else {
        this.gateway.emitJobFailed({
          jobId: "worker-" + Date.now(),
          platform: script.includes("threads") ? "threads" : "all",
          error: `Worker exited with code ${code}, signal ${signal ?? "none"}`,
          failedAt: new Date().toISOString(),
        });
      }
    });

    // Jaga-jaga: lepas lock jika event tidak pernah terpanggil
    setTimeout(() => {
      if (this.currentChild === child) {
        this.busy = false;
        this.logger.warn("Lock scraping dilepas otomatis (safety timeout)");
      }
    }, this.staleTimeoutMs).unref?.();

    this.logger.log(
      `Worker spawn: ${this.pythonCmd} ${script} (cwd: ${this.workersDir}, pid: ${child.pid})`,
    );
    return child;
  }

  /**
   * Status scraping untuk dashboard. Sumber data:
   * - Status/Job metrics (postsCollected, errors, duration) dari tabel
   *   scraping_jobs (job terbaru per platform).
   * - postsInDatabase: jumlah POST ASLI yang tersimpan di tabel posts per
   *   platform. Ini adalah nilai "Posts Collected" yang konsisten dengan
   *   halaman Posts dan Dashboard Overview.
   */
  async getStatus() {
    const [busy, jobs, postsByPlatform] = await Promise.all([
      this.isBusy(),
      this.jobsRepo.find({
        order: { createdAt: "DESC" },
        relations: ["platform"],
        take: 200,
      }),
      this.postsRepo
        .createQueryBuilder("post")
        .select("post.platformId", "platformId")
        .addSelect("COUNT(*)", "count")
        .groupBy("post.platformId")
        .getRawMany<{ platformId: string; count: string }>(),
    ]);

    const latestByPlatform = new Map<string, ScrapingJob>();
    for (const job of jobs) {
      if (!latestByPlatform.has(job.platformId)) {
        latestByPlatform.set(job.platformId, job);
      }
    }

    const postsInDatabase = new Map<string, number>(
      postsByPlatform.map((row) => [row.platformId, parseInt(row.count) || 0]),
    );

    return {
      busy,
      jobs: Array.from(latestByPlatform.values()).map((job) => ({
        id: job.id,
        platformId: job.platformId,
        platformName: job.platform?.name ?? null,
        platformType: job.platform?.type ?? null,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        durationSeconds:
          job.startedAt && job.completedAt
            ? Math.max(
                0,
                Math.round(
                  (job.completedAt.getTime() - job.startedAt.getTime()) / 1000,
                ),
              )
            : null,
        postsInDatabase: postsInDatabase.get(job.platformId) ?? 0,
        postsCollected: job.postsCollected,
        errorsCount: job.errorsCount,
        errorMessage: job.errorMessage,
      })),
    };
  }
}
