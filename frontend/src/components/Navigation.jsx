import { NavLink } from "react-router-dom";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import {
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  BeakerIcon,
  Cog6ToothIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";

function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = [
    { path: "/", label: "Dashboard", icon: ChartBarIcon },
    { path: "/manage", label: "Manage", icon: BeakerIcon },
    { path: "/settings", label: "Settings", icon: Cog6ToothIcon },
  ];

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg border-b border-primary-800/20 backdrop-blur-sm parallax-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Enhanced Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center group">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-3 shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:scale-105 tilt-hover">
                <HeroIcon
                  icon={HeartIcon}
                  size="lg"
                  color="primary"
                  aria-label="MedTracker logo"
                />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
                  CuraMind
                </h1>
                <span className="text-xs text-primary-100 font-medium tracking-wide">
                  Medication Management
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path}>
                {({ isActive }) => (
                  <div
                    className={`group flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium 
                     transition-all duration-300 ease-out relative overflow-hidden
                     ${
                       isActive
                         ? "bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/10"
                         : "text-primary-100 hover:bg-white/10 hover:text-white hover:shadow-md hover:backdrop-blur-sm"
                     }`}
                  >
                    {/* Active indicator */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 transform transition-transform duration-300 ${
                        isActive ? "scale-100" : "scale-0 group-hover:scale-100"
                      }`}
                    />

                    <HeroIcon
                      icon={item.icon}
                      size="sm"
                      className={`relative z-10 transition-transform duration-200 ${
                        isActive ? "scale-110" : "group-hover:scale-105"
                      }`}
                    />
                    <span className="relative z-10">{item.label}</span>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )}
              </NavLink>
            ))}

            {/* Enhanced Theme Toggle for Desktop */}
            <div className="ml-6 pl-6 border-l border-white/20">
              <ThemeToggle
                variant="navigation"
                size="md"
                className="focus:ring-white/50 hover:bg-white/10 rounded-lg transition-colors duration-200"
              />
            </div>
          </div>

          {/* Enhanced Mobile menu button and theme toggle */}
          <div className="md:hidden flex items-center space-x-3">
            <ThemeToggle
              variant="navigation"
              size="sm"
              className="focus:ring-white/50 hover:bg-white/10 rounded-lg transition-colors duration-200"
            />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="group inline-flex items-center justify-center p-2.5 rounded-xl text-primary-100 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/50 transition-all duration-300 ease-out relative overflow-hidden"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label={
                isMobileMenuOpen ? "Close main menu" : "Open main menu"
              }
            >
              {/* Button background effect */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />

              <div className="relative z-10">
                {isMobileMenuOpen ? (
                  <XMarkIcon
                    className="block h-6 w-6 transform transition-transform duration-300 rotate-90"
                    aria-hidden="true"
                  />
                ) : (
                  <Bars3Icon
                    className="block h-6 w-6 transform transition-transform duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile Navigation Menu with Slide-out Drawer */}
      <div
        className={`mobile-menu md:hidden transition-all duration-300 ease-out overflow-hidden ${
          isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pt-4 pb-6 space-y-2 bg-gradient-to-b from-primary-700/95 to-primary-800/95 backdrop-blur-md border-t border-white/10 shadow-xl">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobileMenu}
              style={{
                animationDelay: `${index * 50}ms`,
                animation: isMobileMenuOpen
                  ? "slideInFromRight 0.3s ease-out forwards"
                  : "none",
              }}
            >
              {({ isActive }) => (
                <div
                  className={`group flex items-center space-x-4 px-4 py-4 rounded-xl text-base font-medium 
                   transition-all duration-300 ease-out touch-target relative overflow-hidden
                   transform hover:scale-[1.02] active:scale-[0.98]
                   ${
                     isActive
                       ? "bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/10"
                       : "text-primary-100 hover:bg-white/10 hover:text-white hover:shadow-md"
                   }`}
                >
                  {/* Background gradient effect */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 transform transition-transform duration-300 ${
                      isActive ? "scale-100" : "scale-0 group-hover:scale-100"
                    }`}
                  />

                  <div className="relative z-10 flex items-center space-x-4 w-full">
                    <div
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-white/20 shadow-sm"
                          : "bg-white/10 group-hover:bg-white/20"
                      }`}
                    >
                      <HeroIcon
                        icon={item.icon}
                        size="md"
                        className={`transition-transform duration-200 ${
                          isActive ? "scale-110" : "group-hover:scale-105"
                        }`}
                      />
                    </div>
                    <span className="flex-1">{item.label}</span>

                    {/* Active indicator dot */}
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full shadow-sm animate-pulse" />
                    )}
                  </div>

                  {/* Ripple effect on tap */}
                  <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-active:opacity-100 transition-opacity duration-150" />
                </div>
              )}
            </NavLink>
          ))}

          {/* Mobile menu footer with theme toggle */}
          <div className="pt-4 mt-4 border-t border-white/10">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-primary-200 font-medium">
                Theme
              </span>
              <ThemeToggle
                variant="navigation"
                size="md"
                className="focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
