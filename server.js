const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data.json");

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ================= MEDICINES ================= */

app.post("/api/medicines", (req, res) => {
    const data = readData();
    const { name, expiry, quantity, batch, price = 0, discount = 0 } = req.body;

    const finalPrice = price - (price * discount / 100);

    const newMedicine = {
        id: Date.now().toString(),
        name,
        expiry,
        quantity: parseInt(quantity),
        batch,
        price: parseFloat(price),
        discount: parseFloat(discount),
        finalPrice
    };

    data.medicines.push(newMedicine);
    writeData(data);
    res.json({ message: "Medicine added" });
});

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

app.put("/api/medicines/:id", (req, res) => {
    const data = readData();
    const index = data.medicines.findIndex(m => m.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Not found" });

    data.medicines[index] = { ...data.medicines[index], ...req.body };
    writeData(data);
    res.json({ message: "Updated" });
});

app.delete("/api/medicines/:id", (req, res) => {
    const data = readData();
    data.medicines = data.medicines.filter(m => m.id !== req.params.id);
    writeData(data);
    res.json({ message: "Deleted" });
});

app.post("/api/reduce-stock/:id", (req, res) => {
    const data = readData();
    const { quantity } = req.body;

    const med = data.medicines.find(m => m.id === req.params.id);
    if (!med) return res.status(404).json({ error: "Not found" });

    if (med.quantity < quantity)
        return res.status(400).json({ error: "Not enough stock" });

    med.quantity -= parseInt(quantity);
    writeData(data);
    res.json({ message: "Stock reduced" });
});

/* ================= PATIENTS ================= */

app.post("/api/patients", (req, res) => {
    const data = readData();
    const { name, age, gender, disease, recheckDays = 7 } = req.body;

    const nextRecheck = new Date();
    nextRecheck.setDate(nextRecheck.getDate() + parseInt(recheckDays));

    const newPatient = {
        id: Date.now().toString(),
        name,
        age,
        gender,
        disease,
        recheckDays,
        nextRecheck: nextRecheck.toISOString().split("T")[0],
        medicines: []
    };

    data.patients.push(newPatient);
    writeData(data);
    res.json({ message: "Patient added" });
});

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

app.put("/api/patients/:id", (req, res) => {
    const data = readData();
    const index = data.patients.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Not found" });

    data.patients[index] = { ...data.patients[index], ...req.body };
    writeData(data);
    res.json({ message: "Updated" });
});

app.delete("/api/patients/:id", (req, res) => {
    const data = readData();
    data.patients = data.patients.filter(p => p.id !== req.params.id);
    writeData(data);
    res.json({ message: "Deleted" });
});

/* ================= ASSIGN MEDICINE ================= */

app.post("/api/assign-medicine", (req, res) => {
    const data = readData();
    const { patientId, medicineId, quantity, dosage } = req.body;

    const patient = data.patients.find(p => p.id === patientId);
    const medicine = data.medicines.find(m => m.id === medicineId);

    if (!patient || !medicine)
        return res.status(404).json({ error: "Not found" });

    if (medicine.quantity < quantity)
        return res.status(400).json({ error: "Not enough stock" });

    medicine.quantity -= parseInt(quantity);

    patient.medicines.push({
        id: Date.now().toString(),
        medicineName: medicine.name,
        quantity,
        dosage
    });

    writeData(data);
    res.json({ message: "Assigned" });
});

app.delete("/api/assign-medicine/:patientId/:assignmentId", (req, res) => {
    const data = readData();
    const { patientId, assignmentId } = req.params;

    const patient = data.patients.find(p => p.id === patientId);
    if (!patient) return res.status(404).json({ error: "Not found" });

    patient.medicines = patient.medicines.filter(m => m.id !== assignmentId);
    writeData(data);
    res.json({ message: "Removed" });
});

/* ================= BILLING ================= */

app.post("/api/bill", (req, res) => {
    const data = readData();
    const { patientId, items } = req.body;

    let totalAmount = 0;

    items.forEach(item => {
        const medicine = data.medicines.find(m => m.id === item.medicineId);
        if (!medicine) return;

        const price = medicine.finalPrice || medicine.price;
        totalAmount += price * item.quantity;
        medicine.quantity -= item.quantity;
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
    const today = new Date().toISOString().split("T")[0];

    const todayRevenue = data.sales
        .filter(s => s.date === today)
        .reduce((sum, s) => sum + s.totalAmount, 0);

    const lowStock = data.medicines.filter(m => m.quantity <= 10);

    res.json({
        totalMedicines: data.medicines.length,
        totalPatients: data.patients.length,
        todayRevenue,
        lowStockCount: lowStock.length
    });
});

const PORT = 5000;
app.listen(PORT, () =>
    console.log("Server running on http://localhost:5000")
);