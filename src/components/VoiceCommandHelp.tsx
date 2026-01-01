import React from 'react';
import { getAvailableCommands } from '../services/voiceCommandParser';

interface VoiceCommandHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceCommandHelp: React.FC<VoiceCommandHelpProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const commands = getAvailableCommands();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">
            Voice Commands
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-cyan-400 transition-colors text-2xl"
            aria-label="Close help"
          >
            ×
          </button>
        </div>

        {/* Keyboard Shortcut */}
        <div className="mb-6 p-4 bg-gray-800 border border-cyan-500/30 rounded">
          <p className="text-cyan-300">
            <strong>Keyboard Shortcut:</strong>{' '}
            <kbd className="px-2 py-1 bg-gray-700 border border-cyan-500 rounded text-xs">
              Cmd/Ctrl + Shift + V
            </kbd>{' '}
            to toggle voice input
          </p>
        </div>

        {/* Command Categories */}
        <div className="space-y-6">
          {/* Navigation Commands */}
          <div>
            <h3 className="text-xl font-semibold text-cyan-400 mb-3">
              Navigation
            </h3>
            <ul className="space-y-2">
              {commands.navigation.map((cmd, idx) => (
                <li
                  key={idx}
                  className="text-gray-300 pl-4 border-l-2 border-cyan-500/30"
                >
                  "{cmd}"
                </li>
              ))}
            </ul>
          </div>

          {/* Agent Control Commands */}
          <div>
            <h3 className="text-xl font-semibold text-cyan-400 mb-3">
              Agent Control
            </h3>
            <ul className="space-y-2">
              {commands.agent.map((cmd, idx) => (
                <li
                  key={idx}
                  className="text-gray-300 pl-4 border-l-2 border-cyan-500/30"
                >
                  "{cmd}"
                </li>
              ))}
            </ul>
          </div>

          {/* File Operations */}
          <div>
            <h3 className="text-xl font-semibold text-cyan-400 mb-3">
              File Operations
            </h3>
            <ul className="space-y-2">
              {commands.file.map((cmd, idx) => (
                <li
                  key={idx}
                  className="text-gray-300 pl-4 border-l-2 border-cyan-500/30"
                >
                  "{cmd}"
                </li>
              ))}
            </ul>
          </div>

          {/* System Commands */}
          <div>
            <h3 className="text-xl font-semibold text-cyan-400 mb-3">
              System
            </h3>
            <ul className="space-y-2">
              {commands.system.map((cmd, idx) => (
                <li
                  key={idx}
                  className="text-gray-300 pl-4 border-l-2 border-cyan-500/30"
                >
                  "{cmd}"
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Tips */}
        <div className="mt-6 pt-4 border-t border-cyan-500/30">
          <h4 className="text-sm font-semibold text-cyan-400 mb-2">Tips:</h4>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Speak clearly and at a normal pace</li>
            <li>• Commands work with natural variations (e.g., "show workspace" or "display workspace")</li>
            <li>• Watch for green feedback when command is recognized</li>
            <li>• Use "help" command anytime to see this list</li>
          </ul>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-semibold rounded transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
