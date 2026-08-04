'use client';

import { useEffect } from 'react';
import { X, ExternalLink, ThumbsUp, MessageCircle, Share2, Eye, Calendar, User, MapPin } from 'lucide-react';
import { Post } from '@/types';
import { formatNumber, formatRelativeTime, getSentimentColor, getPlatformColor } from '@/lib/format';
import { SentimentType } from '@/types';
import { cn } from '@/lib/utils';

const STAT_TILES = [
  { key: 'likes', icon: ThumbsUp, bg: 'bg-red-50 dark:bg-red-500/10', iconColor: 'text-red-500', get: (p: Post) => p.likesCount, label: 'Likes' },
  { key: 'comments', icon: MessageCircle, bg: 'bg-blue-50 dark:bg-blue-500/10', iconColor: 'text-blue-500', get: (p: Post) => p.commentsCount, label: 'Comments' },
  { key: 'shares', icon: Share2, bg: 'bg-purple-50 dark:bg-purple-500/10', iconColor: 'text-purple-500', get: (p: Post) => p.sharesCount, label: 'Shares' },
  { key: 'views', icon: Eye, bg: 'bg-orange-50 dark:bg-orange-500/10', iconColor: 'text-orange-500', get: (p: Post) => p.viewsCount || 0, label: 'Views' },
];

interface PostDetailModalProps {
  post: Post;
  onClose: () => void;
}

export function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Post by ${post.influencerName}`}
        className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-xl font-bold text-white">
              {post.influencerName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">{post.influencerName}</h2>
              <p className="text-sm text-muted-foreground">@{post.influencerUsername}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-6">
          {/* Platform & Sentiment Badges */}
          <div className="mb-4 flex items-center space-x-2">
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', getPlatformColor(post.platformName || ''))}>
              {post.platformName}
            </span>
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', getSentimentColor(post.sentiment as SentimentType))}>
              {post.sentiment}
            </span>
          </div>

          {/* Post Content */}
          <div className="mb-6">
            <p className="whitespace-pre-wrap text-base leading-relaxed text-card-foreground/90">{post.content}</p>
          </div>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-card-foreground">Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="cursor-pointer rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Stats */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Engagement Metrics</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {STAT_TILES.map((tile) => {
                const Icon = tile.icon;
                return (
                  <div key={tile.key} className={cn('rounded-xl p-4 text-center', tile.bg)}>
                    <Icon className={cn('mx-auto mb-2 h-6 w-6', tile.iconColor)} />
                    <p className="text-2xl font-bold text-card-foreground">{formatNumber(tile.get(post))}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{tile.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement Score */}
          <div className="mb-6">
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-emerald-800 dark:from-emerald-500/10 dark:to-teal-500/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">Engagement Score</p>
                  <p className="mt-1 text-xs text-muted-foreground">Overall engagement metric</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{post.engagementScore.toFixed(2)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">out of 100</p>
                </div>
              </div>
            </div>
          </div>

          {/* Post Info */}
          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Post Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                <span className="mr-2 font-medium">Published:</span>
                <span>{new Date(post.postedAt).toLocaleString()}</span>
                <span className="ml-2 text-muted-foreground/70">({formatRelativeTime(post.postedAt)})</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <User className="mr-2 h-4 w-4" />
                <span className="mr-2 font-medium">Scraped:</span>
                <span>{new Date(post.scrapedAt).toLocaleString()}</span>
              </div>
              {post.location && (
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4" />
                  <span className="mr-2 font-medium">Location:</span>
                  <span>{post.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/40 p-6">
          <div className="text-sm text-muted-foreground">
            Post ID: <span className="font-mono text-xs">{post.id}</span>
          </div>
          {post.postUrl && (
            <a
              href={post.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Original Post
            </a>
          )}
        </div>
      </div>
    </div>
  );
}