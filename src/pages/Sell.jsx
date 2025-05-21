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
                      className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200"
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
  <div className="fixed inset-0 min-h-screen bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
    <div ref={printRef} className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 relative font-sans print:bg-white print:p-0 print:shadow-none">
      {/* Enhanced Header */}
      <div className="relative bg-gradient-to-r from-blue-700 to-gray-800 text-white p-10 rounded-t-xl mb-0">
        <div className="absolute text-white flex justify-center gap-8 text-md top-0 left-2 font-semibold">
          <p>تاریخ: <time>{viewTyre.date}</time></p>
        </div>
        <div className="text-center">
          <h2 className="text-5xl font-bold">سرحد ٹائر ٹریڈرز</h2>
        </div>
        <div className="absolute font-bold px-5 right-50 opacity-70 bg-white rounded-xl text-black z-10 bottom-0">شیر شاہ روڈ نزد مسجد القادر ڈیرہ اڈا ملتان</div>
      </div>

      {/* Invoice Title and Details */}
      <div className="text-center gap-4 mb-6">
        <p className="flex justify-around text-md text-left font-bold" dir="ltr">
          <span>0317-7951283 - <span dir="rtl">عبدالستار</span></span>  
          <span>0307-7327931 - <span dir="rtl">یٰسین خان</span></span>  
          <span>0307-7177613 - <span dir="rtl">گوہر خان</span></span>  
        </p>
        <hr className="my-2 border-gray-300" />
      </div>

      {/* Customer and Tyre Details */}
      <div className="flex justify-between md:grid-cols-2 gap-8 mb-6 text-gray-700 text-sm">
        <div></div> {/* Empty div for spacing */}
        <div className="text-right">
          <h3 className="font-semibold text-lg border-b border-gray-300 pb-1 mb-2">ٹائر کی تفصیلات</h3>
          <p><span className="font-medium"> {viewTyre.brand} : برانڈ</span></p>
          <p><span className="font-medium">ماڈل:</span> {viewTyre.model}</p>
          <p><span className="font-medium">سائز:</span> {viewTyre.size}</p>
        </div>
        <div></div> {/* Empty div to push content to the right */}
        <div className="text-right">
          <h3 className="font-semibold text-lg border-b border-gray-300 pb-1 mb-2">صارف کی تفصیلات</h3>
          <p><span className="font-medium"> {viewTyre.customerName || 'N/A'} : صارف کا نام </span></p>
          <p><span className="font-medium">{viewTyre.company}  : کمپنی کا نام</span></p>
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="mb-6">
        <div className="text-right mb-2">
          <h3 className="font-semibold text-lg border-b border-gray-300 pb-1 inline-block">قیمت کا خلاصہ</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-700 text-right">
          <p>Rs. {viewTyre.price.toFixed(2)} : </p>
          <p className="font-medium">فی یونٹ قیمت</p>
          <p>{viewTyre.quantity} : </p>
          <p className="font-medium">مقدار</p>
          <p>Rs. {viewTyre.discount || 0} : </p>
          <p className="font-medium">رعایت</p>
          <p>Rs. {viewTyre.due || 0} : </p>
          <p className="font-medium">بقایا رقم</p>
          <p className="font-bold text-lg">Rs. {(viewTyre.payableAmount || viewTyre.price * viewTyre.quantity).toLocaleString()} : </p>
          <p className="font-bold text-lg">کل رقم </p>
        </div>
      </div>

      {/* Note */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600">نوٹ: ہمارے ہاں ہر قسم کے گاڑیوں کے نیو امپورٹڈ ٹائر اور رم دستیاب ہیں ۔</p>
      </div>

      {/* Buttons (Hidden on Print) */}
      <div className="flex justify-between items-center text-gray-600 text-sm print:hidden mt-6">
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
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default SellTyre;