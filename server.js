const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data.json");

/* Helper function to read data */
function readData() {
    const data = fs.readFileSync(DATA_FILE);
    return JSON.parse(data);
}

/* Helper function to write data */
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* Helper function to generate unique ID */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/* ================= MEDICINES ================= */

app.post("/api/medicines", (req, res) => {
    const data = readData();
    const newMedicine = { ...req.body, id: generateId() };
    data.medicines.push(newMedicine);
    writeData(data);
    res.json({ message: "Medicine added successfully", medicine: newMedicine });
});

app.get("/api/medicines", (req, res) => {
    const data = readData();
    const search = req.query.search ? req.query.search.toLowerCase() : "";
    const filtered = search ? data.medicines.filter(m => m.name.toLowerCase().includes(search)) : data.medicines;
    res.json(filtered);
});

app.put("/api/medicines/:id", (req, res) => {
    const data = readData();
    const medicineIndex = data.medicines.findIndex(m => m.id === req.params.id);
    if (medicineIndex === -1) return res.status(404).json({ error: "Medicine not found" });
    data.medicines[medicineIndex] = { ...data.medicines[medicineIndex], ...req.body };
    writeData(data);
    res.json({ message: "Medicine updated successfully" });
});

app.delete("/api/medicines/:id", (req, res) => {
    const data = readData();
    data.medicines = data.medicines.filter(m => m.id !== req.params.id);
    writeData(data);
    res.json({ message: "Medicine deleted successfully" });
});

/* ================= PATIENTS ================= */

app.post("/api/patients", (req, res) => {
    const data = readData();
    const newPatient = { ...req.body, id: generateId(), medicines: [] };
    data.patients.push(newPatient);
    writeData(data);
    res.json({ message: "Patient added successfully", patient: newPatient });
});

app.get("/api/patients", (req, res) => {
    const data = readData();
    const search = req.query.search ? req.query.search.toLowerCase() : "";
    const filtered = search ? data.patients.filter(p => p.name.toLowerCase().includes(search)) : data.patients;
    res.json(filtered);
});

app.put("/api/patients/:id", (req, res) => {
    const data = readData();
    const patientIndex = data.patients.findIndex(p => p.id === req.params.id);
    if (patientIndex === -1) return res.status(404).json({ error: "Patient not found" });
    data.patients[patientIndex] = { ...data.patients[patientIndex], ...req.body };
    writeData(data);
    res.json({ message: "Patient updated successfully" });
});

app.delete("/api/patients/:id", (req, res) => {
    const data = readData();
    data.patients = data.patients.filter(p => p.id !== req.params.id);
    writeData(data);
    res.json({ message: "Patient deleted successfully" });
});

/* ================= ASSIGN MEDICINE TO PATIENT ================= */

app.post("/api/assign-medicine", (req, res) => {
    const data = readData();
    const { patientId, medicineId, quantity, dosage } = req.body;
    
    const patient = data.patients.find(p => p.id === patientId);
    const medicine = data.medicines.find(m => m.id === medicineId);
    
    if (!patient || !medicine) return res.status(404).json({ error: "Patient or Medicine not found" });
    if (parseInt(medicine.quantity) < parseInt(quantity)) return res.status(400).json({ error: "Insufficient stock" });
    
    if (!patient.medicines) patient.medicines = [];
    patient.medicines.push({ medicineId, medicineName: medicine.name, quantity, dosage, id: generateId() });
    
    medicine.quantity = parseInt(medicine.quantity) - parseInt(quantity);
    
    writeData(data);
    res.json({ message: "Medicine assigned successfully" });
});

app.delete("/api/assign-medicine/:patientId/:assignmentId", (req, res) => {
    const data = readData();
    const patient = data.patients.find(p => p.id === req.params.patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    
    const assignment = patient.medicines.find(m => m.id === req.params.assignmentId);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    
    const medicine = data.medicines.find(m => m.id === assignment.medicineId);
    if (medicine) medicine.quantity = parseInt(medicine.quantity) + parseInt(assignment.quantity);
    
    patient.medicines = patient.medicines.filter(m => m.id !== req.params.assignmentId);
    writeData(data);
    res.json({ message: "Assignment removed successfully" });
});

/* ================= REDUCE STOCK ================= */

app.post("/api/reduce-stock/:medicineId", (req, res) => {
    const data = readData();
    const { quantity } = req.body;
    const medicine = data.medicines.find(m => m.id === req.params.medicineId);
    
    if (!medicine) return res.status(404).json({ error: "Medicine not found" });
    if (parseInt(medicine.quantity) < parseInt(quantity)) return res.status(400).json({ error: "Insufficient stock" });
    
    medicine.quantity = parseInt(medicine.quantity) - parseInt(quantity);
    writeData(data);
    res.json({ message: "Stock reduced successfully", quantity: medicine.quantity });
});

/* ================= START SERVER ================= */

const PORT = 5000;
app.listen(PORT, () => console.log("Server running on http://localhost:5000"));