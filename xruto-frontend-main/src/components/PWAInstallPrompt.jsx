import React from 'react';
import { usePWA } from '../hooks/usePWA';

const PWAInstallPrompt = () => {
  const { isOnline, isInstallable, isInstalled, installPWA } = usePWA();

  const handleInstall = async () => {
    const installed = await installPWA();
    if (installed) {
      console.log('xRuto PWA installed successfully!');
    }
  };

  if (isInstalled) {
    return null; // Don't show if already installed
  }

  return (
    <>
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">You're offline - Some features may be limited</span>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {isInstallable && (
        <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">xR</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">Install xRuto App</h3>
              <p className="text-xs text-blue-100 mt-1">
                Get the full experience with offline access and faster loading
              </p>
              
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="bg-white text-blue-600 text-xs font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={() => {
                    // Hide the prompt (you might want to store this preference)
                    document.querySelector('.fixed.bottom-4').style.display = 'none';
                  }}
                  className="text-blue-100 text-xs px-3 py-1 rounded border border-blue-300 hover:bg-blue-500 transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            
            <button
              onClick={() => {
                document.querySelector('.fixed.bottom-4').style.display = 'none';
              }}
              className="flex-shrink-0 text-blue-100 hover:text-white"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;