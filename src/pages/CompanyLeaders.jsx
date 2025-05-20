import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const CompanyLeaders = () => {
  const [companies, setCompanies] = useState([]);
  const [buyData, setBuyData] = useState([]);
  const [companyDetails, setCompanyDetails] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [addModalIsOpen, setAddModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    totalPaid: '',
    due: ''
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

    return () => {
      unsubscribeBuy();
      unsubscribeCompanyDetails();
    };
  }, []);

  const companySummary = useMemo(() => {
    const companyMap = {};

    buyData.forEach(item => {
      if (!companyMap[item.company]) {
        companyMap[item.company] = { totalItems: 0, totalCost: 0 };
      }
      companyMap[item.company].totalItems += item.quantity;
      companyMap[item.company].totalCost += item.price * item.quantity;
    });

    return Object.keys(companyMap).map(company => {
      const details = companyDetails.find(detail => detail.companyName === company) || {};
      return {
        company,
        totalItems: companyMap[company].totalItems,
        totalCost: companyMap[company].totalCost,
        totalPaid: details.totalPaid || 0,
        due: details.due || 0
      };
    });
  }, [buyData, companyDetails]);

  const filteredCompanies = companySummary.filter(item =>
    item.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (company) => {
    setSelectedCompany(company);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setSelectedCompany(null);
    setModalIsOpen(false);
  };

  const openAddModal = () => {
    setAddModalIsOpen(true);
  };

  const closeAddModal = () => {
    setAddModalIsOpen(false);
    setFormData({ companyName: '', totalPaid: '', due: '' });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddCompanyDetails = async (e) => {
    e.preventDefault();
    const { companyName, totalPaid, due } = formData;

    if (!companyName || !totalPaid || !due) {
      toast.error('Please fill all fields');
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
          totalItems: companyData.totalItems,
          totalCost: companyData.totalCost
        });
        toast.success('Company details updated successfully');
      } else {
        await addDoc(collection(db, 'companyDetails'), {
          companyName,
          totalPaid: parseFloat(totalPaid),
          due: parseFloat(due),
          totalItems: companyData.totalItems,
          totalCost: companyData.totalCost
        });
        toast.success('Company details added successfully');
      }
      closeAddModal();
    } catch (error) {
      toast.error('Error saving company details');
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
          onClick={openAddModal}
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
        className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      >
        {selectedCompany && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{selectedCompany.company} Details</h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Company Name:</strong> {selectedCompany.company}</p>
              <p><strong>Total Items:</strong> {selectedCompany.totalItems}</p>
              <p><strong>Total Cost:</strong> Rs. {selectedCompany.totalCost.toFixed(2)}</p>
              <p><strong>Total Paid:</strong> Rs. {selectedCompany.totalPaid.toFixed(2)}</p>
              <p><strong>Due:</strong> Rs. {selectedCompany.due.toFixed(2)}</p>
            </div>
            <button
              onClick={closeModal}
              className="mt-6 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Close
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={addModalIsOpen}
        onRequestClose={closeAddModal}
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
              value={formData.companyName}
              onChange={handleFormChange}
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
              value={companySummary.find(item => item.company === formData.companyName)?.totalItems || 0}
              className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Cost</label>
            <input
              type="number"
              value={companySummary.find(item => item.company === formData.companyName)?.totalCost || 0}
              className="w-full px-4 py-2 border border-gray-300 bg-gray-100 rounded-lg"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Paid</label>
            <input
              type="number"
              name="totalPaid"
              value={formData.totalPaid}
              onChange={handleFormChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due</label>
            <input
              type="number"
              name="due"
              value={formData.due}
              onChange={handleFormChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAddModal}
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