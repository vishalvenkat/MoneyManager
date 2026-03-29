import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';

// Pages currently as inline functional components to outline structure
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Transactions } from './pages/Transactions/Transactions';
import { CalendarView } from './pages/CalendarView/CalendarView';
import { Accounts } from './pages/Accounts/Accounts';
import { Reports } from './pages/Reports/Reports';
import { Settings } from './pages/Settings/Settings';
import { AuthPage } from './pages/Auth/AuthPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
