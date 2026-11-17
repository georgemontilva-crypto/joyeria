import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Shop } from "./pages/Shop";
import { ProductPage } from "./pages/ProductPage";
import { Collections } from "./pages/Collections";
import { Story } from "./pages/Story";
import { Contact } from "./pages/Contact";
import { Faq } from "./pages/Faq";
import { Bag } from "./pages/Bag";
import { OrderConfirmed } from "./pages/OrderConfirmed";
import { Policy } from "./pages/Policy";
import { NotFound } from "./pages/NotFound";

// The admin panel is its own chunk so shoppers never download it.
const AdminApp = lazy(() => import("./admin/AdminApp"));

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

export function App() {
  const [location] = useLocation();
  if (location === "/admin" || location.startsWith("/admin/")) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    );
  }
  return (
    <Layout>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/product/:slug" component={ProductPage} />
        <Route path="/collections" component={Collections} />
        <Route path="/our-story" component={Story} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={Faq} />
        <Route path="/bag" component={Bag} />
        <Route path="/order/confirmed" component={OrderConfirmed} />
        <Route path="/policies/:slug" component={Policy} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}
