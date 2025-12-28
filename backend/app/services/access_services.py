import base64
import cv2
import numpy as np
import face_recognition
from typing import Optional, List, Any

class ImageProcessingFacade:
    """
    Realizacja wzorca Facade.
    Hermetyzuje złożoność bibliotek OpenCV i dlib/face_recognition.
    """

    @staticmethod
    def decode_base64_to_image(base64_string: str) -> np.ndarray:
        """
        Konwertuje ciąg Base64 na obraz w formacie OpenCV (BGR).
        Zgodne z wymaganiem konwersji klatki[cite: 17].
        """
        try:
            # Usuń nagłówek 'data:image/jpeg;base64,' jeśli istnieje
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            image_data = base64.b64decode(base64_string)
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Nie udało się zdekodować obrazu")
            
            # face_recognition wymaga RGB, OpenCV używa BGR
            return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        except Exception as e:
            raise ValueError(f"Błąd przetwarzania obrazu: {str(e)}")

    @staticmethod
    def detect_face_locations(image_rgb: np.ndarray) -> List:
        """
        Wykrywa lokalizację twarzy na obrazie.
        Potrzebne do sprawdzenia warunku 'Brak twarzy'.
        """
        return face_recognition.face_locations(image_rgb)

    @staticmethod
    def generate_face_encoding(image_rgb: np.ndarray) -> Optional[List[float]]:
        """
        Tworzy wektor cech biometrycznych (128 liczb).
        Wykorzystywane do zapisu w bazie (Employees.face_encoding)[cite: 13].
        """
        locations = face_recognition.face_locations(image_rgb)
        if not locations:
            return None
        
        # Pobierz pierwszy znaleziony wektor (zakładamy jedną osobę przy wejściu)
        encodings = face_recognition.face_encodings(image_rgb, locations)
        if encodings:
            return encodings[0].tolist() # Konwersja numpy array na listę dla JSON
        return None

    @staticmethod
    def compare_faces(known_encoding: List[float], unknown_encoding: List[float], tolerance: float = 0.6) -> float:
        """
        Porównuje dwa wektory twarzy.
        Zwraca dystans (im mniejszy, tym większe podobieństwo).
        Realizuje logikę silnika biometrycznego[cite: 32].
        """
        known_np = np.array(known_encoding)
        unknown_np = np.array(unknown_encoding)
        
        # Obliczenie dystansu euklidesowego
        distance = face_recognition.face_distance([known_np], unknown_np)[0]
        return distance