import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarIcon } from '@heroicons/react/24/outline';

Modal.setAppElement('#root');

const CompanyLeaders = () => {
  const [buyData, setBuyData] = useState([]);
  const [companyDetails, setCompanyDetails] = useState([]);
  const [brandDetails, setBrandDetails] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [addCompanyModalIsOpen, setAddCompanyModalIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [companyFormData, setCompanyFormData] = useState({
    companyName: '',
    brandName: '',
    totalPaid: '',
    due: '',
    discountAmount: '',
  });
  const [brandFilterDates, setBrandFilterDates] = useState({
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    const unsubscribeBuy = onSnapshot(collection(db, 'purchasedTyres'), (snapshot) => {
      const buyList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date || Date.now()) 
      }));
      setBuyData(buyList);
    });

    const unsubscribeCompanyDetails = onSnapshot(collection(db, 'companyDetails'), (snapshot) => {
      const detailsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompanyDetails(detailsList);
    });

    const unsubscribeBrandDetails = onSnapshot(collection(db, 'brandDetails'), (snapshot) => {
      const brandList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBrandDetails(brandList);
    });

    return () => {
      unsubscribeBuy();
      unsubscribeCompanyDetails();
      unsubscribeBrandDetails();
    };
  }, []);

  const companySummary = useMemo(() => {
    const companyMap = {};

    buyData.forEach(item => {
      if (!companyMap[item.company]) {
        companyMap[item.company] = { totalItems: 0, totalCost: 0, brands: {} };
      }
      const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
      companyMap[item.company].totalItems += item.quantity;
      companyMap[item.company].totalCost += item.price * item.quantity;
      if (!companyMap[item.company].brands[item.brand]) {
        companyMap[item.company].brands[item.brand] = { totalItems: 0, totalCost: 0, sizes: new Set(), dates: new Set() };
      }
      companyMap[item.company].brands[item.brand].totalItems += item.quantity;
      companyMap[item.company].brands[item.brand].totalCost += item.price * item.quantity;
      if (item.size) companyMap[item.company].brands[item.brand].sizes.add(item.size);
      if (item.date) companyMap[item.company].brands[item.brand].dates.add(item.date.toISOString().split('T')[0]);
    });

    return Object.keys(companyMap).map(company => {
      const details = companyDetails.find(detail => detail.companyName === company) || {};
      const totalCost = companyMap[company].totalCost;
      const totalPaid = parseFloat(details.totalPaid) || 0;
      const discountAmount = parseFloat(details.discountAmount) || 0;
      const due = (totalCost - totalPaid - discountAmount).toFixed(2);
      return {
        company,
        totalItems: companyMap[company].totalItems,
        totalCost,
        totalPaid,
        due: parseFloat(due) >= 0 ? parseFloat(due) : 0, // Ensure due is non-negative
        discountAmount,
        brands: companyMap[company].brands,
      };
    });
  }, [buyData, companyDetails]);

  const filteredCompanies = companySummary.filter(item =>
    item.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBrandSummary = (companyName) => {
    const company = companySummary.find(item => item.company === companyName);
    if (!company) return [];
    const brandSummary = Object.keys(company.brands)
      .map(brand => {
        const details = brandDetails.find(detail => detail.companyName === companyName && detail.brand === brand) || {};
        const brandDates = Array.from(company.brands[brand].dates);
        const startDate = brandFilterDates.startDate;
        const endDate = brandFilterDates.endDate;
        let filteredItems = company.brands[brand].totalItems;
        let filteredCost = company.brands[brand].totalCost;
        let filteredSizes = Array.from(company.brands[brand].sizes);
        let filteredPurchaseDates = brandDates;

        if (startDate && endDate) {
          filteredItems = 0;
          filteredCost = 0;
          filteredSizes = new Set();
          filteredPurchaseDates = [];
          buyData
            .filter(item => item.company === companyName && item.brand === brand)
            .forEach(item => {
              const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
              if (itemDate >= startDate && itemDate <= endDate) {
                filteredItems += item.quantity;
                filteredCost += item.price * item.quantity;
                if (item.size) filteredSizes.add(item.size);
                filteredPurchaseDates.push(item.date.toISOString().split('T')[0]);
              }
            });
          filteredSizes = Array.from(filteredSizes);
        }

        return {
          brand,
          totalItems: filteredItems,
          totalCost: filteredCost,
          totalPaid: parseFloat(details.totalPaid) || 0,
          due: parseFloat(details.due) || 0,
          totalReturn: parseFloat(details.totalReturn) || 0,
          sizes: filteredSizes.join(', ') || 'N/A',
          date: filteredPurchaseDates.sort().join(', ') || 'N/A',
        };
      })
      .filter(brand => brand.brand.toLowerCase().includes(brandSearchQuery.toLowerCase()));

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    return brandSummary.slice(indexOfFirstRow, indexOfLastRow);
  };

  const totalBrandPages = (companyName) => {
    const company = companySummary.find(item => item.company === companyName);
    if (!company) return 1;
    const filteredBrands = Object.keys(company.brands).filter(brand =>
      brand.toLowerCase().includes(brandSearchQuery.toLowerCase())
    );
    return Math.ceil(filteredBrands.length / rowsPerPage);
  };

  const getBrandsForCompany = (companyName) => {
    const company = companySummary.find(item => item.company === companyName);
    return company ? Object.keys(company.brands) : [];
  };

  const openModal = (company) => {
    setSelectedCompany(company);
    setBrandSearchQuery('');
    setCurrentPage(1);
    setBrandFilterDates({ startDate: null, endDate: null });
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setSelectedCompany(null);
    setModalIsOpen(false);
  };

  const openAddCompanyModal = () => {
    setAddCompanyModalIsOpen(true);
  };

  const closeAddCompanyModal = () => {
    setAddCompanyModalIsOpen(false);
    setCompanyFormData({ companyName: '', brandName: '', totalPaid: '', due: '', discountAmount: '' });
  };

  const handleCompanyFormChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...companyFormData, [name]: value };

    if (name === 'companyName') {
      updatedFormData.brandName = '';
    }

    if (name === 'totalPaid' || name === 'discountAmount') {
      const companyData = companySummary.find(item => item.company === updatedFormData.companyName);
      const totalCost = companyData && updatedFormData.brandName
        ? companyData.brands[updatedFormData.brandName]?.totalCost || 0
        : companyData?.totalCost || 0;
      const totalPaid = name === 'totalPaid' ? parseFloat(value) || 0 : parseFloat(updatedFormData.totalPaid) || 0;
      const discountAmount = name === 'discountAmount' ? parseFloat(value) || 0 : parseFloat(updatedFormData.discountAmount) || 0;
      updatedFormData.due = (totalCost - totalPaid - discountAmount).toFixed(2);
    }

    setCompanyFormData(updatedFormData);
  };

  const handleAddCompanyDetails = async (e) => {
    e.preventDefault();
    const { companyName, brandName, totalPaid, due, discountAmount } = companyFormData;

    if (!companyName || !totalPaid) {
      toast.error('Please fill all required fields (Company Name, Total Paid)');
      return;
    }

    const companyExists = companyDetails.find(detail => detail.companyName === companyName);
    const companyData = companySummary.find(item => item.company === companyName);

    if (!companyData) {
      toast.error('Company not found in purchase data');
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0]; // Today's date: 2025-05-22

    try {
      if (companyExists) {
        const companyDoc = doc(db, 'companyDetails', companyExists.id);
        await updateDoc(companyDoc, {
          companyName,
          totalPaid: parseFloat(totalPaid),
          due: parseFloat(due),
          discountAmount: parseFloat(discountAmount) || 0,
          date: todayDate,
          totalItems: companyData.totalItems,
          totalCost: companyData.totalCost,
        });
        toast.success('Company details updated successfully');
      } else {
        await addDoc(collection(db, 'companyDetails'), {
          companyName,
          totalPaid: parseFloat(totalPaid),
          due: parseFloat(due),
          discountAmount: parseFloat(discountAmount) || 0,
          date: todayDate,
          totalItems: companyData.totalItems,
          totalCost: companyData.totalCost,
        });
        toast.success('Company details added successfully');
      }

      if (brandName) {
        const brandExists = brandDetails.find(detail => detail.companyName === companyName && detail.brand === brandName);
        const brandData = companyData.brands[brandName];

        if (!brandData) {
          toast.error('Brand not found in purchase data for this company');
          return;
        }

        if (brandExists) {
          const brandDoc = doc(db, 'brandDetails', brandExists.id);
          await updateDoc(brandDoc, {
            companyName,
            brand: brandName,
            totalPaid: parseFloat(totalPaid),
            due: parseFloat(due),
            totalReturn: 0,
            date: todayDate,
            totalItems: brandData.totalItems,
            totalCost: brandData.totalCost,
          });
          toast.success('Brand details updated successfully');
        } else {
          await addDoc(collection(db, 'brandDetails'), {
            companyName,
            brand: brandName,
            totalPaid: parseFloat(totalPaid),
            due: parseFloat(due),
            totalReturn: 0,
            date: todayDate,
            totalItems: brandData.totalItems,
            totalCost: brandData.totalCost,
          });
          toast.success('Brand details added successfully');
        }
      }

      closeAddCompanyModal();
    } catch (error) {
      toast.error('Error saving details');
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
      <h1 className="text-4xl font-extrabold mb-8 text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Company Leaders Dashboard
      </h1>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-8">
        <input
          type="text"
          placeholder="Search by company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-1/3 px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700 transition duration-200"
        />
        <button
          onClick={openAddCompanyModal}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition duration-300"
        >
          Add Company Details
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-gray-100 p-6 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 cursor-pointer transform hover:-translate-y-1"
            onClick={() => openModal(item)}
          >
            <h2 className="text-xl font-semibold text-gray-800">{item.company}</h2>
            <p className="text-sm text-gray-500 mt-2">Total Items: {item.totalItems}</p>
            <p className="text-sm text-gray-500">Total Cost: Rs. {item.totalCost.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl mx-auto mt-16 max-h-[70vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center backdrop-blur-sm"
      >
        {selectedCompany && (
          <div className="relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 transition duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-3xl font-bold mb-6 text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {selectedCompany.company} Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <p className="text-sm font-medium text-gray-600">Company Name</p>
                <p className="text-lg font-semibold text-gray-800">{selectedCompany.company}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-lg font-semibold text-gray-800">{selectedCompany.totalItems}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-lg font-semibold text-gray-800">Rs. {selectedCompany.totalCost.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-lg font-semibold text-gray-800">Rs. {selectedCompany.totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <p className="text-sm font-medium text-gray-600">Total Due</p>
                <p className="text-lg font-semibold text-gray-800">Rs. {selectedCompany.due.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                <p className="text-sm font-medium text-gray-600">Total Discount</p>
                <p className="text-lg font-semibold text-gray-800">Rs. {selectedCompany.discountAmount.toLocaleString()}</p>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Brand Details</h3>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <input
                type="text"
                placeholder="Search by brand..."
                value={brandSearchQuery}
                onChange={(e) => {
                  setBrandSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-1/3 px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
              />
              <div className="flex gap-3">
                <div className="relative">
                  <DatePicker
                    selected={brandFilterDates.startDate}
                    onChange={(date) => setBrandFilterDates(prev => ({ ...prev, startDate: date }))}
                    selectsStart
                    startDate={brandFilterDates.startDate}
                    endDate={brandFilterDates.endDate}
                    placeholderText="Start Date"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                    dateFormat="dd/MM/yyyy"
                    isClearable
                  />
                  <CalendarIcon className="w-5 h-5 text-gray-500 absolute right-3 top-1/2 transform -translate-y-1/2" />
                </div>
                <div className="relative">
                  <DatePicker
                    selected={brandFilterDates.endDate}
                    onChange={(date) => setBrandFilterDates(prev => ({ ...prev, endDate: date }))}
                    selectsEnd
                    startDate={brandFilterDates.startDate}
                    endDate={brandFilterDates.endDate}
                    minDate={brandFilterDates.startDate}
                    placeholderText="End Date"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                    dateFormat="dd/MM/yyyy"
                    isClearable
                  />
                  <CalendarIcon className="w-5 h-5 text-gray-500 absolute right-3 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm text-left bg-white rounded-xl shadow-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <th className="py-3 px-6 font-semibold border-1 border-black ">Brand</th>
                    <th className="py-3 px-6 font-semibold border-1 border-black ">Sizes</th>
                    <th className="py-3 px-6 font-semibold border-1 border-black ">Total Items</th>
                    <th className="py-3 px-6 font-semibold border-1 border-black ">Total Cost</th>
                    <th className="py-3 px-6 font-semibold border-1 border-black ">Total Paid</th>
                    <th className="py-3 px-6 font-semibold border-1 border-black ">Due</th>
                    <th className="py-3 px-6 font-semibold border-1 border-black ">Purchase Date</th>
                  </tr>
                </thead>
                <tbody>
                  {getBrandSummary(selectedCompany.company).map((brand, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition duration-200">
                      <td className="py-3 px-6 border-1 ">{brand.brand}</td>
                      <td className="py-3 px-6 border-1 ">{brand.sizes}</td>
                      <td className="py-3 px-6 border-1 ">{brand.totalItems}</td>
                      <td className="py-3 px-6 border-1 ">Rs. {brand.totalCost.toLocaleString()}</td>
                      <td className="py-3 px-6 border-1 ">Rs. {brand.totalPaid.toLocaleString()}</td>
                      <td className="py-3 px-6 border-1 ">Rs. {brand.due.toLocaleString()}</td>
                      <td className="py-3 px-6 border-1 ">{brand.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalBrandPages(selectedCompany.company) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-xl ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition duration-200`}
                >
                  {page}
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={addCompanyModalIsOpen}
        onRequestClose={closeAddCompanyModal}
        className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl mx-auto mt-16 max-h-[70vh] overflow-y-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Add Company Details
        </h2>
        <form onSubmit={handleAddCompanyDetails} className="flex flex-wrap gap-4">
          <div className="w-full md:w-[48%]">
            <label className="block text-sm font-medium mb-1 text-gray-700">Company Name</label>
            <input
              type="text"
              name="companyName"
              value={companyFormData.companyName}
              onChange={handleCompanyFormChange}
              list="companyNames"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <datalist id="companyNames">
              {companySummary.map((item, index) => (
                <option key={index} value={item.company} />
              ))}
            </datalist>
          </div>
          <div className="w-full md:w-[48%]">
            <label className="block text-sm font-medium mb-1 text-gray-700">Brand Name</label>
            <input
              type="text"
              name="brandName"
              value={companyFormData.brandName}
              onChange={handleCompanyFormChange}
              list="brandNames"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <datalist id="brandNames">
              {getBrandsForCompany(companyFormData.companyName).map((brand, index) => (
                <option key={index} value={brand} />
              ))}
            </datalist>
          </div>
          {companyFormData.brandName && (
            <>
              <div className="w-full md:w-[48%]">
                <label className="block text-sm font-medium mb-1 text-gray-700">Brand Total Items</label>
                <input
                  type="number"
                  value={
                    companyFormData.brandName && companySummary.find(item => item.company === companyFormData.companyName)?.brands[companyFormData.brandName]?.totalItems || 0
                  }
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-xl"
                  readOnly
                />
              </div>
              <div className="w-full md:w-[48%]">
                <label className="block text-sm font-medium mb-1 text-gray-700">Brand Total Cost</label>
                <input
                  type="number"
                  value={
                    companyFormData.brandName && companySummary.find(item => item.company === companyFormData.companyName)?.brands[companyFormData.brandName]?.totalCost || 0
                  }
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-xl"
                  readOnly
                />
              </div>
            </>
          )}
          <div className="w-full md:w-[48%]">
            <label className="block text-sm font-medium mb-1 text-gray-700">Total Paid</label>
            <input
              type="number"
              name="totalPaid"
              value={companyFormData.totalPaid}
              onChange={handleCompanyFormChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="w-full md:w-[48%]">
            <label className="block text-sm font-medium mb-1 text-gray-700">Due</label>
            <input
              type="number"
              name="due"
              value={companyFormData.due}
              className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-xl"
              readOnly
            />
          </div>
          <div className="w-full md:w-[48%]">
            <label className="block text-sm font-medium mb-1 text-gray-700">Discount Amount</label>
            <input
              type="number"
              name="discountAmount"
              value={companyFormData.discountAmount}
              onChange={handleCompanyFormChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={closeAddCompanyModal}
              className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition duration-200"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default CompanyLeaders;