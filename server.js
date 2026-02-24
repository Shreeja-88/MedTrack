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

    try {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (err) {
        console.error("Data file corrupted. Resetting...");
        const resetData = { medicines: [], patients: [], sales: [] };
        fs.writeFileSync(DATA_FILE, JSON.stringify(resetData, null, 2));
        return resetData;
    }
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ================= MEDICINES ================= */

// Add Medicine
app.post("/api/medicines", (req, res) => {
    const data = readData();
    let { name, expiry, quantity, batch = "", price = 0, discount = 0 } = req.body;

    if (!name || !expiry || quantity === undefined)
        return res.status(400).json({ error: "Required fields missing" });

    quantity = parseInt(quantity);
    price = parseFloat(price) || 0;
    discount = parseFloat(discount) || 0;

    if (quantity < 0)
        return res.status(400).json({ error: "Invalid quantity" });

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

    res.json(newMedicine);
});

// Get Medicines
app.get("/api/medicines", (req, res) => {
    const data = readData();
    res.json(data.medicines);
});

// Update Medicine
app.put("/api/medicines/:id", (req, res) => {
    const data = readData();
    const index = data.medicines.findIndex(m => m.id === req.params.id);

    if (index === -1)
        return res.status(404).json({ error: "Medicine not found" });

    let updated = { ...data.medicines[index], ...req.body };

    updated.quantity = parseInt(updated.quantity);
    updated.price = parseFloat(updated.price) || 0;
    updated.discount = parseFloat(updated.discount) || 0;

    if (updated.quantity < 0)
        return res.status(400).json({ error: "Invalid quantity" });

    updated.finalPrice =
        updated.price - (updated.price * updated.discount / 100);

    data.medicines[index] = updated;
    writeData(data);

    res.json(updated);
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
    const qty = parseInt(req.body.quantity);

    if (!qty || qty <= 0)
        return res.status(400).json({ error: "Invalid quantity" });

    const med = data.medicines.find(m => m.id === req.params.id);
    if (!med)
        return res.status(404).json({ error: "Medicine not found" });

    if (med.quantity < qty)
        return res.status(400).json({ error: "Not enough stock" });

    med.quantity -= qty;
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

    res.json(newPatient);
});

// Get Patients
app.get("/api/patients", (req, res) => {
    const data = readData();
    res.json(data.patients);
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

    const patient = data.patients.find(p => p.id === patientId);
    const medicine = data.medicines.find(m => m.id === medicineId);

    if (!patient || !medicine)
        return res.status(404).json({ error: "Not found" });

    const qty = parseInt(quantity);

    if (!qty || qty <= 0)
        return res.status(400).json({ error: "Invalid quantity" });

    if (medicine.quantity < qty)
        return res.status(400).json({ error: "Not enough stock" });

    medicine.quantity -= qty;

    patient.medicines.push({
        id: Date.now().toString(),
        medicineId,
        medicineName: medicine.name,
        quantity: qty,
        dosage
    });

    writeData(data);
    res.json({ message: "Medicine assigned successfully" });
});

/* ================= BILLING ================= */

app.post("/api/bill", (req, res) => {
    const data = readData();
    const { patientId, items } = req.body;

    if (!items || !Array.isArray(items))
        return res.status(400).json({ error: "Invalid billing data" });

    let totalAmount = 0;

    items.forEach(item => {
        const med = data.medicines.find(m => m.id === item.medicineId);
        if (!med) return;

        const price = med.finalPrice || med.price || 0;
        const qty = parseInt(item.quantity);

        if (qty > 0 && med.quantity >= qty) {
            totalAmount += price * qty;
            med.quantity -= qty;
        }
    });

    data.sales.push({
        id: Date.now().toString(),
        patientId,
        totalAmount,
        date: new Date().toISOString().split("T")[0]
    });

    writeData(data);
    res.json({ totalAmount });
});

/* ================= DASHBOARD ================= */

app.get("/api/dashboard", (req, res) => {
    const data = readData();

    const totalMedicines = data.medicines.length;
    const totalPatients = data.patients.length;
    const lowStockCount = data.medicines.filter(m => m.quantity <= 5).length;

    const today = new Date().toISOString().split("T")[0];

    const todayRevenue = data.sales
        .filter(s => s.date === today)
        .reduce((sum, s) => sum + s.totalAmount, 0);

    res.json({
        totalMedicines,
        totalPatients,
        lowStockCount,
        todayRevenue
    });
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT}`)
);