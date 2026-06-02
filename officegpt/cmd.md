# OfficeGPT Backend Run Commands (Windows)

## 1. Go to project folder

```bash
cd officegpt
```

---

## 2. Create virtual environment

```bash
python -m venv .venv
```

---

## 3. Activate virtual environment

### Git Bash

```bash
source .venv/Scripts/activate
```

### PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

---

## 4. Install dependencies

```bash
python -m pip install -r requirements.txt
```

If some modules are missing:

```bash
pip install tinydb python-dotenv
pip install python-dotenv
```

---

## 5. Start backend server

```bash
PYTHONPATH=. python -m uvicorn backend.server:app --host 127.0.0.1 --port 7000
```

---

## 6. Backend URL

```txt
http://127.0.0.1:7000
```

---

## 7. Stop server

```bash
CTRL + C
```
