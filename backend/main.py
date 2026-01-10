from fastapi import FastAPI
from api.v1 import access, admin, auth

app = FastAPI(title="SafeGate API")

# Rejestracja routerów z odpowiednimi prefixami
app.include_router(access.router, prefix="/api/v1/access", tags=["Access"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])