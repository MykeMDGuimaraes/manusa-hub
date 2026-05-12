import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import PortalLayout from "./components/PortalLayout";
import DashboardPage from "./pages/DashboardPage";
import GeradorPage from "./pages/GeradorPage";
import SupervisaoPage from "./pages/SupervisaoPage";
import RotinasPage from "./pages/RotinasPage";
import OlimpoPage from "./pages/OlimpoPage";
import ApiKeysPage from "./pages/ApiKeysPage";

function Router() {
  return (
    <PortalLayout>
      <Switch>
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/gerador" component={GeradorPage} />
        <Route path="/supervisao" component={SupervisaoPage} />
        <Route path="/rotinas" component={RotinasPage} />
        <Route path="/olimpo" component={OlimpoPage} />
        <Route path="/api-keys" component={ApiKeysPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </PortalLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
