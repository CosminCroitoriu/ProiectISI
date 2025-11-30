# RoadAlert Backend (Python + Flask)

Simple Python backend with Flask and PostgreSQL.

## Quick Start

### 1. Install Python Dependencies

```bash
cd backend-python

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 2. Setup PostgreSQL Database

```bash
# Start PostgreSQL
brew services start postgresql@14  # macOS
# or
sudo service postgresql start      # Linux

# Run database setup
psql -U postgres -f database.sql
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your database password
nano .env
```

### 4. Start Server

```bash
python server.py
```

Server runs on: **http://localhost:5000**

## API Endpoints

### Health Check
```bash
GET /api/health
```

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Profile (Protected)
```bash
GET /api/user/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

## Test with cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

## Tech Stack

- **Python 3.x**
- **Flask** - Web framework
- **PostgreSQL** - Database
- **psycopg2** - PostgreSQL adapter
- **bcrypt** - Password hashing
- **PyJWT** - JWT tokens
- **Flask-CORS** - CORS support

## Dependencies

All in `requirements.txt`:
- Flask==3.0.0
- Flask-CORS==4.0.0
- psycopg2-binary==2.9.9
- PyJWT==2.8.0
- bcrypt==4.1.2
- python-dotenv==1.0.0

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection protection (parameterized queries)
- CORS enabled
- Input validation

## Notes

- Virtual environment recommended
- Default port: 5000
- JWT tokens expire in 7 days
- Minimum password length: 6 characters
- Change JWT_SECRET in production!

## Why Python?

- Simpler syntax than Node.js
- No npm/node_modules issues
- Better for beginners
- Easier to debug
- Great for universities

