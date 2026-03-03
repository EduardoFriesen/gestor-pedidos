# main.py
from core.productos import Productos
from ui.main_window import MainWindow
import customtkinter as ctk

# Configuración visual global
ctk.set_appearance_mode("dark")  # "System" (estándar), "Dark", "Light"
ctk.set_default_color_theme("blue") # Temas: "blue", "green", "dark-blue"

if __name__ == "__main__":
    ctk.set_appearance_mode("dark")  # La estética "actual" por excelencia
    ctk.set_default_color_theme("blue")

    # Iniciar el "cerebro"
    logic = Productos()
    
    # Iniciar la "cara" pasándole el cerebro
    app = MainWindow(logic)
    app.mainloop()