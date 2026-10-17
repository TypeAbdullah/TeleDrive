import { TeleFile, TeleFolder, StorageStats } from '../types';

export const DEMO_FOLDERS: TeleFolder[] = [
  { _id: 'f1', userId: 'demo', parentId: null, name: 'UI UX Design', color: '#ffb703', isTrash: false, createdAt: '2022-02-12', updatedAt: '2022-02-12' },
  { _id: 'f2', userId: 'demo', parentId: null, name: 'Legal Docs', color: '#ffb703', isTrash: false, createdAt: '2022-02-14', updatedAt: '2022-02-14' },
  { _id: 'f3', userId: 'demo', parentId: null, name: 'Reports', color: '#ffb703', isTrash: false, createdAt: '2022-02-16', updatedAt: '2022-02-16' },
  { _id: 'f4', userId: 'demo', parentId: null, name: 'Presentations', color: '#ffb703', isTrash: false, createdAt: '2022-02-18', updatedAt: '2022-02-18' },
  { _id: 'f5', userId: 'demo', parentId: null, name: 'Documents', color: '#ffb703', isTrash: false, createdAt: '2022-02-19', updatedAt: '2022-02-19' },
  { _id: 'f6', userId: 'demo', parentId: null, name: 'Template', color: '#ffb703', isTrash: false, createdAt: '2022-02-20', updatedAt: '2022-02-20' },
  { _id: 'f7', userId: 'demo', parentId: null, name: 'Important', color: '#ffb703', isTrash: false, createdAt: '2022-02-22', updatedAt: '2022-02-22' },
  { _id: 'f8', userId: 'demo', parentId: null, name: 'Meetings', color: '#ffb703', isTrash: false, createdAt: '2022-02-25', updatedAt: '2022-02-25' },
  { _id: 'f9', userId: 'demo', parentId: null, name: 'Resources', color: '#ffb703', isTrash: false, createdAt: '2022-02-27', updatedAt: '2022-02-27' },
  { _id: 'f10', userId: 'demo', parentId: null, name: 'Client Files', color: '#ffb703', isTrash: false, createdAt: '2022-03-01', updatedAt: '2022-03-01' },
];

export const DEMO_SIDEBAR_FOLDERS: string[] = [
  'Landing Page',
  'Mobile',
  'Dashboard',
  'Footer',
];

export const DEMO_FILES: (TeleFile & { sharedBy: { name: string; avatarBg: string; avatarUrl?: string } })[] = [
  {
    _id: 'file-1',
    userId: 'demo',
    folderId: null,
    name: 'Design_Campaign.photo.JPG',
    size: 3 * 1024 * 1024 * 1024, // 3.0 GB
    mimeType: 'image/jpeg',
    status: 'ready',
    isStarred: true,
    isTrash: false,
    createdAt: '2020-06-11T10:00:00Z',
    updatedAt: '2020-06-11T10:00:00Z',
    sharedBy: { name: 'Devon Lane', avatarBg: '#3b82f6', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60' },
  },
  {
    _id: 'file-2',
    userId: 'demo',
    folderId: null,
    name: 'Design_Illustrator.ZIP',
    size: 4.2 * 1024 * 1024 * 1024, // 4.2 GB
    mimeType: 'application/zip',
    status: 'ready',
    isStarred: false,
    isTrash: false,
    createdAt: '2020-06-10T14:30:00Z',
    updatedAt: '2020-06-10T14:30:00Z',
    sharedBy: { name: 'Ronald Richards', avatarBg: '#10b981', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60' },
  },
  {
    _id: 'file-3',
    userId: 'demo',
    folderId: null,
    name: 'Design_Canva.Video.MKV',
    size: 2.2 * 1024 * 1024 * 1024, // 2.2 GB
    mimeType: 'video/mp4',
    status: 'ready',
    isStarred: true,
    isTrash: false,
    createdAt: '2020-06-09T09:15:00Z',
    updatedAt: '2020-06-09T09:15:00Z',
    sharedBy: { name: 'Courtney Henry', avatarBg: '#ec4899', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=60' },
  },
  {
    _id: 'file-4',
    userId: 'demo',
    folderId: null,
    name: 'Design_Figma.file.FIG',
    size: 4.3 * 1024 * 1024 * 1024, // 4.3 GB
    mimeType: 'application/octet-stream',
    status: 'ready',
    isStarred: false,
    isTrash: false,
    createdAt: '2020-06-08T16:45:00Z',
    updatedAt: '2020-06-08T16:45:00Z',
    sharedBy: { name: 'Natasya Tailor', avatarBg: '#8b5cf6', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&auto=format&fit=crop&q=60' },
  },
  {
    _id: 'file-5',
    userId: 'demo',
    folderId: null,
    name: 'Canva.Stock.photo.JPG',
    size: 2.7 * 1024 * 1024 * 1024, // 2.7 GB
    mimeType: 'image/jpeg',
    status: 'ready',
    isStarred: false,
    isTrash: false,
    createdAt: '2020-06-07T11:20:00Z',
    updatedAt: '2020-06-07T11:20:00Z',
    sharedBy: { name: 'Melina Sofia', avatarBg: '#f59e0b', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=60' },
  },
  {
    _id: 'file-6',
    userId: 'demo',
    folderId: null,
    name: 'Project_Specification.DOCX',
    size: 1.8 * 1024 * 1024 * 1024, // 1.8 GB
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    status: 'ready',
    isStarred: false,
    isTrash: false,
    createdAt: '2020-06-05T08:10:00Z',
    updatedAt: '2020-06-05T08:10:00Z',
    sharedBy: { name: 'Devon Lane', avatarBg: '#3b82f6', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60' },
  },
];

export const DEMO_STORAGE_STATS: StorageStats = {
  usedBytes: 55 * 1024 * 1024 * 1024, // 55 GB
  quotaBytes: 100 * 1024 * 1024 * 1024, // 100 GB
  percentUsed: 55,
  fileCount: 24,
};

export const DEMO_SUGGESTED_CARDS = [
  { type: 'DOCX', label: 'DOCX', count: '14 files', color: '#2563eb' },
  { type: 'JPG', label: 'JPG', count: '48 files', color: '#10b981' },
  { type: 'PDF', label: 'PDF', count: '29 files', color: '#ef4444' },
  { type: 'PNG', label: 'PNG', count: '62 files', color: '#f59e0b' },
];
