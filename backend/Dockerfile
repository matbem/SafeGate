FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    cmake  \
    build-essential \
    git \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*
    
#creates /app directory in the container and there execute following commands
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt
#Copy the code
COPY . .
#Start the app with host binding
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]