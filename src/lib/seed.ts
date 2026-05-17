import { apiService, ModuleType, Module } from '@/services/api';

const INITIAL_MODULES: Partial<Module>[] = [
  {
    id: 'intro-101',
    title: 'Introduction to Full Stack Development',
    description: 'An overview of the modern web development ecosystem and what you will learn in this program.',
    type: ModuleType.VIDEO,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=400',
    order: 0,
    duration: 60,
  },
  {
    id: 'cloud-202',
    title: 'Cloud Architecture Basics',
    description: 'Learn the fundamentals of cloud infrastructure and how to deploy your first application.',
    type: ModuleType.VIDEO,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400',
    order: 1,
    duration: 120,
  },
  {
    id: 'db-303',
    title: 'Mastering Database Design',
    description: 'Understand relational and NoSQL databases, and how to choose the right one for your needs.',
    type: ModuleType.VIDEO,
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544383335-c5174ae0f1ef?auto=format&fit=crop&q=80&w=400',
    order: 2,
    duration: 90,
  },
  {
    id: 'pdf-404',
    title: 'Curriculum PDF Guide',
    description: 'Download the full course syllabus and resource guide.',
    type: ModuleType.PDF,
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=400',
    order: 3,
  }
];

let isSeeding = false;

export async function seedModules() {
  if (isSeeding) return;
  try {
    isSeeding = true;
    const existing = await apiService.getModules();
    if (existing.length === 0) {
      console.log('Seeding modules to PostgreSQL...');
      for (const module of INITIAL_MODULES) {
        await apiService.createModule(module);
      }
      console.log('Seeding complete.');
    }
  } catch (err) {
    console.error('Failed to seed modules:', err);
  } finally {
    isSeeding = false;
  }
}
