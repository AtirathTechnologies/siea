// GradesAdmin.jsx - Updated to use nested, collapsible sections

import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { ref, onValue, update } from "firebase/database";

// Reusing styles from ProductsAdmin.jsx for consistency
const inputStyle = {
  width: "100%",
  padding: 6,
  background: "#222",
  border: "1px solid #FFD700",
  color: "#FFD700",
  borderRadius: 6,
  boxSizing: "border-box", 
};

const saveBtn = {
  padding: "6px 14px",
  background: "#FFD700",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
  marginRight: 8,
  color: "#000",
};

const cancelBtn = {
  padding: "6px 14px",
  background: "#cc0000",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  color: "#fff",
};

const varietyHeaderStyle = {
  background: "#1c1c1c",
  padding: '15px 20px',
  cursor: 'pointer',
  border: "1px solid #FFD700",
  borderRadius: 8,
  marginBottom: 5,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

// Main component
export default function GradesAdmin() {
  const [grades, setGrades] = useState({});
  const [edit, setEdit] = useState(null); // { variety, id }
  const [form, setForm] = useState({});
  // New state to manage which variety section is open/collapsed
  const [openVariety, setOpenVariety] = useState(null); 

  // --- Data Fetching ---
  useEffect(() => {
    // Structure: riceGrades/{VarietyName}/{GradeId}: {...}
    const r = ref(db, "riceGrades");
    onValue(r, (snap) => {
      if (snap.exists()) setGrades(snap.val());
    });
    return () => unsubscribe();
  }, []);

  // --- Editing Handlers ---
  const startEdit = (variety, id, data) => {
    setEdit({ variety, id });
    setForm(data);
  };

  const cancelEdit = () => {
    setEdit(null);
    setForm({});
  };

  const saveEdit = async () => {
    const { variety, id } = edit;
    
    // 1. Update the specific grade item in Firebase
    await update(ref(db, `riceGrades/${variety}/${id}`), form);

    // 2. Recalculate and update the summary price range for the main product
    await regenerateSummaryProduct(variety); 

    alert("Grade updated!");
    setEdit(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // Special handling for number fields
    if (name === "price_inr" || name === "moq") {
      setForm({ ...form, [name]: Number(value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // --- Price Summary Recalculation ---
  const regenerateSummaryProduct = async (varietyToUpdate) => {
    // Collect prices from the current state/form for the variety being updated
    let prices = [];
    
    // Iterate over the grade list for the specific variety
    Object.entries(grades[varietyToUpdate]).forEach(([id, g]) => {
      let price;
      // If we are currently editing this specific item, use the form value
      if (edit?.id === id && edit?.variety === varietyToUpdate) {
        price = form.price_inr;
      } else {
        // Otherwise, use the value already in the state
        price = g.price_inr;
      }
      prices.push(price);
    });

    if (prices.length === 0) return;

    // Convert from price/kg to price/qtl (1 qtl = 100 kg)
    const pricesInQtl = prices.map((price) => price * 100);

    const min = Math.min(...pricesInQtl);
    const max = Math.max(...pricesInQtl);

    // Update the main product summary in /products
    await update(ref(db, "products/" + varietyToUpdate), {
      price: `₹${min} – ₹${max} / qtl`,
    });
  };

  // --- Render Component ---
  return (
    <div style={{ padding: 20, color: "#FFD700", background: "#000" }}>
      <h2 style={{ marginBottom: 15 }}>Manage Varieties & Grades 🍚</h2>

      <p style={{ color: "#fff", marginBottom: 30 }}>
        Click on a **Variety** name to expand its **Grades**. Editing a grade
        automatically updates the overall min/max price shown on the main
        Products page.
      </p>

      {/* Map over the main rice varieties */}
      {Object.entries(grades).map(([variety, list]) => (
        <div key={variety} style={{ marginBottom: 20 }}>
          {/* VARIETY HEADER - Click to toggle collapse */}
          <div 
            style={varietyHeaderStyle}
            onClick={() => setOpenVariety(openVariety === variety ? null : variety)}
          >
            <h3 style={{ margin: 0, color: "#FFD700" }}>
              {variety}
            </h3>
            <span style={{ fontSize: 24 }}>
              {openVariety === variety ? '▼' : '►'}
            </span>
          </div>
          
          {/* GRADES TABLE - Only show if variety is open */}
          {openVariety === variety && (
            <div style={{ padding: '0 20px 10px 20px', background: '#0d0d0d', border: '1px solid rgba(255,215,0,0.2)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  color: "#fff",
                }}
              >
                <thead>
                  <tr style={{ background: "#222" }}>
                    <th style={{ padding: 12, textAlign: "left" }}>Grade</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Price/Kg (INR)</th>
                    <th style={{ padding: 12, textAlign: "left" }}>MOQ (Kg)</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Origin</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Stock</th>
                    <th style={{ padding: 12, textAlign: "center" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Map over the nested grades */}
                  {Object.entries(list).map(([id, g]) => {
                    const isEditing = edit?.variety === variety && edit?.id === id;

                    return (
                      <tr
                        key={id}
                        style={{
                          borderBottom: "1px solid rgba(255,215,0,0.1)",
                          background: isEditing ? "#1a1a1a" : "none",
                        }}
                      >
                        {/* GRADE */}
                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <input
                              name="grade"
                              value={form.grade}
                              onChange={handleFormChange}
                              style={inputStyle}
                            />
                          ) : (
                            g.grade
                          )}
                        </td>

                        {/* PRICE/KG (INR) */}
                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <input
                              name="price_inr"
                              type="number"
                              value={form.price_inr}
                              onChange={handleFormChange}
                              style={inputStyle}
                            />
                          ) : (
                            `₹${g.price_inr}`
                          )}
                        </td>

                        {/* MOQ */}
                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <input
                              name="moq"
                              type="number"
                              value={form.moq}
                              onChange={handleFormChange}
                              style={inputStyle}
                            />
                          ) : (
                            `${g.moq}`
                          )}
                        </td>

                        {/* ORIGIN */}
                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <input
                              name="origin"
                              value={form.origin}
                              onChange={handleFormChange}
                              style={inputStyle}
                            />
                          ) : (
                            g.origin
                          )}
                        </td>

                        {/* STOCK */}
                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <input
                              name="stock"
                              value={form.stock}
                              onChange={handleFormChange}
                              style={inputStyle}
                            />
                          ) : (
                            g.stock
                          )}
                        </td>

                        {/* ACTION */}
                        <td style={{ padding: 10, textAlign: "center" }}>
                          {isEditing ? (
                            <>
                              <button onClick={saveEdit} style={saveBtn}>
                                Save
                              </button>
                              <button onClick={cancelEdit} style={cancelBtn}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(variety, id, g)}
                              style={{ ...saveBtn, background: '#1c1c1c', color: '#FFD700', border: '1px solid #FFD700' }}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}