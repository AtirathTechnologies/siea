// Users.jsx – GOLD + BLACK THEME - RESPONSIVE with Admin Management
import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import { ref, onValue, get, set, remove } from "firebase/database";
import { createUserWithEmailAndPassword } from "firebase/auth";

function Users() {
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    name: '',
    role: 'admin'
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get current admin user
    const profile = localStorage.getItem("profile");
    if (profile) {
      setCurrentUser(JSON.parse(profile));
    }

    // Fetch users
    const usersRef = ref(db, "users");
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const userList = Object.entries(data).map(([customId, userData]) => ({
          customId,
          firebaseUid: userData.uid,
          ...userData,
        }));
        setUsers(userList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    // Fetch admins
    const adminsRef = ref(db, "admins");
    const unsubscribeAdmins = onValue(adminsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const adminList = Object.entries(data).map(([uid, adminData]) => ({
          uid,
          ...adminData
        }));
        setAdmins(adminList);
      } else {
        setAdmins([]);
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeAdmins();
    };
  }, []);

  const handleAddAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.name) {
      alert('Please fill all required fields');
      return;
    }

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newAdmin.email,
        newAdmin.password
      );
      const user = userCredential.user;

      // 2. Add to admins node
      const adminData = {
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        createdAt: Date.now(),
        createdBy: currentUser?.email || 'System'
      };

      const adminRef = ref(db, `admins/${user.uid}`);
      await set(adminRef, adminData);

      // 3. Add to users node
      const userRef = ref(db, `users/${user.uid}`);
      await set(userRef, {
        uid: user.uid,
        email: newAdmin.email,
        fullName: newAdmin.name,
        phone: '',
        isAdmin: true,
        role: 'admin',
        createdAt: new Date().toISOString()
      });

      // Reset form
      setNewAdmin({
        email: '',
        password: '',
        name: '',
        role: 'admin'
      });
      setShowAddAdminModal(false);

      alert('Admin user created successfully!');
    } catch (error) {
      console.error('Error creating admin:', error);
      alert(`Failed to create admin: ${error.message}`);
    }
  };

  const handleToggleAdminStatus = async (user) => {
    const isCurrentlyAdmin = admins.some(admin => admin.uid === user.firebaseUid);
    
    if (isCurrentlyAdmin) {
      // Remove admin privileges
      if (window.confirm(`Are you sure you want to remove admin privileges from ${user.fullName || user.name}?`)) {
        try {
          const adminRef = ref(db, `admins/${user.firebaseUid}`);
          await remove(adminRef);
          
          // Update users node
          const userRef = ref(db, `users/${user.firebaseUid}`);
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            await set(userRef, {
              ...userData,
              isAdmin: false,
              role: 'user',
              updatedAt: new Date().toISOString()
            });
          }
          
          alert('Admin privileges removed successfully!');
        } catch (error) {
          console.error('Error removing admin:', error);
          alert(`Failed to remove admin: ${error.message}`);
        }
      }
    } else {
      // Grant admin privileges
      if (window.confirm(`Are you sure you want to make ${user.fullName || user.name} an admin?`)) {
        try {
          const adminData = {
            email: user.email,
            name: user.fullName || user.name,
            role: 'admin',
            createdAt: Date.now(),
            createdBy: currentUser?.email || 'System'
          };

          const adminRef = ref(db, `admins/${user.firebaseUid}`);
          await set(adminRef, adminData);
          
          // Update users node
          const userRef = ref(db, `users/${user.firebaseUid}`);
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            await set(userRef, {
              ...userData,
              isAdmin: true,
              role: 'admin',
              updatedAt: new Date().toISOString()
            });
          }
          
          alert('Admin privileges granted successfully!');
        } catch (error) {
          console.error('Error adding admin:', error);
          alert(`Failed to add admin: ${error.message}`);
        }
      }
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete user ${user.fullName || user.name}? This action cannot be undone.`)) {
      try {
        // Remove from users node
        const userRef = ref(db, `users/${user.firebaseUid}`);
        await remove(userRef);
        
        // Remove from admins if they were an admin
        const adminRef = ref(db, `admins/${user.firebaseUid}`);
        const adminSnapshot = await get(adminRef);
        if (adminSnapshot.exists()) {
          await remove(adminRef);
        }
        
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Failed to delete user: ${error.message}`);
      }
    }
  };

  const isUserAdmin = (user) => {
    return admins.some(admin => admin.uid === user.firebaseUid);
  };

  if (loading) {
    return (
      <div style={{
        color: "#FFD700",
        textAlign: "center",
        padding: 20,
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <h2 style={{
          fontSize: "clamp(20px, 5vw, 28px)",
          marginBottom: 20
        }}>
          All Users
        </h2>
        <div style={{
          color: "#fff",
          fontSize: "18px",
          textAlign: "center"
        }}>
          Loading users...
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      u.customId?.toLowerCase().includes(s) ||
      u.fullName?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.toLowerCase().includes(s)
    );
  });

  return (
    <div style={{
      color: "#FFD700",
      padding: "16px 12px",
      overflowX: "auto"
    }}>
      {/* Header Section */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <h2 style={{
          fontSize: "clamp(20px, 5vw, 28px)",
          margin: 0
        }}>
          All Users ({users.length})
        </h2>
        
        <button
          onClick={() => setShowAddAdminModal(true)}
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 6px rgba(255, 215, 0, 0.3)"
          }}
        >
          <span>➕</span>
          Add New Admin
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by name, email, phone, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "10px 15px",
            width: "90%",
            maxWidth: "420px",
            borderRadius: "8px",
            border: "1px solid #FFD700",
            background: "#111",
            color: "#FFD700",
            fontSize: "14px",
            outline: "none",
          }}
        />
      </div>

      {/* Stats Bar */}
      <div style={{
        display: "flex",
        gap: "15px",
        marginBottom: "20px",
        flexWrap: "wrap",
        justifyContent: "center"
      }}>
        <div style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "1px solid #FFD700",
          minWidth: "150px",
          textAlign: "center"
        }}>
          <div style={{ color: "#FFD700", fontSize: "12px", marginBottom: "5px" }}>Total Users</div>
          <div style={{ color: "#fff", fontSize: "24px", fontWeight: "bold" }}>{users.length}</div>
        </div>
        
        <div style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "1px solid #00ff00",
          minWidth: "150px",
          textAlign: "center"
        }}>
          <div style={{ color: "#00ff00", fontSize: "12px", marginBottom: "5px" }}>Admins</div>
          <div style={{ color: "#fff", fontSize: "24px", fontWeight: "bold" }}>{admins.length}</div>
        </div>
        
        <div style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "1px solid #ff9900",
          minWidth: "150px",
          textAlign: "center"
        }}>
          <div style={{ color: "#ff9900", fontSize: "12px", marginBottom: "5px" }}>Regular Users</div>
          <div style={{ color: "#fff", fontSize: "24px", fontWeight: "bold" }}>{users.length - admins.length}</div>
        </div>
      </div>

      {/* Table Container */}
      <div className="tw-overflow-x-auto tw-rounded-lg tw-border tw-border-yellow-500/20 tw-shadow-lg">
        <table style={{
          width: "100%",
          minWidth: "800px",
          borderCollapse: "collapse",
          background: "#0d0d0d",
          overflow: "hidden",
        }}>
          <thead>
            <tr style={{
              background: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
              borderBottom: "2px solid #FFD700"
            }}>
              <th style={{
                padding: "12px 8px",
                color: "#FFD700",
                textAlign: "left",
                fontSize: "14px",
                whiteSpace: "nowrap"
              }}>
                UID
              </th>
              <th style={{
                padding: "12px 8px",
                color: "#FFD700",
                textAlign: "left",
                fontSize: "14px",
                whiteSpace: "nowrap"
              }}>
                Name
              </th>
              <th style={{
                padding: "12px 8px",
                color: "#FFD700",
                textAlign: "left",
                fontSize: "14px",
                whiteSpace: "nowrap"
              }}>
                Email
              </th>
              <th style={{
                padding: "12px 8px",
                color: "#FFD700",
                textAlign: "left",
                fontSize: "14px",
                whiteSpace: "nowrap"
              }}>
                Phone
              </th>
              <th style={{
                padding: "12px 8px",
                color: "#FFD700",
                textAlign: "left",
                fontSize: "14px",
                whiteSpace: "nowrap"
              }}>
                Role
              </th>
              <th style={{ 
                padding: "12px 8px", 
                color: "#FFD700",
                textAlign: "left",
                fontSize: "14px",
                whiteSpace: "nowrap"
              }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isAdmin = isUserAdmin(u);
                return (
                  <tr
                    key={u.uid}
                    style={{
                      background: "#111",
                      borderBottom: "1px solid rgba(255,215,0,0.15)",
                    }}
                  >
                    <td style={{
                      padding: "10px 8px",
                      fontSize: "11px",
                      color: "#ccc",
                      fontFamily: "monospace",
                      wordBreak: "break-word",
                      maxWidth: "120px",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                      title={u.uid}
                    >
                      {u.customId}
                    </td>
                    <td style={{
                      padding: "10px 8px",
                      color: "#fff",
                      fontSize: "14px",
                      wordBreak: "break-word",
                      maxWidth: "150px"
                    }}>
                      {u.fullName || u.name || "N/A"}
                    </td>
                    <td style={{
                      padding: "10px 8px",
                      color: "#fff",
                      fontSize: "14px",
                      wordBreak: "break-word",
                      maxWidth: "200px"
                    }}>
                      {u.email || "N/A"}
                    </td>
                    <td style={{
                      padding: "10px 8px",
                      color: "#fff",
                      fontSize: "14px",
                      wordBreak: "break-word",
                      maxWidth: "120px"
                    }}>
                      {u.phone || "N/A"}
                    </td>
                    <td style={{
                      padding: "10px 8px",
                      color: isAdmin ? "#00ff00" : "#ff9900",
                      fontSize: "14px",
                      fontWeight: "bold"
                    }}>
                      {isAdmin ? "👑 Admin" : "👤 User"}
                    </td>
                    <td style={{ 
                      padding: "10px 8px",
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap"
                    }}>
                      <button
                        onClick={() => setSelectedUser(u)}
                        style={{
                          padding: "6px 12px",
                          background: "#FFD700",
                          color: "#000",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        View
                      </button>
                      
                      <button
                        onClick={() => handleToggleAdminStatus(u)}
                        style={{
                          padding: "6px 12px",
                          background: isAdmin ? "#ff4444" : "#44ff44",
                          color: "#000",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {isAdmin ? "Remove Admin" : "Make Admin"}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(u)}
                        style={{
                          padding: "6px 12px",
                          background: "#ff4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "gray",
                    fontSize: "16px"
                  }}
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10000,
        }}
          onClick={() => setShowAddAdminModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0d0d0d",
              padding: "30px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "500px",
              border: "2px solid #FFD700",
              boxShadow: "0 0 30px rgba(255,215,0,0.5)",
            }}
          >
            <h2 style={{
              color: "#FFD700",
              marginBottom: "20px",
              textAlign: "center",
              letterSpacing: "1px",
              fontSize: "24px"
            }}>
              Create New Administrator
            </h2>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ 
                display: "block", 
                color: "#FFD700", 
                marginBottom: "5px",
                fontWeight: "bold"
              }}>
                Full Name *
              </label>
              <input
                type="text"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #FFD700",
                  background: "#111",
                  color: "#FFD700",
                  fontSize: "14px",
                  outline: "none"
                }}
                placeholder="Enter full name"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ 
                display: "block", 
                color: "#FFD700", 
                marginBottom: "5px",
                fontWeight: "bold"
              }}>
                Email Address *
              </label>
              <input
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #FFD700",
                  background: "#111",
                  color: "#FFD700",
                  fontSize: "14px",
                  outline: "none"
                }}
                placeholder="Enter email address"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ 
                display: "block", 
                color: "#FFD700", 
                marginBottom: "5px",
                fontWeight: "bold"
              }}>
                Password *
              </label>
              <input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #FFD700",
                  background: "#111",
                  color: "#FFD700",
                  fontSize: "14px",
                  outline: "none"
                }}
                placeholder="Enter password (min. 6 characters)"
              />
            </div>

            <div style={{ marginBottom: "25px" }}>
              <label style={{ 
                display: "block", 
                color: "#FFD700", 
                marginBottom: "5px",
                fontWeight: "bold"
              }}>
                Role
              </label>
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #FFD700",
                  background: "#111",
                  color: "#FFD700",
                  fontSize: "14px",
                  outline: "none"
                }}
              >
                <option value="admin">Administrator</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div style={{
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => setShowAddAdminModal(false)}
                style={{
                  padding: "10px 20px",
                  background: "#333",
                  color: "#FFD700",
                  border: "1px solid #FFD700",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleAddAdmin}
                style={{
                  padding: "10px 20px",
                  background: "#FFD700",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0d0d0d",
              padding: "25px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "600px",
              border: "1px solid #FFD700",
              boxShadow: "0 0 20px rgba(255,215,0,0.3)",
              maxHeight: "80vh",
              overflowY: "auto"
            }}
          >
            <h2 style={{
              color: "#FFD700",
              marginBottom: "15px",
              textAlign: "center",
              letterSpacing: "1px",
            }}>
              User Profile Details
            </h2>

            {/* Role Badge */}
            <div style={{
              textAlign: "center",
              marginBottom: "20px"
            }}>
              <span style={{
                padding: "6px 15px",
                background: isUserAdmin(selectedUser) ? "#00ff00" : "#ff9900",
                color: "#000",
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: "bold"
              }}>
                {isUserAdmin(selectedUser) ? "👑 ADMIN" : "👤 USER"}
              </span>
            </div>

            {/* User Information Grid */}
            <div style={{ 
              background: "rgba(255, 215, 0, 0.1)", 
              padding: "20px", 
              borderRadius: "8px",
              marginBottom: "15px"
            }}>
              
              {/* Basic Info Section */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ color: "#FFD700", borderBottom: "1px solid #FFD700", paddingBottom: "5px", marginBottom: "15px" }}>
                  Basic Information
                </h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
                  <div>
                    <p style={{ color: "#FFD700", marginBottom: 8 }}>
                      <strong>Custom ID:</strong>
                    </p>
                    <span style={{ color: "#fff", wordBreak: "break-all" }}>{selectedUser.customId}</span>
                  </div>
                  
                  <div>
                    <p style={{ color: "#FFD700", marginBottom: 8 }}>
                      <strong>Firebase UID:</strong>
                    </p>
                    <span style={{
                      color: "#ccc",
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                      fontSize: "12px"
                    }}>
                      {selectedUser.firebaseUid}
                    </span>
                  </div>
                  
                  <div>
                    <p style={{ color: "#FFD700", marginBottom: 8 }}>
                      <strong>Full Name:</strong>
                    </p>
                    <span style={{ color: "#fff" }}>{selectedUser.fullName || selectedUser.name || "N/A"}</span>
                  </div>
                  
                  <div>
                    <p style={{ color: "#FFD700", marginBottom: 8 }}>
                      <strong>Email:</strong>
                    </p>
                    <span style={{ color: "#fff", wordBreak: "break-all" }}>
                      {selectedUser.email || "N/A"}
                    </span>
                  </div>
                  
                  <div>
                    <p style={{ color: "#FFD700", marginBottom: 8 }}>
                      <strong>Phone:</strong>
                    </p>
                    <span style={{ color: "#fff" }}>{selectedUser.phone || "N/A"}</span>
                  </div>
                  
                  <div>
                    <p style={{ color: "#FFD700", marginBottom: 8 }}>
                      <strong>Created At:</strong>
                    </p>
                    <span style={{ color: "#fff" }}>
                      {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ color: "#FFD700", borderBottom: "1px solid #FFD700", paddingBottom: "5px", marginBottom: "15px" }}>
                  Address Information
                </h3>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
                  {selectedUser.street && (
                    <div>
                      <p style={{ color: "#FFD700", marginBottom: 8 }}>
                        <strong>Street:</strong>
                      </p>
                      <span style={{ color: "#fff" }}>{selectedUser.street}</span>
                    </div>
                  )}
                  
                  {selectedUser.city && (
                    <div>
                      <p style={{ color: "#FFD700", marginBottom: 8 }}>
                        <strong>City:</strong>
                      </p>
                      <span style={{ color: "#fff" }}>{selectedUser.city}</span>
                    </div>
                  )}
                  
                  {selectedUser.addressState && (
                    <div>
                      <p style={{ color: "#FFD700", marginBottom: 8 }}>
                        <strong>State:</strong>
                      </p>
                      <span style={{ color: "#fff" }}>{selectedUser.addressState}</span>
                    </div>
                  )}
                  
                  {selectedUser.addressCountry && (
                    <div>
                      <p style={{ color: "#FFD700", marginBottom: 8 }}>
                        <strong>Country:</strong>
                      </p>
                      <span style={{ color: "#fff" }}>{selectedUser.addressCountry}</span>
                    </div>
                  )}
                  
                  {selectedUser.pincode && (
                    <div>
                      <p style={{ color: "#FFD700", marginBottom: 8 }}>
                        <strong>Pincode:</strong>
                      </p>
                      <span style={{ color: "#fff" }}>{selectedUser.pincode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Avatar Section */}
              {selectedUser.avatar && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ color: "#FFD700", borderBottom: "1px solid #FFD700", paddingBottom: "5px", marginBottom: "15px" }}>
                    Profile Picture
                  </h3>
                  
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <img 
                      src={selectedUser.avatar} 
                      alt="User Avatar" 
                      style={{
                        maxWidth: "150px",
                        maxHeight: "150px",
                        borderRadius: "50%",
                        border: "3px solid #FFD700",
                        objectFit: "cover"
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/150?text=No+Image";
                      }}
                    />
                  </div>
                  
                  <div style={{ textAlign: "center", marginTop: "10px" }}>
                    <button
                      onClick={() => {
                        window.open(selectedUser.avatar, '_blank');
                      }}
                      style={{
                        padding: "5px 15px",
                        background: "#FFD700",
                        color: "#000",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      Open Full Image
                    </button>
                  </div>
                </div>
              )}

              {/* Additional Fields Section - for any other fields */}
              {(() => {
                const displayedFields = ['customId', 'firebaseUid', 'fullName', 'name', 'email', 'phone', 'createdAt', 
                  'street', 'city', 'addressState', 'addressCountry', 'pincode', 'avatar', 'uid', 'isAdmin', 'role'];
                
                const additionalFields = Object.keys(selectedUser).filter(key => 
                  !displayedFields.includes(key) && 
                  selectedUser[key] !== null && 
                  selectedUser[key] !== undefined &&
                  selectedUser[key] !== ''
                );
                
                if (additionalFields.length > 0) {
                  return (
                    <div style={{ marginBottom: "20px" }}>
                      <h3 style={{ color: "#FFD700", borderBottom: "1px solid #FFD700", paddingBottom: "5px", marginBottom: "15px" }}>
                        Additional Information
                      </h3>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
                        {additionalFields.map(field => (
                          <div key={field}>
                            <p style={{ color: "#FFD700", marginBottom: 8 }}>
                              <strong>{field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}:</strong>
                            </p>
                            <span style={{ color: "#fff", wordBreak: "break-all" }}>
                              {typeof selectedUser[field] === 'object' 
                                ? JSON.stringify(selectedUser[field]) 
                                : String(selectedUser[field])}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Admin Actions */}
            <div style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginTop: "20px"
            }}>
              <button
                onClick={() => {
                  handleToggleAdminStatus(selectedUser);
                  setSelectedUser(null);
                }}
                style={{
                  padding: "10px 15px",
                  background: isUserAdmin(selectedUser) ? "#ff4444" : "#44ff44",
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  flex: 1
                }}
              >
                {isUserAdmin(selectedUser) ? "Remove Admin" : "Make Admin"}
              </button>
              
              <button
                onClick={() => {
                  handleDeleteUser(selectedUser);
                  setSelectedUser(null);
                }}
                style={{
                  padding: "10px 15px",
                  background: "#ff4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  flex: 1
                }}
              >
                Delete User
              </button>
              
              <button
                onClick={() => {
                  setSelectedUser(null);
                }}
                style={{
                  padding: "10px 15px",
                  background: "#FFD700",
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  flex: 1
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: "20px",
        padding: "15px",
        background: "rgba(255, 215, 0, 0.1)",
        border: "1px solid #FFD700",
        borderRadius: "8px",
        fontSize: "14px"
      }}>
        <p style={{ color: "#FFD700", marginBottom: "5px", fontWeight: "bold" }}>
          💡 Admin Management Notes:
        </p>
        <ul style={{ color: "#fff", paddingLeft: "20px", margin: 0 }}>
          <li>Admins have full access to all features</li>
          <li>Editors can manage content but not users</li>
          <li>Viewers can only view content</li>
          <li>Be cautious when granting admin privileges</li>
        </ul>
      </div>
    </div>
  );
}

export default Users;