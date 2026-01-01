import React, { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

interface Memory {
    key: string;
    value: string;
    sourceAgent: string;
    timestamp: number;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

export const HiveStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [memories, setMemories] = useState<Memory[]>([]);

    useEffect(() => {
        const fetchHive = async () => {
            try {
                const res = await fetch(`${API_BASE}/hive`);
                const data = await res.json();
                if (data.memories) {
                    setMemories(data.memories.slice(-5).reverse()); // Show last 5
                }
            } catch (e) {
                // Silent fail
            }
        };

        fetchHive();
        const interval = setInterval(fetchHive, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    if (memories.length === 0) return null;

    return (
        <div className={`p-3 rounded bg-black/40 border border-[#bc13fe]/30 ${className}`}>
            <h4 className="text-[9px] font-bold uppercase tracking-wider text-[#bc13fe] mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#bc13fe] animate-pulse" />
                Hive Memory (Adaptation Engine)
            </h4>
            <div className="space-y-1.5">
                {memories.map((mem) => (
                    <div key={mem.timestamp + mem.key} className="flex flex-col text-[10px] font-mono border-l border-[#bc13fe]/20 pl-2">
                        <span className="text-[#bc13fe]/70">{mem.key}</span>
                        <span className="text-gray-400 truncate w-[200px]">{mem.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
