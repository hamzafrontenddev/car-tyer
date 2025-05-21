import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const CompanyLeaders = () => {
  const [buyData, setBuyData] = useState([]);
  const [companyDetails, setCompanyDetails] = useState([]);
  const [brandDetails, setBrandDetails] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [addCompanyModalIsOpen, setAddCompanyModalIsOpen] = useState(false);
  const [addBrandModalIsOpen, setAddBrandModalIsOpen] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    companyName: '',
    totalPaid: '',
    due: '',
    discountAmount: ''
  });
  const [brandFormData, setBrandFormData] = useState({
    brand: '',
    totalPaid: '',
    due: '',
    totalReturn: ''
  });

  useEffect(() => {
    const unsubscribeBuy = onSnapshot(collection(db, 'purchasedTyres'), (snapshot) => {
      const buyList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
      companyMap[item.company].totalItems += item.quantity;
      companyMap[item.company].totalCost += item.price * item.quantity;
      if (!companyMap[item.company].brands[item.brand]) {
        companyMap[item.company].brands[item.brand] = { totalItems: 0, totalCost: 0 };
      }
      companyMap[item.company].brands[item.brand].totalItems += item.quantity;
      companyMap[item.company].brands[item.brand].totalCost += item.price * item.quantity;
    });

    return Object.keys(companyMap).map(company => {
      const details = companyDetails.find(detail => detail.companyName === company) || {};
      return {
        company,
        totalItems: companyMap[company].totalItems,
        totalCost: companyMap[company].totalCost,
        totalPaid: details.totalPaid || 0,
        due: details.due || 0,
        discountAmount: details.discountAmount || 0,
        brands: companyMap[company].brands
      };
    });
  }, [buyData, companyDetails]);

  const filteredCompanies = companySummary.filter(item =>
    item.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBrandSummary = (companyName) => {
    const company = companySummary.find(item => item.company === companyName);
    if (!company) return [];
    return Object.keys(company.brands).map(brand => {
      const details = brandDetails.find(detail => detail.companyName === companyName && detail.brand === brand) || {};
      return {
        brand,
        totalItems: company.brands[brand].totalItems,
        totalCost: company.brands[brand].totalCost,
        totalPaid: details.totalPaid || 0,
        due: details.due || 0,
        totalReturn: details.totalReturn || 0
      };
    });
  };

  const openModal = (company) => {
    setSelectedCompany(company);
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
    setCompanyFormData({ companyName: '', totalPaid: '', due: '', discountAmount: '' });
  };

  const openAddBrandModal = () => {
    setAddBrandModalIsOpen(true);
  };

  const closeAddBrandModal = () => {
    setAddBrandModalIsOpen(false);
    setBrandFormData({ brand: '', totalPaid: '', due: '', totalReturn: '' });
  };

  const handleCompanyFormChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...companyFormData, [name]: value };

    // Recalculate due when totalPaid or discountAmount changes
    if (name === 'totalPaid' || name === 'discountAmount') {
      const companyData = companySummary.find(item => item.company === updatedFormData.companyName);
      const totalCost = companyData ? companyData.totalCost : 0;
      const totalPaid = name === 'totalPaid' ? parseFloat(value) || 0 : parseFloat(updatedFormData.totalPaid) || 0;
      const discountAmount = name === 'discountAmount' ? parseFloat(value) || 0 : parseFloat(updatedFormData.discountAmount) || 0;
      updatedFormData.due = (totalCost - totalPaid - discountAmount).toFixed(2);
    }

    setCompanyFormData(updatedFormData);
  };

  const handleBrandFormChange = (e) => {
    const { name, value } = e.target;
    setBrandFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCompanyDetails = async (e) => {
    e.preventDefault();
    const { companyName, totalPaid, due, discountAmount } = companyFormData;

    if (!companyName || !totalPaid || !discountAmount) {
      toast.error('Please fill all fields except Due (calculated automatically)');
      return;
    }

    const companyExists = companyDetails.find(detail => detail.companyName === companyName);
    const companyData = companySummary.find(item => item.company === companyName);

    if (!companyData) {
      toast.error('Company not found in purchase data');
      return;
    }

    try {
      if (companyExists) {
        const companyDoc = doc(db, 'companyDetails', companyExists.id);
        await updateDoc(companyDoc, {
          companyName,
          totalPaid: parseFloat(totalPaid),
          due: parseFloat(due),
          discountAmount: parseFloat(discountAmount),
          totalItems: companyData.totalItems,
          totalCost: companyData.totalCost
        });
        toast.success('Company details updated successfully');
      } else {
        await addDoc(collection(db, 'companyDetails'), {
          companyName,
          totalPaid: parseFloat(totalPaid),
          due: parseFloat(due),
          discountAmount: parseFloat(discountAmount),
          totalItems: companyData.totalItems,
          totalCost: companyData.totalCost
        });
        toast.success('Company details added successfully');
      }
      closeAddCompanyModal();
    } catch (error) {
      toast.error('Error saving company details');
      console.error(error);
    }
  };

  const handleAddBrandDetails = async (e) => {
    e.preventDefault();
    const { brand, totalPaid, due, totalReturn } = brandFormData;

    if (!brand || !totalPaid || !due || !totalReturn) {
      toast.error('Please fill all fields');
      return;
    }

    const brandExists = brandDetails.find(detail => detail.companyName === selectedCompany.company && detail.brand === brand);
    const brandData = selectedCompany.brands[brand];

    if (!brandData) {
      toast.error('Brand not found in purchase data for this company');
      return;
    }

    try {
      if (brandExists) {
        const brandDoc = doc(db, 'brandDetails', brandExists.id);
        await updateDoc(brandDoc, {
          companyName: selectedCompany.company,
          brand,
          totalPaid: parseFloat(totalPaid),
          due: parseFloat(due),
          totalReturn: parseFloat(totalReturn),
          totalItems: brandData.totalItems,
          totalCost: brandData.totalCost
        });
        toast.success('Brand details updated successfully');
      } else {
        await addDoc(collection(db, 'brandDetails'), {
          companyName: selectedCompany.company,
          brand,
          totalPaid: parseFloat(totalPaid),
          due: parseFloat(due),
          totalReturn: parseFloat(totalReturn),
          totalItems: brandData.totalItems,
          totalCost: brandData.totalCost
        });
        toast.success('Brand details added successfully');
      }
      closeAddBrandModal();
    } catch (error) {
      toast.error('Error saving brand details');
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Company Leaders</h1>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={openAddCompanyModal}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition duration-200"
        >
          Add Company Details
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 p-6 rounded-xl shadow hover:shadow-xl transition duration-300 cursor-pointer"
            onClick={() => openModal(item)}
          >
            <h2 className="text-xl font-semibold text-gray-800">{item.company}</h2>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        className="bg-white p-6 rounded-xl shadow-xl w-full max-w-3xl mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        {selectedCompany && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{selectedCompany.company} Details</h2>
            <div className="space-y-2 text-gray-700 mb-6">
              <p><strong>Company Name:</strong> {selectedCompany.company}</p>
              <p><strong>Total Items:</strong> {selectedCompany.totalItems}</p>
              <p><strong>Total Cost:</strong> Rs. {selectedCompany.totalCost.toFixed(2)}</p>
              <p><strong>Total Paid:</strong> Rs. {selectedCompany.totalPaid.toFixed(2)}</p>
              <p><strong>Due:</strong> Rs. {selectedCompany.due.toFixed(2)}</p>
              <p><strong>Discount Amount:</strong> Rs. {selectedCompany.discountAmount.toFixed(2)}</p>
            </div>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Brand Details</h3>
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full border-collapse text-sm text-left">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 font-semibold">Brand</th>
                    <th className="py-2 px-4 font-semibold">Total Items</th>
                    <th className="py-2 px-4 font-semibold">Total Cost</th>
                    <th className="py-2 px-4 font-semibold">Total Paid</th>
                    <th className="py-2 px-4 font-semibold">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {getBrandSummary(selectedCompany.company).map((brand, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-4">{brand.brand}</td>
                      <td className="py-2 px-4">{brand.totalItems}</td>
                      <td className="py-2 px-4">Rs. {brand.totalCost.toFixed(2)}</td>
                      <td className="py-2 px-4">Rs. {brand.totalPaid.toFixed(2)}</td>
                      <td className="py-2 px-4">Rs. {brand.due.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={closeModal}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Close
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={addCompanyModalIsOpen}
        onRequestClose={closeAddCompanyModal}
        className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Add Company Details</h2>
        <form onSubmit={handleAddCompanyDetails} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              name="companyName"
              value={companyFormData.companyName}
              onChange={handleCompanyFormChange}
              list="companyNames"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
            <datalist id="companyNames">
              {companySummary.map((item, index) => (
                <option key={index} value={item.company} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Items</label>
            <input
              type="number"
              value={companySummary.find(item => item.company === companyFormData.companyName)?.totalItems || 0}
              className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Cost</label>
            <input
              type="number"
              value={companySummary.find(item => item.company === companyFormData.companyName)?.totalCost || 0}
              className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Paid</label>
            <input
              type="number"
              name="totalPaid"
              value={companyFormData.totalPaid}
              onChange={handleCompanyFormChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due</label>
            <input
              type="number"
              name="due"
              value={companyFormData.due}
              className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Discount Amount</label>
            <input
              type="number"
              name="discountAmount"
              value={companyFormData.discountAmount}
              onChange={handleCompanyFormChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAddCompanyModal}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={addBrandModalIsOpen}
        onRequestClose={closeAddBrandModal}
        className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Add Brand Details</h2>
        <form onSubmit={handleAddBrandDetails} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Brand Name</label>
            <input
              type="text"
              name="brand"
              value={brandFormData.brand}
              onChange={handleBrandFormChange}
              list="brandNames"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
            <datalist id="brandNames">
              {selectedCompany && Object.keys(selectedCompany.brands).map((brand, index) => (
                <option key={index} value={brand} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Items</label>
            <input
              type="number"
              value={selectedCompany?.brands[brandFormData.brand]?.totalItems || 0}
              className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Cost</label>
            <input
              type="number"
              value={selectedCompany?.brands[brandFormData.brand]?.totalCost || 0}
              className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Paid</label>
            <input
              type="number"
              name="totalPaid"
              value={brandFormData.totalPaid}
              onChange={handleBrandFormChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due</label>
            <input
              type="number"
              name="due"
              value={brandFormData.due}
              onChange={handleBrandFormChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Return</label>
            <input
              type="number"
              name="totalReturn"
              value={brandFormData.totalReturn}
              onChange={handleBrandFormChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAddBrandModal}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      <ToastContainer />
    </div>
  );
};

export default CompanyLeaders;