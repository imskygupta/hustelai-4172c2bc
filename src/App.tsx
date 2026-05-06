import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { Sentry } from "@/lib/sentry";
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
import AdminCommunications from "./pages/admin/Communications";
import NotificationPreferences from "./pages/settings/NotificationPreferences";
import AdminBlock from "./pages/AdminBlock";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Payment from "./pages/Payment";
import PaymentStatus from "./pages/PaymentStatus";
import Plans from "./pages/Plans";
import Leaderboard from "./pages/Leaderboard";
import SavedHustles from "./pages/SavedHustles";
import Career from "./pages/Career";
import Affiliates from "./pages/Affiliates";
import Company from "./pages/Company";
import Relax from "./pages/Relax";
import HustleDetail from "./pages/HustleDetail";
import RoadmapViewer from "@/pages/RoadmapViewer";
import InfinityZone from "./pages/InfinityZone";
import Marketplace from "./pages/Marketplace";
import MarketplaceItem from "./pages/MarketplaceItem";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import RefundPolicy from "./pages/RefundPolicy";
import ProblemLeads from "./pages/ProblemLeads";
import ProposalDraft from "./pages/ProposalDraft";
import SkillGap from "./pages/SkillGap";
import AIToolBenchmarks from "./pages/AIToolBenchmarks";
import KnowledgeHub from "./pages/KnowledgeHub";
import HustleBlueprint from "./pages/HustleBlueprint";
import ResumeOptimizer from "./pages/ResumeOptimizer";
import GigArbitrage from "./pages/GigArbitrage";
import GigPriceCalculator from "./pages/GigPriceCalculator";
import FacelessContent from "./pages/FacelessContent";
import RedFlagScanner from "./pages/RedFlagScanner";
import SureHitJobs from "./pages/SureHitJobs";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import HustleBot from "./pages/HustleBot";
import Workspaces from "./pages/Workspaces";
import HustleCanvas from "./pages/HustleCanvas";
import WorkspaceOS from "./pages/workspace-os/WorkspaceOS";
import WorkspaceOverview from "./pages/workspace-os/Overview";
import NewWorkspace from "./pages/workspace-os/NewWorkspace";
import WorkspaceDetail from "./pages/workspace-os/WorkspaceDetail";
import AISettings from "./pages/workspace-os/AISettings";
import Pipeline from "./pages/workspace-os/Pipeline";
import Revenue from "./pages/workspace-os/Revenue";
import WorkspacePortal from "./pages/WorkspacePortal";
import DocsList from "./pages/workspace-os/docs/DocsList";
import DocEditor from "./pages/workspace-os/docs/DocEditor";
import Work from "./pages/Work";
import WorkTool from "./pages/WorkTool";
import ClientPortal from "./pages/ClientPortal";
import DynamicSeoPage from "./pages/seo/DynamicSeoPage";
import SeoBlogIndex from "./pages/seo/SeoBlogIndex";
import SeoBlogPost from "./pages/seo/SeoBlogPost";
import TopicsIndex from "./pages/seo/TopicsIndex";
import TopicHub from "./pages/seo/TopicHub";
import AuthorPage from "./pages/seo/AuthorPage";
import TagArchive from "./pages/seo/TagArchive";
import CategoryArchive from "./pages/seo/CategoryArchive";
import {
  FreelancerCRMPage,
  AIInvoiceGeneratorPage,
  QuotationGeneratorPage,
  ProposalGeneratorPage,
  ClientOnboardingPage,
  WorkspaceOSMarketingPage,
  FreelancerWorkspacePage,
  AIDocumentGeneratorPage,
  ClientPortalSoftwarePage,
  AgencyWorkflowToolsPage,
  FreelancerProductivityToolsPage,
  AIBusinessCardMakerPage,
} from "./pages/seo/landings";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { AppRouteShell } from "@/components/AppRouteShell";
import { RequireAuth } from "@/components/RequireAuth";

// Helper to wrap an in-app page in the SaaS sidebar shell.
// All shelled routes require auth — guests are redirected to /signup so they
// never see a logged-in dashboard / sidebar with Sign out etc.
const Shelled = (el: React.ReactNode) => (
  <RequireAuth>
    <AppRouteShell>{el}</AppRouteShell>
  </RequireAuth>
);

const queryClient = new QueryClient();

const App = () => (
  <Sentry.ErrorBoundary fallback={<div style={{ padding: 24 }}>Something went wrong. Please refresh.</div>}>
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            {/* SEO landing pages (public) */}
            <Route path="/freelancer-crm" element={<FreelancerCRMPage />} />
            <Route path="/ai-invoice-generator" element={<AIInvoiceGeneratorPage />} />
            <Route path="/quotation-generator" element={<QuotationGeneratorPage />} />
            <Route path="/proposal-generator" element={<ProposalGeneratorPage />} />
            <Route path="/client-onboarding-software" element={<ClientOnboardingPage />} />
            <Route path="/workspace-os" element={<WorkspaceOSMarketingPage />} />
            <Route path="/freelancer-workspace" element={<FreelancerWorkspacePage />} />
            <Route path="/ai-document-generator" element={<AIDocumentGeneratorPage />} />
            <Route path="/client-portal-software" element={<ClientPortalSoftwarePage />} />
            <Route path="/agency-workflow-tools" element={<AgencyWorkflowToolsPage />} />
            <Route path="/freelancer-productivity-tools" element={<FreelancerProductivityToolsPage />} />
            <Route path="/ai-business-card-maker" element={<AIBusinessCardMakerPage />} />
            {/* Dynamic SEO blog */}
            <Route path="/insights" element={<SeoBlogIndex />} />
            <Route path="/insights/tag/:slug" element={<TagArchive />} />
            <Route path="/insights/category/:slug" element={<CategoryArchive />} />
            <Route path="/insights/:slug" element={<SeoBlogPost />} />
            <Route path="/topics" element={<TopicsIndex />} />
            <Route path="/topics/:slug" element={<TopicHub />} />
            <Route path="/authors/:slug" element={<AuthorPage />} />
            {/* Admin preview for landing pages */}
            <Route path="/_preview/page/:slug" element={<DynamicSeoPage preview />} />
            <Route path="/_preview/blog/:slug" element={<SeoBlogPost preview />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/community" element={Shelled(<Community />)} />
            <Route path="/profile" element={Shelled(<Profile />)} />
            <Route path="/payment" element={Shelled(<Payment />)} />
            <Route path="/payment-status" element={Shelled(<PaymentStatus />)} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/leaderboard" element={Shelled(<Leaderboard />)} />
            <Route path="/saved-hustles" element={Shelled(<SavedHustles />)} />
            <Route path="/career" element={<Career />} />
            <Route path="/affiliates" element={Shelled(<Affiliates />)} />
            <Route path="/company" element={<Company />} />
            <Route path="/relax" element={Shelled(<Relax />)} />
            <Route path="/hustle/:id" element={Shelled(<HustleDetail />)} />
            <Route path="/roadmap/:id" element={Shelled(<RoadmapViewer />)} />
            <Route path="/infinity-zone" element={Shelled(<InfinityZone />)} />
            <Route path="/marketplace" element={Shelled(<Marketplace />)} />
            <Route path="/marketplace/:id" element={Shelled(<MarketplaceItem />)} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/admin" element={<AdminBlock />} />
            <Route path="/imskygupta-admin" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin/communications" element={<AdminCommunications />} />
            <Route path="/settings/notifications" element={Shelled(<NotificationPreferences />)} />
            <Route path="/problem-leads" element={Shelled(<ProblemLeads />)} />
            <Route path="/proposal-draft" element={Shelled(<ProposalDraft />)} />
            <Route path="/skill-gap" element={Shelled(<SkillGap />)} />
            <Route path="/ai-tools" element={Shelled(<AIToolBenchmarks />)} />
            <Route path="/knowledge-hub" element={Shelled(<KnowledgeHub />)} />
            <Route path="/hustle-blueprint" element={Shelled(<HustleBlueprint />)} />
            <Route path="/resume-optimizer" element={Shelled(<ResumeOptimizer />)} />
            <Route path="/gig-arbitrage" element={Shelled(<GigArbitrage />)} />
            <Route path="/gig-price-calculator" element={Shelled(<GigPriceCalculator />)} />
            <Route path="/faceless-content" element={Shelled(<FacelessContent />)} />
            <Route path="/red-flag-scanner" element={Shelled(<RedFlagScanner />)} />
            <Route path="/sure-hit-jobs" element={Shelled(<SureHitJobs />)} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/hustlebot" element={Shelled(<HustleBot />)} />
            <Route path="/workspaces" element={Shelled(<WorkspaceOS />)}>
              <Route index element={<WorkspaceOverview />} />
              <Route path="new" element={<NewWorkspace />} />
              <Route path="ai-settings" element={<AISettings />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="revenue" element={<Revenue />} />
              <Route path=":id" element={<WorkspaceDetail />} />
              <Route path=":id/docs" element={<DocsList />} />
              <Route path=":id/docs/new/:type" element={<DocEditor />} />
              <Route path=":id/docs/:docId" element={<DocEditor />} />
            </Route>
            <Route path="/workspaces-legacy" element={Shelled(<Workspaces />)} />
            <Route path="/canvas" element={Shelled(<HustleCanvas />)} />
            <Route path="/work" element={Shelled(<Work />)} />
            <Route path="/work/:slug" element={Shelled(<WorkTool />)} />
            <Route path="/portal/:token" element={<ClientPortal />} />
            <Route path="/p/:token" element={<WorkspacePortal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <MobileBottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
  </Sentry.ErrorBoundary>
);

export default App;
