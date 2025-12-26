// src/admin/Orders.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
// import { db as dbQuote } from "../../firebasequote";
import { db } from "../../firebase";

export default function Orders() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const notifyAdminModal = (open) => {
    window.dispatchEvent(new CustomEvent("admin-modal", { detail: open }));
  };


  // View / Update state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const statusOptions = ["Pending", "Processing", "Quoted", "Completed", "Cancelled", "On Hold"];
  const [searchQuery, setSearchQuery] = useState("");


  // Check URL query parameter for section
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (section === "bulk") {
      setActiveTab("bulk");
    }
  }, [location]);



  // Subscribe to both bulk and sample_courier nodes
  useEffect(() => {
    const bulkRef = ref(db, "quotes/bulk");
    const sampleRef = ref(db, "quotes/sample_courier");

    let bulkOrders = [];
    let sampleOrders = [];

    const unsub1 = onValue(bulkRef, (snap) => {
      const data = snap.val() || {};
      bulkOrders = Object.entries(data).map(([id, order]) => ({
        id,
        ...order,
        type: "bulk"
      }));

      // merge and sort
      setOrders([...bulkOrders, ...sampleOrders].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setLoading(false);
    });

    const unsub2 = onValue(sampleRef, (snap) => {
      const data = snap.val() || {};
      sampleOrders = Object.entries(data).map(([id, order]) => ({
        id,
        ...order,
        type: "sample_courier"
      }));

      // merge and sort
      setOrders([...bulkOrders, ...sampleOrders].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const getFilteredOrders = () => {
    let list = orders;

    // FIRST apply tab filter
    switch (activeTab) {
      case "bulk":
        list = list.filter(order => order.type === "bulk");
        break;
      case "sample":
        list = list.filter(order => order.type === "sample_courier");
        break;
      case "pending":
        list = list.filter(order => !order.status || order.status === "Pending");
        break;
      case "processing":
        list = list.filter(order => order.status === "Processing");
        break;
      case "completed":
        list = list.filter(order => order.status === "Completed");
        break;
      default:
        break;
    }

    // THEN apply search filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();

      list = list.filter(order =>
        order.id.toLowerCase().includes(q) ||
        (order.name?.toLowerCase() || "").includes(q) ||
        (order.email?.toLowerCase() || "").includes(q) ||
        (order.phone?.toLowerCase() || "").includes(q) ||
        (order.type?.toLowerCase() || "").includes(q)
      );
    }

    return list;

  };

  const filteredOrders = getFilteredOrders();

  // Helpers to open view / update
  const handleOpenView = (order) => {
    setViewingOrder(order);
    setShowViewModal(true);
    notifyAdminModal(true);
  };

  const handleOpenUpdate = (order) => {
    setViewingOrder(order);
    setUpdateStatus(order.status || "Pending");
    setShowViewModal(false);
    setShowUpdateModal(true);
    notifyAdminModal(true);
  };
  const closeAllModals = () => {
    setShowViewModal(false);
    setShowUpdateModal(false);
    setViewingOrder(null);
    notifyAdminModal(false);  // ✅ IMPORTANT
  };

  // Determines correct DB path for update
  const getQuotePath = (order) => {
    if (!order) return null;
    if (order.type === "bulk") return `quotes/bulk/${order.id}`;
    if (order.type === "sample_courier") return `quotes/sample_courier/${order.id}`;
    // fallback
    return `quotes/${order.id}`;
  };

  const handleStatusUpdate = async () => {
    if (!viewingOrder || !updateStatus) return;
    const path = getQuotePath(viewingOrder);
    if (!path) return alert("Invalid order selected.");

    try {
      setUpdating(true);
      await update(ref(db, path), {
        status: updateStatus,
        updatedAt: Date.now()
      });

      // apply local update so UI refreshes instantly
      setOrders(prev => prev.map(o => o.id === viewingOrder.id ? { ...o, status: updateStatus, updatedAt: Date.now() } : o));
      setShowUpdateModal(false);
      setViewingOrder(null);
      notifyAdminModal(false);
      alert(`Order status updated to: ${updateStatus}`);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. See console for details.");
    } finally {
      setUpdating(false);
    }
  };

  // Small reusable detail row to avoid the missing DetailRow error
  function DetailRow({ label, value }) {
    return (
      <div className="tw-flex tw-justify-between tw-border-b tw-border-gray-700 tw-pb-1">
        <span className="tw-text-gray-400">{label}:</span>
        <span className="tw-text-white tw-font-medium">{(value === 0 || value) ? value : "—"}</span>
      </div>
    );
  }

  return (
    <div className="tw-p-4 sm:tw-p-6">
      <h1 className="tw-text-2xl sm:tw-text-3xl tw-font-bold tw-text-yellow-500 tw-mb-6">
        Orders Management
      </h1>
      {/* Search Bar */}
      <div className="tw-mb-6 tw-flex tw-justify-center">
        <input
          type="text"
          placeholder="Search by ID, name, email, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="tw-w-full tw-max-w-xl tw-px-4 tw-py-2 tw-rounded-lg tw-bg-gray-800 tw-text-white tw-border tw-border-gray-700 focus:tw-border-yellow-500 focus:tw-outline-none"
        />
      </div>


      {/* Tabs */}
      <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mb-6">
        <button onClick={() => setActiveTab("all")}
          className={`tw-px-4 tw-py-2 tw-rounded-lg tw-font-medium ${activeTab === "all" ? "tw-bg-yellow-500 tw-text-black" : "tw-bg-gray-800 tw-text-gray-300 hover:tw-bg-gray-700"}`}>
          All Orders ({orders.length})
        </button>

        <button onClick={() => setActiveTab("bulk")}
          className={`tw-px-4 tw-py-2 tw-rounded-lg tw-font-medium ${activeTab === "bulk" ? "tw-bg-yellow-500 tw-text-black" : "tw-bg-gray-800 tw-text-gray-300 hover:tw-bg-gray-700"}`}>
          Bulk Orders ({orders.filter(o => o.type === "bulk").length})
        </button>

        <button onClick={() => setActiveTab("sample")}
          className={`tw-px-4 tw-py-2 tw-rounded-lg tw-font-medium ${activeTab === "sample" ? "tw-bg-yellow-500 tw-text-black" : "tw-bg-gray-800 tw-text-gray-300 hover:tw-bg-gray-700"}`}>
          Sample Courier ({orders.filter(o => o.type === "sample_courier").length})
        </button>

        <button onClick={() => setActiveTab("pending")}
          className={`tw-px-4 tw-py-2 tw-rounded-lg tw-font-medium ${activeTab === "pending" ? "tw-bg-red-500 tw-text-white" : "tw-bg-gray-800 tw-text-gray-300 hover:tw-bg-gray-700"}`}>
          Pending ({orders.filter(o => !o.status || o.status === "Pending").length})
        </button>

        <button onClick={() => setActiveTab("processing")}
          className={`tw-px-4 tw-py-2 tw-rounded-lg tw-font-medium ${activeTab === "processing" ? "tw-bg-blue-500 tw-text-white" : "tw-bg-gray-800 tw-text-gray-300 hover:tw-bg-gray-700"}`}>
          Processing ({orders.filter(o => o.status === "Processing").length})
        </button>

        <button onClick={() => setActiveTab("completed")}
          className={`tw-px-4 tw-py-2 tw-rounded-lg tw-font-medium ${activeTab === "completed" ? "tw-bg-green-500 tw-text-white" : "tw-bg-gray-800 tw-text-gray-300 hover:tw-bg-gray-700"}`}>
          Completed ({orders.filter(o => o.status === "Completed").length})
        </button>
      </div>

      {loading ? (
        <div className="tw-text-yellow-500 tw-text-lg tw-text-center tw-py-8">Loading orders...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4 tw-mb-6">
            <div className="tw-bg-gray-900/50 tw-rounded-xl tw-p-4 tw-border tw-border-yellow-500/20">
              <p className="tw-text-gray-400 tw-text-sm">Total Orders</p>
              <p className="tw-text-2xl tw-font-bold tw-text-yellow-500">{orders.length}</p>
            </div>
            <div className="tw-bg-gray-900/50 tw-rounded-xl tw-p-4 tw-border tw-border-blue-500/20">
              <p className="tw-text-gray-400 tw-text-sm">Bulk Orders</p>
              <p className="tw-text-2xl tw-font-bold tw-text-blue-500">{orders.filter(o => o.type === "bulk").length}</p>
            </div>
            <div className="tw-bg-gray-900/50 tw-rounded-xl tw-p-4 tw-border tw-border-green-500/20">
              <p className="tw-text-gray-400 tw-text-sm">Sample Courier</p>
              <p className="tw-text-2xl tw-font-bold tw-text-green-500">{orders.filter(o => o.type === "sample_courier").length}</p>
            </div>
            <div className="tw-bg-gray-900/50 tw-rounded-xl tw-p-4 tw-border tw-border-red-500/20">
              <p className="tw-text-gray-400 tw-text-sm">Pending</p>
              <p className="tw-text-2xl tw-font-bold tw-text-red-500">{orders.filter(o => !o.status || o.status === "Pending").length}</p>
            </div>
          </div>

          {/* Orders Table */}
          <div className="tw-bg-gray-900/50 tw-rounded-xl tw-overflow-hidden">
            <div className="tw-p-4 tw-border-b tw-border-gray-700">
              <h2 className="tw-text-xl tw-font-semibold tw-text-white">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Orders
                <span className="tw-text-gray-400 tw-text-sm tw-ml-2">({filteredOrders.length} orders)</span>
              </h2>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="tw-p-8 tw-text-center">
                <div className="tw-text-5xl tw-mb-4">📋</div>
                <h3 className="tw-text-xl tw-text-gray-300 tw-mb-2">No Orders Found</h3>
                <p className="tw-text-gray-500">No orders match the current filter</p>
              </div>
            ) : (
              <div className="tw-overflow-x-auto">
                <table className="tw-w-full">
                  <thead>
                    <tr className="tw-border-b tw-border-gray-700">
                      <th className="tw-text-left tw-py-3 tw-px-4 tw-text-gray-400 tw-font-medium">Order ID</th>
                      <th className="tw-text-left tw-py-3 tw-px-4 tw-text-gray-400 tw-font-medium">Customer</th>
                      <th className="tw-text-left tw-py-3 tw-px-4 tw-text-gray-400 tw-font-medium">Type</th>
                      <th className="tw-text-left tw-py-3 tw-px-4 tw-text-gray-400 tw-font-medium">Status</th>
                      <th className="tw-text-left tw-py-3 tw-px-4 tw-text-gray-400 tw-font-medium">Date</th>
                      <th className="tw-text-left tw-py-3 tw-px-4 tw-text-gray-400 tw-font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="tw-border-b tw-border-gray-800 hover:tw-bg-gray-900/30">
                        {/* show full id now */}
                        <td className="tw-py-3 tw-px-4">
                          <span className="tw-text-gray-300 tw-font-mono tw-text-sm">{order.id}</span>
                        </td>

                        <td className="tw-py-3 tw-px-4">
                          <div>
                            <p className="tw-text-white">{order.name || "Anonymous"}</p>
                            <p className="tw-text-gray-500 tw-text-sm">{order.email}</p>
                          </div>
                        </td>

                        <td className="tw-py-3 tw-px-4">
                          <span className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-xs ${order.type === "sample_courier" ? "tw-bg-blue-500/20 tw-text-blue-300" : "tw-bg-purple-500/20 tw-text-purple-300"}`}>
                            {order.type === "sample_courier" ? "Sample" : "Bulk"}
                          </span>
                        </td>

                        <td className="tw-py-3 tw-px-4">
                          <span className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-xs ${order.status === "Completed" ? "tw-bg-green-500/20 tw-text-green-300" : order.status === "Processing" ? "tw-bg-yellow-500/20 tw-text-yellow-300" : "tw-bg-gray-500/20 tw-text-gray-300"}`}>
                            {order.status || "Pending"}
                          </span>
                        </td>

                        <td className="tw-py-3 tw-px-4">
                          <span className="tw-text-gray-400 tw-text-sm">{order.timestamp ? new Date(order.timestamp).toLocaleDateString() : "N/A"}</span>
                        </td>

                        <td className="tw-py-3 tw-px-4">
                          <button onClick={() => handleOpenView(order)} className="tw-bg-yellow-500 hover:tw-bg-yellow-600 tw-text-black tw-px-3 tw-py-1 tw-rounded tw-text-sm tw-font-medium tw-mr-2">
                            View
                          </button>
                          <button onClick={() => handleOpenUpdate(order)} className="tw-bg-gray-800 hover:tw-bg-gray-700 tw-text-white tw-px-3 tw-py-1 tw-rounded tw-text-sm tw-font-medium">
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------- VIEW MODAL ---------- */}
      {showViewModal && viewingOrder && (
        <div className="tw-fixed tw-inset-0 tw-bg-black/70 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
          <div className="tw-bg-gray-900 tw-rounded-xl tw-w-full tw-max-w-4xl tw-max-h-[90vh] tw-overflow-y-auto tw-p-6">
            <div className="tw-flex tw-justify-between tw-items-start tw-mb-6">
              <div>
                <h2 className="tw-text-2xl tw-font-bold tw-text-yellow-500">Order Details</h2>
                <p className="tw-text-gray-400 tw-text-sm mt-1">Order ID: <span className="tw-font-mono tw-text-white">{viewingOrder.id}</span></p>
              </div>
              <div>
                <button
                  onClick={closeAllModals}
                  className="tw-text-gray-400 hover:tw-text-white tw-text-3xl"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="tw-space-y-6">
              <div className="tw-bg-gray-800/40 tw-rounded-lg tw-p-4 tw-border tw-border-gray-700">
                <h3 className="tw-text-lg tw-font-semibold tw-text-white mb-3">Order Summary</h3>
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-3">
                  <DetailRow label="Type" value={viewingOrder.type === "sample_courier" ? "Sample Courier" : "Bulk Quote"} />
                  <DetailRow label="Status" value={viewingOrder.status || "Pending"} />
                  <DetailRow label="Created At" value={viewingOrder.timestamp ? new Date(viewingOrder.timestamp).toLocaleString() : "N/A"} />
                  {viewingOrder.updatedAt && <DetailRow label="Last Updated" value={new Date(viewingOrder.updatedAt).toLocaleString()} />}
                </div>
              </div>

              <div className="tw-bg-gray-800/40 tw-rounded-lg tw-p-4 tw-border tw-border-gray-700">
                <h3 className="tw-text-lg tw-font-semibold tw-text-white mb-3">Customer Information</h3>

                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-3">

                  {/* Basic Details */}
                  <DetailRow label="Name" value={viewingOrder.name} />
                  <DetailRow label="Email" value={viewingOrder.email} />
                  <DetailRow label="Phone" value={viewingOrder.phone} />
                  {viewingOrder.company && <DetailRow label="Company" value={viewingOrder.company} />}

                  {/* ADDRESS DETAILS */}
                  {viewingOrder.street && (
                    <DetailRow label="Street" value={viewingOrder.street} />
                  )}

                  {viewingOrder.city && (
                    <DetailRow label="City" value={viewingOrder.city} />
                  )}

                  {viewingOrder.addressState && (
                    <DetailRow label="State" value={viewingOrder.addressState} />
                  )}

                  {viewingOrder.addressCountry && (
                    <DetailRow label="Country" value={viewingOrder.addressCountry} />
                  )}

                  {viewingOrder.pincode && (
                    <DetailRow label="Pincode" value={viewingOrder.pincode} />
                  )}
                </div>
              </div>


              {viewingOrder.type === "bulk" && (
                <div className="tw-bg-gray-800/40 tw-rounded-lg tw-p-4 tw-border tw-border-gray-700">
                  <h3 className="tw-text-lg tw-font-semibold tw-text-white mb-3">Product & Quote Details</h3>
                  <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-3">
                    <DetailRow label="Product" value={viewingOrder.product} />
                    <DetailRow label="Grade" value={viewingOrder.grade} />
                    <DetailRow label="Packing" value={viewingOrder.packing} />
                    <DetailRow label="Quantity" value={viewingOrder.quantity} />
                    <DetailRow label="State" value={viewingOrder.state} />
                    <DetailRow label="Port" value={viewingOrder.port} />
                    <DetailRow label="CIF/FOB" value={viewingOrder.cif} />
                    <DetailRow label="Currency" value={viewingOrder.currency} />
                    <DetailRow label="Total Price" value={viewingOrder.totalPrice} />
                  </div>

                  <h4 className="tw-text-white tw-font-semibold tw-mt-4">Cost Breakdown</h4>
                  <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-3 mt-2">
                    <DetailRow label="Grade Price" value={viewingOrder.gradePrice} />
                    <DetailRow label="Packing Price" value={viewingOrder.packingPrice} />
                    <DetailRow label="Quantity Price" value={viewingOrder.quantityPrice} />
                    {viewingOrder.insurancePrice !== null && <DetailRow label="Insurance" value={viewingOrder.insurancePrice} />}
                    {viewingOrder.freightPrice !== null && <DetailRow label="Freight" value={viewingOrder.freightPrice} />}
                    {viewingOrder.transportTotal !== null && <DetailRow label="Transport Total" value={viewingOrder.transportTotal} />}
                  </div>
                </div>
              )}

              {viewingOrder.type === "sample_courier" && (
                <div className="tw-bg-gray-800/40 tw-rounded-lg tw-p-4 tw-border tw-border-gray-700">
                  <h3 className="tw-text-lg tw-font-semibold tw-text-white mb-3">Sample Courier Details</h3>
                  <DetailRow label="Shipping Method" value={viewingOrder.shippingMethod} />
                  <DetailRow label="Address" value={viewingOrder.address} />
                  <h4 className="tw-text-white tw-font-semibold tw-mt-4">Items</h4>
                  <ul className="tw-list-disc tw-ml-6 tw-text-gray-300">
                    {viewingOrder.items?.map((item, i) => {
                      // If item is a string → show normally
                      if (typeof item === "string") {
                        return <li key={i}>{item}</li>;
                      }

                      // If item is an object (your case)
                      return (
                        <li key={i}>
                          <div className="tw-flex tw-flex-col tw-gap-1 tw-mb-2">
                            {item.variety && <span><b>Variety:</b> {item.variety}</span>}
                            {item.grade && <span><b>Grade:</b> {item.grade}</span>}
                            {item.quantity && <span><b>Qty:</b> {item.quantity}</span>}
                            {item.price && <span><b>Price:</b> ₹{item.price}</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="tw-grid tw-grid-cols-2 tw-gap-3 tw-mt-4">
                    <DetailRow label="Rice Total" value={viewingOrder.riceTotal} />
                    <DetailRow label="Shipping Charge" value={viewingOrder.shippingCharge} />
                    <DetailRow label="Total Amount" value={viewingOrder.totalAmount} />
                    <DetailRow label="Payment Status" value={viewingOrder.paymentStatus} />
                  </div>
                </div>
              )}

              {(viewingOrder.message || viewingOrder.additionalInfo) && (
                <div className="tw-bg-gray-800/40 tw-rounded-lg tw-p-4 tw-border tw-border-gray-700">
                  <h3 className="tw-text-lg tw-font-semibold tw-text-white mb-2">Customer Message</h3>
                  <p className="tw-text-gray-300 whitespace-pre-wrap">{viewingOrder.message || viewingOrder.additionalInfo}</p>
                </div>
              )}

              <div className="tw-flex tw-justify-end tw-gap-4 tw-pt-4">
                <button
                  onClick={() => handleOpenUpdate(viewingOrder)}
                  className="tw-bg-yellow-500 hover:tw-bg-yellow-600 tw-text-black tw-px-6 tw-py-2 tw-rounded-lg"
                >
                  Update Status
                </button>
                <button
                  onClick={closeAllModals}
                  className="tw-bg-gray-800 hover:tw-bg-gray-700 tw-text-white tw-px-6 tw-py-2 tw-rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- UPDATE MODAL ---------- */}
      {showUpdateModal && viewingOrder && (
        <div className="tw-fixed tw-inset-0 tw-bg-black/70 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
          <div className="tw-bg-gray-900 tw-rounded-xl tw-w-full tw-max-w-md tw-p-6">
            <div className="tw-flex tw-justify-between tw-items-center tw-mb-4">
              <h2 className="tw-text-2xl tw-font-bold tw-text-yellow-500">Update Quote Status</h2>
              <button
                onClick={closeAllModals}
                className="tw-text-gray-400 hover:tw-text-white tw-text-3xl"
              >
                &times;
              </button>
            </div>

            <p className="tw-text-gray-300 tw-mb-4">Quote ID: <span className="tw-font-mono">{viewingOrder.id}</span></p>
            <div className="tw-mb-4">
              <label className="tw-block tw-text-gray-300 tw-mb-2">Select Status:</label>
              <div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 tw-gap-2">
                {statusOptions.map(status => (
                  <button key={status}
                    onClick={() => setUpdateStatus(status)}
                    className={`tw-p-2 tw-rounded tw-text-sm tw-font-medium ${updateStatus === status ? "tw-bg-yellow-600 tw-text-black" : "tw-bg-gray-800 tw-text-gray-300 hover:tw-bg-gray-700"}`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="tw-flex tw-justify-end tw-gap-3">
              <button
                onClick={closeAllModals}
                className="tw-bg-gray-800 hover:tw-bg-gray-700 tw-text-white tw-px-4 tw-py-2 tw-rounded-lg"
                disabled={updating}
              >
                Cancel
              </button>
              <button onClick={handleStatusUpdate} className="tw-bg-yellow-500 hover:tw-bg-yellow-600 tw-text-black tw-px-6 tw-py-2 tw-rounded-lg" disabled={updating || !updateStatus}>
                {updating ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
