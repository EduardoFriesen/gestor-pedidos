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
        
        self.search_entry = ctk.CTkEntry(self.left_panel, placeholder_text="Buscar pases por DNI de cliente...")
        self.search_entry.pack(pady=10, padx=10, fill="x")
        self.btn_buscar = ctk.CTkButton(self.left_panel, text="🔍 Buscar Pases", command=self.load_pases_cliente)
        self.btn_buscar.pack(pady=5)

        self.scroll_pases = ctk.CTkScrollableFrame(self.left_panel, label_text="Historial de Pases / Asistencia")
        self.scroll_pases.pack(pady=10, padx=10, fill="both", expand=True)

        # --- PANEL DERECHO: ASIGNACIÓN ---
        self.right_panel = ctk.CTkFrame(self, width=320)
        self.right_panel.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        ctk.CTkLabel(self.right_panel, text="Asignar Pase", font=("Segoe UI", 18, "bold")).pack(pady=10)

        # Buscador de Clientes
        ctk.CTkLabel(self.right_panel, text="Cliente (DNI o Nombre):").pack(anchor="w", padx=10)
        self.client_search = ctk.CTkEntry(self.right_panel, placeholder_text="Escriba para buscar...")
        self.client_search.pack(pady=2, padx=10, fill="x")
        self.client_search.bind("<KeyRelease>", self.update_client_results)
        
        # Eliminamos texto por defecto inicializando con values=[] y set("")
        self.client_results = ctk.CTkComboBox(self.right_panel, values=[], command=self.select_client)
        self.client_results.pack(pady=2, padx=10, fill="x")
        self.client_results.set("") 

        # Buscador de Profesores
        ctk.CTkLabel(self.right_panel, text="Profesor (DNI o Nombre):").pack(anchor="w", padx=10, pady=(10,0))
        self.prof_search = ctk.CTkEntry(self.right_panel, placeholder_text="Escriba para buscar...")
        self.prof_search.pack(pady=2, padx=10, fill="x")
        self.prof_search.bind("<KeyRelease>", self.update_prof_results)
        
        self.prof_results = ctk.CTkComboBox(self.right_panel, values=[], command=self.select_prof)
        self.prof_results.pack(pady=2, padx=10, fill="x")
        self.prof_results.set("")

        # Selector de Tipo de Pase
        ctk.CTkLabel(self.right_panel, text="Plan / Tipo de Pase:").pack(anchor="w", padx=10, pady=(10,0))
        self.combo_tipo = ctk.CTkComboBox(self.right_panel, values=[], command=self.check_profe_needed)
        self.combo_tipo.pack(pady=5, padx=10, fill="x")
        
        self.refresh_tipos_pases() 

        self.btn_asignar = ctk.CTkButton(self.right_panel, text="VENDER PASE", fg_color="#28a745", command=self.asignar_nuevo)
        self.btn_asignar.pack(pady=15, padx=10, fill="x")

        self.btn_nuevo_tipo = ctk.CTkButton(self.right_panel, text="+ Configurar Tipos de Pases", fg_color="#565b5e", command=self.open_tipo_pase_window)
        self.btn_nuevo_tipo.pack(pady=10, padx=10, fill="x")
        
        self.after(100, self.load_pases_cliente)

    # --- LÓGICA DE BUSCADORES CON ASIGNACIÓN AUTOMÁTICA ---
    def update_client_results(self, event):
        term = self.client_search.get().strip()
        if len(term) > 1:
            clientes = self.logic_clie.buscar_cliente(term)
            listado = [f"{c['dni']} - {c['nombre']} {c['apellido']}" for c in clientes]
            self.client_results.configure(values=listado)
            if listado:
                self.client_results.set(listado[0]) # Muestra el primero
                self.cliente_seleccionado_dni = listado[0].split(" - ")[0] # Lo asigna automáticamente
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
                self.prof_results.set(listado[0]) # Muestra el primero
                self.profesor_seleccionado_dni = listado[0].split(" - ")[0] # Lo asigna automáticamente
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
            self.profesor_seleccionado_dni = None # Limpia si el plan no requiere profe
        else:
            self.prof_search.configure(state="normal")
            self.prof_results.configure(state="normal")

    def open_tipo_pase_window(self):
        window = ctk.CTkToplevel(self)
        window.title("Configurar Planes")
        window.geometry("400x450")
        window.attributes("-topmost", True)

        ctk.CTkLabel(window, text="Nuevo Tipo de Pase", font=("Arial", 16, "bold")).pack(pady=20)
        name_entry = ctk.CTkEntry(window, placeholder_text="Nombre")
        name_entry.pack(pady=10, padx=20, fill="x")
        price_entry = ctk.CTkEntry(window, placeholder_text="Precio")
        price_entry.pack(pady=10, padx=20, fill="x")
        sessions_entry = ctk.CTkEntry(window, placeholder_text="Sesiones")
        sessions_entry.pack(pady=10, padx=20, fill="x")
        check_profe = ctk.CTkCheckBox(window, text="¿Requiere Profesor?")
        check_profe.pack(pady=10)

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
            except: messagebox.showerror("Error", "Datos inválidos")

        ctk.CTkButton(window, text="Guardar Plan", command=save).pack(pady=20)

    # --- ASISTENCIA ---
    def load_pases_cliente(self):
        # Capturamos el texto del buscador (puede ser DNI, nombre de cliente o profe)
        busqueda = self.search_entry.get().strip()
        
        # Llamamos a la lógica enviando el filtro
        raw_data = self.logic.obtener_todos_los_pases(busqueda if busqueda else None)
        
        # Limpiar el scroll actual
        for w in self.scroll_pases.winfo_children(): 
            w.destroy()

        # Ordenar (Vencidos arriba)
        pases = sorted(raw_data, key=lambda x: x[4] != 'Activo', reverse=True)

        for p in pases:
            es_critico = p[4] != 'Activo'
            card = ctk.CTkFrame(self.scroll_pases, fg_color="#4a1a1a" if es_critico else "#2b2b2b")
            card.pack(fill="x", pady=5, padx=5)
            
            # Mostramos la info completa
            info = f"CLIENTE: {p[6].upper()} ({p[7]})\nPLAN: {p[1]} | Clases: {p[2]}\nVence: {p[3]} | Profe: {p[5] if p[5] else 'Sin Profe'}"
            ctk.CTkLabel(card, text=info, justify="left").pack(side="left", padx=15, pady=10)

            if p[4] == 'Activo' and p[2] > 0:
                ctk.CTkButton(card, text="INGRESAR", width=90, fg_color="#17a2b8",
                              command=lambda pid=p[0]: self.descontar(pid)).pack(side="right", padx=15)
            else:
                txt = "VENCIDO" if p[4] == "Vencido" else "AGOTADO"
                ctk.CTkLabel(card, text=txt, text_color="#ff4444", font=("Arial", 12, "bold")).pack(side="right", padx=15)

    def descontar(self, id_pase):
        exito, msg = self.logic.registrar_asistencia(id_pase)
        if exito:
            messagebox.showinfo("Asistencia", msg)
            self.load_pases_cliente()
        else:
            messagebox.showerror("Error", msg)

    def asignar_nuevo(self):
        if not self.cliente_seleccionado_dni:
            messagebox.showwarning("Atención", "Escriba y busque un cliente válido.")
            return
        
        tipo_nom = self.combo_tipo.get()
        tipo_id = next(t['id'] for t in self.tipos_data if t['nombre'] == tipo_nom)
        
        exito, msg = self.logic.asignar_pase_a_cliente(self.cliente_seleccionado_dni, tipo_id, self.profesor_seleccionado_dni)
        if exito:
            messagebox.showinfo("Éxito", msg)
            self.load_pases_cliente()