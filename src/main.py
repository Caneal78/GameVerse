now, review and audit files and foldersimport sqlite3

# Connect to SQLite database (creates it if it doesn't exist)
conn = sqlite3.connect('mydatabase.db')
cursor = conn.cursor()

try:
    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    "")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    "")

    # Insert sample data
    cursor.execute("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')")
    cursor.execute("INSERT INTO posts (title, content, user_id) VALUES ('First Post', 'Hello world!', 1)")

    # Commit changes
    conn.commit()

    # Query data
    cursor.execute("SELECT * FROM users")
    rows = cursor.fetchall()
    print("Users:", rows)

    cursor.execute("SELECT * FROM posts")
    rows = cursor.fetchall()
    print("Posts:", rows)

except sqlite3.Error as e:
    print("Database error:", e)

finally:
    # Close the connection
    if conn:
        conn.close()
        print("Database connection closed.")
