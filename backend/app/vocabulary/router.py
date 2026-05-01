from fastapi import APIRouter, Depends
from app.database import get_db_dep
from app.auth.service import get_current_user
from app.vocabulary import service

router = APIRouter(prefix="/vocab", tags=["vocabulary"])

@router.get("")
async def get_vocabulary(user=Depends(get_current_user), db=Depends(get_db_dep)):
    return service.list_verbs(user["id"], db)

@router.post("/{infinitive}", status_code=201)
async def add_to_vocabulary(infinitive: str, user=Depends(get_current_user), db=Depends(get_db_dep)):
    return service.add_verb(user["id"], infinitive.lower(), db)

@router.delete("/{infinitive}", status_code=204)
async def remove_from_vocabulary(infinitive: str, user=Depends(get_current_user), db=Depends(get_db_dep)):
    service.remove_verb(user["id"], infinitive.lower(), db)
