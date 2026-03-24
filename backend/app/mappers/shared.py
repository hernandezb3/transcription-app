import math
import pandas as pd
import numpy as np

class SharedMapper:
    def __init__(self):
        pass

    def _is_null_like(self,value):
        """Return True if value is any known null-like sentinel."""
        
        if value is None:
            return True

        # pandas NaT
        if value is pd.NaT:
            return True

        # numpy NaN
        if isinstance(value, (np.floating, float)) and np.isnan(value):
            return True

        # python NaN
        if isinstance(value, float) and math.isnan(value):
            return True

        return False


    def normalize_nulls(self,data):
        """
        Recursively normalize all null-like values to Python None.
        DOES NOT drop keys.
        Preserves full structure.
        """

        if isinstance(data, dict):
            return {
                key: self.normalize_nulls(value)
                for key, value in data.items()
            }

        elif isinstance(data, list):
            return [self.normalize_nulls(item) for item in data]

        else:
            return None if self._is_null_like(data) else data