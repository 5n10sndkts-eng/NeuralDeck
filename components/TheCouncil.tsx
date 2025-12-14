
import React from 'react';
import { Cpu, Zap, ShieldAlert, ShieldCheck, Volume2, VolumeX, Crosshair, BookOpen, TestTube, Lock, Eye, EyeOff, HardHat, PartyPopper, Hexagon, Grid, ThumbsUp, ThumbsDown, Layers, PenTool, Search, Rocket, FileText, LayoutTemplate, Workflow, BrainCircuit, Palette, Bug, Box, Feather } from 'lucide-react';
import { AgentProfile, VoteResult, NeuralPhase } from '../types';
import { AGENT_DEFINITIONS } from '../services/agent';
import { SoundEffects } from '../services/sound';

interface Props {
  isThinking: boolean;
  godMode: boolean;
  isListening?: boolean;
  isMuted: boolean;
  isSupervised: boolean;
  partyMode?: boolean;
  activeAgent: AgentProfile;
  councilVotes?: VoteResult[];
  currentPhase?: NeuralPhase;
  autoRun?: boolean;
  tokenUsage?: number;
  onToggleGodMode: () => void;
  onToggleSupervision: () => void;
  onTogglePartyMode?: () => void;
  onToggleMute: () => void;
  onSelectAgent: (agent: AgentProfile) => void;
  onToggleAutoRun?: () => void;
}

const TheCouncil: React.FC<Props> = ({ 
    isThinking, godMode, isMuted, isSupervised, partyMode, activeAgent, councilVotes = [], currentPhase = 'idle', autoRun, tokenUsage = 0,
    onToggleGodMode, onToggleSupervision, onTogglePartyMode, onToggleMute, onSelectAgent, onToggleAutoRun
}) => {
  
  const agents = [
      { id: 'analyst', Icon: Search, name: 'Analyst', color: 'text-blue-400' },
      { id: 'product_manager', Icon: BookOpen, name: 'PM', color: 'text-purple-400' },
      { id: 'ux_designer', Icon: Palette, name: 'UX', color: 'text-pink-400' }, 
      { id: 'architect', Icon: Layers, name: 'Arch', color: 'text-orange-400' },
      { id: 'scrum_master', Icon: Workflow, name: 'Scrum', color: 'text-green-400' },
      { id: 'developer', Icon: HardHat, name: 'Dev', color: 'text-cyber-cyan' },
      { id: 'qa_engineer', Icon: Bug, name: 'QA', color: 'text-yellow-200' }, 
      { id: 'sec_auditor', Icon: Lock, name: 'Sec', color: 'text-red-400' },
      { id: 'red_teamer', Icon: Crosshair, name: 'Red', color: 'text-red-600' },
      { id: 'optimizer', Icon: Zap, name: 'Opt', color: 'text-yellow-400' },
      { id: 'devops', Icon: Box, name: 'Ops', color: 'text-indigo-400' }, 
      { id: 'tech_writer', Icon: Feather, name: 'Docs', color: 'text-gray-300' } 
  ];

  const activeDef = AGENT_DEFINITIONS[activeAgent];
  const tokenPercentage = Math.min((tokenUsage / 4096) * 100, 100);

  return (
    <header className={`h-14 shrink-0 flex items-center justify-between px-4 border-b transition-all duration-500 z-40 relative bg-[#020204] ${godMode ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : (partyMode ? 'rainbow-border' : 'border-white/10 shadow-lg')}`}>
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="flex items-center gap-6 min-w-[240px] relative z-10">
        <div className={`flex items-center gap-3 text-sm font-black tracking-[0.3em] uppercase font-mono leading-none ${godMode ? 'text-red-500 text-glow-red' : 'text-cyber-cyan text-glow'}`}>
             <Grid size={18} className={isThinking ? 'animate-spin' : ''} />
             NEURAL DECK
        </div>
        
        {/* Phase Indicator */}
        <div className="hidden xl:flex items-center bg-black border border-white/10 rounded px-2 py-1 gap-2 shadow-inner">
             <PhaseBadge active={currentPhase === 'analysis'} label="Anl" icon={Search} color="text-blue-400" />
             <div className="w-2 h-[1px] bg-gray-800" />
             <PhaseBadge active={currentPhase === 'design'} label="Dsg" icon={Palette} color="text-pink-400" />
             <div className="w-2 h-[1px] bg-gray-800" />
             <PhaseBadge active={currentPhase === 'architecture'} label="Arc" icon={LayoutTemplate} color="text-orange-400" />
             <div className="w-2 h-[1px] bg-gray-800" />
             <PhaseBadge active={currentPhase === 'swarm'} label="Dev" icon={Rocket} color="text-cyber-cyan" />
             <div className="w-2 h-[1px] bg-gray-800" />
             <PhaseBadge active={currentPhase === 'testing'} label="QA" icon={Bug} color="text-yellow-200" />
             <div className="w-2 h-[1px] bg-gray-800" />
             <PhaseBadge active={currentPhase === 'review'} label="Sec" icon={Lock} color="text-red-400" />
             <div className="w-2 h-[1px] bg-gray-800" />
             <PhaseBadge active={currentPhase === 'deployment'} label="Dep" icon={Box} color="text-indigo-400" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 px-4 flex-1 overflow-x-auto no-scrollbar">
         {agents.map((agent) => {
             const isActive = activeAgent === agent.id;
             const vote = councilVotes.find(v => v.voter === agent.id);
             let stateColor = isActive ? agent.color : 'text-gray-700';
             if (vote?.verdict === 'APPROVE') stateColor = 'text-green-500';
             if (vote?.verdict === 'REJECT') stateColor = 'text-red-500';
             
             // Glitch Effect when thinking
             const isGlitching = isActive && isThinking;

             return (
                <button 
                    key={agent.id} 
                    onClick={() => { SoundEffects.click(); onSelectAgent(agent.id as AgentProfile); }}
                    onMouseEnter={() => SoundEffects.hover()}
                    className={`relative group flex items-center justify-center w-10 h-10 transition-all duration-300 ${isActive ? 'scale-110 z-10' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                    title={`${agent.name}`}
                >
                    {/* Glitch Wrapper */}
                    <div className={`relative ${isGlitching ? 'animate-glitch' : ''}`}>
                         <Hexagon size={32} strokeWidth={1.5} className={`transition-all duration-300 ${stateColor} ${isActive ? 'fill-current/10 drop-shadow-[0_0_8px_currentColor]' : 'fill-transparent'}`} />
                         {/* Double Layer for stronger glitch visual if needed */}
                         {isGlitching && <Hexagon size={32} strokeWidth={1.5} className={`absolute inset-0 opacity-50 ${stateColor} translate-x-0.5`} />}
                    </div>
                    
                    <agent.Icon size={12} className={`absolute z-10 transition-colors ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    {vote && (
                        <div className="absolute -top-1 -right-1 z-20 bg-black rounded-full p-0.5 border border-white/10 animate-in zoom-in duration-200">
                             {vote.verdict === 'APPROVE' ? <ThumbsUp size={10} className="text-green-400" /> : <ThumbsDown size={10} className="text-red-500" />}
                        </div>
                    )}
                    {isActive && <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-current ${agent.color}`} />}
                </button>
             );
         })}
      </div>

      <div className="flex items-center gap-4 min-w-[240px] justify-end relative z-10">
        {/* Context Gauge */}
        <div className="hidden lg:flex flex-col items-end justify-center mr-4 w-24">
            <div className="flex items-center gap-1 text-[8px] font-mono text-gray-500 mb-0.5">
                <BrainCircuit size={10} /> CTX LOAD
            </div>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${tokenPercentage > 80 ? 'bg-red-500' : 'bg-cyber-cyan'}`} 
                    style={{ width: `${tokenPercentage}%` }} 
                />
            </div>
        </div>

        <div className="hidden lg:flex flex-col items-end text-right">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeDef.color}`}>{activeDef.name.split('(')[0]}</span>
            <span className="text-[8px] text-gray-600 font-mono max-w-[150px] truncate">{activeDef.description.split('.')[0]}</span>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <div className="flex gap-1">
            {onToggleAutoRun && <ControlButton onClick={onToggleAutoRun} active={autoRun} activeColor="text-green-400 text-glow" inactiveColor="text-gray-600" icon={Rocket} title="Auto-Run Mode" />}
            <ControlButton onClick={onToggleMute} active={!isMuted} activeColor="text-green-400" inactiveColor="text-gray-600" icon={isMuted ? VolumeX : Volume2} title="Audio" />
            <ControlButton onClick={onToggleSupervision} active={isSupervised && godMode} disabled={!godMode} activeColor="text-blue-400 text-glow" inactiveColor="text-gray-600" icon={isSupervised ? Eye : EyeOff} title="Supervision" />
            <ControlButton onClick={onToggleGodMode} active={godMode} activeColor="text-red-500 text-glow-red animate-pulse" inactiveColor="text-gray-600" icon={godMode ? ShieldAlert : ShieldCheck} title="GOD MODE" className={godMode ? "bg-red-900/10 border-red-500/50" : ""} />
        </div>
      </div>
    </header>
  );
};

const PhaseBadge = ({ active, label, icon: Icon, color }: any) => (
    <div className={`flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-colors ${active ? `bg-white/10 ${color}` : 'text-gray-700'}`}>
        <Icon size={8} /> {label}
    </div>
);

const ControlButton = ({ onClick, active, disabled, activeColor, inactiveColor, icon: Icon, title, className = "" }: any) => (
    <button 
        onClick={() => { SoundEffects.click(); onClick(); }}
        onMouseEnter={() => SoundEffects.hover()}
        disabled={disabled}
        className={`w-8 h-8 rounded flex items-center justify-center transition-all border border-transparent ${active ? activeColor : `${inactiveColor} hover:bg-white/5 hover:text-gray-300`} ${disabled ? 'opacity-20 cursor-not-allowed' : ''} ${className}`}
        title={title}
    >
        <Icon size={14} />
    </button>
);

export default TheCouncil;