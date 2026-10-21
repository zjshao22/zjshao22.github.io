"""Teacher reference; inspect only after predicting and repairing the baseline."""


def average(values):
    if not values:
        return None
    return sum(values) / len(values)
