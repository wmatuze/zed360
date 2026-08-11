import { loadApiEnvironment } from './environment';

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
