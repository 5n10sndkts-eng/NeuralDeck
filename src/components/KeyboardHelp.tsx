import React, { useState } from 'react';

interface KeyboardShortcut {
  key: string;
  description: string;
  category: 'Voice' | 'Audio' | 'Vision' | 'Navigation';
}

const SHORTCUTS: KeyboardShortcut[] = [
  // Voice Commands (Story 9)
  { key: 'V', description: 'Toggle Voice Input', category: 'Voice' },
  { key: 'Esc', description: 'Stop Voice Recognition', category: 'Voice' },
  
  // Audio Controls (Story 11)
  { key: 'M', description: 'Mute/Unmute Audio', category: 'Audio' },
  { key: 'Shift + M', description: 'Toggle Audio Preset', category: 'Audio' },
  { key: '↑ / ↓', description: 'Volume Up/Down', category: 'Audio' },
  
  // Vision Input (Story 10)
  { key: 'Ctrl + V', description: 'Paste Image for Analysis', category: 'Vision' },
  { key: 'Drag & Drop', description: 'Drop Image to Analyze', category: 'Vision' },
  
  // Navigation
  { key: 'Tab', description: 'Cycle Agent Panels', category: 'Navigation' },
  { key: 'Ctrl + K', description: 'Command Palette', category: 'Navigation' },
  { key: '?', description: 'Show This Help', category: 'Navigation' },
];

export const KeyboardHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for ? key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-gray-900/80 border border-cyan-500/30 rounded text-xs text-cyan-400 hover:bg-gray-800 transition-colors font-mono"
        aria-label="Show keyboard shortcuts"
      >
        <span className="mr-2">⌨️</span>
        Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded ml-1">?</kbd> for shortcuts
      </button>
    );
  }

  const categorized = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-gray-900 border-2 border-cyan-500/50 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-cyan-400 font-mono flex items-center gap-2">
            <span>⌨️</span>
            KEYBOARD SHORTCUTS
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-6 space-y-6">
          {Object.entries(categorized).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-cyan-300 mb-3 tracking-wider border-b border-gray-700 pb-2">
                {category.toUpperCase()}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-sm text-gray-300">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-gray-950 border border-gray-700 rounded text-xs text-cyan-400 font-mono shadow-inner min-w-[60px] text-center">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-cyan-500/30 px-6 py-3 text-xs text-gray-500 font-mono">
          <span className="text-cyan-400">TIP:</span> Most shortcuts work globally. Voice commands require microphone access.
        </div>
      </div>
    </div>
  );
};
