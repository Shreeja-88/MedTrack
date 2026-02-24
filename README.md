# MedTrack – Medicine & Patient Management System 💊 

MedTrack is a full-stack web application built using **Node.js and Express** with local JSON file storage.

![Node.js](https://img.shields.io/badge/Node.js-18-green)
![Express](https://img.shields.io/badge/Express-4-blue)
![Status](https://img.shields.io/badge/Project-Active-success)

It helps manage:

- Medicine Inventory
- Patient Registration
- Local Data Storage
- Web-based Interface

---

## Project Overview

MedTrack is designed for small clinics, pharmacies, and academic purposes.  
It allows users to manage medicine stock and patient details using a simple web interface.

This version uses a **JSON file as a local database**, making it simple and easy to run without external database setup.

---

## Tech Stack

### 🔹 Backend
- Node.js
- Express.js
- File System (JSON storage)

### 🔹 Frontend
- HTML
- CSS
- JavaScript (Fetch API)

### 🔹 Data Storage
- Local JSON file (`data.json`)

---

## 📂 Project Structure

```

MedTrack/
│
├── server.js
├── package.json
├── data.json
└── public/
├── index.html
├── medicines.html
├── patients.html
├── script.js
└── style.css

````

---

## Features

### 💊 Medicine Management
- Add new medicines
- Store expiry date
- Track quantity
- View medicine list

### 👤 Patient Management
- Register patients
- Store age, gender, disease
- View patient list

### 📦 Local Storage
- Data stored inside `data.json`
- No external database required
- Persistent storage locally

---

## Installation & Setup (Local)

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/medtrack.git
cd medtrack
````

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Run Application

```bash
node server.js
```

### 4️⃣ Open Browser

```
http://localhost:5000
```

---

## How It Works

* Express serves frontend files from `public/`
* API routes handle:

  * `/api/medicines`
  * `/api/patients`
* Data is stored and retrieved from `data.json`
* File system module (`fs`) handles read/write operations

---

## API Endpoints

### Medicines

| Method | Endpoint       | Description       |
| ------ | -------------- | ----------------- |
| POST   | /api/medicines | Add medicine      |
| GET    | /api/medicines | Get all medicines |

### Patients

| Method | Endpoint      | Description      |
| ------ | ------------- | ---------------- |
| POST   | /api/patients | Add patient      |
| GET    | /api/patients | Get all patients |

---

## Deployment

This project can be deployed on:

* Render

⚠️ Note:
Since this version uses JSON file storage, data may reset on some hosting platforms.

For production deployment, a database like MongoDB is recommended.

---

## Future Improvements

* Delete functionality
* Update functionality
* Medicine assignment to patients
* Stock auto-reduction
* Expiry alerts
* Admin authentication
* Cloud database integration
* Dashboard analytics
* Responsive UI improvements

---

## Learning Outcomes

This project demonstrates:

* REST API development
* Express routing
* File system operations in Node.js
* Full-stack integration
* JSON data handling
* Basic deployment workflow

---

## Author

**Prajwal M**

Engineering Student
Aspiring Full Stack Developer 🚀

---

## License

This project is licensed under the MIT License.

---

