import React from 'react';
import { Icon } from '@iconify/react';

interface WelcomeBannerProps {
  userName?: string;
  onCreateClick: () => void;
  onUploadClick: () => void;
  onCreateFolderClick: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userName = 'Martin Mickael',
  onCreateClick,
  onUploadClick,
  onCreateFolderClick,
}) => {
  return (
    <div className="welcome-banner-row">
      {/* Left greeting */}
      <div className="welcome-text-col">
        <h1 className="welcome-heading">Welcome back, {userName}</h1>
        <p className="welcome-subheading">
          Welcome back! Let's continue your activity on the dashboard.
        </p>
      </div>

      {/* Right action buttons */}
      <div className="welcome-actions-col">
        <button
          id="btn-welcome-create"
          className="welcome-action-btn"
          onClick={onCreateClick}
        >
          <Icon icon="lucide:plus" width="15" height="15" />
          <span>Create</span>
        </button>

        <button
          id="btn-welcome-upload"
          className="welcome-action-btn"
          onClick={onUploadClick}
        >
          <Icon icon="lucide:upload" width="15" height="15" />
          <span>Upload or drop</span>
        </button>

        <button
          id="btn-welcome-create-folder"
          className="welcome-action-btn"
          onClick={onCreateFolderClick}
        >
          <Icon icon="lucide:folder-plus" width="15" height="15" />
          <span>Create folder</span>
        </button>
      </div>
    </div>
  );
};
