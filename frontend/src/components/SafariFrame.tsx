import React from 'react';
import { Icon } from '@iconify/react';

interface SafariFrameProps {
  children: React.ReactNode;
}

export const SafariFrame: React.FC<SafariFrameProps> = ({ children }) => {
  return (
    <div className="safari-viewport-wrapper">
      <div className="safari-browser-window">
        {/* Safari Top Window Bar */}
        <div className="safari-titlebar">
          {/* Window traffic lights and nav arrows */}
          <div className="safari-controls-left">
            <span className="window-dot dot-red" />
            <span className="window-dot dot-yellow" />
            <span className="window-dot dot-green" />
            <div className="safari-nav-arrows">
              <button className="safari-arrow-btn" title="Back" aria-label="Back">
                <Icon icon="lucide:chevron-left" width="16" height="16" />
              </button>
              <button className="safari-arrow-btn" title="Forward" aria-label="Forward">
                <Icon icon="lucide:chevron-right" width="16" height="16" />
              </button>
            </div>
          </div>

          {/* Center Address Capsule */}
          <div className="safari-address-capsule">
            <Icon icon="lucide:lock" width="12" height="12" className="safari-lock-icon" />
            <span className="safari-domain-text">Cloudnest.com</span>
          </div>

          {/* Right Safari Tools */}
          <div className="safari-controls-right">
            <button className="safari-tool-btn" title="Share" aria-label="Share">
              <Icon icon="lucide:share" width="15" height="15" />
            </button>
            <button className="safari-tool-btn" title="New Tab" aria-label="New Tab">
              <Icon icon="lucide:plus" width="16" height="16" />
            </button>
          </div>
        </div>

        {/* Browser Content Viewport */}
        <div className="safari-window-content">
          {children}
        </div>
      </div>
    </div>
  );
};
