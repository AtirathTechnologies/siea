// ProductsAdmin.jsx – WITH SMART HISTORY DIFF VIEWER
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { ref, onValue, update, remove, set } from "firebase/database";
import { auth, logHistory } from "../../firebase";

export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [expandedGrades, setExpandedGrades] = useState({});
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState(null);
  const addFormRef = React.useRef(null);
  const [loading, setLoading] = useState(true);


  const emptyProduct = {
    name: { en: "", hi: "", te: "", ur: "", es: "", fr: "" },
    desc: { en: "", hi: "", te: "", ur: "", es: "", fr: "" },
    price: "",
    image: "",
    category: "Basmati Rice",
    packs: [1, 5],
    grades: [],
    hsn: "",
    specs: {
      grainLength: "",
      moisture: "",
      broken: "",
      aroma: "",
      color: "",
      origin: "",
      packing: ""
    }
  };


  const calculatePriceRange = (grades) => {
    if (!grades || grades.length === 0) {
      return "₹0-0";
    }

    let allPrices = [];
    let isPackBased = false;

    grades.forEach(g => {
      // ✅ SIEA (price_inr)
      if (g.price_inr !== undefined) {
        allPrices.push((Number(g.price_inr) || 0) * 100);
      }

      // ✅ AANAK (packs)
      if (g.packs && Array.isArray(g.packs)) {
        isPackBased = true;
        g.packs.forEach(p => {
          allPrices.push(Number(p.price) || 0);
        });
      }
    });

    if (allPrices.length === 0) return "₹0-0";

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);

    // ✅ dynamic unit
    const unit = isPackBased ? "per packs" : "per qtls";

    return `₹${minPrice.toLocaleString('en-IN')}-${maxPrice.toLocaleString('en-IN')} ${unit}`;
  };

  useEffect(() => {
    const prodRef = ref(db, "products");

    const unsubscribe = onValue(prodRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        let productsArray = [];

        Object.entries(data).forEach(([brand, brandProducts]) => {
          Object.entries(brandProducts).forEach(([key, product]) => {
            productsArray.push({
              firebaseKey: `${brand}/${key}`,
              id: product.id || key,
              brand,
              ...product,
              price: calculatePriceRange(product.grades || [])
            });
          });
        });

        setProducts(productsArray);
      } else {
        setProducts([]);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // ✅ cleanup
  }, []);

  const toggleGrades = (key) => {
    setExpandedGrades(prev => ({ ...prev, [key]: !prev[key] }));
  };


  const startEdit = (product) => {
    if (product === "new") {
      setEditing("new");
      setForm({ ...emptyProduct, brand: "SIEA" });

      setTimeout(() => {
        addFormRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    else {
      setEditing(product.firebaseKey);
      // Make a fresh copy of the product for editing
      const productCopy = JSON.parse(JSON.stringify(product));
      const calculatedPrice = productCopy.grades && productCopy.grades.length > 0
        ? calculatePriceRange(productCopy.grades)
        : productCopy.price || "";

      setForm({
        ...productCopy,
        price: calculatedPrice
      });

      setExpandedGrades(prev => ({
        ...prev,
        [product.firebaseKey]: true
      }));
    }
  };

  const getNextProductKey = (products) => {
    if (!products || products.length === 0) return "1";

    const numericIds = products
      .map(p => parseInt(p.id)) // ✅ use only id
      .filter(n => !isNaN(n));

    const maxId = Math.max(...numericIds, 0);
    return String(maxId + 1);
  };

  const updateFormWithGrades = (newGrades) => {
    const calculatedPrice = calculatePriceRange(newGrades);
    setForm(prev => ({
      ...prev,
      grades: newGrades,
      price: calculatedPrice
    }));
  };

  // Smart diff function - shows only what changed
  const getChangedFields = (before, after) => {
    const changes = [];

    if (!before || !after) return changes;

    const allKeys = new Set([
      ...Object.keys(before),
      ...Object.keys(after)
    ]);

    allKeys.forEach(key => {
      // Special handling for nested objects
      if (key === 'name' || key === 'desc') {
        const beforeName = before[key] || {};
        const afterName = after[key] || {};
        const nameKeys = new Set([...Object.keys(beforeName), ...Object.keys(afterName)]);

        nameKeys.forEach(lang => {
          if (beforeName[lang] !== afterName[lang]) {
            changes.push({
              field: `${key}.${lang}`,
              from: beforeName[lang] || "(empty)",
              to: afterName[lang] || "(empty)",
              type: "text"
            });
          }
        });
      }
      else if (key === 'grades') {
        const beforeGrades = before[key] || [];
        const afterGrades = after[key] || [];

        // Check if grades array changed
        if (JSON.stringify(beforeGrades) !== JSON.stringify(afterGrades)) {
          const addedGrades = afterGrades.filter(grade =>
            !beforeGrades.some(bg => JSON.stringify(bg) === JSON.stringify(grade))
          );
          const removedGrades = beforeGrades.filter(grade =>
            !afterGrades.some(ag => JSON.stringify(ag) === JSON.stringify(grade))
          );
          const updatedGrades = [];

          // Check for updated grades
          afterGrades.forEach((ag, index) => {
            const bg = beforeGrades[index];
            if (bg && JSON.stringify(ag) !== JSON.stringify(bg)) {
              // Find specific field changes within the grade
              Object.keys(ag).forEach(gradeKey => {
                if (ag[gradeKey] !== bg[gradeKey]) {
                  updatedGrades.push({
                    grade: ag.grade || bg.grade || `Grade ${index + 1}`,
                    field: gradeKey,
                    from: bg[gradeKey],
                    to: ag[gradeKey]
                  });
                }
              });
            }
          });

          if (addedGrades.length > 0) {
            changes.push({
              field: "grades",
              action: "added",
              count: addedGrades.length,
              details: addedGrades.map(g => g.grade || "New Grade")
            });
          }

          if (removedGrades.length > 0) {
            changes.push({
              field: "grades",
              action: "removed",
              count: removedGrades.length,
              details: removedGrades.map(g => g.grade || "Deleted Grade")
            });
          }

          if (updatedGrades.length > 0) {
            changes.push({
              field: "grades",
              action: "updated",
              count: updatedGrades.length,
              details: updatedGrades
            });
          }
        }
      }
      else if (key === 'price') {
        // Price is calculated from grades, so ignore price changes
        return;
      }
      else if (typeof before[key] === 'object' && typeof after[key] === 'object') {
        // For other objects, compare JSON strings
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          changes.push({
            field: key,
            from: JSON.stringify(before[key], null, 2),
            to: JSON.stringify(after[key], null, 2),
            type: "object"
          });
        }
      }
      else {
        // For simple values
        if (before[key] !== after[key]) {
          changes.push({
            field: key,
            from: before[key] !== undefined ? String(before[key]) : "(not set)",
            to: after[key] !== undefined ? String(after[key]) : "(not set)",
            type: typeof before[key]
          });
        }
      }
    });

    return changes;
  };

  const saveProduct = async () => {
    const { firebaseKey, id } = form;

    if (!firebaseKey) {
      alert("Error: Product key not found!");
      return;
    }

    const foundProduct = products.find(p => p.firebaseKey === firebaseKey);

    if (!foundProduct) {
      alert("❌ Product not found!");
      return;
    }

    const originalProduct = JSON.parse(JSON.stringify(foundProduct));

    // Prepare the new data
    const finalForm = {
      ...form,
      price: calculatePriceRange(form.grades || []),
      updatedAt: Date.now(),
      updatedBy: auth.currentUser?.email || "Unknown"
    };

    // Remove firebaseKey from data before saving
    const { firebaseKey: _, ...dataToSave } = finalForm;

    try {
      const user = auth.currentUser;

      // Get only changed fields for history
      const changes = getChangedFields(originalProduct, dataToSave);

      await logHistory({
        path: `products/${firebaseKey}`,
        entity: "PRODUCT",
        action: "UPDATE",
        before: originalProduct, // Original unchanged data
        after: dataToSave, // New modified data
        changes: changes,
        actor: user?.email || "Unknown",
        actorUid: user?.uid || null,
        actorRole: "admin"
      });

      await update(ref(db, `products/${firebaseKey}`), dataToSave);
      alert("✅ Product saved successfully!");
      setEditing(null);
      setExpandedGrades(prev => ({ ...prev, [firebaseKey]: false }));
    } catch (error) {
      console.error("Error saving product:", error);
      alert("❌ Error saving product: " + error.message);
    }
  };

  const addProduct = async () => {
    const brand = form.brand || "SIEA"; // default

    const brandProducts = products.filter(p => p.brand === brand);
    const newKey = getNextProductKey(brandProducts);

    const finalForm = {
      ...form,
      id: newKey,
      price: calculatePriceRange(form.grades || []),
      createdAt: Date.now(),
      createdBy: auth.currentUser?.email || "Unknown"
    };

    try {
      await set(ref(db, `products/${brand}/${newKey}`), finalForm);
      alert("✅ New product added!");
      setEditing(null);
    } catch (error) {
      console.error(error);
    }
  };



  const deleteProduct = async (firebaseKey, productId) => {
    if (window.confirm("⚠️ Delete this product permanently?")) {
      try {
        const user = auth.currentUser;
        // DEEP COPY of the product to delete
        const productToDelete = JSON.parse(JSON.stringify(
          products.find(p => p.firebaseKey === firebaseKey)
        ));

        await logHistory({
          path: `products/${firebaseKey}`,
          entity: "PRODUCT",
          action: "DELETE",
          before: productToDelete, // Original product data
          after: null, // Null after deletion
          actor: user?.email || "Unknown",
          actorUid: user?.uid || null,
          actorRole: "admin"
        });

        await remove(ref(db, `products/${firebaseKey}`));
        alert("🗑️ Product deleted!");
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("❌ Error deleting product: " + error.message);
      }
    }
  };

  const addGrade = () => {
    const isAANAK = form.brand === "AANAK";

    const newGrade = isAANAK
      ? {
        grade: "New Grade",
        packs: [{ size: 5, price: 0 }],
        moq: 5000,
        origin: "Punjab",
        stock: "Medium",
      }
      : {
        grade: "New Grade",
        price_inr: 100,
        moq: 5000,
        origin: "Punjab",
        stock: "Medium",
      };

    const updatedGrades = [...(form.grades || []), newGrade];
    updateFormWithGrades(updatedGrades);
  };

  const isPackBased = (grade) => {
    return Array.isArray(grade?.packs) && grade.packs.length > 0;
  };



  const updateGrade = (index, field, value) => {
    const updatedGrades = [...form.grades];
    updatedGrades[index][field] = value;
    updateFormWithGrades(updatedGrades);
  };

  const deleteGrade = (index) => {
    const updatedGrades = form.grades.filter((_, i) => i !== index);
    updateFormWithGrades(updatedGrades);
  };

  const cancelEdit = () => {
    const currentKey = editing; // ✅ capture first
    setEditing(null);

    if (currentKey && currentKey !== "new") {
      setExpandedGrades(prev => ({ ...prev, [currentKey]: false }));
    }
  };

  const renderPricePreview = (grades) => {
    if (!grades || grades.length === 0) {
      return (
        <span style={{ color: "#888", fontStyle: "italic", fontSize: "14px" }}>
          No grades added
        </span>
      );
    }

    const prices = [];
    let isPackBased = false;

    grades.forEach(g => {
      // ✅ SIEA price (₹/kg → convert to quintal)
      if (g.price_inr !== undefined) {
        const price = Number(g.price_inr);
        if (!isNaN(price) && price > 0) {
          prices.push(price * 100);
        }
      }

      // ✅ AANAK pack prices
      if (g.packs && Array.isArray(g.packs)) {
        isPackBased = true;
        g.packs.forEach(p => {
          const price = Number(p.price);
          if (!isNaN(price) && price > 0) {
            prices.push(price);
          }
        });
      }
    });

    // ✅ CRITICAL FIX (no crash)
    if (prices.length === 0) {
      return (
        <span style={{ color: "#888", fontStyle: "italic", fontSize: "14px" }}>
          No valid prices
        </span>
      );
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const unit = isPackBased ? "per packs" : "per qtls";

    return (
      <div
        style={{
          marginTop: 10,
          padding: 10,
          background: "#1a1a1a",
          borderRadius: 8,
          border: "1px dashed #444",
          fontSize: "14px",
        }}
      >
        <div style={{ fontSize: 13, color: "#aaa" }}>💰 Price Preview</div>

        <div
          style={{
            fontSize: 16,
            fontWeight: "bold",
            color: "#FFD700",
            marginTop: 4,
          }}
        >
          ₹{minPrice.toLocaleString("en-IN")} - ₹{maxPrice.toLocaleString("en-IN")}{" "}
          {unit}
        </div>

        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          Based on {grades.length} grade{grades.length !== 1 ? "s" : ""} •{" "}
          {minPrice === maxPrice ? "Fixed price" : "Price range"}
        </div>
      </div>
    );
  };

  const renderEditButtons = (product) => {
    return (
      <div className="
        tw-flex 
        tw-flex-col sm:tw-flex-row 
        tw-gap-2 sm:tw-gap-3 md:tw-gap-4
        tw-mt-2 sm:tw-mt-0
      ">
        {editing === product.firebaseKey ? (
          <>
            <button onClick={saveProduct} style={saveBtn}>💾 Save</button>
            <button onClick={cancelEdit} style={cancelBtn}>❌ Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => startEdit(product)} style={editBtn}>✏️ Edit</button>
            <button onClick={() => deleteProduct(product.firebaseKey, product.id)} style={deleteBtn}>🗑️ Delete</button>
            <button
              onClick={() => toggleGrades(product.firebaseKey)}
              style={gradesBtn}
            >
              {expandedGrades[product.firebaseKey] ? "📕 Hide" : "📘 Show"} Grades ({product.grades?.length || 0})
            </button>
          </>
        )}
      </div>
    );
  };

  // Smart History Modal - Shows only changed data
  const SmartHistoryModal = ({ record, onClose }) => {
    if (!record) return null;

    const renderChangedFields = () => {
      if (record.action === "CREATE") {
        return (
          <div style={{
            background: "rgba(76, 175, 80, 0.1)",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #4CAF50"
          }}>
            <h4 style={{ color: "#4CAF50", marginBottom: "15px" }}>
              🎉 New Product Created
            </h4>
            <div style={{ fontSize: "14px", color: "#ccc" }}>
              <p>A new product was created with the following initial data:</p>
              <div style={{ marginTop: "10px" }}>
                <strong>Product Name:</strong> {record.after?.name?.en || "Unnamed"}
              </div>
              {record.after?.category && (
                <div style={{ marginTop: "5px" }}>
                  <strong>Category:</strong> {record.after.category}
                </div>
              )}
              {record.after?.grades?.length > 0 && (
                <div style={{ marginTop: "5px" }}>
                  <strong>Grades Added:</strong> {record.after.grades.length}
                </div>
              )}
            </div>
          </div>
        );
      }

      if (record.action === "DELETE") {
        return (
          <div style={{
            background: "rgba(244, 67, 54, 0.1)",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #f44336"
          }}>
            <h4 style={{ color: "#f44336", marginBottom: "15px" }}>
              🗑️ Product Deleted
            </h4>
            <div style={{ fontSize: "14px", color: "#ccc" }}>
              <p>The following product was permanently deleted:</p>
              <div style={{ marginTop: "10px" }}>
                <strong>Product Name:</strong> {record.before?.name?.en || "Unnamed"}
              </div>
              {record.before?.category && (
                <div style={{ marginTop: "5px" }}>
                  <strong>Category:</strong> {record.before.category}
                </div>
              )}
              {record.before?.grades?.length > 0 && (
                <div style={{ marginTop: "5px" }}>
                  <strong>Grades Lost:</strong> {record.before.grades.length} grade(s)
                </div>
              )}
            </div>
          </div>
        );
      }

      if (record.action === "UPDATE") {
        // Use stored changes or calculate them
        const changes = record.changes || getChangedFields(record.before, record.after);

        if (changes.length === 0) {
          return (
            <div style={{
              background: "rgba(33, 150, 243, 0.1)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #2196F3"
            }}>
              <h4 style={{ color: "#2196F3", marginBottom: "15px" }}>
                📝 Minor Update
              </h4>
              <div style={{ fontSize: "14px", color: "#ccc" }}>
                <p>Product was updated with no significant field changes detected.</p>
                <p style={{ fontSize: "12px", color: "#888", marginTop: "10px" }}>
                  <em>This could be a price recalculation or metadata update.</em>
                </p>
              </div>
            </div>
          );
        }

        return (
          <div style={{
            background: "rgba(33, 150, 243, 0.1)",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #2196F3"
          }}>
            <h4 style={{ color: "#2196F3", marginBottom: "15px" }}>
              📝 {changes.length} Change{changes.length !== 1 ? 's' : ''} Detected
            </h4>

            <div style={{ marginTop: "15px" }}>
              {changes.map((change, index) => {
                // Handle grade changes specially
                if (change.field === "grades") {
                  return (
                    <div key={index} style={{
                      marginBottom: "15px",
                      padding: "15px",
                      background: "#1a1a1a",
                      borderRadius: "6px",
                      borderLeft: "3px solid #FFD700"
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px"
                      }}>
                        <div style={{
                          background: "#FFD700",
                          color: "#000",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "bold"
                        }}>
                          {index + 1}
                        </div>
                        <strong style={{ color: "#FFD700" }}>
                          {change.action === "added" ? "➕ Grades Added" :
                            change.action === "removed" ? "➖ Grades Removed" :
                              "✏️ Grades Updated"}
                        </strong>
                      </div>

                      <div style={{ fontSize: "14px", color: "#ccc", marginLeft: "34px" }}>
                        {change.action === "added" && (
                          <div>
                            <strong>Added {change.count} grade{change.count !== 1 ? 's' : ''}:</strong>
                            <ul style={{ marginTop: "5px", marginLeft: "20px" }}>
                              {change.details.map((gradeName, i) => (
                                <li key={i}>{gradeName}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {change.action === "removed" && (
                          <div>
                            <strong>Removed {change.count} grade{change.count !== 1 ? 's' : ''}:</strong>
                            <ul style={{ marginTop: "5px", marginLeft: "20px" }}>
                              {change.details.map((gradeName, i) => (
                                <li key={i}>{gradeName}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {change.action === "updated" && (
                          <div>
                            <strong>Updated {change.count} grade field{change.count !== 1 ? 's' : ''}:</strong>
                            <div style={{ marginTop: "10px" }}>
                              {change.details.map((gradeChange, i) => (
                                <div key={i} style={{
                                  marginBottom: "8px",
                                  padding: "8px",
                                  background: "#222",
                                  borderRadius: "4px"
                                }}>
                                  <strong style={{ color: "#FFD700" }}>{gradeChange.grade}</strong>
                                  <div style={{ marginTop: "5px", fontSize: "13px" }}>
                                    <span style={{ color: "#f55" }}>{gradeChange.field}: </span>
                                    <span style={{ color: "#ccc" }}>{gradeChange.from} → </span>
                                    <span style={{ color: "#4CAF50" }}>{gradeChange.to}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Regular field changes
                return (
                  <div key={index} style={{
                    marginBottom: "15px",
                    padding: "15px",
                    background: "#1a1a1a",
                    borderRadius: "6px",
                    borderLeft: "3px solid #FFD700"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px"
                    }}>
                      <div style={{
                        background: "#FFD700",
                        color: "#000",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}>
                        {index + 1}
                      </div>
                      <strong style={{ color: "#FFD700" }}>
                        {change.field}
                      </strong>
                    </div>

                    <div style={{ fontSize: "14px", color: "#ccc", marginLeft: "34px" }}>
                      <div style={{ marginBottom: "5px" }}>
                        <span style={{ color: "#f55", fontWeight: "bold" }}>Before: </span>
                        <span style={{
                          background: "rgba(244, 67, 54, 0.2)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "13px"
                        }}>
                          {change.from}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "#4CAF50", fontWeight: "bold" }}>After: </span>
                        <span style={{
                          background: "rgba(76, 175, 80, 0.2)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "13px"
                        }}>
                          {change.to}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px"
      }}>
        <div style={{
          background: "#111",
          border: "2px solid #FFD700",
          borderRadius: "12px",
          padding: "25px",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          color: "#FFD700"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}>
            <h2 style={{ margin: 0, fontSize: "20px" }}>
              🔍 Change Details
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#FFD700",
                fontSize: "24px",
                cursor: "pointer"
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            marginBottom: "20px",
            padding: "15px",
            background: "#1a1a1a",
            borderRadius: "8px"
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
              fontSize: "14px"
            }}>
              <div>
                <strong>Action:</strong>
                <span style={{
                  marginLeft: "8px",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  background: record.action === "CREATE" ? "#4CAF50" :
                    record.action === "DELETE" ? "#f44336" :
                      "#2196F3",
                  color: "#fff"
                }}>
                  {record.action}
                </span>
              </div>
              <div>
                <strong>Changed By:</strong> {record.actor}
              </div>
              <div>
                <strong>Date:</strong> {new Date(record.timestamp).toLocaleDateString()}
              </div>
              <div>
                <strong>Time:</strong> {new Date(record.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {renderChangedFields()}

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 30px",
                background: "#FFD700",
                color: "#000",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  const renderSpecsEditor = () => (
    <div style={{
      marginTop: 16,
      padding: 16,
      background: "#1a1a1a",
      borderRadius: 10,
      border: "1px dashed #444"
    }}>
      <h4 style={{ marginBottom: 12 }}>📋 Product Specifications</h4>

      {Object.entries(form.specs || {}).map(([key, value]) => (
        <input
          key={key}
          placeholder={key.replace(/([A-Z])/g, " $1")}
          value={value}
          onChange={(e) =>
            setForm({
              ...form,
              specs: { ...form.specs, [key]: e.target.value }
            })
          }
          style={{ ...inputStyle, marginBottom: 8 }}
        />
      ))}
    </div>
  );


  return (
    <div style={{
      padding: "16px 12px",
      background: "#000",
      color: "#FFD700",
      minHeight: "100vh",
      overflowX: "hidden"
    }}>
      <h1 style={{
        marginBottom: 20,
        fontSize: "clamp(20px, 5vw, 28px)",
        textAlign: "center"
      }}>
        📦 Manage Products
      </h1>

      <div style={{
        textAlign: "center",
        marginBottom: 30,
        display: "flex",
        justifyContent: "center",
        gap: "20px",
        flexWrap: "wrap"
      }}>
        <button onClick={() => startEdit("new")} style={addBtnStyle}>
          ➕ Add New Product
        </button>

        <button
          onClick={() => window.location.href = "history"}
          style={{
            padding: "14px 28px",
            background: "transparent",
            color: "#FFD700",
            fontWeight: "bold",
            border: "2px solid #FFD700",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: "16px",
            minWidth: "250px"
          }}
        >
          📜 View Product History
        </button>
      </div>

      <div style={{ marginTop: 30 }}>
        {products.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            background: "#111",
            borderRadius: "12px",
            border: "2px dashed #333"
          }}>
            <div style={{ fontSize: "24px", color: "#FFD700", marginBottom: "10px" }}>
              📭 No Products Found
            </div>
            <p style={{ color: "#aaa", marginBottom: "20px" }}>
              Click "Add New Product" to create your first product.
            </p>
            <button onClick={() => startEdit("new")} style={addBtnStyle}>
              ➕ Add Your First Product
            </button>
          </div>
        ) : (
          products.map((p) => (
            <div key={p.firebaseKey || p.id} style={productCard}>
              {/* Main Product Row */}
              <div className="
                tw-flex 
                tw-flex-col sm:tw-flex-row 
                tw-items-start sm:tw-items-center 
                tw-gap-3 sm:tw-gap-4 md:tw-gap-6 
                tw-p-3 sm:tw-p-4 md:tw-p-6
              ">
                <img
                  src={
                    p.image
                      ? p.image.startsWith("/")
                        ? p.image
                        : "/" + p.image
                      : "https://via.placeholder.com/80"
                  }
                  alt={p.name?.en || "Product"}
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: 8,
                    border: "2px solid #FFD700",
                    objectFit: "cover",
                    alignSelf: "center"
                  }}
                />



                <div style={{ flex: 1, minWidth: 0 }}>
                  {editing === p.firebaseKey ? (
                    <>
                      <input
                        value={form.name?.en || ""}
                        onChange={(e) =>
                          setForm({ ...form, name: { ...form.name, en: e.target.value } })
                        }
                        style={inputStyle}
                        placeholder="Product Name (EN)"
                      />

                      {/* ✅ HSN INPUT — EDIT MODE ONLY */}
                      <input
                        placeholder="HSN Code"
                        value={form.hsn || ""}
                        onChange={(e) => setForm({ ...form, hsn: e.target.value })}
                        style={inputStyle}
                      />
                    </>
                  ) : (

                    <>
                      <h3 style={{
                        margin: 0,
                        color: "#FFD700",
                        fontSize: "clamp(16px, 4vw, 20px)"
                      }}>
                        {p.name?.en || "No Name"}
                      </h3>

                      <p style={{ margin: "4px 0", color: "#aaa", fontSize: "14px" }}>
                        <strong>💰 Price:</strong> {p.price || "No price set"}
                      </p>

                      {/* ✅ THIS IS THE EXACT PLACE */}
                      {p.hsn && (
                        <p style={{ fontSize: "13px", color: "#aaa", marginTop: 4 }}>
                          <strong>HSN:</strong> {p.hsn}
                        </p>
                      )}

                      <p style={{
                        margin: "8px 0",
                        fontSize: "14px",
                        color: "#ccc",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {p.desc?.en?.slice(0, 100) || "No description"}...
                      </p>
                    </>
                  )}

                </div>

                {renderEditButtons(p)}
              </div>

              {/* Grades Section */}
              {(expandedGrades[p.firebaseKey] || editing === p.firebaseKey) && (
                <div style={{
                  padding: "16px",
                  borderTop: "1px dashed #333",
                  overflowX: "auto"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "15px 0",
                    flexWrap: "wrap",
                    gap: "10px"
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: "18px"
                    }}>
                      📊 Grades
                    </h4>
                    {editing === p.firebaseKey && (
                      <button onClick={addGrade} style={addGradeBtn}>
                        ➕ Add Grade
                      </button>
                    )}
                  </div>

                  {editing === p.firebaseKey ? (
                    <div>
                      {renderPricePreview(form.grades)}
                      {renderSpecsEditor()}


                      {form.grades?.length > 0 ? (
                        <div className="tw-overflow-x-auto">
                          <div className="tw-min-w-[600px]">
                            {form.grades.map((g, i) => (
                              <div key={i} style={gradeRow}>
                                <input
                                  value={g.grade}
                                  onChange={(e) => updateGrade(i, "grade", e.target.value)}
                                  style={gradeInput}
                                  placeholder="Grade Name"
                                />
                                <input
                                  value={g.origin}
                                  onChange={(e) => updateGrade(i, "origin", e.target.value)}
                                  style={gradeInput}
                                  placeholder="Origin"
                                />
                                {isPackBased(g) ? (
                                  <div style={{ width: "100%" }}>
                                    {g.packs.map((p, pi) => (
                                      <div key={pi} style={{ display: "flex", gap: 6, marginBottom: 6 }}>

                                        <input
                                          type="number"
                                          value={p.size}
                                          placeholder="Size (kg)"
                                          onChange={(e) => {
                                            const updated = [...form.grades];
                                            updated[i].packs[pi].size = Number(e.target.value);
                                            updateFormWithGrades(updated);
                                          }}
                                          style={{ ...gradeInput, width: "40%" }}
                                        />

                                        <input
                                          type="number"
                                          value={p.price}
                                          placeholder="Price"
                                          onChange={(e) => {
                                            const updated = [...form.grades];
                                            updated[i].packs[pi].price = Number(e.target.value);
                                            updateFormWithGrades(updated);
                                          }}
                                          style={{ ...gradeInput, width: "60%" }}
                                        />

                                      </div>
                                    ))}

                                    <button
                                      onClick={() => {
                                        const updated = [...form.grades];
                                        updated[i].packs.push({ size: 5, price: 0 });
                                        updateFormWithGrades(updated);
                                      }}
                                      style={addGradeBtn}
                                    >
                                      ➕ Add Pack
                                    </button>
                                  </div>
                                ) : (
                                  <input
                                    type="number"
                                    value={g.price_inr}
                                    onChange={(e) => updateGrade(i, "price_inr", Number(e.target.value) || 0)}
                                    placeholder="Price (₹/kg)"
                                    style={gradeInput}
                                  />
                                )}
                                <input
                                  type="number"
                                  value={g.moq}
                                  onChange={(e) => updateGrade(i, "moq", Number(e.target.value) || 0)}
                                  style={gradeInput}
                                  placeholder="MOQ"
                                />
                                <select
                                  value={g.stock}
                                  onChange={(e) => updateGrade(i, "stock", e.target.value)}
                                  style={gradeInput}
                                >
                                  <option>Low</option>
                                  <option>Medium</option>
                                  <option>High</option>
                                </select>
                                <button onClick={() => deleteGrade(i)} style={deleteSmallBtn}>
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: "#888", fontStyle: "italic", textAlign: "center", padding: 20 }}>
                          No grades added yet.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="
                      tw-grid 
                      tw-grid-cols-1 
                      sm:tw-grid-cols-2 
                      lg:tw-grid-cols-3 
                      xl:tw-grid-cols-4
                      tw-gap-3 sm:tw-gap-4
                    ">
                      {p.grades?.map((g, i) => (
                        <div key={i} style={gradeCard}>
                          <strong style={{
                            color: "#FFD700",
                            fontSize: "16px",
                            wordBreak: "break-word"
                          }}>
                            {g.grade}
                          </strong>
                          <div style={{ fontSize: "14px", color: "#ccc", marginTop: 8 }}>
                            <div>📍 Origin: {g.origin}</div>
                            <div>
                              💰 Price: <strong style={{ color: "#FFD700" }}>
                                {g.price_inr !== undefined
                                  ? `₹${g.price_inr}/kg`
                                  : g.packs && g.packs.length > 0
                                    ? g.packs.map(p => `₹${p.price} (${p.size}kg)`).join(", ")
                                    : "N/A"
                                }
                              </strong>
                            </div>
                            <div>📦 MOQ: {g.moq} qtl</div>
                            <div>
                              📊 Stock: <span style={{
                                color: g.stock === "High" ? "#4CAF50" :
                                  g.stock === "Low" ? "#f55" : "#FFD700",
                                fontWeight: "bold"
                              }}>
                                {g.stock}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Add New Product Form */}
        {editing === "new" && (
          <div ref={addFormRef} style={productCard}>
            <h3 style={{ marginBottom: 20, fontSize: "20px" }}>➕ Add New Product</h3>

            <input
              placeholder="Name (EN)"
              value={form.name?.en || ""}
              onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
              style={inputStyle}
            />

            <input
              placeholder="HSN Code"
              value={form.hsn || ""}
              onChange={(e) => setForm({ ...form, hsn: e.target.value })}
              style={inputStyle}
            />
            <select
              value={form.brand || "SIEA"}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              style={inputStyle}
            >
              <option value="SIEA">SIEA</option>
              <option value="AANAK">AANAK</option>
            </select>


            {renderPricePreview(form.grades)}
            {renderSpecsEditor()}





            <input
              placeholder="Image URL"
              value={form.image || ""}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              style={{ ...inputStyle, marginTop: 10 }}
            />

            <textarea
              placeholder="Description (EN)"
              value={form.desc?.en || ""}
              onChange={(e) => setForm({ ...form, desc: { ...form.desc, en: e.target.value } })}
              style={{ ...inputStyle, marginTop: 10, height: 80 }}
            />

            <div style={{ marginTop: 20 }}>
              <button onClick={addGrade} style={addGradeBtn}>
                ➕ Add Grade
              </button>

              <div className="tw-overflow-x-auto tw-mt-4">
                <div className="tw-min-w-[600px]">
                  {form.grades?.map((g, i) => (
                    <div key={i} style={gradeRow}>
                      <input
                        value={g.grade}
                        onChange={(e) => updateGrade(i, "grade", e.target.value)}
                        style={gradeInput}
                        placeholder="Grade Name"
                      />
                      <input
                        value={g.origin}
                        onChange={(e) => updateGrade(i, "origin", e.target.value)}
                        style={gradeInput}
                        placeholder="Origin"
                      />
                      {isPackBased(g) ? (
                        <div style={{ width: "100%" }}>
                          {g.packs.map((p, pi) => (
                            <div key={pi} style={{ display: "flex", gap: 6, marginBottom: 6 }}>

                              <input
                                type="number"
                                value={p.size}
                                placeholder="Size (kg)"
                                onChange={(e) => {
                                  const updated = [...form.grades];
                                  updated[i].packs[pi].size = Number(e.target.value);
                                  updateFormWithGrades(updated);
                                }}
                                style={{ ...gradeInput, width: "40%" }}
                              />

                              <input
                                type="number"
                                value={p.price}
                                placeholder="Price"
                                onChange={(e) => {
                                  const updated = [...form.grades];
                                  updated[i].packs[pi].price = Number(e.target.value);
                                  updateFormWithGrades(updated);
                                }}
                                style={{ ...gradeInput, width: "60%" }}
                              />

                            </div>
                          ))}

                          <button
                            onClick={() => {
                              const updated = [...form.grades];
                              updated[i].packs.push({ size: 5, price: 0 });
                              updateFormWithGrades(updated);
                            }}
                            style={addGradeBtn}
                          >
                            ➕ Add Pack
                          </button>
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={g.price_inr}
                          onChange={(e) => updateGrade(i, "price_inr", Number(e.target.value) || 0)}
                          placeholder="Price (₹/kg)"
                          style={gradeInput}
                        />
                      )}
                      <input
                        type="number"
                        value={g.moq}
                        onChange={(e) => updateGrade(i, "moq", Number(e.target.value) || 0)}
                        style={gradeInput}
                        placeholder="MOQ"
                      />
                      <select
                        value={g.stock}
                        onChange={(e) => updateGrade(i, "stock", e.target.value)}
                        style={gradeInput}
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                      <button onClick={() => deleteGrade(i)} style={deleteSmallBtn}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 20,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "center"
            }}>
              <button onClick={addProduct} style={saveBtn}>
                ✅ Add Product
              </button>
              <button onClick={cancelEdit} style={cancelBtn}>
                ❌ Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Smart History Modal */}
      {selectedHistoryRecord && (
        <SmartHistoryModal
          record={selectedHistoryRecord}
          onClose={() => setSelectedHistoryRecord(null)}
        />
      )}
    </div>
  );
}

/* ================== STYLES ================== */
const productCard = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: 12,
  marginBottom: 20,
  overflow: "hidden",
  boxShadow: "0 4px 15px rgba(255,215,0,0.1)",
};

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  background: "#222",
  border: "1px solid #FFD700",
  borderRadius: 8,
  color: "#FFD700",
  marginBottom: 12,
  fontSize: "16px",
};

const addBtnStyle = {
  padding: "14px 28px",
  background: "#FFD700",
  color: "#000",
  fontWeight: "bold",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: "16px",
  minWidth: "200px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px"
};

const saveBtn = {
  padding: "12px 24px",
  background: "#FFD700",
  color: "#000",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px",
  minWidth: "120px"
};

const cancelBtn = {
  padding: "12px 24px",
  background: "#cc0000",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: "16px",
  minWidth: "120px"
};

const editBtn = {
  padding: "10px 20px",
  background: "rgba(255,215,0,0.2)",
  border: "1px solid #FFD700",
  color: "#FFD700",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: "14px",
  flex: 1,
  minWidth: "80px"
};

const deleteBtn = {
  padding: "10px 20px",
  background: "#cc0000",
  color: "#fff",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: "14px",
  flex: 1,
  minWidth: "80px"
};

const gradesBtn = {
  padding: "10px 20px",
  background: "transparent",
  border: "1px solid #FFD700",
  color: "#FFD700",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: "14px",
  flex: 2,
  minWidth: "140px"
};

const addGradeBtn = {
  padding: "10px 20px",
  background: "#FFD700",
  color: "#000",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "bold"
};

const gradeInput = {
  width: "18%",
  minWidth: "120px",
  padding: "10px",
  background: "#222",
  border: "1px solid #555",
  color: "#fff",
  borderRadius: 6,
  marginRight: 8,
  fontSize: "14px"
};

const gradeRow = {
  display: "flex",
  alignItems: "center",
  marginBottom: 12,
  gap: 8,
  flexWrap: "wrap"
};

const deleteSmallBtn = {
  background: "#c00",
  color: "#fff",
  border: "none",
  width: 36,
  height: 36,
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const gradeCard = {
  background: "#1a1a1a",
  padding: 16,
  borderRadius: 10,
  border: "1px dashed #444",
  minHeight: "120px"
};