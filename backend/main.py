from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from app.api.v1 import access, admin, auth

app = FastAPI(title="SafeGate API")

#Cors Middleware config
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(access.router, prefix="/api/v1/access", tags=["Access"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

