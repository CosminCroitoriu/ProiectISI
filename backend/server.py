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
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})

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

# Helper function to verify JWT token
def verify_token():
    """Verify JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None, "Access token required"
    
    token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
    
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return decoded['userId'], None
    except jwt.ExpiredSignatureError:
        return None, "Token expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"

# ==================== REPORTS ENDPOINTS ====================

# TTL for reports in seconds (10 seconds for testing, change to e.g. 3600 for 1 hour in production)
REPORT_TTL_SECONDS = 30

# Number of votes needed to remove or extend a report
VOTES_THRESHOLD = 2

@app.route('/api/reports', methods=['POST'])
def create_report():
    """Create a new map report (police or accident)"""
    try:
        user_id, error = verify_token()
        if error:
            return jsonify({'success': False, 'message': error}), 401
        
        data = request.get_json()
        
        # Validation
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        report_type = data.get('type')  # 'POLICE' or 'ACCIDENT'
        description = data.get('description', '')
        
        if latitude is None or longitude is None:
            return jsonify({
                'success': False,
                'message': 'Latitude and longitude are required'
            }), 400
        
        if not report_type or report_type not in ['POLICE', 'ACCIDENT']:
            return jsonify({
                'success': False,
                'message': 'Type must be POLICE or ACCIDENT'
            }), 400
        
        conn = get_db()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        # Get the type_id from incident_types
        cursor.execute('SELECT id FROM incident_types WHERE type_name = %s', (report_type,))
        type_row = cursor.fetchone()
        
        if not type_row:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Invalid report type'
            }), 400
        
        type_id = type_row['id']
        
        # Calculate expires_at
        expires_at = datetime.utcnow() + timedelta(seconds=REPORT_TTL_SECONDS)
        
        # Create the report with expires_at
        cursor.execute(
            '''INSERT INTO reports (user_id, type_id, latitude, longitude, description, status, expires_at) 
               VALUES (%s, %s, %s, %s, %s, 'ACTIVE', %s) 
               RETURNING id, user_id, type_id, latitude, longitude, description, status, created_at, expires_at''',
            (user_id, type_id, latitude, longitude, description, expires_at)
        )
        report = cursor.fetchone()
        conn.commit()
        
        # Get the username for the response
        cursor.execute('SELECT username FROM users WHERE id = %s', (user_id,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'report': {
                'id': report['id'],
                'user_id': report['user_id'],
                'username': user['username'] if user else 'Unknown',
                'type_name': report_type,
                'latitude': float(report['latitude']),
                'longitude': float(report['longitude']),
                'description': report['description'],
                'status': report['status'],
                'created_at': report['created_at'].isoformat() if report['created_at'] else None,
                'expires_at': report['expires_at'].isoformat() if report['expires_at'] else None
            },
            'message': 'Report created successfully'
        }), 201
        
    except Exception as e:
        print(f"Create report error: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """Get all active (non-expired) reports for the map"""
    try:
        user_id, error = verify_token()
        if error:
            return jsonify({'success': False, 'message': error}), 401
        
        conn = get_db()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        # Get all active reports that haven't expired with vote counts
        cursor.execute('''
            SELECT r.id, r.user_id, u.username, it.type_name, 
                   r.latitude, r.longitude, r.description, r.status, r.created_at, r.expires_at,
                   COALESCE(keep_votes.count, 0) as keep_votes,
                   COALESCE(remove_votes.count, 0) as remove_votes
            FROM reports r
            JOIN incident_types it ON r.type_id = it.id
            JOIN users u ON r.user_id = u.id
            LEFT JOIN (
                SELECT report_id, COUNT(*) as count 
                FROM report_votes WHERE vote_type = 'keep' 
                GROUP BY report_id
            ) keep_votes ON r.id = keep_votes.report_id
            LEFT JOIN (
                SELECT report_id, COUNT(*) as count 
                FROM report_votes WHERE vote_type = 'remove' 
                GROUP BY report_id
            ) remove_votes ON r.id = remove_votes.report_id
            WHERE r.status = 'ACTIVE' 
              AND (r.expires_at IS NULL OR r.expires_at > NOW())
            ORDER BY r.created_at DESC
        ''')
        reports = cursor.fetchall()
        
        # Check which reports the current user has voted on
        cursor.execute('''
            SELECT report_id, vote_type FROM report_votes WHERE user_id = %s
        ''', (user_id,))
        user_votes = {row['report_id']: row['vote_type'] for row in cursor.fetchall()}
        
        cursor.close()
        conn.close()
        
        # Convert to list of dicts with proper types
        reports_list = []
        for report in reports:
            reports_list.append({
                'id': report['id'],
                'user_id': report['user_id'],
                'username': report['username'],
                'type_name': report['type_name'],
                'latitude': float(report['latitude']),
                'longitude': float(report['longitude']),
                'description': report['description'],
                'status': report['status'],
                'created_at': report['created_at'].isoformat() if report['created_at'] else None,
                'expires_at': report['expires_at'].isoformat() if report['expires_at'] else None,
                'keep_votes': report['keep_votes'],
                'remove_votes': report['remove_votes'],
                'user_vote': user_votes.get(report['id'])  # 'keep', 'remove', or None
            })
        
        return jsonify({
            'success': True,
            'reports': reports_list,
            'votes_threshold': VOTES_THRESHOLD
        })
        
    except Exception as e:
        print(f"Get reports error: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@app.route('/api/reports/<int:report_id>/vote', methods=['POST'])
def vote_on_report(report_id):
    """Vote to keep or remove a report. 3 votes needed for action."""
    try:
        user_id, error = verify_token()
        if error:
            return jsonify({'success': False, 'message': error}), 401
        
        data = request.get_json()
        vote_type = data.get('vote')  # 'keep' or 'remove'
        
        if vote_type not in ['keep', 'remove']:
            return jsonify({
                'success': False,
                'message': 'Vote must be "keep" or "remove"'
            }), 400
        
        conn = get_db()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        # Check if report exists and is active
        cursor.execute('SELECT id, expires_at FROM reports WHERE id = %s AND status = %s', (report_id, 'ACTIVE'))
        report = cursor.fetchone()
        
        if not report:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Report not found or already expired'
            }), 404
        
        # Check if user already voted on this report
        cursor.execute('SELECT id, vote_type FROM report_votes WHERE report_id = %s AND user_id = %s', (report_id, user_id))
        existing_vote = cursor.fetchone()
        
        if existing_vote:
            if existing_vote['vote_type'] == vote_type:
                # Same vote - get current counts and return
                cursor.execute('''
                    SELECT vote_type, COUNT(*) as count 
                    FROM report_votes 
                    WHERE report_id = %s 
                    GROUP BY vote_type
                ''', (report_id,))
                vote_counts = {row['vote_type']: row['count'] for row in cursor.fetchall()}
                cursor.close()
                conn.close()
                return jsonify({
                    'success': True,
                    'message': 'You already voted this way',
                    'already_voted': True,
                    'keep_votes': vote_counts.get('keep', 0),
                    'remove_votes': vote_counts.get('remove', 0),
                    'votes_threshold': VOTES_THRESHOLD
                })
            else:
                # Change vote
                cursor.execute('UPDATE report_votes SET vote_type = %s WHERE id = %s', (vote_type, existing_vote['id']))
        else:
            # New vote - insert and increase reputation
            cursor.execute(
                'INSERT INTO report_votes (report_id, user_id, vote_type) VALUES (%s, %s, %s)',
                (report_id, user_id, vote_type)
            )
            # Increase reputation score by 1 for participating in voting
            cursor.execute('UPDATE users SET reputation_score = reputation_score + 1 WHERE id = %s', (user_id,))
        
        conn.commit()
        
        # Count votes
        cursor.execute('''
            SELECT vote_type, COUNT(*) as count 
            FROM report_votes 
            WHERE report_id = %s 
            GROUP BY vote_type
        ''', (report_id,))
        vote_counts = {row['vote_type']: row['count'] for row in cursor.fetchall()}
        
        keep_votes = vote_counts.get('keep', 0)
        remove_votes = vote_counts.get('remove', 0)
        
        result = {
            'success': True,
            'keep_votes': keep_votes,
            'remove_votes': remove_votes,
            'votes_threshold': VOTES_THRESHOLD,
            'action_taken': None
        }
        
        # Check if threshold reached
        if remove_votes >= VOTES_THRESHOLD:
            # Delete the report
            cursor.execute('DELETE FROM reports WHERE id = %s', (report_id,))
            conn.commit()
            result['action_taken'] = 'removed'
            result['message'] = 'Report removed! (3 votes reached)'
        elif keep_votes >= VOTES_THRESHOLD:
            # Extend TTL and reset votes
            new_expires_at = datetime.utcnow() + timedelta(seconds=REPORT_TTL_SECONDS)
            cursor.execute('UPDATE reports SET expires_at = %s WHERE id = %s', (new_expires_at, report_id))
            cursor.execute('DELETE FROM report_votes WHERE report_id = %s', (report_id,))
            conn.commit()
            result['action_taken'] = 'extended'
            result['message'] = 'Report confirmed! TTL extended and votes reset.'
            result['keep_votes'] = 0
            result['remove_votes'] = 0
            result['expires_at'] = new_expires_at.isoformat()
        else:
            result['message'] = f'Vote recorded! ({keep_votes}/3 keep, {remove_votes}/3 remove)'
        
        cursor.close()
        conn.close()
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Vote on report error: {e}")
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

# ==================== STATISTICS ====================

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get statistics about reports and users"""
    try:
        conn = get_db()
        if not conn:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = conn.cursor()
        
        # 1. Reports by type (all time)
        cursor.execute('''
            SELECT it.type_name, COUNT(r.id) as count
            FROM incident_types it
            LEFT JOIN reports r ON r.type_id = it.id
            GROUP BY it.id, it.type_name
            ORDER BY count DESC
        ''')
        reports_by_type = [{'type': row['type_name'], 'count': row['count']} for row in cursor.fetchall()]
        
        # 2. Reports per day (last 30 days)
        cursor.execute('''
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM reports
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ''')
        reports_per_day = [{'date': row['date'].isoformat(), 'count': row['count']} for row in cursor.fetchall()]
        
        # 3. Reports per month (last 12 months)
        cursor.execute('''
            SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
            FROM reports
            WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY month ASC
        ''')
        reports_per_month = [{'month': row['month'], 'count': row['count']} for row in cursor.fetchall()]
        
        # 4. Reports by type per day (last 7 days) for stacked chart
        cursor.execute('''
            SELECT DATE(r.created_at) as date, it.type_name, COUNT(*) as count
            FROM reports r
            JOIN incident_types it ON r.type_id = it.id
            WHERE r.created_at >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(r.created_at), it.type_name
            ORDER BY date ASC
        ''')
        reports_by_type_daily = {}
        for row in cursor.fetchall():
            date_str = row['date'].isoformat()
            if date_str not in reports_by_type_daily:
                reports_by_type_daily[date_str] = {'date': date_str, 'ACCIDENT': 0, 'POLICE': 0, 'POTHOLE': 0, 'TRAFFIC_JAM': 0}
            reports_by_type_daily[date_str][row['type_name']] = row['count']
        reports_by_type_daily_list = list(reports_by_type_daily.values())
        
        # 5. Total statistics
        cursor.execute('SELECT COUNT(*) as total FROM reports')
        total_reports = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM reports WHERE status = %s', ('ACTIVE',))
        active_reports = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM users')
        total_users = cursor.fetchone()['total']
        
        cursor.execute('SELECT COUNT(*) as total FROM report_votes')
        total_votes = cursor.fetchone()['total']
        
        # 6. Top reporters (users with most reports)
        cursor.execute('''
            SELECT u.username, COUNT(r.id) as report_count, u.reputation_score
            FROM users u
            LEFT JOIN reports r ON r.user_id = u.id
            GROUP BY u.id, u.username, u.reputation_score
            ORDER BY report_count DESC
            LIMIT 5
        ''')
        top_reporters = [{'username': row['username'], 'reports': row['report_count'], 'reputation': row['reputation_score']} for row in cursor.fetchall()]
        
        # 7. Average reports per user
        avg_reports_per_user = round(total_reports / max(total_users, 1), 2)
        
        # 8. Most active hour of the day
        cursor.execute('''
            SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
            FROM reports
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY count DESC
            LIMIT 1
        ''')
        peak_hour_row = cursor.fetchone()
        peak_hour = int(peak_hour_row['hour']) if peak_hour_row else 0
        
        # 9. Reports by hour distribution
        cursor.execute('''
            SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
            FROM reports
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour ASC
        ''')
        reports_by_hour = [{'hour': int(row['hour']), 'count': row['count']} for row in cursor.fetchall()]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'statistics': {
                'summary': {
                    'total_reports': total_reports,
                    'active_reports': active_reports,
                    'total_users': total_users,
                    'total_votes': total_votes,
                    'avg_reports_per_user': avg_reports_per_user,
                    'peak_hour': peak_hour
                },
                'reports_by_type': reports_by_type,
                'reports_per_day': reports_per_day,
                'reports_per_month': reports_per_month,
                'reports_by_type_daily': reports_by_type_daily_list,
                'reports_by_hour': reports_by_hour,
                'top_reporters': top_reporters
            }
        })
        
    except Exception as e:
        print(f"Statistics error: {e}")
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

