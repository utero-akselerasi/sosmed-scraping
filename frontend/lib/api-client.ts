import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /** Extract a useful, human-readable message from any API error. */
  public getErrorMessage(error: any, fallback: string): string {
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.response?.status) {
      return `Server error (HTTP ${error.response.status}).`;
    }
    if (error?.code === 'ECONNABORTED') {
      return 'Request timeout - backend is slow or unreachable.';
    }
    if (error?.request) {
      return 'Cannot reach backend at ' + API_URL + '. Is the backend running?';
    }
    return fallback;
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  public setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', token);
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, fullName: string) {
    const response = await this.client.post('/auth/register', { email, password, fullName });
    return response.data;
  }

  async getProfile() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Posts endpoints
  async getPosts(params?: any) {
    const response = await this.client.get('/posts', { params });
    return response.data;
  }

  async getPostById(id: string) {
    const response = await this.client.get(`/posts/${id}`);
    return response.data;
  }

  async getPostsStats(params?: any) {
    const response = await this.client.get('/posts/stats', { params });
    return response.data;
  }

  async getTrendingPosts(limit?: number) {
    const response = await this.client.get('/posts/trending', { params: { limit } });
    return response.data;
  }

  async getTopHashtags(limit?: number) {
    const response = await this.client.get('/analytics/top-hashtags', { params: { limit } });
    return response.data;
  }

  // Platforms endpoints
  async getPlatforms() {
    const response = await this.client.get('/platforms');
    return response.data;
  }

  async getPlatformOverview() {
    const response = await this.client.get('/platforms/overview');
    return response.data;
  }

  async getPlatformStats(id: string) {
    const response = await this.client.get(`/platforms/${id}/stats`);
    return response.data;
  }

  // Influencers endpoints
  async getInfluencers(params?: any) {
    const response = await this.client.get('/influencers', { params });
    return response.data;
  }

  async getInfluencerById(id: string) {
    const response = await this.client.get(`/influencers/${id}`);
    return response.data;
  }

  async getTopInfluencers(limit?: number) {
    const response = await this.client.get('/influencers/top', { params: { limit } });
    return response.data;
  }

  // Analytics endpoints
  async getDashboardOverview(params?: any) {
    const response = await this.client.get('/analytics/dashboard', { params });
    return response.data;
  }

  async getTrends(params?: any) {
    const response = await this.client.get('/analytics/trends', { params });
    return response.data;
  }

  async getSentimentAnalytics(params?: any) {
    const response = await this.client.get('/analytics/sentiment', { params });
    return response.data;
  }

  async getEngagementAnalytics(params?: any) {
    const response = await this.client.get('/analytics/engagement', { params });
    return response.data;
  }

  // Scraping endpoints
  async triggerScraping() {
    const response = await this.client.post('/scraping/run');
    return response.data;
  }

  async triggerThreadsScraping() {
    const response = await this.client.post('/scraping/run/threads');
    return response.data;
  }

  async getScrapingStatus() {
    const response = await this.client.get('/scraping/status');
    return response.data;
  }

  // Keywords endpoints
  async getKeywords(params?: any) {
    const response = await this.client.get('/keywords', { params });
    return response.data;
  }

  async createKeyword(data: any) {
    const response = await this.client.post('/keywords', data);
    return response.data;
  }

  async updateKeyword(id: string, data: any) {
    const response = await this.client.patch(`/keywords/${id}`, data);
    return response.data;
  }

  async deleteKeyword(id: string) {
    const response = await this.client.delete(`/keywords/${id}`);
    return response.data;
  }

  async toggleKeyword(id: string) {
    const response = await this.client.patch(`/keywords/${id}/toggle`);
    return response.data;
  }

  async getKeywordOverview(keyword: string) {
    const response = await this.client.get('/analytics/keyword/overview', {
      params: { keyword },
    });
    return response.data;
  }

  // Users endpoints
  async getUsers(params?: any) {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async createUser(data: any) {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  async updateUser(id: string, data: any) {
    const response = await this.client.patch(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  async toggleUserActive(id: string) {
    const response = await this.client.patch(`/users/${id}/toggle`);
    return response.data;
  }

  // Profile endpoints
  async updateProfile(data: { fullName?: string; email?: string }) {
    const response = await this.client.patch('/users/profile', data);
    return response.data;
  }

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    await this.client.patch('/users/profile/password', data);
  }
}

export const apiClient = new ApiClient();
