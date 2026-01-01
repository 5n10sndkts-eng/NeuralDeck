
import React, { useMemo, useState } from 'react';
import { FileNode } from '../types';
import { FileCode, Folder, FolderOpen, Code2, Image, Box, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

interface Props {
  files: FileNode[];
  onFileSelect: (path: string) => void;
  activeFile: string | null;
}

interface GraphNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  x: number;
  y: number;
  size: number;
  color: string;
  depth: number;
  parent?: GraphNode;
  angle: number;
}

const TheSynapse: React.FC<Props> = ({ files, onFileSelect, activeFile }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // --- LAYOUT ALGORITHM ---
  // Converts the recursive file tree into a flattened list of nodes with coordinates
  // based on an orbital/radial layout.
  const nodes = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const centerX = 500;
    const centerY = 400;

    const processNode = (
      node: FileNode, 
      depth: number, 
      startAngle: number, 
      endAngle: number, 
      radius: number,
      parent?: GraphNode
    ) => {
      const angle = startAngle + (endAngle - startAngle) / 2;
      
      // Directory Logic
      if (node.type === 'directory') {
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        const graphNode: GraphNode = {
          id: node.path,
          name: node.name,
          type: 'directory',
          path: node.path,
          x: depth === 0 ? centerX : x,
          y: depth === 0 ? centerY : y,
          size: Math.max(40 - depth * 5, 10),
          color: depth === 0 ? '#bd00ff' : '#00f3ff',
          depth,
          parent,
          angle
        };
        nodeList.push(graphNode);

        if (node.children && node.children.length > 0) {
            const sectorSize = (endAngle - startAngle) / node.children.length;
            const nextRadius = radius + (120 - depth * 10); // Orbits get closer further out
            
            node.children.forEach((child, i) => {
                processNode(
                    child, 
                    depth + 1, 
                    startAngle + i * sectorSize, 
                    startAngle + (i + 1) * sectorSize, 
                    nextRadius,
                    graphNode
                );
            });
        }
      } 
      // File Logic
      else {
         // Files cluster tightly around their parent folder
         const fileRadius = 30 + (Math.random() * 20);
         const parentX = parent ? parent.x : centerX;
         const parentY = parent ? parent.y : centerY;
         
         // Spread files around parent
         const fileAngle = angle + (Math.random() - 0.5) * 2; 

         const x = parentX + Math.cos(fileAngle) * fileRadius;
         const y = parentY + Math.sin(fileAngle) * fileRadius;

         nodeList.push({
            id: node.path,
            name: node.name,
            type: 'file',
            path: node.path,
            x,
            y,
            size: 6,
            color: getFileColor(node.name),
            depth,
            parent,
            angle: fileAngle
         });
      }
    };

    // Start processing from root
    // We create a virtual root for the project
    const rootNode: FileNode = { name: 'ROOT', path: '/', type: 'directory', children: files };
    processNode(rootNode, 0, 0, Math.PI * 2, 0);

    return nodeList;
  }, [files]);

  function getFileColor(name: string) {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) return '#60a5fa'; // Blue
      if (name.endsWith('.css')) return '#00f3ff'; // Cyan
      if (name.endsWith('.json')) return '#facc15'; // Yellow
      if (name.endsWith('.md')) return '#9ca3af'; // Gray
      return '#ff2a6d'; // Red/Default
  }

  return (
    <div className="w-full h-full relative overflow-hidden cursor-crosshair" style={{ backgroundColor: 'var(--color-void)' }}>

      {/* Background Effects - Unified Cyberpunk Grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(188, 19, 254, 0.08) 0%, transparent 60%)'
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 100%)'
      }} />

      {/* Premium HUD Header */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center px-5 z-20" style={{
          background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(5, 5, 15, 0.95) 100%)',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
      }}>
          {/* Bottom glow line */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(188, 19, 254, 0.5) 50%, transparent 100%)'
          }} />
          <div className="flex items-center gap-3">
              <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#bc13fe',
                  boxShadow: '0 0 8px #bc13fe, 0 0 16px rgba(188, 19, 254, 0.5)'
              }} />
              <Code2 size={18} style={{ color: '#bc13fe' }} />
              <span className="font-bold text-xs tracking-[0.2em] uppercase font-display" style={{ color: '#bc13fe', textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>The Synapse</span>
              <span className="text-[10px] font-mono uppercase" style={{ color: '#6b7280' }}>// Node Count: {nodes.length}</span>
          </div>
      </div>

      {/* Graph SVG Layer */}
      <svg className="w-full h-full" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet">
          <g>
              {/* Render Connections */}
              {nodes.map(node => {
                  if (!node.parent) return null;
                  return (
                      <motion.line 
                          key={`link-${node.id}`}
                          x1={node.parent.x}
                          y1={node.parent.y}
                          x2={node.x}
                          y2={node.y}
                          stroke={node.type === 'directory' ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'}
                          strokeWidth={node.type === 'directory' ? 1 : 0.5}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 1.5, ease: "easeInOut" }}
                      />
                  );
              })}

              {/* Render Nodes */}
              {nodes.map((node, i) => {
                  const isHovered = hoveredNode === node.id;
                  const isActive = activeFile === node.path;
                  
                  return (
                      <g 
                        key={node.id}
                        onClick={() => node.type === 'file' && onFileSelect(node.path)}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        style={{ cursor: node.type === 'file' ? 'pointer' : 'default' }}
                      >
                          {/* Orbit Animation for Files */}
                          {node.type === 'file' ? (
                             <circle 
                                cx={node.x} 
                                cy={node.y} 
                                r={isHovered || isActive ? node.size * 2 : node.size}
                                fill={isActive ? '#fff' : node.color}
                                className="transition-all duration-300"
                                opacity={isHovered || isActive ? 1 : 0.7}
                             />
                          ) : (
                             // Directory Node
                             <g>
                                 <circle 
                                    cx={node.x} 
                                    cy={node.y} 
                                    r={node.size}
                                    fill="#020204"
                                    stroke={node.color}
                                    strokeWidth={isHovered ? 2 : 1}
                                    className="transition-all duration-300"
                                 />
                                 <circle cx={node.x} cy={node.y} r={3} fill={node.color} />
                             </g>
                          )}
                          
                          {/* Labels */}
                          {(isHovered || isActive || node.depth <= 1) && (
                              <text 
                                x={node.x} 
                                y={node.y - node.size - 5} 
                                textAnchor="middle" 
                                fill={isActive ? '#fff' : (node.type === 'directory' ? '#00f3ff' : '#ccc')}
                                fontSize={node.type === 'directory' ? 12 : 10}
                                fontFamily="Fira Code"
                                className="pointer-events-none shadow-black drop-shadow-md uppercase font-bold tracking-wider"
                              >
                                  {node.name}
                              </text>
                          )}
                      </g>
                  );
              })}
          </g>
      </svg>

      {/* Info Panel for Hovered Item */}
      {hoveredNode && (
          <div className="absolute bottom-4 right-4 p-4 rounded max-w-xs animate-fade-in-up" style={{
              backgroundColor: 'rgba(15, 15, 25, 0.95)',
              border: '1px solid rgba(0, 240, 255, 0.25)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 240, 255, 0.1)',
              backdropFilter: 'blur(16px)'
          }}>
               {nodes.find(n => n.id === hoveredNode)?.type === 'file' ? (
                   <div className="flex items-center gap-3">
                       <FileCode size={24} style={{ color: '#00f0ff' }} />
                       <div>
                           <div className="text-sm font-bold" style={{ color: '#00f0ff', textShadow: '0 0 8px rgba(0, 240, 255, 0.5)' }}>{nodes.find(n => n.id === hoveredNode)?.name}</div>
                           <div className="text-[10px] font-mono" style={{ color: 'rgba(0, 240, 255, 0.5)' }}>{nodes.find(n => n.id === hoveredNode)?.path}</div>
                       </div>
                   </div>
               ) : (
                   <div className="flex items-center gap-3">
                       <FolderOpen size={24} style={{ color: '#bc13fe' }} />
                       <div>
                           <div className="text-sm font-bold" style={{ color: '#bc13fe', textShadow: '0 0 10px rgba(188, 19, 254, 0.5)' }}>{nodes.find(n => n.id === hoveredNode)?.name}</div>
                           <div className="text-[10px] font-mono" style={{ color: 'rgba(188, 19, 254, 0.5)' }}>DIRECTORY</div>
                       </div>
                   </div>
               )}
          </div>
      )}
    </div>
  );
};

export default TheSynapse;
