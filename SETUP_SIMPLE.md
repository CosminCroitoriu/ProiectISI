# RoadAlert - Simple Setup

## Copy-Paste Commands (5 Minutes)

### Step 1: Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux:**
```bash
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

### Step 2: Create Database

```bash
cd backend
psql -U postgres -f database.sql
```

### Step 3: Install Python Packages

```bash
cd backend
pip3 install Flask Flask-CORS psycopg2-binary PyJWT bcrypt python-dotenv
```

### Step 4: Create Configuration

```bash
cd backend
echo "PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=roadalert
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=roadalert_super_secret_key" > .env
```

### Step 5: Start Backend

```bash
cd backend
python3 server.py
```

### Step 6: Start Frontend

**New terminal:**
```bash
cd frontend
python3 -m http.server 8000
```

### Step 7: Open Browser

Go to: **http://localhost:8000**

---

## Test It

1. Click "Sign Up"
2. Username: `test`
3. Email: `test@test.com`
4. Password: `test123`
5. Click "Sign Up" → Success!

---

## Problems?

**"command not found: psql"**  
→ Install PostgreSQL (see Step 1)

**"ModuleNotFoundError: No module named 'flask'"**  
→ Run: `pip3 install Flask Flask-CORS psycopg2-binary PyJWT bcrypt python-dotenv`

**"could not connect to server"**  
→ Start PostgreSQL: `brew services start postgresql@14`

**"relation 'users' does not exist"**  
→ Run database setup: `psql -U postgres -f backend/database.sql`

---

## Done!

Your RoadAlert login system is working!

