import { lazy, Suspense } from "react";
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
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin">
        <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Carregando...</div>}>
          <AdminPanel />
        </Suspense>
      </Route>
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
