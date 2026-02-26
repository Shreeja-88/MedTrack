'use strict';
const API = '/api';

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function gv(id) { // get value of input by id
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

/* ════════════════════════════════════════
   SAFE FETCH
════════════════════════════════════════ */
async function apiCall(url, opts = {}) {
    try {
        const res  = await fetch(url, opts);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { alert(data.error || 'Server error'); return null; }
        return data;
    } catch (e) {
        alert('Network error – is the server running?\n' + e.message);
        return null;
    }
}

/* ════════════════════════════════════════
   PAGE NAVIGATION
════════════════════════════════════════ */
function showPage(page) {
    // hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    // show target
    const target = document.getElementById(page + '-page');
    if (target) target.classList.remove('hidden');
    // update sidebar active
    document.querySelectorAll('.sidebar-nav-item a').forEach(a => {
        a.classList.toggle('active', a.dataset.page === page);
    });

    if      (page === 'dashboard')  { loadDashboard(); loadAlerts(); }
    else if (page === 'medicines')  loadMedicines();
    else if (page === 'patients')   loadPatients();
    else if (page === 'sales')      loadSales();
    else if (page === 'analytics')  loadAnalytics();
}

/* ════════════════════════════════════════
   MODAL — two overlays: medicine & patient
════════════════════════════════════════ */
function showModal(html, overlayId, contentId) {
    overlayId = overlayId || 'modalOverlay';
    contentId = contentId || 'modalContent';
    const overlay = document.getElementById(overlayId);
    const content = document.getElementById(contentId);
    if (!overlay || !content) {
        console.error('Modal element not found:', overlayId, contentId);
        return;
    }
    content.innerHTML = html;
    overlay.style.display = 'flex'; // force show regardless of any CSS
    // allow click-outside-to-close
    overlay.onclick = function(e) { if (e.target === overlay) closeModal(overlayId); };
}

function closeModal(overlayId) {
    overlayId = overlayId || 'modalOverlay';
    const overlay = document.getElementById(overlayId);
    if (overlay) overlay.style.display = 'none';
}

// hide both modals on start
function hideAllModals() {
    ['modalOverlay','modalOverlayPatients'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', function() {
    hideAllModals();
    loadDashboard();
    loadAlerts();

    // auto-refresh dashboard every 30 s
    setInterval(function() {
        const active = document.querySelector('.page:not(.hidden)');
        if (active && active.id === 'dashboard-page') {
            loadDashboard();
            loadAlerts();
        }
    }, 30000);
});

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
async function loadDashboard() {
    try {
        const d = await (await fetch(API + '/dashboard')).json();
        document.getElementById('totalMedicines').textContent = d.totalMedicines || 0;
        document.getElementById('totalPatients').textContent  = d.totalPatients  || 0;
        document.getElementById('lowStockCount').textContent  = d.lowStockCount  || 0;
        document.getElementById('todayRevenue').textContent   = '₹' + Number(d.todayRevenue || 0).toFixed(2);
    } catch(e) { console.error('Dashboard error', e); }
}

async function loadAlerts() {
    try {
        const meds = await (await fetch(API + '/medicines')).json();
        const pats = await (await fetch(API + '/patients')).json();
        const today = new Date().toISOString().split('T')[0];

        const lowStock = meds.filter(m => m.quantity <= 10);
        document.getElementById('lowStockList').innerHTML = lowStock.length
            ? lowStock.map(m => '<div class="alert-item">💊 ' + esc(m.name) + ' — ' + m.quantity + ' left</div>').join('')
            : '<p style="color:#888">No low stock items</p>';

        const recheck = pats.filter(p => p.nextRecheck === today);
        document.getElementById('recheckList').innerHTML = recheck.length
            ? recheck.map(p => '<div class="alert-item">👤 ' + esc(p.name) + ' — Recheck today</div>').join('')
            : '<p style="color:#888">No patients for recheck today</p>';
    } catch(e) { console.error('Alerts error', e); }
}

/* ════════════════════════════════════════
   MEDICINES
════════════════════════════════════════ */
var allMedicines = [];

async function loadMedicines() {
    const data = await apiCall(API + '/medicines');
    if (!data) return;
    allMedicines = data;
    renderMedicines(allMedicines);
}

function renderMedicines(list) {
    const container = document.getElementById('medicineList');
    if (!container) return;

    // clear
    while (container.firstChild) container.removeChild(container.firstChild);

    if (!list.length) {
        container.innerHTML = '<p style="text-align:center;color:#888;padding:40px">No medicines found</p>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    list.forEach(function(m) {
        const isLow     = m.quantity <= 10;
        const isExpired = m.expiry < today;
        const isSoon    = !isExpired && ((new Date(m.expiry) - new Date(today)) < 30*24*60*60*1000);

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
            '<div class="card-title">' +
                esc(m.name) +
                (isLow     ? ' <span class="badge badge-low">⚠️ Low Stock</span>' : '') +
                (isExpired ? ' <span class="badge badge-expired">❌ Expired</span>' : '') +
                (isSoon    ? ' <span class="badge badge-warning">⏰ Expiring Soon</span>' : '') +
            '</div>' +
            '<div class="card-info">' +
                '<strong>Qty:</strong> ' + m.quantity + ' &nbsp;|&nbsp; <strong>Expiry:</strong> ' + m.expiry + '<br>' +
                '<strong>Batch:</strong> ' + esc(m.batch || '-') + ' &nbsp;|&nbsp; <strong>Price:</strong> ₹' + m.price + '<br>' +
                '<strong>Discount:</strong> ' + m.discount + '% &nbsp;|&nbsp; <strong>Final:</strong> ₹' + Number(m.finalPrice).toFixed(2) +
            '</div>' +
            '<div class="card-actions">' +
                '<button class="btn-edit"   data-action="edit">✏️ Edit</button>' +
                '<button class="btn-assign" data-action="assign">🔗 Assign</button>' +
                '<button class="btn-reduce" data-action="sell">💰 Sell</button>' +
                '<button class="btn-delete" data-action="del">🗑️ Delete</button>' +
            '</div>';

        // Attach events directly on DOM nodes — no inline onclick strings
        card.querySelector('[data-action="edit"]').addEventListener('click',   function() { openEditMedicine(m.id); });
        card.querySelector('[data-action="assign"]').addEventListener('click', function() { openAssignModal(m.id); });
        card.querySelector('[data-action="sell"]').addEventListener('click',   function() { openSellModal(m.id); });
        card.querySelector('[data-action="del"]').addEventListener('click',    function() { deleteMedicine(m.id); });

        container.appendChild(card);
    });
}

function filterMedicines() {
    var q = document.getElementById('medicineSearch').value.toLowerCase();
    renderMedicines(allMedicines.filter(function(m) {
        return m.name.toLowerCase().includes(q) || (m.batch || '').toLowerCase().includes(q);
    }));
}
function filterLowStock() {
    renderMedicines(allMedicines.filter(function(m) { return m.quantity <= 10; }));
}
function filterExpired() {
    var today = new Date().toISOString().split('T')[0];
    renderMedicines(allMedicines.filter(function(m) {
        return (new Date(m.expiry) - new Date(today)) < 30*24*60*60*1000;
    }));
}

/* ── ADD MEDICINE ── */
async function addMedicine() {
    var name     = gv('f_med_name');
    var expiry   = gv('f_med_expiry');
    var quantity = gv('f_med_quantity');
    var batch    = gv('f_med_batch');
    var price    = gv('f_med_price');
    var discount = gv('f_med_discount');

    if (!name || !expiry || !quantity) {
        alert('Medicine Name, Expiry Date and Quantity are required.');
        return;
    }
    var r = await apiCall(API + '/medicines', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name, expiry, quantity, batch, price, discount })
    });
    if (!r) return;
    ['f_med_name','f_med_expiry','f_med_quantity','f_med_batch','f_med_price','f_med_discount']
        .forEach(function(id) { document.getElementById(id).value = ''; });
    loadMedicines();
    loadDashboard();
}

/* ── DELETE MEDICINE ── */
async function deleteMedicine(id) {
    if (!confirm('Delete this medicine? This cannot be undone.')) return;
    var r = await apiCall(API + '/medicines/' + id, { method: 'DELETE' });
    if (r !== null) { loadMedicines(); loadDashboard(); }
}

/* ── EDIT MEDICINE ── */
function openEditMedicine(id) {
    var m = allMedicines.find(function(x) { return x.id === id; });
    if (!m) { alert('Medicine not found'); return; }

    showModal(
        '<h3>✏️ Edit Medicine</h3>' +
        '<div class="form-row">' +
            '<div><label>Name</label><input id="e_name" value="' + esc(m.name) + '"></div>' +
            '<div><label>Expiry Date</label><input id="e_expiry" type="date" value="' + m.expiry + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div><label>Quantity</label><input id="e_qty" type="number" value="' + m.quantity + '"></div>' +
            '<div><label>Batch</label><input id="e_batch" value="' + esc(m.batch || '') + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div><label>Price (₹)</label><input id="e_price" type="number" value="' + m.price + '"></div>' +
            '<div><label>Discount (%)</label><input id="e_discount" type="number" value="' + m.discount + '"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
            '<button id="e_cancel" class="btn-secondary">Cancel</button>' +
            '<button id="e_save">💾 Save Changes</button>' +
        '</div>',
        'modalOverlay', 'modalContent'
    );

    document.getElementById('e_cancel').onclick = function() { closeModal('modalOverlay'); };
    document.getElementById('e_save').onclick   = async function() {
        var r = await apiCall(API + '/medicines/' + id, {
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
        if (r) { closeModal('modalOverlay'); loadMedicines(); }
    };
}

/* ── ASSIGN MEDICINE ── */
async function openAssignModal(id) {
    var m = allMedicines.find(function(x) { return x.id === id; });
    if (!m) { alert('Medicine not found'); return; }

    var patients = await apiCall(API + '/patients');
    if (!patients) return;
    if (!patients.length) { alert('No patients found. Please add a patient first.'); return; }

    var opts = patients.map(function(p) {
        return '<option value="' + p.id + '">' + esc(p.name) + ' (Age ' + p.age + ')</option>';
    }).join('');

    showModal(
        '<h3>🔗 Assign Medicine</h3>' +
        '<p style="color:#555;margin-bottom:14px"><strong>' + esc(m.name) + '</strong> — Available: <strong>' + m.quantity + '</strong></p>' +
        '<div class="form-row">' +
            '<div><label>Patient</label><select id="a_patient">' + opts + '</select></div>' +
            '<div><label>Quantity</label><input id="a_qty" type="number" value="1" min="1" max="' + m.quantity + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div style="grid-column:1/-1"><label>Dosage Instructions</label>' +
            '<input id="a_dosage" placeholder="e.g. 1 tablet twice daily after meals"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
            '<button id="a_cancel" class="btn-secondary">Cancel</button>' +
            '<button id="a_submit" class="btn-assign">🔗 Assign</button>' +
        '</div>',
        'modalOverlay', 'modalContent'
    );

    document.getElementById('a_cancel').onclick = function() { closeModal('modalOverlay'); };
    document.getElementById('a_submit').onclick = async function() {
        var patientId = document.getElementById('a_patient').value;
        var quantity  = parseInt(document.getElementById('a_qty').value);
        var dosage    = document.getElementById('a_dosage').value.trim();

        if (!quantity || quantity < 1)   { alert('Enter a valid quantity'); return; }
        if (quantity > m.quantity)       { alert('Only ' + m.quantity + ' units in stock'); return; }

        var r = await apiCall(API + '/assign', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ patientId: patientId, medicineId: id, quantity: quantity, dosage: dosage })
        });
        if (r) { closeModal('modalOverlay'); loadMedicines(); loadDashboard(); }
    };
}

/* ── SELL MEDICINE ── */
function openSellModal(id) {
    var m = allMedicines.find(function(x) { return x.id === id; });
    if (!m) { alert('Medicine not found'); return; }
    if (m.quantity <= 0) { alert('This medicine is out of stock.'); return; }

    var unit = Number(m.finalPrice) || 0;

    showModal(
        '<h3>💰 Record Sale</h3>' +
        '<p style="color:#555;margin-bottom:14px"><strong>' + esc(m.name) + '</strong> — In Stock: <strong>' + m.quantity + '</strong></p>' +
        '<div class="form-row">' +
            '<div><label>Quantity to Sell</label>' +
            '<input id="s_qty" type="number" value="1" min="1" max="' + m.quantity + '"></div>' +
            '<div><label>Unit Price</label><input value="₹' + unit.toFixed(2) + '" disabled style="background:#f1f5f9"></div>' +
        '</div>' +
        '<div style="background:#eff6ff;padding:16px;border-radius:10px;margin:12px 0;font-size:16px">' +
            'Total: <strong style="color:#1e40af">₹<span id="s_total">' + unit.toFixed(2) + '</span></strong>' +
        '</div>' +
        '<div class="modal-actions">' +
            '<button id="s_cancel" class="btn-secondary">Cancel</button>' +
            '<button id="s_submit" class="btn-reduce">💰 Record Sale</button>' +
        '</div>',
        'modalOverlay', 'modalContent'
    );

    document.getElementById('s_cancel').onclick = function() { closeModal('modalOverlay'); };
    document.getElementById('s_qty').oninput = function() {
        var q = parseInt(this.value) || 0;
        document.getElementById('s_total').textContent = (q * unit).toFixed(2);
    };
    document.getElementById('s_submit').onclick = async function() {
        var qty = parseInt(document.getElementById('s_qty').value);
        if (!qty || qty < 1)     { alert('Enter a valid quantity'); return; }
        if (qty > m.quantity)    { alert('Only ' + m.quantity + ' units available'); return; }

        var r1 = await apiCall(API + '/medicines/' + id + '/reduce', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ quantity: qty })
        });
        if (!r1) return;

        await apiCall(API + '/sales', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                medicineId:   id,
                medicineName: m.name,
                quantity:     qty,
                amount:       qty * unit
            })
        });
        closeModal('modalOverlay');
        loadMedicines();
        loadDashboard();
    };
}

/* ════════════════════════════════════════
   PATIENTS
════════════════════════════════════════ */
var allPatients = [];

async function loadPatients() {
    var data = await apiCall(API + '/patients');
    if (!data) return;
    allPatients = data;
    renderPatients(allPatients);
}

function renderPatients(list) {
    var container = document.getElementById('patientList');
    if (!container) return;

    while (container.firstChild) container.removeChild(container.firstChild);

    if (!list.length) {
        container.innerHTML = '<p style="text-align:center;color:#888;padding:40px">No patients found</p>';
        return;
    }

    list.forEach(function(p) {
        var card = document.createElement('div');
        card.className = 'card';
        card.innerHTML =
            '<div class="card-title">' + esc(p.name) + '</div>' +
            '<div class="card-info">' +
                '<strong>Age:</strong> ' + p.age + ' &nbsp;|&nbsp; <strong>Gender:</strong> ' + esc(p.gender) + '<br>' +
                '<strong>Disease:</strong> ' + esc(p.disease) + '<br>' +
                '<strong>Medicines Assigned:</strong> ' + (p.medicines ? p.medicines.length : 0) +
                (p.nextRecheck ? '<br><strong>Next Recheck:</strong> ' + p.nextRecheck : '') +
            '</div>' +
            '<div class="card-actions">' +
                '<button data-action="view">👁️ View</button>' +
                '<button class="btn-edit"   data-action="edit">✏️ Edit</button>' +
                '<button class="btn-delete" data-action="del">🗑️ Delete</button>' +
            '</div>';

        card.querySelector('[data-action="view"]').addEventListener('click', function() { viewPatient(p.id); });
        card.querySelector('[data-action="edit"]').addEventListener('click', function() { openEditPatient(p.id); });
        card.querySelector('[data-action="del"]').addEventListener('click',  function() { deletePatient(p.id); });

        container.appendChild(card);
    });
}

function filterPatients() {
    var q = document.getElementById('patientSearch').value.toLowerCase();
    renderPatients(allPatients.filter(function(p) {
        return p.name.toLowerCase().includes(q) || p.disease.toLowerCase().includes(q);
    }));
}

/* ── ADD PATIENT ── */
async function addPatient() {
    var name        = gv('f_p_name');
    var age         = gv('f_p_age');
    var gender      = gv('f_p_gender');
    var disease     = gv('f_p_disease');
    var nextRecheck = gv('f_p_recheck') || null;

    if (!name || !age || !gender || !disease) {
        alert('Name, Age, Gender and Disease are required.');
        return;
    }
    var r = await apiCall(API + '/patients', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name: name, age: age, gender: gender, disease: disease, nextRecheck: nextRecheck })
    });
    if (!r) return;
    ['f_p_name','f_p_age','f_p_gender','f_p_disease','f_p_recheck']
        .forEach(function(id) { document.getElementById(id).value = ''; });
    loadPatients();
    loadDashboard();
}

/* ── DELETE PATIENT ── */
async function deletePatient(id) {
    if (!confirm('Delete this patient? This cannot be undone.')) return;
    var r = await apiCall(API + '/patients/' + id, { method: 'DELETE' });
    if (r !== null) { loadPatients(); loadDashboard(); }
}

/* ── VIEW PATIENT ── */
function viewPatient(id) {
    var p = allPatients.find(function(x) { return x.id === id; });
    if (!p) { alert('Patient not found'); return; }

    var medsHtml = (p.medicines && p.medicines.length)
        ? p.medicines.map(function(m) {
            return '<div style="padding:12px;border-radius:8px;margin-bottom:8px;background:#f8fafc;border-left:3px solid #2563eb">' +
                '<strong>' + esc(m.medicineName) + '</strong><br>' +
                '<span style="color:#666">Qty: ' + m.quantity + ' | Dosage: ' + esc(m.dosage || '-') + '</span>' +
                '</div>';
          }).join('')
        : '<p style="color:#888">No medicines assigned</p>';

    showModal(
        '<h3>👤 ' + esc(p.name) + '</h3>' +
        '<div class="card-info" style="font-size:14px;line-height:2;margin:12px 0">' +
            '<strong>Age:</strong> ' + p.age + ' &nbsp;|&nbsp; <strong>Gender:</strong> ' + esc(p.gender) + '<br>' +
            '<strong>Disease:</strong> ' + esc(p.disease) +
            (p.nextRecheck ? '<br><strong>Next Recheck:</strong> ' + p.nextRecheck : '') +
        '</div>' +
        '<h4 style="margin:16px 0 8px">Assigned Medicines</h4>' +
        medsHtml +
        '<div class="modal-actions"><button id="vp_close">Close</button></div>',
        'modalOverlayPatients', 'modalContentPatients'
    );
    document.getElementById('vp_close').onclick = function() { closeModal('modalOverlayPatients'); };
}

/* ── EDIT PATIENT ── */
function openEditPatient(id) {
    var p = allPatients.find(function(x) { return x.id === id; });
    if (!p) { alert('Patient not found'); return; }

    showModal(
        '<h3>✏️ Edit Patient</h3>' +
        '<div class="form-row">' +
            '<div><label>Name</label><input id="ep_name" value="' + esc(p.name) + '"></div>' +
            '<div><label>Age</label><input id="ep_age" type="number" value="' + p.age + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div><label>Gender</label><input id="ep_gender" value="' + esc(p.gender) + '"></div>' +
            '<div><label>Disease</label><input id="ep_disease" value="' + esc(p.disease) + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div><label>Next Recheck Date</label><input id="ep_recheck" type="date" value="' + (p.nextRecheck || '') + '"></div>' +
            '<div></div>' +
        '</div>' +
        '<div class="modal-actions">' +
            '<button id="ep_cancel" class="btn-secondary">Cancel</button>' +
            '<button id="ep_save">💾 Save Changes</button>' +
        '</div>',
        'modalOverlayPatients', 'modalContentPatients'
    );

    document.getElementById('ep_cancel').onclick = function() { closeModal('modalOverlayPatients'); };
    document.getElementById('ep_save').onclick = async function() {
        var r = await apiCall(API + '/patients/' + id, {
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
        if (r) { closeModal('modalOverlayPatients'); loadPatients(); }
    };
}

/* ════════════════════════════════════════
   SALES
════════════════════════════════════════ */
async function loadSales() {
    var sales = await apiCall(API + '/sales');
    if (!sales) return;

    var today  = new Date().toISOString().split('T')[0];
    var tSales = sales.filter(function(s) { return s.date === today; });
    var tRev   = tSales.reduce(function(acc, s) { return acc + s.amount; }, 0);

    document.getElementById('todaySalesCount').textContent   = tSales.length;
    document.getElementById('todaySalesRevenue').textContent = '₹' + tRev.toFixed(2);

    var tbody = document.getElementById('salesList');
    tbody.innerHTML = sales.length
        ? sales.map(function(s) {
            return '<tr><td>' + s.date + '</td><td>' + s.time + '</td>' +
                   '<td>' + esc(s.medicineName) + '</td><td>' + s.quantity + '</td>' +
                   '<td>₹' + Number(s.amount).toFixed(2) + '</td></tr>';
          }).join('')
        : '<tr><td colspan="5" style="text-align:center;padding:30px;color:#888">No sales recorded</td></tr>';
}

/* ════════════════════════════════════════
   ANALYTICS
════════════════════════════════════════ */
async function loadAnalytics() {
    var sum   = await apiCall(API + '/analytics/summary');
    var byMed = await apiCall(API + '/analytics/medicine-sales');
    if (!sum) return;

    document.getElementById('totalRevenue').textContent       = '₹' + Number(sum.totalRevenue).toFixed(2);
    document.getElementById('totalSalesCount').textContent    = sum.totalSales;
    document.getElementById('analyticsMedicines').textContent = sum.totalMedicines;
    document.getElementById('analyticsPatients').textContent  = sum.totalPatients;

    document.getElementById('topMedicineInfo').innerHTML = sum.topMedicine
        ? '<div style="font-size:18px;font-weight:700;color:#2563eb">🏆 ' + esc(sum.topMedicine.name) + '</div>' +
          '<p style="margin-top:8px;color:#666">Sold: ' + sum.topMedicine.quantity + ' units</p>'
        : '<p style="color:#888">No sales data yet</p>';

    var tbody = document.getElementById('medicineSalesTable');
    tbody.innerHTML = (byMed && Object.keys(byMed).length)
        ? Object.entries(byMed).map(function(entry) {
            return '<tr><td>' + esc(entry[0]) + '</td><td>' + entry[1].quantity + '</td><td>₹' + Number(entry[1].amount).toFixed(2) + '</td></tr>';
          }).join('')
        : '<tr><td colspan="3" style="text-align:center;padding:30px;color:#888">No data available</td></tr>';
}

/* ════════════════════════════════════════
   EXPOSE to window (for onclick in HTML)
════════════════════════════════════════ */
window.showPage       = showPage;
window.closeModal     = closeModal;
window.addMedicine    = addMedicine;
window.loadMedicines  = loadMedicines;
window.filterMedicines= filterMedicines;
window.filterLowStock = filterLowStock;
window.filterExpired  = filterExpired;
window.addPatient     = addPatient;
window.loadPatients   = loadPatients;
window.filterPatients = filterPatients;
window.loadSales      = loadSales;
window.loadAnalytics  = loadAnalytics;
window.loadDashboard  = loadDashboard;
window.loadAlerts     = loadAlerts;