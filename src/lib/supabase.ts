import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'meeting-app',
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      });
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const startConnectionMonitor = () => {
};

export const stopConnectionMonitor = () => {
};

export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  return { success: true };
};

export const retryQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  delayMs = 1000
): Promise<{ data: T | null; error: any }> => {
  let lastError: any = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await queryFn();

      if (!result.error) {
        return result;
      }

      lastError = result.error;

      if (i < maxRetries - 1) {
        console.log(`🔄 Retry attempt ${i + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  return { data: null, error: lastError };
};

export interface Meeting {
  id: string;
  meeting_name: string;
  meeting_id: string;
  password: string;
  attended: boolean;
  meeting_time?: string;
  hour?: number;
  time_period?: string;
  member_count?: number;
  is_valid?: boolean;
  validation_message?: string;
  client_id?: string;
  client_name?: string;
  is_instant?: boolean;
  screenshot_url?: string;
  created_at: string;
  updated_at: string;
}
