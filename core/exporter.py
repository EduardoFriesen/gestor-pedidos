import pandas as pd

class ExcelExporter:
    @staticmethod
    def to_excel(data, columns, filename):
        """Convierte una lista de tuplas de SQLite a un archivo Excel"""
        df = pd.DataFrame(data, columns=columns)
        df.to_excel(f"assets/data/{filename}.xlsx", index=False)
        return True