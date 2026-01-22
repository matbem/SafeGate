class Settings:
    SECRET_KEY: str = "SOME_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    """Image processing settings"""
    BLUR_THRESHOLD = 100.0
    BRIGHTNESS__MIN = 40.0
    BRIGHTNESS_MAX = 250.0
    MATCH_TOLETANCE = 0.5


settings = Settings()
