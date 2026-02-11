// src/admin/AdminSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function AdminSidebar({ onLogout }) {
  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "12px 14px",
    color: isActive ? "#000" : "#FFD700",
    background: isActive ? "#FFD700" : "transparent",
    borderRadius: "8px",
    marginBottom: "8px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "14px",
    letterSpacing: "0.5px",
    transition: "0.3s",
    boxShadow: isActive ? "0 0 10px rgba(255,215,0,0.4)" : "none",
  });

  return (
    <div className="
      tw-w-full sm:tw-w-56 lg:tw-w-64
      tw-h-full
      tw-p-4 sm:tw-p-6
      tw-bg-gray-900
      tw-text-yellow-500
      tw-border-r tw-border-yellow-500/20
      tw-overflow-y-auto
    ">
      {/* <h3 className="
        tw-mb-6 sm:tw-mb-8
        tw-text-yellow-500 tw-font-bold
        tw-text-lg sm:tw-text-xl lg:tw-text-2xl
        tw-text-center
      ">
        Admin Panel
      </h3> */}

      <nav className="tw-mb-8">
        <NavLink to="/admin" end style={linkStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/users" style={linkStyle}>
          Users
        </NavLink>
        <NavLink to="/admin/products" style={linkStyle}>
          Products
        </NavLink>
        <NavLink to="/admin/market-prices" style={linkStyle}>
          Market Prices
        </NavLink>
        <NavLink to="/admin/orders" style={linkStyle}>
          Orders
        </NavLink>
        <NavLink to="/admin/services" style={linkStyle}>
          Services
        </NavLink>
        <NavLink to="/admin/cif-rates" style={linkStyle}>
          CIF Rates
        </NavLink>
        <NavLink to="/admin/exchange-rates" style={linkStyle}>
          Exchange Rates
        </NavLink>
        <NavLink to="/admin/history" style={linkStyle}>
          History
        </NavLink>


      </nav>

      <button
        onClick={onLogout}
        className="
          tw-w-full
          tw-bg-gradient-to-r tw-from-red-600 tw-to-red-700
          tw-text-white
          tw-border-none
          tw-px-4 tw-py-3
          tw-rounded-lg
          tw-cursor-pointer
          tw-font-semibold
          tw-text-sm sm:tw-text-base
          tw-shadow-lg tw-shadow-red-500/30
          hover:tw-opacity-90
          tw-transition-opacity
        "
      >
        Logout
      </button>
    </div>
  );
}