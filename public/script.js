const API = "/api";

/* ─────────────────────────────────────────────
   PAGE NAVIGATION
───────────────────────────────────────────── */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const el = document.getElementById(page + '-page');
  if (el) el.classList.remove('hidden');

  document.querySelectorAll('.sidebar-nav-item a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  document.querySelector('.sidebar')?.classList.remove('open');

  if      (page === 'dashboard')  { loadDashboard(); loadAlerts(); }
  else if (page === 'medicines')  loadMedicines();
  else if (page === 'patients')   loadPatients();
  else if (page === 'sales')      loadSales();
  else if (page === 'analytics')  loadAnalytics();
}

/* ─────────────────────────────────────────────
   SAFE API WRAPPER
───────────────────────────────────────────── */
async function apiCall(url, opts = {}) {
  try {
    const res  = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { alert(data.error || 'Server error'); return null; }
    return data;
  } catch (e) {
    alert('Network error: ' + e.message);
    return null;
  }
}

/* ─────────────────────────────────────────────
   MODAL
───────────────────────────────────────────── */
function openModal(html, id = 'modalMain') {
  const overlay = document.getElementById(id);
  const box     = overlay?.querySelector('.modal-box');
  if (!overlay || !box) { console.error('Modal not found:', id); return; }
  box.innerHTML = html;
  overlay.classList.add('active');
}

function closeModal(id = 'modalMain') {
  document.getElementById(id)?.classList.remove('active');
}

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Mark dashboard active
  const dash = document.querySelector('[data-page="dashboard"]');
  if (dash) dash.classList.add('active');

  loadDashboard();
  loadAlerts();

  // Mobile hamburger
  const btn  = document.getElementById('hamburgerBtn');
  const side = document.querySelector('.sidebar');
  btn?.addEventListener('click', e => { e.stopPropagation(); side?.classList.toggle('open'); });
  document.addEventListener('click', e => {
    if (!side?.contains(e.target) && !btn?.contains(e.target)) side?.classList.remove('open');
  });

  // Close modals when clicking backdrop
  document.querySelectorAll('.modal-overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
  });

  // Dashboard auto-refresh
  setInterval(() => {
    if (!document.getElementById('dashboard-page')?.classList.contains('hidden')) {
      loadDashboard(); loadAlerts();
    }
  }, 30000);
});

/* ─────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const d = await (await fetch(`${API}/dashboard`)).json();
    document.getElementById('totalMedicines').textContent = d.totalMedicines ?? 0;
    document.getElementById('totalPatients').textContent  = d.totalPatients  ?? 0;
    document.getElementById('lowStockCount').textContent  = d.lowStockCount  ?? 0;
    document.getElementById('todayRevenue').textContent   = '₹' + (d.todayRevenue ?? 0).toFixed(2);
  } catch(e) { console.error(e); }
}

async function loadAlerts() {
  try {
    const meds     = await (await fetch(`${API}/medicines`)).json();
    const patients = await (await fetch(`${API}/patients`)).json();
    const today    = new Date().toISOString().split('T')[0];

    const lowStock = meds.filter(m => m.quantity <= 10);
    document.getElementById('lowStockList').innerHTML = lowStock.length
      ? lowStock.map(m => `<div class="alert-item">💊 ${esc(m.name)} — ${m.quantity} left</div>`).join('')
      : '<p style="color:#888">No low stock items</p>';

    const recheck = patients.filter(p => p.nextRecheck === today);
    document.getElementById('recheckList').innerHTML = recheck.length
      ? recheck.map(p => `<div class="alert-item">👤 ${esc(p.name)} — Recheck today</div>`).join('')
      : '<p style="color:#888">No patients for recheck today</p>';
  } catch(e) { console.error(e); }
}

/* ─────────────────────────────────────────────
   MEDICINES
───────────────────────────────────────────── */
let allMedicines = [];

async function loadMedicines() {
  const data = await apiCall(`${API}/medicines`);
  if (!data) return;
  allMedicines = data;
  renderMedicines(allMedicines);
}

function renderMedicines(list) {
  const container = document.getElementById('medicineList');
  if (!container) return;
  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML = '<p style="text-align:center;color:#888;padding:40px">No medicines found</p>';
    return;
  }

  const today = new Date().toISOString().split('T')[0];

  list.forEach(m => {
    const isLow     = m.quantity <= 10;
    const isExpired = m.expiry < today;
    const isSoon    = !isExpired && (new Date(m.expiry) - new Date(today) < 30*24*60*60*1000);

    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="card-title">
        ${esc(m.name)}
        ${isLow     ? '<span class="badge badge-low">⚠️ Low Stock</span>' : ''}
        ${isExpired ? '<span class="badge badge-expired">❌ Expired</span>' : ''}
        ${isSoon    ? '<span class="badge badge-warning">⏰ Expiring Soon</span>' : ''}
      </div>
      <div class="card-info">
        <strong>Qty:</strong> ${m.quantity} &nbsp;|&nbsp; <strong>Expiry:</strong> ${m.expiry}<br>
        <strong>Batch:</strong> ${esc(m.batch||'-')} &nbsp;|&nbsp; <strong>Price:</strong> ₹${m.price}<br>
        <strong>Discount:</strong> ${m.discount}% &nbsp;|&nbsp; <strong>Final:</strong> ₹${Number(m.finalPrice).toFixed(2)}
      </div>
      <div class="card-actions">
        <button class="btn-edit"   data-id="${m.id}" data-action="edit">✏️ Edit</button>
        <button class="btn-assign" data-id="${m.id}" data-action="assign">🔗 Assign</button>
        <button class="btn-reduce" data-id="${m.id}" data-action="sell">💰 Sell</button>
        <button class="btn-delete" data-id="${m.id}" data-action="delete">🗑️ Delete</button>
      </div>`;

    // Attach listeners directly on the element — 100% reliable
    div.querySelector('[data-action="edit"]').onclick   = () => openEditMedicine(m.id);
    div.querySelector('[data-action="assign"]').onclick = () => openAssignModal(m.id);
    div.querySelector('[data-action="sell"]').onclick   = () => openSellModal(m.id);
    div.querySelector('[data-action="delete"]').onclick = () => deleteMedicine(m.id);

    container.appendChild(div);
  });
}

function filterMedicines() {
  const q = document.getElementById('medicineSearch').value.toLowerCase();
  renderMedicines(allMedicines.filter(m =>
    m.name.toLowerCase().includes(q) || (m.batch||'').toLowerCase().includes(q)
  ));
}
function filterLowStock() { renderMedicines(allMedicines.filter(m => m.quantity <= 10)); }
function filterExpired() {
  const today = new Date().toISOString().split('T')[0];
  renderMedicines(allMedicines.filter(m =>
    new Date(m.expiry) - new Date(today) < 30*24*60*60*1000
  ));
}

async function addMedicine() {
  const name     = v('med_name');
  const expiry   = v('med_expiry');
  const quantity = v('med_quantity');
  const batch    = v('med_batch');
  const price    = v('med_price');
  const discount = v('med_discount');

  if (!name || !expiry || !quantity) { alert('Name, Expiry and Quantity are required'); return; }

  const r = await apiCall(`${API}/medicines`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name, expiry, quantity, batch, price, discount })
  });
  if (!r) return;
  ['med_name','med_expiry','med_quantity','med_batch','med_price','med_discount'].forEach(id => {
    document.getElementById(id).value = '';
  });
  loadMedicines();
  loadDashboard();
}

async function deleteMedicine(id) {
  if (!confirm('Delete this medicine? This cannot be undone.')) return;
  const r = await apiCall(`${API}/medicines/${id}`, { method: 'DELETE' });
  if (r !== null) { loadMedicines(); loadDashboard(); }
}

/* ── Edit Medicine ── */
function openEditMedicine(id) {
  const m = allMedicines.find(x => x.id === id);
  if (!m) return alert('Medicine not found');

  openModal(`
    <h3>✏️ Edit Medicine</h3>
    <div class="form-row">
      <div><label>Name</label>
        <input id="e_name" value="${esc(m.name)}"></div>
      <div><label>Expiry Date</label>
        <input id="e_expiry" type="date" value="${m.expiry}"></div>
    </div>
    <div class="form-row">
      <div><label>Quantity</label>
        <input id="e_qty" type="number" value="${m.quantity}"></div>
      <div><label>Batch</label>
        <input id="e_batch" value="${esc(m.batch||'')}"></div>
    </div>
    <div class="form-row">
      <div><label>Price (₹)</label>
        <input id="e_price" type="number" value="${m.price}"></div>
      <div><label>Discount (%)</label>
        <input id="e_discount" type="number" value="${m.discount}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" id="m_cancel">Cancel</button>
      <button id="m_save">💾 Save Changes</button>
    </div>
  `);

  document.getElementById('m_cancel').onclick = () => closeModal();
  document.getElementById('m_save').onclick   = async () => {
    const r = await apiCall(`${API}/medicines/${id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        name:     document.getElementById('e_name').value.trim(),
        expiry:   document.getElementById('e_expiry').value,
        quantity: document.getElementById('e_qty').value,
        batch:    document.getElementById('e_batch').value.trim(),
        price:    document.getElementById('e_price').value,
        discount: document.getElementById('e_discount').value
      })
    });
    if (r) { closeModal(); loadMedicines(); }
  };
}

/* ── Assign Medicine ── */
async function openAssignModal(id) {
  const m = allMedicines.find(x => x.id === id);
  if (!m) return alert('Medicine not found');

  const patients = await apiCall(`${API}/patients`);
  if (!patients) return;
  if (!patients.length) { alert('No patients found. Add a patient first.'); return; }

  const opts = patients.map(p =>
    `<option value="${p.id}">${esc(p.name)} (Age ${p.age})</option>`
  ).join('');

  openModal(`
    <h3>🔗 Assign Medicine</h3>
    <p style="color:#555;margin-bottom:16px">
      <strong>${esc(m.name)}</strong> — Available: <strong>${m.quantity}</strong>
    </p>
    <div class="form-row">
      <div><label>Patient</label><select id="a_patient">${opts}</select></div>
      <div><label>Quantity</label>
        <input id="a_qty" type="number" value="1" min="1" max="${m.quantity}"></div>
    </div>
    <div class="form-row">
      <div style="grid-column:1/-1"><label>Dosage Instructions</label>
        <input id="a_dosage" placeholder="e.g. 1 tablet twice daily after meals"></div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" id="a_cancel">Cancel</button>
      <button class="btn-assign" id="a_submit">🔗 Assign</button>
    </div>
  `);

  document.getElementById('a_cancel').onclick = () => closeModal();
  document.getElementById('a_submit').onclick = async () => {
    const patientId = document.getElementById('a_patient').value;
    const quantity  = parseInt(document.getElementById('a_qty').value);
    const dosage    = document.getElementById('a_dosage').value.trim();

    if (!quantity || quantity < 1) { alert('Enter valid quantity'); return; }
    if (quantity > m.quantity) { alert(`Only ${m.quantity} units in stock`); return; }

    const r = await apiCall(`${API}/assign`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ patientId, medicineId: id, quantity, dosage })
    });
    if (r) { closeModal(); loadMedicines(); loadDashboard(); }
  };
}

/* ── Sell Medicine ── */
function openSellModal(id) {
  const m = allMedicines.find(x => x.id === id);
  if (!m) return alert('Medicine not found');
  if (m.quantity <= 0) { alert('Out of stock!'); return; }

  const unit = Number(m.finalPrice) || 0;

  openModal(`
    <h3>💰 Record Sale</h3>
    <p style="color:#555;margin-bottom:16px">
      <strong>${esc(m.name)}</strong> — In Stock: <strong>${m.quantity}</strong>
    </p>
    <div class="form-row">
      <div><label>Quantity to Sell</label>
        <input id="s_qty" type="number" value="1" min="1" max="${m.quantity}"></div>
      <div><label>Unit Price</label>
        <input value="₹${unit.toFixed(2)}" disabled style="background:#f1f5f9"></div>
    </div>
    <div style="background:#eff6ff;padding:16px;border-radius:10px;margin:12px 0;font-size:16px">
      Total: <strong style="color:#1e40af">₹<span id="s_total">${unit.toFixed(2)}</span></strong>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" id="s_cancel">Cancel</button>
      <button class="btn-reduce" id="s_submit">💰 Record Sale</button>
    </div>
  `);

  document.getElementById('s_cancel').onclick = () => closeModal();
  document.getElementById('s_qty').oninput = function() {
    document.getElementById('s_total').textContent = ((parseInt(this.value)||0) * unit).toFixed(2);
  };
  document.getElementById('s_submit').onclick = async () => {
    const qty = parseInt(document.getElementById('s_qty').value);
    if (!qty || qty < 1)        { alert('Enter a valid quantity'); return; }
    if (qty > m.quantity)       { alert(`Only ${m.quantity} available`); return; }

    const r1 = await apiCall(`${API}/medicines/${id}/reduce`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ quantity: qty })
    });
    if (!r1) return;

    await apiCall(`${API}/sales`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        medicineId:   id,
        medicineName: m.name,
        quantity:     qty,
        amount:       qty * unit
      })
    });

    closeModal();
    loadMedicines();
    loadDashboard();
  };
}

/* ─────────────────────────────────────────────
   PATIENTS
───────────────────────────────────────────── */
let allPatients = [];

async function loadPatients() {
  const data = await apiCall(`${API}/patients`);
  if (!data) return;
  allPatients = data;
  renderPatients(allPatients);
}

function renderPatients(list) {
  const container = document.getElementById('patientList');
  if (!container) return;
  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML = '<p style="text-align:center;color:#888;padding:40px">No patients found</p>';
    return;
  }

  list.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div class="card-title">${esc(p.name)}</div>
      <div class="card-info">
        <strong>Age:</strong> ${p.age} &nbsp;|&nbsp; <strong>Gender:</strong> ${esc(p.gender)}<br>
        <strong>Disease:</strong> ${esc(p.disease)}<br>
        <strong>Medicines Assigned:</strong> ${p.medicines?.length || 0}
        ${p.nextRecheck ? `<br><strong>Next Recheck:</strong> ${p.nextRecheck}` : ''}
      </div>
      <div class="card-actions">
        <button data-action="view">👁️ View</button>
        <button class="btn-edit"   data-action="edit">✏️ Edit</button>
        <button class="btn-delete" data-action="del">🗑️ Delete</button>
      </div>`;

    div.querySelector('[data-action="view"]').onclick = () => viewPatient(p.id);
    div.querySelector('[data-action="edit"]').onclick = () => openEditPatient(p.id);
    div.querySelector('[data-action="del"]').onclick  = () => deletePatient(p.id);

    container.appendChild(div);
  });
}

function filterPatients() {
  const q = document.getElementById('patientSearch').value.toLowerCase();
  renderPatients(allPatients.filter(p =>
    p.name.toLowerCase().includes(q) || p.disease.toLowerCase().includes(q)
  ));
}

async function addPatient() {
  const name        = v('p_name');
  const age         = v('p_age');
  const gender      = v('p_gender');
  const disease     = v('p_disease');
  const nextRecheck = v('p_recheck') || null;

  if (!name || !age || !gender || !disease) { alert('All fields except Recheck Date are required'); return; }

  const r = await apiCall(`${API}/patients`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name, age, gender, disease, nextRecheck })
  });
  if (!r) return;
  ['p_name','p_age','p_gender','p_disease','p_recheck'].forEach(id => {
    document.getElementById(id).value = '';
  });
  loadPatients();
  loadDashboard();
}

async function deletePatient(id) {
  if (!confirm('Delete this patient? This cannot be undone.')) return;
  const r = await apiCall(`${API}/patients/${id}`, { method: 'DELETE' });
  if (r !== null) { loadPatients(); loadDashboard(); }
}

function viewPatient(id) {
  const p = allPatients.find(x => x.id === id);
  if (!p) return alert('Patient not found');

  const medsHtml = p.medicines?.length
    ? p.medicines.map(m => `
        <div style="padding:12px;border-radius:8px;margin-bottom:8px;
                    background:#f8fafc;border-left:3px solid #2563eb">
          <strong>${esc(m.medicineName)}</strong><br>
          <span style="color:#666">Qty: ${m.quantity} | Dosage: ${esc(m.dosage||'-')}</span>
        </div>`).join('')
    : '<p style="color:#888">No medicines assigned</p>';

  openModal(`
    <h3>👤 ${esc(p.name)}</h3>
    <div class="card-info" style="font-size:14px;line-height:2;margin:12px 0">
      <strong>Age:</strong> ${p.age} &nbsp;|&nbsp; <strong>Gender:</strong> ${esc(p.gender)}<br>
      <strong>Disease:</strong> ${esc(p.disease)}
      ${p.nextRecheck ? `<br><strong>Next Recheck:</strong> ${p.nextRecheck}` : ''}
    </div>
    <h4 style="margin:16px 0 8px">Assigned Medicines</h4>
    ${medsHtml}
    <div class="modal-actions">
      <button id="vp_close">Close</button>
    </div>
  `, 'modalPatients');

  document.getElementById('vp_close').onclick = () => closeModal('modalPatients');
}

function openEditPatient(id) {
  const p = allPatients.find(x => x.id === id);
  if (!p) return alert('Patient not found');

  openModal(`
    <h3>✏️ Edit Patient</h3>
    <div class="form-row">
      <div><label>Name</label><input id="ep_name" value="${esc(p.name)}"></div>
      <div><label>Age</label><input id="ep_age" type="number" value="${p.age}"></div>
    </div>
    <div class="form-row">
      <div><label>Gender</label><input id="ep_gender" value="${esc(p.gender)}"></div>
      <div><label>Disease</label><input id="ep_disease" value="${esc(p.disease)}"></div>
    </div>
    <div class="form-row">
      <div><label>Next Recheck Date</label>
        <input id="ep_recheck" type="date" value="${p.nextRecheck||''}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" id="ep_cancel">Cancel</button>
      <button id="ep_save">💾 Save Changes</button>
    </div>
  `, 'modalPatients');

  document.getElementById('ep_cancel').onclick = () => closeModal('modalPatients');
  document.getElementById('ep_save').onclick = async () => {
    const r = await apiCall(`${API}/patients/${id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        name:        document.getElementById('ep_name').value.trim(),
        age:         document.getElementById('ep_age').value,
        gender:      document.getElementById('ep_gender').value.trim(),
        disease:     document.getElementById('ep_disease').value.trim(),
        nextRecheck: document.getElementById('ep_recheck').value || null
      })
    });
    if (r) { closeModal('modalPatients'); loadPatients(); }
  };
}

/* ─────────────────────────────────────────────
   SALES
───────────────────────────────────────────── */
async function loadSales() {
  const sales = await apiCall(`${API}/sales`);
  if (!sales) return;

  const today   = new Date().toISOString().split('T')[0];
  const tSales  = sales.filter(s => s.date === today);
  const tRev    = tSales.reduce((s, x) => s + x.amount, 0);

  document.getElementById('todaySalesCount').textContent   = tSales.length;
  document.getElementById('todaySalesRevenue').textContent = '₹' + tRev.toFixed(2);

  const tbody = document.getElementById('salesList');
  tbody.innerHTML = sales.length
    ? sales.map(s => `
        <tr>
          <td>${s.date}</td><td>${s.time}</td>
          <td>${esc(s.medicineName)}</td>
          <td>${s.quantity}</td>
          <td>₹${Number(s.amount).toFixed(2)}</td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:30px;color:#888">No sales recorded</td></tr>';
}

/* ─────────────────────────────────────────────
   ANALYTICS
───────────────────────────────────────────── */
async function loadAnalytics() {
  const [sum, byMed] = await Promise.all([
    apiCall(`${API}/analytics/summary`),
    apiCall(`${API}/analytics/medicine-sales`)
  ]);
  if (!sum) return;

  document.getElementById('totalRevenue').textContent       = '₹' + Number(sum.totalRevenue).toFixed(2);
  document.getElementById('totalSalesCount').textContent    = sum.totalSales;
  document.getElementById('analyticsMedicines').textContent = sum.totalMedicines;
  document.getElementById('analyticsPatients').textContent  = sum.totalPatients;

  document.getElementById('topMedicineInfo').innerHTML = sum.topMedicine
    ? `<div style="font-size:18px;font-weight:700;color:#2563eb">🏆 ${esc(sum.topMedicine.name)}</div>
       <p style="margin-top:8px;color:#666">Sold: ${sum.topMedicine.quantity} units</p>`
    : '<p style="color:#888">No sales data yet</p>';

  const tbody = document.getElementById('medicineSalesTable');
  tbody.innerHTML = byMed && Object.keys(byMed).length
    ? Object.entries(byMed).map(([name, d]) =>
        `<tr><td>${esc(name)}</td><td>${d.quantity}</td><td>₹${Number(d.amount).toFixed(2)}</td></tr>`
      ).join('')
    : '<tr><td colspan="3" style="text-align:center;padding:30px;color:#888">No data</td></tr>';
}

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function v(id) { return document.getElementById(id)?.value ?? ''; }

/* ─────────────────────────────────────────────
   GLOBAL EXPORTS (for onclick in HTML attrs)
───────────────────────────────────────────── */
Object.assign(window, {
  showPage, closeModal,
  addMedicine, loadMedicines, filterMedicines, filterLowStock, filterExpired,
  addPatient,  loadPatients,  filterPatients,
  loadSales, loadAnalytics, loadDashboard, loadAlerts
});