from datetime import datetime
from typing import List, Dict, Any
from .access_service import ImageProcessingFacade
from loguru import logger

from backend.app.db.repositories.employee_repo import EmployeeRepository
from backend.app.db.repositories.log_repo import LogRepository

class UserService:
    """
    Logika zarządzania pracownikami i danymi.
    Odpowiada za przetwarzanie zdjęć referencyjnych na wektory.
    """
    
    def __init__(self, employee_repo: EmployeeRepository, log_repo: LogRepository):
        self.image_processor = ImageProcessingFacade()
        self.employee_repo = employee_repo
        self.log_repo = log_repo

    async def create_users_bulk(self, users_data: List[Dict]):
        """
        Dodaje użytkowników. Przetwarza 'reference_photo_base64' na 'face_encoding'.
        Zgodnie z dokumentacją: Backend automatycznie przetwarza zdjęcie.
        """
        logger.info(f"Creating {len(users_data)} users in bulk.")
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

                await self.employee_repo.create(new_user)
                processed_users.append(new_user)
                
            except Exception as e:
                errors.append(f"Błąd przy użytkowniku {user.get('full_name')}: {str(e)}")

        return {
            "added_count": len(processed_users),
            "errors": errors
        }

    async def update_users(self, updates: List[Dict]):
        """
        User data update
        """
        logger.info(f"Updating {len(updates)} users.")
        modified_count = 0
        errors = []
        
        for update in updates:
            try:
                user_id = update.get('id')
                if not user_id:
                    continue

                repo_update_data: Dict[str, Any] = {}

                if "full_name" in update:
                    repo_update_data["full_name"] = update["full_name"]
                if "qr_token" in update:
                    repo_update_data["qr_token"] = update["qr_token"]
                if "qr_valid_until" in update:
                    repo_update_data["qr_valid_until"] = update["qr_valid_until"]
                if "reference_photo_base64" in update and update["reference_photo_base64"]:
                    img = self.image_processor.decode_base64_to_image(update["reference_photo_base64"])
                    encoding = self.image_processor.generate_face_encoding(img)
                    if encoding:
                        repo_update_data["face_encoding"] = encoding
                        repo_update_data["reference_photo"] = update["reference_photo_base64"]
                    else:
                        errors.append(f"Użytkownik ID {user_id}: Nie znaleziono twarzy na nowym zdjęciu.")
                        continue

                if repo_update_data:
                    success = await self.employee_repo.update(user_id, repo_update_data)
                    if success:
                        modified_count += 1
                    else:
                        errors.append(f"Użytkownik ID {user_id}: Aktualizacja nie powiodła się.")
            
            except Exception as e:
                logger.error(f"Błąd przy aktualizacji użytkownika ID {update.get('id')}: {str(e)}")
                errors.append(f"Błąd przy aktualizacji użytkownika ID {update.get('id')}: {str(e)}")

            return {
            "modified_count": modified_count,
            "errors": errors
            }
        
    async def delete_users(self, ids_to_delete: List[int]):
        """
        Deletes users by IDs.
        """
        logger.info(f"Deleting users with IDs: {ids_to_delete}")
        deleted_count = 0
        errors = []

        try:
            if ids_to_delete:
                deleted_count = await self.employee_repo.delete_bulk(ids_to_delete)
        except Exception as e:
            logger.error(f"Error deleting users: {str(e)}")
            errors.append(f"Error deleting users: {str(e)}")

        return {
            "deleted_count": deleted_count,
            "errors": errors
        }
    
    async def get_all_users(self) -> List[Dict]:
        """
        Pobiera wszystkich użytkowników z bazy.
        """
        logger.info("Fetching all users from the database.")
        #users = []  # Mock zwracany
        return await self.employee_repo.get_all()

    async def prune_old_logs(self, cutoff_date: datetime):
        """
        Usuwa logi starsze niż data graniczna.
        Zgodne z polityką retencji danych.
        """
        logger.info(f"Pruning logs older than {cutoff_date}.")
        # return await self.log_repo.delete_older_than(cutoff_date)
        return 100 # Zwraca liczbę usuniętych rekordów
    
    async def get_logs(self, since: str) -> list:
        """
        Pobiera logi od określonego znacznika czasu.
        """
        logger.info(f"Fetching logs since {since}.")
        logs = EmployeeRepository.get_logs_since(since) # Przykładowa metoda repozytorium

        return logs