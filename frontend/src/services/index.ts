import type { ApiService } from './api';
import { mockApiService } from './mockApi';

// Export the mock API service as the default implementation
export const apiService: ApiService = mockApiService;

// Re-export types
export * from './api';
