FROM python:3.11

WORKDIR /app

# Install system dependencies (if you need libgl1)
RUN apt-get update && apt-get install -y libgl1

# Copy only requirements first
COPY requirements.txt .

# Force reinstall all dependencies
RUN pip install --no-cache-dir --force-reinstall -r requirements.txt

# Copy all source files
COPY . .

CMD ["python", "app.py"]
