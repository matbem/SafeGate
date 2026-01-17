import pytest
import numpy as np
from unittest.mock import patch
from app.core.biometrics import BiometricsCore

class TestBiometricsBoundaries:
    
    @pytest.fixture
    def biometrics(self):
        # Mockujemy ustawienia
        with patch('app.core.biometrics.settings') as mock_settings:
            mock_settings.BLUR_THRESHOLD = 100.0
            mock_settings.BRIGHTNESS__MIN = 50.0 
            mock_settings.BRIGHTNESS_MAX = 200.0
            mock_settings.MATCH_TOLETANCE = 0.6
            return BiometricsCore()

    def test_brightness_lower_boundary(self, biometrics):
        """Sprawdza punkt graniczny jasności (49 vs 50)."""
        # Mockujemy cv2.Laplacian, aby pominąć test ostrości
        with patch('cv2.Laplacian') as mock_laplace:
            mock_laplace.return_value.var.return_value = 500.0
            
            # 1. Zbyt ciemny (49) -> FAIL
            dark_img = np.full((100, 100, 3), 49, dtype=np.uint8)
            result_fail = biometrics.check_image_quality(dark_img)
            assert result_fail['valid'] is False
            assert "too dark" in result_fail['error_message']

            # 2. Na granicy (50) -> PASS
            border_img = np.full((100, 100, 3), 50, dtype=np.uint8)
            result_pass = biometrics.check_image_quality(border_img)
            assert result_pass['valid'] is True

    @patch('app.core.biometrics.face_recognition')
    def test_liveness_partition_small_face(self, mock_face_rec, biometrics):
        """
        Partycja 1: Twarz za mała (< 4%).
        Symulacja: Obraz 1000x1000 (1mln px), Twarz 100x100 (10k px) = 1%.
        """
        fake_image = np.zeros((1000, 1000, 3), dtype=np.uint8)
        # face_locations = [(top, right, bottom, left)]
        mock_face_rec.face_locations.return_value = [(0, 100, 100, 0)] 
        
        result = biometrics.detect_liveness(fake_image)
        
        assert result['valid'] is False
        assert "Face too small" in result['error_message']

