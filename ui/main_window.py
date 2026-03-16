import customtkinter as ctk
from ui.views.productos_view import ProductosView
from ui.views.clientes_view import ClienteView 
from ui.views.profesores_view import ProfesorView
from ui.views.pases_view import PasesView
from ui.views.ventas_view import VentasView

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
        self.db_manager = logic_pases.db 
        
        self.title("Sistema de Gestión Pro v1.0")
        # Ventana aún más grande y cómoda para resoluciones modernas con letras grandes
        self.geometry("1280x850") 
        
        # Configuración de Grid
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # --- Sidebar (Menú Lateral) ---
        # Mantenemos el menú lateral ancho (280) para acomodar botones grandes
        self.sidebar = ctk.CTkFrame(self, width=280, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nsew")
        self.sidebar.pack_propagate(False) # Forzar ancho

        # Título del menú grande y con un toque de color azul
        self.logo_label = ctk.CTkLabel(self.sidebar, text="📦 GESTOR PRO", font=("Segoe UI", 26, "bold"), text_color="#4da6ff")
        self.logo_label.pack(pady=(40, 30), padx=20)

        # --- Creación del Menú con Colores Sólidos para cada Sección ---
        # Caja / Ventas (Verde / Green)
        self.create_nav_button("💰 CAJA / VENTAS", self.show_ventas, 
                               fg_color="#28a745", hover_color="#218838")
        
        # Gestión de Pases (Púrpura / Purple)
        self.create_nav_button("🎫 GESTIÓN DE PASES", self.show_pases, 
                               fg_color="#6f42c1", hover_color="#59369b")
        
        # Clientes (Azul / Blue)
        self.create_nav_button("👥 CLIENTES", self.show_customers, 
                               fg_color="#007bff", hover_color="#0069d9")
        
        # Profesores (Naranja / Orange)
        self.create_nav_button("🎓 PROFESORES", self.show_profesores, 
                               fg_color="#fd7e14", text_color="black", hover_color="#d9660c")
        
        # Stock Productos (Rojo / Red)
        self.create_nav_button("🛒 STOCK PRODUCTOS", self.show_products, 
                               fg_color="#dc3545", hover_color="#c82333")

        # --- Contenedor Principal (Donde se cargan las vistas) ---
        self.main_container = ctk.CTkFrame(self, corner_radius=15)
        self.main_container.grid(row=0, column=1, padx=20, pady=20, sticky="nsew")
        
        # Cargar vista por defecto
        self.show_ventas()

    def create_nav_button(self, text, command, fg_color, hover_color, text_color="white"):
        """Crea botones de menú altos (60px), legibles (18px) y con colores sólidos."""
        btn = ctk.CTkButton(
            self.sidebar, 
            text=text, 
            command=command, 
            anchor="w", 
            height=60,                   # <-- Botones XL más altos para iconos grandes
            font=("Segoe UI", 18, "bold"), # <-- Fuente XL más grande y legible
            fg_color=fg_color,
            hover_color=hover_color,
            text_color=text_color
        )
        # Separación entre botones aumentada para dar aire (pady=15)
        btn.pack(pady=15, padx=20, fill="x")
        return btn
    
    def _clear_main_container(self):
        for widget in self.main_container.winfo_children():
            widget.destroy()

    def show_ventas(self):
        self._clear_main_container()
        # Pasamos self.logic_ventas como corresponde
        self.current_view = VentasView(self.main_container, self.logic_ventas)
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