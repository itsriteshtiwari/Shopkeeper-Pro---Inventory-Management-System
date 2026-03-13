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

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    role ENUM('super_admin', 'normal_admin', 'admin') DEFAULT 'admin',
    createdBy VARCHAR(50),
    createdAt DATE
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    barcode VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    batchId VARCHAR(20),
    expiry DATE NOT NULL,
    qty INT NOT NULL,
    originalQty INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transaction_master (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sold_by VARCHAR(100),
    user_role VARCHAR(50),
    payment_method VARCHAR(50),
    total_qty INT,
    sale_date DATE,
    sale_time TIME
);

CREATE TABLE IF NOT EXISTS transaction_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT,
    product_name VARCHAR(255),
    barcode VARCHAR(100),
    qty INT,
    FOREIGN KEY (transaction_id) REFERENCES transaction_master(id) ON DELETE CASCADE
);
```

-- Seed the Permanent System Super Admin
INSERT INTO users (username, email, password, gender, role, createdBy, createdAt) 
VALUES ('superadmin', 'super@shop.com', 'super123', 'Male', 'super_admin', 'system', CURDATE());

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install flask flask-cors mysql-connector-python fpdf2
python app.py
