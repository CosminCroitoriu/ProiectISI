#!/usr/bin/env python3
"""
View Database Tables - Quick database viewer
"""

import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv

load_dotenv()

# Connection details
DB_CONFIG = {
    'host': os.getenv('DB_HOST'),
    'port': os.getenv('DB_PORT', '5432'),
    'dbname': os.getenv('DB_NAME', 'roadalert'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'sslmode': os.getenv('DB_SSLMODE', 'require')
}

def print_psql_command():
    """Print the psql connection command"""
    print("\n" + "="*60)
    print("PSQL Connection Command:")
    print("="*60)
    psql_cmd = f'psql "host={DB_CONFIG["host"]} port={DB_CONFIG["port"]} dbname={DB_CONFIG["dbname"]} user={DB_CONFIG["user"]} password={DB_CONFIG["password"]} sslmode={DB_CONFIG["sslmode"]}"'
    print(psql_cmd)
    print("\nOr use this format:")
    print(f'PGPASSWORD="{DB_CONFIG["password"]}" psql -h {DB_CONFIG["host"]} -p {DB_CONFIG["port"]} -U {DB_CONFIG["user"]} -d {DB_CONFIG["dbname"]} --set=sslmode={DB_CONFIG["sslmode"]}')
    print("="*60 + "\n")

def view_tables():
    """View all data from database tables"""
    try:
        print(f"Connecting to {DB_CONFIG['dbname']} on {DB_CONFIG['host']}...\n")
        
        conn = psycopg.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            dbname=DB_CONFIG['dbname'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            sslmode=DB_CONFIG['sslmode'],
            row_factory=dict_row
        )
        
        cursor = conn.cursor()
        
        # View USERS
        print("\n" + "="*60)
        print("USERS TABLE")
        print("="*60)
        cursor.execute('SELECT id, username, email, reputation_score, created_at FROM users ORDER BY id')
        users = cursor.fetchall()
        if users:
            for user in users:
                print(f"ID: {user['id']} | Username: {user['username']} | Email: {user['email']} | Reputation: {user['reputation_score']} | Created: {user['created_at']}")
        else:
            print("No users found")
        print(f"\nTotal users: {len(users)}")
        
        # View INCIDENT TYPES
        print("\n" + "="*60)
        print("INCIDENT TYPES TABLE")
        print("="*60)
        cursor.execute('SELECT * FROM incident_types ORDER BY id')
        types = cursor.fetchall()
        if types:
            for t in types:
                print(f"ID: {t['id']} | Type: {t['type_name']} | Icon: {t['icon_url']}")
        else:
            print("No incident types found")
        print(f"\nTotal types: {len(types)}")
        
        # View REPORTS
        print("\n" + "="*60)
        print("REPORTS TABLE")
        print("="*60)
        cursor.execute('''
            SELECT r.*, u.username, it.type_name 
            FROM reports r 
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN incident_types it ON r.type_id = it.id
            ORDER BY r.created_at DESC
        ''')
        reports = cursor.fetchall()
        if reports:
            for r in reports:
                print(f"ID: {r['id']} | User: {r['username']} | Type: {r['type_name']} | Lat: {r['latitude']}, Lng: {r['longitude']}")
                print(f"  Status: {r['status']} | Description: {r['description'][:50] if r['description'] else 'None'}")
                print(f"  Created: {r['created_at']}")
        else:
            print("No reports found")
        print(f"\nTotal reports: {len(reports)}")
        
        # View VOTES
        print("\n" + "="*60)
        print("VOTES TABLE")
        print("="*60)
        cursor.execute('''
            SELECT v.*, u.username, r.id as report_id
            FROM votes v 
            LEFT JOIN users u ON v.user_id = u.id
            LEFT JOIN reports r ON v.report_id = r.id
            ORDER BY v.created_at DESC
        ''')
        votes = cursor.fetchall()
        if votes:
            for v in votes:
                print(f"ID: {v['id']} | User: {v['username']} | Report: {v['report_id']} | Vote: {v['vote_type']} | Created: {v['created_at']}")
        else:
            print("No votes found")
        print(f"\nTotal votes: {len(votes)}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*60)
        print("✓ Database query completed successfully!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        print("Troubleshooting:")
        print("  1. Check your .env file exists and has correct credentials")
        print("  2. Verify firewall rules in Azure Portal allow your IP")
        print("  3. Ensure DB_SSLMODE=require is set")

if __name__ == '__main__':
    print("\n🔍 RoadAlert Database Viewer\n")
    print_psql_command()
    view_tables()

