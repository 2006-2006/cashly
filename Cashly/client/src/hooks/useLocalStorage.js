import { useState, useCallback } from 'react';

/**
 * useLocalStorage
 * Persists state to localStorage with zero-latency synchronous reads/writes.
 * @param {string} key - localStorage key
 * @param {*} initialValue - default value if nothing stored
 */
export const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item !== null ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = useCallback((value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`useLocalStorage: Failed to set key "${key}"`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setValue];
};

