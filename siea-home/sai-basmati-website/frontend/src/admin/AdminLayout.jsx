// src/admin/AdminLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const admin = document.getElementById("admin-scroll-container");

      if (e.detail === true) {
        // lock everything
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";

        if (admin) {
          admin.style.overflowY = "hidden";
          admin.style.height = "100vh";
        }
      } else {
        // unlock
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";

        if (admin) {
          admin.style.overflowY = "";
          admin.style.height = "";
        }
      }
    };

    window.addEventListener("admin-modal", handler);

    return () => {
      window.removeEventListener("admin-modal", handler);

      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";

      const admin = document.getElementById("admin-scroll-container");
      if (admin) {
        admin.style.overflowY = "";
        admin.style.height = "";
      }
    };
  }, []);


  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("profile");
    localStorage.removeItem("user");
    sessionStorage.clear();
    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <div className="tw-flex tw-min-h-screen tw-bg-black">
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="tw-fixed tw-top-4 tw-right-4 tw-z-50 tw-p-2 tw-bg-gray-900 tw-text-yellow-500 tw-rounded-lg lg:tw-hidden tw-border tw-border-yellow-500/30"
        style={{ zIndex: 1000 }}
      >
        <svg className="tw-w-6 tw-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar with responsive classes */}
      <div className={`
        ${sidebarOpen ? 'tw-translate-x-0' : '-tw-translate-x-full'}
        lg:tw-translate-x-0 lg:tw-relative lg:tw-z-0
        tw-fixed tw-inset-y-0 tw-left-0 tw-z-40
        tw-transition-transform tw-duration-300 tw-ease-in-out
      `}>
        <AdminSidebar onLogout={handleLogout} />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="tw-fixed tw-inset-0 tw-bg-black/50 tw-z-30 lg:tw-hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="tw-flex-1 tw-w-full">
        <div
          id="admin-scroll-container"
          className="
            tw-p-4 sm:tw-p-6 md:tw-p-8 lg:tw-p-6 xl:tw-p-8
            tw-bg-gradient-to-b tw-from-black tw-to-gray-900
            tw-h-screen
            tw-text-white
            tw-overflow-y-auto
            tw-overflow-x-hidden
          "
        >
          <div className="tw-mb-4 sm:tw-mb-6 md:tw-mb-8">
            <h2
              className="
                tw-text-yellow-500 tw-font-bold
                tw-text-xl sm:tw-text-2xl md:tw-text-3xl lg:tw-text-2xl xl:tw-text-3xl
                tw-tracking-wide
              "
            >
              Admin Panel
            </h2>
            <div className="tw-text-gray-300 tw-text-sm sm:tw-text-base">
              Manage users, products and orders
            </div>
          </div>

          <div
            className="
              tw-bg-gray-900/50
              tw-p-4 sm:tw-p-6 md:tw-p-8
              tw-rounded-lg sm:tw-rounded-xl
              tw-border tw-border-yellow-500/20
              tw-shadow-lg
              tw-overflow-x-auto
            "
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div >
  );
}