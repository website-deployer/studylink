const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'studylink-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Simple auth check
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) return next();
    res.redirect('/login');
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/pages/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public/pages/login.html'));
});

app.post('/login', (req, res) => {
    req.session.isAuthenticated = true;
    res.json({ redirect: '/aihelp' });
});

app.get('/aihelp', isAuthenticated, (req, res) => {
    res.sendFile(path.join(process.cwd(), 'views/aihelp.html'));
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
