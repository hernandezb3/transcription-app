from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class UserGroupCreate(BaseModel):
    user_id: int
    group_id: int
    membership_status: Optional[str] = 'active'
    membership_type: Optional[str] = 'member'
    joined_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserGroupUpdate(BaseModel):
    membership_status: Optional[str] = None
    membership_type: Optional[str] = None
    joined_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
