from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg
from psycopg.rows import dict_row
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'roadalert'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}

JWT_SECRET = os.getenv('JWT_SECRET', 'roadalert_super_secret_key')
JWT_EXPIRES_DAYS = 7

# Database connection
def get_db():
    """Get database connection"""
    try:
        conn = psycopg.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            dbname=DB_CONFIG['database'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            sslmode=os.getenv('DB_SSLMODE', 'prefer'),
            row_factory=dict_row
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Test database connection on startup
try:
    conn = get_db()
    if conn:
        print("Database connected successfully")
        conn.close()
    else:
        print("Failed to connect to database")
except Exception as e:
    print(f"Database connection error: {e}")

# ==================== ROUTES ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'message': 'RoadAlert API is running'
    })

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validation
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400
        
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 6 characters'
            }), 400
        
        conn = get_db()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute(
            'SELECT * FROM users WHERE email = %s OR username = %s',
            (email, username)
        )
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'User with this email or username already exists'
            }), 400
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        cursor.execute(
            '''INSERT INTO users (username, email, password_hash, reputation_score) 
               VALUES (%s, %s, %s, 0) 
               RETURNING id, username, email, reputation_score, created_at''',
            (username, email, password_hash)
        )
        user = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        # Generate JWT token
        token = jwt.encode(
            {
                'userId': user['id'],
                'exp': datetime.utcnow() + timedelta(days=JWT_EXPIRES_DAYS)
            },
            JWT_SECRET,
            algorithm='HS256'
        )
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'reputation_score': user['reputation_score']
            },
            'message': 'Registration successful'
        }), 201
        
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Validation
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        conn = get_db()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        # Find user
        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Check password
        is_valid = bcrypt.checkpw(
            password.encode('utf-8'),
            user['password_hash'].encode('utf-8')
        )
        
        cursor.close()
        conn.close()
        
        if not is_valid:
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Generate JWT token
        token = jwt.encode(
            {
                'userId': user['id'],
                'exp': datetime.utcnow() + timedelta(days=JWT_EXPIRES_DAYS)
            },
            JWT_SECRET,
            algorithm='HS256'
        )
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'reputation_score': user['reputation_score']
            },
            'message': 'Login successful'
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@app.route('/api/user/profile', methods=['GET'])
def get_profile():
    """Get user profile (protected route)"""
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({
                'success': False,
                'message': 'Access token required'
            }), 401
        
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        
        # Verify token
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = decoded['userId']
        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'message': 'Token expired'
            }), 403
        except jwt.InvalidTokenError:
            return jsonify({
                'success': False,
                'message': 'Invalid token'
            }), 403
        
        conn = get_db()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, username, email, reputation_score, created_at FROM users WHERE id = %s',
            (user_id,)
        )
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'user': dict(user)
        })
        
    except Exception as e:
        print(f"Profile error: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

# ==================== RUN SERVER ====================

if __name__ == '__main__':
    PORT = int(os.getenv('PORT', 5000))
    print(f"Server running on http://localhost:{PORT}")
    print(f"API available at http://localhost:{PORT}/api")
    print(f"Health check: http://localhost:{PORT}/api/health")
    app.run(debug=True, port=PORT)

