import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

const CompanyLeaders = () => {
  const [companies, setCompanies] = useState([]);
  const [buyData, setBuyData] = useState([]);
  const [sellData, setSellData] = useState([]);
  const [returnData, setReturnData] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubscribeBuy = onSnapshot(collection(db, "purchasedTyres"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBuyData(data);
    });

    const unsubscribeSell = onSnapshot(collection(db, "soldTyres"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSellData(data);
    });

    const unsubscribeReturn = onSnapshot(collection(db, "returnedTyres"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReturnData(data);
    });

    return () => {
      unsubscribeBuy();
      unsubscribeSell();
      unsubscribeReturn();
    };
  }, []);

  const calculateFinancialSummary = useMemo(() => (companyName) => {
    const companyBuyData = buyData.filter((item) => item.company === companyName);
    const companySellData = sellData.filter((item) => item.company === companyName);
    const companyReturnData = returnData.filter((item) => item.company === companyName);

    const totalBuyCost = companyBuyData.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity, 10) || 0), 0);
    const totalSales = companySellData.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity, 10) || 0), 0);
    const totalReturnAmount = companyReturnData.reduce((sum, item) => sum + (parseFloat(item.returnPrice) * parseInt(item.returnQuantity, 10) || 0), 0);

    const adjustedSales = totalSales - totalReturnAmount;
    const profitLoss = adjustedSales - totalBuyCost;

    const tyreDetails = {};
    companyBuyData.forEach((item) => {
      const key = `${item.brand}_${item.model}_${item.size}`;
      if (!tyreDetails[key]) {
        tyreDetails[key] = {
          brand: item.brand,
          model: item.model || "N/A",
          size: item.size,
          boughtQty: 0,
          boughtPrice: 0,
          soldQty: 0,
          soldPrice: 0,
          returnedQty: 0,
          returnedPrice: 0,
        };
      }
      tyreDetails[key].boughtQty += parseInt(item.quantity, 10) || 0;
      tyreDetails[key].boughtPrice += parseFloat(item.price) * parseInt(item.quantity, 10) || 0;
    });

    companySellData.forEach((item) => {
      const key = `${item.brand}_${item.model}_${item.size}`;
      if (!tyreDetails[key]) {
        tyreDetails[key] = {
          brand: item.brand,
          model: item.model || "N/A",
          size: item.size,
          boughtQty: 0,
          boughtPrice: 0,
          soldQty: 0,
          soldPrice: 0,
          returnedQty: 0,
          returnedPrice: 0,
        };
      }
      tyreDetails[key].soldQty += parseInt(item.quantity, 10) || 0;
      tyreDetails[key].soldPrice += parseFloat(item.price) * parseInt(item.quantity, 10) || 0;
    });

    companyReturnData.forEach((item) => {
      const key = `${item.brand}_${item.model}_${item.size}`;
      if (!tyreDetails[key]) {
        tyreDetails[key] = {
          brand: item.brand,
          model: item.model || "N/A",
          size: item.size,
          boughtQty: 0,
          boughtPrice: 0,
          soldQty: 0,
          soldPrice: 0,
          returnedQty: 0,
          returnedPrice: 0,
        };
      }
      tyreDetails[key].returnedQty += parseInt(item.returnQuantity, 10) || 0;
      tyreDetails[key].returnedPrice += parseFloat(item.returnPrice) * parseInt(item.returnQuantity, 10) || 0;
    });

    const tyreDetailsArray = Object.values(tyreDetails).map((detail) => ({
      ...detail,
      availableStock: detail.boughtQty - detail.soldQty + detail.returnedQty,
      profitLoss: (detail.soldPrice - detail.returnedPrice) - detail.boughtPrice,
    }));

    return {
      totalBuyCost: totalBuyCost.toLocaleString(),
      totalSales: adjustedSales.toLocaleString(),
      totalReturns: totalReturnAmount.toLocaleString(),
      profitLoss: profitLoss.toLocaleString(),
      tyreDetails: tyreDetailsArray,
    };
  }, [buyData, sellData, returnData]);

  useEffect(() => {
    const allCompanies = new Set([
      ...buyData.map((item) => item.company),
      ...sellData.map((item) => item.company),
      ...returnData.map((item) => item.company),
    ].filter(Boolean));

    const companyList = Array.from(allCompanies).map((companyName) => ({
      name: companyName,
      financialSummary: calculateFinancialSummary(companyName),
    }));

    const filteredCompanies = companyList.filter((company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setCompanies(filteredCompanies);
  }, [buyData, sellData, returnData, calculateFinancialSummary, searchQuery]);

  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex justify-between">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="mr-2">🏢</span> Company Leaders
      </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by company name..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6 text-gray-700">Company List</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div
              key={company.name}
              onClick={() => handleCompanyClick(company)}
              className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-xl p-5 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-900 truncate">{company.name}</h4>
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  View Details
                </span>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                <p className="flex items-center">
                  <span className="mr-2">💰</span> Profit/Loss: Rs. {company.financialSummary.profitLoss}
                </p>
              </div>
            </div>
          ))}
          {companies.length === 0 && (
            <p className="text-center text-gray-500 col-span-full">No companies found.</p>
          )}
        </div>
      </div>

      {selectedCompany && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white shadow-2xl rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
              <span className="mr-2">🏢</span> Company Details: {selectedCompany.name}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg shadow">
                <p className="text-sm font-medium text-blue-700">Total Buy Cost</p>
                <p className="text-lg font-bold text-blue-900">Rs. {selectedCompany.financialSummary.totalBuyCost}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg shadow">
                <p className="text-sm font-medium text-green-700">Total Sales</p>
                <p className="text-lg font-bold text-green-900">Rs. {selectedCompany.financialSummary.totalSales}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg shadow">
                <p className="text-sm font-medium text-red-700">Total Returns</p>
                <p className="text-lg font-bold text-red-900">Rs. {selectedCompany.financialSummary.totalReturns}</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-lg shadow">
                <p className="text-sm font-medium text-teal-700">Profit/Loss</p>
                <p className="text-lg font-bold text-teal-900">Rs. {selectedCompany.financialSummary.profitLoss}</p>
              </div>
            </div>

            <h4 className="text-lg font-semibold mb-2 text-gray-700">Tyre Details</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm bg-white rounded-lg shadow">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-3 font-medium">Brand</th>
                    <th className="p-3 font-medium">Model</th>
                    <th className="p-3 font-medium">Size</th>
                    <th className="p-3 font-medium">Bought Qty</th>
                    <th className="p-3 font-medium">Bought Cost</th>
                    <th className="p-3 font-medium">Sold Qty</th>
                    <th className="p-3 font-medium">Sold Revenue</th>
                    <th className="p-3 font-medium">Returned Qty</th>
                    <th className="p-3 font-medium">Returned Cost</th>
                    <th className="p-3 font-medium">Available Stock</th>
                    <th className="p-3 font-medium">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedCompany.financialSummary.tyreDetails.map((tyre, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3">{tyre.brand}</td>
                      <td className="p-3">{tyre.model}</td>
                      <td className="p-3">{tyre.size}</td>
                      <td className="p-3">{tyre.boughtQty}</td>
                      <td className="p-3">Rs. {tyre.boughtPrice.toLocaleString()}</td>
                      <td className="p-3">{tyre.soldQty}</td>
                      <td className="p-3">Rs. {tyre.soldPrice.toLocaleString()}</td>
                      <td className="p-3">{tyre.returnedQty}</td>
                      <td className="p-3">Rs. {tyre.returnedPrice.toLocaleString()}</td>
                      <td className="p-3">{tyre.availableStock}</td>
                      <td className="p-3 font-semibold text-gray-800">Rs. {tyre.profitLoss.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setSelectedCompany(null)}
              className="mt-6 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyLeaders;