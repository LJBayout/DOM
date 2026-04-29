import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import FichaForm from "./pages/FichaForm";
import FichaView from "./pages/FichaView";
import Login from "./pages/Login";
import InstallGuide from "./pages/InstallGuide";
import { AiAssistant } from "./components/AiAssistant";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/ficha/nova" component={FichaForm} />
      <Route path="/ficha/:id/editar" component={FichaForm} />
      <Route path="/ficha/:id" component={FichaView} />
      <Route path="/instalar" component={InstallGuide} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
          <AiAssistant />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
