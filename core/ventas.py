# core/ventas.py
import sqlite3

class Ventas:
    def __init__(self, db_manager):
        self.db = db_manager

    def obtener_productos_con_stock(self):
        """Retorna productos que pueden venderse."""
        query = "SELECT id, nombre, precio, stock FROM productos WHERE stock > 0"
        return self.db.fetch_all(query)

    def registrar_venta_producto(self, producto_id, nombre_prod, monto_unitario, cantidad, metodo_pago):
        try:
            monto_total = monto_unitario * cantidad
            concepto = f"Venta: {nombre_prod} (x{cantidad})"

            # 1. Registrar el movimiento en ventas con el monto total
            query_venta = """
                INSERT INTO ventas (concepto, categoria, monto, metodo_pago) 
                VALUES (?, 'Producto', ?, ?)
            """
            self.db.execute_query(query_venta, (concepto, monto_total, metodo_pago))

            # 2. Descontar la cantidad vendida del stock
            query_stock = "UPDATE productos SET stock = stock - ? WHERE id = ?"
            self.db.execute_query(query_stock, (cantidad, producto_id))
            
            return True, "Venta registrada"
        except Exception as e:
            return False, f"Error: {e}"
    def obtener_ventas_hoy(self, filtro=""):
        """Retorna las ventas del día actual filtradas."""
        query = """
            SELECT concepto, monto, categoria, metodo_pago, strftime('%H:%M', fecha_hora) 
            FROM ventas 
            WHERE date(fecha_hora) = date('now', 'localtime')
        """
        params = []
        if filtro:
            query += " AND (concepto LIKE ? OR metodo_pago LIKE ?)"
            params = (f"%{filtro}%", f"%{filtro}%")
        
        query += " ORDER BY id DESC"
        return self.db.fetch_all(query, params)

    def obtener_totales_hoy(self):
        """Calcula el total recaudado hoy."""
        query = "SELECT SUM(monto) FROM ventas WHERE date(fecha_hora) = date('now', 'localtime')"
        resultado = self.db.fetch_all(query)
        return resultado[0][0] if resultado[0][0] else 0