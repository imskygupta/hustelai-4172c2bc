import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { WorkspaceProvider } from "@/lib/workspace/context";
import { WorkspaceFrame } from "@/components/workspace/WorkspaceFrame";
import { WorkspaceAuthGate } from "@/components/workspace/WorkspaceAuthGate";
import { Sentry } from "@/lib/sentry";
import DelightToast from "@/components/tools/DelightToast";
import MascotCompanion from "@/components/MascotCompanion";
import { NewsletterCaptureAutoTrigger } from "@/components/newsletter/NewsletterCapture";
import { QuotaBoundary } from "@/components/usage/QuotaBoundary";
import Index from "./pages/Index";
import Explore from "./pages/Explore";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Unsubscribe from "./pages/Unsubscribe";
import BlogRedirect from "./pages/BlogRedirect";
import Reviews from "./pages/Reviews";
// Admin pages are lazy-loaded — they sit off the user critical path
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCommunications = lazy(() => import("./pages/admin/Communications"));
const AdminNewsletterOps = lazy(() => import("./pages/admin/NewsletterOps"));
const AdminUsageGovernance = lazy(() => import("./pages/admin/UsageGovernance"));
const AdminMissionControl = lazy(() => import("./pages/admin/MissionControl"));
const AdminDocs = lazy(() => import("./pages/admin/AdminDocs"));
const AdminMarketingPages = lazy(() => import("./pages/admin/MarketingPages"));
import NotificationPreferences from "./pages/settings/NotificationPreferences";
import Integrations from "./pages/settings/Integrations";
import Exports from "./pages/settings/Exports";
import SettingsLayout from "./components/settings/SettingsLayout";
import ProfileSettings from "./pages/settings/Profile";
import AccountSettings from "./pages/settings/Account";
import SecuritySettings from "./pages/settings/Security";
import WorkspaceSettings from "./pages/settings/Workspace";
import BillingSettings from "./pages/settings/Billing";
import ApiKeysSettings from "./pages/settings/ApiKeys";
import TelegramSettings from "./pages/settings/Telegram";
import Wallet from "./pages/settings/Wallet";
import FeedbackPage from "./pages/settings/Feedback";
import Download from "./pages/Download";
import AdminBlock from "./pages/AdminBlock";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Payment from "./pages/Payment";
import PaymentStatus from "./pages/PaymentStatus";
import Plans from "./pages/Plans";
import PricingPage from "./pages/PricingPage";
import Marketing1 from "./pages/Marketing1";
import Marketing2 from "./pages/Marketing2";
import Leaderboard from "./pages/Leaderboard";
import SavedHustles from "./pages/SavedHustles";
import Career from "./pages/Career";
import Affiliates from "./pages/Affiliates";
import Company from "./pages/Company";
import Trust from "./pages/Trust";
import Platform from "./pages/Platform";
import HowItWorks from "./pages/HowItWorks";
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
import SecurityTrust from "./pages/Security";
import DataPolicy from "./pages/DataPolicy";
import AcceptableUse from "./pages/AcceptableUse";
import Compliance from "./pages/Compliance";
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
import ToolsHub from "./pages/tools/ToolsHub";
import InvoiceGeneratorTool from "./pages/tools/InvoiceGenerator";
import ProposalGeneratorTool from "./pages/tools/ProposalGenerator";
import ContractGeneratorTool from "./pages/tools/ContractGenerator";
import PricingCalculator from "./pages/tools/PricingCalculator";
import PortfolioBio from "./pages/tools/PortfolioBio";
import OnboardingFormBuilder from "./pages/tools/OnboardingFormBuilder";
import ContentCalendar from "./pages/tools/ContentCalendar";
import PomodoroWidget from "./pages/tools/PomodoroWidget";
import BusinessCardGenerator from "./pages/tools/BusinessCardGenerator";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import HustleBot from "./pages/HustleBot";
import Operations from "./pages/Operations";
import Workspaces from "./pages/Workspaces";
import WorkspaceGateway from "./pages/WorkspaceGateway";
import HustleCanvas from "./pages/HustleCanvas";
import WorkspaceOS from "./pages/workspace-os/WorkspaceOS";
import WorkspaceOverview from "./pages/workspace-os/Overview";
import NewWorkspace from "./pages/workspace-os/NewWorkspace";
import RoadmapCockpit from "./pages/workspace-os/RoadmapCockpit";
import WorkspaceDetail from "./pages/workspace-os/WorkspaceDetail";
import AISettings from "./pages/workspace-os/AISettings";
import Pipeline from "./pages/workspace-os/Pipeline";
import Revenue from "./pages/workspace-os/Revenue";
import WorkspacePortal from "./pages/WorkspacePortal";
import DocsList from "./pages/workspace-os/docs/DocsList";
import DocEditor from "./pages/workspace-os/docs/DocEditor";
import BrandKitPage from "./pages/workspace-os/BrandKit";
import BlocksPage from "./pages/workspace-os/Blocks";
import ClientsPage from "./pages/workspace-os/Clients";
import IntakeForms from "./pages/workspace-os/IntakeForms";
import IntakeInbox from "./pages/workspace-os/IntakeInbox";
import DocsLibrary from "./pages/workspace-os/DocsLibrary";
import ToolsHubWS from "./pages/workspace-os/ToolsHub";
import IntakeSubmit from "./pages/IntakeSubmit";
import OperationsHub from "./pages/dashboard/OperationsHub";
import AutomationsHub from "./pages/dashboard/AutomationsHub";
import OperationsPreview from "./pages/dashboard/OperationsPreview";
import IntakePreview from "./pages/IntakePreview";
import Work from "./pages/Work";
import WorkTool from "./pages/WorkTool";
import ClientPortal from "./pages/ClientPortal";
import ClientSurface from "./pages/client/ClientSurface";
// In-app /docs route removed — docs now live on docs.hustlaiapp.in
import DynamicSeoPage from "./pages/seo/DynamicSeoPage";
import SeoBlogIndex from "./pages/seo/SeoBlogIndex";
import SeoBlogPost from "./pages/seo/SeoBlogPost";
import SavedGuides from "./pages/SavedGuides";
import SystemsIndex from "./pages/systems/SystemsIndex";
import SystemDetail from "./pages/systems/SystemDetail";
import StoriesIndex from "./pages/stories/StoriesIndex";
import StoryDetail from "./pages/stories/StoryDetail";
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
  ForFreelancersPage,
  ForAgenciesPage,
  ForCreatorsPage,
  ForTelegramBusinessPage,
} from "./pages/seo/landings";
import {
  FeatureDetail, FeatureHub,
  IntegrationDetail,
  WorkflowDetail, WorkflowHub,
  UseCaseDetail, UseCaseHub,
  FreeToolDetail, FreeToolHub,
} from "./pages/seo/Programmatic";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { YandexRouteTracker } from "@/components/YandexRouteTracker";
import { AppRouteShell } from "@/components/AppRouteShell";
import { RequireAuth } from "@/components/RequireAuth";
import { DocsSubdomainRedirect } from "@/components/DocsSubdomainRedirect";
import { StatusSubdomainRedirect } from "@/components/StatusSubdomainRedirect";
import { SurfaceHostRedirect } from "@/components/SurfaceHostRedirect";
import { BlogSubdomainRouter, isBlogHost } from "@/components/blog/BlogSubdomainRouter";
import { isMaintenance, MaintenancePage } from "@/components/MaintenanceGate";
import { RootErrorFallback } from "@/components/RootErrorFallback";
import { detectSurface } from "@/config/runtime";
import { isWorkspaceHost } from "@/lib/host";
import { useParams } from "react-router-dom";
const DocsLayout  = lazy(() => import("./pages/docs/DocsLayout"));
const DocsHome    = lazy(() => import("./pages/docs/DocsHome"));
const DocsArticle = lazy(() => import("./pages/docs/DocsArticle"));
// WorkspaceLanding removed — workspace.* now opens directly into the cockpit.
// The subdomain itself defines product context; no marketing landing layer.
import Status from "./pages/Status";
import Health from "./pages/Health";
import AuthDebug from "./pages/AuthDebug";
const AdminRuntime = lazy(() => import("./pages/admin/Runtime"));
const RuntimeProviders = lazy(() => import("./pages/admin/RuntimeProviders"));
const PaymentsReview = lazy(() => import("./pages/admin/PaymentsReview"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const TelegramOps = lazy(() => import("./pages/admin/TelegramOps"));
const TelegramControl = lazy(() => import("./pages/admin/TelegramControl"));
const TelegramOpsCenter = lazy(() => import("./pages/admin/TelegramOpsCenter"));
const AdminAiJobs = lazy(() => import("./pages/admin/AiJobs"));
const AdminFeatureFlags = lazy(() => import("./pages/admin/FeatureFlags"));
const RuntimeAnalytics = lazy(() => import("./pages/admin/RuntimeAnalytics"));
const Automations = lazy(() => import("./pages/admin/Automations"));
const BlogAdmin = lazy(() => import("./pages/admin/BlogAdmin"));
const BlogSeoHealth = lazy(() => import("./pages/admin/BlogSeoHealth"));
const BlogOperations = lazy(() => import("./pages/admin/BlogOperations"));
const EditorialCenter = lazy(() => import("./pages/admin/EditorialCenter"));
const ProductRegistry = lazy(() => import("./pages/admin/ProductRegistry"));
const KnowledgeGraph = lazy(() => import("./pages/admin/KnowledgeGraph"));
const NarrativeOps = lazy(() => import("./pages/admin/NarrativeOps"));
const TrafficIntelligence = lazy(() => import("./pages/admin/TrafficIntelligence"));
const ToolMediaLibrary = lazy(() => import("./pages/admin/ToolMediaLibrary"));
const CrawlOrchestrator = lazy(() => import("./pages/admin/CrawlOrchestrator"));
const AuthorityBatch = lazy(() => import("./pages/admin/AuthorityBatch"));
const HustleTemplatesAdmin = lazy(() => import("./pages/admin/HustleTemplates"));
const AdsenseReadiness = lazy(() => import("./pages/admin/AdsenseReadiness"));
const BootstrapSqlHub = lazy(() => import("./pages/admin/BootstrapSqlHub"));
const EditorialOS = lazy(() => import("./pages/admin/EditorialOS"));
const EditorialPipeline = lazy(() => import("./pages/admin/EditorialPipeline"));
const BlogAdminNotFound = lazy(() => import("./pages/admin/BlogAdminNotFound"));
const AuthorityIndex = lazy(() => import("./pages/authority/AuthorityIndex"));
const AuthorityPage = lazy(() => import("./pages/authority/AuthorityPage"));
import { MaintenanceBanner } from "./components/flags/FeatureGate";
import TelegramLanding from "./pages/marketing/TelegramLanding";
import { Navigate } from "react-router-dom";

// Legacy `/workspaces/*` → clean cockpit aliases (workspace host only).
function LegacyProjectRedirect() {
  const { id } = useParams();
  return <Navigate to={`/projects/${id}`} replace />;
}
function LegacyProjectDocsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/projects/${id}/docs`} replace />;
}
function LegacyProjectDocsNewRedirect() {
  const { id, type } = useParams();
  return <Navigate to={`/projects/${id}/docs/new/${type}`} replace />;
}
function LegacyProjectDocRedirect() {
  const { id, docId } = useParams();
  return <Navigate to={`/projects/${id}/docs/${docId}`} replace />;
}
function LegacyIntakeInboxRedirect() {
  const { id } = useParams();
  return <Navigate to={`/intake/${id}`} replace />;
}

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
  <Sentry.ErrorBoundary fallback={<RootErrorFallback />}>
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <WorkspaceProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {isMaintenance() ? <MaintenancePage /> : (
        <BrowserRouter>
          <YandexRouteTracker />
          {isBlogHost() ? <BlogSubdomainRouter /> : detectSurface() === "docs" ? (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>}>
              <DocsSubdomainRedirect />
              <Routes>
                <Route path="/" element={<DocsLayout />}>
                  <Route index element={<DocsHome />} />
                  <Route path=":slug" element={<DocsArticle />} />
                </Route>
              </Routes>
            </Suspense>
          ) : isWorkspaceHost() ? (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>}>
              <MascotCompanion />
              <SurfaceHostRedirect />
              <Routes>
                {/* Workspace cockpit — clean root URLs. The subdomain IS the
                    context, so we drop the redundant `/workspaces/...` prefix. */}
                <Route path="/" element={<WorkspaceAuthGate><WorkspaceOS /></WorkspaceAuthGate>}>
                  <Route index element={<WorkspaceOverview />} />
                  <Route path="projects/new" element={<NewWorkspace />} />
                  <Route path="projects/:id" element={<WorkspaceDetail />} />
                  <Route path="projects/:id/docs" element={<DocsList />} />
                  <Route path="projects/:id/docs/new/:type" element={<DocEditor />} />
                  <Route path="projects/:id/docs/:docId" element={<DocEditor />} />
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="providers" element={<AISettings />} />
                  <Route path="pipeline" element={<Pipeline />} />
                  <Route path="revenue" element={<Revenue />} />
                  <Route path="roadmap" element={<RoadmapCockpit />} />
                  <Route path="brand-kit" element={<BrandKitPage />} />
                  <Route path="blocks" element={<BlocksPage />} />
                  <Route path="intake" element={<IntakeForms />} />
                  <Route path="intake/:id" element={<IntakeInbox />} />
                  <Route path="library" element={<DocsLibrary />} />
                  <Route path="tools" element={<ToolsHubWS />} />
                  <Route path="automations" element={<AutomationsHub />} />
                </Route>
                {/* Legacy /workspaces/* aliases — keep typed/shared URLs working */}
                <Route path="/workspace" element={<Navigate to="/" replace />} />
                <Route path="/workspaces" element={<Navigate to="/" replace />} />
                <Route path="/workspaces/new" element={<Navigate to="/projects/new" replace />} />
                <Route path="/workspaces/ai-settings" element={<Navigate to="/providers" replace />} />
                <Route path="/workspaces/roadmap" element={<Navigate to="/roadmap" replace />} />
                <Route path="/workspaces/pipeline" element={<Navigate to="/pipeline" replace />} />
                <Route path="/workspaces/revenue" element={<Navigate to="/revenue" replace />} />
                <Route path="/workspaces/brand-kit" element={<Navigate to="/brand-kit" replace />} />
                <Route path="/workspaces/blocks" element={<Navigate to="/blocks" replace />} />
                <Route path="/workspaces/clients" element={<Navigate to="/clients" replace />} />
                <Route path="/workspaces/intake" element={<Navigate to="/intake" replace />} />
                <Route path="/workspaces/intake/:id" element={<LegacyIntakeInboxRedirect />} />
                <Route path="/workspaces/:id" element={<LegacyProjectRedirect />} />
                <Route path="/workspaces/:id/docs" element={<LegacyProjectDocsRedirect />} />
                <Route path="/workspaces/:id/docs/new/:type" element={<LegacyProjectDocsNewRedirect />} />
                <Route path="/workspaces/:id/docs/:docId" element={<LegacyProjectDocRedirect />} />
                {/* Independent surfaces that still mount on workspace.* */}
                <Route path="/client" element={<RequireAuth><ClientSurface /></RequireAuth>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          ) : (<>
          <ScrollToTop />
          <MaintenanceBanner />
          <DelightToast />
          <MascotCompanion />
          <NewsletterCaptureAutoTrigger />
          <StatusSubdomainRedirect />
          <SurfaceHostRedirect />
          <QuotaBoundary>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
              <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          }>
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
            {/* Persona landing pages */}
            <Route path="/for-freelancers" element={<ForFreelancersPage />} />
            <Route path="/for-agencies" element={<ForAgenciesPage />} />
            <Route path="/for-creators" element={<ForCreatorsPage />} />
            <Route path="/for-telegram-business" element={<ForTelegramBusinessPage />} />
            {/* Programmatic SEO clusters */}
            <Route path="/features" element={<FeatureHub />} />
            <Route path="/features/:slug" element={<FeatureDetail />} />
            <Route path="/workflows" element={<WorkflowHub />} />
            <Route path="/workflows/:slug" element={<WorkflowDetail />} />
            <Route path="/use-cases" element={<UseCaseHub />} />
            <Route path="/use-cases/:slug" element={<UseCaseDetail />} />
            <Route path="/free-tools" element={<FreeToolHub />} />
            <Route path="/free-tools/:slug" element={<FreeToolDetail />} />
            {/* Dynamic SEO blog */}
            <Route path="/insights" element={<SeoBlogIndex />} />
            <Route path="/insights/tag/:slug" element={<TagArchive />} />
            <Route path="/insights/category/:slug" element={<CategoryArchive />} />
            <Route path="/insights/:slug" element={<SeoBlogPost />} />
            <Route path="/saved" element={<SavedGuides />} />
            <Route path="/systems" element={<SystemsIndex />} />
            <Route path="/systems/:slug" element={<SystemDetail />} />
            <Route path="/stories" element={<StoriesIndex />} />
            <Route path="/stories/:slug" element={<StoryDetail />} />
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
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/blog" element={<BlogRedirect />} />
            <Route path="/blog/*" element={<BlogRedirect />} />
            <Route path="/reviews" element={<Reviews />} />
            {/* Community removed (Nov 2026 pivot to pure SaaS / CRM). Redirect to dashboard. */}
            <Route path="/community" element={<Navigate to="/dashboard" replace />} />
            <Route path="/profile" element={Shelled(<Profile />)} />
            <Route path="/payment" element={Shelled(<Payment />)} />
            <Route path="/payment-status" element={Shelled(<PaymentStatus />)} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/marketing-1" element={<Marketing1 />} />
            <Route path="/marketing-2" element={<Marketing2 />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/leaderboard" element={Shelled(<Leaderboard />)} />
            <Route path="/saved-hustles" element={Shelled(<SavedHustles />)} />
            <Route path="/career" element={<Career />} />
            <Route path="/affiliates" element={Shelled(<Affiliates />)} />
            <Route path="/company" element={<Company />} />
            <Route path="/relax" element={<Relax />} />
            {/* Free public tools (SEO + PLG funnel) */}
            <Route path="/tools" element={<ToolsHub />} />
            <Route path="/tools/invoice-generator" element={<InvoiceGeneratorTool />} />
            <Route path="/tools/proposal-generator" element={<ProposalGeneratorTool />} />
            <Route path="/tools/contract-generator" element={<ContractGeneratorTool />} />
            <Route path="/tools/pricing-calculator" element={<PricingCalculator />} />
            <Route path="/tools/portfolio-bio" element={<PortfolioBio />} />
            <Route path="/tools/onboarding-form" element={<OnboardingFormBuilder />} />
            <Route path="/tools/content-calendar" element={<ContentCalendar />} />
            <Route path="/tools/pomodoro" element={<PomodoroWidget />} />
            <Route path="/tools/business-card" element={<BusinessCardGenerator />} />
            {/* Same tools rendered INSIDE the dashboard shell for signed-in users.
                Banner/dialog from public /tools/* pages routes here. */}
            <Route path="/dashboard/tools" element={Shelled(<ToolsHub />)} />
            <Route path="/dashboard/tools/invoice-generator" element={Shelled(<InvoiceGeneratorTool />)} />
            <Route path="/dashboard/tools/proposal-generator" element={Shelled(<ProposalGeneratorTool />)} />
            <Route path="/dashboard/tools/contract-generator" element={Shelled(<ContractGeneratorTool />)} />
            <Route path="/dashboard/tools/pricing-calculator" element={Shelled(<PricingCalculator />)} />
            <Route path="/dashboard/tools/portfolio-bio" element={Shelled(<PortfolioBio />)} />
            <Route path="/dashboard/tools/onboarding-form" element={Shelled(<OnboardingFormBuilder />)} />
            <Route path="/dashboard/tools/content-calendar" element={Shelled(<ContentCalendar />)} />
            <Route path="/dashboard/tools/pomodoro" element={Shelled(<PomodoroWidget />)} />
            <Route path="/dashboard/tools/business-card" element={Shelled(<BusinessCardGenerator />)} />
            {/* Operational backbone — workspace ops + outcome-first automations */}
            <Route path="/dashboard/workspace-os" element={Shelled(<OperationsHub />)} />
            <Route path="/dashboard/automations" element={Shelled(<AutomationsHub />)} />
            {/* Boosts canonical location moved into /settings/wallet — keep old path redirecting */}
            <Route path="/dashboard/workspace-os/boosts" element={<Navigate to="/settings/wallet" replace />} />
            <Route path="/dashboard/workspace-os/preview/:module" element={Shelled(<OperationsPreview />)} />
            <Route path="/hustle/:id" element={Shelled(<HustleDetail />)} />
            <Route path="/roadmap/:id" element={Shelled(<RoadmapViewer />)} />
            <Route path="/infinity-zone" element={Shelled(<InfinityZone />)} />
            {/* Marketplace was rebranded to Integrations. Old URLs redirect for safety. */}
            <Route path="/integrations" element={<Marketplace />} />
            <Route path="/marketplace" element={<Navigate to="/integrations" replace />} />
            <Route path="/marketplace/:id" element={<Navigate to="/integrations" replace />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/security" element={<SecurityTrust />} />
            <Route path="/data-policy" element={<DataPolicy />} />
            <Route path="/acceptable-use" element={<AcceptableUse />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/trust" element={<Trust />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/operations" element={<Operations />} />
            {/* Surface aliases — simulate the multi-surface architecture in-app
                until subdomains are cut over. Mental model: one purpose per surface. */}
            <Route path="/workspace" element={<Navigate to="/workspaces" replace />} />
            {/* /client is its own world (own shell, own sidebar) — see ClientSurface. */}
            <Route path="/client" element={<RequireAuth><ClientSurface /></RequireAuth>} />
            <Route path="/ai" element={<Navigate to="/ai-tools" replace />} />
            <Route path="/admin" element={<AdminBlock />} />
            <Route path="/imskygupta-admin" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-dashboard/docs" element={<AdminDocs />} />
            <Route path="/admin/communications" element={<AdminCommunications />} />
            <Route path="/admin/communications/newsletter" element={<AdminNewsletterOps />} />
            <Route path="/admin/usage-governance" element={<AdminUsageGovernance />} />
            <Route path="/admin/mission-control" element={<AdminMissionControl />} />
            <Route path="/admin/marketing-pages" element={<AdminMarketingPages />} />
            <Route path="/admin/communications/telegram" element={<TelegramOpsCenter />} />
            <Route path="/admin/ai-jobs" element={<AdminAiJobs />} />
            <Route path="/admin/telegram" element={<TelegramOps />} />
            <Route path="/admin/telegram-control" element={<TelegramControl />} />
            <Route path="/integrations/telegram" element={<TelegramLanding />} />
            <Route path="/integrations/:slug" element={<IntegrationDetail />} />
            <Route path="/d/:token" element={<Download />} />
            <Route path="/settings" element={Shelled(<SettingsLayout />)}>
              <Route index element={<Navigate to="/settings/profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="account" element={<AccountSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="notifications" element={<NotificationPreferences />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="telegram" element={<TelegramSettings />} />
              <Route path="exports" element={<Exports />} />
              <Route path="workspace" element={<WorkspaceSettings />} />
              <Route path="billing" element={<BillingSettings />} />
              <Route path="api" element={<ApiKeysSettings />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="feedback" element={<FeedbackPage />} />
            </Route>
            <Route path="/problem-leads" element={Shelled(<ProblemLeads />)} />
            <Route path="/proposal-draft" element={Shelled(<ProposalDraft />)} />
            <Route path="/skill-gap" element={Shelled(<SkillGap />)} />
            <Route path="/ai-tools" element={Shelled(<WorkspaceFrame><AIToolBenchmarks /></WorkspaceFrame>)} />
            <Route path="/knowledge-hub" element={Shelled(<WorkspaceFrame><KnowledgeHub /></WorkspaceFrame>)} />
            <Route path="/hustle-blueprint" element={Shelled(<WorkspaceFrame><HustleBlueprint /></WorkspaceFrame>)} />
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
            {/*
              Marketing-host /workspaces is ONLY a transition gateway now.
              All actual workspace execution lives on workspace.hustlaiapp.in.
              Any deep /workspaces/* hit lands on the gateway too — the user
              clicks "Enter Workspace" to hop into the real cockpit.
            */}
            <Route path="/workspaces" element={Shelled(<WorkspaceGateway />)} />
            <Route path="/workspaces/*" element={Shelled(<WorkspaceGateway />)} />
            <Route path="/workspaces-legacy" element={Shelled(<Workspaces />)} />
            <Route path="/canvas" element={Shelled(<WorkspaceFrame><HustleCanvas /></WorkspaceFrame>)} />
            <Route path="/work" element={Shelled(<Work />)} />
            <Route path="/work/:slug" element={Shelled(<WorkTool />)} />
            <Route path="/portal/:token" element={<ClientPortal />} />
            <Route path="/p/:token" element={<WorkspacePortal />} />
            <Route path="/intake/:slug" element={<IntakeSubmit />} />
            <Route path="/intake/preview" element={<IntakePreview />} />
            {/* /docs route removed — see docs.hustlaiapp.in */}
            <Route path="/status" element={<Status />} />
            <Route path="/api/health" element={<Health kind="health" />} />
            <Route path="/api/status" element={<Health kind="status" />} />
            <Route path="/api/version" element={<Health kind="version" />} />
            <Route path="/auth-debug" element={<AuthDebug />} />
            <Route path="/admin/runtime" element={<AdminRuntime />} />
            <Route path="/admin/runtime/providers" element={<RuntimeProviders />} />
            <Route path="/admin/runtime/analytics" element={<RuntimeAnalytics />} />
            <Route path="/admin/feature-flags" element={<AdminFeatureFlags />} />
            <Route path="/admin/automations" element={<Automations />} />
            <Route path="/admin/payments-review" element={<PaymentsReview />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/blog" element={<BlogAdmin />} />
            <Route path="/admin/blog/seo" element={<BlogSeoHealth />} />
            <Route path="/admin/blog/operations" element={<BlogOperations />} />
            <Route path="/admin/blog/editorial" element={<EditorialCenter />} />
           <Route path="/admin/blog/pipeline" element={<EditorialPipeline />} />
            <Route path="/admin/blog/topics" element={<EditorialCenter />} />
            <Route path="/admin/blog/linking" element={<EditorialCenter />} />
            <Route path="/admin/blog/indexing" element={<EditorialCenter />} />
            <Route path="/admin/blog/media" element={<BlogOperations />} />
            <Route path="/admin/blog/queue" element={<BlogOperations />} />
            <Route path="/admin/blog/registry" element={<ProductRegistry />} />
            <Route path="/admin/blog/graph" element={<KnowledgeGraph />} />
            <Route path="/admin/blog/narrative" element={<NarrativeOps />} />
            <Route path="/admin/blog/traffic" element={<TrafficIntelligence />} />
            <Route path="/admin/blog/tool-media" element={<ToolMediaLibrary />} />
            <Route path="/admin/blog/crawl" element={<CrawlOrchestrator />} />
            <Route path="/admin/blog/authority-batch" element={<AuthorityBatch />} />
            <Route path="/admin/blog/hustle-templates" element={<HustleTemplatesAdmin />} />
            <Route path="/admin/blog/adsense" element={<AdsenseReadiness />} />
            {/* Aliases — operators frequently type the long form */}
            <Route path="/admin/blog/adsense-readiness" element={<AdsenseReadiness />} />
            <Route path="/admin/blog/seo-health" element={<BlogSeoHealth />} />
            <Route path="/admin/blog/knowledge-graph" element={<KnowledgeGraph />} />
            <Route path="/admin/blog/tool-registry" element={<ProductRegistry />} />
            <Route path="/admin/blog/crawl-orchestrator" element={<CrawlOrchestrator />} />
            <Route path="/admin/blog/bootstrap" element={<BootstrapSqlHub />} />
            <Route path="/admin/blog/bootstrap-sql" element={<BootstrapSqlHub />} />
            {/* Unified editorial operating system */}
            <Route path="/admin/blog/os" element={<EditorialOS />} />
            <Route path="/admin/blog/command" element={<EditorialOS />} />
            {/* Smart 404 for any other /admin/blog/* path — must stay last in this group */}
            <Route path="/admin/blog/*" element={<BlogAdminNotFound />} />
            <Route path="/systems" element={<AuthorityIndex />} />
            <Route path="/systems/:slug" element={<AuthorityPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </QuotaBoundary>
          <MobileBottomNav />
          </>)}
        </BrowserRouter>
        )}
      </TooltipProvider>
    </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
  </Sentry.ErrorBoundary>
);

export default App;
