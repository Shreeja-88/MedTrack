const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data.json");

/* ================= SAFE READ / WRITE ================= */

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        const initialData = { medicines: [], patients: [], sales: [] };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }

    const raw = JSON.parse(fs.readFileSync(DATA_FILE));

    if (!raw.medicines) raw.medicines = [];
    if (!raw.patients) raw.patients = [];
    if (!raw.sales) raw.sales = [];

    return raw;
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ================= MEDICINES ================= */

// Add Medicine
app.post("/api/medicines", (req, res) => {
    const data = readData();
    let { name, expiry, quantity, batch, price = 0, discount = 0 } = req.body;

    if (!name || !expiry || !quantity)
        return res.status(400).json({ error: "Required fields missing" });

    quantity = parseInt(quantity);
    price = parseFloat(price);
    discount = parseFloat(discount);

    const finalPrice = price - (price * discount / 100);

    const newMedicine = {
        id: Date.now().toString(),
        name,
        expiry,
        quantity,
        batch,
        price,
        discount,
        finalPrice
    };

    data.medicines.push(newMedicine);
    writeData(data);

    res.json({ message: "Medicine added successfully" });
});

// Get Medicines
app.get("/api/medicines", (req, res) => {
    const data = readData();
    const search = req.query.search;

    if (search) {
        return res.json(
            data.medicines.filter(m =>
                m.name.toLowerCase().includes(search.toLowerCase())
            )
        );
    }

    res.json(data.medicines);
});

// Update Medicine
app.put("/api/medicines/:id", (req, res) => {
    const data = readData();
    const { id } = req.params;

    const index = data.medicines.findIndex(m => m.id === id);
    if (index === -1)
        return res.status(404).json({ error: "Medicine not found" });

    const updated = { ...data.medicines[index], ...req.body };

    // Recalculate final price if price or discount changed
    updated.price = parseFloat(updated.price);
    updated.discount = parseFloat(updated.discount);
    updated.quantity = parseInt(updated.quantity);

    updated.finalPrice =
        updated.price - (updated.price * updated.discount / 100);

    data.medicines[index] = updated;
    writeData(data);

    res.json({ message: "Medicine updated" });
});

// Delete Medicine
app.delete("/api/medicines/:id", (req, res) => {
    const data = readData();
    data.medicines = data.medicines.filter(m => m.id !== req.params.id);
    writeData(data);
    res.json({ message: "Medicine deleted" });
});

// Reduce Stock
app.post("/api/reduce-stock/:id", (req, res) => {
    const data = readData();
    const quantity = parseInt(req.body.quantity);

    const med = data.medicines.find(m => m.id === req.params.id);
    if (!med)
        return res.status(404).json({ error: "Medicine not found" });

    if (med.quantity < quantity)
        return res.status(400).json({ error: "Not enough stock" });

    med.quantity -= quantity;
    writeData(data);

    res.json({ message: "Stock reduced successfully" });
});

/* ================= PATIENTS ================= */

// Add Patient
app.post("/api/patients", (req, res) => {
    const data = readData();
    const { name, age, gender, disease } = req.body;

    if (!name || !age || !gender || !disease)
        return res.status(400).json({ error: "Required fields missing" });

    const newPatient = {
        id: Date.now().toString(),
        name,
        age: parseInt(age),
        gender,
        disease,
        medicines: []
    };

    data.patients.push(newPatient);
    writeData(data);

    res.json({ message: "Patient added successfully" });
});

// Get Patients
app.get("/api/patients", (req, res) => {
    const data = readData();
    const search = req.query.search;

    if (search) {
        return res.json(
            data.patients.filter(p =>
                p.name.toLowerCase().includes(search.toLowerCase())
            )
        );
    }

    res.json(data.patients);
});

// Update Patient
app.put("/api/patients/:id", (req, res) => {
    const data = readData();
    const index = data.patients.findIndex(p => p.id === req.params.id);

    if (index === -1)
        return res.status(404).json({ error: "Patient not found" });

    data.patients[index] = {
        ...data.patients[index],
        ...req.body,
    };

    writeData(data);
    res.json({ message: "Patient updated" });
});

// Delete Patient
app.delete("/api/patients/:id", (req, res) => {
    const data = readData();
    data.patients = data.patients.filter(p => p.id !== req.params.id);
    writeData(data);
    res.json({ message: "Patient deleted" });
});

/* ================= ASSIGN MEDICINE ================= */

app.post("/api/assign-medicine", (req, res) => {
    const data = readData();
    const { patientId, medicineId, quantity, dosage } = req.body;

    const qty = parseInt(quantity);

    const patient = data.patients.find(p => p.id === patientId);
    const medicine = data.medicines.find(m => m.id === medicineId);

    if (!patient || !medicine)
        return res.status(404).json({ error: "Not found" });

    if (medicine.quantity < qty)
        return res.status(400).json({ error: "Not enough stock" });

    medicine.quantity -= qty;

    patient.medicines.push({
        id: Date.now().toString(),
        medicineId,
        medicineName: medicine.name,
        quantity: qty,
        dosage,
    });

    writeData(data);
    res.json({ message: "Medicine assigned successfully" });
});

// Remove Assigned Medicine + Restore Stock
app.delete("/api/assign-medicine/:patientId/:assignmentId", (req, res) => {
    const data = readData();
    const { patientId, assignmentId } = req.params;

    const patient = data.patients.find(p => p.id === patientId);
    if (!patient)
        return res.status(404).json({ error: "Patient not found" });

    const assignment = patient.medicines.find(m => m.id === assignmentId);
    if (!assignment)
        return res.status(404).json({ error: "Assignment not found" });

    // Restore stock
    const medicine = data.medicines.find(m => m.id === assignment.medicineId);
    if (medicine) {
        medicine.quantity += assignment.quantity;
    }

    patient.medicines = patient.medicines.filter(
        m => m.id !== assignmentId
    );

    writeData(data);
    res.json({ message: "Assignment removed and stock restored" });
});

const PORT = 5000;
app.listen(PORT, () =>
    console.log("🚀 Server running on http://localhost:5000")
);