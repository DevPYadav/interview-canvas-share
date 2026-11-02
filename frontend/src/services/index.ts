import type { ApiService } from './api';
import { mockApiService } from './mockApi';
import { httpApiService } from './httpApi';

// Set VITE_USE_MOCK=true to run the UI on mock data
export const apiService: ApiService =
  import.meta.env.VITE_USE_MOCK === 'true' ? mockApiService : httpApiService;

export type * from './api';
