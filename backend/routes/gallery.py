import os
import uuid
import aiofiles
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from database import get_db
from auth import verify_token
import aiosqlite

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


# ──────────────────────────────── PUBLIC ────────────────────────────────

@router.get("/gallery")
async def get_gallery(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, image_url, caption, display_order, created_at FROM gallery_images ORDER BY display_order ASC, created_at DESC"
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


# ──────────────────────────────── ADMIN ─────────────────────────────────

@router.post("/gallery/upload")
async def upload_gallery_image(
    file: UploadFile = File(...),
    caption: str = Form(""),
    db: aiosqlite.Connection = Depends(get_db),
    _: str = Depends(verify_token),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed.")

    filename = f"gallery_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    image_url = f"/uploads/{filename}"

    # Get next display order
    cursor = await db.execute("SELECT COALESCE(MAX(display_order), 0) + 1 FROM gallery_images")
    row = await cursor.fetchone()
    next_order = row[0]

    cursor = await db.execute(
        "INSERT INTO gallery_images (image_url, caption, display_order) VALUES (?, ?, ?)",
        (image_url, caption, next_order),
    )
    await db.commit()

    return {"id": cursor.lastrowid, "image_url": image_url, "caption": caption}


@router.delete("/gallery/{image_id}")
async def delete_gallery_image(
    image_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    _: str = Depends(verify_token),
):
    cursor = await db.execute("SELECT id, image_url FROM gallery_images WHERE id = ?", (image_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Gallery image not found")

    # Try to delete the file
    url = row["image_url"]
    if url.startswith("/uploads/"):
        filepath = os.path.join(UPLOAD_DIR, url.replace("/uploads/", ""))
        if os.path.exists(filepath):
            os.remove(filepath)

    await db.execute("DELETE FROM gallery_images WHERE id = ?", (image_id,))
    await db.commit()
    return {"message": "Gallery image deleted"}


# ──────────────────────────────── SETTINGS ─────────────────────────────

@router.get("/settings")
async def get_settings(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT key, value FROM settings")
    rows = await cursor.fetchall()
    return {row["key"]: row["value"] for row in rows}


@router.put("/settings")
async def update_settings(
    updates: dict,
    db: aiosqlite.Connection = Depends(get_db),
    _: str = Depends(verify_token),
):
    allowed_keys = {"whatsapp_number", "instagram_handle"}
    for key, value in updates.items():
        if key in allowed_keys:
            await db.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, str(value)),
            )
    await db.commit()
    # Return updated settings
    cursor = await db.execute("SELECT key, value FROM settings")
    rows = await cursor.fetchall()
    return {row["key"]: row["value"] for row in rows}
