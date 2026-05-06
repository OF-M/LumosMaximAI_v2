from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LumosMaximAI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Supabase config
    SUPABASE_URL: str
    SUPABASE_KEY: str # Anon or Service role key
    
    # Backend URL for webhooks
    BACKEND_URL: str = "http://localhost:8000"

    class Config:
        env_file = ".env"

settings = Settings()
