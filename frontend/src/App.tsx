import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/ui/Toast';
import OverviewPage from './pages/OverviewPage';
import FeederNetworkPage from './pages/FeederNetworkPage';
import SectionAnalysisPage from './pages/SectionAnalysisPage';
import SmartMetersPage from './pages/SmartMetersPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/feeder-network" element={<FeederNetworkPage />} />
            <Route path="/section-analysis" element={<SectionAnalysisPage />} />
            <Route path="/smart-meters" element={<SmartMetersPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
