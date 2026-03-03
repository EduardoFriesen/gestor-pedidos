from core.database_manager import DatabaseManager
import sqlite3

class Profesores:
    def __init__(self):
        try:
            self.db = DatabaseManager()
        except sqlite3.Error as e:
            print(f"Error crítico al conectar con la base de datos: {e}")
            
    
    def registrar_profesor(self, nombre, apellido, dni, nacimiento_str):
        query_check_dni = "SELECT 1 FROM profesores WHERE dni = ?"
        try:
            with self.db._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query_check_dni, (dni,))
                if cursor.fetchone():
                    return False, f"Error: Ya existe un profesor con el dni '{dni}'."

            query_insert = "INSERT INTO profesores (dni, nombre, apellido, fecha_nacimiento) VALUES (?, ?, ?, ?)"
            self.db.execute_query(query_insert, (dni, nombre, apellido, nacimiento_str))
            return True, "Profesor registrado correctamente."
        except sqlite3.Error as e:
            return False, f"Error de base de datos: {e}"
        
    def cargar_profesores(self):
        query = "SELECT nombre, apellido, dni, fecha_nacimiento FROM profesores"
        try:
            resultados = self.db.fetch_all(query)
            profesores = []
            for row in resultados:
                profesores.append({
                    'nombre': row[0],
                    'apellido': row[1],
                    'dni': row[2],
                    'cumpleanios': row[3]
                })
            return profesores
        except sqlite3.Error as e:
            print(f"Error al cargar de profesores: {e}")
            return []

    def buscar_profesor(self, termino):
        query = """
            SELECT nombre, apellido, dni, fecha_nacimiento 
            FROM profesores 
            WHERE dni LIKE ? OR nombre LIKE ? OR apellido LIKE ?
        """
        busqueda = f"%{termino}%"
        try:
            resultados = self.db.fetch_all(query, (busqueda, busqueda, busqueda))
            return [{
                'nombre': r[0], 
                'apellido': r[1], 
                'dni': r[2], 
                'cumpleanios': r[3]
            } for r in resultados]
        except Exception as e:
            print(f"Error: {e}")
            return []
    
    def eliminar_profesor(self, dni):
        query = "DELETE FROM profesores WHERE dni = ?"
        
        try:
            self.db.execute_query(query, (dni,))
            return True, "profesor eliminado correctamente."
        except sqlite3.Error as e:
            return False, f"Error al eliminar: {e}"
        
    def modificar_profesor(self, dni, nombre, apellido, nacimiento_str):
        query_update = """
            UPDATE profesores 
            SET nombre = ?, apellido = ?, fecha_nacimiento = ? 
            WHERE dni = ?
        """
        try:
            self.db.execute_query(query_update, (nombre, apellido, nacimiento_str, dni))
            return True, "Profesor actualizado correctamente."
        except Exception as e:
            return False, f"Error de DB: {e}"
    
    

