import customtkinter as ctk
from tkinter import messagebox

class ClienteView(ctk.CTkFrame):
    def __init__(self, master, logic_clientes):
        super().__init__(master, fg_color="transparent")
        self.logic = logic_clientes
        
        # --- Configuración de Layout ---
        self.grid_columnconfigure(0, weight=1) 
        self.grid_columnconfigure(1, weight=0) 
        self.grid_rowconfigure(0, weight=1)

        # --- PANEL IZQUIERDO (Buscador y Tabla) ---
        self.left_panel = ctk.CTkFrame(self)
        self.left_panel.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        self.left_panel.grid_columnconfigure(0, weight=1)
        self.left_panel.grid_rowconfigure(1, weight=1)

        # Buscador más grande
        self.search_entry = ctk.CTkEntry(self.left_panel, placeholder_text="🔍 Buscar por DNI, Nombre o Apellido...", height=45, font=("Segoe UI", 16))
        self.search_entry.grid(row=0, column=0, padx=15, pady=15, sticky="ew")
        self.search_entry.bind("<KeyRelease>", self.load_data)

        # Lista con título resaltado
        self.table_frame = ctk.CTkScrollableFrame(
            self.left_panel, 
            label_text="📋 LISTA DE CLIENTES REGISTRADOS",
            label_font=("Segoe UI", 16, "bold"),
            label_text_color="#ffffff"
        )
        self.table_frame.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="nsew")

        # --- PANEL DERECHO (Formulario de Creación) ---
        # Lo hacemos un poco más ancho para que entren bien las letras grandes
        self.right_panel = ctk.CTkFrame(self, width=380)
        self.right_panel.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        # Título destacado
        ctk.CTkLabel(self.right_panel, text="➕ NUEVO CLIENTE", font=("Segoe UI", 22, "bold"), text_color="#4da6ff").pack(pady=20)
        
        self.entry_dni = self._create_input("DNI")
        self.entry_nombre = self._create_input("Nombre")
        self.entry_apellido = self._create_input("Apellido")

        ctk.CTkLabel(self.right_panel, text="Fecha de Nacimiento:", font=("Segoe UI", 14, "bold"), text_color="#aaaaaa").pack(pady=(10, 0), padx=15, anchor="w")
        self.entry_nacimiento = ctk.CTkEntry(self.right_panel, placeholder_text="DD/MM/AAAA", height=40, font=("Segoe UI", 15))
        self.entry_nacimiento.pack(pady=5, padx=15, fill="x")
        self.entry_nacimiento.bind("<KeyRelease>", lambda e: self._aplicar_mascara_fecha(e, self.entry_nacimiento))

        self.entry_telefono = self._create_input("Teléfono Personal")
        self.entry_contacto = self._create_input("Nombre Contacto Emergencia")
        self.entry_relacion = self._create_input("Relación (Ej: Madre, Amigo)")
        self.entry_telefono_contacto = self._create_input("Teléfono Emergencia")
        
        ctk.CTkLabel(self.right_panel, text="Observaciones Médicas/Otras:", font=("Segoe UI", 14, "bold"), text_color="#aaaaaa").pack(pady=(10, 0), padx=15, anchor="w")
        self.entry_observaciones = ctk.CTkTextbox(self.right_panel, height=80, border_width=2, border_color="#565b5e", fg_color="#343638", font=("Segoe UI", 15))
        self.entry_observaciones.pack(pady=5, padx=15, fill="x")
        
        ctk.CTkLabel(self.right_panel, text="Fecha Ingreso Ficha:", font=("Segoe UI", 14, "bold"), text_color="#aaaaaa").pack(pady=(10, 0), padx=15, anchor="w")
        self.entry_ficha = ctk.CTkEntry(self.right_panel, placeholder_text="DD/MM/AAAA", height=40, font=("Segoe UI", 15))
        self.entry_ficha.pack(pady=5, padx=15, fill="x")
        self.entry_ficha.bind("<KeyRelease>", lambda e: self._aplicar_mascara_fecha(e, self.entry_ficha))

        self.btn_save = ctk.CTkButton(self.right_panel, text="GUARDAR CLIENTE", height=45, font=("Segoe UI", 16, "bold"), command=self.save_cliente, fg_color="#28a745", hover_color="#218838")
        self.btn_save.pack(pady=25, padx=15, fill="x")

        self.btn_clear = ctk.CTkButton(self.right_panel, text="LIMPIAR FORMULARIO", height=40, font=("Segoe UI", 14, "bold"), command=self.clear_form, fg_color="#565b5e")
        self.btn_clear.pack(pady=(0, 15), padx=15, fill="x")

        self.load_data()

    def _create_input(self, placeholder):
        # Entradas más altas y con fuente más grande
        entry = ctk.CTkEntry(self.right_panel, placeholder_text=placeholder, height=40, font=("Segoe UI", 15))
        entry.pack(pady=6, padx=15, fill="x")
        return entry

    def _aplicar_mascara_fecha(self, event, widget):
        if event.keysym in ("BackSpace", "Delete", "Left", "Right", "Tab"):
            return
        texto = widget.get()
        solo_numeros = "".join(filter(str.isdigit, texto))
        nuevo_texto = ""
        for i, num in enumerate(solo_numeros):
            if i == 2 or i == 4: nuevo_texto += "/"
            if i < 8: nuevo_texto += num
        if texto != nuevo_texto:
            widget.delete(0, "end")
            widget.insert(0, nuevo_texto)

    def load_data(self, event=None):
        for widget in self.table_frame.winfo_children():
            widget.destroy()
            
        termino = self.search_entry.get().strip()
        clientes = self.logic.buscar_cliente(termino) if termino else self.logic.cargar_clientes()
        
        for c in clientes:
            # Tarjeta más alta (90px en vez de 75) para que no quede apretado
            card = ctk.CTkFrame(self.table_frame, fg_color="#2b2b2b", height=90, cursor="hand2")
            card.pack(fill="x", pady=6, padx=10)
            card.pack_propagate(False)
            
            text_frame = ctk.CTkFrame(card, fg_color="transparent")
            text_frame.pack(side="left", fill="both", expand=True, padx=20, pady=10)

            # Nombre más grande
            lbl_nombre = ctk.CTkLabel(text_frame, text=f"{c['nombre']} {c['apellido']}".upper(), font=("Segoe UI", 18, "bold"), anchor="w")
            lbl_nombre.pack(fill="x")
            
            # DNI más legible
            lbl_dni = ctk.CTkLabel(text_frame, text=f"DNI: {c['dni']}", font=("Segoe UI", 15), text_color="#aaaaaa", anchor="w")
            lbl_dni.pack(fill="x")
            
            btn_frame = ctk.CTkFrame(card, fg_color="transparent")
            btn_frame.pack(side="right", padx=15)

            btn_del = ctk.CTkButton(btn_frame, text="🗑", width=45, height=35, font=("Segoe UI", 16), fg_color="#dc3545", hover_color="#c82333",
                                    command=lambda d=c['dni']: self.delete_cliente(d))
            btn_del.pack(side="right", padx=5)

            def on_click(event, cli=c):
                self.abrir_detalle_cliente(cli)

            card.bind("<Button-1>", on_click)
            text_frame.bind("<Button-1>", on_click)
            lbl_nombre.bind("<Button-1>", on_click)
            lbl_dni.bind("<Button-1>", on_click)

    def abrir_detalle_cliente(self, cliente):
        """Abre una ventana emergente grande en modo lectura, con opción a habilitar la edición."""
        detalle_win = ctk.CTkToplevel(self)
        detalle_win.title(f"Ficha Completa - {cliente['nombre']} {cliente['apellido']}")
        # Agrandamos la ventana para que entren las letras más grandes sin problemas
        detalle_win.geometry("600x850") 
        detalle_win.attributes("-topmost", True)
        
        detalle_win.wait_visibility() 
        detalle_win.grab_set() 
        
        # Encabezado dinámico y gigante
        header_frame = ctk.CTkFrame(detalle_win, fg_color="transparent")
        header_frame.pack(fill="x", pady=20, padx=25)
        lbl_titulo = ctk.CTkLabel(header_frame, text=f"👤 FICHA DEL CLIENTE", font=("Segoe UI", 26, "bold"), text_color="#4da6ff")
        lbl_titulo.pack(side="left")

        # Contenedor de datos
        data_frame = ctk.CTkFrame(detalle_win, fg_color="#2b2b2b", corner_radius=10)
        data_frame.pack(fill="both", expand=True, padx=20, pady=10)

        entradas_edicion = {}
        campos_a_desbloquear = [] 

        def crear_fila_input(padre, etiqueta, llave_diccionario, valor, es_dni=False):
            fila = ctk.CTkFrame(padre, fg_color="transparent")
            fila.pack(fill="x", pady=8, padx=20)
            
            # Etiquetas más grandes (16 en vez de 14)
            ctk.CTkLabel(fila, text=f"{etiqueta}:", font=("Segoe UI", 16, "bold"), text_color="#aaaaaa", width=140, anchor="w").pack(side="left")
            
            # Cajas de texto más altas (40) y fuente grande (16)
            entry = ctk.CTkEntry(fila, font=("Segoe UI", 16), height=40)
            entry.pack(side="left", fill="x", expand=True)
            
            val_str = "" if valor in (None, "None", "No registrado") else str(valor)
            entry.insert(0, val_str)
            
            entry.configure(state="disabled")
            
            entradas_edicion[llave_diccionario] = entry
            
            if not es_dni:
                campos_a_desbloquear.append(entry)
                
            return entry

        crear_fila_input(data_frame, "DNI", "dni", cliente.get('dni', ''), es_dni=True)
        crear_fila_input(data_frame, "Nombre", "nombre", cliente.get('nombre', ''))
        crear_fila_input(data_frame, "Apellido", "apellido", cliente.get('apellido', ''))
        
        entry_nac = crear_fila_input(data_frame, "Nacimiento", "nacimiento", cliente.get('cumpleanios', ''))
        entry_nac.bind("<KeyRelease>", lambda e: self._aplicar_mascara_fecha(e, entry_nac))
        
        crear_fila_input(data_frame, "Teléfono", "telefono", cliente.get('telefono', ''))
        crear_fila_input(data_frame, "Cont. Emerg.", "contacto", cliente.get('contacto', ''))
        crear_fila_input(data_frame, "Relación", "relacion", cliente.get('relacion', ''))
        crear_fila_input(data_frame, "Tel. Emerg.", "telefono_contacto", cliente.get('telefono_contacto', ''))
        
        entry_ficha = crear_fila_input(data_frame, "Ingreso Ficha", "fecha_ficha", cliente.get('fecha_ficha', ''))
        entry_ficha.bind("<KeyRelease>", lambda e: self._aplicar_mascara_fecha(e, entry_ficha))

        # Observaciones
        ctk.CTkLabel(data_frame, text="Observaciones:", font=("Segoe UI", 16, "bold"), text_color="#aaaaaa", anchor="w").pack(fill="x", padx=20, pady=(15, 0))
        caja_obs = ctk.CTkTextbox(data_frame, height=90, fg_color="#343638", font=("Segoe UI", 16), border_width=1)
        caja_obs.pack(fill="x", padx=20, pady=5)
        
        obs_val = cliente.get('observaciones', '')
        if obs_val and obs_val != "None":
            caja_obs.insert("0.0", obs_val)
        
        caja_obs.configure(state="disabled")
        campos_a_desbloquear.append(caja_obs)
        entradas_edicion['observaciones'] = caja_obs

        # --- CONTENEDOR DE BOTONES ---
        btn_frame = ctk.CTkFrame(detalle_win, fg_color="transparent")
        btn_frame.pack(fill="x", pady=20, padx=20)

        def guardar_cambios():
            dni = entradas_edicion['dni'].get()
            nombre = entradas_edicion['nombre'].get().strip()
            apellido = entradas_edicion['apellido'].get().strip()
            nac = entradas_edicion['nacimiento'].get().strip()
            tel = entradas_edicion['telefono'].get().strip()
            cont = entradas_edicion['contacto'].get().strip()
            rel = entradas_edicion['relacion'].get().strip()
            tel_cont = entradas_edicion['telefono_contacto'].get().strip()
            ficha = entradas_edicion['fecha_ficha'].get().strip()
            obs = entradas_edicion['observaciones'].get("0.0", "end").strip()
            
            if not (nombre and apellido and nac):
                messagebox.showwarning("Campos vacíos", "Nombre, Apellido y Fecha de Nacimiento son obligatorios.", parent=detalle_win)
                return
                
            exito, msg = self.logic.modificar_cliente(dni, nombre, apellido, nac, tel, cont, rel, tel_cont, obs, ficha)
            
            if exito:
                messagebox.showinfo("Éxito", "Cliente actualizado correctamente.", parent=detalle_win)
                self.load_data() 
                detalle_win.destroy() 
            else:
                messagebox.showerror("Error", msg, parent=detalle_win)

        btn_save = ctk.CTkButton(btn_frame, text="💾 GUARDAR CAMBIOS", height=50, font=("Segoe UI", 18, "bold"), 
                                 fg_color="#28a745", hover_color="#218838", command=guardar_cambios)

        def habilitar_edicion():
            for campo in campos_a_desbloquear:
                campo.configure(state="normal")
            
            lbl_titulo.configure(text="✏️ EDITANDO CLIENTE", text_color="#ffc107")
            btn_ok.pack_forget()
            btn_modificar.pack_forget()
            btn_save.pack(fill="x", expand=True)

        btn_ok = ctk.CTkButton(btn_frame, text="✔️ OK", height=50, font=("Segoe UI", 16, "bold"), 
                               fg_color="#4a4d50", hover_color="#565b5e", command=detalle_win.destroy)
        btn_ok.pack(side="left", fill="x", expand=True, padx=(0, 10))

        btn_modificar = ctk.CTkButton(btn_frame, text="✏️ MODIFICAR", height=50, font=("Segoe UI", 16, "bold"), 
                                      fg_color="#ffc107", text_color="black", hover_color="#e0a800", command=habilitar_edicion)
        btn_modificar.pack(side="right", fill="x", expand=True, padx=(10, 0))


    def fill_form(self, cliente):
        # Mantenemos este método por si lo usas desde otro lado, aunque con el popup nuevo ya casi no se usa
        self.clear_form()
        self.entry_dni.insert(0, cliente.get('dni', ''))
        self.entry_dni.configure(state="disabled") 
        self.entry_nombre.insert(0, cliente.get('nombre', ''))
        self.entry_apellido.insert(0, cliente.get('apellido', ''))
        self.entry_nacimiento.insert(0, cliente.get('cumpleanios', ''))
        self.entry_telefono.insert(0, cliente.get('telefono', ''))
        self.entry_contacto.insert(0, cliente.get('contacto', ''))
        self.entry_relacion.insert(0, cliente.get('relacion', ''))
        self.entry_telefono_contacto.insert(0, cliente.get('telefono_contacto', ''))
        self.entry_ficha.insert(0, cliente.get('fecha_ficha', ''))
        
        obs = cliente.get('observaciones', '')
        if obs and obs != "Sin observaciones previas.":
            self.entry_observaciones.insert("0.0", obs)

    def save_cliente(self):
        dni = self.entry_dni.get()
        nombre = self.entry_nombre.get()
        apellido = self.entry_apellido.get()
        nacimiento = self.entry_nacimiento.get()
        ficha = self.entry_ficha.get()
        
        observaciones = self.entry_observaciones.get("0.0", "end").strip()

        if not (dni and nombre and apellido and nacimiento):
            messagebox.showwarning("Campos vacíos", "DNI, Nombre, Apellido y Fecha de Nacimiento son obligatorios.")
            return

        if len(nacimiento) < 10:
            messagebox.showwarning("Fecha inválida", "Use el formato DD/MM/AAAA")
            return

        if self.entry_dni.cget("state") == "disabled":
            exito, msg = self.logic.modificar_cliente(
                dni, nombre, apellido, nacimiento, 
                self.entry_telefono.get(), 
                self.entry_contacto.get(), 
                self.entry_relacion.get(), 
                self.entry_telefono_contacto.get(), 
                observaciones, 
                ficha
            )
        else:
            exito, msg = self.logic.registrar_cliente(
                nombre=nombre, apellido=apellido, dni=dni, nacimiento=nacimiento, 
                telefono=self.entry_telefono.get(), contacto=self.entry_contacto.get(),
                deudor=0, telefono_contacto=self.entry_telefono_contacto.get(),
                observaciones=observaciones, relacion=self.entry_relacion.get(), fecha_ficha=ficha
            )
            
        if exito:
            messagebox.showinfo("Éxito", msg)
            self.clear_form()
            self.load_data()
        else:
            messagebox.showerror("Error", msg)

    def delete_cliente(self, dni):
        if messagebox.askyesno("Confirmar", f"¿Seguro que desea eliminar al cliente con DNI: {dni}?"):
            exito, msg = self.logic.eliminar_cliente(dni)
            if exito: self.load_data()
            else: messagebox.showerror("Error", msg)

    def clear_form(self):
        self.entry_dni.configure(state="normal")
        fields = [self.entry_dni, self.entry_nombre, self.entry_apellido, self.entry_nacimiento, self.entry_telefono, self.entry_contacto, self.entry_relacion, self.entry_telefono_contacto, self.entry_ficha]
        for f in fields: f.delete(0, 'end')
        self.entry_observaciones.delete("0.0", "end")