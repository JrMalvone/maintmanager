import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AppAuthProvider } from "@/hooks/useAppAuth";
import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewOrderPage from "./pages/NewOrder";
import OrdersPage from "./pages/Orders";
import AnalyticsPage from "./pages/Analytics";
import SettingsPage from "./pages/Settings";
import TvPanelPage from "./pages/TvPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const Router = window.location.protocol === "file:" ? HashRouter : BrowserRouter;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <AppAuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/new-order" element={<NewOrderPage />} />
            <Route path="/dashboard/orders" element={<OrdersPage />} />
            <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/tv" element={<TvPanelPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppAuthProvider>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
