from core.database_manager import DatabaseManager
import sqlite3

class Clientes:
    def __init__(self):
        try:
            self.db = DatabaseManager()
        except sqlite3.Error as e:
            print(f"Error crítico al conectar con la base de datos: {e}")
            raise # Detener la app si no hay DB
    
    def registrar_cliente(self, nombre, apellido, dni, nacimiento):
    # 1. Verificar si el DNI ya existe
        query_check_dni = "SELECT 1 FROM clientes WHERE dni = ?"
    
        try:
            with self.db._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query_check_dni, (dni,))
                if cursor.fetchone():
                    return False, f"Error: Ya existe un cliente con el dni '{dni}'."

        # 2. CORRECCIÓN: Usar 'fecha_nacimiento' en lugar de 'nacimiento'
            query_insert = "INSERT INTO clientes (dni, nombre, apellido, fecha_nacimiento) VALUES (?, ?, ?, ?)"
            self.db.execute_query(query_insert, (dni, nombre, apellido, nacimiento))
        
            return True, "Cliente registrado correctamente."
        except sqlite3.Error as e:
            return False, f"Error de base de datos: {e}"
        
    def buscar_cliente(self, termino_busqueda):
        """
        Busca clientes por nombre, apellido, DNI o cumpleaños.
        """
        # La consulta busca coincidencias parciales (LIKE) en cualquiera de las columnas
        query = """
            SELECT id, nombre, apellido, dni, fecha_nacimiento 
            FROM clientes 
            WHERE nombre LIKE ? 
               OR apellido LIKE ? 
               OR dni LIKE ? 
               OR fecha_nacimiento LIKE ?
        """
        
        # Preparamos el término para búsquedas parciales
        busqueda_format = f"%{termino_busqueda}%"
        
        try:
            # Ejecutamos la consulta pasando el mismo término para cada campo
            resultados = self.db.fetch_all(query, (
                busqueda_format, 
                busqueda_format, 
                busqueda_format, 
                busqueda_format
            ))
            
            # Convertimos las tuplas de SQLite a una lista de diccionarios
            clientes = []
            for row in resultados:
                clientes.append({
                    'id': row[0],
                    'nombre': row[1],
                    'apellido': row[2],
                    'dni': row[3],
                    'cumpleanios': row[4] # fecha_nacimiento
                })
            return clientes
            
        except sqlite3.Error as e:
            print(f"Error en búsqueda de cliente: {e}")
            return [] # Retorna lista vacía si hay un error
        
    def eliminar_cliente(self, dni):
        query = "DELETE FROM clientes WHERE dni = ?"
        
        try:
            self.db.execute_query(query, (dni,))
            return True, "Cliente eliminado correctamente."
        except sqlite3.Error as e:
            return False, f"Error al eliminar: {e}"
        
def modificar_cliente(self, dni, nombre, apellido, nacimiento):
    # CORRECCIÓN: Usar 'fecha_nacimiento'
    query_update = """
        UPDATE clientes 
        SET nombre = ?, apellido = ?, fecha_nacimiento = ? 
        WHERE dni = ?
    """
    try:
        self.db.execute_query(query_update, (nombre, apellido, nacimiento, dni))
        return True, "Cliente actualizado correctamente."
    except sqlite3.Error as e:
        return False, f"Error de base de datos: {e}"
    
    

