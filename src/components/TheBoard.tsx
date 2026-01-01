
import React, { useEffect, useState } from 'react';
import { FileNode, Story } from '../types';
import { KanbanSquare, Circle, CheckCircle2, Clock, ArrowRight, ArrowLeft, User, Loader2, RefreshCw } from 'lucide-react';
import { readFile } from '../services/api';
import { SoundEffects } from '../services/sound';

interface Props {
  files: FileNode[];
  onOpenFile: (path: string) => void;
  onUpdateFile: (path: string, content: string) => void;
}

const TheBoard: React.FC<Props> = ({ files, onOpenFile, onUpdateFile }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Find Story Files
  useEffect(() => {
    const loadStories = async () => {
        setIsLoading(true);
        const foundStories: Story[] = [];
        
        const traverse = (nodes: FileNode[]) => {
            nodes.forEach(node => {
                if (node.type === 'file' && node.path.includes('stories/') && node.name.endsWith('.md')) {
                    foundStories.push({
                        id: node.path,
                        path: node.path,
                        title: node.name.replace('.md', '').replace('story-', 'Story '),
                        status: 'todo', // Default until read
                        content: '',
                        assignee: 'developer'
                    });
                }
                if (node.children) traverse(node.children);
            });
        };
        traverse(files);

        // 2. Fetch Content to Determine Status
        const hydratedStories = await Promise.all(foundStories.map(async (story) => {
            try {
                const content = await readFile(story.path);
                const statusMatch = content.match(/(?:Status|status):\s*(todo|in-progress|done)/i);
                
                return {
                    ...story,
                    content,
                    status: statusMatch ? (statusMatch[1].toLowerCase() as Story['status']) : 'todo'
                };
            } catch (e) {
                return story;
            }
        }));

        setStories(hydratedStories);
        setIsLoading(false);
    };

    loadStories();
  }, [files]);

  const handleMoveStory = (story: Story, direction: 'next' | 'prev') => {
      SoundEffects.click();
      const statusOrder: Story['status'][] = ['todo', 'in-progress', 'done'];
      const currentIndex = statusOrder.indexOf(story.status);
      const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

      if (nextIndex >= 0 && nextIndex < statusOrder.length) {
          const newStatus = statusOrder[nextIndex];
          
          // Update Local State
          setStories(prev => prev.map(s => s.id === story.id ? { ...s, status: newStatus } : s));

          // Update File Persistence
          const newContent = updateStatusInContent(story.content, newStatus);
          onUpdateFile(story.path, newContent);
      }
  };

  const updateStatusInContent = (content: string, status: string) => {
      const regex = /(Status|status):\s*(todo|in-progress|done)/i;
      if (regex.test(content)) {
          return content.replace(regex, `Status: ${status}`);
      }
      // If no status header found, prepend it
      return `---\nStatus: ${status}\n---\n\n${content}`;
  };

  const renderColumn = (title: string, status: Story['status'], icon: any, color: string) => {
    const items = stories.filter(s => s.status === status);
    const statusColor = status === 'todo' ? '#6b7280' : status === 'in-progress' ? '#ffd000' : '#4ade80';

    return (
      <div className="flex-1 flex flex-col min-w-[320px] max-w-[450px]" style={{
          backgroundColor: 'rgba(8, 8, 12, 0.8)',
          borderRight: '1px solid rgba(0, 240, 255, 0.1)'
      }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{
            background: 'rgba(0, 240, 255, 0.03)',
            borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
            color: statusColor
        }}>
            <div className="flex items-center gap-2.5 font-bold uppercase tracking-wider text-xs font-display">
                {icon} {title}
            </div>
            <div className="text-[10px] font-mono" style={{ color: '#00f0ff', opacity: 0.7 }}>{items.length} TASKS</div>
        </div>

        <div className="flex-1 p-5 space-y-3 overflow-y-auto custom-scrollbar relative" style={{
            background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 240, 255, 0.02) 2px, rgba(0, 240, 255, 0.02) 4px)'
        }}>
            {isLoading && items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ color: '#00f0ff', opacity: 0.2 }}>
                    <Loader2 className="animate-spin" size={32} />
                </div>
            )}

            {!isLoading && items.length === 0 && (
                <div className="text-center mt-10 text-xs font-mono" style={{ color: 'rgba(0, 240, 255, 0.3)' }}>NO ACTIVE PROTOCOLS</div>
            )}

            {items.map(story => (
                <div
                    key={story.id}
                    className="p-4 rounded transition-all group flex flex-col gap-2"
                    style={{
                        backgroundColor: 'rgba(0, 240, 255, 0.03)',
                        border: '1px solid rgba(0, 240, 255, 0.15)',
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <div onClick={() => onOpenFile(story.path)} className="cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold" style={{ color: '#d1d5db' }}>{story.title}</span>
                            <div className="w-2 h-2 rounded-full" style={{
                                backgroundColor: statusColor,
                                boxShadow: status === 'in-progress' ? '0 0 8px rgba(255, 200, 0, 0.5)' : status === 'done' ? '0 0 8px rgba(0, 255, 136, 0.5)' : 'none'
                            }} />
                        </div>
                        <div className="text-[10px] font-mono line-clamp-2 mb-2" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>
                            {story.path.split('/').pop()}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(0, 240, 255, 0.1)' }}>
                         {status !== 'todo' ? (
                             <button onClick={() => handleMoveStory(story, 'prev')} className="text-[9px] flex items-center gap-1 uppercase transition-colors" style={{ color: 'rgba(0, 240, 255, 0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                 <ArrowLeft size={10} /> Prev
                             </button>
                         ) : <div />}

                         <div className="flex items-center gap-1 text-[9px] uppercase" style={{ color: 'rgba(0, 240, 255, 0.4)' }}>
                            <User size={10} /> {story.assignee}
                         </div>

                         {status !== 'done' ? (
                             <button onClick={() => handleMoveStory(story, 'next')} className="text-[9px] flex items-center gap-1 uppercase transition-colors" style={{
                                 color: '#00f0ff',
                                 textShadow: '0 0 8px rgba(0, 240, 255, 0.4)',
                                 background: 'none',
                                 border: 'none',
                                 cursor: 'pointer'
                             }}>
                                 Next <ArrowRight size={10} />
                             </button>
                         ) : <div />}
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: 'var(--color-void)' }}>
        {/* Background Effects - Unified Cyberpunk Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(0, 240, 255, 0.06) 0%, transparent 60%)'
        }} />

        {/* Premium HUD Header */}
        <div className="h-14 flex items-center justify-between px-5 z-10 relative" style={{
            background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
            borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
        }}>
            {/* Bottom glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(0, 240, 255, 0.5) 50%, transparent 100%)'
            }} />

            <div className="flex items-center gap-3">
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#00f0ff',
                    boxShadow: '0 0 8px #00f0ff, 0 0 16px rgba(0, 240, 255, 0.5)'
                }} />
                <KanbanSquare size={18} style={{ color: '#00f0ff' }} />
                <span className="font-bold text-xs tracking-[0.2em] uppercase font-display" style={{
                    color: '#00f0ff',
                    textShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
                }}>The Board</span>
                <span className="text-[10px] font-mono uppercase" style={{ color: '#6b7280' }}>// Project Kanban</span>
            </div>
            <button onClick={() => setIsLoading(!isLoading)} style={{
                padding: '6px 10px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                color: '#00f0ff',
                cursor: 'pointer'
            }}>
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>

        <div className="flex-1 flex overflow-x-auto gap-0 z-10 relative">
            {renderColumn('Backlog / Todo', 'todo', <Circle size={14} />, 'text-gray-400')}
            {renderColumn('In Development', 'in-progress', <Clock size={14} />, 'text-yellow-400')}
            {renderColumn('Deployed', 'done', <CheckCircle2 size={14} />, 'text-green-400')}
        </div>
    </div>
  );
};

export default TheBoard;
