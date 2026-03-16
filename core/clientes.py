from core.database_manager import DatabaseManager
import sqlite3

class Clientes:
    def __init__(self):
        try:
            self.db = DatabaseManager()
        except sqlite3.Error as e:
            print(f"Error crítico al conectar con la base de datos: {e}")
            raise # Detener la app si no hay DB
    
    def registrar_cliente(self, nombre, apellido, dni, nacimiento, telefono, contacto, deudor, telefono_contacto, observaciones, relacion, fecha_ficha):
        # 1. Verificar si el DNI ya existe
        query_check_dni = "SELECT 1 FROM clientes WHERE dni = ?"
        try:
            with self.db._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query_check_dni, (dni,))
                if cursor.fetchone():
                    return False, f"Error: Ya existe un cliente con el DNI '{dni}'."

            # 2. Insertar con todos los campos
            query_insert = """
                INSERT INTO clientes 
                (dni, nombre, apellido, fecha_nacimiento, telefono, contacto, relacion, telefono_contacto, deudor, observaciones, fecha_ficha) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            self.db.execute_query(query_insert, (dni, nombre, apellido, nacimiento, telefono, contacto, relacion, telefono_contacto, deudor, observaciones, fecha_ficha))
            return True, "Cliente registrado correctamente."
        except sqlite3.Error as e:
            return False, f"Error de base de datos: {e}"
        
    def cargar_clientes(self):
        # Seleccionamos TODOS los campos
        query = "SELECT nombre, apellido, dni, fecha_nacimiento, fecha_ficha, telefono, contacto, relacion, telefono_contacto, deudor, observaciones FROM clientes"
        try:
            resultados = self.db.fetch_all(query)
            clientes = []
            for row in resultados:
                clientes.append({
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
            return clientes
        except sqlite3.Error as e:
            print(f"Error al cargar de clientes: {e}")
            return []

    def buscar_cliente(self, termino):
        # Seleccionamos TODOS los campos también en la búsqueda
        query = """
            SELECT nombre, apellido, dni, fecha_nacimiento, fecha_ficha, telefono, contacto, relacion, telefono_contacto, deudor, observaciones
            FROM clientes 
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
    
    def eliminar_cliente(self, dni):
        query = "DELETE FROM clientes WHERE dni = ?"
        try:
            self.db.execute_query(query, (dni,))
            return True, "Cliente eliminado correctamente."
        except sqlite3.Error as e:
            return False, f"Error al eliminar: {e}"
        
    def modificar_cliente(self, dni, nombre, apellido, nacimiento, telefono, contacto, relacion, telefono_contacto, observaciones, fecha_ficha):
        # Actualizamos todos los campos editables
        query_update = """
            UPDATE clientes 
            SET nombre = ?, apellido = ?, fecha_nacimiento = ?, 
                telefono = ?, contacto = ?, relacion = ?, 
                telefono_contacto = ?, observaciones = ?, fecha_ficha = ?
            WHERE dni = ?
        """
        try:
            self.db.execute_query(query_update, (nombre, apellido, nacimiento, telefono, contacto, relacion, telefono_contacto, observaciones, fecha_ficha, dni))
            return True, "Cliente actualizado correctamente."
        except Exception as e:
            return False, f"Error de DB: {e}"