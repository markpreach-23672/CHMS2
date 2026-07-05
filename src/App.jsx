import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import People from '@/pages/People';
import PersonDetail from '@/pages/PersonDetail';
import Tags from '@/pages/Tags';
import Giving from '@/pages/Giving';
import GivingStatement from '@/pages/GivingStatement';
import GivingStatementsBulk from '@/pages/GivingStatementsBulk';
import CalendarPage from '@/pages/CalendarPage';
import ConnectCards from '@/pages/ConnectCards';
import SearchPage from '@/pages/Search';
import Settings from '@/pages/Settings';
import Families from '@/pages/Families';
import Reports from '@/pages/Reports';
import Volunteers from '@/pages/Volunteers';
import PublicConnectCard from '@/pages/PublicConnectCard';
import Forms from '@/pages/Forms';
import PublicForm from '@/pages/PublicForm';
import PublicCalendar from '@/pages/PublicCalendar';
import Elections from '@/pages/Elections';
import PublicElection from '@/pages/PublicElection';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, authChecked } = useAuth();

  // Redirect to login once when auth is confirmed missing — via useEffect to avoid
  // repeated redirects during render (which causes URL accumulation / redirect loops).
  useEffect(() => {
    const shouldRedirect = authChecked && !isAuthenticated && (!authError || authError.type === 'auth_required');
    if (shouldRedirect) {
      navigateToLogin();
    }
  }, [authChecked, isAuthenticated, authError, navigateToLogin]);

  const Spinner = () => (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <Spinner />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // auth_required — redirect in progress via effect; show spinner meanwhile
    return <Spinner />;
  }

  // Not authenticated — redirect in progress via effect; show spinner meanwhile
  if (authChecked && !isAuthenticated) {
    return <Spinner />;
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/people" element={<People />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/giving" element={<Giving />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/connect-cards" element={<ConnectCards />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/families" element={<Families />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/volunteers" element={<Volunteers />} />
        <Route path="/forms" element={<Forms />} />
        <Route path="/elections" element={<Elections />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/giving/statement/:id" element={<GivingStatement />} />
      <Route path="/giving/statements/bulk" element={<GivingStatementsBulk />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function AppShell() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/card/')) {
    return (
      <Routes>
        <Route path="/card/:cardId" element={<PublicConnectCard />} />
      </Routes>
    );
  }
  if (pathname.startsWith('/calendar/public/')) {
    return (
      <Routes>
        <Route path="/calendar/public/:calendarId" element={<PublicCalendar />} />
      </Routes>
    );
  }
  if (pathname.startsWith('/election/')) {
    return (
      <Routes>
        <Route path="/election/:electionId" element={<PublicElection />} />
      </Routes>
    );
  }
  if (pathname.startsWith('/form/')) {
    return (
      <Routes>
        <Route path="/form/:formId" element={<PublicForm />} />
      </Routes>
    );
  }
  return <AuthenticatedApp />;
}

function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AppShell />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App