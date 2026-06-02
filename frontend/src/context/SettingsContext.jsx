/**
 * context/SettingsContext.jsx
 * Fetches company settings on login and exposes them globally.
 * Sidebar and Header consume this context for real-time updates.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const { user } = useAuth();
    const [company, setCompany] = useState(null);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        if (!user) { setLoading(false); return; }
        try {
            const data = await api.get('/settings');
            if (data.success) {
                setCompany(data.company);
                setSettings(data.settings || {});
            }
        } catch {
            // non-fatal — app works even if settings fail
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        setLoading(true);
        fetchSettings();
    }, [fetchSettings]);

    // Convenience derivations consumed by Sidebar and Header
    const companyName = company?.name || 'SmartHR';
    const companyLogo = company?.logo_url || null;
    const currencySymbol = company?.currency_symbol || '$';

    /** Call this after a successful PUT /settings save to sync the UI */
    const refreshSettings = () => fetchSettings();

    /** Optimistic update — merge new company fields/settings immediately */
    const applyLocalUpdate = useCallback((companyFields = {}, kvFields = {}) => {
        if (Object.keys(companyFields).length) {
            setCompany((prev) => ({ ...prev, ...companyFields }));
        }
        if (Object.keys(kvFields).length) {
            setSettings((prev) => ({ ...prev, ...kvFields }));
        }
    }, []);

    return (
        <SettingsContext.Provider
            value={{
                company,
                settings,
                loading,
                companyName,
                companyLogo,
                currencySymbol,
                refreshSettings,
                applyLocalUpdate,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
    return ctx;
};
