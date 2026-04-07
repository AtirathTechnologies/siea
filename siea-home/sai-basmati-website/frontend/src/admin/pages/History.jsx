import React, { useEffect, useState } from "react";
import { ref, query, orderByChild, limitToLast, endAt, get } from "firebase/database";
import { db } from "../../firebase";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function History() {
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rawDataView, setRawDataView] = useState(false);
  const PAGE_SIZE = 200;
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const notifyAdminModal = (open) => {
    window.dispatchEvent(new CustomEvent("admin-modal", { detail: open }));
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoading(true);

    const snap = await get(
      query(
        ref(db, "history"),
        orderByChild("timestamp"),
        limitToLast(PAGE_SIZE)
      )
    );

    if (!snap.exists()) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const list = Object.entries(snap.val())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    setHistory(list);
    setLastTimestamp(list[list.length - 1]?.timestamp);
    setLoading(false);
  };

  const loadMore = async () => {
    if (!lastTimestamp) return;

    const snap = await get(
      query(
        ref(db, "history"),
        orderByChild("timestamp"),
        endAt(lastTimestamp - 1),
        limitToLast(PAGE_SIZE)
      )
    );

    if (!snap.exists()) {
      setHasMore(false);
      return;
    }

    const more = Object.entries(snap.val())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    setHistory(prev => [...prev, ...more]);
    setLastTimestamp(more[more.length - 1]?.timestamp);
  };

  const getActionColor = (action) => {
    switch (action) {
      case "CREATE":
        return "tw-bg-green-600";
      case "UPDATE":
        return "tw-bg-yellow-500 tw-text-black";
      case "DELETE":
        return "tw-bg-red-600";
      case "LOGIN":
        return "tw-bg-blue-600";
      default:
        return "tw-bg-gray-600";
    }
  };

  // Helper to extract product name from multilingual object
  const getProductName = (nameObj) => {
    if (!nameObj) return "Unknown Product";
    if (typeof nameObj === 'string') return nameObj;
    if (typeof nameObj === 'object') {
      return nameObj.en || nameObj.hi || Object.values(nameObj)[0] || "Unknown Product";
    }
    return String(nameObj);
  };

  // Helper to extract description from multilingual object
  const getProductDescription = (descObj) => {
    if (!descObj) return "";
    if (typeof descObj === 'string') return descObj;
    if (typeof descObj === 'object') {
      return descObj.en || descObj.hi || Object.values(descObj)[0] || "";
    }
    return String(descObj);
  };

  // Extract product data from history entry
  const extractProductData = (data) => {
    if (!data || typeof data !== 'object') return [];

    try {

      // ✅ 1. PRODUCT FIRST (MOST IMPORTANT)
      if (data.category || data.grades) {
        return [{
          type: "product",
          id: data.id || data.firebaseKey,
          name: getProductName(data.name),
          description: getProductDescription(data.desc),
          category: data.category,

          grades: (data.grades || []).map(g => ({
            name: g.grade,

            // ✅ FIX HERE
            price_inr: g.price_inr || (
              g.packs && g.packs.length > 0
                ? Math.min(...g.packs.map(p => p.price)) // lowest price
                : 0
            ),

            packs: g.packs || [],   // 👈 IMPORTANT ADD
            harvest: g.harvest,
            origin: g.origin,
            stock: g.stock,
            moq: g.moq
          })),

          price: data.price,
          specs: data.specs,
          hsn: data.hsn,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy
        }];
      }

      // ✅ 2. ORDER
      if (data.items && Array.isArray(data.items)) {
        return [{
          type: "order",
          id: data.quoteId || data.id,
          name: data.name,
          items: data.items,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
          riceTotal: data.riceTotal,
          shippingCharge: data.shippingCharge
        }];
      }

      // ✅ 3. BULK QUOTE (STRICT CHECK)
      if (data.type === "bulk" || data.quoteId?.startsWith("BulkQuote")) {
        return [{
          type: "bulk_quote",
          id: data.quoteId,
          name: data.name,
          product: data.product,
          grade: data.grade,
          quantity: data.quantity,

          gradePrice: data.gradePrice,
          packingPrice: data.packingPrice,
          freightPrice: data.freightPrice,
          totalPrice: data.totalPrice,

          originPort: data.originPort,
          transportMode: data.transportMode,

          city: data.city,
          addressState: data.addressState,
          addressCountry: data.addressCountry,

          email: data.email,
          phone: data.phone,

          status: data.status,
        }];
      }

      return [];

    } catch (error) {
      console.error("Error extracting data:", error);
      return [];
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(history);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "History");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(file, "history.xlsx");
  };

  // Render grades for a product
  const renderGrades = (grades) => {
    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return <p className="tw-text-gray-400 tw-text-sm tw-italic">No grades available</p>;
    }

    return (
      <div className="tw-space-y-2">
        {grades.map((grade, index) => (
          <div key={index} className="tw-bg-gray-800/50 tw-p-3 tw-rounded-lg">
            <div className="tw-flex tw-justify-between tw-items-center tw-mb-1">
              <span className="tw-text-yellow-200 tw-font-semibold">{grade.name}</span>
              <span className="tw-text-green-400 tw-font-bold">
                {grade.packs && grade.packs.length > 0
                  ? grade.packs.map(p => `₹${p.price} (${p.size}kg)`).join(", ")
                  : grade.price_inr
                    ? `₹${grade.price_inr}/kg`
                    : "Pack Pricing"
                }
              </span>
            </div>
            <div className="tw-grid tw-grid-cols-2 tw-gap-1 tw-text-xs">
              {grade.harvest && <div>Harvest: <span className="tw-text-gray-300">{grade.harvest}</span></div>}
              {grade.origin && <div>Origin: <span className="tw-text-gray-300">{grade.origin}</span></div>}
              {grade.stock && <div>Stock: <span className="tw-text-gray-300">{grade.stock}</span></div>}
              {grade.moq && <div>MOQ: <span className="tw-text-gray-300">{grade.moq} kg</span></div>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render product specifications
  const renderSpecs = (specs) => {
    if (!specs || Object.keys(specs).length === 0) {
      return <p className="tw-text-gray-400 tw-text-sm tw-italic">No specifications</p>;
    }

    return (
      <div className="tw-space-y-1 tw-mt-2">
        {Object.entries(specs).map(([key, value]) => (
          <div key={key} className="tw-flex tw-justify-between">
            <span className="tw-text-gray-400 tw-text-xs tw-capitalize">
              {key.replace(/([A-Z])/g, " $1")}:
            </span>
            <span className="tw-text-gray-300 tw-text-xs">{value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render order items
  const renderOrderItems = (items) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return <p className="tw-text-gray-400 tw-text-sm tw-italic">No items</p>;
    }

    return (
      <div className="tw-space-y-2">
        {items.map((item, index) => (
          <div key={index} className="tw-bg-gray-800/50 tw-p-3 tw-rounded-lg">
            <div className="tw-flex tw-justify-between tw-items-center">
              <div>
                <p className="tw-text-yellow-200 tw-font-semibold">{item.variety}</p>
                <p className="tw-text-gray-300 tw-text-sm">{item.grade}</p>
              </div>
              <div className="tw-text-right">
                <p className="tw-text-green-400 tw-font-bold">₹{item.price || 0}</p>
                <p className="tw-text-gray-300 tw-text-sm">{item.quantity}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render product/order card based on type
  const renderDataCard = (item, type = "product") => {
    if (!item) return null;

    // Render order card
    if (item.type === "order") {
      return (
        <div className="tw-bg-gray-900/60 tw-border tw-border-blue-700 tw-rounded-xl tw-p-4 tw-h-full">
          <div className="tw-flex tw-justify-between tw-items-start tw-mb-3">
            <div>
              <h4 className="tw-text-xl tw-font-bold tw-text-blue-300 tw-mb-1">
                {item.name}
              </h4>
              <span className="tw-bg-blue-900/50 tw-text-blue-300 tw-px-2 tw-py-1 tw-rounded tw-text-xs">
                Order
              </span>
            </div>
            <span className="tw-text-green-400 tw-font-bold">
              ₹{item.totalAmount || 0}
            </span>
          </div>

          <p className="tw-text-gray-300 tw-text-sm tw-mb-4">
            {item.description}
          </p>

          <div className="tw-mb-4">
            <h5 className="tw-text-blue-400 tw-font-semibold tw-mb-2">Order Items:</h5>
            {renderOrderItems(item.items)}
          </div>

          <div className="tw-flex tw-justify-between tw-items-center tw-text-xs tw-text-gray-400">
            <div>
              <span>Payment: {item.paymentMethod} ({item.paymentStatus})</span>
            </div>
            <div className="tw-text-right">
              <div>Rice: ₹{item.riceTotal || 0}</div>
              <div>Shipping: ₹{item.shippingCharge || 0}</div>
            </div>
          </div>
        </div>
      );
    }

    // Render bulk quote card
    if (item.type === "bulk_quote") {
      return (
        <div className="tw-bg-gray-900/60 tw-border tw-border-purple-700 tw-rounded-xl tw-p-4 tw-space-y-2">

          <h4 className="tw-text-purple-300 tw-font-bold tw-text-lg">
            {item.name}
          </h4>

          <p className="tw-text-gray-300">
            📦 Product: <span className="tw-text-white">{item.product}</span>
          </p>

          <p className="tw-text-gray-300">
            🏷 Grade: <span className="tw-text-white">{item.grade}</span>
          </p>

          <p className="tw-text-gray-300">
            ⚖ Quantity: <span className="tw-text-white">{item.quantity}</span>
          </p>

          {/* 💰 Pricing Breakdown */}
          <div className="tw-bg-black/30 tw-p-3 tw-rounded-lg tw-mt-2">
            <p className="tw-text-yellow-400 tw-font-semibold">💰 Price Details</p>

            <p className="tw-text-gray-300 text-sm">
              Grade Price: ${item.gradePrice?.toFixed(2)}
            </p>

            <p className="tw-text-gray-300 text-sm">
              Packing: ${item.packingPrice?.toFixed(2)}
            </p>

            <p className="tw-text-gray-300 text-sm">
              Freight: ${item.freightPrice?.toFixed(2)}
            </p>

            <p className="tw-text-green-400 tw-font-bold tw-mt-1">
              Total: ${item.totalPrice?.toFixed(2)}
            </p>
          </div>

          {/* 🚚 Logistics */}
          <div className="tw-text-gray-400 tw-text-sm">
            🚢 Port: {item.originPort}
          </div>

          <div className="tw-text-gray-400 tw-text-sm">
            🚛 Transport: {item.transportMode}
          </div>

          {/* 📍 Address */}
          <div className="tw-text-gray-400 tw-text-xs tw-mt-2">
            📍 {item.city}, {item.addressState}, {item.addressCountry}
          </div>

          {/* 📞 Contact */}
          <div className="tw-text-gray-500 tw-text-xs">
            📧 {item.email} | 📱 {item.phone}
          </div>

          {/* Status */}
          <div className="tw-flex tw-justify-between tw-items-center tw-mt-2">
            <span className="tw-text-xs tw-bg-yellow-500/20 tw-text-yellow-300 tw-px-2 tw-py-1 tw-rounded">
              {item.status}
            </span>

            <span className="tw-text-xs tw-text-gray-500">
              ID: {item.id}
            </span>
          </div>

        </div>
      );
    }

    // Determine border color based on comparison type
    const borderColor = type === "before"
      ? "tw-border-red-500"
      : type === "after"
        ? "tw-border-green-500"
        : "tw-border-yellow-700";

    return (
      <div className={`tw-bg-gray-900/60 tw-border-2 ${borderColor} tw-rounded-xl tw-p-4 tw-h-full`}>
        <div className="tw-flex tw-justify-between tw-items-start tw-mb-3">
          <div>
            <h4 className="tw-text-xl tw-font-bold tw-text-yellow-300 tw-mb-1">
              {item.name}
            </h4>
            {item.category && (
              <span className="tw-bg-yellow-900/50 tw-text-yellow-300 tw-px-2 tw-py-1 tw-rounded tw-text-xs">
                {item.category}
              </span>
            )}
          </div>
          {item.price && item.price !== "Price not set" && (
            <span className="tw-text-green-400 tw-font-bold">
              {item.price}
            </span>
          )}
        </div>

        {item.description && (
          <p className="tw-text-gray-300 tw-text-sm tw-mb-2">
            {item.description}
          </p>
        )}

        {item.hsn && (
          <p className="tw-text-gray-400 tw-text-sm tw-mb-2">
            <strong>HSN:</strong> {item.hsn}
          </p>
        )}

        <div className="tw-mb-4">
          <h5 className="tw-text-yellow-400 tw-font-semibold tw-mb-2">Grades ({item.grades?.length || 0}):</h5>
          {renderGrades(item.grades)}
        </div>

        {item.specs && Object.keys(item.specs).length > 0 && (
          <div className="tw-mb-4">
            <h5 className="tw-text-yellow-400 tw-font-semibold tw-mb-2">Specifications:</h5>
            {renderSpecs(item.specs)}
          </div>
        )}

        <div className="tw-flex tw-justify-between tw-items-center tw-text-xs tw-text-gray-400">
          <div>
            {item.updatedBy && <div>Updated by: {item.updatedBy}</div>}
            {item.updatedAt && <div>Updated at: {item.updatedAt}</div>}
          </div>
          <span>ID: {item.id}</span>
        </div>
      </div>
    );
  };

  // Render side-by-side comparison
  const renderSideBySideComparison = () => {
    const beforeItems = extractProductData(selected.before);
    const afterItems = extractProductData(selected.after);

    // For CREATE action
    if (selected.action === "CREATE") {
      return (
        <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
          <div>
            <h3 className="tw-text-red-400 tw-font-bold tw-text-xl tw-mb-4">
              Before (No Data)
            </h3>
            <div className="tw-bg-gray-900/50 tw-border tw-border-red-700 tw-rounded-xl tw-p-6 tw-text-center tw-h-full tw-flex tw-flex-col tw-items-center tw-justify-center">
              <div className="tw-text-4xl tw-mb-3">📭</div>
              <p className="tw-text-red-400 tw-text-lg tw-font-semibold">
                No Data Existed
              </p>
              <p className="tw-text-gray-400 tw-mt-2">
                This product was newly created.
              </p>
            </div>
          </div>

          <div>
            <h3 className="tw-text-green-400 tw-font-bold tw-text-xl tw-mb-4">
              After (New Product)
            </h3>
            {afterItems.length > 0 ? (
              <div className="tw-grid tw-grid-cols-1 tw-gap-4">
                {afterItems.map((item, index) => (
                  <div key={item.id + index}>
                    {renderDataCard(item, "after")}
                  </div>
                ))}
              </div>
            ) : (
              <div className="tw-bg-gray-900/50 tw-border tw-border-green-700 tw-rounded-xl tw-p-6 tw-text-center">
                <p className="tw-text-green-400 tw-text-lg tw-font-semibold">
                  No structured data available
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // For DELETE action
    if (selected.action === "DELETE") {
      return (
        <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
          <div>
            <h3 className="tw-text-red-400 tw-font-bold tw-text-xl tw-mb-4">
              Before (Deleted Product)
            </h3>
            {beforeItems.length > 0 ? (
              <div className="tw-grid tw-grid-cols-1 tw-gap-4">
                {beforeItems.map((item, index) => (
                  <div key={item.id + index}>
                    {renderDataCard(item, "before")}
                  </div>
                ))}
              </div>
            ) : (
              <div className="tw-bg-gray-900/50 tw-border tw-border-red-700 tw-rounded-xl tw-p-6 tw-text-center">
                <p className="tw-text-red-400 tw-text-lg tw-font-semibold">
                  No structured data available
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="tw-text-green-400 tw-font-bold tw-text-xl tw-mb-4">
              After (No Data)
            </h3>
            <div className="tw-bg-gray-900/50 tw-border tw-border-green-700 tw-rounded-xl tw-p-6 tw-text-center tw-h-full tw-flex tw-flex-col tw-items-center tw-justify-center">
              <div className="tw-text-4xl tw-mb-3">🗑️</div>
              <p className="tw-text-green-400 tw-text-lg tw-font-semibold">
                Product Deleted
              </p>
              <p className="tw-text-gray-400 tw-mt-2">
                This product was permanently removed.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // For UPDATE action (default)
    return (
      <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
        <div>
          <h3 className="tw-text-red-400 tw-font-bold tw-text-xl tw-mb-4 tw-flex tw-items-center">
            <span className="tw-mr-2">📄</span> Before Changes
            <span className="tw-ml-auto tw-text-sm tw-font-normal">
              {beforeItems.length} item{beforeItems.length !== 1 ? 's' : ''}
            </span>
          </h3>
          {beforeItems.length > 0 ? (
            <div className="tw-grid tw-grid-cols-1 tw-gap-4">
              {beforeItems.map((item, index) => (
                <div key={item.id + index}>
                  {renderDataCard(item, "before")}
                </div>
              ))}
            </div>
          ) : (
            <div className="tw-bg-gray-900/50 tw-border tw-border-red-700 tw-rounded-xl tw-p-6 tw-text-center">
              <p className="tw-text-red-400 tw-text-lg tw-font-semibold">
                No data before changes
              </p>
              <p className="tw-text-gray-400 tw-mt-2">
                No structured data available for comparison.
              </p>
            </div>
          )}
        </div>

        <div>
          <h3 className="tw-text-green-400 tw-font-bold tw-text-xl tw-mb-4 tw-flex tw-items-center">
            <span className="tw-mr-2">✨</span> After Changes
            <span className="tw-ml-auto tw-text-sm tw-font-normal">
              {afterItems.length} item{afterItems.length !== 1 ? 's' : ''}
            </span>
          </h3>
          {afterItems.length > 0 ? (
            <div className="tw-grid tw-grid-cols-1 tw-gap-4">
              {afterItems.map((item, index) => (
                <div key={item.id + index}>
                  {renderDataCard(item, "after")}
                </div>
              ))}
            </div>
          ) : (
            <div className="tw-bg-gray-900/50 tw-border tw-border-green-700 tw-rounded-xl tw-p-6 tw-text-center">
              <p className="tw-text-green-400 tw-text-lg tw-font-semibold">
                No data after changes
              </p>
              <p className="tw-text-gray-400 tw-mt-2">
                No structured data available for comparison.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render raw data view
  const renderRawData = () => {
    return (
      <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
        <div>
          <h3 className="tw-text-red-400 tw-font-bold tw-text-xl tw-mb-4">
            Before Changes (Raw Data)
          </h3>
          <div className="tw-bg-black tw-p-4 tw-rounded tw-overflow-auto">
            <pre className="tw-text-xs">
              {JSON.stringify(selected.before, null, 2)}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="tw-text-green-400 tw-font-bold tw-text-xl tw-mb-4">
            After Changes (Raw Data)
          </h3>
          <div className="tw-bg-black tw-p-4 tw-rounded tw-overflow-auto">
            <pre className="tw-text-xs">
              {JSON.stringify(selected.after, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="tw-p-6 tw-text-white">
      <h1 className="tw-text-3xl tw-font-bold tw-text-yellow-400 tw-mb-6">
        System History
      </h1>

      {loading ? (
        <div className="tw-flex tw-justify-center tw-items-center tw-py-12">
          <div className="tw-w-12 tw-h-12 tw-border-4 tw-border-yellow-400 tw-border-t-transparent tw-rounded-full tw-animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="tw-flex tw-justify-end tw-mb-4">
            <button
              onClick={exportToExcel}
              className="tw-bg-green-600 hover:tw-bg-green-700 tw-text-white tw-px-4 tw-py-2 tw-rounded"
            >
              Export to Excel
            </button>
          </div>
          <div className="tw-overflow-x-auto">
            <table className="tw-w-full tw-bg-black/40 tw-rounded-xl">
              <thead>
                <tr className="tw-bg-yellow-500 tw-text-black">
                  <th className="tw-p-3">Time</th>
                  <th className="tw-p-3">Entity</th>
                  <th className="tw-p-3">Action</th>
                  <th className="tw-p-3">Changed By</th>
                  <th className="tw-p-3">Path</th>
                  <th className="tw-p-3">View</th>
                </tr>
              </thead>

              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td colSpan="6" className="tw-text-center tw-p-6 tw-text-gray-400">
                      No history records found
                    </td>
                  </tr>
                )}

                {history.map((h) => (
                  <tr
                    key={h.id}
                    className="tw-border-b tw-border-gray-700 hover:tw-bg-white/5"
                  >
                    <td className="tw-p-3 tw-text-sm">
                      {new Date(h.timestamp).toLocaleString()}
                    </td>

                    <td className="tw-p-3 tw-font-semibold">
                      {h.entity || "SYSTEM"}
                    </td>

                    <td className="tw-p-3">
                      <span
                        className={`tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold ${getActionColor(
                          h.action || "SYSTEM"
                        )}`}
                      >
                        {h.action || "SYSTEM"}
                      </span>
                    </td>

                    <td className="tw-p-3 tw-text-sm">
                      {h.actor || "System"}
                    </td>

                    <td className="tw-p-3 tw-text-blue-400 tw-text-sm">
                      {h.path}
                    </td>

                    <td className="tw-p-3">
                      <button
                        onClick={() => {
                          setSelected(h);
                          setRawDataView(false);
                          notifyAdminModal(true);
                        }}
                        className="tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-px-3 tw-py-1 tw-rounded"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMore && (
              <div className="tw-text-center tw-mt-6">
                <button
                  onClick={loadMore}
                  className="tw-bg-yellow-500 hover:tw-bg-yellow-600 tw-text-black tw-px-6 tw-py-2 tw-rounded"
                >
                  Load More
                </button>
              </div>
            )}
          </div>

          {/* ================= MODAL ================= */}
          {selected && (
            <div className="tw-fixed tw-inset-0 tw-bg-black/70 tw-flex tw-justify-center tw-items-center tw-z-50 tw-p-4">
              <div className="tw-bg-[#0f172a] tw-w-full md:tw-w-[95%] lg:tw-w-[90%] tw-max-h-[90vh] tw-p-6 tw-rounded-xl ">
                {/* Header */}
                <div className="tw-flex tw-justify-between tw-items-start tw-mb-6">
                  <div>
                    <h2 className="tw-text-yellow-400 tw-text-2xl tw-mb-1">
                      History Details
                    </h2>
                    <div className="tw-text-gray-300 tw-space-y-1">
                      <p><span className="tw-text-yellow-300">Time:</span> {new Date(selected.timestamp).toLocaleString()}</p>
                      <p><span className="tw-text-yellow-300">Changed By:</span> {selected.actor || "System"}</p>
                      <p><span className="tw-text-yellow-300">Action:</span>
                        <span className={`tw-ml-2 tw-px-2 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold ${getActionColor(selected.action || "SYSTEM")}`}>
                          {selected.action || "SYSTEM"}
                        </span>
                      </p>
                      <p><span className="tw-text-yellow-300">Path:</span> {selected.path}</p>
                      <p><span className="tw-text-yellow-300">Entity:</span> {selected.entity || "SYSTEM"}</p>
                    </div>
                  </div>
                  <div className="tw-flex tw-gap-2">
                    <button
                      onClick={() => setRawDataView(!rawDataView)}
                      className="tw-bg-gray-700 hover:tw-bg-gray-600 tw-text-white tw-px-3 tw-py-1 tw-rounded tw-text-sm"
                    >
                      {rawDataView ? "📊 Card View" : "📝 Raw Data"}
                    </button>
                    <button
                      onClick={() => {
                        setSelected(null);
                        notifyAdminModal(false);
                      }}
                      className="tw-text-red-400 hover:tw-text-red-300 tw-text-2xl"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="tw-max-h-[60vh] tw-overflow-y-auto tw-pr-2">
                  {rawDataView ? (
                    // Raw Data View (Side by Side)
                    renderRawData()
                  ) : (
                    // Card View (Side by Side)
                    renderSideBySideComparison()
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}