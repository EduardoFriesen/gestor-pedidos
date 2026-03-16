import customtkinter as ctk
from tkinter import messagebox
from datetime import datetime

class PasesView(ctk.CTkFrame):
    def __init__(self, master, logic_pases, logic_clientes, logic_profesores, logic_tipo_pases):
        super().__init__(master, fg_color="transparent")
        self.logic = logic_pases
        self.logic_clie = logic_clientes
        self.logic_prof = logic_profesores
        self.logic_tipo = logic_tipo_pases
        
        self.cliente_seleccionado_dni = None
        self.profesor_seleccionado_dni = None

        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=0)
        self.grid_rowconfigure(0, weight=1)

        # --- PANEL IZQUIERDO: LISTADO Y ASISTENCIA ---
        self.left_panel = ctk.CTkFrame(self)
        self.left_panel.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        
        self.search_entry = ctk.CTkEntry(self.left_panel, placeholder_text="🔍 Buscar pases por DNI o Nombre...", height=45, font=("Segoe UI", 16))
        self.search_entry.pack(pady=10, padx=15, fill="x")
        self.btn_buscar = ctk.CTkButton(self.left_panel, text="Buscar Pases", height=40, font=("Segoe UI", 14, "bold"), command=self.load_pases_cliente)
        self.btn_buscar.pack(pady=5)

        self.scroll_pases = ctk.CTkScrollableFrame(self.left_panel, label_text="📋 HISTORIAL DE PASES", label_font=("Segoe UI", 16, "bold"))
        self.scroll_pases.pack(pady=10, padx=15, fill="both", expand=True)

        # --- PANEL DERECHO: ASIGNACIÓN ---
        self.right_panel = ctk.CTkFrame(self, width=380)
        self.right_panel.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        ctk.CTkLabel(self.right_panel, text="➕ ASIGNAR PASE", font=("Segoe UI", 22, "bold"), text_color="#4da6ff").pack(pady=15)

        # Buscador Clientes
        ctk.CTkLabel(self.right_panel, text="Cliente (DNI o Nombre):", font=("Segoe UI", 14, "bold")).pack(anchor="w", padx=15)
        self.client_search = ctk.CTkEntry(self.right_panel, placeholder_text="Escriba para buscar...", height=40, font=("Segoe UI", 14))
        self.client_search.pack(pady=5, padx=15, fill="x")
        self.client_search.bind("<KeyRelease>", self.update_client_results)
        
        self.client_results = ctk.CTkComboBox(self.right_panel, values=[], command=self.select_client, height=40, font=("Segoe UI", 14))
        self.client_results.pack(pady=5, padx=15, fill="x")
        self.client_results.set("") 

        # Buscador Profesores
        ctk.CTkLabel(self.right_panel, text="Profesor (DNI o Nombre):", font=("Segoe UI", 14, "bold")).pack(anchor="w", padx=15, pady=(10,0))
        self.prof_search = ctk.CTkEntry(self.right_panel, placeholder_text="Escriba para buscar...", height=40, font=("Segoe UI", 14))
        self.prof_search.pack(pady=5, padx=15, fill="x")
        self.prof_search.bind("<KeyRelease>", self.update_prof_results)
        
        self.prof_results = ctk.CTkComboBox(self.right_panel, values=[], command=self.select_prof, height=40, font=("Segoe UI", 14))
        self.prof_results.pack(pady=5, padx=15, fill="x")
        self.prof_results.set("")

        # Selector Tipo de Pase
        ctk.CTkLabel(self.right_panel, text="Plan / Tipo de Pase:", font=("Segoe UI", 14, "bold")).pack(anchor="w", padx=15, pady=(10,0))
        self.combo_tipo = ctk.CTkComboBox(self.right_panel, values=[], command=self.check_profe_needed, height=40, font=("Segoe UI", 14))
        self.combo_tipo.pack(pady=5, padx=15, fill="x")
        
        self.refresh_tipos_pases() 

        # --- SECCIÓN DE PAGOS ---
        pago_frame = ctk.CTkFrame(self.right_panel, fg_color="#343638", corner_radius=8)
        pago_frame.pack(pady=10, padx=15, fill="x")

        self.pago_total_var = ctk.BooleanVar(value=True)
        self.chk_pago_total = ctk.CTkCheckBox(pago_frame, text="Pago Completo", font=("Segoe UI", 14, "bold"), 
                                              variable=self.pago_total_var, command=self.toggle_pago_parcial)
        self.chk_pago_total.pack(pady=10, padx=10, anchor="w")

        self.entry_monto = ctk.CTkEntry(pago_frame, placeholder_text="Monto entregado hoy ($)", height=40, font=("Segoe UI", 14))
        
        self.combo_metodo_pago = ctk.CTkComboBox(pago_frame, values=["Efectivo", "Transferencia", "Tarjeta"], height=40, font=("Segoe UI", 14))
        self.combo_metodo_pago.pack(pady=(0, 10), padx=10, fill="x")
        self.combo_metodo_pago.set("Efectivo")

        self.entry_monto = ctk.CTkEntry(pago_frame, placeholder_text="Monto entregado hoy ($)", height=40, font=("Segoe UI", 14))
        # Inicialmente oculto porque por defecto es Pago Completo
        
        # Observaciones
        ctk.CTkLabel(self.right_panel, text="Observaciones:", font=("Segoe UI", 14, "bold")).pack(anchor="w", padx=15)
        self.entry_obs = ctk.CTkEntry(self.right_panel, placeholder_text="Ej: Adeuda $5000, Promesa de pago el viernes...", height=40, font=("Segoe UI", 14))
        self.entry_obs.pack(pady=5, padx=15, fill="x")

        self.btn_asignar = ctk.CTkButton(self.right_panel, text="💾 VENDER PASE", height=50, font=("Segoe UI", 16, "bold"), fg_color="#28a745", hover_color="#218838", command=self.asignar_nuevo)
        self.btn_asignar.pack(pady=15, padx=15, fill="x")

        self.btn_nuevo_tipo = ctk.CTkButton(self.right_panel, text="+ Configurar Planes", height=40, font=("Segoe UI", 14, "bold"), fg_color="#565b5e", command=self.open_tipo_pase_window)
        self.btn_nuevo_tipo.pack(pady=5, padx=15, fill="x")
        
        self.after(100, self.load_pases_cliente)

    def toggle_pago_parcial(self):
        """Muestra u oculta el campo de monto según el checkbox."""
        if self.pago_total_var.get():
            self.entry_monto.pack_forget()
        else:
            self.entry_monto.pack(pady=(0, 10), padx=10, fill="x")

    # --- LÓGICA DE BUSCADORES ---
    def update_client_results(self, event):
        term = self.client_search.get().strip()
        if len(term) > 1:
            clientes = self.logic_clie.buscar_cliente(term)
            listado = [f"{c['dni']} - {c['nombre']} {c['apellido']}" for c in clientes]
            self.client_results.configure(values=listado)
            if listado:
                self.client_results.set(listado[0])
                self.cliente_seleccionado_dni = listado[0].split(" - ")[0]
            else:
                self.client_results.set("")
                self.cliente_seleccionado_dni = None

    def select_client(self, selection):
        self.cliente_seleccionado_dni = selection.split(" - ")[0]

    def update_prof_results(self, event):
        term = self.prof_search.get().strip()
        if len(term) > 1:
            profes = self.logic_prof.buscar_profesor(term)
            listado = [f"{p['dni']} - {p['nombre']} {p['apellido']}" for p in profes]
            self.prof_results.configure(values=listado)
            if listado:
                self.prof_results.set(listado[0])
                self.profesor_seleccionado_dni = listado[0].split(" - ")[0]
            else:
                self.prof_results.set("")
                self.profesor_seleccionado_dni = None

    def select_prof(self, selection):
        self.profesor_seleccionado_dni = selection.split(" - ")[0]

    def refresh_tipos_pases(self):
        self.tipos_data = self.logic_tipo.obtener_todos()
        nombres = [t['nombre'] for t in self.tipos_data]
        self.combo_tipo.configure(values=nombres)
        if nombres: self.combo_tipo.set(nombres[0])

    def check_profe_needed(self, selection):
        pase = next((t for t in self.tipos_data if t['nombre'] == selection), None)
        if pase and pase.get('con_profesor') == 0:
            self.prof_search.configure(state="disabled")
            self.prof_results.configure(state="disabled")
            self.profesor_seleccionado_dni = None
        else:
            self.prof_search.configure(state="normal")
            self.prof_results.configure(state="normal")

    def open_tipo_pase_window(self):
        window = ctk.CTkToplevel(self)
        window.title("Configurar Planes")
        window.geometry("450x500")
        window.attributes("-topmost", True)

        ctk.CTkLabel(window, text="Nuevo Tipo de Pase", font=("Segoe UI", 18, "bold")).pack(pady=20)
        name_entry = ctk.CTkEntry(window, placeholder_text="Nombre", height=40, font=("Segoe UI", 14))
        name_entry.pack(pady=10, padx=20, fill="x")
        price_entry = ctk.CTkEntry(window, placeholder_text="Precio Total ($)", height=40, font=("Segoe UI", 14))
        price_entry.pack(pady=10, padx=20, fill="x")
        sessions_entry = ctk.CTkEntry(window, placeholder_text="Sesiones Permitidas", height=40, font=("Segoe UI", 14))
        sessions_entry.pack(pady=10, padx=20, fill="x")
        check_profe = ctk.CTkCheckBox(window, text="¿Requiere Profesor?", font=("Segoe UI", 14))
        check_profe.pack(pady=15)

        def save():
            try:
                exito, msg = self.logic_tipo.crear_tipo_pase(
                    name_entry.get(), float(price_entry.get()), 
                    int(sessions_entry.get()), 1 if check_profe.get() else 0
                )
                if exito:
                    messagebox.showinfo("Éxito", msg)
                    self.refresh_tipos_pases()
                    window.destroy()
                else: messagebox.showerror("Error", msg)
            except: messagebox.showerror("Error", "Asegúrese de poner números válidos en Precio y Sesiones.")

        ctk.CTkButton(window, text="Guardar Plan", height=45, font=("Segoe UI", 14, "bold"), command=save).pack(pady=20, padx=20, fill="x")

    # --- ASISTENCIA Y RENDERIZADO ---
    def load_pases_cliente(self):
        busqueda = self.search_entry.get().strip()
        raw_data = self.logic.obtener_todos_los_pases(busqueda if busqueda else None)
        
        for w in self.scroll_pases.winfo_children(): 
            w.destroy()

        # Ordenar (Vencidos e impagos arriba)
        pases = sorted(raw_data, key=lambda x: (x[10] == 1, x[4] == 'Activo'))

        for p in pases:
            # Índices: 0:id, 1:plan, 2:sesiones, 3:vence, 4:estado, 5:n_profe, 6:n_clie, 7:dni_c, 8:dni_p, 9:pagado, 10:pago_total, 11:precio, 12:obs
            id_pase = p[0]
            estado = p[4]
            pago_total = p[10]
            deuda = p[11] - p[9]
            obs = p[12]

            # COLOR DE LA TARJETA
            # Si hay deuda, es AMARILLA. Si está vencido, ROJO. Si está OK, GRIS oscuro.
            if not pago_total:
                bg_color = "#997300" # Amarillo oscuro para modo noche
            elif estado != 'Activo':
                bg_color = "#4a1a1a" # Rojo oscuro
            else:
                bg_color = "#2b2b2b"

            card = ctk.CTkFrame(self.scroll_pases, fg_color=bg_color, corner_radius=8)
            card.pack(fill="x", pady=6, padx=10)
            
            # Textos
            txt_estado = "✅ ACTIVO" if estado == "Activo" else f"❌ {estado.upper()}"
            txt_deuda = f" | ⚠️ DEUDA: ${deuda:,.2f}" if not pago_total else ""
            txt_obs = f"\nObs: {obs}" if obs else ""
            
            info = f"👤 CLIENTE: {p[6].upper()} ({p[7]})\n🎫 PLAN: {p[1]} | Clases Restantes: {p[2]}\n📅 Vence: {p[3]} | Profe: {p[5] if p[5] else 'Sin Profe'}\n{txt_estado}{txt_deuda}{txt_obs}"
            
            ctk.CTkLabel(card, text=info, font=("Segoe UI", 15), justify="left").pack(side="left", padx=15, pady=10)

            # Botones derechos
            btn_frame = ctk.CTkFrame(card, fg_color="transparent")
            btn_frame.pack(side="right", padx=15)

            # Botón Saldar Deuda (solo si debe)
            if not pago_total:
                ctk.CTkButton(btn_frame, text="💰 SALDAR DEUDA", width=120, height=35, font=("Segoe UI", 13, "bold"), 
                              fg_color="#ffc107", text_color="black", hover_color="#e0a800",
                              command=lambda pid=id_pase, d=deuda: self.pagar_deuda(pid, d)).pack(pady=5)

            # Botón Ingresar (solo si activo y con clases)
            if estado == 'Activo' and p[2] > 0:
                ctk.CTkButton(btn_frame, text="✔ INGRESAR", width=120, height=35, font=("Segoe UI", 13, "bold"), fg_color="#17a2b8",
                              command=lambda pid=id_pase: self.descontar(pid)).pack(pady=5)

    def pagar_deuda(self, id_pase, deuda):
        """Abre un popup para elegir el método de pago al saldar la deuda."""
        popup = ctk.CTkToplevel(self)
        popup.title("💰 Saldar Deuda")
        popup.geometry("350x250")
        popup.attributes("-topmost", True)
        popup.wait_visibility()
        popup.grab_set()

        ctk.CTkLabel(popup, text=f"Monto a cobrar: ${deuda:,.2f}", font=("Segoe UI", 18, "bold"), text_color="#ffc107").pack(pady=20)
        
        ctk.CTkLabel(popup, text="Método de pago:", font=("Segoe UI", 14)).pack(pady=(0, 5))
        combo_metodo_deuda = ctk.CTkComboBox(popup, values=["Efectivo", "Transferencia", "Tarjeta"], height=40, font=("Segoe UI", 14))
        combo_metodo_deuda.pack(pady=5, padx=20, fill="x")
        combo_metodo_deuda.set("Efectivo")

        def confirmar_pago():
            metodo = combo_metodo_deuda.get()
            exito, msg = self.logic.registrar_pago_faltante(id_pase, metodo)
            if exito:
                messagebox.showinfo("Éxito", msg, parent=popup)
                self.load_pases_cliente() # Refresca las tarjetas
                popup.destroy()
            else:
                messagebox.showerror("Error", msg, parent=popup)

        ctk.CTkButton(popup, text="✔️ Confirmar Pago", height=45, font=("Segoe UI", 14, "bold"), fg_color="#28a745", hover_color="#218838", command=confirmar_pago).pack(pady=20, padx=20, fill="x")

    def descontar(self, id_pase):
        exito, msg = self.logic.registrar_asistencia(id_pase)
        if exito: self.load_pases_cliente()
        else: messagebox.showerror("Error", msg)

    def asignar_nuevo(self):
        if not self.cliente_seleccionado_dni:
            messagebox.showwarning("Atención", "Escriba y busque un cliente válido.")
            return
        
        tipo_nom = self.combo_tipo.get()
        if not tipo_nom:
            messagebox.showwarning("Atención", "Debe configurar y seleccionar un Plan/Tipo de Pase.")
            return

        tipo_id = next(t['id'] for t in self.tipos_data if t['nombre'] == tipo_nom)
        
        pago_completo = self.pago_total_var.get()
        monto = 0.0
        
        # Validar monto si es parcial
        if not pago_completo:
            try:
                monto_txt = self.entry_monto.get().strip()
                if not monto_txt: raise ValueError
                monto = float(monto_txt)
            except ValueError:
                messagebox.showerror("Error", "Debe ingresar un monto válido numérico para el pago parcial.")
                return

        observaciones = self.entry_obs.get().strip()
        metodo_pago = self.combo_metodo_pago.get() # Capturamos el método

        exito, msg = self.logic.asignar_pase_a_cliente(
            self.cliente_seleccionado_dni, 
            tipo_id, 
            self.profesor_seleccionado_dni,
            pago_total=pago_completo,
            monto_pagado=monto,
            observaciones=observaciones,
            metodo_pago=metodo_pago # Lo enviamos a la DB
        )
        
        if exito:
            messagebox.showinfo("Éxito", msg)
            self.entry_monto.delete(0, 'end')
            self.entry_obs.delete(0, 'end')
            self.pago_total_var.set(True)
            self.toggle_pago_parcial() # Ocultar caja
            self.load_pases_cliente()
        else:
            messagebox.showerror("Error", msg)
            
    def open_tipo_pase_window(self):
        """Abre la ventana avanzada de gestión de planes."""
        # Le pasamos self.logic_tipo y un callback para que refresque el combobox al cerrar/guardar
        window = PlanesWindow(self, self.logic_tipo, self.refresh_tipos_pases)
        window.grab_set()
        
class PlanesWindow(ctk.CTkToplevel):
    def __init__(self, master, logic_tipo, on_update_callback):
        super().__init__(master)
        self.logic = logic_tipo
        self.on_update_callback = on_update_callback
        self.current_edit_id = None # Controla si estamos creando o editando

        self.title("⚙️ Gestión de Planes y Tipos de Pases")
        self.geometry("900x550")
        self.attributes("-topmost", True)

        self.grid_columnconfigure(0, weight=0)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # --- PANEL IZQUIERDO: FORMULARIO ---
        self.form_frame = ctk.CTkFrame(self, width=320)
        self.form_frame.grid(row=0, column=0, padx=15, pady=15, sticky="nsew")
        
        self.lbl_titulo = ctk.CTkLabel(self.form_frame, text="NUEVO PLAN", font=("Segoe UI", 20, "bold"), text_color="#4da6ff")
        self.lbl_titulo.pack(pady=(20, 15))

        self.entry_nombre = ctk.CTkEntry(self.form_frame, placeholder_text="Nombre del Plan", height=40, font=("Segoe UI", 14))
        self.entry_nombre.pack(pady=10, padx=20, fill="x")

        self.entry_precio = ctk.CTkEntry(self.form_frame, placeholder_text="Precio Total ($)", height=40, font=("Segoe UI", 14))
        self.entry_precio.pack(pady=10, padx=20, fill="x")

        self.entry_sesiones = ctk.CTkEntry(self.form_frame, placeholder_text="Cantidad de Sesiones", height=40, font=("Segoe UI", 14))
        self.entry_sesiones.pack(pady=10, padx=20, fill="x")

        self.check_profe_var = ctk.BooleanVar(value=False)
        self.check_profe = ctk.CTkCheckBox(self.form_frame, text="¿Requiere asignar Profesor?", font=("Segoe UI", 14), variable=self.check_profe_var)
        self.check_profe.pack(pady=15, padx=20, anchor="w")

        self.btn_guardar = ctk.CTkButton(self.form_frame, text="💾 GUARDAR PLAN", height=45, font=("Segoe UI", 14, "bold"), fg_color="#28a745", hover_color="#218838", command=self.guardar_plan)
        self.btn_guardar.pack(pady=10, padx=20, fill="x")

        self.btn_cancelar = ctk.CTkButton(self.form_frame, text="❌ CANCELAR EDICIÓN", height=40, font=("Segoe UI", 14), fg_color="#6c757d", hover_color="#5a6268", command=self.limpiar_formulario)
        # Oculto por defecto hasta que se edite algo

        # --- PANEL DERECHO: LISTADO ---
        self.list_frame = ctk.CTkScrollableFrame(self, label_text="📋 PLANES EXISTENTES", label_font=("Segoe UI", 16, "bold"))
        self.list_frame.grid(row=0, column=1, padx=15, pady=15, sticky="nsew")

        self.cargar_lista()

    def cargar_lista(self):
        """Carga las tarjetas de los planes en el panel derecho."""
        for widget in self.list_frame.winfo_children():
            widget.destroy()

        planes = self.logic.obtener_todos()
        
        for p in planes:
            card = ctk.CTkFrame(self.list_frame, fg_color="#343638", corner_radius=8)
            card.pack(fill="x", pady=5, padx=10)

            # Info del plan
            profe_txt = "👨‍🏫 Requiere Profe" if p['con_profesor'] else "🚫 Sin Profe"
            info = f"🏷️ {p['nombre'].upper()}\n💰 Precio: ${p['precio']:,.2f} | 🎟️ Sesiones: {p['cantidad_sesiones']} | {profe_txt}"
            ctk.CTkLabel(card, text=info, font=("Segoe UI", 14), justify="left").pack(side="left", padx=15, pady=10)

            # Botones
            btn_frame = ctk.CTkFrame(card, fg_color="transparent")
            btn_frame.pack(side="right", padx=15)

            ctk.CTkButton(btn_frame, text="✏️ Editar", width=80, fg_color="#007bff", hover_color="#0069d9",
                          command=lambda plan=p: self.cargar_para_editar(plan)).pack(side="left", padx=5)
            
            ctk.CTkButton(btn_frame, text="🗑️ Borrar", width=80, fg_color="#dc3545", hover_color="#c82333",
                          command=lambda id_p=p['id']: self.borrar_plan(id_p)).pack(side="left", padx=5)

    def guardar_plan(self):
        nombre = self.entry_nombre.get().strip()
        try:
            precio = float(self.entry_precio.get().strip())
            sesiones = int(self.entry_sesiones.get().strip())
        except ValueError:
            messagebox.showerror("Error", "Precio y Sesiones deben ser números.", parent=self)
            return
        
        con_profe = 1 if self.check_profe_var.get() else 0

        if not nombre:
            messagebox.showwarning("Aviso", "El nombre es obligatorio.", parent=self)
            return

        if self.current_edit_id is None:
            # MODO CREAR
            exito, msg = self.logic.crear_tipo_pase(nombre, precio, sesiones, con_profe)
        else:
            # MODO EDITAR
            exito, msg = self.logic.modificar_tipo_pase(self.current_edit_id, nombre, precio, sesiones, con_profe)

        if exito:
            self.limpiar_formulario()
            self.cargar_lista()
            self.on_update_callback() # Actualiza el combobox de la ventana principal
        else:
            messagebox.showerror("Error", msg, parent=self)

    def cargar_para_editar(self, plan):
        """Carga los datos de un plan en el formulario para modificarlos."""
        self.current_edit_id = plan['id']
        self.lbl_titulo.configure(text=f"EDITANDO: {plan['nombre'].upper()}", text_color="#ffc107")
        self.btn_guardar.configure(text="🔄 ACTUALIZAR PLAN", fg_color="#007bff", hover_color="#0069d9")
        self.btn_cancelar.pack(pady=5, padx=20, fill="x") # Mostrar botón cancelar

        self.entry_nombre.delete(0, 'end')
        self.entry_nombre.insert(0, plan['nombre'])
        
        self.entry_precio.delete(0, 'end')
        self.entry_precio.insert(0, str(plan['precio']))
        
        self.entry_sesiones.delete(0, 'end')
        self.entry_sesiones.insert(0, str(plan['cantidad_sesiones']))
        
        self.check_profe_var.set(bool(plan['con_profesor']))

    def limpiar_formulario(self):
        """Resetea el formulario al modo 'Crear Nuevo'."""
        self.current_edit_id = None
        self.lbl_titulo.configure(text="NUEVO PLAN", text_color="#4da6ff")
        self.btn_guardar.configure(text="💾 GUARDAR PLAN", fg_color="#28a745", hover_color="#218838")
        self.btn_cancelar.pack_forget() # Ocultar botón cancelar

        self.entry_nombre.delete(0, 'end')
        self.entry_precio.delete(0, 'end')
        self.entry_sesiones.delete(0, 'end')
        self.check_profe_var.set(False)

    def borrar_plan(self, id_plan):
        if messagebox.askyesno("Confirmar", "¿Seguro que deseas eliminar este plan?", parent=self):
            exito, msg = self.logic.eliminar_tipo_pase(id_plan)
            if exito:
                self.cargar_lista()
                self.on_update_callback() # Actualiza la ventana principal
            else:
                messagebox.showerror("No se puede eliminar", msg, parent=self)
                
    def limpiar_pases_antiguos(self):
        """Marca automáticamente como 'Vencido' los pases que ya gastaron todas sus clases."""
        query = "UPDATE pases_clientes SET estado = 'Vencido' WHERE sesiones_restantes <= 0 AND estado = 'Activo'"
        try:
            self.db.execute_query(query)
        except Exception as e:
            print(f"Error al limpiar pases antiguos: {e}")