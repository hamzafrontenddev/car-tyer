import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarIcon } from "@heroicons/react/24/outline";

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
    discount: "",
    due: "",
    shopQuantity: "", // Added shopQuantity
  });

  const printRef = useRef();
  const [customerName, setCustomerName] = useState('');
  const [sellTyres, setSellTyres] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editingTyre, setEditingTyre] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemTyres, setItemTyres] = useState([]);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [availableBrands, setAvailableBrands] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [viewTyre, setViewTyre] = useState(null);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
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
  }, [startDate, endDate]);

  useEffect(() => {
    if (editingTyre) {
      handleCompanyChange({ target: { value: editingTyre.company || "" } });
    }
  }, [editingTyre]);

  useEffect(() => {
    if (editingTyre && form.company) {
      handleBrandChange({ target: { value: editingTyre.brand || "" } });
    }
  }, [form.company, editingTyre]);

  useEffect(() => {
    if (editingTyre && form.brand) {
      handleModelChange({ target: { value: editingTyre.model || "" } });
    }
  }, [form.brand, editingTyre]);

  useEffect(() => {
    if (editingTyre && form.model) {
      handleSizeChange({ target: { value: editingTyre.size || "" } });
    }
  }, [form.model, editingTyre]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    setForm(newForm);

    // Recalculate totalPrice dynamically for price, quantity, discount, or due
    const price = parseFloat(newForm.price) || 0;
    const quantity = parseInt(newForm.quantity) || 0;
    const discount = parseFloat(newForm.discount) || 0;
    const due = parseFloat(newForm.due) || 0;
    const discountedPrice = price - discount;
    const totalPrice = discountedPrice * quantity - due;
    setForm((prev) => ({
      ...prev,
      totalPrice: totalPrice >= 0 ? totalPrice : 0,
    }));
  };

  const handleCompanyChange = (e) => {
    const company = e.target.value.trim();
    setForm((prev) => ({
      ...prev,
      company,
      brand: "",
      model: "",
      size: "",
      price: "",
      quantity: prev.quantity || "",
      date: prev.date || new Date().toISOString().split("T")[0],
      discount: prev.discount || "",
      due: prev.due || "",
      shopQuantity: "", // Reset shopQuantity
    }));

    const brands = itemTyres
      .filter((t) => t.company?.toLowerCase() === company.toLowerCase())
      .map((t) => t.brand);

    if (brands.length === 0 && company) {
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
      quantity: prev.quantity || "",
      date: prev.date || new Date().toISOString().split("T")[0],
      discount: prev.discount || "",
      due: prev.due || "",
      shopQuantity: "", // Reset shopQuantity
    }));

    const models = itemTyres
      .filter(
        (t) =>
          t.company?.toLowerCase() === form.company.toLowerCase() &&
          t.brand?.toLowerCase() === brand.toLowerCase()
      )
      .map((t) => t.model);

    if (models.length === 0 && brand) {
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
    setForm((prev) => ({
      ...prev,
      model,
      size: "",
      price: "",
      quantity: prev.quantity || "",
      date: prev.date || new Date().toISOString().split("T")[0],
      discount: prev.discount || "",
      due: prev.due || "",
      shopQuantity: "", // Reset shopQuantity
    }));

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

      // Fetch shopQuantity from purchasedTyres
      const fetchShopQuantity = async () => {
        const purchasedQuery = query(
          collection(db, "purchasedTyres"),
          where("company", "==", form.company),
          where("brand", "==", form.brand),
          where("model", "==", model),
          where("size", "==", firstMatch.size || "")
        );
        const purchasedSnapshot = await getDocs(purchasedQuery);
        const purchasedTyres = purchasedSnapshot.docs.map((doc) => doc.data());
        const totalShopQty = purchasedTyres.reduce((acc, curr) => acc + (parseInt(curr.shop) || 0), 0);
        setForm((prev) => ({
          ...prev,
          shopQuantity: totalShopQty.toString(),
        }));
      };
      fetchShopQuantity();
    } else {
      setAvailableSizes([]);
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

      // Fetch shopQuantity from purchasedTyres
      const fetchShopQuantity = async () => {
        const purchasedQuery = query(
          collection(db, "purchasedTyres"),
          where("company", "==", form.company),
          where("brand", "==", form.brand),
          where("model", "==", form.model),
          where("size", "==", size)
        );
        const purchasedSnapshot = await getDocs(purchasedQuery);
        const purchasedTyres = purchasedSnapshot.docs.map((doc) => doc.data());
        const totalShopQty = purchasedTyres.reduce((acc, curr) => acc + (parseInt(curr.shop) || 0), 0);
        setForm((prev) => ({
          ...prev,
          shopQuantity: totalShopQty.toString(),
        }));
      };
      fetchShopQuantity();
    } else {
      setForm((prev) => ({ ...prev, size, shopQuantity: "" }));
    }
  };

  const handleSellTyre = async () => {
    if (!form.company || !form.brand || !form.model || !form.size || !form.price || !form.quantity) {
      toast.error("Please fill all fields");
      return;
    }

    const enteredQty = parseInt(form.quantity);
    if (enteredQty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    if (!editId) {
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

      // Fetch purchasedTyres to check and update shop and store quantities
      const purchasedQuery = query(
        collection(db, "purchasedTyres"),
        where("company", "==", form.company),
        where("brand", "==", form.brand),
        where("model", "==", form.model),
        where("size", "==", form.size)
      );
      const purchasedSnapshot = await getDocs(purchasedQuery);
      const purchasedTyres = purchasedSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const totalShopQty = purchasedTyres.reduce((acc, curr) => acc + (parseInt(curr.shop) || 0), 0);
      const totalStoreQty = purchasedTyres.reduce((acc, curr) => acc + (parseInt(curr.store) || 0), 0);

      if (enteredQty > totalShopQty) {
        toast.error(`❌ Only ${totalShopQty} tyres available in shop. Cannot sell more than that.`);
        return;
      }

      if (enteredQty > totalStoreQty) {
        toast.error(`❌ Only ${totalStoreQty} tyres available in store. Cannot sell more than that.`);
        return;
      }

      // Update shop quantity
      let remainingQty = enteredQty;
      for (const tyre of purchasedTyres) {
        if (remainingQty <= 0) break;
        const currentShop = parseInt(tyre.shop) || 0;
        const deductQty = Math.min(currentShop, remainingQty);
        if (deductQty > 0) {
          await updateDoc(doc(db, "purchasedTyres", tyre.id), {
            shop: currentShop - deductQty,
          });
          console.log(`Deducted ${deductQty} from shop quantity for tyre ID: ${tyre.id}`); // Debugging
          remainingQty -= deductQty;
        }
      }

      // Skipping store quantity addition to fix bug
      if (enteredQty > 0) {
        // const targetTyre = purchasedTyres[0];
        // const currentStore = parseInt(targetTyre.store) || 0;
        // await updateDoc(doc(db, "purchasedTyres", targetTyre.id), {
        //   store: currentStore + enteredQty,
        // });
      }

      // Skipping store quantity deduction to fix bug
      remainingQty = enteredQty;
      // for (const tyre of purchasedTyres) {
      //   if (remainingQty <= 0) break;
      //   const currentStore = parseInt(tyre.store) || 0;
      //   const deductQty = Math.min(currentStore, remainingQty);
      //   if (deductQty > 0) {
      //     await updateDoc(doc(db, "purchasedTyres", tyre.id), {
      //       store: currentStore - deductQty,
      //     });
      //     remainingQty -= deductQty;
      //   }
      // }
    }

    const originalPrice = parseFloat(form.price);
    const discount = parseFloat(form.discount) || 0;
    const due = parseFloat(form.due) || 0;
    const discountedPrice = originalPrice - discount;

    if (discountedPrice < 0) {
      toast.error("Discount cannot exceed the original price");
      return;
    }

    const totalPrice = discountedPrice * enteredQty;
    if (due > totalPrice) {
      toast.error("Due amount cannot exceed the total price");
      return;
    }

    const payableAmount = totalPrice - due;

    const newTyre = {
      ...form,
      customerName: customerName || "N/A",
      price: discountedPrice,
      quantity: enteredQty,
      status: "Sold",
      createdAt: new Date(),
      discount,
      due,
      payableAmount,
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "soldTyres", editId), newTyre);
        toast.success("Tyre updated");
        setEditId(null);
        setEditingTyre(null);
      } else {
        await addDoc(collection(db, "soldTyres"), newTyre);
        toast.success(`Tyre sold successfully, shop quantity updated by -${enteredQty}`);
      }

      setForm({
        company: "",
        brand: "",
        model: "",
        size: "",
        price: "",
        quantity: "",
        date: new Date().toISOString().split("T")[0],
        discount: "",
        due: "",
        shopQuantity: "", // Reset shopQuantity
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTyres.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTyres.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="max-w-8xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">🛒 Sell Item</h2>

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
          placeholder="Discount"
          value={form.discount}
          onChange={handleChange}
          className="border border-gray-300 p-2 rounded w-full"
          min="0"
        />
        <input
          type="number"
          name="due"
          placeholder="Due Amount"
          value={form.due}
          onChange={handleChange}
          className="border border-gray-300 p-2 rounded w-full"
          min="0"
        />
        <input
          type="number"
          name="shopQuantity"
          placeholder="Shop Quantity"
          value={form.shopQuantity}
          readOnly
          className="border border-gray-300 p-2 rounded w-full bg-gray-100"
        />
        <input
          type="number"
          name="totalPrice"
          placeholder="Total Price"
          value={form.totalPrice || ""}
          readOnly
          className="border border-gray-300 p-2 rounded w-full bg-gray-100"
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
              <th className="p-3">Due</th>
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
                  <td className="p-3 text-blue-700 font-semibold">Rs. {(tyre.payableAmount || tyre.price * tyre.quantity).toLocaleString()}</td>
                  <td className="p-3">Rs. {tyre.discount || 0}</td>
                  <td className="p-3">Rs. {tyre.due || 0}</td>
                  <td className="p-3">{tyre.date}</td>
                  <td className="p-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setForm({
                          company: tyre.company || "",
                          brand: tyre.brand || "",
                          model: tyre.model || "",
                          size: tyre.size || "",
                          price: tyre.price || "",
                          quantity: tyre.quantity || "",
                          date: tyre.date || new Date().toISOString().split("T")[0],
                          discount: tyre.discount || "",
                          due: tyre.due || "",
                          shopQuantity: "", // Initialize shopQuantity as empty for edit
                        });
                        setEditId(tyre.id);
                        setCustomerName(tyre.customerName || '');
                        setEditingTyre(tyre);
                      }}
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setViewTyre(tyre)}
                      className="px-3 py-1 text-sm bg-yellow-100 Toxicyellow-800 border border-yellow-300 rounded hover:bg-yellow-200"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12" className="text-center p-6 text-gray-500">
                  No tyres sold yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                <dd>Rs. {viewTyre.discount || 0}</dd>
                <dt className="font-medium">Due Amount:</dt>
                <dd>Rs. {viewTyre.due || 0}</dd>
                <dt className="font-bold text-lg">Total:</dt>
                <dd className="font-bold text-lg">Rs. {(viewTyre.payableAmount || viewTyre.price * tyre.quantity).toLocaleString()}</dd>
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