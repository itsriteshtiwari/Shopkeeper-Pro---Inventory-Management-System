
import { useState, useEffect, useRef } from "react";

const API_URL = "http://localhost:5000";
const CATEGORIES = ["All","Grains","Oils","Pulses","Dairy","Sweeteners","Spices","Canned","Beverages","Snacks"];
const ROLE_CONFIG = {
  super_admin: { label: "Super Admin", color: "#f5a623", bg: "#2a1800", icon: "👑", tabs: ["Inventory","Scan & Purchase","Add Product","Transaction Log","Manage Admins", "Dashboard"] },
  normal_admin: { label: "Normal Admin", color: "#4fc3f7", bg: "#001a2a", icon: "🛡️", tabs: ["Inventory","Scan & Purchase","Add Product","Transaction Log"] },
  admin:        { label: "Admin",        color: "#81c784", bg: "#001a00", icon: "👤", tabs: ["Scan & Purchase"] },
};

function getExpiryStatus(expiry) {
  const today = new Date();
  const exp = new Date(expiry);
  const diff = Math.ceil((exp - today) / 86400000);
  if (diff < 0)   return { label: "Expired",    color: "#ff4d4d", bg: "#200a0a" };
  if (diff <= 30) return { label: `${diff}d`,   color: "#ff9500", bg: "#201200" };
  if (diff <= 90) return { label: `${diff}d`,   color: "#ffd60a", bg: "#1e1800" };
  return            { label: `${diff}d`,         color: "#4caf50", bg: "#061206" };
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState("login");
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("");

  const allowedTabs = currentUser ? ROLE_CONFIG[currentUser.role].tabs : [];

  // Sync with Database
  const refreshData = async () => {
    const pRes = await fetch(`${API_URL}/products`);
    const uRes = await fetch(`${API_URL}/users`);
    const tRes = await fetch(`${API_URL}/transactions`);
    setProducts(await pRes.json());
    setUsers(await uRes.json());
    setTransactions(await tRes.json());
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("shopkeeper_user");
    const savedTab = localStorage.getItem("shopkeeper_tab");

    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setScreen("app");
      // Restore the last tab they were on, or use the default for their role
      setActiveTab(savedTab || ROLE_CONFIG[user.role].tabs[0]);
    }
    refreshData();
  }, []);

  async function handleLogin(credentials) {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // SAVE TO LOCALSTORAGE
        localStorage.setItem("shopkeeper_user", JSON.stringify(data));
        
        setCurrentUser(data);
        setScreen("app");
        setActiveTab(ROLE_CONFIG[data.role].tabs[0]);
        return null; 
      } else {
        const errData = await res.json();
        return errData.error || "Invalid credentials.";
      }
    } catch (e) { return "Connection Error"; }
  }

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem("shopkeeper_tab", activeTab);
    }
  }, [activeTab]);

  function handleLogout() {
    localStorage.removeItem("shopkeeper_user");
    localStorage.removeItem("shopkeeper_tab");
    setCurrentUser(null);
    setScreen("login");
    setActiveTab("");
  }

  // UPDATED: Handle Real Sale
  async function handleSale(barcode, qty) {
    const res = await fetch(`${API_URL}/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode, qty })
    });
    if (res.ok) {
      refreshData(); // Updates stock levels in UI
      return true;
    }
    return false;
  }

  // UPDATED: Handle Real Admin Delete
  async function deleteAdmin(id) {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    if (res.ok) refreshData();
    else alert("Cannot delete System Super Admin");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", color: "#dde6f0", fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Clash+Display:wght@400;600;700&family=Syne:wght@400;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0d1117}::-webkit-scrollbar-thumb{background:#2a3040;border-radius:3px}
        .inp{background:#0d1520;border:1px solid #1e2d3d;color:#dde6f0;padding:11px 14px;border-radius:8px;font-family:'DM Mono',monospace;font-size:13px;width:100%;outline:none;transition:border .2s,box-shadow .2s}
        .inp:focus{border-color:#f5a623;box-shadow:0 0 0 3px rgba(245,166,35,0.1)}
        .inp::placeholder{color:#2e4055}
        .sel{background:#0d1520;border:1px solid #1e2d3d;color:#dde6f0;padding:11px 14px;border-radius:8px;font-family:'DM Mono',monospace;font-size:13px;outline:none;transition:border .2s;width:100%}
        .sel:focus{border-color:#f5a623}
        .btn{border:none;cursor:pointer;font-family:'DM Mono',monospace;font-weight:500;letter-spacing:.5px;border-radius:8px;transition:all .2s;text-transform:uppercase;font-size:12px}
        .btn-gold{background:linear-gradient(135deg,#f5a623,#e8860a);color:#080c10;padding:12px 24px}
        .btn-gold:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(245,166,35,0.35)}
        .btn-ghost{background:#0d1520;border:1px solid #1e2d3d;color:#7a99b8;padding:10px 18px}
        .btn-ghost:hover{border-color:#f5a623;color:#f5a623}
        .btn-danger{background:#200a0a;border:1px solid #5a1a1a;color:#ff6b6b;padding:8px 16px}
        .btn-danger:hover{background:#2d0f0f;border-color:#ff4d4d}
        .card{background:#0d1520;border:1px solid #1a2535;border-radius:12px;padding:20px}
        .tab{background:none;border:none;cursor:pointer;padding:10px 16px;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;border-bottom:2px solid transparent;transition:all .2s;color:#3a5068;white-space:nowrap}
        .tab.active{color:#f5a623;border-bottom-color:#f5a623}
        .tab:hover:not(.active){color:#7a99b8}
        .badge{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:500;letter-spacing:.5px}
        .glow-gold{box-shadow:0 0 30px rgba(245,166,35,0.15)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .fade-up{animation:fadeUp .4s ease both}
        .scan-cursor{animation:pulse 1s step-end infinite}
        .batch-bar{height:4px;background:#0d1117;border-radius:2px;overflow:hidden;margin-top:4px}
        .batch-fill{height:100%;border-radius:2px;transition:width .5s}
      `}</style>

      {screen === "login"
        ? <LoginScreen onLogin={handleLogin} />
        : <MainApp
            currentUser={currentUser}
            users={users}
            products={products}
            setProducts={setProducts} // Ensure this is passed
            onLogout={handleLogout}
            transactions={transactions}
            setTransactions={setTransactions}
            // onLogout={() => { setScreen("login"); setCurrentUser(null); }}
            handleLogin={handleLogin}
            handleSale={handleSale}
            deleteAdmin={deleteAdmin}
            refreshData={refreshData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            allowedTabs={allowedTabs}
          />
      }
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ users =[], onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [detectedRole, setDetectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-detect role as user types
  useEffect(() => {
    const val = identifier.trim().toLowerCase();
    if (!val) { setDetectedRole(null); return; }
    const found = users.find(u => u.email.toLowerCase() === val || u.username.toLowerCase() === val);
    setDetectedRole(found ? found.role : null);
  }, [identifier, users]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const errorMessage = await onLogin({ identifier, password });
    if (errorMessage) {
      setError(errorMessage);
    }
    setLoading(false);
  }

  const rc = detectedRole ? ROLE_CONFIG[detectedRole] : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      background: "radial-gradient(ellipse at 30% 20%, #0d1a2a 0%, #080c10 60%)" }}>
      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(#1a2535 1px,transparent 1px),linear-gradient(90deg,#1a2535 1px,transparent 1px)",
        backgroundSize: "40px 40px", opacity: .15, pointerEvents: "none" }} />

      <div className="fade-up" style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 60, height: 60, borderRadius: 16, background: "linear-gradient(135deg,#f5a623,#e8860a)",
            marginBottom: 16, boxShadow: "0 8px 32px rgba(245,166,35,0.4)" }}>
            <span style={{ fontSize: 28 }}>▦</span>
          </div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: "#dde6f0", letterSpacing: 2 }}>SHOPKEEPER PRO</div>
          <div style={{ fontSize: 10, color: "#2e4055", letterSpacing: 4, marginTop: 4 }}>INVENTORY MANAGEMENT SYSTEM</div>
        </div>

        <div className="card glow-gold" style={{ padding: 32 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 6, color: "#dde6f0" }}>Sign In</div>
          <div style={{ fontSize: 11, color: "#3a5068", marginBottom: 24 }}>Enter your credentials to access the dashboard</div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>EMAIL OR USERNAME</label>
              <input className="inp" value={identifier} onChange={e => setIdentifier(e.target.value)}
                placeholder="Enter email or username" autoComplete="off" />
              {/* Role prediction badge */}
              {rc && (
                <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 20, background: rc.bg, border: `1px solid ${rc.color}44` }}>
                  <span style={{ fontSize: 13 }}>{rc.icon}</span>
                  <span style={{ fontSize: 10, color: rc.color, fontWeight: 500, letterSpacing: 1 }}>
                    Detected: {rc.label}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input className="inp" type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                  style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#3a5068", fontSize: 16 }}>
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: "#200a0a", border: "1px solid #5a1a1a", borderRadius: 8, padding: "10px 14px",
                color: "#ff6b6b", fontSize: 12, marginBottom: 16 }}>⚠ {error}</div>
            )}

            <button type="submit" className="btn btn-gold" style={{ width: "100%", padding: 14, fontSize: 13 }} disabled={loading}>
              {loading ? "Authenticating..." : "→ Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function MainApp({ currentUser, users, products, setProducts, transactions, setTransactions, activeTab, setActiveTab, allowedTabs, onLogout, refreshData }) {
  const rc = ROLE_CONFIG[currentUser.role];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ background: "#0a1018", borderBottom: "1px solid #1a2535", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 0", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#f5a623,#e8860a)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>▦</div>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#dde6f0", letterSpacing: 1.5 }}>SHOPKEEPER PRO</div>
                <div style={{ fontSize: 9, color: "#2e4055", letterSpacing: 3 }}>INVENTORY SYSTEM</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "#dde6f0" }}>{currentUser.username}</span>
                  <span className="badge" style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.color}44` }}>
                    {rc.icon} {rc.label}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "#3a5068", marginTop: 2 }}>{currentUser.email}</div>
              </div>
              <button className="btn btn-ghost" onClick={onLogout} style={{ padding: "8px 14px", fontSize: 11 }}>⏏ Logout</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginTop: 8, overflowX: "auto" }}>
            {allowedTabs.map(t => (
              <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
                {t === "Inventory" && "📦 "}
                {t === "Scan & Purchase" && "🔍 "}
                {t === "Add Product" && "➕ "}
                {t === "Transaction Log" && "📋 "}
                {t === "Manage Admins" && "👥 "}
                {t === "Dashboard" && " 📊 "}
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 1300, margin: "0 auto", padding: "28px 24px", width: "100%" }}>
        {activeTab === "Inventory"       && <InventoryTab products={products} refreshData={refreshData} />}
        {activeTab === "Scan & Purchase" && <ScanTab products={products} setProducts={setProducts} transactions={transactions} setTransactions={setTransactions} currentUser={currentUser} />}
        {activeTab === "Add Product" && <AddProductTab refreshData={refreshData} />}
        {activeTab === "Transaction Log" && <TransactionLog transactions={transactions} />}
        {activeTab === "Manage Admins"   && <ManageAdmins users={users} refreshData={refreshData} currentUser={currentUser} />}
        {activeTab === "Dashboard" && <DashboardTab />}
      </div>
    </div>
  );
}

// ─── INVENTORY TAB ────────────────────────────────────────────────────────────
function InventoryTab({ products, refreshData }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);

  async function handleDeleteBatch(dbId) {
    if (!dbId) return;

    if (window.confirm("Remove this expired batch?")) {
      try {
        const res = await fetch(`${API_URL}/batches/${dbId}`, { method: 'DELETE' });
        if (res.ok) {
          refreshData(); // Triggers re-fetch from MySQL
          
          // Show the toast notification
          setToast("Successfully removed expired batch!");
          
          // Auto-hide the toast after 3 seconds
          setTimeout(() => setToast(null), 3000);
        } else {
          alert("Failed to delete from server.");
        }
      } catch (err) {
        console.error("CORS or Connection Error:", err);
      }
    }
  }

  async function handlePermanentDelete(productId, productName) {
    if (window.confirm(`Are you sure you want to permanently delete "${productName}"? This cannot be undone.`)) {
      try {
        const res = await fetch(`${API_URL}/products/${productId}`, { method: 'DELETE' });
        if (res.ok) {
          refreshData(); // Refresh the list to remove the card
        }
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  }

  const filtered = products.filter(p =>
    (filterCat === "All" || p.category === filterCat) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.toLowerCase().includes(search.toLowerCase()))
  );

  const totalItems = products.reduce((a, p) => a + p.batches.reduce((b, bat) => b + bat.qty, 0), 0);
  const expiringSoon = products.reduce((a, p) => a + p.batches.filter(b => { const d = Math.ceil((new Date(b.expiry)-new Date())/86400000); return d>=0&&d<=30; }).length, 0);
  const expired = products.reduce((a, p) => a + p.batches.filter(b => new Date(b.expiry) < new Date()).length, 0);

  return (
    <div className="fade-up" style={{ position: "relative" }}>
      {/* 🔔 SUCCESS TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          background: "#061206",
          color: "#4caf50",
          padding: "12px 24px",
          borderRadius: "8px",
          border: "1px solid #4caf5044",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          zIndex: 1000,
          fontFamily: "'DM Mono', monospace",
          fontSize: "13px",
          animation: "fadeUp 0.3s ease"
        }}>
          ✅ {toast}
        </div>
      )}
      {/* Stats row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "PRODUCTS", val: products.length, color: "#f5a623" },
          { label: "TOTAL STOCK", val: totalItems, color: "#4caf50" },
          { label: "EXP SOON", val: expiringSoon, color: "#ff9500" },
          { label: "EXPIRED", val: expired, color: "#ff4d4d" },
        ].map(s => (
          <div key={s.label} className="card" style={{ flex: 1, minWidth: 130, textAlign: "center", padding: "16px 10px" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 28, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "#2e4055", letterSpacing: 2, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input className="inp" style={{ maxWidth: 280 }} placeholder="🔎 Search product or barcode..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="sel" style={{ maxWidth: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 11, color: "#2e4055", alignSelf: "center", marginLeft: "auto" }}>{filtered.length} product(s)</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 14 }}>
        {filtered.map(prod => {
          const totalQty = prod.batches.reduce((a, b) => a + b.qty, 0);
          const isExp = expanded === prod.id;
          return (
            <div key={prod.id} className="card" onClick={() => setExpanded(isExp ? null : prod.id)}
              style={{ cursor: "pointer", borderColor: isExp ? "#f5a62333" : "#1a2535", transition: "border-color .2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>{prod.name}</div>
                  <div style={{ fontSize: 10, color: "#2e4055", marginTop: 4 }}>
                    <span style={{ color: "#f5a623" }}>#{prod.barcode}</span> · {prod.category}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: totalQty === 0 ? "#ff4d4d" : "#f5a623" }}>{totalQty}</div>
                  <div style={{ fontSize: 9, color: "#2e4055" }}>IN STOCK</div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {prod.batches.map(b => {
                  const es = getExpiryStatus(b.expiry);
                  return (
                    <div key={b.batchId} style={{ background: es.bg, border: `1px solid ${es.color}33`, borderRadius: 6, padding: "4px 10px", fontSize: 10 }}>
                      <span style={{ color: es.color, fontWeight: 700 }}>{b.qty}</span>
                      <span style={{ color: "#3a5068" }}> · </span>
                      <span style={{ color: "#5a7a99" }}>{formatDate(b.expiry)}</span>
                    </div>
                  );
                })}
                {prod.batches.length === 0 && <span style={{ color: "#ff4d4d", fontSize: 11 }}>⚠ Out of stock</span>}
              </div>

              {isExp && (
                <div style={{ marginTop: 14, borderTop: "1px solid #1a2535", paddingTop: 14 }}>
                  <div style={{ fontSize: 10, color: "#2e4055", letterSpacing: 2, marginBottom: 10 }}>BATCH DETAILS</div>
                  <div style={{ marginTop: 20, textAlign: "center" }}>
      <button 
        onClick={(e) => { e.stopPropagation(); handlePermanentDelete(prod.id, prod.name); }}
        className="btn btn-danger"
        style={{ width: "100%", fontSize: "10px", padding: "10px" }}
      >
        🗑️ PERMANENTLY DELETE PRODUCT FROM SYSTEM
      </button>
    </div>
                  {prod.batches.map((b, i) => {
                    const es = getExpiryStatus(b.expiry);
                    const isExpired = es.label === "Expired";
                    const sold = b.originalQty - b.qty;
                    const pct = Math.round((b.qty / b.originalQty) * 100);
                    return (
                      <div key={b.batchId} style={{ background: "#080c10", border: "1px solid #1a2535", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 10, color: "#3a5068" }}>Batch {i+1} · {b.batchId}</div>
                            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginTop: 2 }}>
                              <span style={{ color: es.color }}>{b.qty}</span>
                              <span style={{ color: "#1a2535", fontSize: 12 }}> / {b.originalQty}</span>
                            </div>
                            <div style={{ fontSize: 10, color: "#3a5068" }}>Sold: {sold} units</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "#5a7a99" }}>Exp: {formatDate(b.expiry)}</div>
                            <span className="badge" style={{ background: es.bg, color: es.color, border: `1px solid ${es.color}44`, marginTop: 6, display: "inline-block" }}>{es.label}</span>
                            {isExpired && (
                  <button 
  onClick={(e) => { 
    e.stopPropagation(); 
    handleDeleteBatch(b.db_id); // This matches the new key in Python
  }}
  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
>
  🗑️
</button>
                )}
                            <div className="batch-bar" style={{ width: 100, marginLeft: "auto", marginTop: 6 }}>
                              <div className="batch-fill" style={{ width: `${pct}%`, background: es.color }} />
                            </div>
                            <div style={{ fontSize: 9, color: "#2e4055", marginTop: 2 }}>{pct}% remaining</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px",
                    background: "#080c10", borderRadius: 8, fontSize: 11, color: "#3a5068" }}>
                    <span>Batches: <span style={{ color: "#f5a623" }}>{prod.batches.length}</span></span>
                    <span>Remaining: <span style={{ color: "#4caf50", fontWeight: 700 }}>{totalQty}</span></span>
                    <span>Total Sold: <span style={{ color: "#7a99b8" }}>{prod.batches.reduce((a,b)=>a+(b.originalQty-b.qty),0)}</span></span>
                  </div>
                </div>
              )}
              <div style={{ fontSize: 10, color: "#1e2d3d", marginTop: 8, textAlign: "right" }}>{isExp ? "▲ collapse" : "▼ expand"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCAN TAB ─────────────────────────────────────────────────────────────────
function ScanTab({ products, refreshData, currentUser }) {
  const [cart, setCart] = useState([]);
  const [scanInput, setScanInput] = useState("");
  const [scanQty, setScanQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [msg, setMsg] = useState(null);
  const scanRef = useRef();

  const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Credit"];

  // Calculate Total
  const cartTotal = cart.reduce((sum, item) => sum + (item.qty * 1), 0); // If you add price later, multiply here

  function addToCart(e) {
    e.preventDefault();
    const bc = scanInput.trim().toLowerCase();
    const prod = products.find(p => p.barcode.toLowerCase() === bc || p.name.toLowerCase() === bc);

    if (!prod) {
      setMsg({ type: "error", text: "❌ Product not found" });
      return;
    }

    const totalStock = prod.batches.reduce((a, b) => a + b.qty, 0);
    if (totalStock < scanQty) {
      setMsg({ type: "error", text: `⚠ Only ${totalStock} units available` });
      return;
    }

    const newItem = {
      barcode: prod.barcode,
      name: prod.name,
      qty: scanQty,
      id: Date.now()
    };

    setCart([...cart, newItem]);
    setScanInput("");
    setScanQty(1);
    setMsg(null);
  }

  async function handleCheckout() {
  if (cart.length === 0) return;

  try {
    const res = await fetch(`${API_URL}/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cart: cart, // Send the whole list at once
        username: currentUser.username,
        role: currentUser.role,
        payment_method: paymentMethod 
      })
    });

    const data = await res.json();
    if (res.ok) {
      setMsg({ type: "success", text: "✅ Full Transaction Recorded!" });
      setCart([]);
      refreshData();
    }
  } catch (err) {
    setMsg({ type: "error", text: "❌ Checkout Error" });
  }
}

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20 }}>
      {/* LEFT: SCANNING AREA */}
      <div className="card">
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, marginBottom: 20 }}>🛒 SHOPPING CART</div>
        <form onSubmit={addToCart} style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input ref={scanRef} className="inp" value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder="Scan Barcode..." autoFocus />
          <input className="inp" type="number" style={{ width: 80 }} value={scanQty} onChange={e => setScanQty(e.target.value)} min="1" />
          <button type="submit" className="btn btn-gold">Add</button>
        </form>

        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {cart.map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#080c10", borderRadius: 8, marginBottom: 5 }}>
              <span>{item.name} (x{item.qty})</span>
              <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} style={{ background: "none", border: "none", color: "#ff4d4d", cursor: "pointer" }}>✕</button>
            </div>
          ))}
          {cart.length === 0 && <div style={{ color: "#3a5068", textAlign: "center", padding: 20 }}>Cart is empty</div>}
        </div>
      </div>

      {/* RIGHT: PAYMENT AREA */}
      <div className="card">
        <div style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, marginBottom: 15 }}>PAYMENT SUMMARY</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#f5a623", marginBottom: 20 }}>Total Items: {cartTotal}</div>
        
        <label style={{ fontSize: 10, color: "#3a5068", display: "block", marginBottom: 10 }}>SELECT METHOD</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {PAYMENT_METHODS.map(m => (
            <button 
              key={m} 
              onClick={() => setPaymentMethod(m)}
              className="btn"
              style={{ 
                background: paymentMethod === m ? "#f5a623" : "#0d1117",
                color: paymentMethod === m ? "#080c10" : "#7a99b8",
                border: "1px solid #1a2535"
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <button onClick={handleCheckout} className="btn btn-gold" style={{ width: "100%", padding: 15 }} disabled={cart.length === 0}>
          COMPLETE PURCHASE
        </button>
        {msg && <div style={{ marginTop: 15, color: msg.type === "success" ? "#4caf50" : "#ff4d4d" }}>{msg.text}</div>}
      </div>
    </div>
  );
}

// ─── ADD PRODUCT TAB ──────────────────────────────────────────────────────────
function AddProductTab({ refreshData }) { // Change props to use refreshData
  const [form, setForm] = useState({ name: "", category: "Grains", barcode: "", expiry: "", qty: "" });
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const { name, barcode, expiry, qty } = form;
    if (!name || !barcode || !expiry || !qty) { 
      setMsg({ type: "error", text: "Please fill all fields." }); 
      return; 
    }

    try {
      const res = await fetch(`${API_URL}/products/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setMsg({ type: "success", text: `✅ ${name} added to database!` });
        setForm({ name: "", category: "Grains", barcode: "", expiry: "", qty: "" });
        refreshData(); // This refreshes the Inventory tab with real DB data
      } else {
        const err = await res.json();
        setMsg({ type: "error", text: `❌ ${err.error || "Failed to add product"}` });
      }
    } catch (err) {
      setMsg({ type: "error", text: "❌ Connection error with Python server." });
    }
    
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <div className="fade-up" style={{ maxWidth: 580, margin: "0 auto" }}>
      <div className="card">
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "#f5a623", marginBottom: 6 }}>ADD / RESTOCK PRODUCT</div>
        <div style={{ fontSize: 11, color: "#3a5068", marginBottom: 24 }}>
          Same barcode + same expiry = merge stock. Same barcode + new expiry = new batch. New barcode = new product.
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>PRODUCT NAME *</label>
              <input className="inp" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Basmati Rice" />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>BARCODE *</label>
              <input className="inp" value={form.barcode} onChange={e => setForm(f=>({...f,barcode:e.target.value}))} placeholder="e.g. BC001" />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>CATEGORY</label>
              <select className="sel" value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>EXPIRY DATE *</label>
              <input className="inp" type="date" value={form.expiry} onChange={e => setForm(f=>({...f,expiry:e.target.value}))} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>QUANTITY *</label>
              <input className="inp" type="number" min={1} value={form.qty} onChange={e => setForm(f=>({...f,qty:e.target.value}))} placeholder="e.g. 50" />
            </div>
            <div style={{ gridColumn: "1/-1", marginTop: 6 }}>
              <button type="submit" className="btn btn-gold" style={{ width: "100%", padding: 14, fontSize: 13 }}>➕ ADD TO INVENTORY</button>
            </div>
          </div>
        </form>
        {msg && (
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8,
            background: msg.type==="success"?"#061206":"#200a0a",
            border:`1px solid ${msg.type==="success"?"#4caf5033":"#ff4d4d33"}`,
            color: msg.type==="success"?"#4caf50":"#ff6b6b", fontSize: 13 }}>{msg.text}</div>
        )}
      </div>
    </div>
  );
}

// ─── TRANSACTION LOG ──────────────────────────────────────────────────────────
function TransactionLog({ transactions = [] }) {
  return (
    <div className="fade-up">
      {transactions.map(txn => (
        <div key={txn.id} className="card" style={{ marginBottom: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1a2535", paddingBottom: 10 }}>
            <div>
              <span style={{ color: "#f5a623", fontWeight: 800 }}>TXN #{txn.id}</span>
              <a 
      href={`${API_URL}/generate-invoice/${txn.id}`} 
      target="_blank"
      style={{ 
        fontSize: "10px", 
        color: "#f5a623", 
        textDecoration: "none", 
        border: "1px solid #f5a623", 
        padding: "4px 8px", 
        borderRadius: "4px" 
      }}
    >
      📄 PDF RECEIPT
    </a>
              <span style={{ color: "#3a5068", fontSize: 11, marginLeft: 10 }}>{txn.sale_date} | {txn.sale_time}</span>
            </div>
            <span className="badge" style={{ background: "#001a00", color: "#4caf50" }}>{txn.payment_method}</span>
          </div>

          <div style={{ padding: "10px 0" }}>
            {txn.items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span>{item.product_name} <span style={{ color: "#3a5068" }}>x{item.qty}</span></span>
                <span style={{ color: "#7a99b8" }}>#{item.barcode}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #1a2535", paddingTop: 10, fontSize: 11, color: "#3a5068" }}>
            Sold by: <span style={{ color: "#dde6f0" }}>{txn.sold_by}</span> ({txn.user_role})
            <span style={{ float: "right" }}>Total Items: {txn.total_qty}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MANAGE ADMINS ────────────────────────────────────────────────────────────
function ManageAdmins({ users, refreshData, currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", gender: "Male", password: "", confirm: "", role: "admin" });
  const [msg, setMsg] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  // FIX: Define showPass state here
  const [showPass, setShowPass] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setMsg(null);
    const { username, email, password, confirm } = form;

    if (!username || !email || !password || !confirm) { 
      setMsg({ type: "error", text: "All fields are required." }); 
      return; 
    }
    if (password !== confirm) { 
      setMsg({ type: "error", text: "Passwords do not match." }); 
      return; 
    }

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          createdBy: currentUser.username
        })
      });

      if (res.ok) {
        setMsg({ type: "success", text: `✅ Admin "${username}" created!` });
        setForm({ username: "", email: "", gender: "Male", password: "", confirm: "", role: "admin" });
        refreshData(); // Sync with MySQL
        setTimeout(() => setShowForm(false), 2000);
      } else {
        const err = await res.json();
        setMsg({ type: "error", text: `❌ ${err.error || "Failed to create admin"}` });
      }
    } catch (err) {
      setMsg({ type: "error", text: "❌ Server Connection Error" });
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        refreshData();
        setDeleteId(null);
      } else {
        const err = await res.json();
        alert(err.error || "Delete failed");
      }
    } catch (err) {
      alert("Connection error");
    }
  }

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: "#f5a623" }}>MANAGE ADMINS</div>
          <div style={{ fontSize: 11, color: "#3a5068", marginTop: 4 }}>{users.length} total user(s) in system</div>
        </div>
        <button className="btn btn-gold" onClick={() => setShowForm(s=>!s)}>{showForm ? "✕ Cancel" : "➕ Create Admin"}</button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, borderColor: "#f5a62322" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 20, color: "#f5a623" }}>NEW ADMIN REGISTRATION</div>
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>USERNAME *</label>
                <input className="inp" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="e.g. john_admin" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>EMAIL *</label>
                <input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="e.g. john@shop.com" />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>GENDER</label>
                <select className="sel" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>ADMIN ROLE *</label>
                <select className="sel" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  <option value="super_admin">👑 Super Admin — Full Access</option>
                  <option value="normal_admin">🛡️ Normal Admin — Inventory + Products</option>
                  <option value="admin">👤 Admin — Scan & Purchase Only</option>
                </select>
              </div>
              {/* Role preview */}
              <div style={{ gridColumn: "1/-1" }}>
                {form.role && (
                  <div style={{ padding: "10px 14px", borderRadius: 8, background: ROLE_CONFIG[form.role].bg,
                    border: `1px solid ${ROLE_CONFIG[form.role].color}33`, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 20 }}>{ROLE_CONFIG[form.role].icon}</span>
                    <div>
                      <div style={{ color: ROLE_CONFIG[form.role].color, fontWeight: 700, fontSize: 13 }}>{ROLE_CONFIG[form.role].label}</div>
                      <div style={{ fontSize: 11, color: "#3a5068", marginTop: 2 }}>
                        Access: {ROLE_CONFIG[form.role].tabs.join(" · ")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>PASSWORD *</label>
                <input className="inp" type={showPass?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min. 6 characters" style={{ paddingRight: 44 }} />
                <button type="button" onClick={()=>setShowPass(s=>!s)} style={{ position:"absolute",right:12,bottom:10,background:"none",border:"none",cursor:"pointer",color:"#3a5068",fontSize:16 }}>{showPass?"🙈":"👁"}</button>
              </div>
              <div>
                <label style={{ fontSize: 10, color: "#3a5068", letterSpacing: 2, display: "block", marginBottom: 6 }}>CONFIRM PASSWORD *</label>
                <input className="inp" type="password" value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} placeholder="Re-enter password" />
              </div>
              <div style={{ gridColumn: "1/-1", marginTop: 6 }}>
                <button type="submit" className="btn btn-gold" style={{ width: "100%", padding: 14, fontSize: 13 }}>✔ CREATE ADMIN ACCOUNT</button>
              </div>
            </div>
          </form>
          {msg && (
            <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 8,
              background: msg.type==="success"?"#061206":"#200a0a",
              border:`1px solid ${msg.type==="success"?"#4caf5044":"#ff4d4d44"}`,
              color: msg.type==="success"?"#4caf50":"#ff6b6b", fontSize: 12, lineHeight: 1.6 }}>{msg.text}</div>
          )}
        </div>
      )}

      {/* Users list */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
        {users.map(u => {
          const rc = ROLE_CONFIG[u.role];
          const isMe = u.id === currentUser.id;
          return (
            <div key={u.id} className="card" style={{ borderColor: isMe ? "#f5a62333" : "#1a2535", position: "relative" }}>
              {isMe && <div style={{ position:"absolute",top:12,right:12, fontSize:10, color:"#f5a623", letterSpacing:1 }}>YOU</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: rc.bg, border: `2px solid ${rc.color}44`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{rc.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "#dde6f0" }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: "#3a5068", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <span className="badge" style={{ background: rc.bg, color: rc.color, border:`1px solid ${rc.color}33` }}>{rc.label}</span>
                    <span className="badge" style={{ background: "#0d1117", color: "#3a5068" }}>{u.gender}</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1a2535", fontSize: 10, color: "#2e4055", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Created: {u.createdAt || "—"} {u.createdBy && <span>by <span style={{color:"#5a7a99"}}>{u.createdBy}</span></span>}</span>
                {!isMe && u.id !== 1 && (
                  deleteId === u.id
                    ? <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => handleDelete(u.id)}>Confirm</button>
                        <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setDeleteId(null)}>Cancel</button>
                      </div>
                    : <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: 10 }} onClick={() => setDeleteId(u.id)}>🗑 Remove</button>
                )}
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, color: "#1e2d3d", letterSpacing: 1, marginBottom: 5 }}>ACCESS</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {rc.tabs.map(t => <span key={t} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: "#080c10", border: "1px solid #1a2535", color: "#3a5068" }}>{t}</span>)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// _______Dashbord____________
function DashboardTab() {
  const [stats, setStats] = useState({ topSellers: [], categorySplit: [], lowStock: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/dashboard-stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => console.error("Dashboard fetch error:", err));
  }, []);

  if (loading) return <div style={{ color: "#3a5068", padding: 40 }}>Loading Analytics...</div>;

  return (
    <div className="fade-up">
      {/* 🚨 Low Stock Alert Bar - Only shows if there are items low in stock */}
      {stats.lowStock.length > 0 && (
        <div className="card" style={{ border: "1px solid #ff4d4d44", background: "#200a0a", marginBottom: 20 }}>
          <div style={{ color: "#ff4d4d", fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🚨 LOW STOCK ALERTS</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {stats.lowStock.map(item => (
              <span key={item.name} className="badge" style={{ background: "#3d0a0a", color: "#ff4d4d", border: "1px solid #ff4d4d33" }}>
                {item.name}: {item.current_stock} left
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Top Sellers Chart */}
        <div className="card">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#f5a623", marginBottom: 20 }}>🔥 TOP SELLERS</div>
          {stats.topSellers.map(item => (
            <div key={item.product_name} style={{ marginBottom: 15 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span>{item.product_name}</span>
                <span style={{ color: "#f5a623" }}>{item.total_sold} units</span>
              </div>
              <div style={{ height: 8, background: "#0d1117", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ 
                  height: "100%", 
                  width: `${(item.total_sold / (stats.topSellers[0]?.total_sold || 1)) * 100}%`, 
                  background: "#f5a623" 
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Category Split Chart */}
        <div className="card">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: "#4fc3f7", marginBottom: 20 }}>📦 STOCK BY CATEGORY</div>
          {stats.categorySplit.map(cat => (
            <div key={cat.category} style={{ display: "flex", justifyContent: "space-between", padding: 10, background: "#080c10", borderRadius: 8, marginBottom: 8 }}>
              <span>{cat.category}</span>
              <span style={{ color: "#4fc3f7", fontWeight: 700 }}>{cat.total_stock}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
