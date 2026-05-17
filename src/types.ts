export enum ModuleType {
  VIDEO = 'video',
  PDF = 'pdf'
}

export interface Module {
  id: string;
  title: string;
  description: string;
  type: ModuleType;
  videoUrl?: string;
  pdfUrl?: string;
  thumbnailUrl?: string;
  order: number;
  duration?: number;
}

export interface UserProgress {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  unlockedModuleIndex: number;
  completed: boolean;
  completedAt?: string;
}
