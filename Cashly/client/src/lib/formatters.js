export const getCurrentUserId = () => {
    try {
        const keys = Object.keys(localStorage);
        const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (sbKey) {
            const data = JSON.parse(localStorage.getItem(sbKey));
            return data?.user?.id;
        }
    } catch {}
    return null;
};

export const getAppearance = () => {
    try {
        const userId = getCurrentUserId();
        if (userId) {
            const appearKey = `cashly_appear_${userId}`;
            const data = JSON.parse(localStorage.getItem(appearKey));
            if (data) {
                return {
                    currency: data.currency || 'INR',
                    dateFormat: data.dateFormat || 'DD/MM/YYYY',
                    compactNumbers: data.compactNumbers ?? false,
                    animationsEnabled: data.animationsEnabled ?? true,
                    theme: data.theme || 'dark'
                };
            }
        }
    } catch {}
    return { currency: 'INR', dateFormat: 'DD/MM/YYYY', compactNumbers: false, animationsEnabled: true, theme: 'dark' };
};

export const formatCurrency = (value) => {
    if (value === undefined || value === null) value = 0;
    
    const { currency, compactNumbers } = getAppearance();
    
    const locale = currency === 'INR' ? 'en-IN' : 'en-US';
    
    const options = {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    };

    if (compactNumbers && value >= 1000) {
        options.notation = 'compact';
        options.compactDisplay = 'short';
    }

    return new Intl.NumberFormat(locale, options).format(value);
};

export const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const { dateFormat } = getAppearance();

    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();

    switch (dateFormat) {
        case 'MM/DD/YYYY':
            return `${m}/${d}/${y}`;
        case 'YYYY-MM-DD':
            return `${y}-${m}-${d}`;
        case 'DD/MM/YYYY':
        default:
            return `${d}/${m}/${y}`;
    }
};
