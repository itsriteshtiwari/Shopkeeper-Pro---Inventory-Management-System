
from flask import Flask, request, jsonify, send_file
from reportlab.lib.pagesizes import A6 # Small receipt size
from reportlab.pdfgen import canvas
from io import BytesIO
from flask_cors import CORS
import mysql.connector
from datetime import datetime
from fpdf import FPDF, XPos, YPos
import io

app = Flask(__name__)
CORS(app)

db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Anchal@59x', # CHANGE THIS
    'database': 'shopkeeper_db'
}

def get_db():
    return mysql.connector.connect(**db_config)

# --- AUTHENTICATION ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE (email=%s OR username=%s) AND password=%s", 
                   (data['identifier'], data['identifier'], data['password']))
    user = cursor.fetchone()
    conn.close()
    return jsonify(user) if user else (jsonify({"error": "Invalid credentials"}), 401)

# --- PRODUCT & INVENTORY LOGIC ---

@app.route('/products/add', methods=['POST'])
def add_product():
    data = request.json # Expects: name, barcode, category, expiry, qty
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    try:
        # 1. Check if product exists in the 'products' table
        cursor.execute("SELECT id FROM products WHERE barcode = %s", (data['barcode'],))
        prod = cursor.fetchone()
        
        if not prod:
            # Create new product if barcode is new
            cursor.execute(
                "INSERT INTO products (name, category, barcode) VALUES (%s, %s, %s)",
                (data['name'], data['category'], data['barcode'].upper())
            )
            product_id = cursor.lastrowid
        else:
            product_id = prod['id']

        # 2. Handle Batches (Using your specific column: batchId, originalQty)
        cursor.execute(
            "SELECT id, qty, originalQty FROM batches WHERE product_id = %s AND expiry = %s", 
            (product_id, data['expiry'])
        )
        existing_batch = cursor.fetchone()

        if existing_batch:
            # Merge into existing batch if expiry matches
            cursor.execute(
                "UPDATE batches SET qty = qty + %s, originalQty = originalQty + %s WHERE id = %s",
                (data['qty'], data['qty'], existing_batch['id'])
            )
        else:
            # Create new batch string
            new_batch_str = f"B{str(datetime.now().timestamp())[-6:]}"
            cursor.execute(
                "INSERT INTO batches (product_id, batchId, expiry, qty, originalQty) VALUES (%s, %s, %s, %s, %s)",
                (product_id, new_batch_str, data['expiry'], data['qty'], data['qty'])
            )
        
        conn.commit()
        return jsonify({"success": True, "message": "Product successfully added/updated"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/products', methods=['GET'])
def get_products():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    # CRITICAL: We must select b.id (the primary key of the batches table)
    cursor.execute("""
        SELECT p.id as prod_id, p.name, p.category, p.barcode, 
               b.id as actual_batch_id, b.batchId, b.expiry, b.qty, b.originalQty 
        FROM products p 
        LEFT JOIN batches b ON p.id = b.product_id
    """)
    rows = cursor.fetchall()
    conn.close()

    inventory = {}
    for r in rows:
        pid = r['prod_id']
        if pid not in inventory:
            inventory[pid] = {"id": pid, "name": r['name'], "category": r['category'], "barcode": r['barcode'], "batches": []}
        
        if r['batchId'] is not None:
            inventory[pid]['batches'].append({
                "db_id": r['actual_batch_id'], # This is the real ID for the DELETE route
                "batchId": r['batchId'],        # This is the display string (e.g., B001)
                "expiry": str(r['expiry']), 
                "qty": r['qty'], 
                "originalQty": r['originalQty']
            })
    return jsonify(list(inventory.values()))

@app.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Deleting a product will automatically delete its batches 
        # due to the 'ON DELETE CASCADE' in your MySQL schema
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Product removed from system"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- SALE PROCESS (SCAN & PURCHASE) ---
@app.route('/sell', methods=['POST'])
def process_sale():
    data = request.json  # Expects: cart (list), username, role, payment_method
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Create the Master Transaction Record
        total_items = sum(int(item['qty']) for item in data['cart'])
        cursor.execute("""
            INSERT INTO transaction_master (sold_by, user_role, payment_method, total_qty, sale_date, sale_time)
            VALUES (%s, %s, %s, %s, CURDATE(), CURTIME())
        """, (data['username'], data['role'], data['payment_method'], total_items))
        
        master_id = cursor.lastrowid

        # 2. Process each item in the cart
        for item in data['cart']:
            # A. Find available batches (FEFO)
            cursor.execute("""
                SELECT b.id, b.qty FROM batches b 
                JOIN products p ON b.product_id = p.id 
                WHERE p.barcode = %s AND b.qty > 0 
                ORDER BY b.expiry ASC
            """, (item['barcode'],))
            batches = cursor.fetchall()
            
            needed = int(item['qty'])
            for b in batches:
                if needed <= 0: break
                take = min(needed, b['qty'])
                new_qty = b['qty'] - take
                
                if new_qty <= 0:
                    # --- AUTO DELETE FEATURE ---
                    # If stock is gone, remove the batch from DB
                    cursor.execute("DELETE FROM batches WHERE id = %s", (b['id'],))
                else:
                    # Otherwise, just update the quantity
                    cursor.execute("UPDATE batches SET qty = %s WHERE id = %s", (new_qty, b['id']))
                
                needed -= take

            # B. Record Item in transaction_items
            cursor.execute("""
                INSERT INTO transaction_items (transaction_id, product_name, barcode, qty)
                VALUES (%s, %s, %s, %s)
            """, (master_id, item['name'], item['barcode'], item['qty']))

        conn.commit()
        return jsonify({"success": True, "transactionId": master_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# --- NEW: FETCH TRANSACTION LOG ---
@app.route('/transactions', methods=['GET'])
def get_transactions():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Fetch Master records and join with their items
    cursor.execute("SELECT * FROM transaction_master ORDER BY id DESC")
    masters = cursor.fetchall()
    
    for m in masters:
        cursor.execute("SELECT * FROM transaction_items WHERE transaction_id = %s", (m['id'],))
        m['items'] = cursor.fetchall() # Nest the items inside the master record
        m['sale_date'] = str(m['sale_date'])
        m['sale_time'] = str(m['sale_time'])
        
    conn.close()
    return jsonify(masters)

# --- ADMIN MANAGEMENT ---
@app.route('/users', methods=['GET', 'POST'])
def manage_users():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    if request.method == 'POST':
        d = request.json
        cursor.execute("INSERT INTO users (username, email, password, gender, role, createdBy, createdAt) VALUES (%s,%s,%s,%s,%s,%s,CURDATE())",
                       (d['username'], d['email'], d['password'], d['gender'], d['role'], d['createdBy']))
        conn.commit()
    
    cursor.execute("SELECT id, username, email, gender, role, createdBy, createdAt FROM users")
    users = cursor.fetchall()
    conn.close()
    return jsonify(users)

@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if user_id == 1: # Protection for System Super Admin
        return jsonify({"error": "Cannot delete root admin"}), 403
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/batches/<int:batch_id>', methods=['DELETE'])
def remove_expired_batch(batch_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Delete the specific batch
        cursor.execute("DELETE FROM batches WHERE id = %s", (batch_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Expired batch removed"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Top 5 Selling Products
        cursor.execute("""
            SELECT product_name, SUM(qty) as total_sold 
            FROM transactions 
            GROUP BY product_name 
            ORDER BY total_sold DESC 
            LIMIT 5
        """)
        top_sellers = cursor.fetchall()
        
        # 2. Stock by Category
        cursor.execute("""
            SELECT p.category, SUM(b.qty) as total_stock 
            FROM products p
            JOIN batches b ON p.id = b.product_id
            GROUP BY p.category
        """)
        category_split = cursor.fetchall()

        # 3. NEW: Low Stock Alerts (Less than 10 units total)
        cursor.execute("""
            SELECT p.name, SUM(b.qty) as current_stock 
            FROM products p
            JOIN batches b ON p.id = b.product_id
            GROUP BY p.name
            HAVING current_stock < 10
        """)
        low_stock = cursor.fetchall()
        
        return jsonify({
            "topSellers": top_sellers,
            "categorySplit": category_split,
            "lowStock": low_stock
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/generate-invoice/<int:txn_id>', methods=['GET'])
def generate_invoice(txn_id):
    STORE_DETAILS = {
        "name": "PSR GENERAL STORE",
        "address": "Datta Nagar, Nallasopara East, Maharashtra 401209",
        "phone": "+91 98765 43210",
        "email": "support@psrstore.com"
    }

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Fetch Master Data
        cursor.execute("SELECT * FROM transaction_master WHERE id = %s", (txn_id,))
        master = cursor.fetchone()
        if not master: return jsonify({"error": "Transaction not found"}), 404
            
        # 2. Fetch Items
        cursor.execute("SELECT * FROM transaction_items WHERE transaction_id = %s", (txn_id,))
        items = cursor.fetchall()
        
        # 3. Create PDF using modern fpdf2 syntax
        pdf = FPDF()
        pdf.add_page()
        
        # Header - Using 'Helvetica' (Standard PDF font) to avoid Arial warnings
        pdf.set_font("Helvetica", 'B', 20)
        pdf.set_text_color(245, 166, 35) 
        pdf.cell(190, 10, STORE_DETAILS["name"], align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        pdf.set_font("Helvetica", '', 9)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(190, 5, STORE_DETAILS["address"], align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.cell(190, 5, f"Phone: {STORE_DETAILS['phone']} | Email: {STORE_DETAILS['email']}", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        pdf.line(10, 45, 200, 45)
        pdf.ln(15)

        # Invoice Info
        pdf.set_font("Helvetica", 'B', 12)
        pdf.cell(95, 10, "INVOICE TO: Customer")
        pdf.cell(95, 10, f"ID: #TXN-{txn_id}", align='R', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        pdf.set_font("Helvetica", '', 10)
        pdf.cell(95, 5, f"Payment Method: {master['payment_method']}")
        pdf.cell(95, 5, f"Date: {master['sale_date']} {master['sale_time']}", align='R', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(10)
        
        # Table Header
        pdf.set_fill_color(230, 230, 230)
        pdf.set_font("Helvetica", 'B', 10)
        pdf.cell(20, 10, "Sr No.", 1, align='C', fill=True, new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.cell(100, 10, "Product Description", 1, align='L', fill=True, new_x=XPos.RIGHT, new_y=YPos.TOP)
        pdf.cell(40, 10, "Barcode", 1, align='C', fill=True, new_x=XPos.RIGHT, new_y=YPos.TOP)
        # We use new_x=XPos.LMARGIN and new_y=YPos.NEXT to move to the next line after the last cell
        pdf.cell(30, 10, "Quantity", 1, align='C', fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        # Table Body
        pdf.set_font("Helvetica", '', 10)
        for i, item in enumerate(items, 1):
            pdf.cell(20, 10, str(i), 1, align='C', new_x=XPos.RIGHT, new_y=YPos.TOP)
            pdf.cell(100, 10, f" {item['product_name']}", 1, align='L', new_x=XPos.RIGHT, new_y=YPos.TOP)
            pdf.cell(40, 10, str(item['barcode']), 1, align='C', new_x=XPos.RIGHT, new_y=YPos.TOP)
            pdf.cell(30, 10, str(item['qty']), 1, align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            
        # Total
        pdf.ln(10)
        pdf.set_font("Helvetica", 'B', 11)
        pdf.cell(190, 10, f"Total Quantity: {master['total_qty']} Items", align='R', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        pdf.ln(10)
        pdf.set_font("Helvetica", 'I', 8)
        pdf.set_text_color(128, 128, 128)
        pdf.cell(190, 5, "This is a computer-generated invoice and does not require a signature.", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.cell(190, 5, "Thank you for shopping with us!", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # Corrected Output for fpdf2
        pdf_bytes = pdf.output() # returns bytes by default in newer versions
        output = io.BytesIO(pdf_bytes)
        output.seek(0)
        
        return send_file(output, mimetype='application/pdf', 
                         as_attachment=True, download_name=f"Invoice_{txn_id}.pdf")
                         
    except Exception as e:
        print(f"PDF Error: {str(e)}") # This will show the actual error in your console
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
