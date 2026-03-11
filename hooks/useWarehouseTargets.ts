
import React, { useCallback } from 'react';
import * as dbService from '../services/dbService';

export const useWarehouseTargets = (setWarehouseTargets: React.Dispatch<React.SetStateAction<Record<string, number>>>) => {
    const handleSaveWarehouseTargets = useCallback(async (targets: Record<string, number>) => {
        try {
            await dbService.saveWarehouseTargets(targets);
            setWarehouseTargets(targets);
        } catch (error) {
            console.error("Failed to save warehouse targets:", error);
            throw error;
        }
    }, [setWarehouseTargets]);

    return {
        handleSaveWarehouseTargets
    };
};
