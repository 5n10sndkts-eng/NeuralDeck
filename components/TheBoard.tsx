
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
    
    return (
      <div className="flex-1 flex flex-col bg-[#08080a] border-r border-white/5 min-w-[300px]">
        <div className={`p-4 border-b border-white/5 flex items-center justify-between ${color} bg-white/5`}>
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs">
                {icon} {title}
            </div>
            <div className="text-[10px] font-mono opacity-70">{items.length} TASKS</div>
        </div>
        
        <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar bg-scanlines relative">
            {isLoading && items.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Loader2 className="animate-spin" size={32} />
                </div>
            )}
            
            {!isLoading && items.length === 0 && (
                <div className="text-center mt-10 opacity-30 text-xs font-mono">NO ACTIVE PROTOCOLS</div>
            )}

            {items.map(story => (
                <div 
                    key={story.id} 
                    className="bg-[#020204] border border-white/10 p-4 rounded hover:border-cyber-cyan/50 hover:shadow-[0_0_15px_rgba(0,243,255,0.1)] transition-all group flex flex-col gap-2"
                >
                    <div onClick={() => onOpenFile(story.path)} className="cursor-pointer">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-300 group-hover:text-cyber-cyan">{story.title}</span>
                            <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
                        </div>
                        <div className="text-[10px] text-gray-600 font-mono line-clamp-2 mb-2">
                            {story.path.split('/').pop()}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                         {status !== 'todo' ? (
                             <button onClick={() => handleMoveStory(story, 'prev')} className="text-[9px] flex items-center gap-1 text-gray-500 hover:text-white uppercase">
                                 <ArrowLeft size={10} /> Prev
                             </button>
                         ) : <div />}
                         
                         <div className="flex items-center gap-1 text-[9px] text-gray-600 uppercase">
                            <User size={10} /> {story.assignee}
                         </div>

                         {status !== 'done' ? (
                             <button onClick={() => handleMoveStory(story, 'next')} className="text-[9px] flex items-center gap-1 text-cyber-cyan hover:text-white uppercase">
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
    <div className="w-full h-full bg-[#020204] flex flex-col">
        <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-[#050505]">
            <div className="flex items-center gap-2 text-cyber-cyan">
                <KanbanSquare size={14} />
                <span className="font-bold text-[10px] tracking-[0.2em] uppercase">Project Kanban Board</span>
            </div>
            <button onClick={() => setIsLoading(!isLoading)} className="text-gray-500 hover:text-white">
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>
        
        <div className="flex-1 flex overflow-x-auto">
            {renderColumn('Backlog / Todo', 'todo', <Circle size={14} />, 'text-gray-400')}
            {renderColumn('In Development', 'in-progress', <Clock size={14} />, 'text-yellow-400')}
            {renderColumn('Deployed', 'done', <CheckCircle2 size={14} />, 'text-green-400')}
        </div>
    </div>
  );
};

export default TheBoard;
