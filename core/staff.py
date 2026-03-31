from core.database_manager import DatabaseManager
import sqlite3

class Staffs:
    def __init__(self):
        try:
            self.db = DatabaseManager()
        except sqlite3.Error as e:
            print(f"Error crítico al conectar con la base de datos: {e}")
            raise # Detener la app si no hay DB
    
    def registrar_staff(self, nombre, apellido, dni, nacimiento, telefono, sueldo):
        # 1. Verificar si el DNI ya existe
        query_check_dni = "SELECT 1 FROM staff WHERE dni = ?"
        try:
            with self.db._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query_check_dni, (dni,))
                if cursor.fetchone():
                    return False, f"Error: Ya existe un staff con el DNI '{dni}'."

            # 2. Insertar con todos los campos
            query_insert = """
                INSERT INTO staffs 
                (dni, nombre, apellido, fecha_nacimiento, telefono, sueldo, fecha_ingreso, horas) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
            self.db.execute_query(query_insert, (dni, nombre, apellido, nacimiento, telefono, sueldo))
            return True, "staff registrado correctamente."
        except sqlite3.Error as e:
            return False, f"Error de base de datos: {e}"
        
    def cargar_staffs(self):
        # Seleccionamos TODOS los campos
        query = "SELECT nombre, apellido, dni, fecha_nacimiento, fecha_ficha, telefono, contacto, relacion, telefono_contacto, deudor, observaciones FROM staffs"
        try:
            resultados = self.db.fetch_all(query)
            staffs = []
            for row in resultados:
                staffs.append({
                    'nombre': row[0],
                    'apellido': row[1],
                    'dni': row[2],
                    'cumpleanios': row[3], # Lo dejamos como 'cumpleanios' para que la vista lo lea bien
                    'fecha_ficha': row[4],
                    'telefono': row[5],
                    'contacto': row[6],
                    'relacion': row[7],
                    'telefono_contacto': row[8],
                    'deudor': row[9],
                    'observaciones': row[10]
                })
            return staffs
        except sqlite3.Error as e:
            print(f"Error al cargar de staffs: {e}")
            return []

    def buscar_staff(self, termino):
        # Seleccionamos TODOS los campos también en la búsqueda
        query = """
            SELECT nombre, apellido, dni, fecha_nacimiento, fecha_ficha, telefono, contacto, relacion, telefono_contacto, deudor, observaciones
            FROM staffs 
            WHERE dni LIKE ? OR nombre LIKE ? OR apellido LIKE ?
        """
        busqueda = f"%{termino}%"
        try:
            resultados = self.db.fetch_all(query, (busqueda, busqueda, busqueda))
            return [{
                'nombre': r[0], 
                'apellido': r[1], 
                'dni': r[2], 
                'cumpleanios': r[3],
                'fecha_ficha': r[4],
                'telefono': r[5],
                'contacto': r[6],
                'relacion': r[7],
                'telefono_contacto': r[8],
                'deudor': r[9],
                'observaciones': r[10]
            } for r in resultados]
        except Exception as e:
            print(f"Error: {e}")
            return []
    
    def eliminar_staff(self, dni):
        query = "DELETE FROM staffs WHERE dni = ?"
        try:
            self.db.execute_query(query, (dni,))
            return True, "staff eliminado correctamente."
        except sqlite3.Error as e:
            return False, f"Error al eliminar: {e}"
        
    def modificar_staff(self, dni, nombre, apellido, nacimiento, telefono, contacto, relacion, telefono_contacto, observaciones, fecha_ficha):
        # Actualizamos todos los campos editables
        query_update = """
            UPDATE staffs 
            SET nombre = ?, apellido = ?, fecha_nacimiento = ?, 
                telefono = ?, contacto = ?, relacion = ?, 
                telefono_contacto = ?, observaciones = ?, fecha_ficha = ?
            WHERE dni = ?
        """
        try:
            self.db.execute_query(query_update, (nombre, apellido, nacimiento, telefono, contacto, relacion, telefono_contacto, observaciones, fecha_ficha, dni))
            return True, "staff actualizado correctamente."
        except Exception as e:
            return False, f"Error de DB: {e}"