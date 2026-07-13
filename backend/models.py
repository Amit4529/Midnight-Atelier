from pydantic import BaseModel
from typing import Optional, List


class RoomCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price_per_night: Optional[float] = 0.0
    amenities: Optional[str] = ""
    images: Optional[str] = ""
    is_available: Optional[int] = 1


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_per_night: Optional[float] = None
    amenities: Optional[str] = None
    images: Optional[str] = None
    is_available: Optional[int] = None


class RoomOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price_per_night: Optional[float]
    amenities: Optional[str]
    images: Optional[str]
    is_available: int
    created_at: Optional[str]

    class Config:
        from_attributes = True


class AdminLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
