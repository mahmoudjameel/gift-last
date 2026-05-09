import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, ProtectedRoute } from "@/hooks/useAuth";

// Auth Pages
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";

// Merchant Pages
import MerchantDashboard from "@/pages/merchant/Dashboard";
import MerchantProducts from "@/pages/merchant/Products";
import MerchantOrders from "@/pages/merchant/Orders";
import MerchantReviews from "@/pages/merchant/Reviews";
import MerchantMessages from "@/pages/merchant/Messages";
import MerchantWallet from "@/pages/merchant/Wallet";
import MerchantSettings from "@/pages/merchant/Settings";
import MerchantTerms from "@/pages/merchant/Terms";
import MerchantDeliverySettings from "@/pages/merchant/DeliverySettings";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminMerchants from "@/pages/admin/Merchants";
import AdminPendingMerchants from "@/pages/admin/PendingMerchants";
import AdminAdmins from "@/pages/admin/Admins";
import AdminLogin from "@/pages/admin/Login";
import AdminSettings from "@/pages/admin/Settings";
import AdminAppSettings from "@/pages/admin/AppSettings";
import AdminPolicies from "@/pages/admin/Policies";
import AdminWithdrawals from "@/pages/admin/Withdrawals";
import AdminCustomers from "@/pages/admin/Customers";
import AdminOrders from "@/pages/admin/Orders";
import AdminPromotionalAds from "@/pages/admin/PromotionalAds";

function Router() {
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />


      {/* Merchant Routes - Protected (specific routes first) */}
      <Route path="/dashboard/products">
        <ProtectedRoute requiredRole="merchant">
          <MerchantProducts />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/orders">
        <ProtectedRoute requiredRole="merchant">
          <MerchantOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/reviews">
        <ProtectedRoute requiredRole="merchant">
          <MerchantReviews />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/messages">
        <ProtectedRoute requiredRole="merchant">
          <MerchantMessages />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/wallet">
        <ProtectedRoute requiredRole="merchant">
          <MerchantWallet />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/delivery">
        <ProtectedRoute requiredRole="merchant">
          <MerchantDeliverySettings />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/settings">
        <ProtectedRoute requiredRole="merchant">
          <MerchantSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/terms">
        <ProtectedRoute requiredRole="merchant">
          <MerchantTerms />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute requiredRole="merchant">
          <MerchantDashboard />
        </ProtectedRoute>
      </Route>

      {/* Admin Routes - Protected (specific routes first) */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/pending">
        <ProtectedRoute requiredRole="admin">
          <AdminPendingMerchants />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/merchants">
        <ProtectedRoute requiredRole="admin">
          <AdminMerchants />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/admins">
        <ProtectedRoute requiredRole="admin">
          <AdminAdmins />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute requiredRole="admin">
          <AdminSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/app-settings">
        <ProtectedRoute requiredRole="admin">
          <AdminAppSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/promotions">
        <ProtectedRoute requiredRole="admin">
          <AdminPromotionalAds />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/policies">
        <ProtectedRoute requiredRole="admin">
          <AdminPolicies />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/withdrawals">
        <ProtectedRoute requiredRole="admin">
          <AdminWithdrawals />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/customers">
        <ProtectedRoute requiredRole="admin">
          <AdminCustomers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/orders">
        <ProtectedRoute requiredRole="admin">
          <AdminOrders />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute requiredRole="admin">
          <AdminDashboard />
        </ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
