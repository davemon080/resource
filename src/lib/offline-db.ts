import Dexie, { Table } from 'dexie';

export interface OfflineResource {
  id: string;
  type: 'video' | 'pdf';
  moduleId: string;
  blob: Blob;
  name: string;
  contentType: string;
  size: number;
  downloadedAt: Date;
}

export class OfflineDatabase extends Dexie {
  resources!: Table<OfflineResource>;

  constructor() {
    super('NexlifyOfflineDB');
    this.version(1).stores({
      resources: 'id, moduleId, type'
    });
  }
}

export const offlineDb = new OfflineDatabase();

export async function saveResourceForOffline(
  moduleId: string,
  url: string,
  type: 'video' | 'pdf',
  name: string
): Promise<void> {
  let blob: Blob;

  if (url.startsWith('data:')) {
    // Handle local data URL (base64)
    const response = await fetch(url);
    blob = await response.blob();
  } else {
    // Attempt direct fetch first, fallback to server proxy for CORS
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('CORS or Network Error');
      blob = await response.blob();
    } catch (err) {
      console.warn('Direct fetch failed, trying proxy...', err);
      // Use the server-side proxy
      const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch through proxy: ${response.statusText}`);
      }
      blob = await response.blob();
    }
  }
  
  const id = `${moduleId}-${type}`;
  
  await offlineDb.resources.put({
    id,
    moduleId,
    type,
    blob,
    name,
    contentType: blob.type || (type === 'pdf' ? 'application/pdf' : 'video/mp4'),
    size: blob.size,
    downloadedAt: new Date()
  });
}

export async function getOfflineResource(moduleId: string, type: 'video' | 'pdf'): Promise<OfflineResource | undefined> {
  return await offlineDb.resources.get(`${moduleId}-${type}`);
}

export async function removeOfflineResource(moduleId: string, type: 'video' | 'pdf'): Promise<void> {
  await offlineDb.resources.delete(`${moduleId}-${type}`);
}

export async function isResourceDownloaded(moduleId: string, type: 'video' | 'pdf'): Promise<boolean> {
  const count = await offlineDb.resources.where({ id: `${moduleId}-${type}` }).count();
  return count > 0;
}
