
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Applications } from "./components/Applications";
import { ExtensionDownload } from "./components/ExtensionDownload";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="applications" element={<Applications />} />
            <Route path="extension" element={<ExtensionDownload />} />
            <Route path="companies" element={<div className="p-8 text-center text-slate-600">Companies page coming soon...</div>} />
            <Route path="interviews" element={<div className="p-8 text-center text-slate-600">Interviews page coming soon...</div>} />
            <Route path="analytics" element={<div className="p-8 text-center text-slate-600">Analytics page coming soon...</div>} />
            <Route path="settings" element={<div className="p-8 text-center text-slate-600">Settings page coming soon...</div>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
