const API = "/api";

let currentEditId = null;
let currentPatientId = null;
let currentReduceStockId = null;

let allMedicines = [];
let allPatients = [];

/* ======================= MEDICINES ======================= */

async function addMedicine() {
    const name = document.getElementById("name").value.trim();
    const expiry = document.getElementById("expiry").value;
    const quantity = document.getElementById("quantity").value;
    const batch = document.getElementById("batch").value.trim();
    const price = document.getElementById("price")?.value || 0;
    const discount = document.getElementById("discount")?.value || 0;

    if (!name || !expiry || !quantity) {
        alert("Please fill required fields");
        return;
    }

    await fetch(`${API}/medicines`, {
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

    document.querySelectorAll(".form-section input").forEach(i => i.value = "");
    loadMedicines();
}

async function loadMedicines() {
    const res = await fetch(`${API}/medicines`);
    const data = await res.json();
    allMedicines = data;

    const list = document.getElementById("medicineList");
    if (!list) return;

    if (data.length === 0) {
        list.innerHTML = "<p style='text-align:center;color:#888'>No medicines available</p>";
        return;
    }

    list.innerHTML = "";

    data.forEach(m => {
        const expiryDate = new Date(m.expiry);
        const today = new Date();

        const diffDays = (expiryDate - today) / (1000 * 60 * 60 * 24);
        let badge = "";

        if (expiryDate < today) {
            badge = `<span style="color:#ff0080;font-weight:bold">EXPIRED</span>`;
        } else if (diffDays <= 7) {
            badge = `<span style="color:#ff9500;font-weight:bold">Expiring Soon</span>`;
        }

        let stockWarning = "";
        if (m.quantity <= 5) {
            stockWarning = `<div style="color:red;font-weight:bold;">Low Stock!</div>`;
        }

        list.innerHTML += `
            <div class="card">
                <div class="card-title">${m.name}</div>
                <div class="card-info">
                    <strong>Quantity:</strong> ${m.quantity} units<br>
                    <strong>Expiry:</strong> ${m.expiry}<br>
                    ${m.batch ? `<strong>Batch:</strong> ${m.batch}<br>` : ""}
                    ${m.price ? `<strong>Price:</strong> ₹${m.price}<br>` : ""}
                    ${m.discount ? `<strong>Discount:</strong> ${m.discount}%<br>` : ""}
                    ${m.finalPrice ? `<strong>Final Price:</strong> ₹${m.finalPrice}<br>` : ""}
                    ${badge}
                    ${stockWarning}
                </div>
                <div class="card-actions">
                    <button class="btn-edit" onclick="openEditModal('${m.id}','${m.name}','${m.expiry}',${m.quantity},'${m.batch || ''}')">Edit</button>
                    <button class="btn-reduce" onclick="openReduceStockModal('${m.id}','${m.name}')">Reduce</button>
                    <button class="btn-delete" onclick="deleteMedicine('${m.id}')">Delete</button>
                </div>
            </div>
        `;
    });
}

async function deleteMedicine(id) {
    if (!confirm("Delete this medicine?")) return;
    await fetch(`${API}/medicines/${id}`, { method: "DELETE" });
    loadMedicines();
}

function openEditModal(id, name, expiry, quantity, batch) {
    currentEditId = id;
    document.getElementById("editName").value = name;
    document.getElementById("editExpiry").value = expiry;
    document.getElementById("editQuantity").value = quantity;
    document.getElementById("editBatch").value = batch;
    document.getElementById("editModal").classList.add("active");
}

async function updateMedicine() {
    const name = document.getElementById("editName").value.trim();
    const expiry = document.getElementById("editExpiry").value;
    const quantity = document.getElementById("editQuantity").value;
    const batch = document.getElementById("editBatch").value.trim();

    await fetch(`${API}/medicines/${currentEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, expiry, quantity, batch })
    });

    closeModal();
    loadMedicines();
}

function closeModal() {
    document.getElementById("editModal").classList.remove("active");
}

function openReduceStockModal(id, name) {
    currentReduceStockId = id;
    document.getElementById("reduceStockMedicineName").innerText = name;
    document.getElementById("reduceStockModal").classList.add("active");
}

async function confirmReduceStock() {
    const qty = document.getElementById("reduceAmount").value;
    await fetch(`${API}/reduce-stock/${currentReduceStockId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty })
    });

    document.getElementById("reduceStockModal").classList.remove("active");
    loadMedicines();
}

/* ======================= PATIENTS ======================= */

async function addPatient() {
    const name = document.getElementById("pname").value.trim();
    const age = document.getElementById("age").value;
    const gender = document.getElementById("gender").value.trim();
    const disease = document.getElementById("disease").value.trim();

    if (!name || !age || !gender || !disease) {
        alert("Fill all fields");
        return;
    }

    await fetch(`${API}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age, gender, disease })
    });

    document.querySelectorAll(".form-section input").forEach(i => i.value = "");
    loadPatients();
}

async function loadPatients() {
    const res = await fetch(`${API}/patients`);
    const data = await res.json();
    allPatients = data;

    const list = document.getElementById("patientList");
    if (!list) return;

    if (data.length === 0) {
        list.innerHTML = "<p style='text-align:center;color:#888'>No patients found</p>";
        return;
    }

    list.innerHTML = "";

    data.forEach(p => {
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
    await fetch(`${API}/patients/${id}`, { method: "DELETE" });
    loadPatients();
}

/* ======================= INIT ======================= */

loadMedicines();
loadPatients();