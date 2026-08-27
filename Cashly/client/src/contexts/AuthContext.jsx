import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isInitializing, setIsInitializing] = useState(true);
    // True only after an actual server fetch completes (not just cache read)
    const [businessesReady, setBusinessesReady] = useState(false);
    const [businesses, setBusinesses] = useState(() => {
        try {
            const saved = localStorage.getItem('cashly_businesses_cache');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    const [selectedBusiness, setSelectedBusiness] = useState(() => {
        // Init from local storage to prevent flash of null
        try {
            const saved = localStorage.getItem('cashly_selected_business');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    const persistBusiness = (business) => {
        setSelectedBusiness(business);
        if (business) {
            localStorage.setItem('cashly_selected_business', JSON.stringify(business));
            localStorage.setItem('selectedBusinessId', business.id); // Valid legacy
        } else {
            localStorage.removeItem('cashly_selected_business');
            localStorage.removeItem('selectedBusinessId');
        }
    };

    const fetchBusinesses = useCallback(async (userId) => {
        if (!userId) {
            setBusinesses([]);
            setBusinessesReady(true);
            localStorage.removeItem('cashly_businesses_cache');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;

            const bizList = data || [];
            setBusinesses(bizList);
            localStorage.setItem('cashly_businesses_cache', JSON.stringify(bizList));

            // Reconciliation Logic
            if (bizList.length > 0) {
                const currentId = localStorage.getItem('selectedBusinessId');
                const found = bizList.find(b => b.id === currentId);

                if (found) {
                    // ONLY update if data has actually changed or it's a new ref we want to ignore
                    // Compare IDs to avoid redundant state updates that trigger re-fetches
                    setSelectedBusiness(prev => {
                        if (prev && prev.id === found.id && JSON.stringify(prev) === JSON.stringify(found)) {
                            return prev; // No change
                        }
                        return found;
                    });
                    localStorage.setItem('cashly_selected_business', JSON.stringify(found));
                    localStorage.setItem('selectedBusinessId', found.id);
                } else {
                    persistBusiness(bizList[0]);
                }
            } else {
                persistBusiness(null);
            }
            return bizList;
        } catch (error) {
            console.error('Failed to fetch businesses:', error);
            return [];
        } finally {
            // Always mark businesses as ready after fetch attempt (success or failure)
            setBusinessesReady(true);
        }
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setBusinesses([]);
        persistBusiness(null);
        sessionStorage.removeItem('cashly_session_unlocked');
    };

    const selectBusiness = (business) => {
        persistBusiness(business);
    };

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // 1. Get Session FAST
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted) {
                    const currentUser = session?.user ?? null;
                    setUser(currentUser);

                    if (currentUser) {
                        // fetchBusinesses sets businessesReady=true in its finally block
                        await fetchBusinesses(currentUser.id).catch(e => {
                            setBusinessesReady(true); // ensure ready even on error
                        });
                    } else {
                        // No user = no businesses to fetch, mark ready immediately
                        setBusinessesReady(true);
                    }

                    // 2. UNLOCK UI
                    setIsInitializing(false);
                    setLoading(false);
                }
            } catch (e) {
                if (mounted) {
                    setBusinessesReady(true);
                    setIsInitializing(false);
                    setLoading(false);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (mounted) {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                setLoading(false);

                if (event === 'SIGNED_IN') {
                    if (currentUser) {
                        setBusinessesReady(false); // Reset ready state for the new user
                        // fetchBusinesses sets businessesReady=true when done
                        fetchBusinesses(currentUser.id).catch(e => {
                            setBusinessesReady(true); // ensure ready even on error
                        });
                    }
                } else if (event === 'SIGNED_OUT') {
                    setBusinesses([]);
                    setBusinessesReady(true);
                    localStorage.removeItem('cashly_businesses_cache');
                    persistBusiness(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, [fetchBusinesses]);

    const login = async (email, password) => {
        setBusinessesReady(false); // Prevent flash of empty businesses during transition
        // Optimistic UI state could be set here, but LoginPage handles its own isLoading
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setBusinessesReady(true); // Revert if failed
            throw error;
        }

        // Note: fetchBusinesses will be triggered by onAuthStateChange SIGNED_IN
        return data;
    };

    const register = async (name, email, password) => {
        setBusinessesReady(false); // Prevent flash of empty businesses during transition
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                },
            },
        });
        if (error) {
            setBusinessesReady(true); // Revert if failed
            throw error;
        }
        return data;
    };

    const addLocalBusiness = (business) => {
        setBusinesses(prev => {
            const newList = [...prev, business];
            localStorage.setItem('cashly_businesses_cache', JSON.stringify(newList));
            return newList;
        });
        if (!selectedBusiness) {
            persistBusiness(business);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            businessesReady,
            businesses,
            selectedBusiness,
            selectBusiness,
            fetchBusinesses,
            logout,
            login,
            register,
            addLocalBusiness
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
