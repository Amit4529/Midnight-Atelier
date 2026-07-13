from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from models import AdminLogin, Token
from auth import verify_password, create_access_token
import aiosqlite

router = APIRouter()


@router.post("/admin/login", response_model=Token)
async def admin_login(credentials: AdminLogin, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT username, hashed_password FROM admins WHERE username = ?",
        (credentials.username,),
    )
    row = await cursor.fetchone()
    if not row or not verify_password(credentials.password, row["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(data={"sub": row["username"]})
    return {"access_token": token, "token_type": "bearer"}
