from core.database_manager import DatabaseManager
import sqlite3

class TipoPase:
    def __init__(self):
        try:
            self.db = DatabaseManager()
            self._crear_tabla() # Nos aseguramos de que la tabla exista
        except sqlite3.Error as e:
            print(f"Error en TipoPase: {e}")

    def _crear_tabla(self):
        """Crea la tabla de tipos de pases si no existe."""
        query = """
            CREATE TABLE IF NOT EXISTS tipos_pases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                precio REAL,
                cantidad_sesiones INTEGER,
                con_profesor INTEGER -- 1 para SÍ, 0 para NO
            )
        """
        self.db.execute_query(query)

    def crear_tipo_pase(self, nombre, precio, sesiones, con_profe):
        """Registra una nueva oferta de pase (ej: Pack 10 clases)."""
        query = """
            INSERT INTO tipos_pases (nombre, precio, cantidad_sesiones, con_profesor) 
            VALUES (?, ?, ?, ?)
        """
        try:
            self.db.execute_query(query, (nombre, precio, sesiones, con_profe))
            return True, f"Plan '{nombre}' creado con éxito."
        except sqlite3.IntegrityError:
            return False, "Error: Ya existe un plan con ese nombre."
        except Exception as e:
            return False, f"Error de DB: {e}"

    def modificar_tipo_pase(self, id_plan, nombre, precio, sesiones, con_profe):
        """Modifica los datos de un plan existente."""
        query = """
            UPDATE tipos_pases 
            SET nombre = ?, precio = ?, cantidad_sesiones = ?, con_profesor = ? 
            WHERE id = ?
        """
        try:
            self.db.execute_query(query, (nombre, precio, sesiones, con_profe, id_plan))
            return True, "Plan actualizado correctamente."
        except sqlite3.IntegrityError:
            return False, "Error: Ya existe otro plan con ese nombre."
        except Exception as e:
            return False, f"Error al actualizar: {e}"

    def obtener_todos(self):
        """Retorna todos los planes para llenar los selectores de la IU."""
        query = "SELECT id, nombre, precio, cantidad_sesiones, con_profesor FROM tipos_pases"
        try:
            resultados = self.db.fetch_all(query)
            # Convertimos a lista de diccionarios para que sea fácil de leer en la IU
            return [{
                'id': r[0],
                'nombre': r[1],
                'precio': r[2],
                'cantidad_sesiones': r[3],
                'con_profesor': r[4]
            } for r in resultados]
        except Exception as e:
            print(f"Error al cargar planes: {e}")
            return []

    def eliminar_tipo_pase(self, id_pase):
        """Elimina un plan, verificando estrictamente que no esté en uso por clientes."""
        # 1. REGLA DE SEGURIDAD: Comprobamos si hay pases vendidos de este tipo
        check_query = "SELECT id FROM pases_clientes WHERE id_tipo_pase = ?"
        try:
            en_uso = self.db.fetch_all(check_query, (id_pase,))
            if en_uso:
                return False, "⚠️ No puedes eliminar este plan porque hay clientes que lo tienen asignado. Si ya no lo usas, modifícale el nombre (Ej: 'Obsoleto - Plan Viejo')."
            
            # 2. Si está libre, lo borramos
            query = "DELETE FROM tipos_pases WHERE id = ?"
            self.db.execute_query(query, (id_pase,))
            return True, "Plan eliminado correctamente."
        except Exception as e:
            return False, f"No se pudo eliminar el plan: {e}"