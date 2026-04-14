from pydantic import BaseModel, ConfigDict


class RolePermissionCreate(BaseModel):
    role_id: int
    permission_id: int

    model_config = ConfigDict(from_attributes=True)
