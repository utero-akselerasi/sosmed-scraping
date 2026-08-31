'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export function useScrapingSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      timeout: 10000,
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // connected silently
    });

    socket.on('disconnect', () => {
      // disconnected silently
    });

    socket.on('connect_error', () => {
      // connection error silently - will retry
    });

    socket.on('scraping:job_started', () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-status'] });
    });

    socket.on('scraping:job_progress', () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-status'] });
    });

    socket.on('scraping:job_completed', () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-status'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['trends'] });
      queryClient.invalidateQueries({ queryKey: ['posts-stats'] });
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
    });

    socket.on('scraping:job_failed', () => {
      queryClient.invalidateQueries({ queryKey: ['scraping-status'] });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('scraping:job_started');
      socket.off('scraping:job_progress');
      socket.off('scraping:job_completed');
      socket.off('scraping:job_failed');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  return socketRef;
}
