import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useContext, lazy, Suspense, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { getAppearance } from './lib/formatters';

// Helper to handle chunk load errors (happens when old version is cached)
const safeLazy = (importFn) => lazy(async () => {
  try {
    return await importFn();
  } catch (error) {
    console.error("Chunk load error, refreshing...", error);
    window.location.reload();
    return { default: () => null };
  }
});

const LandingPage = safeLazy(() => import('./pages/LandingPage'));
const Dashboard = safeLazy(() => import('./pages/Dashboard'));
const IncomePage = safeLazy(() => import('./pages/IncomePage'));
const ExpensesPage = safeLazy(() => import('./pages/ExpensesPage'));
const UploadDataPage = safeLazy(() => import('./pages/UploadDataPage'));
const AIAnalysisPage = safeLazy(() => import('./pages/AIAnalysisPage'));
const SettingsPage = safeLazy(() => import('./pages/SettingsPage'));
const ReceivablesPage = safeLazy(() => import('./pages/ReceivablesPage'));
const LoginPage = safeLazy(() => import('./pages/LoginPage'));
const RegisterPage = safeLazy(() => import('./pages/RegisterPage'));
const BusinessSetup = safeLazy(() => import('./pages/BusinessSetup'));
const RealTimeAnalyticsPage = safeLazy(() => import('./pages/RealTimeAnalyticsPage'));
const AnalyticsDashboardPage = safeLazy(() => import('./pages/AnalyticsDashboardPage'));
const AreaChartPage = safeLazy(() => import('./pages/AreaChartPage'));
const ForgotPasswordPage = safeLazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = safeLazy(() => import('./pages/ResetPasswordPage'));
const ReconciliationPage = safeLazy(() => import('./pages/ReconciliationPage'));

import AuthContext from './contexts/AuthContext';
import AppLock from './components/AppLock';

const LoadingScreen = () => (
  <div className="h-screen w-full bg-[#02040a] flex flex-col items-center justify-center overflow-hidden font-sans relative">
    {/* Background Grid */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
      style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

    <div className="relative flex flex-col items-center">
      <div className="relative w-24 h-24 mb-10">
        {/* Kinetic Rings */}
        <div className="absolute inset-0 border-[3px] border-indigo-500/10 rounded-full" />
        <div className="absolute inset-0 border-[3px] border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite]" />
        <div className="absolute inset-4 border border-purple-500/20 rounded-full animate-[spin_3s_linear_infinite_reverse]" />

        {/* Core Node */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <h2 className="text-white text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">
          Quantum Initialization
        </h2>
        <div className="w-48 h-[1px] bg-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-full w-1/3 bg-indigo-500 animate-[loading_2s_infinite_ease-in-out]" />
        </div>
        <p className="text-white/20 text-[8px] font-mono uppercase tracking-[0.3em]">
          Syncing Neural Nodes...
        </p>
      </div>
    </div>

    <style>{`
      @keyframes loading {
        0% { left: -100%; width: 50%; }
        50% { left: 50%; width: 20%; }
        100% { left: 100%; width: 50%; }
      }
    `}</style>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Route that requires business selection
const BusinessRoute = ({ children }) => {
  const { user, loading, businesses, businessesReady } = useContext(AuthContext);

  // Always show loading until auth AND business fetch are both done
  if (loading || !businessesReady) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only redirect to setup AFTER we've confirmed (from server) there are no businesses
  if (businessesReady && (!businesses || businesses.length === 0)) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <AppLock>
      {children}
    </AppLock>
  );
};

function App() {
  const { theme, animationsEnabled } = getAppearance();

  useEffect(() => {
    if (theme === 'dark') document.body.style.backgroundColor = '#02040a';
    if (theme === 'midnight') document.body.style.backgroundColor = '#000008';
    if (theme === 'slate') document.body.style.backgroundColor = '#0f172a';
  }, [theme]);

  return (
    <MotionConfig reducedMotion={animationsEnabled ? "never" : "always"}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Business Setup - protected but doesn't require business */}
            <Route path="/setup" element={
              <ProtectedRoute>
                <BusinessSetup />
              </ProtectedRoute>
            } />

            {/* All other routes require business selection */}
            <Route path="/dashboard" element={
              <BusinessRoute>
                <Dashboard />
              </BusinessRoute>
            } />
            <Route path="/income" element={
              <BusinessRoute>
                <IncomePage />
              </BusinessRoute>
            } />
            <Route path="/expenses" element={
              <BusinessRoute>
                <ExpensesPage />
              </BusinessRoute>
            } />
            <Route path="/upload" element={
              <BusinessRoute>
                <UploadDataPage />
              </BusinessRoute>
            } />
            <Route path="/ai-analysis" element={
              <BusinessRoute>
                <AIAnalysisPage />
              </BusinessRoute>
            } />
            <Route path="/settings" element={
              <BusinessRoute>
                <SettingsPage />
              </BusinessRoute>
            } />
            <Route path="/receivables" element={
              <BusinessRoute>
                <ReceivablesPage />
              </BusinessRoute>
            } />
            <Route path="/forecast" element={
              <BusinessRoute>
                <Dashboard />
              </BusinessRoute>
            } />
            <Route path="/realtime" element={
              <BusinessRoute>
                <RealTimeAnalyticsPage />
              </BusinessRoute>
            } />
            <Route path="/analytics-dashboard" element={
              <BusinessRoute>
                <AnalyticsDashboardPage />
              </BusinessRoute>
            } />

            <Route path="/growth-analytics" element={
              <BusinessRoute>
                <AreaChartPage />
              </BusinessRoute>
            } />
            <Route path="/reconciliation" element={
              <BusinessRoute>
                <ReconciliationPage />
              </BusinessRoute>
            } />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
    </MotionConfig>
  );
}

export default App;
