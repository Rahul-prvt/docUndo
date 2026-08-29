"""Tests for distance calculations"""

import pytest
from app.services.distance import haversine_distance


def test_haversine_zero_distance():
    """Same point should return 0 distance"""
    distance = haversine_distance(10.0, 20.0, 10.0, 20.0)
    assert abs(distance) < 0.001


def test_haversine_known_distance():
    """Test with known distance between two points"""
    # Palakkad (10.7860, 76.6444) to Thrissur (10.5276, 76.2144)
    # Real haversine distance is about 55 km.
    distance = haversine_distance(10.7860, 76.6444, 10.5276, 76.2144)
    assert 50 < distance < 60


def test_haversine_symmetry():
    """Distance A->B should equal B->A"""
    distance_ab = haversine_distance(10.0, 20.0, 11.0, 21.0)
    distance_ba = haversine_distance(11.0, 21.0, 10.0, 20.0)
    assert abs(distance_ab - distance_ba) < 0.001
