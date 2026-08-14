import { loadApiEnvironment } from './environment';
import { createClient } from '@supabase/supabase-js';

export function businessMediaBucket() {
  loadApiEnvironment();
  return process.env.BUSINESS_MEDIA_BUCKET ?? 'business-media';
}

export function publicMediaUrl(bucket: string, path: string) {
  loadApiEnvironment();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for business media.');
  }
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export async function removeBusinessMediaObject(
  authorization: string | undefined,
  bucket: string,
  path: string,
) {
  loadApiEnvironment();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !publishableKey || !accessToken) {
    throw new Error('Authenticated media storage is not configured.');
  }
  const supabase = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error('The stored image could not be removed.');
}
