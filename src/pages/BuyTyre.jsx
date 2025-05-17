import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const BuyTyre = () => {
  const [form, setForm] = useState({
    company: "",
    brand: "",
    size: "",
    model: "",
    price: "",
    quantity: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [boughtTyres, setBoughtTyres] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "purchasedTyres"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBoughtTyres(data);
    });

    return () => unsub();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBuyTyre = async () => {
    if (!form.company || !form.brand || !form.size || !form.price || !form.quantity) {
      toast.error("Please fill all fields");
      return;
    }

    const newTyre = {
      ...form,
      price: parseFloat(form.price),
      quantity: parseInt(form.quantity),
      status: "Bought",
      createdAt: new Date(),
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "purchasedTyres", editId), newTyre);
        toast.success("Tyre updated");
        setEditId(null);
      } else {
        await addDoc(collection(db, "purchasedTyres"), newTyre);
        toast.success("Tyre bought successfully");
      }

      setForm({
        company: "",
        brand: "",
        size: "",
        model: "",
        price: "",
        quantity: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Operation failed");
    }
  };

  const handleEdit = (tyre) => {
    setForm(tyre);
    setEditId(tyre.id);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "purchasedTyres", id));
      toast.success("Deleted successfully");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const filteredTyres = boughtTyres.filter((tyre) =>
    Object.values(tyre).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">🛒 Buy Tyre</h2>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {["company", "brand", "size", "model", "price", "quantity", "date"].map((field) => (
          <input
            key={field}
            type={field === "price" || field === "quantity" ? "number" : field === "date" ? "date" : "text"}
            name={field}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={form[field]}
            onChange={handleChange}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500"
          />
        ))}
      </div>

      <button
        onClick={handleBuyTyre}
        className={`px-6 py-2 font-medium rounded shadow text-white ${editId ? "bg-yellow-500 hover:bg-yellow-600" : "bg-blue-600 hover:bg-blue-700"
          }`}
      >
        {editId ? "Update Tyre" : "Buy Tyre"}
      </button>

      {/* Search */}
      <div className="mt-10">
        <input
          type="text"
          placeholder="🔍 Search by brand, size, etc."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded shadow-sm mb-6"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse bg-white rounded shadow overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">Company</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Size</th>
              <th className="p-3">Model</th>
              <th className="p-3">Price</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Total Price</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTyres.length > 0 ? (
              filteredTyres.map((tyre) => {
                const totalPrice =
                  (parseFloat(tyre.price) || 0) * (parseInt(tyre.quantity) || 0);

                return (
                  <tr key={tyre.id} className="hover:bg-gray-50 transition">
                    <td className="p-3">{tyre.company}</td>
                    <td className="p-3">{tyre.brand}</td>
                    <td className="p-3">{tyre.size}</td>
                    <td className="p-3">{tyre.model}</td>
                    <td className="p-3">Rs. {tyre.price}</td>
                    <td className="p-3">{tyre.quantity}</td>
                    <td className="p-3 text-blue-700 font-semibold">
                      Rs. {totalPrice.toLocaleString()}
                    </td>
                    <td className="p-3">{tyre.date}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                        {tyre.status}
                      </span>
                    </td>
                    <td className="p-3 flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(tyre)}
                        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tyre.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-800 border border-red-300 rounded hover:bg-red-200"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="text-center p-6 text-gray-500">
                  No tyres bought yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BuyTyre;