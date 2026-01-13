from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, BusinessMember

def get_current_user(
    db: Session = Depends(get_db),
    x_user_email: str | None = Header(default=None, alias="X-User-Email"),
) -> User:
    """
    Dev-only auth: pass X-User-Email header.
    Later swap to real auth, keep same function signature.
    """
    if not x_user_email:
        raise HTTPException(status_code=401, detail="Missing X-User-Email header")

    email = x_user_email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def require_business_owner(business_id: int):
    def _dep(
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> BusinessMember:
        membership = (
            db.query(BusinessMember)
            .filter(
                BusinessMember.user_id == user.id,
                BusinessMember.business_id == business_id,
                BusinessMember.role == "OWNER",
            )
            .first()
        )
        if not membership:
            raise HTTPException(status_code=403, detail="Not an owner of this business")
        return membership

    return _dep
