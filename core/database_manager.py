import sqlite3

class DatabaseManager:
    def __init__(self, db_name="assets/data/inventario.db"):
        self.db_name = db_name
        self._create_tables()

    def _get_connection(self):
        # check_same_thread=False ayuda si usas hilos en la UI, pero 
        # asegúrate de manejar bien la concurrencia.
        return sqlite3.connect(self.db_name, check_same_thread=False)

    def _create_tables(self):
        # 1. Productos (Ya lo tenías bien)
        query_productos = """
            CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio REAL,
            stock INTEGER
        )"""
        
        # 2. Clientes (CORREGIDO: IF NOT EXISTS y tipos de datos)
        query_clientes = """
            CREATE TABLE IF NOT EXISTS clientes (
                dni TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                fecha_nacimiento TEXT NOT NULL
            )"""
        
        # 3. Tipo Pase (CORREGIDO: SERIAL -> INTEGER PRIMARY KEY AUTOINCREMENT)
        query_tipo_pase = """
        CREATE TABLE IF NOT EXISTS tipos_pases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT UNIQUE,
            precio REAL,
            cantidad_sesiones INTEGER,
            con_profesor INTEGER
        )"""
        
        # 4. Profesores (CORREGIDO: IF NOT EXISTS y tipos)
        query_profesores = """
            CREATE TABLE IF NOT EXISTS profesores (
                dni TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                fecha_nacimiento TEXT NOT NULL
            )"""
        
        # 5. Pases (CORREGIDO: SERIAL -> INTEGER, IF NOT EXISTS y tipos)
        query_pases = """
            CREATE TABLE IF NOT EXISTS pases_clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dni_cliente TEXT NOT NULL,          -- El DNI que identifica al dueño
                id_tipo_pase INTEGER NOT NULL,      -- El plan comprado
                dni_profesor TEXT,                  -- El profe asignado (opcional si es 'sin profe')
                sesiones_restantes INTEGER, 
                fecha_vencimiento TEXT,
                estado TEXT,
                -- ESTO ES LO QUE CREA EL VÍNCULO REAL:
                FOREIGN KEY (dni_cliente) REFERENCES clientes(dni) 
                    ON DELETE CASCADE,
                FOREIGN KEY (id_tipo_pase) REFERENCES tipos_pases(id),
                FOREIGN KEY (dni_profesor) REFERENCES profesores(dni)
            )"""
        
        # 6. Ventas (Ya lo tenías bien)
        query_ventas = """
        CREATE TABLE IF NOT EXISTS ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_prod TEXT,
            cantidad INTEGER,
            total REAL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_prod) REFERENCES productos (id)
        )"""
        
        with self._get_connection() as conn:
            conn.execute(query_productos)
            conn.execute(query_clientes)
            conn.execute(query_profesores)
            conn.execute(query_tipo_pase)
            conn.execute(query_pases)
            conn.execute(query_ventas)

    def execute_query(self, query, params=()):
        with self._get_connection() as conn:
            return conn.execute(query, params)

    def fetch_all(self, query, params=()):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return cursor.fetchall()