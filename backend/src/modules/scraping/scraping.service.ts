import {
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import {
  ScrapingJob,
  CollectionStatus,
} from "../../common/entities/scraping-job.entity";

export type TriggerResult = "started" | "busy";

@Injectable()
export class ScrapingService implements OnModuleInit {
  private readonly logger = new Logger(ScrapingService.name);

  private busy = false;
  private currentChild: ChildProcess | null = null;

  constructor(
    @InjectRepository(ScrapingJob)
    private readonly jobsRepo: Repository<ScrapingJob>,
    private readonly configService: ConfigService,
  ) {}

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
      this.configService.get<number>("workers.staleTimeout") ||
      30 * 60 * 1000
    );
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
      this.spawnWorker();
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
   * SEMENTARA (fase pengembangan Website Scraper): hanya memanggil
   * website/scraper.py, BUKAN run_all.py. Kembalikan ke run_all.py
   * setelah Website Scraper benar-benar selesai.
   */
  spawnWorker(): ChildProcess {
    const script = "website/scraper.py";
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
   * Status scraping untuk dashboard. Sumber data: tabel scraping_jobs
   * (job terbaru per platform).
   */
  async getStatus() {
    const [busy, jobs] = await Promise.all([
      this.isBusy(),
      this.jobsRepo.find({
        order: { createdAt: "DESC" },
        relations: ["platform"],
        take: 200,
      }),
    ]);

    const latestByPlatform = new Map<string, ScrapingJob>();
    for (const job of jobs) {
      if (!latestByPlatform.has(job.platformId)) {
        latestByPlatform.set(job.platformId, job);
      }
    }

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
        postsCollected: job.postsCollected,
        errorsCount: job.errorsCount,
        errorMessage: job.errorMessage,
      })),
    };
  }
}
