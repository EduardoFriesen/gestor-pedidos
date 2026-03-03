from core.database_manager import DatabaseManager
from datetime import datetime, timedelta
import sqlite3

class Pases:
    def __init__(self):
        self.db = DatabaseManager()

    def asignar_pase_a_cliente(self, dni_cliente, id_tipo_pase, dni_profesor=None):
        """Asigna un pase y registra automáticamente la venta en la contabilidad."""
        
        # 1. REGLA: Evitar duplicados del mismo tipo activos
        query_check = """
            SELECT id FROM pases_clientes 
            WHERE dni_cliente = ? AND id_tipo_pase = ? AND estado = 'Activo'
        """
        if self.db.fetch_all(query_check, (dni_cliente, id_tipo_pase)):
            return False, "ERROR: Este cliente ya tiene un pase de este tipo activo."

        # 2. Obtener datos del plan (sesiones, si requiere profe y el PRECIO para la venta)
        query_tipo = "SELECT nombre, cantidad_sesiones, con_profesor, precio FROM tipos_pases WHERE id = ?"
        tipo_data = self.db.fetch_all(query_tipo, (id_tipo_pase,))
        
        if not tipo_data: return False, "Plan no encontrado."
        nombre_plan, sesiones, requiere_profe, precio = tipo_data[0]

        if requiere_profe == 1 and not dni_profesor:
            return False, "Este plan requiere asignar un profesor."

        # 3. Obtener nombres para la descripción de la venta
        # Nombre del Cliente
        c_data = self.db.fetch_all("SELECT nombre, apellido FROM clientes WHERE dni = ?", (dni_cliente,))
        nombre_c = f"{c_data[0][0]} {c_data[0][1]}" if c_data else dni_cliente
        
        # Nombre del Profesor (si aplica)
        nombre_p = ""
        if dni_profesor:
            p_data = self.db.fetch_all("SELECT nombre, apellido FROM profesores WHERE dni = ?", (dni_profesor,))
            if p_data:
                nombre_p = f" (Prof: {p_data[0][0]} {p_data[0][1]})"

        # 4. Registro del Pase
        vencimiento = (datetime.now() + timedelta(days=30)).strftime('%d/%m/%Y')
        query_ins_pase = """
            INSERT INTO pases_clientes (dni_cliente, id_tipo_pase, dni_profesor, sesiones_restantes, fecha_vencimiento, estado)
            VALUES (?, ?, ?, ?, ?, 'Activo')
        """
        
        # 5. Registro de la Venta
        concepto_venta = f"Pase {nombre_plan} - Cliente: {nombre_c}{nombre_p}"
        query_ins_venta = """
            INSERT INTO ventas (concepto, categoria, monto, metodo_pago)
            VALUES (?, 'Pase', ?, 'Efectivo')
        """

        try:
            # Ejecutamos ambos registros
            self.db.execute_query(query_ins_pase, (dni_cliente, id_tipo_pase, dni_profesor, sesiones, vencimiento))
            self.db.execute_query(query_ins_venta, (concepto_venta, precio))
            
            return True, f"Pase asignado y venta por ${precio} registrada con éxito."
        except Exception as e:
            return False, f"Error en la operación: {e}"

    def limpiar_pases_antiguos(self):
        """REGLA 2: Borra pases vencidos hace más de una semana."""
        hoy = datetime.now()
        limite_borrado = hoy - timedelta(days=7)
        
        # Buscamos todos los vencidos
        vencidos = self.db.fetch_all("SELECT id, fecha_vencimiento FROM pases_clientes WHERE estado = 'Vencido'")
        
        contador_borrados = 0
        for id_p, f_str in vencidos:
            try:
                f_venc = datetime.strptime(f_str, '%d/%m/%Y')
                if f_venc < limite_borrado:
                    self.db.execute_query("DELETE FROM pases_clientes WHERE id = ?", (id_p,))
                    contador_borrados += 1
            except: continue
        
        return contador_borrados

    def obtener_todos_los_pases(self, filtro=None):
        """
        Retorna la lista de pases. 
        Si hay filtro, busca por DNI, Nombre/Apellido de Cliente o Nombre/Apellido de Profesor.
        """
        self.verificar_vencimientos_globales()
        self.limpiar_pases_antiguos()
        
        # Base de la consulta con JOINs para traer nombres
        query = """
            SELECT pc.id, tp.nombre, pc.sesiones_restantes, pc.fecha_vencimiento, 
                   pc.estado, (prof.nombre || ' ' || prof.apellido) as n_profe,
                   (clie.nombre || ' ' || clie.apellido) as n_clie,
                   clie.dni, prof.dni
            FROM pases_clientes pc
            JOIN clientes clie ON pc.dni_cliente = clie.dni
            JOIN tipos_pases tp ON pc.id_tipo_pase = tp.id
            LEFT JOIN profesores prof ON pc.dni_profesor = prof.dni
        """
        
        params = ()
        if filtro:
            # Agregamos la cláusula WHERE multi-columna
            query += """ WHERE pc.dni_cliente LIKE ? 
                         OR clie.nombre LIKE ? 
                         OR clie.apellido LIKE ? 
                         OR prof.nombre LIKE ? 
                         OR prof.apellido LIKE ? """
            
            # Preparamos el término de búsqueda con % para coincidencias parciales
            f = f"%{filtro}%"
            params = (f, f, f, f, f)

        return self.db.fetch_all(query, params)
    
    def verificar_vencimientos_globales(self):
        """Busca pases activos cuya fecha ya pasó y los marca como Vencidos."""
        hoy = datetime.now()
        query = "SELECT id, fecha_vencimiento FROM pases_clientes WHERE estado = 'Activo'"
        activos = self.db.fetch_all(query)

        for id_p, f_str in activos:
            try:
                f_venc = datetime.strptime(f_str, '%d/%m/%Y')
                if f_venc < hoy:
                    self.db.execute_query("UPDATE pases_clientes SET estado = 'Vencido' WHERE id = ?", (id_p,))
            except: continue
            
    def registrar_asistencia(self, id_pase_cliente):
        """
        Resta una sesión al pase del cliente y actualiza su estado.
        ESTE MÉTODO VA EN CORE/PASES.PY
        """
        # 1. Consultar estado actual
        query_check = "SELECT sesiones_restantes, estado FROM pases_clientes WHERE id = ?"
        pase = self.db.fetch_all(query_check, (id_pase_cliente,))

        if not pase:
            return False, "Pase no encontrado."
        
        sesiones, estado = pase[0]

        # 2. Validar que pueda ingresar
        if estado != 'Activo':
            return False, f"El pase no está activo (Estado: {estado})."
        
        if sesiones <= 0:
            return False, "El cliente no tiene sesiones restantes."

        # 3. Calcular nuevos valores
        nuevas_sesiones = sesiones - 1
        nuevo_estado = 'Activo' if nuevas_sesiones > 0 else 'Agotado'

        # 4. Impactar en la Base de Datos
        query_update = "UPDATE pases_clientes SET sesiones_restantes = ?, estado = ? WHERE id = ?"
        try:
            self.db.execute_query(query_update, (nuevas_sesiones, nuevo_estado, id_pase_cliente))
            return True, f"Asistencia registrada. Sesiones restantes: {nuevas_sesiones}"
        except Exception as e:
            return False, f"Error en la base de datos: {e}"
            
            
            
