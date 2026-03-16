from core.database_manager import DatabaseManager
from datetime import datetime, timedelta

class Pases:
    def __init__(self):
        self.db = DatabaseManager()

    def asignar_pase_a_cliente(self, dni_cliente, id_tipo_pase, dni_profesor=None, pago_total=True, monto_pagado=0.0, observaciones="", metodo_pago="Efectivo"):
        """Asigna un pase, verifica deudas, elimina anteriores y registra la venta con su método de pago."""
        
        # 1. VERIFICAR DEUDAS ANTES DE RENOVAR
        query_deuda = "SELECT id FROM pases_clientes WHERE dni_cliente = ? AND pago_total = 0"
        if self.db.fetch_all(query_deuda, (dni_cliente,)):
            return False, "❌ El cliente tiene una deuda pendiente. Debe saldarla desde la tarjeta amarilla antes de poder renovar."

        # 2. Obtener datos del plan a vender
        query_tipo = "SELECT nombre, cantidad_sesiones, con_profesor, precio FROM tipos_pases WHERE id = ?"
        tipo_data = self.db.fetch_all(query_tipo, (id_tipo_pase,))
        if not tipo_data: return False, "Plan no encontrado."
        nombre_plan, sesiones, requiere_profe, precio = tipo_data[0]

        if requiere_profe == 1 and not dni_profesor:
            return False, "Este plan requiere asignar un profesor."

        if pago_total:
            monto_pagado = precio

        # 3. Nombres para la venta
        c_data = self.db.fetch_all("SELECT nombre, apellido FROM clientes WHERE dni = ?", (dni_cliente,))
        nombre_c = f"{c_data[0][0]} {c_data[0][1]}" if c_data else dni_cliente
        
        nombre_p = ""
        if dni_profesor:
            p_data = self.db.fetch_all("SELECT nombre, apellido FROM profesores WHERE dni = ?", (dni_profesor,))
            if p_data: nombre_p = f" (Prof: {p_data[0][0]} {p_data[0][1]})"

        try:
            # 4. BORRÓN Y CUENTA NUEVA
            self.db.execute_query("DELETE FROM pases_clientes WHERE dni_cliente = ?", (dni_cliente,))
            self.db.execute_query("UPDATE clientes SET deudor = 0 WHERE dni = ?", (dni_cliente,))

            # 5. Insertar Pase
            vencimiento = (datetime.now() + timedelta(days=30)).strftime('%d/%m/%Y')
            query_ins_pase = """
                INSERT INTO pases_clientes (dni_cliente, id_tipo_pase, dni_profesor, sesiones_restantes, fecha_vencimiento, estado, monto_pagado, pago_total, observaciones)
                VALUES (?, ?, ?, ?, ?, 'Activo', ?, ?, ?)
            """
            self.db.execute_query(query_ins_pase, (dni_cliente, id_tipo_pase, dni_profesor, sesiones, vencimiento, monto_pagado, pago_total, observaciones))
            
            # 6. Registro de la Venta con MÉTODO DE PAGO
            txt_parcial = " (PAGO PARCIAL)" if not pago_total else ""
            concepto_venta = f"Pase {nombre_plan}{txt_parcial} - Cliente: {nombre_c}{nombre_p}"
            query_ins_venta = "INSERT INTO ventas (concepto, categoria, monto, metodo_pago) VALUES (?, 'Pase', ?, ?)"
            self.db.execute_query(query_ins_venta, (concepto_venta, monto_pagado, metodo_pago))
            
            # 7. Marcar deudor si no pagó todo
            if not pago_total:
                self.db.execute_query("UPDATE clientes SET deudor = 1 WHERE dni = ?", (dni_cliente,))
                
            return True, f"Nuevo pase asignado. Venta por ${monto_pagado} registrada ({metodo_pago})."
        except Exception as e:
            return False, f"Error en la operación: {e}"

    def registrar_pago_faltante(self, id_pase, metodo_pago="Efectivo"):
        """Salda la deuda de un pase y registra el ingreso en la caja."""
        try:
            # 1. Traer datos del pase y tipo para saber cuánto debe
            query_pase = """
                SELECT p.monto_pagado, p.dni_cliente, t.precio, t.nombre
                FROM pases_clientes p
                JOIN tipos_pases t ON p.id_tipo_pase = t.id
                WHERE p.id = ?
            """
            datos = self.db.fetch_all(query_pase, (id_pase,))
            if not datos: return False, "Pase no encontrado."
            
            monto_previo, dni_cliente, precio_total, nombre_plan = datos[0]
            deuda = precio_total - monto_previo
            
            if deuda <= 0: return False, "Este pase no registra deudas."

            # 2. Actualizar el pase (Ya pagó todo)
            self.db.execute_query("UPDATE pases_clientes SET pago_total = 1, monto_pagado = ? WHERE id = ?", (precio_total, id_pase))
            
            # 3. Quitarle la mancha de deudor al cliente
            self.db.execute_query("UPDATE clientes SET deudor = 0 WHERE dni = ?", (dni_cliente,))

            # 4. Registrar la venta por el monto restante cobrado
            concepto = f"Cobro Deuda Pase {nombre_plan} - DNI: {dni_cliente}"
            self.db.execute_query("INSERT INTO ventas (concepto, categoria, monto, metodo_pago) VALUES (?, 'Cobro Deuda', ?, ?)", (concepto, deuda, metodo_pago))

            return True, f"Se saldó la deuda de ${deuda:,.2f} pagado con {metodo_pago}."
        except Exception as e:
            return False, f"Error al cobrar: {e}"

    def obtener_todos_los_pases(self, filtro=None):
        self.verificar_vencimientos_globales()
        self.limpiar_pases_antiguos()
        
        # Agregamos los campos de pago y observaciones a la consulta
        query = """
            SELECT pc.id, tp.nombre, pc.sesiones_restantes, pc.fecha_vencimiento, 
                   pc.estado, (prof.nombre || ' ' || prof.apellido) as n_profe,
                   (clie.nombre || ' ' || clie.apellido) as n_clie,
                   clie.dni, prof.dni, pc.monto_pagado, pc.pago_total, tp.precio, pc.observaciones
            FROM pases_clientes pc
            JOIN clientes clie ON pc.dni_cliente = clie.dni
            JOIN tipos_pases tp ON pc.id_tipo_pase = tp.id
            LEFT JOIN profesores prof ON pc.dni_profesor = prof.dni
        """
        params = ()
        if filtro:
            query += " WHERE pc.dni_cliente LIKE ? OR clie.nombre LIKE ? OR clie.apellido LIKE ? OR prof.nombre LIKE ? OR prof.apellido LIKE ?"
            f = f"%{filtro}%"
            params = (f, f, f, f, f)
        return self.db.fetch_all(query, params)
    
    def verificar_vencimientos_globales(self):
        hoy = datetime.now()
        activos = self.db.fetch_all("SELECT id, fecha_vencimiento FROM pases_clientes WHERE estado = 'Activo'")
        for id_p, f_str in activos:
            try:
                f_venc = datetime.strptime(f_str, '%d/%m/%Y')
                if f_venc < hoy:
                    self.db.execute_query("UPDATE pases_clientes SET estado = 'Vencido' WHERE id = ?", (id_p,))
            except: continue
            
    def registrar_asistencia(self, id_pase_cliente):
        pase = self.db.fetch_all("SELECT sesiones_restantes, estado FROM pases_clientes WHERE id = ?", (id_pase_cliente,))
        if not pase: return False, "Pase no encontrado."
        sesiones, estado = pase[0]
        if estado != 'Activo': return False, f"El pase no está activo ({estado})."
        if sesiones <= 0: return False, "El cliente no tiene sesiones restantes."
        nuevas_sesiones = sesiones - 1
        nuevo_estado = 'Activo' if nuevas_sesiones > 0 else 'Agotado'
        try:
            self.db.execute_query("UPDATE pases_clientes SET sesiones_restantes = ?, estado = ? WHERE id = ?", (nuevas_sesiones, nuevo_estado, id_pase_cliente))
            return True, f"Asistencia registrada. Sesiones restantes: {nuevas_sesiones}"
        except Exception as e:
            return False, f"Error en BD: {e}"
        
    def limpiar_pases_antiguos(self):
        """Marca automáticamente como 'Vencido' los pases que ya gastaron todas sus clases."""
        query = "UPDATE pases_clientes SET estado = 'Vencido' WHERE sesiones_restantes <= 0 AND estado = 'Activo'"
        try:
            self.db.execute_query(query)
        except Exception as e:
            print(f"Error al limpiar pases antiguos: {e}")