import customtkinter as ctk
from ui.views.productos_view import ProductosView
from ui.views.clientes_view import ClienteView 
from ui.views.profesores_view import ProfesorView
from ui.views.pases_view import PasesView
from ui.views.ventas_view import VentasView  # <-- Importamos la nueva vista

class MainWindow(ctk.CTk):
    def __init__(self, logic_prod, logic_clie, logic_prof, logic_pases, logic_tipo_pases, logic_ventas): 
        super().__init__()
        # Almacenamos todas las lógicas
        self.logic_prod = logic_prod
        self.logic_clie = logic_clie
        self.logic_prof = logic_prof
        self.logic_pases = logic_pases
        self.logic_tipo_pases = logic_tipo_pases
        self.logic_ventas = logic_ventas
        
        # El db_manager suele estar dentro de cualquiera de las lógicas (ej: logic_pases.db)
        # Lo necesitamos para VentasView
        self.db_manager = logic_pases.db 
        
        self.title("Sistema de Gestión Pro v1.0")
        self.geometry("1200x700") # Un poco más grande para las tablas de ventas
        
        # Configuración de Grid
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # --- Sidebar ---
        self.sidebar = ctk.CTkFrame(self, width=220, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        
        self.logo_label = ctk.CTkLabel(self.sidebar, text="📦 GESTOR PRO", font=("Segoe UI", 20, "bold"))
        self.logo_label.pack(pady=30, padx=20)

        # Botones de Navegación Actualizados
        self.create_nav_button("💰 CAJA / VENTAS", self.show_ventas, fg_color="#28a745") # Botón resaltado
        self.create_nav_button("🎫 GESTIÓN DE PASES", self.show_pases)
        self.create_nav_button("👥 CLIENTES", self.show_customers)
        self.create_nav_button("🎓 PROFESORES", self.show_profesores)
        self.create_nav_button("🛒 STOCK PRODUCTOS", self.show_products)

        # --- Contenedor Principal ---
        self.main_container = ctk.CTkFrame(self, corner_radius=15)
        self.main_container.grid(row=0, column=1, padx=20, pady=20, sticky="nsew")
        
        # Cargar vista por defecto (Ventas para empezar el día cobrando)
        self.show_ventas()

    def create_nav_button(self, text, command, fg_color=None):
        """Método auxiliar para crear botones de menú uniformes."""
        params = {"text": text, "command": command, "anchor": "w"}
        if fg_color:
            params["fg_color"] = fg_color
            
        btn = ctk.CTkButton(self.sidebar, **params)
        btn.pack(pady=10, padx=20, fill="x")
        return btn
    
    def _clear_main_container(self):
        for widget in self.main_container.winfo_children():
            widget.destroy()

    # --- NUEVA VISTA DE VENTAS ---
    def show_ventas(self):
        self._clear_main_container()
        self.current_view = VentasView(self.main_container, self.db_manager)
        self.current_view.pack(fill="both", expand=True)

    def show_products(self):
        self._clear_main_container()
        self.current_view = ProductosView(self.main_container, self.logic_prod)
        self.current_view.pack(fill="both", expand=True)

    def show_customers(self):
        self._clear_main_container()
        self.current_view = ClienteView(self.main_container, self.logic_clie)
        self.current_view.pack(fill="both", expand=True)
        
    def show_profesores(self):
        self._clear_main_container()
        self.current_view = ProfesorView(self.main_container, self.logic_prof)
        self.current_view.pack(fill="both", expand=True)

    def show_pases(self):
        self._clear_main_container()
        self.current_view = PasesView(
            self.main_container, 
            self.logic_pases, 
            self.logic_clie, 
            self.logic_prof, 
            self.logic_tipo_pases
        )
        self.current_view.pack(fill="both", expand=True)
        
    def show_ventas(self):
        self._clear_main_container()
        # Pasamos self.logic_ventas, que es la instancia de la clase Ventas
        self.current_view = VentasView(self.main_container, self.logic_ventas)
        self.current_view.pack(fill="both", expand=True)