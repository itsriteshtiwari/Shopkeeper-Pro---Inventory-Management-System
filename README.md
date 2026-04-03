# ▦ Shopkeeper Pro - Inventory Management System

**Shopkeeper Pro** is a full-stack inventory and retail management application designed for small-to-medium businesses. It features real-time stock tracking, FEFO (First-Expiry-First-Out) batch management, a grouped shopping cart system, and automated PDF invoice generation.

## 🚀 Features

- **Smart Inventory Tracking**: Automatic batch categorization and expiry status indicators (Expired, Expiring Soon, Healthy).
- **FEFO Logic**: Sales automatically deduct stock from the earliest expiring batches first.
- **Multi-Product Shopping Cart**: Scan and add multiple products to a single order before checkout.
- **Payment Method Integration**: Support for Cash, UPI, Card, and Credit payments linked to transaction master records.
- **Automated PDF Invoices**: Generates professional, branded receipts for grouped purchases with unique transaction IDs.
- **Live Dashboard**: Visual analytics for top-selling products, category distribution, and low-stock alerts.
- **Role-Based Access Control (RBAC)**: Distinct permissions for Super Admin, Normal Admin, and Admin roles.
- **Session Persistence**: Stay logged in even after page refreshes using localStorage.

## 🛠️ Tech Stack

- **Frontend**: React.js, CSS3 (Custom Dark Theme), Lucide Icons
- **Backend**: Python (Flask), Flask-CORS
- **Database**: MySQL (Relational Schema with Cascading Deletes)
- **PDF Generation**: FPDF2

## 📋 Database Schema

The project utilizes a normalized MySQL architecture:
- `users`: Manages admin credentials and roles.
- `products`: Stores master product information.
- `batches`: Manages stock quantity and expiry dates per product.
- `transaction_master`: Records the overall sale details (Total, Payment Method).
- `transaction_items`: Stores individual items linked to a master transaction.

## 🔧 Installation

### 1. Database Setup
Create a database named `shopkeeper_db` and run the provided SQL scripts to create tables.
```
CREATE DATABASE shopkeeper_db;
USE shopkeeper_db;
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install flask flask-cors mysql-connector-python fpdf2
python app.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
## UI
### For Video 
[Google Drive for video](https://drive.google.com/drive/folders/1Mr5nr2m4q0BKg0A3AJRRfYgbibapscly?usp=drive_link)

### Images
![Image alt](https://github.com/itsriteshtiwari/Shopkeeper-Pro---Inventory-Management-System/blob/5ff2f8836aaf363d475db3ce80a2c7df6770409f/assets/1.png)
![Image alt](https://github.com/itsriteshtiwari/Shopkeeper-Pro---Inventory-Management-System/blob/5ff2f8836aaf363d475db3ce80a2c7df6770409f/assets/6.png)
