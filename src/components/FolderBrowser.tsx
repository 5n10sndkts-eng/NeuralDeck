import React, { useState, useEffect } from 'react';
import { ChevronRight, Home, Folder, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { browsePath, validateWorkspacePath, type BrowseResult, type ValidationResult } from '../services/api';

const MotionDiv = motion.div as any;

interface FolderBrowserProps {
  initialPath?: string;
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export const FolderBrowser: React.FC<FolderBrowserProps> = ({ initialPath, onSelect, onCancel }) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '');
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [manualPath, setManualPath] = useState('');

  // Load directory contents
  const loadDirectory = async (path?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await browsePath(path);
      setBrowseData(data);
      setCurrentPath(data.currentPath);
      setManualPath(data.currentPath);
      
      // Validate the current path
      const validationResult = await validateWorkspacePath(data.currentPath);
      setValidation(validationResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to a directory
  const navigate = (path: string) => {
    loadDirectory(path);
  };

  // Navigate to parent directory
  const navigateUp = () => {
    if (browseData?.parent) {
      navigate(browseData.parent);
    }
  };

  // Navigate to home directory
  const navigateHome = () => {
    navigate();
  };

  // Handle manual path input
  const handleManualPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPath.trim()) {
      navigate(manualPath.trim());
    }
  };

  // Handle select
  const handleSelect = () => {
    if (validation?.valid && currentPath) {
      onSelect(currentPath);
    }
  };

  // Load initial directory on mount
  useEffect(() => {
    loadDirectory(initialPath);
  }, []);

  const breadcrumbs = currentPath.split(/[/\\]/).filter(Boolean);

  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onCancel}
    >
      <MotionDiv
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onClick={(e: any) => e.stopPropagation()}
        className="w-full max-w-3xl"
        style={{
          background: 'linear-gradient(135deg, rgba(10, 10, 22, 0.95) 0%, rgba(5, 5, 14, 0.98) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '12px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.2), 0 20px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'rgba(0, 240, 255, 0.2)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder style={{ width: 20, height: 20, color: 'var(--color-cyan)' }} />
              <span style={{
                color: '#00f0ff',
                fontSize: '16px',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}>
                SELECT WORKSPACE FOLDER
              </span>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <X style={{ width: 16, height: 16, color: '#999' }} />
            </button>
          </div>

          {/* Manual path input */}
          <form onSubmit={handleManualPathSubmit} className="mt-4">
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="Enter path manually..."
              className="w-full px-4 py-2 rounded-lg outline-none transition-colors"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                color: '#fff',
                fontSize: '13px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 240, 255, 0.2)';
              }}
            />
          </form>
        </div>

        {/* Breadcrumbs and quick actions */}
        <div className="px-6 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(0, 240, 255, 0.1)' }}>
          <button
            onClick={navigateHome}
            className="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
            style={{
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              color: '#00f0ff',
              fontSize: '12px',
            }}
          >
            <Home style={{ width: 14, height: 14 }} />
            Home
          </button>
          
          {browseData?.parent && (
            <button
              onClick={navigateUp}
              className="px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#999',
                fontSize: '12px',
              }}
            >
              ..
            </button>
          )}

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center gap-1 shrink-0">
                <ChevronRight style={{ width: 12, height: 12, color: '#666' }} />
                <span style={{ color: '#999', fontSize: '12px' }}>{crumb}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Directory listing */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8" style={{ color: '#666' }}>
              Loading...
            </div>
          ) : error ? (
            <div className="text-center py-8" style={{ color: '#ff4466' }}>
              {error}
            </div>
          ) : browseData?.entries.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#666' }}>
              No directories found
            </div>
          ) : (
            <div className="space-y-1">
              {browseData?.entries.filter(entry => entry.isDirectory).map((entry, index) => (
                <MotionDiv
                  key={entry.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => navigate(entry.path)}
                  className="px-4 py-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-3"
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid transparent',
                  }}
                  whileHover={{
                    background: 'rgba(0, 240, 255, 0.1)',
                    borderColor: 'rgba(0, 240, 255, 0.3)',
                  }}
                >
                  <Folder style={{ width: 16, height: 16, color: 'var(--color-purple)' }} />
                  <span style={{ color: '#ddd', fontSize: '13px' }}>{entry.name}</span>
                </MotionDiv>
              ))}
            </div>
          )}
        </div>

        {/* Validation status */}
        {validation && (
          <div className="px-6 py-3 border-t" style={{ borderColor: 'rgba(0, 240, 255, 0.1)' }}>
            <div className="flex items-center gap-2">
              {validation.valid ? (
                <>
                  <Check style={{ width: 16, height: 16, color: '#00ff88' }} />
                  <span style={{ color: '#00ff88', fontSize: '12px' }}>
                    Valid workspace ({validation.fileCount} items)
                    {validation.isGitRepo && ' • Git repository'}
                  </span>
                </>
              ) : (
                <>
                  <X style={{ width: 16, height: 16, color: '#ff4466' }} />
                  <span style={{ color: '#ff4466', fontSize: '12px' }}>
                    {validation.error}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'rgba(0, 240, 255, 0.1)' }}>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#999',
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!validation?.valid}
            className="px-4 py-2 rounded-lg transition-all"
            style={{
              background: validation?.valid
                ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(180, 0, 255, 0.2) 100%)'
                : 'rgba(100, 100, 100, 0.2)',
              border: validation?.valid
                ? '1px solid rgba(0, 240, 255, 0.4)'
                : '1px solid rgba(100, 100, 100, 0.3)',
              color: validation?.valid ? '#00f0ff' : '#666',
              fontSize: '13px',
              fontWeight: 600,
              cursor: validation?.valid ? 'pointer' : 'not-allowed',
            }}
          >
            Select This Folder
          </button>
        </div>
      </MotionDiv>
    </MotionDiv>
  );
};
