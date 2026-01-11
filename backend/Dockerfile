FROM python:3.10-slim

RUN apt-get update && apt-get install -y cmake build-essential ...

WORKDIR /app #creates /app directory in the container and there execute following commands

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .    #Copy the code

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] #Start the app with host binding