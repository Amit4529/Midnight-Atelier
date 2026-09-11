import aiosqlite
import os
from passlib.context import CryptContext

DB_PATH = os.path.join(os.path.dirname(__file__), "midnight_atelier.db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

CREATE_ROOMS_TABLE = """
CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price_per_night REAL,
    amenities TEXT,
    images TEXT,
    is_available INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_ADMIN_TABLE = """
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL
);
"""

CREATE_GALLERY_TABLE = """
CREATE TABLE IF NOT EXISTS gallery_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_SETTINGS_TABLE = """
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_ROOMS_TABLE)
        await db.execute(CREATE_ADMIN_TABLE)
        await db.execute(CREATE_GALLERY_TABLE)
        await db.execute(CREATE_SETTINGS_TABLE)

        # Seed default admin if not exists
        cursor = await db.execute("SELECT id FROM admins WHERE username = ?", ("admin",))
        row = await cursor.fetchone()
        if not row:
            hashed = pwd_context.hash("midnight2024")
            await db.execute(
                "INSERT INTO admins (username, hashed_password) VALUES (?, ?)",
                ("admin", hashed),
            )

        # Seed default settings
        default_settings = {
            "whatsapp_number": "918800105244",
            "instagram_handle": "midnightatelier.gn",
        }
        for key, value in default_settings.items():
            cursor = await db.execute("SELECT key FROM settings WHERE key = ?", (key,))
            if not await cursor.fetchone():
                await db.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (key, value))

        # Seed sample rooms
        cursor = await db.execute("SELECT COUNT(*) FROM rooms")
        count_row = await cursor.fetchone()
        if count_row[0] == 0:
            sample_rooms = [
                (
                    "The Midnight Suite",
                    "Our flagship luxury suite featuring a king-size bed, private jacuzzi, and a cinematic projector setup. Perfect for a romantic escape or a premium solo retreat.",
                    3999,
                    "King Bed,Jacuzzi,Projector,AC,WiFi,Smart TV,Mini Bar",
                    "",
                    1,
                ),
                (
                    "Olive Luxe Room",
                    "Draped in deep olive and gold tones, this room exudes warmth and sophistication. Ideal for couples seeking a cozy, luxurious stay.",
                    2499,
                    "Queen Bed,AC,WiFi,Smart TV,Work Desk,Premium Toiletries",
                    "",
                    1,
                ),
                (
                    "Cinema Den",
                    "Experience movies like never before in our dedicated cinema room. A massive projector screen, surround sound, and plush seating await you.",
                    2999,
                    "Queen Bed,Projector Screen,Surround Sound,AC,WiFi,Snack Bar",
                    "",
                    1,
                ),
                (
                    "Studio Noir",
                    "A sleek, modern studio designed for the minimalist traveler. Clean lines, dark tones, and all the essentials for a perfect stay.",
                    1799,
                    "Double Bed,AC,WiFi,Smart TV,Compact Kitchen",
                    "",
                    1,
                ),
            ]
            await db.executemany(
                "INSERT INTO rooms (name, description, price_per_night, amenities, images, is_available) VALUES (?,?,?,?,?,?)",
                sample_rooms,
            )

        await db.commit()

