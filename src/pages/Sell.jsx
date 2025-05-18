import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

// Add new imports for date picker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon } from "@heroicons/react/24/outline";

// Add helper function for date range filtering
const filterByDateRange = (data, start, end) => {
  if (!start || !end) return data;
  return data.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= start && itemDate <= end;
  });
};

const SellTyre = () => {
  const [form, setForm] = useState({
    company: "",
    brand: "",
    model: "",
    size: "",
    price: "",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
    discount: 0, // New discount field
  });

  const printRef = useRef();

  const [customerName, setCustomerName] = useState('');
  const [sellTyres, setSellTyres] = useState([]);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemTyres, setItemTyres] = useState([]);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [availableBrands, setAvailableBrands] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [viewTyre, setViewTyre] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Add state for date range
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const win = window.open("", "", "height=600,width=800");
      win.document.write("");
      win.document.write(printContents);
      win.document.write("");
      win.document.close();
      win.print();
    }
  };

  useEffect(() => {
    const unsubSell = onSnapshot(collection(db, "soldTyres"), (snapshot) => {
      let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Add date range filtering
      data = filterByDateRange(data, startDate, endDate);
      setSellTyres(data);
    });

    const fetchItemTyres = async () => {
      const snapshot = await getDocs(collection(db, "addItemTyres"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItemTyres(data);

      setAvailableCompanies([...new Set(data.map((t) => t.company?.toLowerCase()))]);
    };

    fetchItemTyres();
    return () => unsubSell();
  }, [startDate, endDate]); // Add dependencies for date range

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCompanyChange = (e) => {
    const company = e.target.value.trim();
    setForm({
      company,
      brand: "",
      model: "",
      size: "",
      price: "",
      quantity: "",
      date: new Date().toISOString().split("T")[0],
      discount: 0,
    });

    const brands = itemTyres
      .filter((t) => t.company?.toLowerCase() === company.toLowerCase())
      .map((t) => t.brand);

    if (brands.length === 0) {
      toast.error("❌ This company is not available in AddItem");
      setAvailableBrands([]);
      setAvailableModels([]);
      setAvailableSizes([]);
      return;
    }

    setAvailableBrands([...new Set(brands)]);
    setAvailableModels([]);
    setAvailableSizes([]);
  };

  const handleBrandChange = (e) => {
    const brand = e.target.value.trim();
    setForm((prev) => ({
      ...prev,
      brand,
      model: "",
      size: "",
      price: "",
      quantity: "",
      date: new Date().toISOString().split("T")[0],
      discount: 0,
    }));

    const models = itemTyres
      .filter(
        (t) =>
          t.company?.toLowerCase() === form.company.toLowerCase() &&
          t.brand?.toLowerCase() === brand.toLowerCase()
      )
      .map((t) => t.model);

    if (models.length === 0) {
      toast.error("❌ This brand is not available for selected company");
      setAvailableModels([]);
      setAvailableSizes([]);
      return;
    }

    setAvailableModels([...new Set(models)]);
    setAvailableSizes([]);
  };

  const handleModelChange = (e) => {
    const model = e.target.value.trim();
    setForm((prev) => ({ ...prev, model }));

    const matches = itemTyres.filter(
      (t) =>
        t.company?.toLowerCase() === form.company.toLowerCase() &&
        t.brand?.toLowerCase() === form.brand.toLowerCase() &&
        t.model?.toLowerCase() === model.toLowerCase()
    );

    if (matches.length > 0) {
      const uniqueSizes = [...new Set(matches.map((t) => t.size))];
      const firstMatch = matches[0];

      setAvailableSizes(uniqueSizes);
      setForm((prev) => ({
        ...prev,
        size: firstMatch.size || "",
        price: firstMatch.price || "",
      }));
    }
  };

  const handleSizeChange = (e) => {
    const size = e.target.value.trim();
    const match = itemTyres.find(
      (t) =>
        t.company?.toLowerCase() === form.company.toLowerCase() &&
        t.brand?.toLowerCase() === form.brand.toLowerCase() &&
        t.model?.toLowerCase() === form.model.toLowerCase() &&
        t.size === size
    );

    if (match) {
      setForm((prev) => ({
        ...prev,
        size,
        price: match.price || "",
      }));
    } else {
      setForm((prev) => ({ ...prev, size }));
    }
  };

  const handleSellTyre = async () => {
    if (!form.company || !form.brand || !form.model || !form.size || !form.price || !form.quantity) {
      toast.error("Please fill all fields");
      return;
    }

    const enteredQty = parseInt(form.quantity);

    const matchedItems = itemTyres.filter(
      (t) =>
        t.company?.toLowerCase() === form.company.toLowerCase() &&
        t.brand?.toLowerCase() === form.brand.toLowerCase() &&
        t.model?.toLowerCase() === form.model.toLowerCase() &&
        t.size === form.size
    );

    const totalPurchasedQty = matchedItems.reduce((acc, curr) => acc + parseInt(curr.quantity || 0), 0);

    const matchedSold = sellTyres.filter(
      (t) =>
        t.company?.toLowerCase() === form.company.toLowerCase() &&
        t.brand?.toLowerCase() === form.brand.toLowerCase() &&
        t.model?.toLowerCase() === form.model.toLowerCase() &&
        t.size === form.size
    );

    const totalSoldQty = matchedSold.reduce((acc, curr) => acc + parseInt(curr.quantity || 0), 0);

    const availableQty = totalPurchasedQty - totalSoldQty;

    if (enteredQty > availableQty) {
      toast.error(`❌ Only ${availableQty} tyres available. Cannot sell more than that.`);
      return;
    }

    const originalPrice = parseFloat(form.price);
    const discount = parseFloat(form.discount) || 0;
    const discountedPrice = originalPrice - (originalPrice * (discount / 100));

    const newTyre = {
      ...form,
      customerName: customerName || "N/A",
      price: discountedPrice, // Store discounted price
      quantity: enteredQty,
      status: "Sold",
      createdAt: new Date(),
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "soldTyres", editId), newTyre);
        toast.success("Tyre updated");
        setEditId(null);
      } else {
        await addDoc(collection(db, "soldTyres"), newTyre);
        toast.success("Tyre sold successfully");
      }

      setForm({
        company: "",
        brand: "",
        model: "",
        size: "",
        price: "",
        quantity: "",
        date: new Date().toISOString().split("T")[0],
        discount: 0,
      });
      setCustomerName("");
      setAvailableBrands([]);
      setAvailableModels([]);
      setAvailableSizes([]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Operation failed");
    }
  };

  const filteredTyres = sellTyres.filter((tyre) =>
    Object.values(tyre).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTyres.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTyres.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">🛒 Sell Tyre</h2>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          name="customerName"
          placeholder="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="border border-gray-300 p-2 rounded w-full"
        />

        <select
          name="company"
          value={form.company}
          onChange={handleCompanyChange}
          className="border border-gray-300 p-2 rounded w-full"
        >
          <option value="">Select Company</option>
          {availableCompanies.map((company, idx) => (
            <option key={idx} value={company}>{company}</option>
          ))}
        </select>

        <select
          name="brand"
          value={form.brand}
          onChange={handleBrandChange}
          className="border border-gray-300 p-2 rounded w-full"
        >
          <option value="">Select Brand</option>
          {availableBrands.map((brand, idx) => (
            <option key={idx} value={brand}>{brand}</option>
          ))}
        </select>

        <select
          name="model"
          value={form.model}
          onChange={handleModelChange}
          className="border border-gray-300 p-2 rounded w-full"
        >
          <option value="">Select Model</option>
          {availableModels.map((model, idx) => (
            <option key={idx} value={model}>{model}</option>
          ))}
        </select>

        <select
          name="size"
          value={form.size}
          onChange={handleSizeChange}
          className="border border-gray-300 p-2 rounded w-full"
        >
          <option value="">Select Size</option>
          {availableSizes.map((size, idx) => (
            <option key={idx} value={size}>{size}</option>
          ))}
        </select>

        <input
          type="number"
          name="price"
          placeholder="Price"
          value={form.price}
          readOnly
          className="border border-gray-300 p-2 rounded w-full"
        />

        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
          className="border border-gray-300 p-2 rounded w-full"
        />

        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="border border-gray-300 p-2 rounded w-full"
        />

        <input
          type="number"
          name="discount"
          placeholder="Discount (%)"
          value={form.discount}
          onChange={handleChange}
          className="border border-gray-300 p-2 rounded w-full"
          min="0"
          max="100"
        />
      </div>

      <button
        onClick={handleSellTyre}
        className={`px-6 py-2 font-medium rounded shadow text-white ${editId ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-600 hover:bg-blue-700"}`}
      >
        {editId ? "Update Tyre" : "Sell Tyre"}
      </button>

      {/* Search */}
      <div className="mt-10 flex justify-between items-center">
        <input
          type="text"
          placeholder="🔍 Search by brand, size, etc."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className=" p-3 border border-gray-300 rounded shadow-sm mb-6"
        />
        {/* Add date range picker UI */}
        <div className="flex gap-2 mb-4">
          <div className="relative">
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="Start Date"
              className="border pl-10 pr-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              dateFormat="dd/MM/yyyy"
              isClearable
            />
            <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <div className="relative">
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              placeholderText="End Date"
              className="border pl-10 pr-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              dateFormat="dd/MM/yyyy"
              isClearable
            />
            <CalendarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Company</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Model</th>
              <th className="p-3">Size</th>
              <th className="p-3">Price</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Total Price</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentItems.length > 0 ? (
              currentItems.map((tyre) => (
                <tr key={tyre.id} className="hover:bg-gray-50 transition">
                  <td className="p-3">{tyre.customerName || 'N/A'}</td>
                  <td className="p-3">{tyre.company}</td>
                  <td className="p-3">{tyre.brand}</td>
                  <td className="p-3">{tyre.model}</td>
                  <td className="p-3">{tyre.size}</td>
                  <td className="p-3">Rs. {tyre.price.toFixed(2)}</td>
                  <td className="p-3">{tyre.quantity}</td>
                  <td className="p-3 text-blue-700 font-semibold">Rs. {(tyre.price * tyre.quantity).toLocaleString()}</td>
                  <td className="p-3">{tyre.discount || 0}%</td>
                  <td className="p-3">{tyre.date}</td>
                  <td className="p-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setForm(tyre);
                        setEditId(tyre.id);
                        setCustomerName(tyre.customerName || '');
                      }}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setViewTyre(tyre)}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="text-center p-6 text-gray-500">
                  No tyres sold yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="p-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
            <button
              key={number}
              onClick={() => paginate(number)}
              className={`px-3 py-1 rounded ${currentPage === number ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            >
              {number}
            </button>
          ))}
        </div>
      </div>
      {viewTyre && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div ref={printRef} className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 relative font-sans print:bg-white print:p-0 print:shadow-none">
            <header className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                <span role="img" aria-label="Invoice">🧾</span> Invoice
              </h2>
              <p className="text-sm text-gray-500 print:hidden">Date: <time>{viewTyre.date}</time></p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-gray-700 text-sm leading-relaxed mb-8">
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900 border-b border-gray-300 pb-1">Customer Details</h3>
                <p><span className="font-medium text-gray-800">Customer:</span> {viewTyre.customerName}</p>
                <p><span className="font-medium text-gray-800">Company:</span> {viewTyre.company}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900 border-b border-gray-300 pb-1">Tyre Details</h3>
                <p><span className="font-medium text-gray-800">Brand:</span> {viewTyre.brand}</p>
                <p><span className="font-medium text-gray-800">Model:</span> {viewTyre.model}</p>
                <p><span className="font-medium text-gray-800">Size:</span> {viewTyre.size}</p>
              </div>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
              <h3 className="font-semibold text-lg mb-4 text-gray-900 border-b border-gray-300 pb-2">Pricing Details</h3>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-gray-700 text-sm">
                <dt className="font-medium">Price per Unit:</dt>
                <dd>Rs. {viewTyre.price.toFixed(2)}</dd>
                <dt className="font-medium">Quantity:</dt>
                <dd>{viewTyre.quantity}</dd>
                <dt className="font-medium">Discount:</dt>
                <dd>{viewTyre.discount || 0}%</dd>
                <dt className="font-bold text-lg">Total:</dt>
                <dd className="font-bold text-lg">Rs. {(viewTyre.price * viewTyre.quantity).toLocaleString()}</dd>
              </dl>
            </section>

            <footer className="flex justify-between items-center text-gray-600 text-sm print:hidden">
              <p>Status: <span className="font-semibold text-green-600">Sold</span></p>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                >
                  Print Invoice
                </button>
                <button
                  onClick={() => setViewTyre(null)}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellTyre;