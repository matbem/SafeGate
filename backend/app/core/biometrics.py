import cv2
import numpy as np
import face_recognition
from typing import Optional, List, Dict, Any
from config import settings
from loguru import logger

class BiometricsCore:
    """
    Core module for biometric processing.
    """

    def __init__(self):
        self.BLUR_THRESHOLD = settings.BLUR_THRESHOLD
        self.BRIGHTNESS_MIN = settings.BRIGHTNESS__MIN
        self.BRIGHTNESS_MAX = settings.BRIGHTNESS_MAX
        self.MATCH_TOLERANCE = settings.MATCH_TOLETANCE

        def check_image_quality(self, image_rgb: np.ndarray) -> Dict[str, Any]:
            """
            Checks image quality based on blur and brightness.
            Returns a dictionary with quality metrics.
            """
            logger.debug("Checking image quality")
            gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)

            blur = cv2.Laplacian(gray, cv2.CV_64F).var()
            if blur < self.BLUR_THRESHOLD:
                return {"valid": False, "error_message": "Image is too blurry."}
            
            brightness = np.mean(gray)
            if brightness < self.BRIGHTNESS_MIN:
                return {"valid": False, "error_message": "Image is too dark."}
            if brightness > self.BRIGHTNESS_MAX:
                return {"valid": False, "error_message": "Image is too bright."}
            
            return {"valid": True}
        def detect_liveness(self, image_rgb: np.ndarray) -> Dict[str, Any]:
            """
            Check if there is a face and it is big enough to be considered live.
            """
            logger.debug("Detecting liveness")
            locations = face_recognition.face_locations(image_rgb)
            if not locations:
                return {"valid": False, "error_message": "No face detected."}
            
            top, right, bottom, left = locations[0]
            face_area = (bottom - top) * (right - left)
            total_area = image_rgb.shapr[0] * image_rgb.shape[1]

            if face_area / total_area < 0.02:
                return {"valid": False, "error_message": "Face too small, possible spoofing."}
            
            return {"valid": True}
        
        def generate_face_encoding(self, image_rgb: np.ndarray) -> Optional[List[float]]:
            """
            Converts an RGB image to a 128-d face encoding vector.
            """
            logger.debug("Generating face encoding")
            locations = face_recognition.face_locations(image_rgb)
            if not locations:
                return None
            
            encodings = face_recognition.face_encodings(image_rgb, locations)
            return encodings[0].tolist() if encodings else None #0 index because it returns list of encoding arrays for all faces but we suppose that there is only one face
        
        def verify_face(self, known_embedding: List[float], candidate_embedding: List[float]) -> Dict[str, Any]:
            """Verifies if a candidate face matches a known face embedding."""
            logger.debug("Verifying face")
            known_np = np.array(known_embedding)
            candidate_np = np.array(candidate_embedding)

            distance = face_recognition.face_distance([known_np], candidate_np)
            distance = distance[0]  # Get the single distance value

            is_match = distance < self.MATCH_TOLERANCE
            confidence = max(0.0, 1.0 - distance)

            return {
                "is_match": is_match,
                "distance": distance,
                "confidence": round(confidence, 2)
            }      
