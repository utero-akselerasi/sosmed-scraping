'use client';

import { X, ExternalLink, ThumbsUp, MessageCircle, Share2, Eye, Calendar, User } from 'lucide-react';
import { Post } from '@/types';
import { formatNumber, formatRelativeTime, getSentimentColor, getPlatformColor } from '@/lib/format';
import { SentimentType } from '@/types';

interface PostDetailModalProps {
  post: Post;
  onClose: () => void;
}

export function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {post.authorName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{post.authorName}</h2>
              <p className="text-sm text-gray-500">@{post.authorUsername}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Platform & Sentiment Badges */}
          <div className="flex items-center space-x-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(post.platform?.name || '')}`}>
              {post.platform?.name}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSentimentColor(post.sentiment as SentimentType)}`}>
              {post.sentiment}
            </span>
            {post.isVerified && (
              <span className="text-blue-500 text-sm" title="Verified Account">
                ✓ Verified
              </span>
            )}
          </div>

          {/* Post Content */}
          <div className="mb-6">
            <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Stats */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Engagement Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <ThumbsUp className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatNumber(post.likesCount)}</p>
                <p className="text-xs text-gray-600 mt-1">Likes</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <MessageCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatNumber(post.commentsCount)}</p>
                <p className="text-xs text-gray-600 mt-1">Comments</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <Share2 className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatNumber(post.sharesCount)}</p>
                <p className="text-xs text-gray-600 mt-1">Shares</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <Eye className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatNumber(post.viewsCount || 0)}</p>
                <p className="text-xs text-gray-600 mt-1">Views</p>
              </div>
            </div>
          </div>

          {/* Engagement Score */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Engagement Score</p>
                  <p className="text-xs text-gray-600 mt-1">Overall engagement metric</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">{post.engagementScore.toFixed(2)}</p>
                  <p className="text-xs text-gray-600 mt-1">out of 100</p>
                </div>
              </div>
            </div>
          </div>

          {/* Post Info */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Post Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="font-medium mr-2">Published:</span>
                <span>{new Date(post.publishedAt).toLocaleString()}</span>
                <span className="ml-2 text-gray-500">({formatRelativeTime(post.publishedAt)})</span>
              </div>
              <div className="flex items-center text-gray-600">
                <User className="w-4 h-4 mr-2" />
                <span className="font-medium mr-2">Scraped:</span>
                <span>{new Date(post.scrapedAt).toLocaleString()}</span>
              </div>
              {post.location && (
                <div className="flex items-center text-gray-600">
                  <span className="mr-2">📍</span>
                  <span className="font-medium mr-2">Location:</span>
                  <span>{post.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Post ID: <span className="font-mono text-xs">{post.id}</span>
          </div>
          {post.postUrl && (
            <a
              href={post.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Original Post
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
