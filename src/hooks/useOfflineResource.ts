import { useState, useEffect, useCallback } from 'react';
import { 
  isResourceDownloaded, 
  saveResourceForOffline, 
  removeOfflineResource, 
  getOfflineResource,
  OfflineResource 
} from '@/lib/offline-db';
import { toast } from 'sonner';

export function useOfflineResource(moduleId: string, type: 'video' | 'pdf') {
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [resource, setResource] = useState<OfflineResource | undefined>(undefined);

  const checkStatus = useCallback(async () => {
    const downloaded = await isResourceDownloaded(moduleId, type);
    setIsDownloaded(downloaded);
    if (downloaded) {
      const res = await getOfflineResource(moduleId, type);
      setResource(res);
    } else {
      setResource(undefined);
    }
  }, [moduleId, type]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const download = async (url: string, name: string) => {
    setIsDownloading(true);
    try {
      await saveResourceForOffline(moduleId, url, type, name);
      setIsDownloaded(true);
      await checkStatus();
      toast.success(`${name} downloaded for offline use`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Failed to download ${name}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const remove = async () => {
    try {
      await removeOfflineResource(moduleId, type);
      setIsDownloaded(false);
      setResource(undefined);
      toast.success('Offline resource removed');
    } catch (error) {
      console.error('Removal failed:', error);
      toast.error('Failed to remove offline resource');
    }
  };

  return {
    isDownloaded,
    isDownloading,
    resource,
    download,
    remove,
    refresh: checkStatus
  };
}
