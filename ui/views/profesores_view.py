import customtkinter as ctk
from tkinter import messagebox
from tkcalendar import DateEntry
from datetime import datetime
from tkinter import ttk

class ProfesorView(ctk.CTkFrame):
    def __init__(self, master, logic_profesores):
        super().__init__(master, fg_color="transparent")
        self.logic_profesores = logic_profesores
        
        style = ttk.Style()
        style.theme_use("default")

        style.configure(
            "Custom.DateEntry",
            fieldbackground="#343638",
            background="#343638",
            foreground="white",
            bordercolor="#565b5e",
            lightcolor="#343638",
            darkcolor="#343638",
            borderwidth=0,
            arrowsize=12
        )
        style.layout("Custom.DateEntry",
            [('DateEntry.field', {'sticky': 'nswe'})]
        )
        
        # --- Configuración de Layout ---
        self.grid_columnconfigure(0, weight=1) 
        self.grid_columnconfigure(1, weight=0) 
        self.grid_rowconfigure(0, weight=1)

        # --- PANEL IZQUIERDO ---
        self.left_panel = ctk.CTkFrame(self)
        self.left_panel.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        self.left_panel.grid_columnconfigure(0, weight=1)
        self.left_panel.grid_rowconfigure(1, weight=1)

        self.search_entry = ctk.CTkEntry(self.left_panel, placeholder_text="Buscar por DNI, Nombre o Apellido...")
        self.search_entry.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        
        # Aquí es donde fallaba: debe existir el método self.load_data
        self.search_entry.bind("<KeyRelease>", self.load_data)

        self.table_frame = ctk.CTkScrollableFrame(self.left_panel, label_text="Lista de profesores")
        self.table_frame.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")

        # --- PANEL DERECHO ---
        self.right_panel = ctk.CTkFrame(self, width=300)
        self.right_panel.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        ctk.CTkLabel(self.right_panel, text="Detalle profesor", font=("Segoe UI", 16, "bold")).pack(pady=10)
        self.entry_dni = ctk.CTkEntry(self.right_panel, placeholder_text="DNI")
        self.entry_dni.pack(pady=5, padx=10, fill="x")

        self.entry_nombre = ctk.CTkEntry(self.right_panel, placeholder_text="Nombre")
        self.entry_nombre.pack(pady=5, padx=10, fill="x")

        self.entry_apellido = ctk.CTkEntry(self.right_panel, placeholder_text="Apellido")
        self.entry_apellido.pack(pady=5, padx=10, fill="x")

        # --- SECCIÓN FECHA DE NACIMIENTO ESTILIZADA ---
        ctk.CTkLabel(self.right_panel, text="Fecha de Nacimiento:", font=("Segoe UI", 12)).pack(pady=(10, 0), padx=10, anchor="w")

        # 1. Creamos el cascarón (Frame) que imita exactamente a un CTKEntry
        # El color #343638 es el gris oficial de los campos de texto en modo oscuro
        self.date_container = ctk.CTkFrame(
            self.right_panel, 
            fg_color="#343638",    
            border_color="#565b5e", 
            border_width=2, 
            corner_radius=6,
            height=28 
        )
        self.date_container.pack(pady=5, padx=10, fill="x")
        self.date_container.pack_propagate(False) # Evita que el calendario lo deforme

        # 2. Insertamos el DateEntry "dentro" del marco redondeado
        # Quitamos todos sus bordes originales (borderwidth=0)
        self.entry_nacimiento = DateEntry(
            self.date_container,
            style="Custom.DateEntry",
            date_pattern='dd-mm-y'
        )

        # 3. Lo expandimos para que llene el interior del marco redondeado
        self.entry_nacimiento.pack(fill="both", expand=True, padx=8, pady=4)

        self.btn_save = ctk.CTkButton(self.right_panel, text="Guardar", command=self.save_profesor, fg_color="#28a745")
        self.btn_save.pack(pady=15, padx=10, fill="x")

        self.btn_clear = ctk.CTkButton(self.right_panel, text="Limpiar", command=self.clear_form, fg_color="gray")
        self.btn_clear.pack(pady=5, padx=10, fill="x")

        # Cargar datos iniciales
        self.load_data()

    # ⬇️ ESTE MÉTODO FALTABA O TENÍA OTRO NOMBRE ⬇️
    def load_data(self, event=None):
        """Carga y filtra los profesores en la tabla."""
        # Limpiar los widgets actuales en la tabla
        for widget in self.table_frame.winfo_children():
            widget.destroy()
            
        termino = self.search_entry.get().strip()
        
        # DECISIÓN: Si el buscador está vacío, cargar todos.
        if not termino:
            profesores = self.logic_profesores.cargar_profesores()
        else:
            # Asegúrate de que este método 'buscar_profesor' exista en tu clase profesores
            profesores = self.logic_profesores.buscar_profesor(termino)
        
        for c in profesores:
            row = ctk.CTkFrame(self.table_frame, fg_color="#2b2b2b")
            row.pack(fill="x", pady=2, padx=5)
            
            ctk.CTkLabel(row, text=f"{c['dni']} | {c['nombre']} {c['apellido']}").pack(side="left", padx=10, pady=5)
            
            # Botones de acción
            btn_del = ctk.CTkButton(row, text="🗑", width=30, fg_color="#dc3545", 
                                    command=lambda d=c['dni']: self.delete_profesor(d))
            btn_del.pack(side="right", padx=5)
            
            btn_edit = ctk.CTkButton(row, text="✏️", width=30, fg_color="#ffc107", text_color="black",
                                    command=lambda cli=c: self.fill_form(cli))
            btn_edit.pack(side="right", padx=5)

    def fill_form(self, profesor):
        self.clear_form()
        self.entry_dni.insert(0, profesor['dni'])
        self.entry_nombre.insert(0, profesor['nombre'])
        self.entry_apellido.insert(0, profesor['apellido'])
        
        # CAMBIO: Leer con el formato d/m/Y
        try:
            fecha_dt = datetime.strptime(profesor['cumpleanios'], '%d/%m/%Y')
            self.entry_nacimiento.set_date(fecha_dt)
        except Exception as e:
            print(f"Error al convertir fecha: {e}")
            self.entry_nacimiento.set_date(datetime.now())
            
        self.entry_dni.configure(state="disabled")

    def save_profesor(self):
        dni = self.entry_dni.get().strip()
        nombre = self.entry_nombre.get().strip()
        apellido = self.entry_apellido.get().strip()
        
        # Guardar como cadena con barras d/m/y
        nacimiento = self.entry_nacimiento.get_date().strftime('%d/%m/%Y')
        
        if not dni or not nombre:
            messagebox.showwarning("Atención", "DNI y Nombre son obligatorios")
            return

        if self.entry_dni.cget("state") == "disabled":
            exito, msg = self.logic_profesores.modificar_profesor(dni, nombre, apellido, nacimiento)
        else:
            exito, msg = self.logic_profesores.registrar_profesor(nombre, apellido, dni, nacimiento)
            
        if exito:
            messagebox.showinfo("Éxito", msg) # Añadido para confirmar
            self.clear_form()
            self.load_data()
        else:
            messagebox.showerror("Error", msg)

    def delete_profesor(self, dni):
        if messagebox.askyesno("Confirmar", f"¿Eliminar profesor {dni}?"):
            exito, msg = self.logic_profesores.eliminar_profesor(dni)
            if exito: self.load_data()
            else: messagebox.showerror("Error", msg)

    def clear_form(self):
        self.entry_dni.configure(state="normal")
        self.entry_dni.delete(0, 'end')
        self.entry_nombre.delete(0, 'end')
        self.entry_apellido.delete(0, 'end')
        self.entry_nacimiento.set_date(datetime.now())