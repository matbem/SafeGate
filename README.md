# SafeGate - Biometryczny System Kontroli Dostępu

SafeGate to zaawansowany system uwierzytelniania oparty na biometrii twarzy, wykorzystujący architekturę mikroserwisową. System przetwarza obrazy w czasie rzeczywistym, generuje 128-wymiarowe wektory cech (embeddings) i wykonuje operacje na przestrzeniach wektorowych w celu precyzyjnej identyfikacji osób.

## Architektura Systemu

Projekt jest w pełni zonteneryzowany i orkiestrowany przez Docker Compose, co zapewnia izolację warstw logicznych:

1.  **Backend (FastAPI)**: Wysokowydajne asynchroniczne API obsługujące logikę biznesową, przetwarzanie potokowe obrazu (OpenCV) oraz ekstrakcję cech biometrycznych.
2.  **Frontend (React + Vite)**: Interfejs użytkownika typu SPA działający jako kiosk do skanowania twarzy oraz panel administracyjny.
3.  **Baza Danych (PostgreSQL + pgvector)**: Relacyjna baza danych rozszerzona o obsługę typów wektorowych, co pozwala na wykonywanie zapytań typu „najbliższy sąsiad” (Nearest Neighbor) bezpośrednio w silniku SQL.

## Struktura Projektu

Zaktualizowane drzewo katalogów uwzględniające pełną strukturę warstwową backendu oraz konfigurację frontendu:

```text
SafeGate-szczepan/
├── backend/
│   ├── app/
│   │   ├── api/                # Warstwa dostępu (Endpointy i zależności)
│   │   │   ├── v1/             # Wersjonowanie API (access.py, admin.py, auth.py)
│   │   │   └── deps.py         # Zależności FastAPI (DI)
│   │   ├── core/               # Rdzeń systemu
│   │   │   ├── biometrics.py   # Algorytmy dlib i przetwarzanie obrazu
│   │   │   ├── config.py       # Zarządzanie zmiennymi środowiskowymi
│   │   │   └── security.py     # Logika JWT i haszowanie haseł
│   │   ├── db/                 # Warstwa danych
│   │   │   ├── repositories/   # Wzorzec Repository (admin, employee, log)
│   │   │   ├── models.py       # Modele SQLAlchemy
│   │   │   ├── session.py      # Konfiguracja asynchronicznej sesji DB
│   │   │   └── init.sql        # Skrypt inicjalizacyjny bazy danych
│   │   ├── schemas/            # Modele Pydantic (Walidacja DTO)
│   │   └── services/           # Warstwa logiki biznesowej (Serwisy)
│   ├── tests/                  # Testy jednostkowe i integracyjne
│   ├── Dockerfile              # Definicja kontenera backendu
│   ├── main.py                 # Punkt wejścia aplikacji FastAPI
│   └── requirements.txt        # Zależności produkcyjne
├── frontend/
│   ├── src/
│   │   ├── Pages/              # Widoki (AdminPage.tsx, UserPage.tsx)
│   │   ├── api.ts              # Klient API (Axios)
│   │   ├── types.ts            # Definicje typów TypeScript
│   │   └── main.tsx            # Punkt wejścia React
│   ├── public/
│   │   └── docs/               # Wygenerowana dokumentacja techniczna
│   ├── Dockerfile              # Definicja kontenera frontendu
│   ├── package.json            # Zależności i skrypty npm
│   ├── tailwind.config.js      # Konfiguracja warstwy wizualnej
│   └── vite.config.ts          # Konfiguracja bundlera Vite
├── docker-compose.yml          # Orkiestracja usług (db, backend, frontend)
└── README.md                   # Dokumentacja główna
```
### Backend & AI
* **Framework:** FastAPI (standard ASGI) z pełną obsługą asynchroniczności (async/await).
* **Computer Vision:** Wykorzystanie biblioteki `face-recognition`. System generuje 128-wymiarowe zakodowania twarzy.
* **Baza Danych:** SQLAlchemy (ORM) wraz z asynchronicznym driverem `asyncpg`.
* **Zarządzanie sesją:** Bezpieczeństwo oparte na standardzie OAuth2 z tokenami JWT.

### Frontend
* **React 19 & Vite:** Wykorzystanie najnowszej wersji biblioteki React dla optymalnego renderowania.
* **Biblioteki:** `jsQR` do obsługi kodów QR oraz `react-webcam` do dostępu do strumienia wideo.
* **Typowanie:** Ścisłe typowanie danych dzięki TypeScript.

## Instalacja i Uruchomienie

Wymagany jest **Docker** oraz **Docker Compose**.

1. **Sklonuj repozytorium:**
   ```bash
   git clone <repository-url>
   cd SafeGate
   ```

2. **Uruchom środowisko:**
    ```bash
    docker-compose up --build
    ```
3. **Dostęp do usług:**
- **Frontend:** http://localhost:3000
- **Dokumenctacja funkcji:** http://localhost:3000/docs/index.html
- **Backend API Docs:** http://localhost:8000/docs