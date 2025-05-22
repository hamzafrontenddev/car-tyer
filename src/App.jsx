import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import BuyTyre from "./pages/BuyTyre";
import Inventory from "./pages/Inventory";
import Sell from "./pages/Sell";
import Additem from "./pages/Additem";
import Return from "./pages/Return";
import CompanyLeaders from "./pages/CompanyLeaders";
import ProfitLoss from "./pages/ProfitLoss";
import Transfer from "./pages/Transfer";
import PendingDues from "./pages/PendingDues";
import Login from "./components/Login";

// PrivateRoute component to protect routes
const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if this is a new session (new tab or browser reopen)
    const isNewSession = !sessionStorage.getItem("sessionActive");
    if (isNewSession) {
      // Clear auth state for new sessions
      localStorage.removeItem("isAuthenticated");
      sessionStorage.setItem("sessionActive", "true");
    }

    // Check localStorage for auth state
    const loggedIn = localStorage.getItem("isAuthenticated") === "true";
    setIsAuthenticated(loggedIn);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Navigation component
const Navigation = () => {
  const location = useLocation();
  // Hide nav bar on login page
  if (location.pathname === "/login") return null;

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    sessionStorage.removeItem("sessionActive");
    window.location.href = "/login";
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex gap-8">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/buy"
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Add Inventory
        </NavLink>
        <NavLink
          to="/item"
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Add Item
        </NavLink>
        <NavLink
          to="/sell"
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Sell Tyre
        </NavLink>
        <NavLink
          to="/return"
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Return
        </NavLink>
        <NavLink
          to="/companies"
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Companies
        </NavLink>
        <NavLink
          to="/profit-loss"
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Profit & Loss
        </NavLink>
        <NavLink
          to="/transfor-data"
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Transfor Data
        </NavLink>
        <NavLink
          to="/pending-dues"
          className={({ isActive }) =>
            `font-semibold transition duration-200 ${
              isActive ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-blue-500"
            }`
          }
        >
          Pending Dues
        </NavLink>
        <button
          onClick={handleLogout}
          className="font-semibold text-gray-600 hover:text-blue-500"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <Navigation />
        <div className="p-4">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Inventory />
                </PrivateRoute>
              }
            />
            <Route
              path="/buy"
              element={
                <PrivateRoute>
                  <BuyTyre />
                </PrivateRoute>
              }
            />
            <Route
              path="/item"
              element={
                <PrivateRoute>
                  <Additem />
                </PrivateRoute>
              }
            />
            <Route
              path="/sell"
              element={
                <PrivateRoute>
                  <Sell />
                </PrivateRoute>
              }
            />
            <Route
              path="/return"
              element={
                <PrivateRoute>
                  <Return />
                </PrivateRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <PrivateRoute>
                  <CompanyLeaders />
                </PrivateRoute>
              }
            />
            <Route
              path="/profit-loss"
              element={
                <PrivateRoute>
                  <ProfitLoss />
                </PrivateRoute>
              }
            />
            <Route
              path="/transfor-data"
              element={
                <PrivateRoute>
                  <Transfer />
                </PrivateRoute>
              }
            />
            <Route
              path="/pending-dues"
              element={
                <PrivateRoute>
                  <PendingDues />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
        <ToastContainer />
      </div>
    </Router>
  );
}

export default App;