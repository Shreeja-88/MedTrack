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
    try {
        const res = await fetch(`${API}/medicines`);
        const data = await res.json();
        allMedicines = data;

        const list = document.getElementById("medicineList");
        if (!list) return;

        if (!data || data.length === 0) {
            list.innerHTML =
                `<p style="text-align:center;color:#888;padding:30px;">
                    No medicines available
                </p>`;
            return;
        }

        list.innerHTML = "";

        const today = new Date();

        data.forEach(m => {
            const expiryDate = new Date(m.expiry);
            const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

            let badge = "";
            let stockWarning = "";

            // Expiry status
            if (expiryDate < today) {
                badge = `<span class="badge badge-danger">Expired</span>`;
            } else if (diffDays <= 7) {
                badge = `<span class="badge badge-warning">Expiring Soon</span>`;
            }

            // Low stock
            if (m.quantity <= 5) {
                stockWarning = `<span class="badge badge-low">Low Stock</span>`;
            }

            // Price formatting
            const price = m.price ? `₹${Number(m.price).toFixed(2)}` : "-";
            const discount = m.discount ? `${m.discount}%` : "-";
            const finalPrice = m.finalPrice ? `₹${Number(m.finalPrice).toFixed(2)}` : "-";

            list.innerHTML += `
                <div class="card">
                    <div class="card-title">${m.name}</div>

                    <div class="card-info">
                        <div><strong>Quantity:</strong> ${m.quantity}</div>
                        <div><strong>Expiry:</strong> ${m.expiry}</div>
                        ${m.batch ? `<div><strong>Batch:</strong> ${m.batch}</div>` : ""}
                        <div><strong>Price:</strong> ${price}</div>
                        <div><strong>Discount:</strong> ${discount}</div>
                        <div><strong>Final Price:</strong> ${finalPrice}</div>

                        <div style="margin-top:8px;">
                            ${badge}
                            ${stockWarning}
                        </div>
                    </div>

                    <div class="card-actions">
                        <button class="btn-edit"
                            onclick="openEditModal(
                                '${m.id}',
                                '${m.name}',
                                '${m.expiry}',
                                ${m.quantity},
                                '${m.batch || ''}',
                                ${m.price || 0},
                                ${m.discount || 0}
                            )">
                            Edit
                        </button>

                        <button class="btn-reduce"
                            onclick="openReduceStockModal('${m.id}','${m.name}')">
                            Reduce
                        </button>

                        <button class="btn-delete"
                            onclick="deleteMedicine('${m.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error loading medicines:", error);
    }
}

function openEditModal(id, name, expiry, quantity, batch, price = 0, discount = 0) {
    currentEditId = id;

    document.getElementById("editName").value = name;
    document.getElementById("editExpiry").value = expiry;
    document.getElementById("editQuantity").value = quantity;
    document.getElementById("editBatch").value = batch || "";
    document.getElementById("editPrice").value = price || 0;
    document.getElementById("editDiscount").value = discount || 0;

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
    const amount = parseInt(document.getElementById("reduceAmount").value);

    if (!amount || amount <= 0) {
        alert("Please enter a valid quantity.");
        return;
    }

    const res = await fetch(`${API}/reduce-stock/${currentReduceStockId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: amount })
    });

    if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Stock reduction failed");
        return;
    }

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
/* ================= ASSIGN MEDICINE ================= */

async function openAssignMedicineModal(patientId, patientName) {
    currentPatientId = patientId;

    document.getElementById("assignPatientName").innerText =
        `Patient: ${patientName}`;

    document.getElementById("medicineQuantity").value = "";
    document.getElementById("dosage").value = "";

    const res = await fetch(`${API}/medicines`);
    const medicines = await res.json();

    const select = document.getElementById("medicineSelect");
    select.innerHTML = `<option value="">Select Medicine</option>`;

    medicines.forEach(m => {
        if (m.quantity > 0) {
            select.innerHTML += `
                <option value="${m.id}">
                    ${m.name} (${m.quantity} available)
                </option>
            `;
        }
    });

    document
        .getElementById("assignMedicineModal")
        .classList.add("active");
}

async function confirmAssignMedicine() {
    const medicineId = document.getElementById("medicineSelect").value;
    const quantity = document.getElementById("medicineQuantity").value;
    const dosage = document.getElementById("dosage").value;

    if (!medicineId || !quantity || !dosage) {
        alert("Fill all fields");
        return;
    }

    await fetch(`${API}/assign-medicine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            patientId: currentPatientId,
            medicineId,
            quantity,
            dosage
        })
    });

    document
        .getElementById("assignMedicineModal")
        .classList.remove("active");

    loadPatients();
    loadMedicines();
}

/* ======================= INIT ======================= */

loadMedicines();
loadPatients();