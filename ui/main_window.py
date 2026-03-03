import customtkinter as ctk
from ui.views.productos_view import ProductosView
from ui.views.clientes_view import ClienteView 
from ui.views.profesores_view import ProfesorView
# from ui.views.pases_view import PasesView <-- Crearás este después

class MainWindow(ctk.CTk):
    def __init__(self, logic_prod, logic_clie, logic_prof): 
        super().__init__()
        self.logic_prod = logic_prod
        self.logic_clie = logic_clie
        self.logic_prof = logic_prof
        
        self.title("Sistema de Gestión Pro v1.0")
        self.geometry("1100x650")
        
        # Configuración de Grid (Columna 0: Menú, Columna 1: Contenido)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # --- Sidebar ---
        self.sidebar = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        
        self.logo_label = ctk.CTkLabel(self.sidebar, text="📦 GESTOR PRO", font=("Segoe UI", 20, "bold"))
        self.logo_label.pack(pady=30, padx=20)

        # Botones de Navegación
        self.btn_prod = ctk.CTkButton(self.sidebar, text="Productos", command=self.show_products)
        self.btn_prod.pack(pady=10, padx=20)

        self.btn_clie = ctk.CTkButton(self.sidebar, text="Clientes", command=self.show_customers)
        self.btn_clie.pack(pady=10, padx=20)
        
        self.btn_clie = ctk.CTkButton(self.sidebar, text="Profesores", command=self.show_profesores)
        self.btn_clie.pack(pady=10, padx=20)

        self.btn_pases = ctk.CTkButton(self.sidebar, text="Gestión de Pases", command=self.show_pases)
        self.btn_pases.pack(pady=10, padx=20)

        # --- Contenedor Principal (Donde cambian las pantallas) ---
        self.main_container = ctk.CTkFrame(self, corner_radius=15)
        self.main_container.grid(row=0, column=1, padx=20, pady=20, sticky="nsew")
        
        # Cargar vista por defecto
        self.show_products()
    
    def _clear_main_container(self):
        """Limpia la pantalla actual antes de cargar la nueva."""
        for widget in self.main_container.winfo_children():
            widget.destroy()

    def show_products(self):
        self._clear_main_container()
        self.current_view = ProductosView(self.main_container, self.logic_prod)
        self.current_view.pack(fill="both", expand=True)

    def show_customers(self):
        self._clear_main_container()
        # Usamos la lógica que ya fue creada al inicio
        self.current_view = ClienteView(self.main_container, self.logic_clie)
        self.current_view.pack(fill="both", expand=True)
        
    def show_profesores(self):
        self._clear_main_container()
        # Usamos la lógica que ya fue creada al inicio
        self.current_view = ProfesorView(self.main_container, self.logic_prof)
        self.current_view.pack(fill="both", expand=True)

    def show_pases(self):
        self._clear_main_container()
        # Pantalla temporal mientras creas pases_view.py
        label = ctk.CTkLabel(self.main_container, text="Sección: Gestión de Pases\n(En desarrollo)", font=("Segoe UI", 20))
        label.pack(expand=True)