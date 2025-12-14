
import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- CyberButton ---
interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    glitch?: boolean;
}

export const CyberButton: React.FC<CyberButtonProps> = ({
    children, className, variant = 'primary', glitch = false, ...props
}) => {
    const baseStyles = "relative px-6 py-2 font-display uppercase tracking-wider text-sm clip-path-polygon transition-all duration-200 border border-transparent hover:border-white/50";

    const variants = {
        primary: "bg-electric-cyan/20 text-electric-cyan hover:bg-electric-cyan/40 hover:shadow-neon-cyan",
        secondary: "bg-acid-purple/20 text-acid-purple hover:bg-acid-purple/40 hover:shadow-neon-purple",
        danger: "bg-crimson-red/20 text-crimson-red hover:bg-crimson-red/40 hover:shadow-neon-red",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(baseStyles, variants[variant], glitch && "animate-glitch", className)}
            style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}
            {...props}
        >
            {children}
        </motion.button>
    );
};

// --- CyberPanel ---
interface CyberPanelProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

export const CyberPanel: React.FC<CyberPanelProps> = ({ children, className, title }) => {
    return (
        <div className={cn("relative bg-void-black/80 border border-white/10 backdrop-blur-md overflow-hidden", className)}>
            {/* Decorative Corner Lines */}
            <div className="absolute top-0 left-0 w-4 h-[1px] bg-electric-cyan" />
            <div className="absolute top-0 left-0 w-[1px] h-4 bg-electric-cyan" />
            <div className="absolute bottom-0 right-0 w-4 h-[1px] bg-acid-purple" />
            <div className="absolute bottom-0 right-0 w-[1px] h-4 bg-acid-purple" />

            {title && (
                <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <span className="font-display text-xs text-electric-cyan tracking-[0.2em]">{title.toUpperCase()}</span>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                    </div>
                </div>
            )}
            <div className="p-4 h-full overflow-auto">
                {children}
            </div>
        </div>
    );
};

// --- CyberTerminal ---
interface CyberTerminalProps {
    lines: string[];
    className?: string;
}

export const CyberTerminal: React.FC<CyberTerminalProps> = ({ lines, className }) => {
    return (
        <div className={cn("font-mono text-xs p-4 bg-black/90 border-t border-electric-cyan/30 h-48 overflow-y-auto custom-scrollbar", className)}>
            {lines.map((line, i) => (
                <div key={i} className="mb-1 text-green-400/90 text-shadow-sm">
                    <span className="text-electric-cyan mr-2">➜</span>
                    {line}
                </div>
            ))}
            <div className="animate-pulse w-2 h-4 bg-electric-cyan inline-block ml-1" />
        </div>
    );
};

// --- CyberInput ---
export const CyberInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    "bg-black/50 border border-white/20 text-cyber-cyan px-3 py-2 font-mono text-sm focus:outline-none focus:border-cyber-cyan/60 focus:ring-1 focus:ring-cyber-cyan/30 transition-all placeholder:text-gray-700",
                    className
                )}
                {...props}
            />
        );
    }
);
CyberInput.displayName = "CyberInput";
