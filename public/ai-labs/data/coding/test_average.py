"""Run in a copied sandbox: python3 -B -m unittest -v test_average.py."""
import unittest

from average import average


class AverageContract(unittest.TestCase):
    def test_fraction(self):
        self.assertEqual(average([1, 2]), 1.5)

    def test_negative(self):
        self.assertEqual(average([-2, -1]), -1.5)

    def test_empty(self):
        self.assertIsNone(average([]))

    def test_single(self):
        self.assertEqual(average([7]), 7)


if __name__ == "__main__":
    unittest.main()
