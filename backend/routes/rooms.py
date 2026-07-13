import os
import uuid
import aiofiles
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from database import get_db
from models import RoomCreate, RoomUpdate, RoomOut
from auth import verify_token
import aiosqlite

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def row_to_dict(row) -> dict:
    return dict(row)


# ──────────────────────────────── PUBLIC ROUTES ────────────────────────────────

@router.get("/rooms", response_model=List[RoomOut])
async def get_rooms(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, name, description, price_per_night, amenities, images, is_available, created_at FROM rooms ORDER BY created_at DESC"
    )
    rows = await cursor.fetchall()
    return [row_to_dict(r) for r in rows]


@router.get("/rooms/{room_id}", response_model=RoomOut)
async def get_room(room_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM rooms WHERE id = ?", (room_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Room not found")
    return row_to_dict(row)


# ──────────────────────────────── ADMIN ROUTES ─────────────────────────────────

@router.post("/rooms", response_model=RoomOut)
async def create_room(
    room: RoomCreate,
    db: aiosqlite.Connection = Depends(get_db),
    _: str = Depends(verify_token),
):
    cursor = await db.execute(
        "INSERT INTO rooms (name, description, price_per_night, amenities, images, is_available) VALUES (?,?,?,?,?,?)",
        (room.name, room.description, room.price_per_night, room.amenities, room.images, room.is_available),
    )
    await db.commit()
    room_id = cursor.lastrowid
    cursor = await db.execute("SELECT * FROM rooms WHERE id = ?", (room_id,))
    row = await cursor.fetchone()
    return row_to_dict(row)


@router.put("/rooms/{room_id}", response_model=RoomOut)
async def update_room(
    room_id: int,
    room: RoomUpdate,
    db: aiosqlite.Connection = Depends(get_db),
    _: str = Depends(verify_token),
):
    cursor = await db.execute("SELECT * FROM rooms WHERE id = ?", (room_id,))
    existing = await cursor.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Room not found")

    existing = row_to_dict(existing)
    updated = {
        "name": room.name if room.name is not None else existing["name"],
        "description": room.description if room.description is not None else existing["description"],
        "price_per_night": room.price_per_night if room.price_per_night is not None else existing["price_per_night"],
        "amenities": room.amenities if room.amenities is not None else existing["amenities"],
        "images": room.images if room.images is not None else existing["images"],
        "is_available": room.is_available if room.is_available is not None else existing["is_available"],
    }

    await db.execute(
        "UPDATE rooms SET name=?, description=?, price_per_night=?, amenities=?, images=?, is_available=? WHERE id=?",
        (updated["name"], updated["description"], updated["price_per_night"],
         updated["amenities"], updated["images"], updated["is_available"], room_id),
    )
    await db.commit()
    cursor = await db.execute("SELECT * FROM rooms WHERE id = ?", (room_id,))
    row = await cursor.fetchone()
    return row_to_dict(row)


@router.delete("/rooms/{room_id}")
async def delete_room(
    room_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    _: str = Depends(verify_token),
):
    cursor = await db.execute("SELECT id FROM rooms WHERE id = ?", (room_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Room not found")
    await db.execute("DELETE FROM rooms WHERE id = ?", (room_id,))
    await db.commit()
    return {"message": "Room deleted successfully"}


@router.post("/rooms/{room_id}/upload")
async def upload_room_image(
    room_id: int,
    file: UploadFile = File(...),
    db: aiosqlite.Connection = Depends(get_db),
    _: str = Depends(verify_token),
):
    cursor = await db.execute("SELECT id, images FROM rooms WHERE id = ?", (room_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Room not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}")

    filename = f"{room_id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    existing_images = row["images"] or ""
    image_url = f"/uploads/{filename}"
    images_list = [img for img in existing_images.split(",") if img.strip()]
    images_list.append(image_url)
    new_images = ",".join(images_list)

    await db.execute("UPDATE rooms SET images = ? WHERE id = ?", (new_images, room_id))
    await db.commit()

    return {"message": "Image uploaded", "url": image_url, "all_images": new_images}
