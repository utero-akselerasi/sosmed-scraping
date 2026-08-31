import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

export interface ScrapingJobStartedEvent {
  jobId: string;
  platform: string;
  startedAt: string;
}

export interface ScrapingJobProgressEvent {
  jobId: string;
  platform: string;
  status: string;
  message: string;
}

export interface ScrapingJobCompletedEvent {
  jobId: string;
  platform: string;
  completedAt: string;
  postsFound: number;
}

export interface ScrapingJobFailedEvent {
  jobId: string;
  platform: string;
  error: string;
  failedAt: string;
}

@WebSocketGateway({
  cors: {
    origin: ["http://localhost:3000"],
    credentials: true,
  },
  namespace: "/",
})
export class ScrapingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ScrapingGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitJobStarted(payload: ScrapingJobStartedEvent): void {
    this.server?.emit("scraping:job_started", payload);
  }

  emitJobProgress(payload: ScrapingJobProgressEvent): void {
    this.server?.emit("scraping:job_progress", payload);
  }

  emitJobCompleted(payload: ScrapingJobCompletedEvent): void {
    this.server?.emit("scraping:job_completed", payload);
  }

  emitJobFailed(payload: ScrapingJobFailedEvent): void {
    this.server?.emit("scraping:job_failed", payload);
  }
}
