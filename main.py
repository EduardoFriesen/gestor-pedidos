# main.py
from core.productos import Productos
from core.clientes import Clientes
from core.profesores import Profesores
from core.pases import Pases
from core.ventas import Ventas
from core.tipo_pase import TipoPase  # <-- 1. Importar la nueva lógica
from ui.main_window import MainWindow
import customtkinter as ctk

if __name__ == "__main__":
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("blue")

    # Iniciar todos los "cerebros"
    logic_prod = Productos()
    logic_clie = Clientes()
    logic_prof = Profesores()
    logic_pases = Pases()
    logic_tipo_pases = TipoPase()
    
    # Extraemos el db_manager de una de las lógicas para la nueva
    db_manager = logic_prod.db 
    logic_ventas = Ventas(db_manager) 

    # IMPORTANTE: Pasamos las 6 lógicas en orden
    app = MainWindow(logic_prod, logic_clie, logic_prof, logic_pases, logic_tipo_pases, logic_ventas)
    app.mainloop()