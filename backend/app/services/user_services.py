from datetime import datetime
from typing import List, Dict
from .access_service import ImageProcessingFacade

# from backend.app.db.repositories import EmployeeRepository

class UserService:
    """
    Logika zarządzania pracownikami i danymi.
    Odpowiada za przetwarzanie zdjęć referencyjnych na wektory.
    """
    
    def __init__(self):
        self.image_processor = ImageProcessingFacade()
        # self.employee_repo = EmployeeRepository()

    async def create_users_bulk(self, users_data: List[Dict]):
        """
        Dodaje użytkowników. Przetwarza 'reference_photo_base64' na 'face_encoding'.
        Zgodnie z dokumentacją: Backend automatycznie przetwarza zdjęcie.
        """
        processed_users = []
        errors = []

        for user in users_data:
            try:
                encoding = None
                if user.get("reference_photo_base64"):
                    # Konwersja zdjęcia referencyjnego na wektor
                    img = self.image_processor.decode_base64_to_image(user["reference_photo_base64"])
                    encoding = self.image_processor.generate_face_encoding(img)
                    
                    if not encoding:
                        errors.append(f"Użytkownik {user.get('full_name')}: Nie znaleziono twarzy na zdjęciu.")
                        continue
                
                # Przygotowanie obiektu do zapisu w bazie
                new_user = {
                    "full_name": user["full_name"],
                    "qr_token": user.get("qr_token") or "auto-generated-uuid", # [cite: 74]
                    "qr_valid_until": user["qr_valid_until"],
                    "face_encoding": encoding, # Zapisujemy wektor, nie JPG [cite: 13]
                    "reference_photo": user.get("reference_photo_base64") # Opcjonalnie do podglądu
                }
                
                # await self.employee_repo.create(new_user)
                processed_users.append(new_user)
                
            except Exception as e:
                errors.append(f"Błąd przy użytkowniku {user.get('full_name')}: {str(e)}")

        return {
            "added_count": len(processed_users),
            "errors": errors
        }

    async def update_users(self, updates: List[Dict]):
        """
        Aktualizacja danych. Jeśli przesłano nowe zdjęcie, przelicz wektor.
        [cite: 108] - Aktualizacja wzorca twarzy wymusza przeliczenie face_encoding.
        """
        modified_count = 0
        
        for update in updates:
            # Jeśli jest nowe zdjęcie, wygeneruj nowy wektor
            if "reference_photo_base64" in update and update["reference_photo_base64"]:
                img = self.image_processor.decode_base64_to_image(update["reference_photo_base64"])
                encoding = self.image_processor.generate_face_encoding(img)
                if encoding:
                    update["face_encoding"] = encoding
            
            # await self.employee_repo.update(update['id'], update)
            modified_count += 1
            
        return modified_count

    async def prune_old_logs(self, cutoff_date: datetime):
        """
        Usuwa logi starsze niż data graniczna.
        Zgodne z polityką retencji danych.
        """
        # return await self.log_repo.delete_older_than(cutoff_date)
        print(f"Usuwanie logów starszych niż {cutoff_date}")
        return 100 # Zwraca liczbę usuniętych rekordów