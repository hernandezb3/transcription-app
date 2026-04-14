from pydantic import BaseModel, ConfigDict
from typing import Optional


class PermissionCreate(BaseModel):
    code: str
    resource: str
    action: str
    description: Optional[str] = None
    status: Optional[str] = 'active'

    model_config = ConfigDict(from_attributes=True)


class PermissionUpdate(BaseModel):
    code: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
