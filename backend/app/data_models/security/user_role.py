from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class UserRoleCreate(BaseModel):
    user_id: int
    role_id: int
    group_id: Optional[int] = None
    assigned_by_user_id: Optional[int] = None
    assignment_reason: Optional[str] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = 'active'

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    assignment_reason: Optional[str] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
