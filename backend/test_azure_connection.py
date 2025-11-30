#!/usr/bin/env python3
"""
Test Azure PostgreSQL Connection
Run this to verify your Azure database connection works
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

print("Testing Azure PostgreSQL Connection...\n")

# Connection details
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'dbname': os.getenv('DB_NAME', 'roadalert'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'sslmode': os.getenv('DB_SSLMODE', 'prefer')
}

print(f"Host: {DB_CONFIG['host']}")
print(f"Database: {DB_CONFIG['dbname']}")
print(f"User: {DB_CONFIG['user']}")
print(f"SSL Mode: {DB_CONFIG['sslmode']}\n")

try:
    # Attempt connection
    print("Connecting...")
    conn = psycopg.connect(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        dbname=DB_CONFIG['dbname'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        sslmode=DB_CONFIG['sslmode']
    )
    
    print("Connection successful!\n")
    
    # Test query
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"PostgreSQL Version:\n{version[0]}\n")
    
    # Check if tables exist
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = cursor.fetchall()
    
    if tables:
        print("Tables found:")
        for table in tables:
            print(f"  {table[0]}")
    else:
        print("No tables found! Run database.sql to create them.")
    
    cursor.close()
    conn.close()
    
    print("\nAzure PostgreSQL is ready to use!")
    
except Exception as e:
    print(f"Connection failed: {e}")
    print("\nTroubleshooting:")
    print("  1. Check your .env file has correct credentials")
    print("  2. Verify firewall rules allow your IP in Azure Portal")
    print("  3. Ensure SSL mode is set to 'require'")
    print("  4. Check if database 'roadalert' exists")

