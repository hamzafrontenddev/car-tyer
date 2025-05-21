import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-800">
        {/* Navigation Bar */}
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
          </div>
        </nav>

        {/* Routes */}
        <div className="p-4">
          <Routes>
            <Route path="/" element={<Inventory />} />
            <Route path="/buy" element={<BuyTyre />} />
            <Route path="/item" element={<Additem />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/return" element={<Return />} />
            <Route path="/companies" element={<CompanyLeaders />} />
            <Route path="/profit-loss" element={<ProfitLoss />} />
            <Route path="/transfor-data" element={<Transfer />} />
            <Route path="/pending-dues" element={<PendingDues />} />
          </Routes>
        </div>

        <ToastContainer />
      </div>
    </Router>
  );
}

export default App;