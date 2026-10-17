import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from './lib/auth-client';
import { api } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { WelcomeBanner } from './components/WelcomeBanner';
import { FolderGrid } from './components/FolderGrid';
import { FoldersView } from './components/FoldersView';
import { PhotosView } from './components/PhotosView';
import { FilesTable, FilesTableItem, DEFAULT_SCREENSHOT_FILES } from './components/FilesTable';
import { SaaSQuickLookModal } from './components/SaaSQuickLookModal';
import { FileDetailsView } from './components/FileDetailsView';
import {
  SaaSNewFolderModal,
  SaaSRenameModal,
  SaaSShareModal,
  SaaSAccountsModal,
  SaaSDeveloperModal,
} from './components/SaaSModals';
import { SaaSLoginView } from './components/SaaSLoginView';
import { PublicDownloadView } from './components/PublicDownloadView';
import { AdminLayout } from './components/admin/AdminLayout';
import {
  TeleFile,
  TeleFolder,
  StorageStats,
  StorageAccountInfo,
  ApiKeyInfo,
  TeleUser,
} from './types';

export const App: React.FC = () => {
  const [isAdminOpen, setIsAdminOpen] = useState(window.location.pathname.startsWith('/admin'));

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminOpen(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check if admin dashboard
  if (isAdminOpen || window.location.pathname.startsWith('/admin')) {
    return (
      <AdminLayout
        onExitAdmin={() => {
          setIsAdminOpen(false);
          if (window.location.pathname.startsWith('/admin')) {
            window.history.pushState({}, '', '/');
          }
        }}
      />
    );
  }

  // Check if public download share link
  const path = window.location.pathname;
  if (path.startsWith('/dl/')) {
    const token = path.replace('/dl/', '').split('/')[0];
    return <PublicDownloadView token={token} />;
  }

  // Session
  const { data: session, isPending } = useSession();

  // Navigation & Filter State
  const [currentTab, setCurrentTab] = useState<string>('all-files');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);

  // Data State
  const [folders, setFolders] = useState<TeleFolder[]>([]);
  const [files, setFiles] = useState<FilesTableItem[]>(DEFAULT_SCREENSHOT_FILES);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Item
  const [selectedFile, setSelectedFile] = useState<TeleFile | null>(DEFAULT_SCREENSHOT_FILES[1]);
  const [detailedFile, setDetailedFile] = useState<TeleFile | null>(null);

  // Modals
  const [quickLookFile, setQuickLookFile] = useState<TeleFile | null>(null);
  const [shareFile, setShareFile] = useState<TeleFile | null>(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ item: TeleFile | TeleFolder; type: 'file' | 'folder' } | null>(null);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isDeveloperOpen, setIsDeveloperOpen] = useState(false);
  const [accounts, setAccounts] = useState<StorageAccountInfo[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);

  // File Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Demo user toggle for local preview before Discord setup
  const [isDemoUser, setIsDemoUser] = useState(false);

  // Fetch content from backend if available
  const loadData = async () => {
    try {
      const [fList, fileList, stats] = await Promise.all([
        api.getFolders(currentFolderId).catch(() => []),
        api.getFiles({ folderId: currentFolderId, search: searchQuery || undefined }).catch(() => []),
        api.getStorageStats().catch(() => null),
      ]);

      if (fList && fList.length > 0) {
        setFolders(fList);
      }

      if (fileList && fileList.length > 0) {
        // Merge real files with screenshot sample items
        const merged: FilesTableItem[] = [
          ...fileList.map((f: TeleFile) => ({
            ...f,
            sharedBy: {
              name: 'You',
              avatarBg: '#3b82f6',
            },
          })),
          ...DEFAULT_SCREENSHOT_FILES.filter(
            (df) => !fileList.some((rf: TeleFile) => rf.name.toLowerCase() === df.name.toLowerCase())
          ),
        ];
        setFiles(merged);
      } else {
        setFiles(DEFAULT_SCREENSHOT_FILES);
      }

      if (stats) setStorageStats(stats);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    if (session?.user || isDemoUser) {
      loadData();
    }
  }, [currentTab, currentFolderId, searchQuery, session, isDemoUser]);

  // Handlers
  const handleUploadFiles = async (fileList: FileList) => {
    setIsUploading(true);
    for (let i = 0; i < fileList.length; i++) {
      try {
        await api.uploadFile(fileList[i], currentFolderId);
      } catch (err: any) {
        console.warn('Upload API fallback:', err.message);
        // Add optimistic uploaded item to files table
        const newFileItem: FilesTableItem = {
          _id: `upload-${Date.now()}-${i}`,
          userId: 'user-me',
          folderId: currentFolderId,
          name: fileList[i].name,
          size: fileList[i].size,
          mimeType: fileList[i].type || 'application/octet-stream',
          status: 'ready',
          isStarred: false,
          isTrash: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sharedBy: {
            name: 'Martin Mickael',
            avatarBg: '#2563eb',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
          },
        };
        setFiles((prev) => [newFileItem, ...prev]);
      }
    }
    setIsUploading(false);
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await api.createFolder(name, currentFolderId);
      loadData();
    } catch (err: any) {
      // Optimistic folder creation
      const newFolderItem: TeleFolder = {
        _id: `folder-${Date.now()}`,
        userId: 'user-me',
        parentId: currentFolderId,
        name,
        color: '#f59e0b',
        isTrash: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setFolders((prev) => [newFolderItem, ...prev]);
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameTarget) return;
    try {
      if (renameTarget.type === 'folder') {
        await api.renameFolder(renameTarget.item._id, newName);
      } else {
        await api.renameFile(renameTarget.item._id, newName);
      }
      loadData();
    } catch {
      // Optimistic rename
      if (renameTarget.type === 'file') {
        setFiles((prev) =>
          prev.map((f) => (f._id === renameTarget.item._id ? { ...f, name: newName } : f))
        );
      } else {
        setFolders((prev) =>
          prev.map((f) => (f._id === renameTarget.item._id ? { ...f, name: newName } : f))
        );
      }
    }
  };

  const handleTrash = async (item: TeleFile | TeleFolder, type: 'file' | 'folder') => {
    try {
      if (type === 'folder') {
        await api.trashFolder(item._id);
      } else {
        await api.trashFile(item._id);
      }
      loadData();
    } catch {
      // Optimistic delete
      if (type === 'file') {
        setFiles((prev) => prev.filter((f) => f._id !== item._id));
        if (selectedFile?._id === item._id) setSelectedFile(null);
      } else {
        setFolders((prev) => prev.filter((f) => f._id !== item._id));
      }
    }
  };

  const handleMakeCopy = (file: TeleFile) => {
    const copyItem: FilesTableItem = {
      ...file,
      _id: `copy-${Date.now()}`,
      name: `Copy of ${file.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sharedBy: {
        name: 'Martin Mickael',
        avatarBg: '#2563eb',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
      },
    };
    setFiles((prev) => [copyItem, ...prev]);
  };

  const handleOpenAccounts = async () => {
    try {
      const list = await api.getAccounts();
      setAccounts(list);
    } catch {
      setAccounts([]);
    }
    setIsAccountsOpen(true);
  };

  const handleOpenDeveloper = async () => {
    try {
      const list = await api.getApiKeys();
      setApiKeys(list);
    } catch {
      setApiKeys([]);
    }
    setIsDeveloperOpen(true);
  };

  // If not logged in & not demo, render Login View
  if (!isPending && !session?.user && !isDemoUser) {
    return <SaaSLoginView onDemoClick={() => setIsDemoUser(true)} />;
  }

  const currentUser: TeleUser = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || 'Martin Mickael',
        email: session.user.email || 'martinmickael@gmail.com',
        image: session.user.image,
      }
    : {
        id: 'user-martin',
        name: 'Martin Mickael',
        email: 'martinmickael@gmail.com',
        image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
      };

  // Files filtered by activity cards (DOCX, JPG, PDF, PNG) or sidebar tab
  const displayedFiles = files.filter((f) => {
    if (activityFilter) {
      const ext = f.name.split('.').pop()?.toUpperCase();
      if (ext !== activityFilter) return false;
    }
    if (currentTab === 'photo') {
      const isImg = f.mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
      if (!isImg) return false;
    }
    if (currentTab === 'favorite') {
      if (!f.isStarred) return false;
    }
    if (currentTab === 'shared') {
      if (!f.sharedBy) return false;
    }
    return true;
  });

  return (
    <div className="cloudnest-app-container" id="tele-drive-app">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) handleUploadFiles(e.target.files);
          }}
        />

        {/* Left Column: Cloudnest White Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            setCurrentFolderId(null);
            setDetailedFile(null);
          }}
          user={currentUser}
          folders={folders}
          currentFolderId={currentFolderId}
          onSelectFolder={(folderId) => setCurrentFolderId(folderId)}
          storageStats={storageStats}
          onOpenAccounts={handleOpenAccounts}
          onOpenDeveloper={handleOpenDeveloper}
          onOpenAdmin={() => {
            setIsAdminOpen(true);
            window.history.pushState({}, '', '/admin');
          }}
          onSignOut={() => {
            if (session) signOut();
            else setIsDemoUser(false);
          }}
        />

        {/* Middle Column: View Selection (File Details, Folders, Photos, or All Files Dashboard) */}
        {detailedFile ? (
          <FileDetailsView
            file={detailedFile}
            onBack={() => setDetailedFile(null)}
            onDownload={(file) => {
              if (file._id.startsWith('sample-') || file._id.startsWith('p-')) {
                alert(`Downloading ${file.name}...`);
              } else {
                window.open(`/api/v1/download/${file._id}`, '_blank');
              }
            }}
            onShare={(file) => setShareFile(file)}
            onRename={(file) => setRenameTarget({ item: file, type: 'file' })}
            onTrash={(file) => {
              handleTrash(file, 'file');
              setDetailedFile(null);
            }}
            onQuickLook={(file) => setQuickLookFile(file)}
          />
        ) : currentTab === 'folders' ? (
          <FoldersView
            realFolders={folders}
            onOpenFolder={(folderId) => {
              setCurrentFolderId(folderId);
              setCurrentTab('all-files');
            }}
            onNewFolderClick={() => setIsNewFolderOpen(true)}
            onUploadClick={() => fileInputRef.current?.click()}
            onRenameFolder={(f) => setRenameTarget({ item: f, type: 'folder' })}
            onDeleteFolder={(f) => handleTrash(f, 'folder')}
          />
        ) : currentTab === 'photos' ? (
          <PhotosView
            realFiles={files}
            onUploadClick={() => fileInputRef.current?.click()}
            onQuickLook={(file) => setQuickLookFile(file)}
            onDownload={(file) => {
              if (file._id.startsWith('sample-') || file._id.startsWith('p-')) {
                alert(`Downloading ${file.name}...`);
              } else {
                window.open(`/api/v1/download/${file._id}`, '_blank');
              }
            }}
            onShare={(file) => setShareFile(file)}
            onTrash={(file) => handleTrash(file, 'file')}
            onOpenDetails={(file) => setDetailedFile(file)}
          />
        ) : (
          <main className="cloudnest-main">
            {/* Top Header */}
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onInviteMember={() => {
                navigator.clipboard?.writeText('https://cloudnest.com/invite/teledrive');
                alert('Invitation link copied to clipboard: https://cloudnest.com/invite/teledrive');
              }}
            />

            {/* Scrollable Content Body */}
            <div className="cloudnest-scroll-body">
              {isUploading && (
                <div
                  style={{
                    padding: '10px 16px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    color: '#1d4ed8',
                    fontSize: '13px',
                    fontWeight: 500,
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  Uploading file(s) to Telegram cluster storage...
                </div>
              )}

              {/* Welcome Banner */}
              <WelcomeBanner
                userName={currentUser.name}
                onCreateClick={() => fileInputRef.current?.click()}
                onUploadClick={() => fileInputRef.current?.click()}
                onCreateFolderClick={() => setIsNewFolderOpen(true)}
              />

              {/* Folder Grid (10 pills) */}
              <FolderGrid
                folders={folders}
                currentFolderId={currentFolderId}
                onSelectFolder={(folderId) => setCurrentFolderId(folderId)}
                onOpenFolder={(folderId) => setCurrentFolderId(folderId)}
                onRenameFolder={(f) => setRenameTarget({ item: f, type: 'folder' })}
                onDeleteFolder={(f) => handleTrash(f, 'folder')}
              />

              {/* Your File Table */}
              <FilesTable
                files={displayedFiles}
                selectedId={selectedFile?._id || 'sample-file-2'}
                onSelect={(item) => setSelectedFile(item)}
                onQuickLook={(file) => setQuickLookFile(file)}
                onShare={(file) => setShareFile(file)}
                onDownload={(file) => {
                  if (file._id.startsWith('sample-')) {
                    alert(`Downloading ${file.name}...`);
                  } else {
                    window.open(`/api/v1/download/${file._id}`, '_blank');
                  }
                }}
                onRename={(item) => setRenameTarget({ item, type: 'file' })}
                onTrash={(item) => handleTrash(item, 'file')}
                onMakeCopy={handleMakeCopy}
                onOpenDetails={(file) => setDetailedFile(file)}
              />
            </div>
          </main>
        )}

        {/* Quick View Lightbox */}
        <SaaSQuickLookModal
          file={quickLookFile}
          onClose={() => setQuickLookFile(null)}
          onShare={(f) => {
            setQuickLookFile(null);
            setShareFile(f);
          }}
        />

        {/* Modals */}
        <SaaSNewFolderModal
          isOpen={isNewFolderOpen}
          onClose={() => setIsNewFolderOpen(false)}
          onCreate={handleCreateFolder}
        />

        <SaaSRenameModal
          isOpen={!!renameTarget}
          item={renameTarget?.item || null}
          type={renameTarget?.type || 'file'}
          onClose={() => setRenameTarget(null)}
          onRename={handleRename}
        />

        <SaaSShareModal
          isOpen={!!shareFile}
          file={shareFile}
          onClose={() => setShareFile(null)}
          onCreateShare={api.createShare}
        />

        <SaaSAccountsModal
          isOpen={isAccountsOpen}
          onClose={() => setIsAccountsOpen(false)}
          accounts={accounts}
          onAddAccount={async (data) => {
            await api.addAccount(data);
            const list = await api.getAccounts();
            setAccounts(list);
          }}
          onDeleteAccount={async (id) => {
            await api.deleteAccount(id);
            const list = await api.getAccounts();
            setAccounts(list);
          }}
        />

        <SaaSDeveloperModal
          isOpen={isDeveloperOpen}
          onClose={() => setIsDeveloperOpen(false)}
          apiKeys={apiKeys}
          onCreateKey={api.createApiKey}
          onRevokeKey={async (keyId) => {
            await api.revokeApiKey(keyId);
            const list = await api.getApiKeys();
            setApiKeys(list);
          }}
        />
      </div>
  );
};
