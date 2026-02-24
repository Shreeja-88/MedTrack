const API = "/api";

/* ================= SAFE FETCH ================= */

async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Something went wrong");
            return null;
        }

        return data;
    } catch (err) {
        alert("Server connection failed. Is server running?");
        return null;
    }
}

/* ================= ADD MEDICINE ================= */

async function addMedicine() {
    const name = document.getElementById("name").value.trim();
    const expiry = document.getElementById("expiry").value;
    const quantity = document.getElementById("quantity").value;

    if (!name || !expiry || !quantity) {
        alert("Please fill all required fields");
        return;
    }

    const result = await safeFetch(`${API}/medicines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            expiry,
            quantity
        })
    });

    if (!result) return;

    alert("Medicine Added Successfully ✅");

    document.getElementById("name").value = "";
    document.getElementById("expiry").value = "";
    document.getElementById("quantity").value = "";

    loadMedicines();
}

/* ================= LOAD MEDICINES ================= */

async function loadMedicines() {
    const medicines = await safeFetch(`${API}/medicines`);
    if (!medicines) return;

    const list = document.getElementById("medicineList");
    if (!list) return;

    list.innerHTML = "";

    medicines.forEach(m => {
        list.innerHTML += `
            <div class="card">
                <div class="card-title">${m.name}</div>
                <div class="card-info">
                    Quantity: ${m.quantity}<br>
                    Expiry: ${m.expiry}
                </div>
                <div class="card-actions">
                    <button onclick="deleteMedicine('${m.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    });
}

/* ================= DELETE ================= */

async function deleteMedicine(id) {
    await safeFetch(`${API}/medicines/${id}`, {
        method: "DELETE"
    });
    loadMedicines();
}

/* ================= ADD PATIENT ================= */

async function addPatient() {
    const name = document.getElementById("pname").value.trim();
    const age = document.getElementById("age").value;
    const gender = document.getElementById("gender").value.trim();
    const disease = document.getElementById("disease").value.trim();

    if (!name || !age || !gender || !disease) {
        alert("Please fill all fields");
        return;
    }

    const result = await safeFetch(`${API}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name,
            age,
            gender,
            disease
        })
    });

    if (!result) return;

    alert("Patient Added Successfully ✅");

    document.getElementById("pname").value = "";
    document.getElementById("age").value = "";
    document.getElementById("gender").value = "";
    document.getElementById("disease").value = "";

    loadPatients();
}

/* ================= LOAD PATIENTS ================= */

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
                    Disease: ${p.disease}
                </div>
                <div class="card-actions">
                    <button onclick="deletePatient('${p.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    });
}

/* ================= DELETE PATIENT ================= */

async function deletePatient(id) {
    await safeFetch(`${API}/patients/${id}`, {
        method: "DELETE"
    });
    loadPatients();
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
    loadMedicines();
    loadPatients();
});