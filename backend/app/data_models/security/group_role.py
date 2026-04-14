from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class GroupRoleCreate(BaseModel):
    group_id: int
    role_id: int
    assigned_by_user_id: Optional[int] = None
    assignment_reason: Optional[str] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = 'active'

    model_config = ConfigDict(from_attributes=True)


class GroupRoleUpdate(BaseModel):
    assignment_reason: Optional[str] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
