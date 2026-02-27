from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    unique_id: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    unique_id: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)