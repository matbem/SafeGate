import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from .access_service import ImageProcessingFacade
from loguru import logger

from app.db.repositories.employee_repo import EmployeeRepository
from app.db.repositories.log_repo import LogRepository

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
        Creates users in bulk. 
        Automatically generates a UUID for 'qr_token' if it is missing.
        """
        logger.info(f"Creating {len(users_data)} users in bulk.")
        processed_users = []
        errors = []

        for user in users_data:
            try:
                encoding = None
                if user.get("reference_photo_base64"):
                    img = self.image_processor.decode_base64_image(user["reference_photo_base64"])
                    encoding = self.image_processor.generate_face_encoding(img)
                    
                    if not encoding:
                        errors.append(f"Użytkownik {user.get('full_name')}: Nie znaleziono twarzy na zdjęciu.")
                        continue
                
                qr_token = user.get("qr_token")
                if not qr_token or not qr_token.strip():
                    qr_token = str(uuid.uuid4())

                valid_until = user.get("qr_valid_until")
                if not valid_until:
                    valid_until = (datetime.now() + timedelta(days=90)).isoformat()

                new_user = {
                    "full_name": user["full_name"],
                    "qr_token": qr_token,
                    "qr_valid_until": valid_until,
                    "face_encoding": encoding,
                    "reference_photo": user.get("reference_photo_base64") # Opcjonalnie do podglądu
                }

                await self.employee_repo.create(new_user)
                processed_users.append(new_user)
                
            except Exception as e:
                logger.error(f"Error creating user {user.get('full_name')}: {str(e)}")
                errors.append(f"Error creating user {user.get('full_name')}: {str(e)}")

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
                    img = self.image_processor.decode_base64_image(update["reference_photo_base64"])
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
                        logger.error(f"Update failed for user ID {user_id}.")
                        errors.append(f"Update failed for user ID {user_id}.")
            
            except Exception as e:
                logger.error(f"Error updating user ID {update.get('id')}: {str(e)}")
                errors.append(f"Error updating user ID {update.get('id')}: {str(e)}")

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
        Gets all users from the database.
        """
        logger.info("Fetching all users from the database.")
        return await self.employee_repo.get_all()

    async def prune_old_logs(self, cutoff_date: datetime):
        """
        Removes logs older than the specified cutoff date.
        Compliant with data retention policy.
        """
        logger.info(f"Pruning logs older than {cutoff_date}.")
        try:
            deleted_count = await self.log_repo.delete_older_than(cutoff_date)
            return {
                "deleted_count": deleted_count,
                "errors": []
            }
        except Exception as e:
            logger.error(f"Error pruning logs: {str(e)}")
            return {
                "deleted_count": 0,
                "errors": [str(e)]
            }
    
    async def get_logs(self, since: str) -> list:
        """
        Gets logs from a specific timestamp.
        """
        logger.info(f"Fetching logs since {since}.")
        return await self.log_repo.get_logs_since(since)

    async def regenerate_qr_token(self, user_id: int, validity_days: int = 180) -> Dict[str, Any]:
        """
        Generates a new QR token for a user, invalidating the old one.
        Ensures atomicity via DB update.
        """
        new_token = str(uuid.uuid4())
        new_validity = datetime.now(timezone.utc) + timedelta(days=validity_days)
        
        update_data = {
            "qr_token": new_token,
            "qr_valid_until": new_validity
        }
        
        success = await self.employee_repo.update(user_id, update_data)
        
        if success:
            logger.info(f"Regenerated QR token for user ID: {user_id}. Valid until: {new_validity}")
            return {
                "success": True, 
                "new_qr_token": new_token, 
                "qr_valid_until": new_validity.isoformat()
            }
        
        logger.error(f"Failed to regenerate QR for user ID: {user_id} - user not found.")
        return {
            "success": False, 
            "errors": ["User not found or database update failed."]
        }