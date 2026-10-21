"""Student repair fixture: nonempty numeric lists -> mean; empty -> None.

This baseline is intentionally wrong. Keep its failing test output before repair.
"""


def average(values):
    return sum(values) // len(values)
