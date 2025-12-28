from datetime import datetime
from typing import Dict, Any, Tuple
from .image_facade import ImageProcessingFacade

# Symulacja repozytoriów (w rzeczywistym kodzie zaimportuj je z folderu db)
# from backend.app.db.repositories import AccessLogRepository, EmployeeRepository

class AccessService:
    """
    Logika biznesowa kontroli dostępu.
    Zgodna z diagramem sekwencyjnym UML.
    """
    
    def __init__(self):
        self.image_processor = ImageProcessingFacade()
        # self.log_repo = AccessLogRepository()  # Dependency Injection
        # self.employee_repo = EmployeeRepository()

    async def verify_entrance(self, qr_token: str, image_base64: str) -> Dict[str, Any]:
        """
        Główna metoda weryfikacji.
        Strategia Fail-Secure[cite: 206].
        """
        
        # Etap 1: Weryfikacja QR (Fail-Fast) 
        # user = await self.employee_repo.get_by_qr(qr_token)
        
        # MOCK danych użytkownika na potrzeby przykładu
        user = self._mock_get_user_by_token(qr_token)

        if not user:
            # Odmowa bez analizy obrazu - oszczędność zasobów 
            await self._log_attempt(status="INVALID_QR", employee_id=None)
            return {
                "access_granted": False, 
                "error_code": "INVALID_QR", 
                "message": "Nieprawidłowy lub nieaktywny kod QR."
            }

        if user['qr_valid_until'] < datetime.now():
            await self._log_attempt(status="INVALID_QR", employee_id=user['id'])
            return {
                "access_granted": False, 
                "error_code": "EXPIRED_QR", 
                "message": "Przepustka wygasła."
            }

        # Etap 2: Przetwarzanie Obrazu [cite: 17]
        try:
            image_rgb = self.image_processor.decode_base64_to_image(image_base64)
            live_encoding = self.image_processor.generate_face_encoding(image_rgb)
        except ValueError:
            return {"access_granted": False, "error_code": "CAMERA_ERROR", "message": "Błąd danych wideo."}

        # Etap 3: Sprawdzenie czy twarz jest w kadrze 
        if live_encoding is None:
            await self._log_attempt(status="NO_FACE", employee_id=user['id'])
            return {
                "access_granted": False, 
                "error_code": "NO_FACE", 
                "message": "Nie wykryto twarzy. Spójrz w kamerę."
            }

        # Etap 4: Weryfikacja biometryczna 1:1 
        # Porównujemy tylko z wzorcem tego konkretnego użytkownika
        distance = self.image_processor.compare_faces(user['face_encoding'], live_encoding)
        
        # Próg akceptacji (np. dystans < 0.6 oznacza zgodność)
        # Confidence score można obliczyć jako (1 - distance)
        is_match = distance < 0.5 
        confidence = round(1.0 - distance, 2)

        if is_match:
            # SUKCES [cite: 198]
            await self._log_attempt(status="SUCCESS", employee_id=user['id'], confidence=confidence)
            return {
                "access_granted": True,
                "message": f"Witaj, {user['full_name']}",
                "confidence_score": confidence,
                "door_unlock_duration_ms": 5000
            }
        else:
            # PORAŻKA BIOMETRYCZNA [cite: 56]
            await self._log_attempt(status="FACE_MISMATCH", employee_id=user['id'], confidence=confidence)
            return {
                "access_granted": False,
                "error_code": "FACE_MISMATCH",
                "message": "Weryfikacja biometryczna nie powiodła się."
            }

    async def _log_attempt(self, status: str, employee_id: Optional[int], confidence: float = 0.0):
        """
        Zapisuje próbę wejścia do bazy AccessLogs[cite: 14].
        """
        print(f"[DB LOG] Status: {status}, UserID: {employee_id}, Conf: {confidence}")
        # await self.log_repo.create(...)

    def _mock_get_user_by_token(self, token):
        """Pomocnicza funkcja mockująca bazę danych."""
        if token == "valid_token_123":
            return {
                "id": 1,
                "full_name": "Jan Kowalski",
                "qr_valid_until": datetime(2030, 1, 1),
                # Przykładowy wektor (mock)
                "face_encoding": [-0.1] * 128 
            }
        return None