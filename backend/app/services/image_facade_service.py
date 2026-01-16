import base64
import cv2
import numpy as np
from app.core.biometrics import BiometricsCore
from loguru import logger
from typing import Tuple, Optional

class ImageProcessingFacade:
    """
    Facade for image processing tasks.
    """

    def __init__(self):
        self.biometrics_core = BiometricsCore()

    def decode_base64_image(self, image_base64: str) -> np.ndarray:
        """
        Decodes a base64 encoded image to a numpy array (RGB).
        """
        logger.debug("Decoding base64 image")

        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        np_arr = np.frombuffer(base64.b64decode(image_base64), np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    def generate_face_encoding(self, image_rgb: np.ndarray) -> Optional[list[float]]:
        """
        Generates a 128-d face encoding from an RGB image.
        """
        return self.biometrics_core.generate_face_encoding(image_rgb)
    
    def process_verification_request(self, image_base64: str, known_encoding: list) -> Tuple:
        """
        Orchestrates the image processing for verification.
        """
        try:

            logger.debug("Processing verification request")

            img = self.decode_base64_image(image_base64)

            quality_result = self.biometrics_core.check_image_quality(img)
            if not quality_result['valid']:
                return {"success": False, "status": "POOR_QUALITY", "error_message": quality_result['error_message']}
            
            liveness_result = self.biometrics_core.detect_liveness(img)
            if not liveness_result['valid']:
                return {"success": False, "status": "LIVENESS_FAILED", "error_message": liveness_result['error_message']}
            
            live_encoding = self.biometrics_core.generate_face_encoding(img)
            if live_encoding is None:
                return {"success": False, "status": "NO_FACE", "error_message": "No face detected in the image."}
            
            match = self.biometrics_core.verify_face(known_encoding, live_encoding)
            if match['is_match']:
                return {"success": True, "status": "VERIFIED", "confidence_score": match['confidence_score']}
            else:
                return {"success": False, "status": "NOT_MATCHED", "confidence_score": match['confidence_score']}
        
        except Exception as e:
            return {"success": False, "status": "ERROR", "error_message": str(e)}
