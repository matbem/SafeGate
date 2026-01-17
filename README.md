# SafeGate - Biometryczny System Kontroli Dostępu

SafeGate to system uwierzytelniania oparty na biometrii twarzy, wykorzystujący architekturę mikroserwisową. System przetwarza obrazy w czasie rzeczywistym, generuje 128-wymiarowe wektory cech (embeddings) i porównuje je z bazą danych przy użyciu operacji wektorowych.

## Architektura Systemu

Projekt składa się z trzech głównych kontenerów orkiestrowanych przez Docker Compose:

1.  **Backend (FastAPI)**: REST API, obsługa logiki biznesowej, przetwarzanie obrazu (OpenCV) i generowanie embeddingów.
2.  **Frontend (React + Vite)**: Interfejs użytkownika dla pracowników (kiosk) oraz panel administracyjny.
3.  **Baza Danych (PostgreSQL + pgvector)**: Przechowywanie danych użytkowników oraz wektorów twarzy z możliwością wyszukiwania po podobieństwie.

## Technologie

### Backend
* **Framework**: FastAPI (asynchroniczne API).
* **Computer Vision**: `opencv-python-headless`, `face-recognition` (wrapper na dlib C++).
* **Baza Danych**: SQLAlchemy (ORM) + `asyncpg` (driver asynchroniczny).
* **Bezpieczeństwo**: OAuth2 z tokenami JWT (`python-jose`, `passlib`).
* **Wektoryzacja**: `pgvector`.

### Frontend
* **Framework**: React 19 (z Vite).
* **Styling**: TailwindCSS.
* **Komponenty**: `react-webcam` (przechwytywanie obrazu), `lucide-react` (ikony).
* **Język**: TypeScript.

### Baza Danych
* **Silnik**: PostgreSQL 16.
* **Rozszerzenie**: `pgvector` – umożliwia przechowywanie i indeksowanie wektorów (embeddingów) bezpośrednio w SQL.



## Instalacja i Uruchomienie

Wymagany jest **Docker** oraz **Docker Compose**.

1. **Sklonuj repozytorium:**
   ```bash
   git clone <repository-url>
   cd SafeGate-mbem
   ```

2.  **Uruchom środowisko:**
    ```bash
    docker-compose up --build
    ```

3.  **Dostęp do usług:**
    * **Frontend**: http://localhost:3000
    * **Backend API Docs**: http://localhost:8000/docs
    * **Baza danych**: Port 5432


## Struktura Projektu

```text
SafeGate-mbem/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpointy (Routes)
│   │   ├── core/         # Logika biznesowa (Biometria, Config)
│   │   ├── db/           # Modele ORM, Repozytoria, Sesja
│   │   ├── schemas/      # Modele Pydantic (DTO)
│   │   └── services/     # Warstwa serwisowa
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── Pages/        # Widoki (Admin, User)
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
