import customtkinter as ctk
from tkinter import messagebox

class VentasView(ctk.CTkFrame):
    def __init__(self, master, logic_ventas):
        super().__init__(master, fg_color="transparent")
        self.logic = logic_ventas
        self.productos_lista = []

        # --- FILA DE TÍTULO Y BOTÓN RESUMEN ---
        self.top_row = ctk.CTkFrame(self, fg_color="transparent")
        self.top_row.pack(pady=(10, 5), padx=20, fill="x")
        
        ctk.CTkLabel(self.top_row, text="Caja y Ventas", font=("Segoe UI", 20, "bold")).pack(side="left")
        
        # Botón Resumen Mensual Recuperado
        self.btn_ver_resumen = ctk.CTkButton(self.top_row, text="📊 Resumen Mensual", 
                                             fg_color="#565b5e", width=160,
                                             command=self.abrir_resumen_mensual)
        self.btn_ver_resumen.pack(side="right")

        # --- PANEL DE VENTA (Formulario) ---
        self.frame_form = ctk.CTkFrame(self)
        self.frame_form.pack(pady=10, padx=20, fill="x")

        ctk.CTkLabel(self.frame_form, text="Producto:").pack(side="left", padx=(10, 2))
        self.combo_prod = ctk.CTkComboBox(self.frame_form, width=220)
        self.combo_prod.pack(side="left", padx=5, pady=10)

        ctk.CTkLabel(self.frame_form, text="Cant:").pack(side="left", padx=(10, 2))
        self.entry_cant = ctk.CTkEntry(self.frame_form, width=45)
        self.entry_cant.pack(side="left", padx=5)
        self.entry_cant.insert(0, "1")

        self.combo_pago = ctk.CTkComboBox(self.frame_form, values=["Efectivo", "Transferencia", "Tarjeta"], width=110)
        self.combo_pago.pack(side="left", padx=5)
        self.combo_pago.set("Efectivo")

        self.btn_vender = ctk.CTkButton(self.frame_form, text="REGISTRAR", 
                                        fg_color="#28a745", hover_color="#218838",
                                        width=90, command=self.procesar_venta)
        self.btn_vender.pack(side="left", padx=10)

        # --- PANEL DE BÚSQUEDA Y TOTAL ---
        self.frame_info = ctk.CTkFrame(self, fg_color="transparent")
        self.frame_info.pack(fill="x", padx=20, pady=5)

        self.entry_buscar = ctk.CTkEntry(self.frame_info, placeholder_text="🔍 Buscar en historial...", width=350)
        self.entry_buscar.pack(side="left", padx=5)
        self.entry_buscar.bind("<KeyRelease>", lambda e: self.refrescar_historial())

        self.label_total = ctk.CTkLabel(self.frame_info, text="Total Hoy: $0.00", font=("Segoe UI", 22, "bold"))
        self.label_total.pack(side="right", padx=10)

        # --- LISTADO DE VENTAS ---
        self.scroll_ventas = ctk.CTkScrollableFrame(self, label_text="Movimientos de Hoy")
        self.scroll_ventas.pack(expand=True, fill="both", padx=20, pady=10)

        self.refrescar_interfaz()

    def refrescar_interfaz(self):
        self.productos_lista = self.logic.obtener_productos_con_stock()
        opciones = [f"{p[1]} - ${p[2]} (Stock: {p[3]})" for p in self.productos_lista]
        
        self.combo_prod.configure(values=opciones)
        if opciones: self.combo_prod.set(opciones[0])
        else: self.combo_prod.set("Sin stock")
        
        self.entry_cant.delete(0, 'end')
        self.entry_cant.insert(0, "1")
        self.refrescar_historial()

    def refrescar_historial(self):
        for w in self.scroll_ventas.winfo_children(): w.destroy()
        
        filtro = self.entry_buscar.get().strip()
        ventas_hoy = self.logic.obtener_ventas_hoy(filtro)
        
        for v in ventas_hoy:
            concepto, monto, cat, pago, hora = v
            card = ctk.CTkFrame(self.scroll_ventas)
            card.pack(fill="x", pady=2, padx=5)
            
            icono = "🎫" if cat == "Pase" else "🛒"
            ctk.CTkLabel(card, text=f"{hora} | {icono} {concepto}", width=400, anchor="w").pack(side="left", padx=10)
            ctk.CTkLabel(card, text=f"${monto:,.2f}", font=("Arial", 12, "bold")).pack(side="right", padx=15)
            ctk.CTkLabel(card, text=f"{pago}", font=("Arial", 10, "italic"), text_color="gray").pack(side="right", padx=10)

        total = self.logic.obtener_totales_hoy()
        self.label_total.configure(text=f"Total Hoy: ${total:,.2f}")

    def procesar_venta(self):
        seleccion = self.combo_prod.get()
        cant_str = self.entry_cant.get()
        if not self.productos_lista or seleccion == "Sin stock": return

        try:
            cantidad = int(cant_str)
            if cantidad <= 0: raise ValueError
        except ValueError:
            messagebox.showerror("Error", "Cantidad inválida.")
            return

        index = -1
        for i, p in enumerate(self.productos_lista):
            if seleccion.startswith(p[1]):
                index = i
                break
        
        if index != -1:
            prod = self.productos_lista[index]
            if cantidad > prod[3]:
                messagebox.showwarning("Stock Insuficiente", f"Solo quedan {prod[3]} unidades.")
                return

            exito, mensaje = self.logic.registrar_venta_producto(
                producto_id=prod[0],
                nombre_prod=prod[1],
                monto_unitario=prod[2],
                cantidad=cantidad,
                metodo_pago=self.combo_pago.get()
            )
            if exito: self.refrescar_interfaz()
            else: messagebox.showerror("Error", mensaje)

    def abrir_resumen_mensual(self):
        """Llama a la ventana secundaria del resumen mensual."""
        # Necesitas tener creado ui/views/resumen_mensual_view.py
        from ui.views.resumenMensual_view import ResumenMensualView
        ventana = ctk.CTkToplevel(self)
        ventana.title("Estadísticas Mensuales Detalladas")
        ventana.geometry("950x650")
        ventana.attributes("-topmost", True)
        
        # Le pasamos el db_manager que está dentro de la lógica
        resumen = ResumenMensualView(ventana, self.logic.db)
        resumen.pack(expand=True, fill="both", padx=10, pady=10)