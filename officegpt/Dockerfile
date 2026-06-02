FROM python:3.11

WORKDIR /app

COPY requirements-docker.txt .

RUN python -m pip install --upgrade pip


RUN pip install --default-timeout=1000 -r requirements-docker.txt

COPY . .

EXPOSE 7000

CMD ["python", "-m", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "7000"]