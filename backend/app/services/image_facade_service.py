import base64
import cv2
import numpy as np
from app.core.biometrics import BiometricsCore
from loguru import logger
from typing import Tuple, Optional

class ImageProcessingFacade:
    """
    Facade for image processing tasks with Low-Light Enhancement logic.
    """

    def __init__(self):
        self.biometrics_core = BiometricsCore()

    def decode_base64_image(self, image_base64: str) -> np.ndarray:
        """
        Decodes a base64 encoded image to a numpy array (RGB).
        """
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
        
    def _apply_gamma_correction(self, image: np.ndarray, gamma: float = 1.5) -> np.ndarray:
        """
        Nieliniowa transformacja jasności.
        Dla gamma > 1.0 rozjaśnia cienie, zachowując detale w jasnych partiach.
        Wzór: O = I^(1/gamma) * 255
        """
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(image, table)

    def _apply_clahe(self, image: np.ndarray) -> np.ndarray:
        """
        CLAHE (Contrast Limited Adaptive Histogram Equalization).
        Konwertuje obraz do przestrzeni LAB, operuje tylko na kanale L (Luminancja),
        aby nie zepsuć informacji o kolorze (chrominancji).
        """
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        
        limg = cv2.merge((cl, a, b))
        return cv2.cvtColor(limg, cv2.COLOR_LAB2RGB)
    

    def process_verification_request(self, image_base64: str, known_encoding: list) -> Tuple:
        """
        Orchestrates the image processing for verification with Auto-Recovery for low light.
        """
        try:
            logger.debug("Processing verification request")
            original_img = self.decode_base64_image(image_base64)

            img_to_process = original_img
            
            live_encoding = self.biometrics_core.generate_face_encoding(img_to_process)

            if live_encoding is None:
                logger.warning("Face not detected on raw image. Attempting Signal Enhancement (CLAHE)...")
                
                enhanced_img = self._apply_clahe(original_img)
                live_encoding = self.biometrics_core.generate_face_encoding(enhanced_img)
                
                if live_encoding:
                     logger.success("Face detected after CLAHE enhancement.")

            if live_encoding is None:
                logger.warning("CLAHE failed. Attempting Gamma Correction...")
                
                gamma_img = self._apply_gamma_correction(original_img, gamma=1.5)
                live_encoding = self.biometrics_core.generate_face_encoding(gamma_img)
                
                if live_encoding:
                    logger.success("Face detected after Gamma Correction.")

            if live_encoding is None:
                return {"success": False, "status": "NO_FACE", "error_message": "No face detected even after image enhancement."}
            
            liveness_result = self.biometrics_core.detect_liveness(original_img)
            if not liveness_result['valid']:
                 return {"success": False, "status": "LIVENESS_FAILED", "error_message": liveness_result['error_message']}

            match = self.biometrics_core.verify_face(known_encoding, live_encoding)
            
            if match['is_match']:
                return {"success": True, "status": "VERIFIED", "confidence_score": match['confidence_score']}
            else:
                return {"success": False, "status": "NOT_MATCHED", "confidence_score": match['confidence_score']}
        
        except Exception as e:
            logger.error(f"Processing error: {str(e)}")
            return {"success": False, "status": "ERROR", "error_message": str(e)}