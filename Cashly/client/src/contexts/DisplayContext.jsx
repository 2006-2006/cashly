import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DISPLAY_STORAGE_KEY_PREFIX = 'cashly_appear_';

const DEFAULT_DISPLAY = {
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    compactNumbers: true,
    animations: true,
    theme: 'dark',
};

const THEME_BG = {
    dark: '#02040a',
    midnight: '#000008',
    slate: '#0f172a',
};

const DisplayContext = createContext(null);

export const DisplayProvider = ({ children, userId }) => {
    const storageKey = userId ? `${DISPLAY_STORAGE_KEY_PREFIX}${userId}` : DISPLAY_STORAGE_KEY_PREFIX;

    const readFromStorage = useCallback(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                return { ...DEFAULT_DISPLAY, ...parsed };
            }
        } catch {}
        return { ...DEFAULT_DISPLAY };
    }, [storageKey]);

    const [display, setDisplay] = useState(() => readFromStorage());

    // Re-read from storage when userId changes (user logs in/out)
    useEffect(() => {
        setDisplay(readFromStorage());
    }, [readFromStorage]);

    // Apply theme to document root on every change
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', display.theme);
        document.body.style.backgroundColor = THEME_BG[display.theme] || THEME_BG.dark;
    }, [display.theme]);

    // Apply animations flag to document root
    useEffect(() => {
        document.documentElement.setAttribute('data-animations', display.animations ? 'on' : 'off');
    }, [display.animations]);

    const updateDisplay = useCallback((key, value) => {
        setDisplay(prev => {
            const updated = { ...prev, [key]: value };
            try {
                localStorage.setItem(storageKey, JSON.stringify(updated));
            } catch {}
            return updated;
        });
    }, [storageKey]);

    return (
        <DisplayContext.Provider value={{ display, updateDisplay }}>
            {children}
        </DisplayContext.Provider>
    );
};

export const useDisplay = () => {
    const ctx = useContext(DisplayContext);
    if (!ctx) throw new Error('useDisplay must be used inside DisplayProvider');
    return ctx;
};

export default DisplayContext;

