from core.database_manager import DatabaseManager
from core.exporter import ExcelExporter
import sqlite3

class Productos:
    def __init__(self):
        try:
            self.db = DatabaseManager()
        except sqlite3.Error as e:
            print(f"Error crítico al conectar con la base de datos: {e}")
            raise # Detener la app si no hay DB

    def registrar_producto(self, nombre, precio, stock):
        """Busca por nombre: si existe actualiza, si no, registra."""
        query_buscar = "SELECT id FROM productos WHERE nombre = ?"
    
        try:
            with self.db._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query_buscar, (nombre,))
                producto_existente = cursor.fetchone()

                if producto_existente:
                    # Caso A: El nombre ya existe, procedemos a ACTUALIZAR
                    id_existente = producto_existente[0]
                    return self.modificar_producto(id_existente, nombre, precio, stock)
                else:
                # Caso B: El nombre es nuevo, procedemos a INSERTAR
                    query_insert = "INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)"
                    cursor.execute(query_insert, (nombre, precio, stock))
                    conn.commit()
                    return True, f"Producto '{nombre}' registrado con éxito."

        except sqlite3.Error as e:
            return False, f"Error de base de datos: {e}"

    def buscar_producto(self, termino_busqueda):
        query = """
            SELECT id, nombre, precio, stock 
            FROM productos 
            WHERE nombre LIKE ? OR id LIKE ?
        """
        busqueda_format = f"%{termino_busqueda}%"
        
        try:
            resultados = self.db.fetch_all(query, (busqueda_format, busqueda_format))
            
            # Convierte tuplas a diccionarios...
            productos = []
            for row in resultados:
                productos.append({'id': row[0], 'nombre': row[1], 'precio': row[2], 'stock': row[3]})
            return productos

        except sqlite3.OperationalError as e:
            print(f"Error técnico de acceso a DB: {e}")
            # Aquí podrías retornar un mensaje para la UI
            return "DATABASE_LOCKED" 
        except sqlite3.Error as e:
            print(f"Error general de SQL: {e}")
            return []

    def eliminar_producto_por_id(self, id_producto):
        """Elimina un producto por ID con manejo de restricciones."""
        query = "DELETE FROM productos WHERE id = ?"
        
        try:
            self.db.execute_query(query, (id_producto,))
            return True, "Producto eliminado correctamente."
        except sqlite3.Error as e:
            return False, f"Error al eliminar: {e}"
        
    def reponer_stock(self, id_producto, cantidad_a_sumar):
        """
        Suma una cantidad específica al stock actual de un producto.
        """
        if cantidad_a_sumar <= 0:
            return False, "La cantidad a reponer debe ser mayor a cero."

        query_update = "UPDATE productos SET stock = stock + ? WHERE id = ?"
        query_check = "SELECT id, nombre, stock FROM productos WHERE id = ?"
        
        try:
            with self.db._get_connection() as conn:
                cursor = conn.cursor()
                
                # 1. Verificar si el producto existe
                cursor.execute(query_check, (id_producto,))
                producto = cursor.fetchone()
                
                if not producto:
                    return False, f"Error: Producto con ID '{id_producto}' no encontrado."
                
                # 2. Actualizar el stock
                cursor.execute(query_update, (cantidad_a_sumar, id_producto))
                conn.commit()
                
                nuevo_stock = producto[2] + cantidad_a_sumar
                return True, f"Stock actualizado para '{producto[1]}'. Nuevo stock: {nuevo_stock}"
        
        except sqlite3.Error as e:
            return False, f"Error de base de datos: {e}"
        

    def modificar_producto(self, id_producto, nuevo_nombre, nuevo_precio, nuevo_stock):
        """
        Actualiza los datos de un producto existente.
        """
        query_update = """
            UPDATE productos 
            SET nombre = ?, precio = ?, stock = ? 
            WHERE id = ?
        """
        
        try:
            with self.db._get_connection() as conn:
                cursor = conn.cursor()
                
                # 1. Verificar si el producto existe
                cursor.execute("SELECT id FROM productos WHERE id = ?", (id_producto,))
                if not cursor.fetchone():
                    return False, f"Error: Producto con ID '{id_producto}' no encontrado."
                
                # 2. Verificar si el NUEVO nombre ya lo tiene otro producto
                cursor.execute("SELECT id FROM productos WHERE nombre = ? AND id != ?", (nuevo_nombre, id_producto))
                if cursor.fetchone():
                    return False, f"Error: Ya existe otro producto con el nombre '{nuevo_nombre}'."
                
                # 3. Actualizar
                cursor.execute(query_update, (nuevo_nombre, nuevo_precio, nuevo_stock, id_producto))
                conn.commit()
                
                return True, "Producto actualizado correctamente."
                
        except sqlite3.Error as e:
            return False, f"Error de base de datos: {e}"
        
    def cargar_productos(self):
        query = """
            SELECT * 
            FROM productos 
        """
        try:
            resultados = self.db.fetch_all(query)
            # Convierte tuplas a diccionarios...
            productos = []
            for row in resultados:
                productos.append({'id': row[0], 'nombre': row[1], 'precio': row[2], 'stock': row[3]})
            return productos

        except sqlite3.OperationalError as e:
            print(f"Error técnico de acceso a DB: {e}")
            # Aquí podrías retornar un mensaje para la UI
            return "DATABASE_LOCKED" 
        except sqlite3.Error as e:
            print(f"Error general de SQL: {e}")
            return []
        
    

    def realizar_venta(self, id_p, cant):
        """Registra venta y actualiza stock usando transacciones (atomicidad)."""
        try:
            # 1. Verificar stock actual
            cursor = self.db.execute_query("SELECT stock, precio FROM productos WHERE id = ?", (id_p,))
            result = cursor.fetchone()
            
            if not result:
                return False, "Producto no encontrado."
            
            stock_actual, precio = result
            if stock_actual < cant:
                return False, "Stock insuficiente."
            
            # 2. Calcular total y realizar la venta/actualización
            total = precio * cant
            
            # Usamos transacciones para asegurar que ambas cosas pasen o ninguna
            with self.db._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE productos SET stock = stock - ? WHERE id = ?", (cant, id_p))
                cursor.execute("INSERT INTO ventas (id_prod, cantidad, total) VALUES (?, ?, ?)", (id_p, cant, total))
                conn.commit()
            
            return True, "Venta realizada y stock actualizado."
        
        except sqlite3.Error as e:
            return False, f"Error en la operación de venta: {e}"