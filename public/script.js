const API = "/api";

let currentEditId = null;
let currentPatientId = null;
let allMedicines = [];
let allPatients = [];
let currentReduceStockId = null;

// ==================== MEDICINES ====================

/* Add Medicine */
async function addMedicine() {
    const name = document.getElementById("name").value.trim();
    const expiry = document.getElementById("expiry").value;
    const quantity = document.getElementById("quantity").value;
    const batch = document.getElementById("batch").value.trim();

    if (!name || !expiry || !quantity) {
        alert("Please fill in all required fields");
        return;
    }

    try {
        const res = await fetch(`${API}/medicines`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, expiry, quantity, batch })
        });

        if (res.ok) {
            document.getElementById("name").value = "";
            document.getElementById("expiry").value = "";
            document.getElementById("quantity").value = "";
            document.getElementById("batch").value = "";
            loadMedicines();
        }
    } catch (error) {
        console.error("Error adding medicine:", error);
        alert("Error adding medicine. Please try again.");
    }
}

/* Load Medicines */
async function loadMedicines() {
    try {
        const res = await fetch(`${API}/medicines`);
        const data = await res.json();
        allMedicines = data;

        const list = document.getElementById("medicineList");
        if (!list) return;

        if (data.length === 0) {
            list.innerHTML = "<p style='text-align: center; color: #999; padding: 40px;'>No medicines added yet. Add one to get started!</p>";
            return;
        }

        list.innerHTML = "";
        data.forEach(m => {
            const expiryDate = new Date(m.expiry);
            const today = new Date();
            const isExpired = expiryDate < today;
            const isExpiringSoon = (expiryDate - today) / (1000 * 60 * 60 * 24) < 7;

            let statusClass = "";
            let statusText = "";
            if (isExpired) {
                statusClass = "style='color: #ff0080;'";
                statusText = "EXPIRED";
            } else if (isExpiringSoon) {
                statusClass = "style='color: #ff9500;'";
                statusText = "EXPIRING SOON";
            }

            list.innerHTML += `
                <div class="card">
                    <div class="card-title">${m.name}</div>
                    <div class="card-info">
                        <strong>Quantity:</strong> ${m.quantity} units<br>
                        <strong>Expiry Date:</strong> ${m.expiry}<br>
                        ${m.batch ? `<strong>Batch:</strong> ${m.batch}<br>` : ""}
                        <span ${statusClass}>${statusText}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditModal('${m.id}', '${m.name}', '${m.expiry}', ${m.quantity}, '${m.batch || ''}')">Edit</button>
                        <button class="btn-reduce" onclick="openReduceStockModal('${m.id}', '${m.name}')">Reduce Stock</button>
                        <button class="btn-delete" onclick="deleteMedicine('${m.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading medicines:", error);
    }
}

/* Open Edit Modal */
function openEditModal(id, name, expiry, quantity, batch) {
    currentEditId = id;
    document.getElementById("editName").value = name;
    document.getElementById("editExpiry").value = expiry;
    document.getElementById("editQuantity").value = quantity;
    document.getElementById("editBatch").value = batch;
    document.getElementById("editModal").classList.add("active");
}

/* Update Medicine */
async function updateMedicine() {
    const name = document.getElementById("editName").value.trim();
    const expiry = document.getElementById("editExpiry").value;
    const quantity = document.getElementById("editQuantity").value;
    const batch = document.getElementById("editBatch").value.trim();

    if (!name || !expiry || !quantity) {
        alert("Please fill in all required fields");
        return;
    }

    try {
        const res = await fetch(`${API}/medicines/${currentEditId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, expiry, quantity, batch })
        });

        if (res.ok) {
            closeModal();
            loadMedicines();
        }
    } catch (error) {
        console.error("Error updating medicine:", error);
        alert("Error updating medicine. Please try again.");
    }
}

/* Delete Medicine */
async function deleteMedicine(id) {
    if (!confirm("Are you sure you want to delete this medicine?")) return;

    try {
        const res = await fetch(`${API}/medicines/${id}`, { method: "DELETE" });
        if (res.ok) {
            loadMedicines();
        }
    } catch (error) {
        console.error("Error deleting medicine:", error);
        alert("Error deleting medicine. Please try again.");
    }
}

/* Open Reduce Stock Modal */
function openReduceStockModal(id, name) {
    currentReduceStockId = id;
    document.getElementById("reduceStockMedicineName").textContent = `Medicine: ${name}`;
    document.getElementById("reduceAmount").value = "";
    document.getElementById("reduceStockModal").classList.add("active");
}

/* Close Reduce Stock Modal */
function closeReduceStockModal() {
    document.getElementById("reduceStockModal").classList.remove("active");
    currentReduceStockId = null;
}

/* Confirm Reduce Stock */
async function confirmReduceStock() {
    const amount = document.getElementById("reduceAmount").value;

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount");
        return;
    }

    try {
        const res = await fetch(`${API}/reduce-stock/${currentReduceStockId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: amount })
        });

        if (res.ok) {
            closeReduceStockModal();
            loadMedicines();
        } else {
            const error = await res.json();
            alert(error.error || "Error reducing stock");
        }
    } catch (error) {
        console.error("Error reducing stock:", error);
        alert("Error reducing stock. Please try again.");
    }
}

/* Search Medicines */
async function searchMedicines() {
    const searchTerm = document.getElementById("medicineSearch").value.trim();
    try {
        const url = searchTerm 
            ? `${API}/medicines?search=${encodeURIComponent(searchTerm)}`
            : `${API}/medicines`;
        const res = await fetch(url);
        const data = await res.json();
        
        const list = document.getElementById("medicineList");
        if (data.length === 0) {
            list.innerHTML = "<p style='text-align: center; color: #999; padding: 40px;'>No medicines found</p>";
            return;
        }

        list.innerHTML = "";
        data.forEach(m => {
            list.innerHTML += `
                <div class="card">\n                    <div class="card-title">${m.name}</div>\n                    <div class="card-info">\n                        <strong>Quantity:</strong> ${m.quantity} units<br>\n                        <strong>Expiry Date:</strong> ${m.expiry}<br>\n                        ${m.batch ? `<strong>Batch:</strong> ${m.batch}<br>` : ""}\n                    </div>\n                    <div class="card-actions">\n                        <button class="btn-edit" onclick="openEditModal('${m.id}', '${m.name}', '${m.expiry}', ${m.quantity}, '${m.batch || ''}')">Edit</button>\n                        <button class="btn-reduce" onclick="openReduceStockModal('${m.id}', '${m.name}')">Reduce Stock</button>\n                        <button class="btn-delete" onclick="deleteMedicine('${m.id}')">Delete</button>\n                    </div>\n                </div>\n            `;
        });
    } catch (error) {
        console.error("Error searching medicines:", error);
    }
}

/* Close Modal */
function closeModal() {
    document.getElementById("editModal").classList.remove("active");
    currentEditId = null;
}

// ==================== PATIENTS ====================

/* Add Patient */
async function addPatient() {
    const name = document.getElementById("pname").value.trim();
    const age = document.getElementById("age").value;
    const gender = document.getElementById("gender").value.trim();
    const disease = document.getElementById("disease").value.trim();

    if (!name || !age || !gender || !disease) {
        alert("Please fill in all required fields");
        return;
    }

    try {
        const res = await fetch(`${API}/patients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, age, gender, disease })
        });

        if (res.ok) {
            document.getElementById("pname").value = "";
            document.getElementById("age").value = "";
            document.getElementById("gender").value = "";
            document.getElementById("disease").value = "";
            loadPatients();
        }
    } catch (error) {
        console.error("Error adding patient:", error);
        alert("Error adding patient. Please try again.");
    }
}

/* Load Patients */
async function loadPatients() {
    try {
        const res = await fetch(`${API}/patients`);
        const data = await res.json();
        allPatients = data;

        const list = document.getElementById("patientList");
        if (!list) return;

        if (data.length === 0) {
            list.innerHTML = "<p style='text-align: center; color: #999; padding: 40px;'>No patients added yet. Add one to get started!</p>";
            return;
        }

        list.innerHTML = "";
        data.forEach(p => {
            const medicineCount = (p.medicines && p.medicines.length) || 0;
            const medicinesHTML = medicineCount > 0 
                ? `<span class="medicine-badge">${medicineCount} medicine(s) assigned</span>` 
                : "<span style='color: #999;'>No medicines assigned</span>";

            list.innerHTML += `
                <div class="card">
                    <div class="card-title">${p.name}</div>
                    <div class="card-info">
                        <strong>Age:</strong> ${p.age} years<br>
                        <strong>Gender:</strong> ${p.gender}<br>
                        <strong>Disease:</strong> ${p.disease}<br>
                        ${medicinesHTML}
                    </div>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditPatientModal('${p.id}', '${p.name}', ${p.age}, '${p.gender}', '${p.disease}')">Edit</button>
                        <button class="btn-assign" onclick="openAssignMedicineModal('${p.id}', '${p.name}')">Assign Medicine</button>
                        ${medicineCount > 0 ? `<button class="btn-edit" onclick="viewPatientMedicines('${p.id}', '${p.name}')">View Medicines</button>` : ""}
                        <button class="btn-delete" onclick="deletePatient('${p.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading patients:", error);
    }
}

/* Open Edit Patient Modal */
function openEditPatientModal(id, name, age, gender, disease) {
    currentPatientId = id;
    document.getElementById("editPname").value = name;
    document.getElementById("editAge").value = age;
    document.getElementById("editGender").value = gender;
    document.getElementById("editDisease").value = disease;
    document.getElementById("editPatientModal").classList.add("active");
}

/* Update Patient */
async function updatePatient() {
    const name = document.getElementById("editPname").value.trim();
    const age = document.getElementById("editAge").value;
    const gender = document.getElementById("editGender").value.trim();
    const disease = document.getElementById("editDisease").value.trim();

    if (!name || !age || !gender || !disease) {
        alert("Please fill in all required fields");
        return;
    }

    try {
        const res = await fetch(`${API}/patients/${currentPatientId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, age, gender, disease })
        });

        if (res.ok) {
            closePatientModal();
            loadPatients();
        }
    } catch (error) {
        console.error("Error updating patient:", error);
        alert("Error updating patient. Please try again.");
    }
}

/* Delete Patient */
async function deletePatient(id) {
    if (!confirm("Are you sure you want to delete this patient? This will also remove all assigned medicines.")) return;

    try {
        const res = await fetch(`${API}/patients/${id}`, { method: "DELETE" });
        if (res.ok) {
            loadPatients();
        }
    } catch (error) {
        console.error("Error deleting patient:", error);
        alert("Error deleting patient. Please try again.");
    }
}

/* Close Patient Modal */
function closePatientModal() {
    document.getElementById("editPatientModal").classList.remove("active");
    currentPatientId = null;
}

/* Open Assign Medicine Modal */
async function openAssignMedicineModal(patientId, patientName) {
    currentPatientId = patientId;
    document.getElementById("assignPatientName").textContent = `Patient: ${patientName}`;
    document.getElementById("medicineQuantity").value = "";
    document.getElementById("dosage").value = "";
    
    // Load available medicines
    try {
        const res = await fetch(`${API}/medicines`);
        const medicines = await res.json();
        const select = document.getElementById("medicineSelect");
        select.innerHTML = '<option value="">Select Medicine</option>';
        medicines.forEach(m => {
            if (parseInt(m.quantity) > 0) {
                select.innerHTML += `<option value="${m.id}|${m.name}|${m.quantity}">${m.name} (${m.quantity} available)</option>`;
            }
        });
    } catch (error) {
        console.error("Error loading medicines:", error);
    }

    document.getElementById("assignMedicineModal").classList.add("active");
}

/* Close Assign Medicine Modal */
function closeAssignMedicineModal() {
    document.getElementById("assignMedicineModal").classList.remove("active");
    currentPatientId = null;
}

/* Confirm Assign Medicine */
async function confirmAssignMedicine() {
    const medicineSelect = document.getElementById("medicineSelect").value;
    const quantity = document.getElementById("medicineQuantity").value;
    const dosage = document.getElementById("dosage").value.trim();

    if (!medicineSelect || !quantity || !dosage) {
        alert("Please fill in all fields");
        return;
    }

    const [medicineId, medicineName, available] = medicineSelect.split("|");

    if (parseInt(quantity) > parseInt(available)) {
        alert(`Only ${available} units available`);
        return;
    }

    try {
        const res = await fetch(`${API}/assign-medicine`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                patientId: currentPatientId, 
                medicineId, 
                quantity, 
                dosage 
            })
        });

        if (res.ok) {
            closeAssignMedicineModal();
            loadPatients();
            loadMedicines();
        } else {
            const error = await res.json();
            alert(error.error || "Error assigning medicine");
        }
    } catch (error) {
        console.error("Error assigning medicine:", error);
        alert("Error assigning medicine. Please try again.");
    }
}

/* View Patient Medicines */
async function viewPatientMedicines(patientId, patientName) {
    const patient = allPatients.find(p => p.id === patientId);
    if (!patient || !patient.medicines || patient.medicines.length === 0) {
        alert("No medicines assigned to this patient");
        return;
    }

    document.getElementById("medicinesModalTitle").textContent = `${patientName}'s Medicines`;
    const list = document.getElementById("patientMedicinesList");
    list.innerHTML = "";

    patient.medicines.forEach(m => {
        list.innerHTML += `
            <div style="padding: 15px; margin-bottom: 10px; background: rgba(0, 191, 255, 0.1); border-left: 4px solid #00bfff; border-radius: 8px;">
                <strong>${m.medicineName}</strong><br>
                Quantity: ${m.quantity} units<br>
                Dosage: ${m.dosage}<br>
                <button class="btn-delete" onclick="removeAssignedMedicine('${patientId}', '${m.id}')" style="margin-top: 10px; width: 100%;">Remove</button>
            </div>
        `;
    });

    document.getElementById("viewMedicinesModal").classList.add("active");
}

/* Remove Assigned Medicine */
async function removeAssignedMedicine(patientId, assignmentId) {
    if (!confirm("Remove this medicine assignment?")) return;

    try {
        const res = await fetch(`${API}/assign-medicine/${patientId}/${assignmentId}`, {
            method: "DELETE"
        });

        if (res.ok) {
            loadPatients();
            loadMedicines();
            viewPatientMedicines(patientId, "Patient");
        }
    } catch (error) {
        console.error("Error removing assignment:", error);
        alert("Error removing assignment. Please try again.");
    }
}

/* Close View Medicines Modal */
function closeViewMedicinesModal() {
    document.getElementById("viewMedicinesModal").classList.remove("active");
}

/* Search Patients */
async function searchPatients() {
    const searchTerm = document.getElementById("patientSearch").value.trim();
    try {
        const url = searchTerm 
            ? `${API}/patients?search=${encodeURIComponent(searchTerm)}`
            : `${API}/patients`;
        const res = await fetch(url);
        const data = await res.json();

        const list = document.getElementById("patientList");
        if (data.length === 0) {
            list.innerHTML = "<p style='text-align: center; color: #999; padding: 40px;'>No patients found</p>";
            return;
        }

        list.innerHTML = "";
        data.forEach(p => {
            const medicineCount = (p.medicines && p.medicines.length) || 0;
            const medicinesHTML = medicineCount > 0 
                ? `<span class="medicine-badge">${medicineCount} medicine(s) assigned</span>` 
                : "<span style='color: #999;'>No medicines assigned</span>";

            list.innerHTML += `
                <div class="card">
                    <div class="card-title">${p.name}</div>
                    <div class="card-info">
                        <strong>Age:</strong> ${p.age} years<br>
                        <strong>Gender:</strong> ${p.gender}<br>
                        <strong>Disease:</strong> ${p.disease}<br>
                        ${medicinesHTML}
                    </div>
                    <div class="card-actions">
                        <button class="btn-edit" onclick="openEditPatientModal('${p.id}', '${p.name}', ${p.age}, '${p.gender}', '${p.disease}')">Edit</button>
                        <button class="btn-assign" onclick="openAssignMedicineModal('${p.id}', '${p.name}')">Assign Medicine</button>
                        ${medicineCount > 0 ? `<button class="btn-edit" onclick="viewPatientMedicines('${p.id}', '${p.name}')">View Medicines</button>` : ""}
                        <button class="btn-delete" onclick="deletePatient('${p.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error searching patients:", error);
    }
}

// Load data on page load
loadMedicines();
loadPatients();