import customtkinter as ctk

class InventoryView(ctk.CTkFrame):
    def __init__(self, master, logic):
        super().__init__(master, fg_color="transparent")
        self.logic = logic
        
        # Título y Buscador
        self.header = ctk.CTkLabel(self, text="Control de Inventario", font=("Segoe UI", 24, "bold"))
        self.header.pack(pady=20, padx=20, anchor="w")
        
        self.search_entry = ctk.CTkEntry(self, placeholder_text="Buscar producto...", width=400)
        self.search_entry.pack(pady=10, padx=20, anchor="w")

        # Tabla (Scrollable Frame para que se sienta fluido)
        self.table_container = ctk.CTkScrollableFrame(self, label_text="Productos en Stock")
        self.table_container.pack(fill="both", expand=True, padx=20, pady=10)
        
        self.load_data()

    def load_data(self):
        # Aquí conectamos con la LÓGICA que hicimos antes
        productos = self.logic.db.fetch_all("SELECT * FROM productos")
        
        for p in productos:
            # Crear una "fila" con diseño moderno
            row = ctk.CTkFrame(self.table_container, fg_color="#2b2b2b", height=40)
            row.pack(fill="x", pady=2, padx=5)
            
            ctk.CTkLabel(row, text=f"ID: {p[0]}").pack(side="left", padx=15)
            ctk.CTkLabel(row, text=p[1], font=("Segoe UI", 13, "bold")).pack(side="left", padx=15)
            ctk.CTkLabel(row, text=f"Stock: {p[3]}", text_color="#3a7ebf").pack(side="right", padx=15)