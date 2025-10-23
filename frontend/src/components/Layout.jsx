import { Outlet } from "react-router-dom";
import Navigation from "./Navigation";
import PageTransition from "./PageTransition";

function Layout() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors duration-200">
      <Navigation />
      <main className="layout-container py-responsive">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}

export default Layout;
