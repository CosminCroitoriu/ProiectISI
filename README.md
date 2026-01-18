# RoadAlert - Crowdsourced Traffic Monitoring

Open-source alternative to Waze for reporting and monitoring traffic incidents.

## Project Structure

```
/roadalert
├── frontend/          # HTML/CSS/JS login page
├── backend/           # Python + Flask API
├── MISC/             # Documentation images
└── Documentatie_Initiala.md
```

## Quick Start Guide

### Prerequisites

- [Python 3.8+](https://www.python.org/)
- Azure PostgreSQL Database (configured in backend)

### Step 1: Setup Backend

```bash
cd backend

# Install dependencies
pip3 install -r requirements.txt

# Create .env file with Azure database connection
# Get the connection string from Azure Portal
echo "PORT=5000
AZURE_DB_CONNECTION_STRING=your_azure_postgresql_connection_string
JWT_SECRET=roadalert_super_secret_key" > .env

# Start server
python3 server.py
```

Server will be running at: **http://localhost:5000**

### Step 2: Setup Frontend

```bash
cd frontend

# Option 1: Python
python3 -m http.server 8000

# Option 2: Node.js
npx serve

# Option 3: Just open index.html in browser
```

Frontend will be at: **http://localhost:8000** (or just open `index.html`)

## Test It!

1. Open frontend in browser
2. Click "Sign Up" 
3. Create an account:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `test123`
4. You'll be logged in automatically!

## API Endpoints

```
POST /api/auth/register    # Create account
POST /api/auth/login       # Login
GET  /api/user/profile     # Get user info (requires token)
GET  /api/health           # Health check
```

## Tech Stack

**Frontend:**
- Pure HTML/CSS/JavaScript
- No framework (for simplicity)

**Backend:**
- Python + Flask
- Azure PostgreSQL
- JWT authentication
- bcrypt password hashing

## Next Steps

- [ ] Create map page with ArcGIS
- [ ] Add incident reporting
- [ ] Implement voting system
- [ ] Add real-time updates

## Documentation

See `Documentatie_Initiala.md` for full project specifications.

## Team

- Cosmin Croitoriu
- Mario Parfinescu  
- Marius Ciochina

## License

Open Source - Educational Project

TODO:
- ttl pe report-uri - done
- sistem de votare pe report-uri, la 3 voturi sa se stearga report-ul - done
- statistici, grafice (e.g. nr de accidente pe o anumita zona, strada, etc) - done


- DOCUMENTATIE INITIALA VS FINALA - ce n-a mers?
- ppt - todo