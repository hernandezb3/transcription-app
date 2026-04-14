from pydantic import BaseModel, ConfigDict
from typing import Optional


class RoleCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    assignment_level: Optional[str] = 'both'
    status: Optional[str] = 'active'

    model_config = ConfigDict(from_attributes=True)


class RoleUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    assignment_level: Optional[str] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
