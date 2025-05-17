// SELLTYRE.JSX

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


const SellTyre = () => {
  const [form, setForm] = useState({
    company: "",
    brand: "",
    model: "",
    size: "",
    price: "",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
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


  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const win = window.open("", "", "height=600,width=800");
      win.document.write("<html><head><title>Print</title></head><body>");
      win.document.write(printContents);
      win.document.write("</body></html>");
      win.document.close();
      win.print();
    }
  };


  useEffect(() => {
    const unsubSell = onSnapshot(collection(db, "soldTyres"), (snapshot) => {
      setSellTyres(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const fetchItemTyres = async () => {
      const snapshot = await getDocs(collection(db, "addItemTyres"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItemTyres(data);

      setAvailableCompanies([...new Set(data.map((t) => t.company?.toLowerCase()))]);
    };

    fetchItemTyres();
    return () => unsubSell();
  }, []);

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

    const newTyre = {
      ...form,
      customerName: customerName || "N/A",
      price: parseFloat(form.price),
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">🛒 Sell Tyre</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <input
            type="text"
            placeholder="Customer Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="border border-gray-300 p-2 rounded w-full"
          />
        </div>
        <div>
          <input
            list="company-list"
            name="company"
            placeholder="Company"
            value={form.company}
            onChange={handleCompanyChange}
            className="border border-gray-300 rounded px-4 py-2 w-full"
          />
          <datalist id="company-list">
            {availableCompanies.map((company, idx) => (
              <option key={idx} value={company} />
            ))}
          </datalist>
        </div>

        <div>
          <input
            list="brand-list"
            name="brand"
            placeholder="Brand"
            value={form.brand}
            onChange={handleBrandChange}
            className="border border-gray-300 rounded px-4 py-2 w-full"
          />
          <datalist id="brand-list">
            {availableBrands.map((brand, idx) => (
              <option key={idx} value={brand} />
            ))}
          </datalist>
        </div>

        <div>
          <select
            name="model"
            value={form.model}
            onChange={handleModelChange}
            className="border border-gray-300 rounded px-4 py-2 w-full"
          >
            <option value="">Select Model</option>
            {availableModels.map((model, idx) => (
              <option key={idx} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            name="size"
            value={form.size}
            onChange={handleSizeChange}
            className="border border-gray-300 rounded px-4 py-2 w-full"
          >
            <option value="">Select Size</option>
            {availableSizes.map((size, idx) => (
              <option key={idx} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <input
          type="number"
          name="price"
          placeholder="Price"
          value={form.price}
          readOnly
          className="border border-gray-300 rounded px-4 py-2 w-full"
        />
        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
          className="border border-gray-300 rounded px-4 py-2 w-full"
        />
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="border border-gray-300 rounded px-4 py-2 w-full"
        />
      </div>

      <button
        onClick={handleSellTyre}
        className={`px-6 py-2 font-medium rounded shadow text-white ${editId ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-600 hover:bg-blue-700"
          }`}
      >
        {editId ? "Update Tyre" : "Sell Tyre"}
      </button>

      <div className="mt-10">
        <input
          type="text"
          placeholder="🔍 Search sold tyres..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded shadow-sm mb-6"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">Coustmer</th>
              <th className="p-3">Company</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Model</th>
              <th className="p-3">Size</th>
              <th className="p-3">Price</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Total Price</th>
              <th className="p-3">Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTyres.length > 0 ? (
              filteredTyres.map((tyre) => (
                <tr key={tyre.id} className="hover:bg-gray-50 transition">
                  <td className="p-3">{tyre.customerName || 'N/A'}</td>
                  <td className="p-3">{tyre.company}</td>
                  <td className="p-3">{tyre.brand}</td>
                  <td className="p-3">{tyre.model}</td>
                  <td className="p-3">{tyre.size}</td>
                  <td className="p-3">Rs. {tyre.price}</td>
                  <td className="p-3">{tyre.quantity}</td>
                  <td className="p-3">Rs. {tyre.price * tyre.quantity}</td>
                  <td className="p-3">{tyre.date}</td>

                  <td className="p-3">
                    <button
                      onClick={() => setViewTyre(tyre)}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center p-6 text-gray-500">
                  No tyres sold yet.
                </td>
              </tr>
            )}
            {viewTyre && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div ref={printRef} className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl w-full">
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM11 5h2v6h-2zm0 8h2v2h-2z" />
                      </svg>
                      <h2 className="text-3xl font-extrabold text-gray-800">Invoice</h2>
                    </div>
                    <p className="text-sm text-gray-600">Date: {viewTyre.date}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Left Side: Tyre Info */}
                    <div>
                      <p className="font-semibold text-lg text-gray-700 mb-2">Tyre Information</p>
                      <div className="space-y-2">
                        <p><strong className="text-gray-800">Company:</strong> {viewTyre.company}</p>
                        <p><strong className="text-gray-800">Brand:</strong> {viewTyre.brand}</p>
                        <p><strong className="text-gray-800">Model:</strong> {viewTyre.model}</p>
                        <p><strong className="text-gray-800">Size:</strong> {viewTyre.size}</p>
                      </div>
                    </div>

                    {/* Right Side: Pricing Info */}
                    <div>
                      <p className="font-semibold text-lg text-gray-700 mb-2">Pricing Details</p>
                      <div className="space-y-2">
                        <p><strong className="text-gray-800">Customer:</strong>{viewTyre.customerName}</p>
                        <p><strong className="text-gray-800">Price per Unit:</strong> Rs. {viewTyre.price}</p>
                        <p><strong className="text-gray-800">Quantity:</strong> {viewTyre.quantity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Section */}
                  <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-xl text-gray-800"><p><strong className="text-gray-800">Total :</strong> Rs. {viewTyre.price * viewTyre.quantity}</p></p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center print:hidden">
                    <button
                      onClick={() => setViewTyre(null)}
                      className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                    >
                      Close
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                    >
                      Print Invoice
                    </button>
                  </div>
                </div>
              </div>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SellTyre;
