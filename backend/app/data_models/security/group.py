from pydantic import BaseModel, ConfigDict
from typing import Optional


class GroupCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    group_type: Optional[str] = 'security'
    parent_group_id: Optional[int] = None
    status: Optional[str] = 'active'

    model_config = ConfigDict(from_attributes=True)


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    group_type: Optional[str] = None
    parent_group_id: Optional[int] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
