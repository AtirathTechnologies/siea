import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue, update } from "firebase/database";

export default function AdminPrices() {
  const [data, setData] = useState({});
  const [selectedState, setSelectedState] = useState("");
  const [loading, setLoading] = useState(true);


  const [addingNewItem, setAddingNewItem] = useState({
    category: null,
    varietyIndex: null,
    isAdding: false
  });
  const [newItem, setNewItem] = useState({
    type: "",
    crop_year: "",
    price: ""
  });


  const [addingNewVariety, setAddingNewVariety] = useState({
    category: null,
    isAdding: false
  });
  const [newVariety, setNewVariety] = useState({
    variety: "",
    items: []
  });


  const [editIndex, setEditIndex] = useState({
    variety: null,
    item: null
  });

  const [editFields, setEditFields] = useState({
    type: "",
    crop_year: "",
    price: ""
  });

  useEffect(() => {
    const ratesRef = ref(db, "market_rates/");
    onValue(ratesRef, (snapshot) => {
      if (snapshot.exists()) {
        const allData = snapshot.val();
        setData(allData);

        if (!selectedState && Object.keys(allData).length > 0) {
          setSelectedState(Object.keys(allData)[0]);
        }
      }
      setLoading(false);
    });
  }, [selectedState]);

  const startEdit = (vIndex, iIndex, item) => {
    setEditIndex({ variety: vIndex, item: iIndex });
    setEditFields({
      type: item.type,
      crop_year: item.crop_year,
      price: item.price,
    });
  };

  const saveEdit = async (category, vIndex, iIndex) => {
    if (!selectedState || !data[selectedState]) return;

    const updated = { ...data };

    
    if (!updated[selectedState][category][vIndex].items) {
      updated[selectedState][category][vIndex].items = [];
    }

    
    if (updated[selectedState][category][vIndex].items[iIndex]) {
      updated[selectedState][category][vIndex].items[iIndex] = editFields;
    } else {
      
      updated[selectedState][category][vIndex].items.push(editFields);
    }

    try {
      await update(ref(db, `market_rates/${selectedState}`), updated[selectedState]);
      setEditIndex({ variety: null, item: null });
    } catch (error) {
      console.error("Error saving edit:", error);
      alert("Error saving edit. Please try again.");
    }
  };

  const startAddNewItem = (category, varietyIndex) => {
    setAddingNewItem({
      category,
      varietyIndex,
      isAdding: true
    });
    setNewItem({
      type: "",
      crop_year: "",
      price: ""
    });
  };

  const cancelAddNewItem = () => {
    setAddingNewItem({
      category: null,
      varietyIndex: null,
      isAdding: false
    });
  };

  const saveNewItem = async (category, varietyIndex) => {
    if (!selectedState || !data[selectedState]) return;

    if (!newItem.type.trim() || !newItem.crop_year.trim() || !newItem.price.trim()) {
      alert("Please fill all fields");
      return;
    }

    const updated = { ...data };

    
    if (!updated[selectedState][category][varietyIndex].items) {
      updated[selectedState][category][varietyIndex].items = [];
    }

    updated[selectedState][category][varietyIndex].items.push({
      type: newItem.type,
      crop_year: newItem.crop_year,
      price: newItem.price
    });

    try {
      await update(ref(db, `market_rates/${selectedState}`), updated[selectedState]);

      
      setAddingNewItem({
        category: null,
        varietyIndex: null,
        isAdding: false
      });
      setNewItem({
        type: "",
        crop_year: "",
        price: ""
      });
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Error saving item. Please try again.");
    }
  };

  const startAddNewVariety = (category) => {
    setAddingNewVariety({
      category,
      isAdding: true
    });
    setNewVariety({
      variety: "",
      items: []
    });
  };

  const cancelAddNewVariety = () => {
    setAddingNewVariety({
      category: null,
      isAdding: false
    });
  };

  const saveNewVariety = async (category) => {
    if (!selectedState || !data[selectedState]) return;

    if (!newVariety.variety.trim()) {
      alert("Please enter variety name");
      return;
    }

    const updated = { ...data };

    
    if (!updated[selectedState][category]) {
      updated[selectedState][category] = [];
    }

    
    updated[selectedState][category].push({
      variety: newVariety.variety,
      items: []
    });

    try {
      await update(ref(db, `market_rates/${selectedState}`), updated[selectedState]);

      
      setAddingNewVariety({
        category: null,
        isAdding: false
      });
      setNewVariety({
        variety: "",
        items: []
      });
    } catch (error) {
      console.error("Error saving variety:", error);
      alert("Error saving variety. Please try again.");
    }
  };

  const deleteItem = async (category, vIndex, iIndex) => {
    if (!selectedState || !data[selectedState]) return;

    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    const updated = { ...data };
    updated[selectedState][category][vIndex].items.splice(iIndex, 1);

    await update(ref(db, `market_rates/${selectedState}`), updated[selectedState]);
  };

  const deleteVariety = async (category, vIndex) => {
    if (!selectedState || !data[selectedState]) return;

    if (!window.confirm("Are you sure you want to delete this variety and all its items?")) {
      return;
    }

    const updated = { ...data };

    
    if (updated[selectedState][category] && updated[selectedState][category][vIndex]) {
      updated[selectedState][category].splice(vIndex, 1);

      try {
        await update(ref(db, `market_rates/${selectedState}`), updated[selectedState]);
      } catch (error) {
        console.error("Error deleting variety:", error);
        alert("Error deleting variety. Please try again.");
      }
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", paddingTop: "100px", color: "yellow" }}>
        Loading Market Prices...
      </div>
    );

  const states = Object.keys(data);

  
  if (states.length === 0) {
    return (
      <div style={styles.container}>
        <h1 style={styles.mainTitle}>Admin – Market Prices</h1>
        <div style={styles.card}>
          <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
            No market price data available. Please add data to Firebase.
          </div>
        </div>
      </div>
    );
  }

  if (!selectedState || !data[selectedState]) {
    return (
      <div style={styles.container}>
        <h1 style={styles.mainTitle}>Admin – Market Prices</h1>
        <div style={styles.card}>
          <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
            Please select a state from the tabs above.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>Admin – Market Prices</h1>

      
      <div style={styles.tabRow}>
        {states.map((state) => (
          <button
            key={state}
            onClick={() => setSelectedState(state)}
            style={{
              ...styles.tabButton,
              background:
                selectedState === state ? "#FFD700" : "rgba(255,255,255,0.1)",
              color: selectedState === state ? "#000" : "#fff",
            }}
          >
            {state.replace("_", " ").toUpperCase()}
          </button>
        ))}
      </div>

      <div style={styles.card}>
        <h2 style={styles.stateTitle}>
          {selectedState.replace("_", " ").toUpperCase()}
        </h2>

        
        {data[selectedState]?.basmati && data[selectedState].basmati.length > 0 && (
          <>
            <div style={styles.categoryHeader}>
              <h3 style={styles.sectionTitle}>BASMATI</h3>
              <button
                onClick={() => startAddNewVariety("basmati")}
                style={styles.addVarietyBtn}
                disabled={addingNewVariety.isAdding}
              >
                + Add New Variety
              </button>
            </div>

            
            {addingNewVariety.isAdding && addingNewVariety.category === "basmati" && (
              <div style={styles.addNewVarietyForm}>
                <h4 style={styles.formTitle}>Add New Basmati Variety</h4>
                <div style={styles.varietyInputRow}>
                  <input
                    placeholder="Variety Name"
                    value={newVariety.variety}
                    onChange={(e) =>
                      setNewVariety({
                        ...newVariety,
                        variety: e.target.value,
                      })
                    }
                    style={styles.varietyInput}
                  />
                  <div style={styles.buttonGroup}>
                    <button
                      onClick={() => saveNewVariety("basmati")}
                      style={styles.saveBtn}
                    >
                      Add Variety
                    </button>
                    <button
                      onClick={cancelAddNewVariety}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {data[selectedState].basmati.map((variety, vIndex) => (
              <div key={vIndex} style={styles.varietyCard}>
                <div style={styles.varietyHeader}>
                  <h4 style={styles.varietyName}>{variety.variety}</h4>
                  <div style={styles.varietyActions}>
                    <button
                      onClick={() => startAddNewItem("basmati", vIndex)}
                      style={styles.addNewBtn}
                      disabled={addingNewItem.isAdding || addingNewVariety.isAdding}
                    >
                      + Add Item
                    </button>
                    <button
                      onClick={() => deleteVariety("basmati", vIndex)}
                      style={styles.deleteBtn}
                    >
                      Delete Variety
                    </button>
                  </div>
                </div>

                
                {variety.items && variety.items.map((item, iIndex) => {
                  const isEditing =
                    editIndex.variety === vIndex &&
                    editIndex.item === iIndex;

                  return (
                    <div key={iIndex} style={styles.row}>
                      
                      {isEditing ? (
                        <input
                          value={editFields.type}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              type: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      ) : (
                        <span style={styles.rowLabel}>{item.type}</span>
                      )}

                      
                      {isEditing ? (
                        <input
                          value={editFields.crop_year}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              crop_year: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      ) : (
                        <span>{item.crop_year}</span>
                      )}

                      
                      {isEditing ? (
                        <input
                          value={editFields.price}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              price: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      ) : (
                        <span style={styles.rowPrice}>{item.price}</span>
                      )}

                      
                      <div style={styles.itemActions}>
                        {isEditing ? (
                          <button
                            onClick={() =>
                              saveEdit("basmati", vIndex, iIndex)
                            }
                            style={styles.saveBtn}
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={() => startEdit(vIndex, iIndex, item)}
                            style={styles.editBtn}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => deleteItem("basmati", vIndex, iIndex)}
                          style={styles.deleteItemBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

                
                {addingNewItem.isAdding &&
                  addingNewItem.category === "basmati" &&
                  addingNewItem.varietyIndex === vIndex && (
                    <div style={styles.addNewForm}>
                      <div style={styles.row}>
                        <input
                          placeholder="Type/Grade"
                          value={newItem.type}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              type: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                        <input
                          placeholder="Crop Year"
                          value={newItem.crop_year}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              crop_year: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                        <input
                          placeholder="Price"
                          value={newItem.price}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              price: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                        <div style={styles.buttonGroup}>
                          <button
                            onClick={() => saveNewItem("basmati", vIndex)}
                            style={styles.saveBtn}
                          >
                            Add
                          </button>
                          <button
                            onClick={cancelAddNewItem}
                            style={styles.cancelBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                
                {(!variety.items || variety.items.length === 0) && !addingNewItem.isAdding && (
                  <div style={styles.emptyState}>
                    <p>No items added yet. Click "Add Item" to add products.</p>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        
        {(!data[selectedState]?.basmati || data[selectedState].basmati.length === 0) && (
          <div>
            <div style={styles.categoryHeader}>
              <h3 style={styles.sectionTitle}>BASMATI</h3>
              <button
                onClick={() => startAddNewVariety("basmati")}
                style={styles.addVarietyBtn}
                disabled={addingNewVariety.isAdding}
              >
                + Add New Variety
              </button>
            </div>
            <div style={styles.emptyCategory}>
              <p>No basmati varieties added yet. Click "Add New Variety" to start.</p>
            </div>
          </div>
        )}

        
        {data[selectedState]?.non_basmati && data[selectedState].non_basmati.length > 0 && (
          <>
            <div style={styles.categoryHeader}>
              <h3 style={styles.sectionTitle}>NON BASMATI</h3>
              <button
                onClick={() => startAddNewVariety("non_basmati")}
                style={styles.addVarietyBtn}
                disabled={addingNewVariety.isAdding}
              >
                + Add New Variety
              </button>
            </div>

            
            {addingNewVariety.isAdding && addingNewVariety.category === "non_basmati" && (
              <div style={styles.addNewVarietyForm}>
                <h4 style={styles.formTitle}>Add New Non-Basmati Variety</h4>
                <div style={styles.varietyInputRow}>
                  <input
                    placeholder="Variety Name"
                    value={newVariety.variety}
                    onChange={(e) =>
                      setNewVariety({
                        ...newVariety,
                        variety: e.target.value,
                      })
                    }
                    style={styles.varietyInput}
                  />
                  <div style={styles.buttonGroup}>
                    <button
                      onClick={() => saveNewVariety("non_basmati")}
                      style={styles.saveBtn}
                    >
                      Add Variety
                    </button>
                    <button
                      onClick={cancelAddNewVariety}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {data[selectedState].non_basmati.map((variety, vIndex) => (
              <div key={vIndex} style={styles.varietyCard}>
                <div style={styles.varietyHeader}>
                  <h4 style={styles.varietyName}>{variety.variety}</h4>
                  <div style={styles.varietyActions}>
                    <button
                      onClick={() => startAddNewItem("non_basmati", vIndex)}
                      style={styles.addNewBtn}
                      disabled={addingNewItem.isAdding || addingNewVariety.isAdding}
                    >
                      + Add Item
                    </button>
                    <button
                      onClick={() => deleteVariety("non_basmati", vIndex)}
                      style={styles.deleteBtn}
                    >
                      Delete Variety
                    </button>
                  </div>
                </div>


                {variety.items && variety.items.map((item, iIndex) => {
                  const isEditing =
                    editIndex.variety === vIndex &&
                    editIndex.item === iIndex;

                  return (
                    <div key={iIndex} style={styles.row}>
                      {isEditing ? (
                        <input
                          value={editFields.type}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              type: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      ) : (
                        <span style={styles.rowLabel}>{item.type}</span>
                      )}

                      {isEditing ? (
                        <input
                          value={editFields.crop_year}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              crop_year: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      ) : (
                        <span>{item.crop_year}</span>
                      )}

                      {isEditing ? (
                        <input
                          value={editFields.price}
                          onChange={(e) =>
                            setEditFields({
                              ...editFields,
                              price: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                      ) : (
                        <span style={styles.rowPrice}>{item.price}</span>
                      )}

                      <div style={styles.itemActions}>
                        {isEditing ? (
                          <button
                            onClick={() =>
                              saveEdit("non_basmati", vIndex, iIndex)
                            }
                            style={styles.saveBtn}
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={() => startEdit(vIndex, iIndex, item)}
                            style={styles.editBtn}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => deleteItem("non_basmati", vIndex, iIndex)}
                          style={styles.deleteItemBtn}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}


                {addingNewItem.isAdding &&
                  addingNewItem.category === "non_basmati" &&
                  addingNewItem.varietyIndex === vIndex && (
                    <div style={styles.addNewForm}>
                      <div style={styles.row}>
                        <input
                          placeholder="Type/Grade"
                          value={newItem.type}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              type: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                        <input
                          placeholder="Crop Year"
                          value={newItem.crop_year}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              crop_year: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                        <input
                          placeholder="Price"
                          value={newItem.price}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              price: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                        <div style={styles.buttonGroup}>
                          <button
                            onClick={() => saveNewItem("non_basmati", vIndex)}
                            style={styles.saveBtn}
                          >
                            Add
                          </button>
                          <button
                            onClick={cancelAddNewItem}
                            style={styles.cancelBtn}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}


                {(!variety.items || variety.items.length === 0) && !addingNewItem.isAdding && (
                  <div style={styles.emptyState}>
                    <p>No items added yet. Click "Add Item" to add products.</p>
                  </div>
                )}
              </div>
            ))}
          </>
        )}


        {(!data[selectedState]?.non_basmati || data[selectedState].non_basmati.length === 0) && (
          <div>
            <div style={styles.categoryHeader}>
              <h3 style={styles.sectionTitle}>NON BASMATI</h3>
              <button
                onClick={() => startAddNewVariety("non_basmati")}
                style={styles.addVarietyBtn}
                disabled={addingNewVariety.isAdding}
              >
                + Add New Variety
              </button>
            </div>
            <div style={styles.emptyCategory}>
              <p>No non-basmati varieties added yet. Click "Add New Variety" to start.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


const styles = {
  container: {
    background: "#000",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "Poppins, sans-serif",
    color: "white",
  },
  mainTitle: {
    textAlign: "center",
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "25px",
    color: "#FFD700",
  },
  tabRow: {
    display: "flex",
    overflowX: "auto",
    gap: "12px",
    marginBottom: "25px",
  },
  tabButton: {
    padding: "12px 20px",
    borderRadius: "25px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1px solid #FFD700",
    whiteSpace: "nowrap",
  },
  card: {
    background: "#111",
    padding: "20px",
    borderRadius: "15px",
    border: "1px solid #FFD700",
  },
  stateTitle: { fontSize: "24px", marginBottom: "20px" },
  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    marginTop: "30px",
  },
  sectionTitle: { fontSize: "20px", color: "#FFD700" },
  addVarietyBtn: {
    background: "transparent",
    border: "2px solid #4CAF50",
    color: "#4CAF50",
    padding: "8px 16px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
  addNewVarietyForm: {
    background: "#222",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px dashed #4CAF50",
  },
  formTitle: {
    color: "#4CAF50",
    marginBottom: "10px",
    fontSize: "16px",
  },
  varietyInputRow: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  varietyInput: {
    flex: 1,
    background: "#000",
    color: "white",
    border: "1px solid #555",
    padding: "10px",
    borderRadius: "6px",
    fontSize: "14px",
  },
  varietyCard: {
    background: "#1a1a1a",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "15px",
  },
  varietyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  varietyName: { fontSize: "18px", color: "#FFD700" },
  varietyActions: {
    display: "flex",
    gap: "10px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 100px 150px 1fr",
    padding: "10px 0",
    borderBottom: "1px solid #333",
    alignItems: "center",
    gap: "10px",
  },
  input: {
    background: "#000",
    color: "white",
    border: "1px solid #555",
    padding: "6px",
    borderRadius: "6px",
  },
  rowLabel: { fontWeight: "bold" },
  rowPrice: { color: "#FFD700", fontWeight: "600", textAlign: "right" },
  itemActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  editBtn: {
    background: "#FFD700",
    padding: "6px 12px",
    borderRadius: "6px",
    color: "black",
    fontWeight: "bold",
  },
  saveBtn: {
    background: "#4CAF50",
    padding: "6px 12px",
    borderRadius: "6px",
    color: "white",
    fontWeight: "bold",
  },
  cancelBtn: {
    background: "#dc3545",
    padding: "6px 12px",
    borderRadius: "6px",
    color: "white",
    fontWeight: "bold",
  },
  addNewBtn: {
    background: "transparent",
    border: "1px solid #FFD700",
    color: "#FFD700",
    padding: "6px 12px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "transparent",
    border: "1px solid #dc3545",
    color: "#dc3545",
    padding: "6px 12px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  deleteItemBtn: {
    background: "transparent",
    border: "1px solid #dc3545",
    color: "#dc3545",
    padding: "6px 12px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  addNewForm: {
    marginTop: "15px",
    padding: "15px",
    background: "#222",
    borderRadius: "8px",
    border: "1px dashed #FFD700",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
  },
  emptyState: {
    textAlign: "center",
    padding: "20px",
    color: "#888",
    fontStyle: "italic",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
    marginTop: "10px",
  },
  emptyCategory: {
    textAlign: "center",
    padding: "40px",
    color: "#888",
    fontStyle: "italic",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
    marginBottom: "30px",
  },
};