const API = "/api";

/* SAFE FETCH */
async function apiCall(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            alert(data.error || "Error occurred");
            return null;
        }
        return data;
    } catch (err) {
        alert("Server not running");
        return null;
    }
}

/* INIT */
window.onload = function () {
    if (document.getElementById("medicineList"))
        loadMedicines();

    if (document.getElementById("patientList"))
        loadPatients();
};

/* ============== MODAL HELPERS ============== */
function showModal(html, opts = {}) {
    const overlayId = opts.overlayId || 'modalOverlay';
    const contentId = opts.contentId || 'modalContent';
    const overlay = document.getElementById(overlayId);
    const content = document.getElementById(contentId);
    if (!overlay || !content) return;
    content.innerHTML = html;
    overlay.classList.add('active');
}

function closeModal(overlayId = 'modalOverlay') {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.classList.remove('active');
}

/* ================= MEDICINES ================= */

async function loadMedicines() {
    const medicines = await apiCall(`${API}/medicines`);
    if (!medicines) return;

    const list = document.getElementById("medicineList");
    list.innerHTML = "";

    const today = new Date().toISOString().split('T')[0];

    medicines.forEach(m => {
        const lowBadge = m.quantity <= 10 ? '<span class="badge badge-low">Low</span>' : '';
        const expired = m.expiry <= today;
        const expBadge = expired ? '<span class="badge badge-danger">Expired</span>' : '';

        list.innerHTML += `
            <div class="card">
                <div class="card-title">${m.name} ${lowBadge} ${expBadge}</div>
                <div class="card-info">
                    Quantity: ${m.quantity}<br>
                    Expiry: ${m.expiry}<br>
                    Batch: ${m.batch || '-'}<br>
                    Price: ₹${m.price} | Discount: ${m.discount}%<br>
                    Final: ₹${m.finalPrice}
                </div>
                <div class="card-actions">
                    <button class="btn-edit" onclick="openEditMedicine('${m.id}')">Edit</button>
                    <button class="btn-assign" onclick="openAssignModal('${m.id}')">Assign</button>
                    <button class="btn-reduce" onclick="openReduceModal('${m.id}')">Reduce</button>
                    <button class="btn-delete" onclick="deleteMedicine('${m.id}')">Delete</button>
                </div>
            </div>
        `;
    });
}

async function addMedicine() {
    const name = document.getElementById("name").value.trim();
    const expiry = document.getElementById("expiry").value;
    const quantity = document.getElementById("quantity").value;
    const batch = document.getElementById("batch").value;
    const price = document.getElementById("price").value;
    const discount = document.getElementById("discount").value;

    if (!name || !expiry || !quantity) {
        alert("Fill required fields");
        return;
    }

    await apiCall(`${API}/medicines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, expiry, quantity, batch, price, discount })
    });

    document.querySelectorAll(".form-section input").forEach(i => i.value = "");
    loadMedicines();
}

async function deleteMedicine(id) {
    if (!confirm("Delete this medicine?")) return;
    await apiCall(`${API}/medicines/${id}`, { method: "DELETE" });
    loadMedicines();
}

async function openEditMedicine(id) {
    const meds = await apiCall(`${API}/medicines`);
    if (!meds) return;
    const m = meds.find(x => x.id === id);
    if (!m) return alert('Medicine not found');

    const html = `
        <h3>Edit Medicine</h3>
        <div class="form-row">
            <input id="e_name" value="${m.name}">
            <input id="e_expiry" type="date" value="${m.expiry}">
        </div>
        <div class="form-row">
            <input id="e_quantity" type="number" value="${m.quantity}">
            <input id="e_batch" value="${m.batch || ''}">
        </div>
        <div class="form-row">
            <input id="e_price" type="number" value="${m.price}">
            <input id="e_discount" type="number" value="${m.discount}">
        </div>
        <div class="modal-actions">
            <button onclick="submitEditMedicine('${id}')">Save</button>
            <button onclick="closeModal()">Cancel</button>
        </div>
    `;

    showModal(html);
}

async function submitEditMedicine(id) {
    const name = document.getElementById('e_name').value.trim();
    const expiry = document.getElementById('e_expiry').value;
    const quantity = document.getElementById('e_quantity').value;
    const batch = document.getElementById('e_batch').value;
    const price = document.getElementById('e_price').value;
    const discount = document.getElementById('e_discount').value;

    await apiCall(`${API}/medicines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, expiry, quantity, batch, price, discount })
    });

    closeModal();
    loadMedicines();
}

async function openAssignModal(id) {
    const meds = await apiCall(`${API}/medicines`);
    const med = meds && meds.find(m => m.id === id);
    if (!med) return alert('Medicine not found');

    const patients = await apiCall(`${API}/patients`);
    if (!patients) return;

    const options = patients.map(p => `<option value="${p.id}">${p.name} (${p.age})</option>`).join('');

    const html = `
        <h3>Assign ${med.name}</h3>
        <div class="form-row">
            <select id="assign_patient">${options}</select>
            <input id="assign_qty" type="number" value="1">
        </div>
        <div class="form-row">
            <input id="assign_dosage" placeholder="Dosage (e.g. 1x daily)">
        </div>
        <div class="modal-actions">
            <button onclick="submitAssign('${id}')">Assign</button>
            <button onclick="closeModal()">Cancel</button>
        </div>
    `;

    showModal(html);
}

async function submitAssign(medicineId) {
    const patientId = document.getElementById('assign_patient').value;
    const quantity = document.getElementById('assign_qty').value;
    const dosage = document.getElementById('assign_dosage').value.trim();

    await apiCall(`${API}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, medicineId, quantity, dosage })
    });

    closeModal();
    loadMedicines();
    loadPatients();
}

async function openReduceModal(id) {
    const meds = await apiCall(`${API}/medicines`);
    const med = meds && meds.find(m => m.id === id);
    if (!med) return alert('Medicine not found');

    const html = `
        <h3>Reduce Stock - ${med.name}</h3>
        <div class="form-row">
            <input id="reduce_qty" type="number" value="1">
        </div>
        <div class="modal-actions">
            <button onclick="submitReduce('${id}')">Reduce</button>
            <button onclick="closeModal()">Cancel</button>
        </div>
    `;

    showModal(html);
}

async function submitReduce(id) {
    const quantity = parseInt(document.getElementById('reduce_qty').value || 0);
    if (!quantity || quantity <= 0) return alert('Invalid quantity');

    await apiCall(`${API}/medicines/${id}/reduce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
    });

    closeModal();
    loadMedicines();
}

/* ================= PATIENTS ================= */

async function loadPatients() {
    const patients = await apiCall(`${API}/patients`);
    if (!patients) return;

    const list = document.getElementById("patientList");
    list.innerHTML = "";

    patients.forEach(p => {
        list.innerHTML += `
            <div class="card">
                <div class="card-title">${p.name}</div>
                <div class="card-info">
                    Age: ${p.age}<br>
                    Gender: ${p.gender}<br>
                    Disease: ${p.disease}<br>
                    Medicines: ${p.medicines?.length || 0}
                </div>
                <div class="card-actions">
                    <button onclick="viewPatient('${p.id}')">View</button>
                    <button class="btn-edit" onclick="openEditPatient('${p.id}')">Edit</button>
                    <button class="btn-delete" onclick="deletePatient('${p.id}')">Delete</button>
                </div>
            </div>
        `;
    });
}

async function addPatient() {
    const name = document.getElementById("pname").value.trim();
    const age = document.getElementById("age").value;
    const gender = document.getElementById("gender").value.trim();
    const disease = document.getElementById("disease").value.trim();

    if (!name || !age || !gender || !disease) {
        alert("Fill required fields");
        return;
    }

    await apiCall(`${API}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, gender, disease })
    });

    document.querySelectorAll("#pname,#age,#gender,#disease")
        .forEach(id => document.getElementById(id).value = "");

    loadPatients();
}

async function deletePatient(id) {
    if (!confirm("Delete this patient?")) return;
    await apiCall(`${API}/patients/${id}`, { method: "DELETE" });
    loadPatients();
}

async function viewPatient(id) {
    const patients = await apiCall(`${API}/patients`);
    if (!patients) return;
    const p = patients.find(x => x.id === id);
    if (!p) return alert('Patient not found');

    const medsHtml = (p.medicines || []).map(m => `
        <div style="padding:8px;border-radius:8px;margin-bottom:8px;background:#f8fafc;">
            <strong>${m.medicineName}</strong><br>
            Qty: ${m.quantity} | Dosage: ${m.dosage}
        </div>
    `).join('') || '<p style="color:#888;">No medicines assigned</p>';

    const html = `
        <h3>${p.name}</h3>
        <div class="card-info">
            Age: ${p.age}<br>
            Gender: ${p.gender}<br>
            Disease: ${p.disease}<br>
        </div>
        <h4 style="margin-top:16px;">Assigned Medicines</h4>
        ${medsHtml}
        <div class="modal-actions">
            <button onclick="closeModal('modalOverlayPatients')">Close</button>
        </div>
    `;

    showModal(html, { overlayId: 'modalOverlayPatients', contentId: 'modalContentPatients' });
}

async function openEditPatient(id) {
    const patients = await apiCall(`${API}/patients`);
    if (!patients) return;
    const p = patients.find(x => x.id === id);
    if (!p) return alert('Patient not found');

    const html = `
        <h3>Edit Patient</h3>
        <div class="form-row">
            <input id="ep_name" value="${p.name}">
            <input id="ep_age" type="number" value="${p.age}">
        </div>
        <div class="form-row">
            <input id="ep_gender" value="${p.gender}">
            <input id="ep_disease" value="${p.disease}">
        </div>
        <div class="form-row">
            <input id="ep_nextRecheck" type="date" value="${p.nextRecheck || ''}">
        </div>
        <div class="modal-actions">
            <button onclick="submitEditPatient('${id}')">Save</button>
            <button onclick="closeModal('modalOverlayPatients')">Cancel</button>
        </div>
    `;

    showModal(html, { overlayId: 'modalOverlayPatients', contentId: 'modalContentPatients' });
}

async function submitEditPatient(id) {
    const name = document.getElementById('ep_name').value.trim();
    const age = document.getElementById('ep_age').value;
    const gender = document.getElementById('ep_gender').value.trim();
    const disease = document.getElementById('ep_disease').value.trim();
    const nextRecheck = document.getElementById('ep_nextRecheck').value || undefined;

    await apiCall(`${API}/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, age, gender, disease, nextRecheck })
    });

    closeModal('modalOverlayPatients');
    loadPatients();
}

// Expose functions for inline onclick handlers
window.addMedicine = addMedicine;
window.deleteMedicine = deleteMedicine;
window.openEditMedicine = openEditMedicine;
window.openAssignModal = openAssignModal;
window.openReduceModal = openReduceModal;
window.submitAssign = submitAssign;
window.submitReduce = submitReduce;
window.submitEditMedicine = submitEditMedicine;

window.addPatient = addPatient;
window.deletePatient = deletePatient;
window.viewPatient = viewPatient;
window.openEditPatient = openEditPatient;
window.submitEditPatient = submitEditPatient;