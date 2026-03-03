import customtkinter as ctk
from tkinter import messagebox
from datetime import datetime

class ResumenMensualView(ctk.CTkFrame):
    def __init__(self, master, db_manager):
        super().__init__(master, fg_color="transparent")
        self.db = db_manager

        # --- PANEL SUPERIOR: FILTROS ---
        self.filter_frame = ctk.CTkFrame(self)
        self.filter_frame.pack(pady=10, padx=20, fill="x")
        
        ctk.CTkLabel(self.filter_frame, text="🔍 Filtros:", font=("Arial", 12, "bold")).pack(side="left", padx=10)
        
        self.ent_busqueda = ctk.CTkEntry(self.filter_frame, placeholder_text="Producto, Profesor o Cliente...", width=250)
        self.ent_busqueda.pack(side="left", padx=5, pady=10)
        self.ent_busqueda.bind("<KeyRelease>", lambda e: self.cargar_datos())

        self.combo_tipo = ctk.CTkComboBox(self.filter_frame, values=["Todos", "Pase", "Producto"], command=lambda x: self.cargar_datos())
        self.combo_tipo.pack(side="left", padx=5)
        self.combo_tipo.set("Todos")

        # --- PANEL CENTRAL: ESTADÍSTICAS (EL APARTADO QUE PEDISTE) ---
        self.stats_frame = ctk.CTkFrame(self, fg_color="#2b2b2b", border_width=2, border_color="#1f538d")
        self.stats_frame.pack(pady=10, padx=20, fill="x")
        
        ctk.CTkLabel(self.stats_frame, text="📊 Resumen de Cantidades (Mes Actual)", font=("Segoe UI", 16, "bold")).pack(pady=5)
        
        self.txt_stats = ctk.CTkTextbox(self.stats_frame, height=120, fg_color="transparent", font=("Consolas", 12))
        self.txt_stats.pack(fill="x", padx=10, pady=5)
        self.txt_stats.configure(state="disabled")

        # --- LISTADO DE VENTAS ---
        self.scroll_resumen = ctk.CTkScrollableFrame(self, label_text="Historial Detallado")
        self.scroll_resumen.pack(expand=True, fill="both", padx=20, pady=10)

        self.cargar_datos()

    def obtener_estadisticas_mes(self):
        """Calcula las cantidades de productos, pases y profesores."""
        # 1. Cantidad de Productos específicos
        query_prod = """
            SELECT concepto, COUNT(*) FROM ventas 
            WHERE categoria = 'Producto' AND strftime('%m', fecha_hora) = strftime('%m', 'now')
            GROUP BY concepto
        """
        # 2. Cantidad por Tipo de Pases
        query_pases = """
            SELECT concepto, COUNT(*) FROM ventas 
            WHERE categoria = 'Pase' AND strftime('%m', fecha_hora) = strftime('%m', 'now')
            GROUP BY concepto
        """
        
        prods = self.db.fetch_all(query_prod)
        pases = self.db.fetch_all(query_pases)

        resumen_texto = "PRODUCTOS VENDIDOS:\n"
        for p in prods: resumen_texto += f" - {p[0]}: {p[1]} unidades\n"
        
        resumen_texto += "\nPASES VENDIDOS (Y PROFESORES):\n"
        for ps in pases: resumen_texto += f" - {ps[0]}: {ps[1]} vendidos\n"

        self.txt_stats.configure(state="normal")
        self.txt_stats.delete("1.0", "end")
        self.txt_stats.insert("1.0", resumen_texto)
        self.txt_stats.configure(state="disabled")

    def cargar_datos(self):
        """Carga el listado filtrado y actualiza las estadísticas."""
        for w in self.scroll_resumen.winfo_children(): w.destroy()
        
        filtro_txt = self.ent_busqueda.get().strip()
        filtro_cat = self.combo_tipo.get()

        query = "SELECT fecha_hora, concepto, monto, categoria, metodo_pago FROM ventas WHERE 1=1"
        params = []

        if filtro_txt:
            query += " AND concepto LIKE ?"
            params.append(f"%{filtro_txt}%")
        
        if filtro_cat != "Todos":
            query += " AND categoria = ?"
            params.append(filtro_cat)

        query += " ORDER BY fecha_hora DESC"
        ventas = self.db.fetch_all(query, tuple(params))

        for v in ventas:
            fecha, concepto, monto, cat, pago = v
            f_obj = datetime.strptime(fecha, '%Y-%m-%d %H:%M:%S')
            
            card = ctk.CTkFrame(self.scroll_resumen)
            card.pack(fill="x", pady=2, padx=5)
            
            color = "#17a2b8" if cat == "Pase" else "#ffc107"
            
            ctk.CTkLabel(card, text=f"{f_obj.strftime('%d/%m %H:%M')}", width=100).pack(side="left", padx=10)
            ctk.CTkLabel(card, text=f"{concepto}", width=400, anchor="w").pack(side="left")
            ctk.CTkLabel(card, text=f"${monto:,.2f}", text_color=color, font=("Arial", 12, "bold")).pack(side="right", padx=15)
            ctk.CTkLabel(card, text=f"{pago}", font=("Arial", 10, "italic")).pack(side="right", padx=10)

        self.obtener_estadisticas_mes()