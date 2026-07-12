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
import MasterDashboard from '@/pages/MasterDashboard';
import People from '@/pages/People';
import PersonDetail from '@/pages/PersonDetail';
import Tags from '@/pages/Tags';
import Giving from '@/pages/Giving';
import GivingStatement from '@/pages/GivingStatement';
import MemberPortal from '@/pages/MemberPortal';
import GivingStatementsBulk from '@/pages/GivingStatementsBulk';
import CalendarPage from '@/pages/CalendarPage';
import ConnectCards from '@/pages/ConnectCards';
import SearchPage from '@/pages/Search';
import Settings from '@/pages/Settings';
import Families from '@/pages/Families';
import Reports from '@/pages/Reports';
import Volunteers from '@/pages/Volunteers';
import Services from '@/pages/Services';
import PublicConnectCard from '@/pages/PublicConnectCard';
import Forms from '@/pages/Forms';
import PublicForm from '@/pages/PublicForm';
import PublicCalendar from '@/pages/PublicCalendar';
import Elections from '@/pages/Elections';
import HelpDesk from '@/pages/HelpDesk';
import PublicElection from '@/pages/PublicElection';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // This app is Public (no login required) at the platform level, so we never
  // force a login redirect here — doing so causes a redirect loop for visitors.
  // The platform enforces login itself if the visibility setting is changed.

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Surface a clear error page if the visitor's account isn't registered for the app
  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app for everyone (auth state still tracked via useAuth for pages that need it)
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/master" element={<MasterDashboard />} />
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
        <Route path="/services" element={<Services />} />
        <Route path="/forms" element={<Forms />} />
        <Route path="/elections" element={<Elections />} />
        <Route path="/help-desk" element={<HelpDesk />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/my-family" element={<MemberPortal />} />
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