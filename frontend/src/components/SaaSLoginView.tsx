import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { signIn } from '../lib/auth-client';

const LOGIN_MEDIA_LIST = [
  '/login/1.gif',
  '/login/2.gif',
  '/login/3.gif',
  '/login/4.gif',
  '/login/5.gif',
];

interface SaaSLoginViewProps {
  onDemoClick: () => void;
}

export const SaaSLoginView: React.FC<SaaSLoginViewProps> = ({ onDemoClick }) => {
  // Randomly select one gif/video on mount / refresh
  const [selectedMedia] = useState(() => {
    const randomIndex = Math.floor(Math.random() * LOGIN_MEDIA_LIST.length);
    return LOGIN_MEDIA_LIST[randomIndex];
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleDiscordSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn.social({
        provider: 'discord',
        callbackURL: window.location.origin,
      });
    } catch (err) {
      console.warn('Discord OAuth error, switching to demo mode:', err);
      onDemoClick();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="discord-invite-wrapper">
      {/* Background GIF/Video running in full screen */}
      <img
        src={selectedMedia}
        alt="Discord Animated Background"
        className="discord-bg-media"
      />
      <div className="discord-bg-overlay" />

      {/* Discord Channel / Server Invite Card */}
      <div className="discord-invite-card" id="discord-login-card">
        {/* Discord Server Avatar */}
        <div className="discord-server-avatar-wrap">
          <div className="discord-server-avatar">
            <Icon icon="simple-icons:discord" width="44" height="44" color="#ffffff" />
          </div>
          <div className="discord-server-badge" title="Verified Community">
            <Icon icon="lucide:check" width="14" height="14" color="#ffffff" strokeWidth="3" />
          </div>
        </div>

        {/* Invite Header */}
        <h1 className="discord-server-title">TeleDrive Cloud</h1>

        {/* Primary Action: Discord Login / Accept Invite */}
        <button
          id="btn-login-discord"
          className="btn-discord-accept"
          onClick={handleDiscordSignIn}
          disabled={isLoading}
        >
          <Icon icon="simple-icons:discord" width="20" height="20" />
          <span>{isLoading ? 'Connecting to Discord...' : 'Login with Discord'}</span>
        </button>

        {/* Secondary Action: Demo Mode Option */}
        <button
          id="btn-login-demo"
          className="btn-discord-demo"
          onClick={onDemoClick}
          type="button"
        >
          <Icon icon="lucide:sparkles" width="16" height="16" color="#5865f2" />
          <span>Continue as Guest (Demo Mode)</span>
        </button>
      </div>
    </div>
  );
};
