import customtkinter as ctk
from tkinter import messagebox

class ProductosView(ctk.CTkFrame):
    def __init__(self, master, logic_productos):
        super().__init__(master, fg_color="transparent")
        self.logic = logic_productos
        self.producto_seleccionado = None
        
        # --- Configuración de Layout ---
        self.grid_columnconfigure(0, weight=1) # Panel izquierdo (Tabla)
        self.grid_columnconfigure(1, weight=0) # Panel derecho (Formulario)
        self.grid_rowconfigure(0, weight=1)

        # --- PANEL IZQUIERDO: Tabla y Buscador ---
        self.left_panel = ctk.CTkFrame(self)
        self.left_panel.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        self.left_panel.grid_columnconfigure(0, weight=1)
        self.left_panel.grid_rowconfigure(1, weight=1)

        # Buscador
        self.search_entry = ctk.CTkEntry(self.left_panel, placeholder_text="Buscar por Nombre o ID...")
        self.search_entry.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        self.search_entry.bind("<KeyRelease>", self.load_data) # Busca mientras escribe

        # Tabla (ScrollableFrame)
        self.table_frame = ctk.CTkScrollableFrame(self.left_panel, label_text="Lista de Productos")
        self.table_frame.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")

        # --- PANEL DERECHO: Formulario ---
        self.right_panel = ctk.CTkFrame(self, width=300)
        self.right_panel.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        ctk.CTkLabel(self.right_panel, text="Detalle Producto", font=("Segoe UI", 16, "bold")).pack(pady=10)

        self.entry_nombre = ctk.CTkEntry(self.right_panel, placeholder_text="Nombre")
        self.entry_nombre.pack(pady=5, padx=10, fill="x")

        self.entry_precio = ctk.CTkEntry(self.right_panel, placeholder_text="Precio")
        self.entry_precio.pack(pady=5, padx=10, fill="x")
        
        self.entry_stock = ctk.CTkEntry(self.right_panel, placeholder_text="Stock")
        self.entry_stock.pack(pady=5, padx=10, fill="x")

        # Botones
        self.btn_save = ctk.CTkButton(self.right_panel, text="Guardar/Actualizar", command=self.save_producto, fg_color="#28a745")
        self.btn_save.pack(pady=15, padx=10, fill="x")

        self.btn_clear = ctk.CTkButton(self.right_panel, text="Limpiar", command=self.clear_form, fg_color="gray")
        self.btn_clear.pack(pady=5, padx=10, fill="x")

        self.load_data()

    def load_data(self, event=None):
        """Carga datos en la tabla filtrando por búsqueda."""
        # Limpiar tabla
        for widget in self.table_frame.winfo_children():
            widget.destroy()
            
        termino = self.search_entry.get()
        productos = self.logic.buscar_producto(termino)
        
        if productos == "DATABASE_LOCKED":
            messagebox.showwarning("Atención", "La base de datos está ocupada.")
            return

        for p in productos:
            row = ctk.CTkFrame(self.table_frame, fg_color="#2b2b2b")
            row.pack(fill="x", pady=2, padx=5)
            
            # Info producto
            ctk.CTkLabel(row, text=f"{p['id']} | {p['nombre']}", font=("Segoe UI", 12)).pack(side="left", padx=10, pady=5)
            ctk.CTkLabel(row, text=f"Stock: {p['stock']}", text_color="#3a7ebf").pack(side="right", padx=10)
            ctk.CTkLabel(row, text=f"${p['precio']:.2f}", text_color="#28a745").pack(side="left", padx=20)
            
            # Botón Eliminar
            btn_del = ctk.CTkButton(row, text="🗑", width=30, fg_color="#dc3545", 
                                    command=lambda id=p['id']: self.delete_producto(id))
            btn_del.pack(side="right", padx=5)
            
            # Botón Editar
            btn_edit = ctk.CTkButton(row, text="✏️", width=30, fg_color="#ffc107", text_color="black",
                                    command=lambda pro=p: self.fill_form(pro))
            btn_edit.pack(side="right", padx=5)

    def fill_form(self, producto):
        """Llena el formulario para editar."""
        self.clear_form()
        self.entry_nombre.insert(0, producto['nombre'])
        self.entry_precio.insert(0, producto['precio'])
        self.entry_stock.insert(0, producto['stock'])
        
    def delete_producto(self, id):
        """
        Solicita confirmación y elimina un producto por su ID.
        """
        # 1. Solicitar confirmación al usuario para evitar eliminaciones accidentales
        confirmacion = messagebox.askyesno(
            "Confirmar eliminación", 
            f"¿Estás seguro de que deseas eliminar el producto con ID: {id}?\nEsta acción no se puede deshacer."
        )
        
        if confirmacion:
            # 2. Llamar al método de la lógica
            exito, mensaje = self.logic.eliminar_producto_por_id(id)
            
            if exito:
                # 3. Informar al usuario y refrescar la tabla
                messagebox.showinfo("Éxito", mensaje)
                self.load_data() # Recarga la lista desde la DB para reflejar el cambio
                
                # 4. Si el producto eliminado era el que estaba en el formulario, limpiarlo
                self.clear_form()
            else:
                # 5. Informar en caso de error (ej. restricciones de llave foránea en ventas)
                messagebox.showerror("Error", mensaje)
        
    def save_producto(self):
        """Envía los datos a la lógica y ella decide si crea o actualiza por nombre."""
        nombre = self.entry_nombre.get().strip()
        precio = self.entry_precio.get()
        stock = self.entry_stock.get()
    
        # Validaciones de campos
        if not nombre or not precio or not stock:
            messagebox.showwarning("Campos vacíos", "Todos los campos son obligatorios")
            return

        try:
            precio_f = float(precio)
            stock_i = int(stock)
        except ValueError:
            messagebox.showerror("Error", "Precio y Stock deben ser valores numéricos")
            return

        # Llamamos a la función inteligente
        exito, msg = self.logic.registrar_producto(nombre, precio_f, stock_i)
        
        if exito:
            messagebox.showinfo("Proceso completado", msg)
            self.clear_form()
            self.load_data()
        else:
            messagebox.showerror("Error", msg)

    def clear_form(self):
        """Limpia el formulario y prepara para un nuevo registro."""
        
        self.entry_nombre.delete(0, 'end')
        self.entry_precio.delete(0, 'end')
        self.entry_stock.delete(0, 'end')