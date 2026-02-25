const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data.json");

/* DATABASE */
function readDB() {
    if (!fs.existsSync(DATA_FILE)) {
        const initial = { medicines: [], patients: [], sales: [] };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
        return initial;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* MEDICINES */

app.get("/api/medicines", (req, res) => {
    const db = readDB();
    res.json(db.medicines);
});

app.post("/api/medicines", (req, res) => {
    const db = readDB();
    let { name, expiry, quantity, batch = "", price = 0, discount = 0 } = req.body;

    if (!name || !expiry || !quantity)
        return res.status(400).json({ error: "Missing fields" });

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

    db.medicines.push(newMed);
    writeDB(db);
    res.json(newMed);
});

app.put("/api/medicines/:id", (req, res) => {
    const db = readDB();
    const med = db.medicines.find(m => m.id === req.params.id);
    if (!med) return res.status(404).json({ error: "Not found" });

    Object.assign(med, req.body);

    med.quantity = parseInt(med.quantity);
    med.price = parseFloat(med.price) || 0;
    med.discount = parseFloat(med.discount) || 0;
    med.finalPrice = med.price - (med.price * med.discount / 100);

    writeDB(db);
    res.json(med);
});

app.delete("/api/medicines/:id", (req, res) => {
    const db = readDB();
    db.medicines = db.medicines.filter(m => m.id !== req.params.id);
    writeDB(db);
    res.json({ message: "Deleted" });
});

app.post("/api/medicines/:id/reduce", (req, res) => {
    const db = readDB();
    const med = db.medicines.find(m => m.id === req.params.id);
    if (!med) return res.status(404).json({ error: "Not found" });

    const qty = parseInt(req.body.quantity);
    if (!qty || med.quantity < qty)
        return res.status(400).json({ error: "Invalid quantity" });

    med.quantity -= qty;
    writeDB(db);
    res.json({ message: "Reduced" });
});

/* PATIENTS */

app.get("/api/patients", (req, res) => {
    const db = readDB();
    res.json(db.patients);
});

app.post("/api/patients", (req, res) => {
    const db = readDB();
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

    db.patients.push(newPatient);
    writeDB(db);
    res.json(newPatient);
});

app.put("/api/patients/:id", (req, res) => {
    const db = readDB();
    const p = db.patients.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });

    Object.assign(p, req.body);
    p.age = parseInt(p.age);

    writeDB(db);
    res.json(p);
});

app.delete("/api/patients/:id", (req, res) => {
    const db = readDB();
    db.patients = db.patients.filter(p => p.id !== req.params.id);
    writeDB(db);
    res.json({ message: "Deleted" });
});

/* ASSIGN */

app.post("/api/assign", (req, res) => {
    const db = readDB();
    const { patientId, medicineId, quantity, dosage } = req.body;

    const patient = db.patients.find(p => p.id === patientId);
    const med = db.medicines.find(m => m.id === medicineId);

    if (!patient || !med)
        return res.status(404).json({ error: "Not found" });

    const qty = parseInt(quantity);
    if (!qty || med.quantity < qty)
        return res.status(400).json({ error: "Invalid quantity" });

    med.quantity -= qty;

    patient.medicines.push({
        id: Date.now().toString(),
        medicineId,
        medicineName: med.name,
        quantity: qty,
        dosage
    });

    writeDB(db);
    res.json({ message: "Assigned" });
});

/* DASHBOARD */

app.get("/api/dashboard", (req, res) => {
    const db = readDB();

    const totalMedicines = db.medicines.length;
    const totalPatients = db.patients.length;
    const lowStockCount = db.medicines.filter(m => m.quantity <= 10).length;

    res.json({
        totalMedicines,
        totalPatients,
        lowStockCount,
        todayRevenue: 0
    });
});

app.listen(5000, () =>
    console.log("🚀 Server running at http://localhost:5000")
);