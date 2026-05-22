const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesión
app.use(session({
    secret: 'mi-secreto-muy-seguro',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Cambiar a true en producción con HTTPS
}));

// Base de datos simulada en memoria
const users = new Map();

// Usuario de prueba pre-creado (admin/admin123)
async function createTestUser() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    users.set('admin', {
        username: 'admin',
        password: hashedPassword,
        email: 'admin@example.com'
    });
    console.log('Usuario de prueba creado: admin / admin123');
}

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Rutas
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    const user = users.get(username);
    if (!user) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    req.session.user = {
        username: user.username,
        email: user.email
    };
    
    res.json({ success: true, message: 'Login exitoso' });
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/api/user', requireAuth, (req, res) => {
    res.json({
        username: req.session.user.username,
        email: req.session.user.email
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.json({ success: true, message: 'Sesión cerrada correctamente' });
    });
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    
    if (users.has(username)) {
        return res.status(400).json({ error: 'El usuario ya existe' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(username, {
        username,
        password: hashedPassword,
        email
    });
    
    res.json({ success: true, message: 'Usuario registrado exitosamente' });
});

// Iniciar servidor
createTestUser().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
        console.log('Páginas disponibles:');
        console.log(`  - Login: http://localhost:${PORT}/login`);
        console.log(`  - Registro: http://localhost:${PORT}/register`);
        console.log(`  - Dashboard: http://localhost:${PORT}/dashboard`);
    });
});
