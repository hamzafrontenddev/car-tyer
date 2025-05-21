import React, { useEffect, useState, useRef } from "react";
import { collection, addDoc, onSnapshot, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

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

const Return = () => {
  const [soldTyres, setSoldTyres] = useState([]);
  const [returns, setReturns] = useState([]);
  const [manualReturnPrice, setManualReturnPrice] = useState("");
  const [selectedReturn, setSelectedReturn] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [returnQuantity, setReturnQuantity] = useState("");
  const [discount, setDiscount] = useState(""); // Read-only discount
  const [due, setDue] = useState(""); // New read-only due field

  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerInputRef = useRef(null);

  const itemsPerPage = 5;

  // Add state for date range
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "soldTyres"), (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setSoldTyres(data);
      console.log("soldTyres:", data);
    });

    const unsub2 = onSnapshot(collection(db, "returnedTyres"), (snapshot) => {
      let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Add date range filtering
      data = filterByDateRange(data, startDate, endDate);
      setReturns(data);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [startDate, endDate]); // Add dependencies for date range

  const customers = [...new Set(soldTyres.map((t) => t.customerName).filter((c) => c && c.trim() !== ""))];

  const companies = [
    ...new Set(
      soldTyres.filter((t) => t.customerName === selectedCustomer).map((t) => t.company)
    ),
  ];
  const brands = [
    ...new Set(
      soldTyres
        .filter((t) => t.customerName === selectedCustomer && t.company === selectedCompany)
        .map((t) => t.brand)
    ),
  ];
  const models = [
    ...new Set(
      soldTyres
        .filter((t) =>
          t.customerName === selectedCustomer &&
          t.company === selectedCompany &&
          t.brand === selectedBrand
        )
        .map((t) => t.model)
    ),
  ];
  const sizes = [
    ...new Set(
      soldTyres
        .filter((t) =>
          t.customerName === selectedCustomer &&
          t.company === selectedCompany &&
          t.brand === selectedBrand &&
          t.model === selectedModel
        )
        .map((t) => t.size)
    ),
  ];

  useEffect(() => {
    const match = soldTyres.find(
      (t) =>
        t.customerName === selectedCustomer &&
        t.company === selectedCompany &&
        t.brand === selectedBrand &&
        t.model === selectedModel &&
        t.size === selectedSize
    );

    if (match) {
      setPrice(match.price);
      setQuantity(match.quantity);
      setDiscount(match.discount || 0);
      setDue(match.due || 0); // Fetch due from soldTyres
    } else {
      setPrice("");
      setQuantity("");
      setDiscount("");
      setDue(""); // Reset due if no match
    }
  }, [selectedCustomer, selectedCompany, selectedBrand, selectedModel, selectedSize, soldTyres]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (!selectedCompany) {
      toast.error("Please select a company");
      return;
    }
    if (!selectedBrand) {
      toast.error("Please select a brand");
      return;
    }
    if (!selectedModel) {
      toast.error("Please select a model");
      return;
    }
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    if (!returnQuantity || returnQuantity <= 0) {
      toast.error("Please enter a valid return quantity");
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }

    const returnTyre = {
      customer: selectedCustomer,
      company: selectedCompany,
      brand: selectedBrand,
      model: selectedModel,
      size: selectedSize,
      price: Number(price),
      quantity: Number(quantity),
      totalPrice: Number(price) * Number(quantity),
      returnQuantity: Number(returnQuantity),
      returnPrice: Number(manualReturnPrice),
      returnTotalPrice: Number(manualReturnPrice) * Number(returnQuantity),
      date,
      discount: Number(discount), // Include discount
      due: Number(due), // Include due
    };

    try {
      await addDoc(collection(db, "returnedTyres"), returnTyre);

      // Update shop quantity in purchasedTyres
      const purchasedQuery = query(
        collection(db, "purchasedTyres"),
        where("company", "==", selectedCompany),
        where("brand", "==", selectedBrand),
        where("model", "==", selectedModel),
        where("size", "==", selectedSize)
      );
      const purchasedSnapshot = await getDocs(purchasedQuery);
      const purchasedTyres = purchasedSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (purchasedTyres.length === 0) {
        toast.error("No matching tyre found in purchasedTyres");
        return;
      }

      // Validate return quantity
      if (Number(returnQuantity) > Number(quantity)) {
        toast.error("Return quantity cannot exceed original sold quantity");
        return;
      }

      // Update shop quantity for the first matching document
      const targetTyre = purchasedTyres[0];
      const currentShop = parseInt(targetTyre.shop) || 0;
      const newShopQuantity = currentShop + Number(returnQuantity);

      await updateDoc(doc(db, "purchasedTyres", targetTyre.id), {
        shop: newShopQuantity,
      });
      console.log(`Added ${returnQuantity} to shop quantity for tyre ID: ${targetTyre.id}`);
      toast.success(`Shop quantity updated to ${newShopQuantity}`);

      toast.success("Tyre returned successfully!");
      setManualReturnPrice("");
      setSelectedCustomer("");
      setSelectedCompany("");
      setSelectedBrand("");
      setSelectedModel("");
      setSelectedSize("");
      setPrice("");
      setQuantity("");
      setReturnQuantity("");
      setDiscount("");
      setDue(""); // Reset due after submission
      setDate("");
      setShowCustomerDropdown(false); // Hide dropdown after submission
    } catch (err) {
      toast.error("Error returning tyre.");
    }
  };

  const filteredReturns = returns.filter((t) =>
    `${t.customer} ${t.company} ${t.brand} ${t.model} ${t.size} ${t.customer}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">🛒 Return Item</h2>

      <form className="grid grid-cols-3 gap-4 mb-6" onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={customerInputRef}
            type="text"
            placeholder="Search or select customer..."
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            onFocus={() => setShowCustomerDropdown(true)}
            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)} // Delay to allow click on dropdown
            className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {showCustomerDropdown && (
            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-40 overflow-y-auto">
              {customers
                .filter((c) =>
                  c.toLowerCase().includes(selectedCustomer.toLowerCase())
                )
                .map((c) => (
                  <div
                    key={c}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setShowCustomerDropdown(false);
                      customerInputRef.current?.blur(); // Remove focus to hide dropdown
                    }}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {c}
                  </div>
                ))}
            </div>
          )}
        </div>

        <select
          className="border border-gray-300 rounded px-3 py-2"
          value={selectedCompany}
          onChange={(e) => {
            setSelectedCompany(e.target.value);
            setSelectedBrand("");
            setSelectedModel("");
            setSelectedSize("");
          }}
        >
          <option>Select Company</option>
          {companies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          className="border border-gray-300 rounded px-3 py-2"
          value={selectedBrand}
          onChange={(e) => {
            setSelectedBrand(e.target.value);
            setSelectedModel("");
            setSelectedSize("");
          }}
        >
          <option>Select Brand</option>
          {brands.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>

        <select
          className="border border-gray-300 rounded px-3 py-2"
          value={selectedModel}
          onChange={(e) => {
            setSelectedModel(e.target.value);
            setSelectedSize("");
          }}
        >
          <option>Select Model</option>
          {models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <select
          className="border border-gray-300 rounded px-3 py-2"
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
        >
          <option>Select Size</option>
          {sizes.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Price"
          value={price}
          readOnly
          className="border border-gray-300 bg-gray-100 rounded px-3 py-2"
        />

        <input
          type="text"
          placeholder="Quantity"
          value={quantity}
          readOnly
          className="border border-gray-300 bg-gray-100 rounded px-3 py-2"
        />
        <input
          type="number"
          placeholder="Return Quantity"
          value={returnQuantity}
          onChange={(e) => setReturnQuantity(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="number"
          placeholder="Return Price"
          value={manualReturnPrice}
          onChange={(e) => setManualReturnPrice(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Discount"
          value={discount}
          readOnly
          className="border border-gray-300 bg-gray-100 rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Due Amount"
          value={due}
          readOnly
          className="border border-gray-300 bg-gray-100 rounded px-3 py-2"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white font-semibold rounded px-6 py-2 hover:bg-blue-700 transition"
        >
          Return Tyre
        </button>
      </form>

      <div className="flex justify-between">
        <input
          type="text"
          placeholder="🔍 Search by customer name, company, brand, model, size..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 border border-gray-300 rounded px-3 py-2"
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

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 font-semibold">Customer</th>
              <th className="py-2 px-4 font-semibold">Company</th>
              <th className="py-2 px-4 font-semibold">Brand</th>
              <th className="py-2 px-4 font-semibold">Model</th>
              <th className="py-2 px-4 font-semibold">Size</th>
              <th className="py-2 px-4 font-semibold">Quantity</th>
              <th className="py-2 px-4 font-semibold">Price</th>
              <th className="py-2 px-4 font-semibold">Total Price</th>
              <th className="py-2 px-4 font-semibold">Return Quantity</th>
              <th className="py-2 px-4 font-semibold">Return Price</th>
              <th className="py-2 px-4 font-semibold">Return Total Price</th>
              <th className="py-2 px-4 font-semibold">Discount</th>
              <th className="py-2 px-4 font-semibold">Due</th>
              <th className="py-2 px-4 font-semibold">Date</th>
              <th className="py-2 px-4 font-semibold">Status</th>
              <th className="py-2 px-4 font-semibold">Action</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((t) => (
              <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-2 px-4">{t.customer}</td>
                <td className="py-2 px-4">{t.company}</td>
                <td className="py-2 px-4">{t.brand}</td>
                <td className="py-2 px-4">{t.model}</td>
                <td className="py-2 px-4">{t.size}</td>
                <td className="py-2 px-4">{t.quantity}</td>
                <td className="py-2 px-4">Rs. {t.price}</td>
                <td className="py-2 px-4">Rs. {t.totalPrice}</td>
                <td className="py-2 px-4">{t.returnQuantity}</td>
                <td className="py-2 px-4">Rs. {t.returnPrice}</td>
                <td className="py-2 px-4">Rs. {t.returnTotalPrice}</td>
                <td className="py-2 px-4">{`${t.discount || 0}`}</td>
                <td className="py-2 px-4">Rs. {t.due || 0}</td>
                <td className="py-2 px-4">{t.date}</td>
                <td className="py-2 px-4">Returned</td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => setSelectedReturn(t)}
                    className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
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

      {selectedReturn && (
        <div className="fixed inset-0 min-h-screen bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 relative font-sans print:bg-white print:p-0 print:shadow-none"
            id="printable"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-700 to-gray-800 text-white p-10 rounded-t-xl mb-0">
              <div className="absolute text-white flex justify-center gap-8 text-md top-0 left-2 font-semibold">
                <p>تاریخ: <time>{selectedReturn.date}</time></p>
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
                <p><span className="font-medium">{selectedReturn.brand} : برانڈ</span></p>
                <p><span className="font-medium">ماڈل:</span> {selectedReturn.model}</p>
                <p><span className="font-medium">سائز:</span> {selectedReturn.size}</p>
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-lg border-b border-gray-300 pb-1 mb-2">صارف کی تفصیلات</h3>
                <p><span className="font-medium"> {selectedReturn.customer} : صارف کا نام</span></p>
                <p><span className="font-medium"> {selectedReturn.company} : کمپنی کا نام</span></p>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="mb-6">
              <div className="text-right mb-2">
                <h3 className="font-semibold text-lg border-b border-gray-300 pb-1 inline-block">قیمت کا خلاصہ</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-700 text-right">
                <p>{selectedReturn.quantity}</p>
                <p className="font-medium">اصل مقدار:</p>
                <p>{selectedReturn.returnQuantity}</p>
                <p className="font-medium">واپس مقدار:</p>
                <p>Rs. {selectedReturn.price}</p>
                <p className="font-medium">فی ٹائر قیمت:</p>
                <p>Rs. {selectedReturn.returnPrice}</p>
                <p className="font-medium">واپس قیمت فی ٹائر:</p>
                <p>{selectedReturn.discount || 0}</p>
                <p className="font-medium">رعایت:</p>
                <p>Rs. {selectedReturn.due || 0}</p>
                <p className="font-medium">بقایا رقم:</p>
                <p className="font-bold text-lg">Rs. {selectedReturn.returnTotalPrice}</p>
                <p className="font-bold text-lg">کل قیمت:</p>
              </div>
            </div>

            {/* Note */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">نوٹ: ہمارے ہاں ہر قسم کے گاڑیوں کے نیو امپورٹڈ ٹائر اور رم دستیاب ہیں ۔</p>
            </div>

            {/* Buttons (Hidden on Print) */}
            <div className="flex justify-between items-center text-gray-600 text-sm print:hidden mt-6">
              <p>Status: <span className="font-semibold text-green-600">Returned</span></p>
              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-green-600 hover:bg-green-700 transition text-white px-5 py-2 rounded-md shadow"
                  aria-label="Print Invoice"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="bg-red-600 hover:bg-red-700 transition text-white px-5 py-2 rounded-md shadow"
                  aria-label="Close Invoice"
                >
                  ❌ Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Return;