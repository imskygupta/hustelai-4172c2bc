import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import Reviews from "./pages/Reviews";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBlock from "./pages/AdminBlock";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Payment from "./pages/Payment";
import Leaderboard from "./pages/Leaderboard";
import SavedHustles from "./pages/SavedHustles";
import Career from "./pages/Career";
import Affiliates from "./pages/Affiliates";
import Company from "./pages/Company";
import Relax from "./pages/Relax";
import HustleDetail from "./pages/HustleDetail";
import InfinityZone from "./pages/InfinityZone";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/community" element={<Community />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/saved-hustles" element={<SavedHustles />} />
            <Route path="/career" element={<Career />} />
            <Route path="/affiliates" element={<Affiliates />} />
            <Route path="/company" element={<Company />} />
            <Route path="/relax" element={<Relax />} />
            <Route path="/hustle/:id" element={<HustleDetail />} />
            <Route path="/infinity-zone" element={<InfinityZone />} />
            <Route path="/admin" element={<AdminBlock />} />
            <Route path="/imskygupta-admin" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
