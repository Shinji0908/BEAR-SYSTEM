import { useEffect } from 'react';

const SecurityProtection = () => {
  useEffect(() => {
    // Basic protection measures (can be bypassed by determined users)
    
    // 1. Disable right-click
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // 2. Disable Ctrl+U (View Source) but allow F12
    const handleKeyDown = (e) => {
      // Disable Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      // Disable Ctrl+Shift+C (Element Inspector)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
      }
    };

    // 3. Disable text selection
    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    // 4. Disable drag
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Advanced source protection
    const protectSourceCode = () => {
      // 1. Override console methods to hide source
      const originalLog = console.log;
      
      console.log = function(...args) {
        // Hide internal function calls
        const stack = new Error().stack;
        if (stack && (stack.includes('NotificationSystem') || stack.includes('SecurityProtection'))) {
          return;
        }
        originalLog.apply(console, args);
      };
      
      // 2. Disable source map access
      if (window.performance && window.performance.getEntriesByType) {
        const originalGetEntries = window.performance.getEntriesByType;
        window.performance.getEntriesByType = function(type) {
          if (type === 'navigation' || type === 'resource') {
            return originalGetEntries.call(this, type).filter(entry => 
              !entry.name.includes('src/') && 
              !entry.name.includes('components/') &&
              !entry.name.includes('.js')
            );
          }
          return originalGetEntries.call(this, type);
        };
      }
      
      // 3. Override toString methods to hide function source
      const originalToString = Function.prototype.toString;
      // eslint-disable-next-line no-extend-native
      Function.prototype.toString = function() {
        if (this.name && (this.name.includes('Notification') || this.name.includes('Security'))) {
          return 'function() { [native code] }';
        }
        return originalToString.call(this);
      };
    };
    
    // 4. Hide source files from Network tab
    const hideSourceFiles = () => {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && (url.includes('.js') || url.includes('src/'))) {
          return Promise.resolve(new Response('', { status: 404 }));
        }
        return originalFetch.apply(this, args);
      };
    };
    
    const disableSourceMaps = () => {
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        if (script.src && script.src.includes('.js')) {
          script.removeAttribute('src');
        }
      });
    };
    
    protectSourceCode();
    hideSourceFiles();
    disableSourceMaps();
    
    console.clear();
    console.log('%c⚠️ WARNING ⚠️', 'color: red; font-size: 20px; font-weight: bold;');
    console.log('%cThis is a browser feature intended for developers. Do not enter any code here that someone told you to copy and paste.', 'color: red; font-size: 14px;');
    console.log('%c🔒 Source code protection is active', 'color: orange; font-size: 12px;');

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
};

export default SecurityProtection;
