const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data.json");

/* ================= DATA HANDLING ================= */

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        const initial = { medicines: [], patients: [], sales: [] };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
        return initial;
    }

    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ================= MEDICINES ================= */

app.post("/api/medicines", (req, res) => {
    const data = readData();
    let { name, expiry, quantity, batch = "", price = 0, discount = 0 } = req.body;

    if (!name || !expiry || quantity === undefined)
        return res.status(400).json({ error: "Missing required fields" });

    quantity = parseInt(quantity);
    price = parseFloat(price) || 0;
    discount = parseFloat(discount) || 0;

    const finalPrice = price - (price * discount / 100);

    const newMed = {
        id: Date.now().toString(),
        name,
        expiry,
        quantity,
        batch,
        price,
        discount,
        finalPrice
    };

    data.medicines.push(newMed);
    writeData(data);
    res.json(newMed);
});

app.get("/api/medicines", (req, res) => {
    res.json(readData().medicines);
});

app.put("/api/medicines/:id", (req, res) => {
    const data = readData();
    const index = data.medicines.findIndex(m => m.id === req.params.id);

    if (index === -1)
        return res.status(404).json({ error: "Medicine not found" });

    const updated = { ...data.medicines[index], ...req.body };

    updated.quantity = parseInt(updated.quantity);
    updated.price = parseFloat(updated.price) || 0;
    updated.discount = parseFloat(updated.discount) || 0;
    updated.finalPrice =
        updated.price - (updated.price * updated.discount / 100);

    data.medicines[index] = updated;
    writeData(data);
    res.json(updated);
});

app.delete("/api/medicines/:id", (req, res) => {
    const data = readData();
    data.medicines = data.medicines.filter(m => m.id !== req.params.id);
    writeData(data);
    res.json({ message: "Deleted" });
});

app.post("/api/reduce-stock/:id", (req, res) => {
    const data = readData();
    const qty = parseInt(req.body.quantity);

    const med = data.medicines.find(m => m.id === req.params.id);
    if (!med) return res.status(404).json({ error: "Not found" });

    if (med.quantity < qty)
        return res.status(400).json({ error: "Not enough stock" });

    med.quantity -= qty;
    writeData(data);
    res.json({ message: "Stock reduced" });
});

/* ================= PATIENTS ================= */

app.post("/api/patients", (req, res) => {
    const data = readData();
    const { name, age, gender, disease } = req.body;

    if (!name || !age || !gender || !disease)
        return res.status(400).json({ error: "Missing fields" });

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

app.get("/api/patients", (req, res) => {
    res.json(readData().patients);
});

app.put("/api/patients/:id", (req, res) => {
    const data = readData();
    const index = data.patients.findIndex(p => p.id === req.params.id);

    if (index === -1)
        return res.status(404).json({ error: "Patient not found" });

    data.patients[index] = {
        ...data.patients[index],
        ...req.body,
        age: parseInt(req.body.age)
    };

    writeData(data);
    res.json(data.patients[index]);
});

app.delete("/api/patients/:id", (req, res) => {
    const data = readData();
    data.patients = data.patients.filter(p => p.id !== req.params.id);
    writeData(data);
    res.json({ message: "Deleted" });
});

/* ================= ASSIGN ================= */

app.post("/api/assign-medicine", (req, res) => {
    const data = readData();
    const { patientId, medicineId, quantity, dosage } = req.body;

    const patient = data.patients.find(p => p.id === patientId);
    const med = data.medicines.find(m => m.id === medicineId);

    if (!patient || !med)
        return res.status(404).json({ error: "Not found" });

    const qty = parseInt(quantity);

    if (med.quantity < qty)
        return res.status(400).json({ error: "Not enough stock" });

    med.quantity -= qty;

    patient.medicines.push({
        id: Date.now().toString(),
        medicineId,
        medicineName: med.name,
        quantity: qty,
        dosage
    });

    writeData(data);
    res.json({ message: "Assigned successfully" });
});

/* ================= DASHBOARD ================= */

app.get("/api/dashboard", (req, res) => {
    const data = readData();

    const totalMedicines = data.medicines.length;
    const totalPatients = data.patients.length;
    const lowStockCount =
        data.medicines.filter(m => m.quantity <= 5).length;

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

const PORT = 5000;

app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
);