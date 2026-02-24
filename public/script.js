const API = "/api";

let currentEditId = null;
let currentPatientId = null;
let currentReduceStockId = null;

/* ======================= SAFE FETCH ======================= */

async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            alert(data.error || "Something went wrong");
            return null;
        }

        return data;
    } catch (err) {
        alert("Server connection failed");
        return null;
    }
}

/* ======================= MEDICINES ======================= */

async function addMedicine() {
    const name = document.getElementById("name")?.value.trim();
    const expiry = document.getElementById("expiry")?.value;
    const quantity = document.getElementById("quantity")?.value;
    const batch = document.getElementById("batch")?.value.trim() || "";
    const price = document.getElementById("price")?.value || 0;
    const discount = document.getElementById("discount")?.value || 0;

    if (!name || !expiry || !quantity) {
        alert("Please fill required fields");
        return;
    }

    const result = await safeFetch(`${API}/medicines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            expiry,
            quantity,
            batch,
            price,
            discount
        })
    });

    if (!result) return;

    document.querySelectorAll(".form-section input").forEach(i => i.value = "");
    loadMedicines();
}

async function loadMedicines() {
    const medicines = await safeFetch(`${API}/medicines`);
    if (!medicines) return;

    const list = document.getElementById("medicineList");
    if (!list) return;

    if (medicines.length === 0) {
        list.innerHTML = `<p style="text-align:center;color:#888;padding:30px;">No medicines available</p>`;
        return;
    }

    list.innerHTML = "";
    const today = new Date();

    medicines.forEach(m => {
        const expiryDate = new Date(m.expiry);
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        let badge = "";
        if (expiryDate < today)
            badge = `<span class="badge badge-danger">Expired</span>`;
        else if (diffDays <= 7)
            badge = `<span class="badge badge-warning">Expiring Soon</span>`;

        const stockWarning =
            m.quantity <= 5
                ? `<span class="badge badge-low">Low Stock</span>`
                : "";

        list.innerHTML += `
            <div class="card">
                <div class="card-title">${m.name}</div>
                <div class="card-info">
                    <div><strong>Quantity:</strong> ${m.quantity}</div>
                    <div><strong>Expiry:</strong> ${m.expiry}</div>
                    ${m.batch ? `<div><strong>Batch:</strong> ${m.batch}</div>` : ""}
                    <div><strong>Price:</strong> ₹${m.price || 0}</div>
                    <div><strong>Discount:</strong> ${m.discount || 0}%</div>
                    <div><strong>Final Price:</strong> ₹${m.finalPrice || 0}</div>
                    <div style="margin-top:8px;">${badge} ${stockWarning}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-edit" onclick="openEditModal('${m.id}')">Edit</button>
                    <button class="btn-reduce" onclick="openReduceStockModal('${m.id}','${m.name}')">Reduce</button>
                    <button class="btn-delete" onclick="deleteMedicine('${m.id}')">Delete</button>
                </div>
            </div>
        `;
    });
}

/* ================= EDIT ================= */

async function openEditModal(id) {
    const medicines = await safeFetch(`${API}/medicines`);
    if (!medicines) return;

    const med = medicines.find(m => m.id === id);
    if (!med) return;

    currentEditId = id;

    document.getElementById("editName").value = med.name;
    document.getElementById("editExpiry").value = med.expiry;
    document.getElementById("editQuantity").value = med.quantity;
    document.getElementById("editBatch").value = med.batch || "";
    document.getElementById("editPrice").value = med.price || 0;
    document.getElementById("editDiscount").value = med.discount || 0;

    document.getElementById("editModal").classList.add("active");
}

async function updateMedicine() {
    const data = {
        name: document.getElementById("editName").value.trim(),
        expiry: document.getElementById("editExpiry").value,
        quantity: document.getElementById("editQuantity").value,
        batch: document.getElementById("editBatch").value.trim(),
        price: document.getElementById("editPrice").value,
        discount: document.getElementById("editDiscount").value
    };

    const result = await safeFetch(`${API}/medicines/${currentEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!result) return;

    closeModal();
    loadMedicines();
}

function closeModal() {
    document.getElementById("editModal").classList.remove("active");
}

/* ================= DELETE ================= */

async function deleteMedicine(id) {
    if (!confirm("Delete this medicine?")) return;
    await safeFetch(`${API}/medicines/${id}`, { method: "DELETE" });
    loadMedicines();
}

/* ================= REDUCE STOCK ================= */

function openReduceStockModal(id, name) {
    currentReduceStockId = id;
    document.getElementById("reduceStockMedicineName").innerText = name;
    document.getElementById("reduceAmount").value = "";
    document.getElementById("reduceStockModal").classList.add("active");
}

async function confirmReduceStock() {
    const amount = parseInt(document.getElementById("reduceAmount").value);

    if (!amount || amount <= 0) {
        alert("Enter valid quantity");
        return;
    }

    const result = await safeFetch(`${API}/reduce-stock/${currentReduceStockId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: amount })
    });

    if (!result) return;

    document.getElementById("reduceStockModal").classList.remove("active");
    loadMedicines();
}

/* ================= PATIENTS ================= */

async function loadPatients() {
    const patients = await safeFetch(`${API}/patients`);
    if (!patients) return;

    const list = document.getElementById("patientList");
    if (!list) return;

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
                    <button class="btn-assign" onclick="openAssignMedicineModal('${p.id}','${p.name}')">Assign</button>
                    <button class="btn-delete" onclick="deletePatient('${p.id}')">Delete</button>
                </div>
            </div>
        `;
    });
}

async function deletePatient(id) {
    if (!confirm("Delete patient?")) return;
    await safeFetch(`${API}/patients/${id}`, { method: "DELETE" });
    loadPatients();
}

/* ================= ASSIGN ================= */

async function openAssignMedicineModal(patientId, patientName) {
    currentPatientId = patientId;

    document.getElementById("assignPatientName").innerText =
        `Patient: ${patientName}`;

    const medicines = await safeFetch(`${API}/medicines`);
    if (!medicines) return;

    const select = document.getElementById("medicineSelect");
    select.innerHTML = `<option value="">Select Medicine</option>`;

    medicines.forEach(m => {
        if (m.quantity > 0) {
            select.innerHTML += `<option value="${m.id}">${m.name} (${m.quantity} available)</option>`;
        }
    });

    document.getElementById("assignMedicineModal").classList.add("active");
}

async function confirmAssignMedicine() {
    const medicineId = document.getElementById("medicineSelect").value;
    const quantity = document.getElementById("medicineQuantity").value;
    const dosage = document.getElementById("dosage").value;

    if (!medicineId || !quantity || !dosage) {
        alert("Fill all fields");
        return;
    }

    const result = await safeFetch(`${API}/assign-medicine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            patientId: currentPatientId,
            medicineId,
            quantity,
            dosage
        })
    });

    if (!result) return;

    document.getElementById("assignMedicineModal").classList.remove("active");
    loadPatients();
    loadMedicines();
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
    loadMedicines();
    loadPatients();
});