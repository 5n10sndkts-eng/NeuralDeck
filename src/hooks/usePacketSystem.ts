import { useState, useCallback } from 'react';
import { Packet } from '../types';

export const usePacketSystem = () => {
    const [packets, setPackets] = useState<Packet[]>([]);

    const triggerPacket = useCallback((sourceId: string, targetId: string, edgeId: string) => {
        // Use crypto.randomUUID() if available, otherwise simple fallback
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15);

        const newPacket: Packet = {
            id,
            sourceId,
            targetId,
            edgeId,
            timestamp: Date.now()
        };

        setPackets(prev => [...prev, newPacket]);
    }, []);

    const removePacket = useCallback((packetId: string) => {
        setPackets(prev => prev.filter(p => p.id !== packetId));
    }, []);

    return {
        packets,
        triggerPacket,
        removePacket
    };
};
